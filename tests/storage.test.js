(function () {
  function todo(over) {
    return Object.assign(
      { id: 'a', title: '할 일', category: 'work', date: '2026-10-01', done: false, createdAt: 1 },
      over || {}
    );
  }

  function fakeBackend(initial) {
    var data = initial || {};
    return {
      _data: data,
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; }
    };
  }

  describe('TodoStorage 저장·불러오기', function () {
    it('저장된 데이터가 없으면 empty', function () {
      var s = TodoStorage.create(fakeBackend());
      assertEqual(s.load(), { todos: [], status: 'empty' });
    });
    it('저장 후 다시 불러오면 같은 데이터가 나온다', function () {
      var backend = fakeBackend();
      var todos = [todo({ id: 'a' }), todo({ id: 'b', done: true })];
      assertTrue(TodoStorage.create(backend).save(todos));
      assertEqual(TodoStorage.create(backend).load(), { todos: todos, status: 'ok' });
    });
    it('버전 필드를 포함한 JSON으로 KEY에 저장한다', function () {
      var backend = fakeBackend();
      TodoStorage.create(backend).save([todo()]);
      assertEqual(TodoStorage.KEY, 'todo-app:v1');
      assertEqual(JSON.parse(backend._data['todo-app:v1']).version, 1);
    });
    it('defaultBackend는 확인용 키를 남기지 않는다', function () {
      var backend = TodoStorage.defaultBackend();
      if (backend) assertEqual(backend.getItem('__todo-app:probe'), null);
    });
  });

  describe('TodoStorage 손상 데이터', function () {
    it('JSON이 깨졌으면 corrupt이고 원본을 BACKUP_KEY에 백업한다', function () {
      var backend = fakeBackend();
      backend._data['todo-app:v1'] = '{oops';
      var result = TodoStorage.create(backend).load();
      assertEqual(result, { todos: [], status: 'corrupt' });
      assertEqual(TodoStorage.BACKUP_KEY, 'todo-app:v1:corrupt');
      assertEqual(backend._data['todo-app:v1:corrupt'], '{oops');
    });
    it('버전이 다르면 corrupt이고 원본을 백업한다', function () {
      var backend = fakeBackend();
      var raw = JSON.stringify({ version: 2, todos: [todo()] });
      backend._data['todo-app:v1'] = raw;
      assertEqual(TodoStorage.create(backend).load(), { todos: [], status: 'corrupt' });
      assertEqual(backend._data['todo-app:v1:corrupt'], raw);
    });
    it('todos가 배열이 아니면 corrupt', function () {
      var backend = fakeBackend();
      backend._data['todo-app:v1'] = JSON.stringify({ version: 1, todos: 'x' });
      assertEqual(TodoStorage.create(backend).load().status, 'corrupt');
    });
    it('일부 항목만 손상되면 유효한 것만 살리고 repaired로 백업한다', function () {
      var backend = fakeBackend();
      var raw = JSON.stringify({ version: 1, todos: [todo({ id: 'ok' }), { id: 'bad' }] });
      backend._data['todo-app:v1'] = raw;
      var result = TodoStorage.create(backend).load();
      assertEqual(result.status, 'repaired');
      assertEqual(result.todos.map(function (t) { return t.id; }), ['ok']);
      assertEqual(backend._data['todo-app:v1:corrupt'], raw);
    });
    it('카테고리나 날짜가 잘못된 항목도 걸러낸다', function () {
      var backend = fakeBackend();
      var good = todo({ id: 'good' });
      backend._data['todo-app:v1'] = JSON.stringify({
        version: 1,
        todos: [good, todo({ id: 'c', category: 'play' }), todo({ id: 'd', date: '2026-02-30' })]
      });
      var result = TodoStorage.create(backend).load();
      assertEqual(result.todos, [good]);
    });
  });

  describe('TodoStorage 실패·차단', function () {
    it('backend가 null이면 load는 unavailable', function () {
      assertEqual(TodoStorage.create(null).load(), { todos: [], status: 'unavailable' });
    });
    it('backend가 null이면 save는 false', function () {
      assertEqual(TodoStorage.create(null).save([todo()]), false);
    });
    it('setItem이 예외를 던지면 save는 false', function () {
      var backend = fakeBackend();
      backend.setItem = function () { throw new Error('quota'); };
      assertEqual(TodoStorage.create(backend).save([todo()]), false);
    });
    it('getItem이 예외를 던지면 load는 unavailable', function () {
      var backend = fakeBackend();
      backend.getItem = function () { throw new Error('blocked'); };
      assertEqual(TodoStorage.create(backend).load(), { todos: [], status: 'unavailable' });
    });
    it('백업 저장이 실패해도 corrupt 결과를 돌려준다', function () {
      var backend = fakeBackend();
      backend._data['todo-app:v1'] = '{oops';
      backend.setItem = function () { throw new Error('quota'); };
      assertEqual(TodoStorage.create(backend).load(), { todos: [], status: 'corrupt' });
    });
    it('localStorage 접근이 예외면 defaultBackend는 null', function () {
      var original = Object.getOwnPropertyDescriptor(window, 'localStorage');
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: function () { throw new Error('blocked'); }
      });
      try {
        assertEqual(TodoStorage.defaultBackend(), null);
      } finally {
        Object.defineProperty(window, 'localStorage', original);
      }
    });
    it('localStorage 쓰기가 막히면 defaultBackend는 null', function () {
      var original = Object.getOwnPropertyDescriptor(window, 'localStorage');
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: function () {
          return { setItem: function () { throw new Error('quota'); }, removeItem: function () {} };
        }
      });
      try {
        assertEqual(TodoStorage.defaultBackend(), null);
      } finally {
        Object.defineProperty(window, 'localStorage', original);
      }
    });
  });
})();

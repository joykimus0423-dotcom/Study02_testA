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

  describe('TodoStorage', function () {
    it('저장된 데이터가 없으면 empty', function () {
      var s = TodoStorage.create(fakeBackend());
      assertEqual(s.load(), { todos: [], status: 'empty' });
    });
    it('저장 후 다시 불러오면 같은 데이터가 나온다', function () {
      var backend = fakeBackend();
      var s = TodoStorage.create(backend);
      var todos = [todo({ id: 'a' }), todo({ id: 'b', done: true })];
      assertTrue(s.save(todos));
      assertEqual(TodoStorage.create(backend).load(), { todos: todos, status: 'ok' });
    });
    it('버전 필드를 포함한 JSON으로 저장한다', function () {
      var backend = fakeBackend();
      TodoStorage.create(backend).save([todo()]);
      assertEqual(JSON.parse(backend._data[TodoStorage.KEY]).version, 1);
    });
    it('JSON이 깨졌으면 corrupt이고 원본을 백업한다', function () {
      var backend = fakeBackend();
      backend._data[TodoStorage.KEY] = '{oops';
      var result = TodoStorage.create(backend).load();
      assertEqual(result, { todos: [], status: 'corrupt' });
      assertEqual(backend._data[TodoStorage.BACKUP_KEY], '{oops');
    });
    it('버전이 다르면 corrupt', function () {
      var backend = fakeBackend();
      backend._data[TodoStorage.KEY] = JSON.stringify({ version: 2, todos: [] });
      assertEqual(TodoStorage.create(backend).load().status, 'corrupt');
    });
    it('일부 항목만 손상되면 유효한 것만 살리고 repaired로 백업한다', function () {
      var backend = fakeBackend();
      var raw = JSON.stringify({ version: 1, todos: [todo({ id: 'ok' }), { id: 'bad' }] });
      backend._data[TodoStorage.KEY] = raw;
      var result = TodoStorage.create(backend).load();
      assertEqual(result.status, 'repaired');
      assertEqual(result.todos.map(function (t) { return t.id; }), ['ok']);
      assertEqual(backend._data[TodoStorage.BACKUP_KEY], raw);
    });
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
      assertEqual(TodoStorage.create(backend).load().status, 'unavailable');
    });
  });
})();

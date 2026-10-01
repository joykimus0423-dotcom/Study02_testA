(function () {
  function todo(over) {
    return Object.assign(
      { id: 'a', title: '할 일', category: 'work', date: '2026-10-01', done: false, createdAt: 1 },
      over || {}
    );
  }

  describe('날짜 유틸', function () {
    it('formatDate는 로컬 날짜를 YYYY-MM-DD로 만든다', function () {
      assertEqual(TodoState.formatDate(new Date(2026, 9, 1)), '2026-10-01');
    });
    it('shiftDate는 월·연·윤년 경계를 넘긴다', function () {
      assertEqual(TodoState.shiftDate('2026-10-01', 1), '2026-10-02');
      assertEqual(TodoState.shiftDate('2026-10-31', 1), '2026-11-01');
      assertEqual(TodoState.shiftDate('2026-01-01', -1), '2025-12-31');
      assertEqual(TodoState.shiftDate('2028-02-28', 1), '2028-02-29');
    });
    it('isValidDate는 형식과 실존 날짜를 검사한다', function () {
      assertTrue(TodoState.isValidDate('2026-10-01'));
      assertEqual(TodoState.isValidDate('2026-02-30'), false);
      assertEqual(TodoState.isValidDate('2026-13-01'), false);
      assertEqual(TodoState.isValidDate('abc'), false);
      assertEqual(TodoState.isValidDate(null), false);
    });
  });

  describe('addTodo', function () {
    it('제목을 다듬어 새 항목을 끝에 추가한다', function () {
      var result = TodoState.addTodo([], {
        title: '  보고서  ', category: 'work', date: '2026-10-01', id: 'a', createdAt: 1
      });
      assertEqual(result, [todo({ id: 'a', title: '보고서', createdAt: 1 })]);
    });
    it('공백뿐인 제목은 추가하지 않는다', function () {
      var original = [todo()];
      var result = TodoState.addTodo(original, { title: '   ', category: 'work', date: '2026-10-01' });
      assertTrue(result === original);
    });
    it('제목은 100자로 자른다', function () {
      var result = TodoState.addTodo([], { title: 'x'.repeat(150), category: 'work', date: '2026-10-01' });
      assertEqual(result[0].title.length, 100);
    });
    it('잘못된 카테고리는 거부한다', function () {
      var result = TodoState.addTodo([], { title: 'a', category: 'play', date: '2026-10-01' });
      assertEqual(result.length, 0);
    });
    it('잘못된 날짜는 거부한다', function () {
      var result = TodoState.addTodo([], { title: 'a', category: 'work', date: '2026-02-30' });
      assertEqual(result.length, 0);
    });
    it('입력 배열을 변경하지 않는다', function () {
      var before = [];
      var after = TodoState.addTodo(before, { title: 'a', category: 'work', date: '2026-10-01' });
      assertEqual(before.length, 0);
      assertEqual(after.length, 1);
    });
    it('id와 createdAt을 생략하면 자동 생성한다', function () {
      var result = TodoState.addTodo([], { title: 'a', category: 'work', date: '2026-10-01' });
      assertTrue(typeof result[0].id === 'string' && result[0].id.length > 0);
      assertTrue(typeof result[0].createdAt === 'number');
    });
  });

  describe('toggleTodo', function () {
    it('해당 id의 done만 뒤집는다', function () {
      var original = [todo({ id: 'a' }), todo({ id: 'b' })];
      var result = TodoState.toggleTodo(original, 'a');
      assertEqual(result[0].done, true);
      assertEqual(result[1].done, false);
      assertEqual(original[0].done, false);
    });
  });

  describe('updateTodo', function () {
    it('제목을 다듬어 바꾼다', function () {
      var result = TodoState.updateTodo([todo()], 'a', { title: '  새 제목 ' });
      assertEqual(result[0].title, '새 제목');
    });
    it('빈 제목은 무시하고 기존 제목을 유지한다', function () {
      var result = TodoState.updateTodo([todo({ title: '기존' })], 'a', { title: '   ' });
      assertEqual(result[0].title, '기존');
    });
    it('카테고리를 바꾼다', function () {
      var result = TodoState.updateTodo([todo()], 'a', { category: 'study' });
      assertEqual(result[0].category, 'study');
    });
    it('잘못된 카테고리는 무시한다', function () {
      var result = TodoState.updateTodo([todo()], 'a', { category: 'play' });
      assertEqual(result[0].category, 'work');
    });
  });

  describe('removeTodo / restoreTodo', function () {
    it('removeTodo는 해당 id를 제거한다', function () {
      var result = TodoState.removeTodo([todo({ id: 'a' }), todo({ id: 'b' })], 'a');
      assertEqual(result.map(function (t) { return t.id; }), ['b']);
    });
    it('restoreTodo는 원래 위치에 되돌린다', function () {
      var a = todo({ id: 'a' });
      var b = todo({ id: 'b' });
      var c = todo({ id: 'c' });
      var result = TodoState.restoreTodo([a, c], b, 1);
      assertEqual(result.map(function (t) { return t.id; }), ['a', 'b', 'c']);
    });
    it('restoreTodo는 범위를 넘는 인덱스를 끝으로 보정한다', function () {
      var result = TodoState.restoreTodo([todo({ id: 'a' })], todo({ id: 'b' }), 99);
      assertEqual(result.map(function (t) { return t.id; }), ['a', 'b']);
    });
  });
})();

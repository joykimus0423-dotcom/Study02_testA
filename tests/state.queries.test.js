(function () {
  function todo(over) {
    return Object.assign(
      { id: 'a', title: '할 일', category: 'work', date: '2026-10-01', done: false, createdAt: 1 },
      over || {}
    );
  }

  function ids(list) {
    return list.map(function (t) { return t.id; });
  }

  var T = [
    todo({ id: '1', category: 'work', done: true }),
    todo({ id: '2', category: 'work', done: false }),
    todo({ id: '3', category: 'personal', done: true }),
    todo({ id: '4', category: 'study', date: '2026-10-02', done: false })
  ];

  describe('조회', function () {
    it('todosForDate는 해당 날짜 항목만 순서대로 돌려준다', function () {
      assertEqual(ids(TodoState.todosForDate(T, '2026-10-01')), ['1', '2', '3']);
    });
    it("filterByCategory('all')은 전체를 돌려준다", function () {
      assertEqual(ids(TodoState.filterByCategory(T, 'all')), ['1', '2', '3', '4']);
    });
    it('filterByCategory는 해당 카테고리만 돌려준다', function () {
      assertEqual(ids(TodoState.filterByCategory(T, 'work')), ['1', '2']);
    });
  });

  describe('progress', function () {
    it('빈 목록은 0%이고 0으로 나누지 않는다', function () {
      assertEqual(TodoState.progress([]), { done: 0, total: 0, percent: 0 });
    });
    it('1/3은 33%', function () {
      var list = [todo({ id: '1', done: true }), todo({ id: '2' }), todo({ id: '3' })];
      assertEqual(TodoState.progress(list), { done: 1, total: 3, percent: 33 });
    });
    it('2/3은 67%', function () {
      var list = [todo({ id: '1', done: true }), todo({ id: '2', done: true }), todo({ id: '3' })];
      assertEqual(TodoState.progress(list), { done: 2, total: 3, percent: 67 });
    });
    it('모두 완료면 100%', function () {
      assertEqual(TodoState.progress([todo({ done: true })]), { done: 1, total: 1, percent: 100 });
    });
  });

  describe('progressByCategory', function () {
    it('선택한 날짜의 카테고리별 진행률을 계산한다', function () {
      assertEqual(TodoState.progressByCategory(T, '2026-10-01'), {
        work: { done: 1, total: 2, percent: 50 },
        personal: { done: 1, total: 1, percent: 100 },
        study: { done: 0, total: 0, percent: 0 }
      });
    });
  });

  describe('carryOver', function () {
    it('해당 날짜의 미완료 항목만 다음 날로 옮긴다', function () {
      var result = TodoState.carryOver(T, '2026-10-01');
      assertEqual(result.moved, 1);
      assertEqual(result.todos.filter(function (t) { return t.id === '2'; })[0].date, '2026-10-02');
      assertEqual(result.todos.filter(function (t) { return t.id === '1'; })[0].date, '2026-10-01');
      assertEqual(result.todos.filter(function (t) { return t.id === '4'; })[0].date, '2026-10-02');
    });
    it('월 경계를 넘긴다', function () {
      var result = TodoState.carryOver([todo({ id: 'x', date: '2026-10-31' })], '2026-10-31');
      assertEqual(result.todos[0].date, '2026-11-01');
    });
    it('옮길 항목이 없으면 입력 배열을 그대로 돌려준다', function () {
      var result = TodoState.carryOver(T, '2026-10-05');
      assertEqual(result.moved, 0);
      assertTrue(result.todos === T);
    });
  });
})();

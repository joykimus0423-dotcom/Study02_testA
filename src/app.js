(function () {
  'use strict';

  var S = window.TodoState;
  var storage = window.TodoStorage.create(window.TodoStorage.defaultBackend());
  var loaded = storage.load();

  var NOTICES = {
    unavailable: '브라우저 저장소를 사용할 수 없습니다. 이 탭을 닫으면 데이터가 사라집니다.',
    corrupt: '저장된 데이터가 손상되어 새로 시작합니다. 원본은 백업 키(' + window.TodoStorage.BACKUP_KEY + ')에 보관했습니다.',
    repaired: '일부 손상된 항목을 제외하고 불러왔습니다. 원본은 백업 키(' + window.TodoStorage.BACKUP_KEY + ')에 보관했습니다.',
    saveFailed: '저장에 실패했습니다. 저장 공간을 확인해 주세요.'
  };

  var todos = loaded.todos;
  var date = S.today();
  var filter = 'all';
  var saveFailed = false;

  function currentNotice() {
    if (loaded.status === 'unavailable') return NOTICES.unavailable;
    if (saveFailed) return NOTICES.saveFailed;
    return NOTICES[loaded.status] || '';
  }

  function commit(next) {
    todos = next;
    saveFailed = !storage.save(todos);
    render();
  }

  function render() {
    var day = S.todosForDate(todos, date);
    view.render({
      date: date,
      isToday: date === S.today(),
      filter: filter,
      todos: S.filterByCategory(day, filter),
      overall: S.progress(day),
      byCategory: S.progressByCategory(todos, date),
      notice: currentNotice()
    });
  }

  function shortTitle(title) {
    return title.length > 20 ? title.slice(0, 20) + '…' : title;
  }

  var view = window.TodoView.create({
    onAdd: function (title, category) {
      if (filter !== 'all' && filter !== category) filter = 'all';
      commit(S.addTodo(todos, { title: title, category: category, date: date }));
    },
    onToggle: function (id) {
      commit(S.toggleTodo(todos, id));
    },
    onUpdate: function (id, patch) {
      commit(S.updateTodo(todos, id, patch));
    },
    onDelete: function (id) {
      var index = todos.findIndex(function (t) { return t.id === id; });
      if (index === -1) return;
      var removed = todos[index];
      commit(S.removeTodo(todos, id));
      view.showToast('"' + shortTitle(removed.title) + '" 삭제됨', function () {
        commit(S.restoreTodo(todos, removed, index));
      });
    },
    onFilter: function (category) {
      filter = category;
      render();
    },
    onShiftDate: function (days) {
      date = S.shiftDate(date, days);
      render();
    },
    onGoToday: function () {
      date = S.today();
      render();
    },
    onPickDate: function (picked) {
      if (!S.isValidDate(picked)) return;
      date = picked;
      render();
    },
    onCarryOver: function () {
      var result = S.carryOver(todos, date);
      if (!result.moved) return;
      commit(result.todos);
      view.showToast(result.moved + '개를 다음 날로 이월했습니다');
    }
  });

  render();
  view.focusInput();
})();

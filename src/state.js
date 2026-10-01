(function (global) {
  'use strict';

  var CATEGORIES = ['work', 'personal', 'study'];
  var CATEGORY_LABELS = { work: '업무', personal: '개인', study: '공부' };
  var MAX_TITLE = 100;

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function today() {
    return formatDate(new Date());
  }

  function shiftDate(dateStr, days) {
    var p = dateStr.split('-');
    return formatDate(new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]) + days));
  }

  function isValidDate(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && shiftDate(s, 0) === s;
  }

  function isValidCategory(c) {
    return CATEGORIES.indexOf(c) !== -1;
  }

  function newId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function cleanTitle(raw) {
    var t = typeof raw === 'string' ? raw.trim() : '';
    return t.slice(0, MAX_TITLE);
  }

  function addTodo(todos, input) {
    var title = cleanTitle(input.title);
    if (!title || !isValidCategory(input.category) || !isValidDate(input.date)) return todos;
    var todo = {
      id: input.id || newId(),
      title: title,
      category: input.category,
      date: input.date,
      done: false,
      createdAt: input.createdAt || Date.now()
    };
    return todos.concat([todo]);
  }

  function toggleTodo(todos, id) {
    return todos.map(function (t) {
      return t.id === id ? Object.assign({}, t, { done: !t.done }) : t;
    });
  }

  function updateTodo(todos, id, patch) {
    return todos.map(function (t) {
      if (t.id !== id) return t;
      var changes = {};
      var title = cleanTitle(patch.title);
      if (title) changes.title = title;
      if (isValidCategory(patch.category)) changes.category = patch.category;
      return Object.assign({}, t, changes);
    });
  }

  function removeTodo(todos, id) {
    return todos.filter(function (t) { return t.id !== id; });
  }

  function restoreTodo(todos, todo, index) {
    var i = Math.max(0, Math.min(index, todos.length));
    return todos.slice(0, i).concat([todo], todos.slice(i));
  }

  function todosForDate(todos, date) {
    return todos.filter(function (t) { return t.date === date; });
  }

  function filterByCategory(list, category) {
    if (category === 'all') return list;
    return list.filter(function (t) { return t.category === category; });
  }

  function progress(list) {
    var done = list.filter(function (t) { return t.done; }).length;
    var total = list.length;
    return { done: done, total: total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
  }

  function progressByCategory(todos, date) {
    var day = todosForDate(todos, date);
    var result = {};
    CATEGORIES.forEach(function (c) {
      result[c] = progress(filterByCategory(day, c));
    });
    return result;
  }

  function carryOver(todos, fromDate) {
    var toDate = shiftDate(fromDate, 1);
    var moved = 0;
    var next = todos.map(function (t) {
      if (t.date === fromDate && !t.done) {
        moved += 1;
        return Object.assign({}, t, { date: toDate });
      }
      return t;
    });
    return { todos: moved ? next : todos, moved: moved };
  }

  global.TodoState = {
    CATEGORIES: CATEGORIES,
    CATEGORY_LABELS: CATEGORY_LABELS,
    formatDate: formatDate,
    today: today,
    shiftDate: shiftDate,
    isValidDate: isValidDate,
    isValidCategory: isValidCategory,
    addTodo: addTodo,
    toggleTodo: toggleTodo,
    updateTodo: updateTodo,
    removeTodo: removeTodo,
    restoreTodo: restoreTodo,
    todosForDate: todosForDate,
    filterByCategory: filterByCategory,
    progress: progress,
    progressByCategory: progressByCategory,
    carryOver: carryOver
  };
})(window);

(function (global) {
  'use strict';

  var KEY = 'todo-app:v1';
  var BACKUP_KEY = 'todo-app:v1:corrupt';
  var VERSION = 1;

  function defaultBackend() {
    try {
      var s = global.localStorage;
      var probe = '__todo-app:probe';
      s.setItem(probe, '1');
      s.removeItem(probe);
      return s;
    } catch (e) {
      return null;
    }
  }

  function isValidTodo(t) {
    var S = global.TodoState;
    return !!t &&
      typeof t.id === 'string' && t.id !== '' &&
      typeof t.title === 'string' && t.title.trim() !== '' &&
      S.isValidCategory(t.category) &&
      S.isValidDate(t.date) &&
      typeof t.done === 'boolean' &&
      typeof t.createdAt === 'number';
  }

  function backup(backend, raw) {
    try {
      backend.setItem(BACKUP_KEY, raw);
    } catch (e) {
      /* 백업 실패는 무시한다 */
    }
  }

  function create(backend) {
    function load() {
      if (!backend) return { todos: [], status: 'unavailable' };
      var raw;
      try {
        raw = backend.getItem(KEY);
      } catch (e) {
        return { todos: [], status: 'unavailable' };
      }
      if (raw === null) return { todos: [], status: 'empty' };

      var data;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        data = null;
      }
      if (!data || data.version !== VERSION || !Array.isArray(data.todos)) {
        backup(backend, raw);
        return { todos: [], status: 'corrupt' };
      }

      var valid = data.todos.filter(isValidTodo);
      if (valid.length !== data.todos.length) {
        backup(backend, raw);
        return { todos: valid, status: 'repaired' };
      }
      return { todos: valid, status: 'ok' };
    }

    function save(todos) {
      if (!backend) return false;
      try {
        backend.setItem(KEY, JSON.stringify({ version: VERSION, todos: todos }));
        return true;
      } catch (e) {
        return false;
      }
    }

    return { load: load, save: save };
  }

  global.TodoStorage = {
    KEY: KEY,
    BACKUP_KEY: BACKUP_KEY,
    defaultBackend: defaultBackend,
    create: create
  };
})(window);

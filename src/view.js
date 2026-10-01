(function (global) {
  'use strict';

  var S = global.TodoState;
  var TOAST_MS = 5000;

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function create(handlers) {
    function byId(id) { return document.getElementById(id); }

    var els = {
      prevDay: byId('prev-day'),
      nextDay: byId('next-day'),
      goToday: byId('go-today'),
      datePicker: byId('date-picker'),
      notice: byId('notice'),
      progressText: byId('progress-text'),
      progressBar: byId('progress-bar'),
      progressFill: byId('progress-fill'),
      categoryProgress: byId('category-progress'),
      addForm: byId('add-form'),
      titleInput: byId('title-input'),
      categorySelect: byId('category-select'),
      filterTabs: byId('filter-tabs'),
      list: byId('todo-list'),
      empty: byId('empty-message'),
      carryOver: byId('carry-over'),
      toast: byId('toast'),
      toastMessage: byId('toast-message'),
      toastAction: byId('toast-action')
    };

    var editingId = null;
    var lastModel = null;
    var toastTimer = null;
    var toastUndo = null;

    /* ---------- 이벤트 연결 ---------- */

    els.prevDay.addEventListener('click', function () { handlers.onShiftDate(-1); });
    els.nextDay.addEventListener('click', function () { handlers.onShiftDate(1); });
    els.goToday.addEventListener('click', function () { handlers.onGoToday(); });
    els.datePicker.addEventListener('change', function () {
      if (els.datePicker.value) handlers.onPickDate(els.datePicker.value);
    });
    els.carryOver.addEventListener('click', function () { handlers.onCarryOver(); });

    els.addForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = els.titleInput.value;
      if (!title.trim()) return;
      handlers.onAdd(title, els.categorySelect.value);
      els.titleInput.value = '';
      els.titleInput.focus();
    });

    els.filterTabs.addEventListener('click', function (e) {
      var button = e.target.closest('button[data-filter]');
      if (button) handlers.onFilter(button.dataset.filter);
    });

    els.toastAction.addEventListener('click', function () {
      var undo = toastUndo;
      hideToast();
      if (undo) undo();
    });

    /* ---------- 토스트 ---------- */

    function hideToast() {
      clearTimeout(toastTimer);
      toastUndo = null;
      els.toast.hidden = true;
    }

    function showToast(message, onUndo) {
      els.toastMessage.textContent = message;
      toastUndo = onUndo || null;
      els.toastAction.hidden = !onUndo;
      els.toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(hideToast, TOAST_MS);
    }

    /* ---------- 인라인 편집 ---------- */

    function startEdit(id) {
      editingId = id;
      renderList(lastModel);
      var input = els.list.querySelector('.edit-title');
      if (input) {
        input.focus();
        input.select();
      }
    }

    function finishEdit(id, input, commit) {
      if (editingId !== id) return;
      editingId = null;
      if (commit) {
        handlers.onUpdate(id, { title: input.value });
      } else {
        renderList(lastModel);
      }
    }

    /* ---------- 목록 렌더링 ---------- */

    function buildItem(todo) {
      var li = el('li', 'todo-item' + (todo.done ? ' done' : ''));
      li.dataset.id = todo.id;

      var check = el('input');
      check.type = 'checkbox';
      check.checked = todo.done;
      check.dataset.role = 'check';
      check.setAttribute('aria-label', todo.title + ' 완료');
      check.addEventListener('change', function () { handlers.onToggle(todo.id); });
      li.appendChild(check);

      if (editingId === todo.id) {
        var input = el('input', 'edit-title');
        input.type = 'text';
        input.maxLength = 100;
        input.value = todo.title;
        input.dataset.role = 'edit';
        input.setAttribute('aria-label', '제목 수정');
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            finishEdit(todo.id, input, true);
          } else if (e.key === 'Escape') {
            finishEdit(todo.id, input, false);
          }
        });
        input.addEventListener('blur', function () { finishEdit(todo.id, input, true); });
        li.appendChild(input);
      } else {
        var title = el('span', 'title');
        title.textContent = todo.title;
        title.tabIndex = 0;
        title.dataset.role = 'title';
        title.setAttribute('role', 'button');
        title.setAttribute('aria-label', todo.title + ' 수정');
        title.addEventListener('click', function () { startEdit(todo.id); });
        title.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === 'F2') {
            e.preventDefault();
            startEdit(todo.id);
          }
        });
        li.appendChild(title);
      }

      var category = el('select', 'item-category cat-' + todo.category);
      category.dataset.role = 'category';
      category.setAttribute('aria-label', todo.title + ' 카테고리');
      S.CATEGORIES.forEach(function (c) {
        var option = el('option');
        option.value = c;
        option.textContent = S.CATEGORY_LABELS[c];
        category.appendChild(option);
      });
      category.value = todo.category;
      category.addEventListener('change', function () {
        handlers.onUpdate(todo.id, { category: category.value });
      });
      li.appendChild(category);

      var del = el('button');
      del.type = 'button';
      del.textContent = '삭제';
      del.dataset.role = 'delete';
      del.setAttribute('aria-label', todo.title + ' 삭제');
      del.addEventListener('click', function () { handlers.onDelete(todo.id); });
      li.appendChild(del);

      return li;
    }

    function captureFocus() {
      var active = document.activeElement;
      if (!active || !active.dataset || !active.dataset.role) return null;
      var li = active.closest('li');
      return li && li.dataset.id ? { id: li.dataset.id, role: active.dataset.role } : null;
    }

    function restoreFocus(saved) {
      if (!saved) return;
      var items = els.list.children;
      for (var i = 0; i < items.length; i++) {
        if (items[i].dataset.id === saved.id) {
          var target = items[i].querySelector('[data-role="' + saved.role + '"]');
          if (target) target.focus();
          return;
        }
      }
    }

    function renderList(model) {
      var saved = captureFocus();
      els.list.textContent = '';
      model.todos.forEach(function (todo) { els.list.appendChild(buildItem(todo)); });
      restoreFocus(saved);
    }

    /* ---------- 전체 렌더링 ---------- */

    function render(model) {
      lastModel = model;

      els.datePicker.value = model.date;
      els.goToday.disabled = model.isToday;

      els.notice.hidden = !model.notice;
      els.notice.textContent = model.notice || '';

      var overall = model.overall;
      els.progressText.textContent = overall.total === 0
        ? '할 일이 없습니다'
        : '완료 ' + overall.done + ' / 전체 ' + overall.total + ' (' + overall.percent + '%)';
      els.progressFill.style.width = overall.percent + '%';
      els.progressBar.setAttribute('aria-valuenow', String(overall.percent));

      els.categoryProgress.textContent = '';
      S.CATEGORIES.forEach(function (c) {
        var p = model.byCategory[c];
        var li = el('li', 'cat-' + c);
        var label = el('span', 'cat-label');
        label.textContent = S.CATEGORY_LABELS[c] + ' ' + p.done + '/' + p.total;
        var bar = el('div', 'bar bar-small');
        var fill = el('div', 'bar-fill');
        fill.style.width = p.percent + '%';
        bar.appendChild(fill);
        li.appendChild(label);
        li.appendChild(bar);
        els.categoryProgress.appendChild(li);
      });

      Array.prototype.forEach.call(els.filterTabs.querySelectorAll('button'), function (b) {
        var on = b.dataset.filter === model.filter;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });

      renderList(model);

      var emptyText = '';
      if (overall.total === 0) emptyText = '할 일이 없습니다';
      else if (model.todos.length === 0) emptyText = '이 카테고리에는 할 일이 없습니다';
      els.empty.hidden = !emptyText;
      els.empty.textContent = emptyText;

      els.carryOver.disabled = overall.total - overall.done === 0;
    }

    return {
      render: render,
      showToast: showToast,
      focusInput: function () { els.titleInput.focus(); }
    };
  }

  global.TodoView = { create: create };
})(window);

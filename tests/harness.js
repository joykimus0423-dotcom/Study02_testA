(function (global) {
  'use strict';

  var results = [];
  var suite = '';

  function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    var ka = Object.keys(a);
    var kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(function (k) {
      return Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]);
    });
  }

  global.describe = function (name, fn) {
    suite = name;
    fn();
    suite = '';
  };

  global.it = function (name, fn) {
    var label = suite + ' › ' + name;
    try {
      fn();
      results.push({ ok: true, label: label });
    } catch (e) {
      results.push({ ok: false, label: label, message: e.message });
    }
  };

  global.assertEqual = function (actual, expected) {
    if (!deepEqual(actual, expected)) {
      throw new Error('expected ' + JSON.stringify(expected) + ' but got ' + JSON.stringify(actual));
    }
  };

  global.assertTrue = function (value, message) {
    if (value !== true) throw new Error(message || 'expected true but got ' + JSON.stringify(value));
  };

  global.renderResults = function () {
    var total = results.length;
    var failed = results.filter(function (r) { return !r.ok; }).length;
    var list = document.getElementById('results');
    results.forEach(function (r) {
      var li = document.createElement('li');
      li.textContent = (r.ok ? 'PASS ' : 'FAIL ') + r.label + (r.ok ? '' : ' — ' + r.message);
      li.style.color = r.ok ? '#166534' : '#b91c1c';
      list.appendChild(li);
    });
    document.title = total === 0 || failed > 0
      ? 'FAIL ' + failed + ' of ' + total
      : 'PASS ' + total + '/' + total;
  };
})(window);

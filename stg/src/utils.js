
 function memoize(label, fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    var key  = "";
    var len  = args.length;

    fn._memoize = fn._memoize || {};
    fn._memoize[label] = fn._memoize[label] || {};

    while (len--) {
      var x = args[len];
      key += (x === Object(x)) ? JSON.stringify(x) : x;
    }

    if (key in fn._memoize[label]) {
      return fn._memoize[label][key];
    } else {
      return fn._memoize[label][key] = fn.apply(this, args);
    }
  };
}

var $ = function(x) { return document.getElementById(x); }



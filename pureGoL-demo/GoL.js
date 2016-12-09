(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
(function (process,global){
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.txt in the project root for license information.

;(function (undefined) {

  var objectTypes = {
    'boolean': false,
    'function': true,
    'object': true,
    'number': false,
    'string': false,
    'undefined': false
  };

  var root = (objectTypes[typeof window] && window) || this,
    freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports,
    freeModule = objectTypes[typeof module] && module && !module.nodeType && module,
    moduleExports = freeModule && freeModule.exports === freeExports && freeExports,
    freeGlobal = objectTypes[typeof global] && global;

  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
    root = freeGlobal;
  }

  var Rx = {
      internals: {},
      config: {
        Promise: root.Promise
      },
      helpers: { }
  };

  // Defaults
  var noop = Rx.helpers.noop = function () { },
    notDefined = Rx.helpers.notDefined = function (x) { return typeof x === 'undefined'; },
    identity = Rx.helpers.identity = function (x) { return x; },
    pluck = Rx.helpers.pluck = function (property) { return function (x) { return x[property]; }; },
    just = Rx.helpers.just = function (value) { return function () { return value; }; },
    defaultNow = Rx.helpers.defaultNow = Date.now,
    defaultComparer = Rx.helpers.defaultComparer = function (x, y) { return isEqual(x, y); },
    defaultSubComparer = Rx.helpers.defaultSubComparer = function (x, y) { return x > y ? 1 : (x < y ? -1 : 0); },
    defaultKeySerializer = Rx.helpers.defaultKeySerializer = function (x) { return x.toString(); },
    defaultError = Rx.helpers.defaultError = function (err) { throw err; },
    isPromise = Rx.helpers.isPromise = function (p) { return !!p && typeof p.subscribe !== 'function' && typeof p.then === 'function'; },
    asArray = Rx.helpers.asArray = function () { return Array.prototype.slice.call(arguments); },
    not = Rx.helpers.not = function (a) { return !a; },
    isFunction = Rx.helpers.isFunction = (function () {

      var isFn = function (value) {
        return typeof value == 'function' || false;
      }

      // fallback for older versions of Chrome and Safari
      if (isFn(/x/)) {
        isFn = function(value) {
          return typeof value == 'function' && toString.call(value) == '[object Function]';
        };
      }

      return isFn;
    }());

  function cloneArray(arr) { for(var a = [], i = 0, len = arr.length; i < len; i++) { a.push(arr[i]); } return a;}

  Rx.config.longStackSupport = false;
  var hasStacks = false;
  try {
    throw new Error();
  } catch (e) {
    hasStacks = !!e.stack;
  }

  // All code after this point will be filtered from stack traces reported by RxJS
  var rStartingLine = captureLine(), rFileName;

  var STACK_JUMP_SEPARATOR = "From previous event:";

  function makeStackTraceLong(error, observable) {
      // If possible, transform the error stack trace by removing Node and RxJS
      // cruft, then concatenating with the stack trace of `observable`.
      if (hasStacks &&
          observable.stack &&
          typeof error === "object" &&
          error !== null &&
          error.stack &&
          error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
      ) {
        var stacks = [];
        for (var o = observable; !!o; o = o.source) {
          if (o.stack) {
            stacks.unshift(o.stack);
          }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
  }

  function filterStackString(stackString) {
    var lines = stackString.split("\n"),
        desiredLines = [];
    for (var i = 0, len = lines.length; i < len; i++) {
      var line = lines[i];

      if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
        desiredLines.push(line);
      }
    }
    return desiredLines.join("\n");
  }

  function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);
    if (!fileNameAndLineNumber) {
      return false;
    }
    var fileName = fileNameAndLineNumber[0], lineNumber = fileNameAndLineNumber[1];

    return fileName === rFileName &&
      lineNumber >= rStartingLine &&
      lineNumber <= rEndingLine;
  }

  function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
      stackLine.indexOf("(node.js:") !== -1;
  }

  function captureLine() {
    if (!hasStacks) { return; }

    try {
      throw new Error();
    } catch (e) {
      var lines = e.stack.split("\n");
      var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
      var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
      if (!fileNameAndLineNumber) { return; }

      rFileName = fileNameAndLineNumber[0];
      return fileNameAndLineNumber[1];
    }
  }

  function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) { return [attempt1[1], Number(attempt1[2])]; }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) { return [attempt2[1], Number(attempt2[2])]; }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) { return [attempt3[1], Number(attempt3[2])]; }
  }

  var EmptyError = Rx.EmptyError = function() {
    this.message = 'Sequence contains no elements.';
    Error.call(this);
  };
  EmptyError.prototype = Error.prototype;

  var ObjectDisposedError = Rx.ObjectDisposedError = function() {
    this.message = 'Object has been disposed';
    Error.call(this);
  };
  ObjectDisposedError.prototype = Error.prototype;

  var ArgumentOutOfRangeError = Rx.ArgumentOutOfRangeError = function () {
    this.message = 'Argument out of range';
    Error.call(this);
  };
  ArgumentOutOfRangeError.prototype = Error.prototype;

  var NotSupportedError = Rx.NotSupportedError = function (message) {
    this.message = message || 'This operation is not supported';
    Error.call(this);
  };
  NotSupportedError.prototype = Error.prototype;

  var NotImplementedError = Rx.NotImplementedError = function (message) {
    this.message = message || 'This operation is not implemented';
    Error.call(this);
  };
  NotImplementedError.prototype = Error.prototype;

  var notImplemented = Rx.helpers.notImplemented = function () {
    throw new NotImplementedError();
  };

  var notSupported = Rx.helpers.notSupported = function () {
    throw new NotSupportedError();
  };

  // Shim in iterator support
  var $iterator$ = (typeof Symbol === 'function' && Symbol.iterator) ||
    '_es6shim_iterator_';
  // Bug for mozilla version
  if (root.Set && typeof new root.Set()['@@iterator'] === 'function') {
    $iterator$ = '@@iterator';
  }

  var doneEnumerator = Rx.doneEnumerator = { done: true, value: undefined };

  var isIterable = Rx.helpers.isIterable = function (o) {
    return o[$iterator$] !== undefined;
  }

  var isArrayLike = Rx.helpers.isArrayLike = function (o) {
    return o && o.length !== undefined;
  }

  Rx.helpers.iterator = $iterator$;

  var bindCallback = Rx.internals.bindCallback = function (func, thisArg, argCount) {
    if (typeof thisArg === 'undefined') { return func; }
    switch(argCount) {
      case 0:
        return function() {
          return func.call(thisArg)
        };
      case 1:
        return function(arg) {
          return func.call(thisArg, arg);
        }
      case 2:
        return function(value, index) {
          return func.call(thisArg, value, index);
        };
      case 3:
        return function(value, index, collection) {
          return func.call(thisArg, value, index, collection);
        };
    }

    return function() {
      return func.apply(thisArg, arguments);
    };
  };

  /** Used to determine if values are of the language type Object */
  var dontEnums = ['toString',
    'toLocaleString',
    'valueOf',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'constructor'],
  dontEnumsLength = dontEnums.length;

  /** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
    arrayClass = '[object Array]',
    boolClass = '[object Boolean]',
    dateClass = '[object Date]',
    errorClass = '[object Error]',
    funcClass = '[object Function]',
    numberClass = '[object Number]',
    objectClass = '[object Object]',
    regexpClass = '[object RegExp]',
    stringClass = '[object String]';

  var toString = Object.prototype.toString,
    hasOwnProperty = Object.prototype.hasOwnProperty,
    supportsArgsClass = toString.call(arguments) == argsClass, // For less <IE9 && FF<4
    supportNodeClass,
    errorProto = Error.prototype,
    objectProto = Object.prototype,
    stringProto = String.prototype,
    propertyIsEnumerable = objectProto.propertyIsEnumerable;

  try {
    supportNodeClass = !(toString.call(document) == objectClass && !({ 'toString': 0 } + ''));
  } catch (e) {
    supportNodeClass = true;
  }

  var nonEnumProps = {};
  nonEnumProps[arrayClass] = nonEnumProps[dateClass] = nonEnumProps[numberClass] = { 'constructor': true, 'toLocaleString': true, 'toString': true, 'valueOf': true };
  nonEnumProps[boolClass] = nonEnumProps[stringClass] = { 'constructor': true, 'toString': true, 'valueOf': true };
  nonEnumProps[errorClass] = nonEnumProps[funcClass] = nonEnumProps[regexpClass] = { 'constructor': true, 'toString': true };
  nonEnumProps[objectClass] = { 'constructor': true };

  var support = {};
  (function () {
    var ctor = function() { this.x = 1; },
      props = [];

    ctor.prototype = { 'valueOf': 1, 'y': 1 };
    for (var key in new ctor) { props.push(key); }
    for (key in arguments) { }

    // Detect if `name` or `message` properties of `Error.prototype` are enumerable by default.
    support.enumErrorProps = propertyIsEnumerable.call(errorProto, 'message') || propertyIsEnumerable.call(errorProto, 'name');

    // Detect if `prototype` properties are enumerable by default.
    support.enumPrototypes = propertyIsEnumerable.call(ctor, 'prototype');

    // Detect if `arguments` object indexes are non-enumerable
    support.nonEnumArgs = key != 0;

    // Detect if properties shadowing those on `Object.prototype` are non-enumerable.
    support.nonEnumShadows = !/valueOf/.test(props);
  }(1));

  var isObject = Rx.internals.isObject = function(value) {
    var type = typeof value;
    return value && (type == 'function' || type == 'object') || false;
  };

  function keysIn(object) {
    var result = [];
    if (!isObject(object)) {
      return result;
    }
    if (support.nonEnumArgs && object.length && isArguments(object)) {
      object = slice.call(object);
    }
    var skipProto = support.enumPrototypes && typeof object == 'function',
        skipErrorProps = support.enumErrorProps && (object === errorProto || object instanceof Error);

    for (var key in object) {
      if (!(skipProto && key == 'prototype') &&
          !(skipErrorProps && (key == 'message' || key == 'name'))) {
        result.push(key);
      }
    }

    if (support.nonEnumShadows && object !== objectProto) {
      var ctor = object.constructor,
          index = -1,
          length = dontEnumsLength;

      if (object === (ctor && ctor.prototype)) {
        var className = object === stringProto ? stringClass : object === errorProto ? errorClass : toString.call(object),
            nonEnum = nonEnumProps[className];
      }
      while (++index < length) {
        key = dontEnums[index];
        if (!(nonEnum && nonEnum[key]) && hasOwnProperty.call(object, key)) {
          result.push(key);
        }
      }
    }
    return result;
  }

  function internalFor(object, callback, keysFunc) {
    var index = -1,
      props = keysFunc(object),
      length = props.length;

    while (++index < length) {
      var key = props[index];
      if (callback(object[key], key, object) === false) {
        break;
      }
    }
    return object;
  }

  function internalForIn(object, callback) {
    return internalFor(object, callback, keysIn);
  }

  function isNode(value) {
    // IE < 9 presents DOM nodes as `Object` objects except they have `toString`
    // methods that are `typeof` "string" and still can coerce nodes to strings
    return typeof value.toString != 'function' && typeof (value + '') == 'string';
  }

  var isArguments = function(value) {
    return (value && typeof value == 'object') ? toString.call(value) == argsClass : false;
  }

  // fallback for browsers that can't detect `arguments` objects by [[Class]]
  if (!supportsArgsClass) {
    isArguments = function(value) {
      return (value && typeof value == 'object') ? hasOwnProperty.call(value, 'callee') : false;
    };
  }

  var isEqual = Rx.internals.isEqual = function (x, y) {
    return deepEquals(x, y, [], []);
  };

  /** @private
   * Used for deep comparison
   **/
  function deepEquals(a, b, stackA, stackB) {
    // exit early for identical values
    if (a === b) {
      // treat `+0` vs. `-0` as not equal
      return a !== 0 || (1 / a == 1 / b);
    }

    var type = typeof a,
        otherType = typeof b;

    // exit early for unlike primitive values
    if (a === a && (a == null || b == null ||
        (type != 'function' && type != 'object' && otherType != 'function' && otherType != 'object'))) {
      return false;
    }

    // compare [[Class]] names
    var className = toString.call(a),
        otherClass = toString.call(b);

    if (className == argsClass) {
      className = objectClass;
    }
    if (otherClass == argsClass) {
      otherClass = objectClass;
    }
    if (className != otherClass) {
      return false;
    }
    switch (className) {
      case boolClass:
      case dateClass:
        // coerce dates and booleans to numbers, dates to milliseconds and booleans
        // to `1` or `0` treating invalid dates coerced to `NaN` as not equal
        return +a == +b;

      case numberClass:
        // treat `NaN` vs. `NaN` as equal
        return (a != +a) ?
          b != +b :
          // but treat `-0` vs. `+0` as not equal
          (a == 0 ? (1 / a == 1 / b) : a == +b);

      case regexpClass:
      case stringClass:
        // coerce regexes to strings (http://es5.github.io/#x15.10.6.4)
        // treat string primitives and their corresponding object instances as equal
        return a == String(b);
    }
    var isArr = className == arrayClass;
    if (!isArr) {

      // exit for functions and DOM nodes
      if (className != objectClass || (!support.nodeClass && (isNode(a) || isNode(b)))) {
        return false;
      }
      // in older versions of Opera, `arguments` objects have `Array` constructors
      var ctorA = !support.argsObject && isArguments(a) ? Object : a.constructor,
          ctorB = !support.argsObject && isArguments(b) ? Object : b.constructor;

      // non `Object` object instances with different constructors are not equal
      if (ctorA != ctorB &&
            !(hasOwnProperty.call(a, 'constructor') && hasOwnProperty.call(b, 'constructor')) &&
            !(isFunction(ctorA) && ctorA instanceof ctorA && isFunction(ctorB) && ctorB instanceof ctorB) &&
            ('constructor' in a && 'constructor' in b)
          ) {
        return false;
      }
    }
    // assume cyclic structures are equal
    // the algorithm for detecting cyclic structures is adapted from ES 5.1
    // section 15.12.3, abstract operation `JO` (http://es5.github.io/#x15.12.3)
    var initedStack = !stackA;
    stackA || (stackA = []);
    stackB || (stackB = []);

    var length = stackA.length;
    while (length--) {
      if (stackA[length] == a) {
        return stackB[length] == b;
      }
    }
    var size = 0;
    var result = true;

    // add `a` and `b` to the stack of traversed objects
    stackA.push(a);
    stackB.push(b);

    // recursively compare objects and arrays (susceptible to call stack limits)
    if (isArr) {
      // compare lengths to determine if a deep comparison is necessary
      length = a.length;
      size = b.length;
      result = size == length;

      if (result) {
        // deep compare the contents, ignoring non-numeric properties
        while (size--) {
          var index = length,
              value = b[size];

          if (!(result = deepEquals(a[size], value, stackA, stackB))) {
            break;
          }
        }
      }
    }
    else {
      // deep compare objects using `forIn`, instead of `forOwn`, to avoid `Object.keys`
      // which, in this case, is more costly
      internalForIn(b, function(value, key, b) {
        if (hasOwnProperty.call(b, key)) {
          // count the number of properties.
          size++;
          // deep compare each property value.
          return (result = hasOwnProperty.call(a, key) && deepEquals(a[key], value, stackA, stackB));
        }
      });

      if (result) {
        // ensure both objects have the same number of properties
        internalForIn(a, function(value, key, a) {
          if (hasOwnProperty.call(a, key)) {
            // `size` will be `-1` if `a` has more properties than `b`
            return (result = --size > -1);
          }
        });
      }
    }
    stackA.pop();
    stackB.pop();

    return result;
  }

  var hasProp = {}.hasOwnProperty,
      slice = Array.prototype.slice;

  var inherits = this.inherits = Rx.internals.inherits = function (child, parent) {
    function __() { this.constructor = child; }
    __.prototype = parent.prototype;
    child.prototype = new __();
  };

  var addProperties = Rx.internals.addProperties = function (obj) {
    for(var sources = [], i = 1, len = arguments.length; i < len; i++) { sources.push(arguments[i]); }
    for (var idx = 0, ln = sources.length; idx < ln; idx++) {
      var source = sources[idx];
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    }
  };

  // Rx Utils
  var addRef = Rx.internals.addRef = function (xs, r) {
    return new AnonymousObservable(function (observer) {
      return new CompositeDisposable(r.getDisposable(), xs.subscribe(observer));
    });
  };

  function arrayInitialize(count, factory) {
    var a = new Array(count);
    for (var i = 0; i < count; i++) {
      a[i] = factory();
    }
    return a;
  }

  var errorObj = {e: {}};
  var tryCatchTarget;
  function tryCatcher() {
    try {
      return tryCatchTarget.apply(this, arguments);
    } catch (e) {
      errorObj.e = e;
      return errorObj;
    }
  }
  function tryCatch(fn) {
    if (!isFunction(fn)) { throw new TypeError('fn must be a function'); }
    tryCatchTarget = fn;
    return tryCatcher;
  }
  function thrower(e) {
    throw e;
  }

  // Collections
  function IndexedItem(id, value) {
    this.id = id;
    this.value = value;
  }

  IndexedItem.prototype.compareTo = function (other) {
    var c = this.value.compareTo(other.value);
    c === 0 && (c = this.id - other.id);
    return c;
  };

  // Priority Queue for Scheduling
  var PriorityQueue = Rx.internals.PriorityQueue = function (capacity) {
    this.items = new Array(capacity);
    this.length = 0;
  };

  var priorityProto = PriorityQueue.prototype;
  priorityProto.isHigherPriority = function (left, right) {
    return this.items[left].compareTo(this.items[right]) < 0;
  };

  priorityProto.percolate = function (index) {
    if (index >= this.length || index < 0) { return; }
    var parent = index - 1 >> 1;
    if (parent < 0 || parent === index) { return; }
    if (this.isHigherPriority(index, parent)) {
      var temp = this.items[index];
      this.items[index] = this.items[parent];
      this.items[parent] = temp;
      this.percolate(parent);
    }
  };

  priorityProto.heapify = function (index) {
    +index || (index = 0);
    if (index >= this.length || index < 0) { return; }
    var left = 2 * index + 1,
        right = 2 * index + 2,
        first = index;
    if (left < this.length && this.isHigherPriority(left, first)) {
      first = left;
    }
    if (right < this.length && this.isHigherPriority(right, first)) {
      first = right;
    }
    if (first !== index) {
      var temp = this.items[index];
      this.items[index] = this.items[first];
      this.items[first] = temp;
      this.heapify(first);
    }
  };

  priorityProto.peek = function () { return this.items[0].value; };

  priorityProto.removeAt = function (index) {
    this.items[index] = this.items[--this.length];
    this.items[this.length] = undefined;
    this.heapify();
  };

  priorityProto.dequeue = function () {
    var result = this.peek();
    this.removeAt(0);
    return result;
  };

  priorityProto.enqueue = function (item) {
    var index = this.length++;
    this.items[index] = new IndexedItem(PriorityQueue.count++, item);
    this.percolate(index);
  };

  priorityProto.remove = function (item) {
    for (var i = 0; i < this.length; i++) {
      if (this.items[i].value === item) {
        this.removeAt(i);
        return true;
      }
    }
    return false;
  };
  PriorityQueue.count = 0;

  /**
   * Represents a group of disposable resources that are disposed together.
   * @constructor
   */
  var CompositeDisposable = Rx.CompositeDisposable = function () {
    var args = [], i, len;
    if (Array.isArray(arguments[0])) {
      args = arguments[0];
      len = args.length;
    } else {
      len = arguments.length;
      args = new Array(len);
      for(i = 0; i < len; i++) { args[i] = arguments[i]; }
    }
    for(i = 0; i < len; i++) {
      if (!isDisposable(args[i])) { throw new TypeError('Not a disposable'); }
    }
    this.disposables = args;
    this.isDisposed = false;
    this.length = args.length;
  };

  var CompositeDisposablePrototype = CompositeDisposable.prototype;

  /**
   * Adds a disposable to the CompositeDisposable or disposes the disposable if the CompositeDisposable is disposed.
   * @param {Mixed} item Disposable to add.
   */
  CompositeDisposablePrototype.add = function (item) {
    if (this.isDisposed) {
      item.dispose();
    } else {
      this.disposables.push(item);
      this.length++;
    }
  };

  /**
   * Removes and disposes the first occurrence of a disposable from the CompositeDisposable.
   * @param {Mixed} item Disposable to remove.
   * @returns {Boolean} true if found; false otherwise.
   */
  CompositeDisposablePrototype.remove = function (item) {
    var shouldDispose = false;
    if (!this.isDisposed) {
      var idx = this.disposables.indexOf(item);
      if (idx !== -1) {
        shouldDispose = true;
        this.disposables.splice(idx, 1);
        this.length--;
        item.dispose();
      }
    }
    return shouldDispose;
  };

  /**
   *  Disposes all disposables in the group and removes them from the group.
   */
  CompositeDisposablePrototype.dispose = function () {
    if (!this.isDisposed) {
      this.isDisposed = true;
      var len = this.disposables.length, currentDisposables = new Array(len);
      for(var i = 0; i < len; i++) { currentDisposables[i] = this.disposables[i]; }
      this.disposables = [];
      this.length = 0;

      for (i = 0; i < len; i++) {
        currentDisposables[i].dispose();
      }
    }
  };

  /**
   * Provides a set of static methods for creating Disposables.
   * @param {Function} dispose Action to run during the first call to dispose. The action is guaranteed to be run at most once.
   */
  var Disposable = Rx.Disposable = function (action) {
    this.isDisposed = false;
    this.action = action || noop;
  };

  /** Performs the task of cleaning up resources. */
  Disposable.prototype.dispose = function () {
    if (!this.isDisposed) {
      this.action();
      this.isDisposed = true;
    }
  };

  /**
   * Creates a disposable object that invokes the specified action when disposed.
   * @param {Function} dispose Action to run during the first call to dispose. The action is guaranteed to be run at most once.
   * @return {Disposable} The disposable object that runs the given action upon disposal.
   */
  var disposableCreate = Disposable.create = function (action) { return new Disposable(action); };

  /**
   * Gets the disposable that does nothing when disposed.
   */
  var disposableEmpty = Disposable.empty = { dispose: noop };

  /**
   * Validates whether the given object is a disposable
   * @param {Object} Object to test whether it has a dispose method
   * @returns {Boolean} true if a disposable object, else false.
   */
  var isDisposable = Disposable.isDisposable = function (d) {
    return d && isFunction(d.dispose);
  };

  var checkDisposed = Disposable.checkDisposed = function (disposable) {
    if (disposable.isDisposed) { throw new ObjectDisposedError(); }
  };

  // Single assignment
  var SingleAssignmentDisposable = Rx.SingleAssignmentDisposable = function () {
    this.isDisposed = false;
    this.current = null;
  };
  SingleAssignmentDisposable.prototype.getDisposable = function () {
    return this.current;
  };
  SingleAssignmentDisposable.prototype.setDisposable = function (value) {
    if (this.current) { throw new Error('Disposable has already been assigned'); }
    var shouldDispose = this.isDisposed;
    !shouldDispose && (this.current = value);
    shouldDispose && value && value.dispose();
  };
  SingleAssignmentDisposable.prototype.dispose = function () {
    if (!this.isDisposed) {
      this.isDisposed = true;
      var old = this.current;
      this.current = null;
    }
    old && old.dispose();
  };

  // Multiple assignment disposable
  var SerialDisposable = Rx.SerialDisposable = function () {
    this.isDisposed = false;
    this.current = null;
  };
  SerialDisposable.prototype.getDisposable = function () {
    return this.current;
  };
  SerialDisposable.prototype.setDisposable = function (value) {
    var shouldDispose = this.isDisposed;
    if (!shouldDispose) {
      var old = this.current;
      this.current = value;
    }
    old && old.dispose();
    shouldDispose && value && value.dispose();
  };
  SerialDisposable.prototype.dispose = function () {
    if (!this.isDisposed) {
      this.isDisposed = true;
      var old = this.current;
      this.current = null;
    }
    old && old.dispose();
  };

  /**
   * Represents a disposable resource that only disposes its underlying disposable resource when all dependent disposable objects have been disposed.
   */
  var RefCountDisposable = Rx.RefCountDisposable = (function () {

    function InnerDisposable(disposable) {
      this.disposable = disposable;
      this.disposable.count++;
      this.isInnerDisposed = false;
    }

    InnerDisposable.prototype.dispose = function () {
      if (!this.disposable.isDisposed && !this.isInnerDisposed) {
        this.isInnerDisposed = true;
        this.disposable.count--;
        if (this.disposable.count === 0 && this.disposable.isPrimaryDisposed) {
          this.disposable.isDisposed = true;
          this.disposable.underlyingDisposable.dispose();
        }
      }
    };

    /**
     * Initializes a new instance of the RefCountDisposable with the specified disposable.
     * @constructor
     * @param {Disposable} disposable Underlying disposable.
      */
    function RefCountDisposable(disposable) {
      this.underlyingDisposable = disposable;
      this.isDisposed = false;
      this.isPrimaryDisposed = false;
      this.count = 0;
    }

    /**
     * Disposes the underlying disposable only when all dependent disposables have been disposed
     */
    RefCountDisposable.prototype.dispose = function () {
      if (!this.isDisposed && !this.isPrimaryDisposed) {
        this.isPrimaryDisposed = true;
        if (this.count === 0) {
          this.isDisposed = true;
          this.underlyingDisposable.dispose();
        }
      }
    };

    /**
     * Returns a dependent disposable that when disposed decreases the refcount on the underlying disposable.
     * @returns {Disposable} A dependent disposable contributing to the reference count that manages the underlying disposable's lifetime.
     */
    RefCountDisposable.prototype.getDisposable = function () {
      return this.isDisposed ? disposableEmpty : new InnerDisposable(this);
    };

    return RefCountDisposable;
  })();

  function ScheduledDisposable(scheduler, disposable) {
    this.scheduler = scheduler;
    this.disposable = disposable;
    this.isDisposed = false;
  }

  function scheduleItem(s, self) {
    if (!self.isDisposed) {
      self.isDisposed = true;
      self.disposable.dispose();
    }
  }

  ScheduledDisposable.prototype.dispose = function () {
    this.scheduler.scheduleWithState(this, scheduleItem);
  };

  var ScheduledItem = Rx.internals.ScheduledItem = function (scheduler, state, action, dueTime, comparer) {
    this.scheduler = scheduler;
    this.state = state;
    this.action = action;
    this.dueTime = dueTime;
    this.comparer = comparer || defaultSubComparer;
    this.disposable = new SingleAssignmentDisposable();
  }

  ScheduledItem.prototype.invoke = function () {
    this.disposable.setDisposable(this.invokeCore());
  };

  ScheduledItem.prototype.compareTo = function (other) {
    return this.comparer(this.dueTime, other.dueTime);
  };

  ScheduledItem.prototype.isCancelled = function () {
    return this.disposable.isDisposed;
  };

  ScheduledItem.prototype.invokeCore = function () {
    return this.action(this.scheduler, this.state);
  };

  /** Provides a set of static properties to access commonly used schedulers. */
  var Scheduler = Rx.Scheduler = (function () {

    function Scheduler(now, schedule, scheduleRelative, scheduleAbsolute) {
      this.now = now;
      this._schedule = schedule;
      this._scheduleRelative = scheduleRelative;
      this._scheduleAbsolute = scheduleAbsolute;
    }

    /** Determines whether the given object is a scheduler */
    Scheduler.isScheduler = function (s) {
      return s instanceof Scheduler;
    }

    function invokeAction(scheduler, action) {
      action();
      return disposableEmpty;
    }

    var schedulerProto = Scheduler.prototype;

    /**
     * Schedules an action to be executed.
     * @param {Function} action Action to execute.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    schedulerProto.schedule = function (action) {
      return this._schedule(action, invokeAction);
    };

    /**
     * Schedules an action to be executed.
     * @param state State passed to the action to be executed.
     * @param {Function} action Action to be executed.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    schedulerProto.scheduleWithState = function (state, action) {
      return this._schedule(state, action);
    };

    /**
     * Schedules an action to be executed after the specified relative due time.
     * @param {Function} action Action to execute.
     * @param {Number} dueTime Relative time after which to execute the action.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    schedulerProto.scheduleWithRelative = function (dueTime, action) {
      return this._scheduleRelative(action, dueTime, invokeAction);
    };

    /**
     * Schedules an action to be executed after dueTime.
     * @param state State passed to the action to be executed.
     * @param {Function} action Action to be executed.
     * @param {Number} dueTime Relative time after which to execute the action.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    schedulerProto.scheduleWithRelativeAndState = function (state, dueTime, action) {
      return this._scheduleRelative(state, dueTime, action);
    };

    /**
     * Schedules an action to be executed at the specified absolute due time.
     * @param {Function} action Action to execute.
     * @param {Number} dueTime Absolute time at which to execute the action.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
      */
    schedulerProto.scheduleWithAbsolute = function (dueTime, action) {
      return this._scheduleAbsolute(action, dueTime, invokeAction);
    };

    /**
     * Schedules an action to be executed at dueTime.
     * @param {Mixed} state State passed to the action to be executed.
     * @param {Function} action Action to be executed.
     * @param {Number}dueTime Absolute time at which to execute the action.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    schedulerProto.scheduleWithAbsoluteAndState = function (state, dueTime, action) {
      return this._scheduleAbsolute(state, dueTime, action);
    };

    /** Gets the current time according to the local machine's system clock. */
    Scheduler.now = defaultNow;

    /**
     * Normalizes the specified TimeSpan value to a positive value.
     * @param {Number} timeSpan The time span value to normalize.
     * @returns {Number} The specified TimeSpan value if it is zero or positive; otherwise, 0
     */
    Scheduler.normalize = function (timeSpan) {
      timeSpan < 0 && (timeSpan = 0);
      return timeSpan;
    };

    return Scheduler;
  }());

  var normalizeTime = Scheduler.normalize, isScheduler = Scheduler.isScheduler;

  (function (schedulerProto) {

    function invokeRecImmediate(scheduler, pair) {
      var state = pair[0], action = pair[1], group = new CompositeDisposable();

      function recursiveAction(state1) {
        action(state1, function (state2) {
          var isAdded = false, isDone = false,
          d = scheduler.scheduleWithState(state2, function (scheduler1, state3) {
            if (isAdded) {
              group.remove(d);
            } else {
              isDone = true;
            }
            recursiveAction(state3);
            return disposableEmpty;
          });
          if (!isDone) {
            group.add(d);
            isAdded = true;
          }
        });
      }
      recursiveAction(state);
      return group;
    }

    function invokeRecDate(scheduler, pair, method) {
      var state = pair[0], action = pair[1], group = new CompositeDisposable();
      function recursiveAction(state1) {
        action(state1, function (state2, dueTime1) {
          var isAdded = false, isDone = false,
          d = scheduler[method](state2, dueTime1, function (scheduler1, state3) {
            if (isAdded) {
              group.remove(d);
            } else {
              isDone = true;
            }
            recursiveAction(state3);
            return disposableEmpty;
          });
          if (!isDone) {
            group.add(d);
            isAdded = true;
          }
        });
      };
      recursiveAction(state);
      return group;
    }

    function scheduleInnerRecursive(action, self) {
      action(function(dt) { self(action, dt); });
    }

    /**
     * Schedules an action to be executed recursively.
     * @param {Function} action Action to execute recursively. The parameter passed to the action is used to trigger recursive scheduling of the action.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    schedulerProto.scheduleRecursive = function (action) {
      return this.scheduleRecursiveWithState(action, scheduleInnerRecursive);
    };

    /**
     * Schedules an action to be executed recursively.
     * @param {Mixed} state State passed to the action to be executed.
     * @param {Function} action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in recursive invocation state.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    schedulerProto.scheduleRecursiveWithState = function (state, action) {
      return this.scheduleWithState([state, action], invokeRecImmediate);
    };

    /**
     * Schedules an action to be executed recursively after a specified relative due time.
     * @param {Function} action Action to execute recursively. The parameter passed to the action is used to trigger recursive scheduling of the action at the specified relative time.
     * @param {Number}dueTime Relative time after which to execute the action for the first time.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    schedulerProto.scheduleRecursiveWithRelative = function (dueTime, action) {
      return this.scheduleRecursiveWithRelativeAndState(action, dueTime, scheduleInnerRecursive);
    };

    /**
     * Schedules an action to be executed recursively after a specified relative due time.
     * @param {Mixed} state State passed to the action to be executed.
     * @param {Function} action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in the recursive due time and invocation state.
     * @param {Number}dueTime Relative time after which to execute the action for the first time.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    schedulerProto.scheduleRecursiveWithRelativeAndState = function (state, dueTime, action) {
      return this._scheduleRelative([state, action], dueTime, function (s, p) {
        return invokeRecDate(s, p, 'scheduleWithRelativeAndState');
      });
    };

    /**
     * Schedules an action to be executed recursively at a specified absolute due time.
     * @param {Function} action Action to execute recursively. The parameter passed to the action is used to trigger recursive scheduling of the action at the specified absolute time.
     * @param {Number}dueTime Absolute time at which to execute the action for the first time.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    schedulerProto.scheduleRecursiveWithAbsolute = function (dueTime, action) {
      return this.scheduleRecursiveWithAbsoluteAndState(action, dueTime, scheduleInnerRecursive);
    };

    /**
     * Schedules an action to be executed recursively at a specified absolute due time.
     * @param {Mixed} state State passed to the action to be executed.
     * @param {Function} action Action to execute recursively. The last parameter passed to the action is used to trigger recursive scheduling of the action, passing in the recursive due time and invocation state.
     * @param {Number}dueTime Absolute time at which to execute the action for the first time.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    schedulerProto.scheduleRecursiveWithAbsoluteAndState = function (state, dueTime, action) {
      return this._scheduleAbsolute([state, action], dueTime, function (s, p) {
        return invokeRecDate(s, p, 'scheduleWithAbsoluteAndState');
      });
    };
  }(Scheduler.prototype));

  (function (schedulerProto) {

    /**
     * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be scheduled using window.setInterval for the base implementation.
     * @param {Number} period Period for running the work periodically.
     * @param {Function} action Action to be executed.
     * @returns {Disposable} The disposable object used to cancel the scheduled recurring action (best effort).
     */
    Scheduler.prototype.schedulePeriodic = function (period, action) {
      return this.schedulePeriodicWithState(null, period, action);
    };

    /**
     * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be scheduled using window.setInterval for the base implementation.
     * @param {Mixed} state Initial state passed to the action upon the first iteration.
     * @param {Number} period Period for running the work periodically.
     * @param {Function} action Action to be executed, potentially updating the state.
     * @returns {Disposable} The disposable object used to cancel the scheduled recurring action (best effort).
     */
    Scheduler.prototype.schedulePeriodicWithState = function(state, period, action) {
      if (typeof root.setInterval === 'undefined') { throw new NotSupportedError(); }
      period = normalizeTime(period);
      var s = state, id = root.setInterval(function () { s = action(s); }, period);
      return disposableCreate(function () { root.clearInterval(id); });
    };

  }(Scheduler.prototype));

  (function (schedulerProto) {
    /**
     * Returns a scheduler that wraps the original scheduler, adding exception handling for scheduled actions.
     * @param {Function} handler Handler that's run if an exception is caught. The exception will be rethrown if the handler returns false.
     * @returns {Scheduler} Wrapper around the original scheduler, enforcing exception handling.
     */
    schedulerProto.catchError = schedulerProto['catch'] = function (handler) {
      return new CatchScheduler(this, handler);
    };
  }(Scheduler.prototype));

  var SchedulePeriodicRecursive = Rx.internals.SchedulePeriodicRecursive = (function () {
    function tick(command, recurse) {
      recurse(0, this._period);
      try {
        this._state = this._action(this._state);
      } catch (e) {
        this._cancel.dispose();
        throw e;
      }
    }

    function SchedulePeriodicRecursive(scheduler, state, period, action) {
      this._scheduler = scheduler;
      this._state = state;
      this._period = period;
      this._action = action;
    }

    SchedulePeriodicRecursive.prototype.start = function () {
      var d = new SingleAssignmentDisposable();
      this._cancel = d;
      d.setDisposable(this._scheduler.scheduleRecursiveWithRelativeAndState(0, this._period, tick.bind(this)));

      return d;
    };

    return SchedulePeriodicRecursive;
  }());

  /** Gets a scheduler that schedules work immediately on the current thread. */
  var immediateScheduler = Scheduler.immediate = (function () {
    function scheduleNow(state, action) { return action(this, state); }
    return new Scheduler(defaultNow, scheduleNow, notSupported, notSupported);
  }());

  /**
   * Gets a scheduler that schedules work as soon as possible on the current thread.
   */
  var currentThreadScheduler = Scheduler.currentThread = (function () {
    var queue;

    function runTrampoline () {
      while (queue.length > 0) {
        var item = queue.dequeue();
        !item.isCancelled() && item.invoke();
      }
    }

    function scheduleNow(state, action) {
      var si = new ScheduledItem(this, state, action, this.now());

      if (!queue) {
        queue = new PriorityQueue(4);
        queue.enqueue(si);

        var result = tryCatch(runTrampoline)();
        queue = null;
        if (result === errorObj) { return thrower(result.e); }
      } else {
        queue.enqueue(si);
      }
      return si.disposable;
    }

    var currentScheduler = new Scheduler(defaultNow, scheduleNow, notSupported, notSupported);
    currentScheduler.scheduleRequired = function () { return !queue; };

    return currentScheduler;
  }());

  var scheduleMethod, clearMethod;

  var localTimer = (function () {
    var localSetTimeout, localClearTimeout = noop;
    if (!!root.setTimeout) {
      localSetTimeout = root.setTimeout;
      localClearTimeout = root.clearTimeout;
    } else if (!!root.WScript) {
      localSetTimeout = function (fn, time) {
        root.WScript.Sleep(time);
        fn();
      };
    } else {
      throw new NotSupportedError();
    }

    return {
      setTimeout: localSetTimeout,
      clearTimeout: localClearTimeout
    };
  }());
  var localSetTimeout = localTimer.setTimeout,
    localClearTimeout = localTimer.clearTimeout;

  (function () {

    var nextHandle = 1, tasksByHandle = {}, currentlyRunning = false;

    clearMethod = function (handle) {
      delete tasksByHandle[handle];
    };

    function runTask(handle) {
      if (currentlyRunning) {
        localSetTimeout(function () { runTask(handle) }, 0);
      } else {
        var task = tasksByHandle[handle];
        if (task) {
          currentlyRunning = true;
          var result = tryCatch(task)();
          clearMethod(handle);
          currentlyRunning = false;
          if (result === errorObj) { return thrower(result.e); }
        }
      }
    }

    var reNative = RegExp('^' +
      String(toString)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/toString| for [^\]]+/g, '.*?') + '$'
    );

    var setImmediate = typeof (setImmediate = freeGlobal && moduleExports && freeGlobal.setImmediate) == 'function' &&
      !reNative.test(setImmediate) && setImmediate;

    function postMessageSupported () {
      // Ensure not in a worker
      if (!root.postMessage || root.importScripts) { return false; }
      var isAsync = false, oldHandler = root.onmessage;
      // Test for async
      root.onmessage = function () { isAsync = true; };
      root.postMessage('', '*');
      root.onmessage = oldHandler;

      return isAsync;
    }

    // Use in order, setImmediate, nextTick, postMessage, MessageChannel, script readystatechanged, setTimeout
    if (isFunction(setImmediate)) {
      scheduleMethod = function (action) {
        var id = nextHandle++;
        tasksByHandle[id] = action;
        setImmediate(function () { runTask(id); });

        return id;
      };
    } else if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
      scheduleMethod = function (action) {
        var id = nextHandle++;
        tasksByHandle[id] = action;
        process.nextTick(function () { runTask(id); });

        return id;
      };
    } else if (postMessageSupported()) {
      var MSG_PREFIX = 'ms.rx.schedule' + Math.random();

      function onGlobalPostMessage(event) {
        // Only if we're a match to avoid any other global events
        if (typeof event.data === 'string' && event.data.substring(0, MSG_PREFIX.length) === MSG_PREFIX) {
          runTask(event.data.substring(MSG_PREFIX.length));
        }
      }

      if (root.addEventListener) {
        root.addEventListener('message', onGlobalPostMessage, false);
      } else if (root.attachEvent) {
        root.attachEvent('onmessage', onGlobalPostMessage);
      } else {
        root.onmessage = onGlobalPostMessage;
      }

      scheduleMethod = function (action) {
        var id = nextHandle++;
        tasksByHandle[id] = action;
        root.postMessage(MSG_PREFIX + currentId, '*');
        return id;
      };
    } else if (!!root.MessageChannel) {
      var channel = new root.MessageChannel();

      channel.port1.onmessage = function (e) { runTask(e.data); };

      scheduleMethod = function (action) {
        var id = nextHandle++;
        tasksByHandle[id] = action;
        channel.port2.postMessage(id);
        return id;
      };
    } else if ('document' in root && 'onreadystatechange' in root.document.createElement('script')) {

      scheduleMethod = function (action) {
        var scriptElement = root.document.createElement('script');
        var id = nextHandle++;
        tasksByHandle[id] = action;

        scriptElement.onreadystatechange = function () {
          runTask(id);
          scriptElement.onreadystatechange = null;
          scriptElement.parentNode.removeChild(scriptElement);
          scriptElement = null;
        };
        root.document.documentElement.appendChild(scriptElement);
        return id;
      };

    } else {
      scheduleMethod = function (action) {
        var id = nextHandle++;
        tasksByHandle[id] = action;
        localSetTimeout(function () {
          runTask(id);
        }, 0);

        return id;
      };
    }
  }());

  /**
   * Gets a scheduler that schedules work via a timed callback based upon platform.
   */
  var timeoutScheduler = Scheduler.timeout = Scheduler['default'] = (function () {

    function scheduleNow(state, action) {
      var scheduler = this, disposable = new SingleAssignmentDisposable();
      var id = scheduleMethod(function () {
        !disposable.isDisposed && disposable.setDisposable(action(scheduler, state));
      });
      return new CompositeDisposable(disposable, disposableCreate(function () {
        clearMethod(id);
      }));
    }

    function scheduleRelative(state, dueTime, action) {
      var scheduler = this, dt = Scheduler.normalize(dueTime), disposable = new SingleAssignmentDisposable();
      if (dt === 0) { return scheduler.scheduleWithState(state, action); }
      var id = localSetTimeout(function () {
        !disposable.isDisposed && disposable.setDisposable(action(scheduler, state));
      }, dt);
      return new CompositeDisposable(disposable, disposableCreate(function () {
        localClearTimeout(id);
      }));
    }

    function scheduleAbsolute(state, dueTime, action) {
      return this.scheduleWithRelativeAndState(state, dueTime - this.now(), action);
    }

    return new Scheduler(defaultNow, scheduleNow, scheduleRelative, scheduleAbsolute);
  })();

  var CatchScheduler = (function (__super__) {

    function scheduleNow(state, action) {
      return this._scheduler.scheduleWithState(state, this._wrap(action));
    }

    function scheduleRelative(state, dueTime, action) {
      return this._scheduler.scheduleWithRelativeAndState(state, dueTime, this._wrap(action));
    }

    function scheduleAbsolute(state, dueTime, action) {
      return this._scheduler.scheduleWithAbsoluteAndState(state, dueTime, this._wrap(action));
    }

    inherits(CatchScheduler, __super__);

    function CatchScheduler(scheduler, handler) {
      this._scheduler = scheduler;
      this._handler = handler;
      this._recursiveOriginal = null;
      this._recursiveWrapper = null;
      __super__.call(this, this._scheduler.now.bind(this._scheduler), scheduleNow, scheduleRelative, scheduleAbsolute);
    }

    CatchScheduler.prototype._clone = function (scheduler) {
        return new CatchScheduler(scheduler, this._handler);
    };

    CatchScheduler.prototype._wrap = function (action) {
      var parent = this;
      return function (self, state) {
        try {
          return action(parent._getRecursiveWrapper(self), state);
        } catch (e) {
          if (!parent._handler(e)) { throw e; }
          return disposableEmpty;
        }
      };
    };

    CatchScheduler.prototype._getRecursiveWrapper = function (scheduler) {
      if (this._recursiveOriginal !== scheduler) {
        this._recursiveOriginal = scheduler;
        var wrapper = this._clone(scheduler);
        wrapper._recursiveOriginal = scheduler;
        wrapper._recursiveWrapper = wrapper;
        this._recursiveWrapper = wrapper;
      }
      return this._recursiveWrapper;
    };

    CatchScheduler.prototype.schedulePeriodicWithState = function (state, period, action) {
      var self = this, failed = false, d = new SingleAssignmentDisposable();

      d.setDisposable(this._scheduler.schedulePeriodicWithState(state, period, function (state1) {
        if (failed) { return null; }
        try {
          return action(state1);
        } catch (e) {
          failed = true;
          if (!self._handler(e)) { throw e; }
          d.dispose();
          return null;
        }
      }));

      return d;
    };

    return CatchScheduler;
  }(Scheduler));

  /**
   *  Represents a notification to an observer.
   */
  var Notification = Rx.Notification = (function () {
    function Notification(kind, value, exception, accept, acceptObservable, toString) {
      this.kind = kind;
      this.value = value;
      this.exception = exception;
      this._accept = accept;
      this._acceptObservable = acceptObservable;
      this.toString = toString;
    }

    /**
     * Invokes the delegate corresponding to the notification or the observer's method corresponding to the notification and returns the produced result.
     *
     * @memberOf Notification
     * @param {Any} observerOrOnNext Delegate to invoke for an OnNext notification or Observer to invoke the notification on..
     * @param {Function} onError Delegate to invoke for an OnError notification.
     * @param {Function} onCompleted Delegate to invoke for an OnCompleted notification.
     * @returns {Any} Result produced by the observation.
     */
    Notification.prototype.accept = function (observerOrOnNext, onError, onCompleted) {
      return observerOrOnNext && typeof observerOrOnNext === 'object' ?
        this._acceptObservable(observerOrOnNext) :
        this._accept(observerOrOnNext, onError, onCompleted);
    };

    /**
     * Returns an observable sequence with a single notification.
     *
     * @memberOf Notifications
     * @param {Scheduler} [scheduler] Scheduler to send out the notification calls on.
     * @returns {Observable} The observable sequence that surfaces the behavior of the notification upon subscription.
     */
    Notification.prototype.toObservable = function (scheduler) {
      var self = this;
      isScheduler(scheduler) || (scheduler = immediateScheduler);
      return new AnonymousObservable(function (observer) {
        return scheduler.scheduleWithState(self, function (_, notification) {
          notification._acceptObservable(observer);
          notification.kind === 'N' && observer.onCompleted();
        });
      });
    };

    return Notification;
  })();

  /**
   * Creates an object that represents an OnNext notification to an observer.
   * @param {Any} value The value contained in the notification.
   * @returns {Notification} The OnNext notification containing the value.
   */
  var notificationCreateOnNext = Notification.createOnNext = (function () {
      function _accept(onNext) { return onNext(this.value); }
      function _acceptObservable(observer) { return observer.onNext(this.value); }
      function toString() { return 'OnNext(' + this.value + ')'; }

      return function (value) {
        return new Notification('N', value, null, _accept, _acceptObservable, toString);
      };
  }());

  /**
   * Creates an object that represents an OnError notification to an observer.
   * @param {Any} error The exception contained in the notification.
   * @returns {Notification} The OnError notification containing the exception.
   */
  var notificationCreateOnError = Notification.createOnError = (function () {
    function _accept (onNext, onError) { return onError(this.exception); }
    function _acceptObservable(observer) { return observer.onError(this.exception); }
    function toString () { return 'OnError(' + this.exception + ')'; }

    return function (e) {
      return new Notification('E', null, e, _accept, _acceptObservable, toString);
    };
  }());

  /**
   * Creates an object that represents an OnCompleted notification to an observer.
   * @returns {Notification} The OnCompleted notification.
   */
  var notificationCreateOnCompleted = Notification.createOnCompleted = (function () {
    function _accept (onNext, onError, onCompleted) { return onCompleted(); }
    function _acceptObservable(observer) { return observer.onCompleted(); }
    function toString () { return 'OnCompleted()'; }

    return function () {
      return new Notification('C', null, null, _accept, _acceptObservable, toString);
    };
  }());

  /**
   * Supports push-style iteration over an observable sequence.
   */
  var Observer = Rx.Observer = function () { };

  /**
   *  Creates a notification callback from an observer.
   * @returns The action that forwards its input notification to the underlying observer.
   */
  Observer.prototype.toNotifier = function () {
    var observer = this;
    return function (n) { return n.accept(observer); };
  };

  /**
   *  Hides the identity of an observer.
   * @returns An observer that hides the identity of the specified observer.
   */
  Observer.prototype.asObserver = function () {
    return new AnonymousObserver(this.onNext.bind(this), this.onError.bind(this), this.onCompleted.bind(this));
  };

  /**
   *  Checks access to the observer for grammar violations. This includes checking for multiple OnError or OnCompleted calls, as well as reentrancy in any of the observer methods.
   *  If a violation is detected, an Error is thrown from the offending observer method call.
   * @returns An observer that checks callbacks invocations against the observer grammar and, if the checks pass, forwards those to the specified observer.
   */
  Observer.prototype.checked = function () { return new CheckedObserver(this); };

  /**
   *  Creates an observer from the specified OnNext, along with optional OnError, and OnCompleted actions.
   * @param {Function} [onNext] Observer's OnNext action implementation.
   * @param {Function} [onError] Observer's OnError action implementation.
   * @param {Function} [onCompleted] Observer's OnCompleted action implementation.
   * @returns {Observer} The observer object implemented using the given actions.
   */
  var observerCreate = Observer.create = function (onNext, onError, onCompleted) {
    onNext || (onNext = noop);
    onError || (onError = defaultError);
    onCompleted || (onCompleted = noop);
    return new AnonymousObserver(onNext, onError, onCompleted);
  };

  /**
   *  Creates an observer from a notification callback.
   *
   * @static
   * @memberOf Observer
   * @param {Function} handler Action that handles a notification.
   * @returns The observer object that invokes the specified handler using a notification corresponding to each message it receives.
   */
  Observer.fromNotifier = function (handler, thisArg) {
    return new AnonymousObserver(function (x) {
      return handler.call(thisArg, notificationCreateOnNext(x));
    }, function (e) {
      return handler.call(thisArg, notificationCreateOnError(e));
    }, function () {
      return handler.call(thisArg, notificationCreateOnCompleted());
    });
  };

  /**
   * Schedules the invocation of observer methods on the given scheduler.
   * @param {Scheduler} scheduler Scheduler to schedule observer messages on.
   * @returns {Observer} Observer whose messages are scheduled on the given scheduler.
   */
  Observer.prototype.notifyOn = function (scheduler) {
    return new ObserveOnObserver(scheduler, this);
  };

  Observer.prototype.makeSafe = function(disposable) {
    return new AnonymousSafeObserver(this._onNext, this._onError, this._onCompleted, disposable);
  };

  /**
   * Abstract base class for implementations of the Observer class.
   * This base class enforces the grammar of observers where OnError and OnCompleted are terminal messages.
   */
  var AbstractObserver = Rx.internals.AbstractObserver = (function (__super__) {
    inherits(AbstractObserver, __super__);

    /**
     * Creates a new observer in a non-stopped state.
     */
    function AbstractObserver() {
      this.isStopped = false;
      __super__.call(this);
    }

    // Must be implemented by other observers
    AbstractObserver.prototype.next = notImplemented;
    AbstractObserver.prototype.error = notImplemented;
    AbstractObserver.prototype.completed = notImplemented;

    /**
     * Notifies the observer of a new element in the sequence.
     * @param {Any} value Next element in the sequence.
     */
    AbstractObserver.prototype.onNext = function (value) {
      if (!this.isStopped) { this.next(value); }
    };

    /**
     * Notifies the observer that an exception has occurred.
     * @param {Any} error The error that has occurred.
     */
    AbstractObserver.prototype.onError = function (error) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.error(error);
      }
    };

    /**
     * Notifies the observer of the end of the sequence.
     */
    AbstractObserver.prototype.onCompleted = function () {
      if (!this.isStopped) {
        this.isStopped = true;
        this.completed();
      }
    };

    /**
     * Disposes the observer, causing it to transition to the stopped state.
     */
    AbstractObserver.prototype.dispose = function () {
      this.isStopped = true;
    };

    AbstractObserver.prototype.fail = function (e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.error(e);
        return true;
      }

      return false;
    };

    return AbstractObserver;
  }(Observer));

  /**
   * Class to create an Observer instance from delegate-based implementations of the on* methods.
   */
  var AnonymousObserver = Rx.AnonymousObserver = (function (__super__) {
    inherits(AnonymousObserver, __super__);

    /**
     * Creates an observer from the specified OnNext, OnError, and OnCompleted actions.
     * @param {Any} onNext Observer's OnNext action implementation.
     * @param {Any} onError Observer's OnError action implementation.
     * @param {Any} onCompleted Observer's OnCompleted action implementation.
     */
    function AnonymousObserver(onNext, onError, onCompleted) {
      __super__.call(this);
      this._onNext = onNext;
      this._onError = onError;
      this._onCompleted = onCompleted;
    }

    /**
     * Calls the onNext action.
     * @param {Any} value Next element in the sequence.
     */
    AnonymousObserver.prototype.next = function (value) {
      this._onNext(value);
    };

    /**
     * Calls the onError action.
     * @param {Any} error The error that has occurred.
     */
    AnonymousObserver.prototype.error = function (error) {
      this._onError(error);
    };

    /**
     *  Calls the onCompleted action.
     */
    AnonymousObserver.prototype.completed = function () {
      this._onCompleted();
    };

    return AnonymousObserver;
  }(AbstractObserver));

  var CheckedObserver = (function (__super__) {
    inherits(CheckedObserver, __super__);

    function CheckedObserver(observer) {
      __super__.call(this);
      this._observer = observer;
      this._state = 0; // 0 - idle, 1 - busy, 2 - done
    }

    var CheckedObserverPrototype = CheckedObserver.prototype;

    CheckedObserverPrototype.onNext = function (value) {
      this.checkAccess();
      var res = tryCatch(this._observer.onNext).call(this._observer, value);
      this._state = 0;
      res === errorObj && thrower(res.e);
    };

    CheckedObserverPrototype.onError = function (err) {
      this.checkAccess();
      var res = tryCatch(this._observer.onError).call(this._observer, err);
      this._state = 2;
      res === errorObj && thrower(res.e);
    };

    CheckedObserverPrototype.onCompleted = function () {
      this.checkAccess();
      var res = tryCatch(this._observer.onCompleted).call(this._observer);
      this._state = 2;
      res === errorObj && thrower(res.e);
    };

    CheckedObserverPrototype.checkAccess = function () {
      if (this._state === 1) { throw new Error('Re-entrancy detected'); }
      if (this._state === 2) { throw new Error('Observer completed'); }
      if (this._state === 0) { this._state = 1; }
    };

    return CheckedObserver;
  }(Observer));

  var ScheduledObserver = Rx.internals.ScheduledObserver = (function (__super__) {
    inherits(ScheduledObserver, __super__);

    function ScheduledObserver(scheduler, observer) {
      __super__.call(this);
      this.scheduler = scheduler;
      this.observer = observer;
      this.isAcquired = false;
      this.hasFaulted = false;
      this.queue = [];
      this.disposable = new SerialDisposable();
    }

    ScheduledObserver.prototype.next = function (value) {
      var self = this;
      this.queue.push(function () { self.observer.onNext(value); });
    };

    ScheduledObserver.prototype.error = function (e) {
      var self = this;
      this.queue.push(function () { self.observer.onError(e); });
    };

    ScheduledObserver.prototype.completed = function () {
      var self = this;
      this.queue.push(function () { self.observer.onCompleted(); });
    };

    ScheduledObserver.prototype.ensureActive = function () {
      var isOwner = false, parent = this;
      if (!this.hasFaulted && this.queue.length > 0) {
        isOwner = !this.isAcquired;
        this.isAcquired = true;
      }
      if (isOwner) {
        this.disposable.setDisposable(this.scheduler.scheduleRecursive(function (self) {
          var work;
          if (parent.queue.length > 0) {
            work = parent.queue.shift();
          } else {
            parent.isAcquired = false;
            return;
          }
          try {
            work();
          } catch (ex) {
            parent.queue = [];
            parent.hasFaulted = true;
            throw ex;
          }
          self();
        }));
      }
    };

    ScheduledObserver.prototype.dispose = function () {
      __super__.prototype.dispose.call(this);
      this.disposable.dispose();
    };

    return ScheduledObserver;
  }(AbstractObserver));

  var ObserveOnObserver = (function (__super__) {
    inherits(ObserveOnObserver, __super__);

    function ObserveOnObserver(scheduler, observer, cancel) {
      __super__.call(this, scheduler, observer);
      this._cancel = cancel;
    }

    ObserveOnObserver.prototype.next = function (value) {
      __super__.prototype.next.call(this, value);
      this.ensureActive();
    };

    ObserveOnObserver.prototype.error = function (e) {
      __super__.prototype.error.call(this, e);
      this.ensureActive();
    };

    ObserveOnObserver.prototype.completed = function () {
      __super__.prototype.completed.call(this);
      this.ensureActive();
    };

    ObserveOnObserver.prototype.dispose = function () {
      __super__.prototype.dispose.call(this);
      this._cancel && this._cancel.dispose();
      this._cancel = null;
    };

    return ObserveOnObserver;
  })(ScheduledObserver);

  var observableProto;

  /**
   * Represents a push-style collection.
   */
  var Observable = Rx.Observable = (function () {

    function Observable(subscribe) {
      if (Rx.config.longStackSupport && hasStacks) {
        try {
          throw new Error();
        } catch (e) {
          this.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }

        var self = this;
        this._subscribe = function (observer) {
          var oldOnError = observer.onError.bind(observer);

          observer.onError = function (err) {
            makeStackTraceLong(err, self);
            oldOnError(err);
          };

          return subscribe.call(self, observer);
        };
      } else {
        this._subscribe = subscribe;
      }
    }

    observableProto = Observable.prototype;

    /**
     *  Subscribes an observer to the observable sequence.
     *  @param {Mixed} [observerOrOnNext] The object that is to receive notifications or an action to invoke for each element in the observable sequence.
     *  @param {Function} [onError] Action to invoke upon exceptional termination of the observable sequence.
     *  @param {Function} [onCompleted] Action to invoke upon graceful termination of the observable sequence.
     *  @returns {Diposable} A disposable handling the subscriptions and unsubscriptions.
     */
    observableProto.subscribe = observableProto.forEach = function (observerOrOnNext, onError, onCompleted) {
      return this._subscribe(typeof observerOrOnNext === 'object' ?
        observerOrOnNext :
        observerCreate(observerOrOnNext, onError, onCompleted));
    };

    /**
     * Subscribes to the next value in the sequence with an optional "this" argument.
     * @param {Function} onNext The function to invoke on each element in the observable sequence.
     * @param {Any} [thisArg] Object to use as this when executing callback.
     * @returns {Disposable} A disposable handling the subscriptions and unsubscriptions.
     */
    observableProto.subscribeOnNext = function (onNext, thisArg) {
      return this._subscribe(observerCreate(typeof thisArg !== 'undefined' ? function(x) { onNext.call(thisArg, x); } : onNext));
    };

    /**
     * Subscribes to an exceptional condition in the sequence with an optional "this" argument.
     * @param {Function} onError The function to invoke upon exceptional termination of the observable sequence.
     * @param {Any} [thisArg] Object to use as this when executing callback.
     * @returns {Disposable} A disposable handling the subscriptions and unsubscriptions.
     */
    observableProto.subscribeOnError = function (onError, thisArg) {
      return this._subscribe(observerCreate(null, typeof thisArg !== 'undefined' ? function(e) { onError.call(thisArg, e); } : onError));
    };

    /**
     * Subscribes to the next value in the sequence with an optional "this" argument.
     * @param {Function} onCompleted The function to invoke upon graceful termination of the observable sequence.
     * @param {Any} [thisArg] Object to use as this when executing callback.
     * @returns {Disposable} A disposable handling the subscriptions and unsubscriptions.
     */
    observableProto.subscribeOnCompleted = function (onCompleted, thisArg) {
      return this._subscribe(observerCreate(null, null, typeof thisArg !== 'undefined' ? function() { onCompleted.call(thisArg); } : onCompleted));
    };

    return Observable;
  })();

  var ObservableBase = Rx.ObservableBase = (function (__super__) {
    inherits(ObservableBase, __super__);

    function fixSubscriber(subscriber) {
      return subscriber && isFunction(subscriber.dispose) ? subscriber :
        isFunction(subscriber) ? disposableCreate(subscriber) : disposableEmpty;
    }

    function setDisposable(s, state) {
      var ado = state[0], self = state[1];
      var sub = tryCatch(self.subscribeCore).call(self, ado);

      if (sub === errorObj) {
        if(!ado.fail(errorObj.e)) { return thrower(errorObj.e); }
      }
      ado.setDisposable(fixSubscriber(sub));
    }

    function subscribe(observer) {
      var ado = new AutoDetachObserver(observer), state = [ado, this];

      if (currentThreadScheduler.scheduleRequired()) {
        currentThreadScheduler.scheduleWithState(state, setDisposable);
      } else {
        setDisposable(null, state);
      }
      return ado;
    }

    function ObservableBase() {
      __super__.call(this, subscribe);
    }

    ObservableBase.prototype.subscribeCore = notImplemented;

    return ObservableBase;
  }(Observable));

  var Enumerable = Rx.internals.Enumerable = function () { };

  var ConcatEnumerableObservable = (function(__super__) {
    inherits(ConcatEnumerableObservable, __super__);
    function ConcatEnumerableObservable(sources) {
      this.sources = sources;
      __super__.call(this);
    }
    
    ConcatEnumerableObservable.prototype.subscribeCore = function (o) {
      var isDisposed, subscription = new SerialDisposable();
      var cancelable = immediateScheduler.scheduleRecursiveWithState(this.sources[$iterator$](), function (e, self) {
        if (isDisposed) { return; }
        var currentItem = tryCatch(e.next).call(e);
        if (currentItem === errorObj) { return o.onError(currentItem.e); }

        if (currentItem.done) {
          return o.onCompleted();
        }

        // Check if promise
        var currentValue = currentItem.value;
        isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));

        var d = new SingleAssignmentDisposable();
        subscription.setDisposable(d);
        d.setDisposable(currentValue.subscribe(new InnerObserver(o, self, e)));
      });

      return new CompositeDisposable(subscription, cancelable, disposableCreate(function () {
        isDisposed = true;
      }));
    };
    
    function InnerObserver(o, s, e) {
      this.o = o;
      this.s = s;
      this.e = e;
      this.isStopped = false;
    }
    InnerObserver.prototype.onNext = function (x) { if(!this.isStopped) { this.o.onNext(x); } };
    InnerObserver.prototype.onError = function (err) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onError(err);
      }
    };
    InnerObserver.prototype.onCompleted = function () {
      if (!this.isStopped) {
        this.isStopped = true;
        this.s(this.e);
      }
    };
    InnerObserver.prototype.dispose = function () { this.isStopped = true; };
    InnerObserver.prototype.fail = function (err) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onError(err);
        return true;
      }
      return false;
    };
    
    return ConcatEnumerableObservable;
  }(ObservableBase));

  Enumerable.prototype.concat = function () {
    return new ConcatEnumerableObservable(this);
  };
  
  var CatchErrorObservable = (function(__super__) {
    inherits(CatchErrorObservable, __super__);
    function CatchErrorObservable(sources) {
      this.sources = sources;
      __super__.call(this);
    }
    
    CatchErrorObservable.prototype.subscribeCore = function (o) {
      var e = this.sources[$iterator$]();

      var isDisposed, subscription = new SerialDisposable();
      var cancelable = immediateScheduler.scheduleRecursiveWithState(null, function (lastException, self) {
        if (isDisposed) { return; }
        var currentItem = tryCatch(e.next).call(e);
        if (currentItem === errorObj) { return o.onError(currentItem.e); }

        if (currentItem.done) {
          return lastException !== null ? o.onError(lastException) : o.onCompleted();
        }

        // Check if promise
        var currentValue = currentItem.value;
        isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));

        var d = new SingleAssignmentDisposable();
        subscription.setDisposable(d);
        d.setDisposable(currentValue.subscribe(
          function(x) { o.onNext(x); },
          self,
          function() { o.onCompleted(); }));
      });
      return new CompositeDisposable(subscription, cancelable, disposableCreate(function () {
        isDisposed = true;
      }));
    };
    
    return CatchErrorObservable;
  }(ObservableBase));

  Enumerable.prototype.catchError = function () {
    return new CatchErrorObservable(this);
  };

  Enumerable.prototype.catchErrorWhen = function (notificationHandler) {
    var sources = this;
    return new AnonymousObservable(function (o) {
      var exceptions = new Subject(),
        notifier = new Subject(),
        handled = notificationHandler(exceptions),
        notificationDisposable = handled.subscribe(notifier);

      var e = sources[$iterator$]();

      var isDisposed,
        lastException,
        subscription = new SerialDisposable();
      var cancelable = immediateScheduler.scheduleRecursive(function (self) {
        if (isDisposed) { return; }
        var currentItem = tryCatch(e.next).call(e);
        if (currentItem === errorObj) { return o.onError(currentItem.e); }

        if (currentItem.done) {
          if (lastException) {
            o.onError(lastException);
          } else {
            o.onCompleted();
          }
          return;
        }

        // Check if promise
        var currentValue = currentItem.value;
        isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));

        var outer = new SingleAssignmentDisposable();
        var inner = new SingleAssignmentDisposable();
        subscription.setDisposable(new CompositeDisposable(inner, outer));
        outer.setDisposable(currentValue.subscribe(
          function(x) { o.onNext(x); },
          function (exn) {
            inner.setDisposable(notifier.subscribe(self, function(ex) {
              o.onError(ex);
            }, function() {
              o.onCompleted();
            }));

            exceptions.onNext(exn);
          },
          function() { o.onCompleted(); }));
      });

      return new CompositeDisposable(notificationDisposable, subscription, cancelable, disposableCreate(function () {
        isDisposed = true;
      }));
    });
  };
  
  var RepeatEnumerable = (function (__super__) {
    inherits(RepeatEnumerable, __super__);
    
    function RepeatEnumerable(v, c) {
      this.v = v;
      this.c = c == null ? -1 : c;
    }
    RepeatEnumerable.prototype[$iterator$] = function () {
      return new RepeatEnumerator(this); 
    };
    
    function RepeatEnumerator(p) {
      this.v = p.v;
      this.l = p.c;
    }
    RepeatEnumerator.prototype.next = function () {
      if (this.l === 0) { return doneEnumerator; }
      if (this.l > 0) { this.l--; }
      return { done: false, value: this.v }; 
    };
    
    return RepeatEnumerable;
  }(Enumerable));

  var enumerableRepeat = Enumerable.repeat = function (value, repeatCount) {
    return new RepeatEnumerable(value, repeatCount);
  };
  
  var OfEnumerable = (function(__super__) {
    inherits(OfEnumerable, __super__);
    function OfEnumerable(s, fn, thisArg) {
      this.s = s;
      this.fn = fn ? bindCallback(fn, thisArg, 3) : null;
    }
    OfEnumerable.prototype[$iterator$] = function () {
      return new OfEnumerator(this);
    };
    
    function OfEnumerator(p) {
      this.i = -1;
      this.s = p.s;
      this.l = this.s.length;
      this.fn = p.fn;
    }
    OfEnumerator.prototype.next = function () {
     return ++this.i < this.l ?
       { done: false, value: !this.fn ? this.s[this.i] : this.fn(this.s[this.i], this.i, this.s) } :
       doneEnumerator; 
    };
    
    return OfEnumerable;
  }(Enumerable));

  var enumerableOf = Enumerable.of = function (source, selector, thisArg) {
    return new OfEnumerable(source, selector, thisArg);
  };

   /**
   *  Wraps the source sequence in order to run its observer callbacks on the specified scheduler.
   *
   *  This only invokes observer callbacks on a scheduler. In case the subscription and/or unsubscription actions have side-effects
   *  that require to be run on a scheduler, use subscribeOn.
   *
   *  @param {Scheduler} scheduler Scheduler to notify observers on.
   *  @returns {Observable} The source sequence whose observations happen on the specified scheduler.
   */
  observableProto.observeOn = function (scheduler) {
    var source = this;
    return new AnonymousObservable(function (observer) {
      return source.subscribe(new ObserveOnObserver(scheduler, observer));
    }, source);
  };

   /**
   *  Wraps the source sequence in order to run its subscription and unsubscription logic on the specified scheduler. This operation is not commonly used;
   *  see the remarks section for more information on the distinction between subscribeOn and observeOn.

   *  This only performs the side-effects of subscription and unsubscription on the specified scheduler. In order to invoke observer
   *  callbacks on a scheduler, use observeOn.

   *  @param {Scheduler} scheduler Scheduler to perform subscription and unsubscription actions on.
   *  @returns {Observable} The source sequence whose subscriptions and unsubscriptions happen on the specified scheduler.
   */
  observableProto.subscribeOn = function (scheduler) {
    var source = this;
    return new AnonymousObservable(function (observer) {
      var m = new SingleAssignmentDisposable(), d = new SerialDisposable();
      d.setDisposable(m);
      m.setDisposable(scheduler.schedule(function () {
        d.setDisposable(new ScheduledDisposable(scheduler, source.subscribe(observer)));
      }));
      return d;
    }, source);
  };

	var FromPromiseObservable = (function(__super__) {
		inherits(FromPromiseObservable, __super__);
		function FromPromiseObservable(p) {
			this.p = p;
			__super__.call(this);
		}
		
		FromPromiseObservable.prototype.subscribeCore = function(o) {
			this.p.then(function (data) {
				o.onNext(data);
				o.onCompleted();
			}, function (err) { o.onError(err); });
			return disposableEmpty;	
		};
		
		return FromPromiseObservable;
	}(ObservableBase));	 
	 
	 /**
	 * Converts a Promise to an Observable sequence
	 * @param {Promise} An ES6 Compliant promise.
	 * @returns {Observable} An Observable sequence which wraps the existing promise success and failure.
	 */
	var observableFromPromise = Observable.fromPromise = function (promise) {
		return new FromPromiseObservable(promise);
	};
  /*
   * Converts an existing observable sequence to an ES6 Compatible Promise
   * @example
   * var promise = Rx.Observable.return(42).toPromise(RSVP.Promise);
   *
   * // With config
   * Rx.config.Promise = RSVP.Promise;
   * var promise = Rx.Observable.return(42).toPromise();
   * @param {Function} [promiseCtor] The constructor of the promise. If not provided, it looks for it in Rx.config.Promise.
   * @returns {Promise} An ES6 compatible promise with the last value from the observable sequence.
   */
  observableProto.toPromise = function (promiseCtor) {
    promiseCtor || (promiseCtor = Rx.config.Promise);
    if (!promiseCtor) { throw new NotSupportedError('Promise type not provided nor in Rx.config.Promise'); }
    var source = this;
    return new promiseCtor(function (resolve, reject) {
      // No cancellation can be done
      var value, hasValue = false;
      source.subscribe(function (v) {
        value = v;
        hasValue = true;
      }, reject, function () {
        hasValue && resolve(value);
      });
    });
  };

  var ToArrayObservable = (function(__super__) {
    inherits(ToArrayObservable, __super__);
    function ToArrayObservable(source) {
      this.source = source;
      __super__.call(this);
    }

    ToArrayObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new InnerObserver(o));
    };

    function InnerObserver(o) {
      this.o = o;
      this.a = [];
      this.isStopped = false;
    }
    InnerObserver.prototype.onNext = function (x) { if(!this.isStopped) { this.a.push(x); } };
    InnerObserver.prototype.onError = function (e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onError(e);
      }
    };
    InnerObserver.prototype.onCompleted = function () {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onNext(this.a);
        this.o.onCompleted();
      }
    };
    InnerObserver.prototype.dispose = function () { this.isStopped = true; }
    InnerObserver.prototype.fail = function (e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onError(e);
        return true;
      }
 
      return false;
    };

    return ToArrayObservable;
  }(ObservableBase));

  /**
  * Creates an array from an observable sequence.
  * @returns {Observable} An observable sequence containing a single element with a list containing all the elements of the source sequence.
  */
  observableProto.toArray = function () {
    return new ToArrayObservable(this);
  };

  /**
   *  Creates an observable sequence from a specified subscribe method implementation.
   * @example
   *  var res = Rx.Observable.create(function (observer) { return function () { } );
   *  var res = Rx.Observable.create(function (observer) { return Rx.Disposable.empty; } );
   *  var res = Rx.Observable.create(function (observer) { } );
   * @param {Function} subscribe Implementation of the resulting observable sequence's subscribe method, returning a function that will be wrapped in a Disposable.
   * @returns {Observable} The observable sequence with the specified implementation for the Subscribe method.
   */
  Observable.create = Observable.createWithDisposable = function (subscribe, parent) {
    return new AnonymousObservable(subscribe, parent);
  };

  /**
   *  Returns an observable sequence that invokes the specified factory function whenever a new observer subscribes.
   *
   * @example
   *  var res = Rx.Observable.defer(function () { return Rx.Observable.fromArray([1,2,3]); });
   * @param {Function} observableFactory Observable factory function to invoke for each observer that subscribes to the resulting sequence or Promise.
   * @returns {Observable} An observable sequence whose observers trigger an invocation of the given observable factory function.
   */
  var observableDefer = Observable.defer = function (observableFactory) {
    return new AnonymousObservable(function (observer) {
      var result;
      try {
        result = observableFactory();
      } catch (e) {
        return observableThrow(e).subscribe(observer);
      }
      isPromise(result) && (result = observableFromPromise(result));
      return result.subscribe(observer);
    });
  };

  var EmptyObservable = (function(__super__) {
    inherits(EmptyObservable, __super__);
    function EmptyObservable(scheduler) {
      this.scheduler = scheduler;
      __super__.call(this);
    }

    EmptyObservable.prototype.subscribeCore = function (observer) {
      var sink = new EmptySink(observer, this);
      return sink.run();
    };

    function EmptySink(observer, parent) {
      this.observer = observer;
      this.parent = parent;
    }

    function scheduleItem(s, state) {
      state.onCompleted();
    }

    EmptySink.prototype.run = function () {
      return this.parent.scheduler.scheduleWithState(this.observer, scheduleItem);
    };

    return EmptyObservable;
  }(ObservableBase));

  /**
   *  Returns an empty observable sequence, using the specified scheduler to send out the single OnCompleted message.
   *
   * @example
   *  var res = Rx.Observable.empty();
   *  var res = Rx.Observable.empty(Rx.Scheduler.timeout);
   * @param {Scheduler} [scheduler] Scheduler to send the termination call on.
   * @returns {Observable} An observable sequence with no elements.
   */
  var observableEmpty = Observable.empty = function (scheduler) {
    isScheduler(scheduler) || (scheduler = immediateScheduler);
    return new EmptyObservable(scheduler);
  };

  var FromObservable = (function(__super__) {
    inherits(FromObservable, __super__);
    function FromObservable(iterable, mapper, scheduler) {
      this.iterable = iterable;
      this.mapper = mapper;
      this.scheduler = scheduler;
      __super__.call(this);
    }

    FromObservable.prototype.subscribeCore = function (observer) {
      var sink = new FromSink(observer, this);
      return sink.run();
    };

    return FromObservable;
  }(ObservableBase));

  var FromSink = (function () {
    function FromSink(observer, parent) {
      this.observer = observer;
      this.parent = parent;
    }

    FromSink.prototype.run = function () {
      var list = Object(this.parent.iterable),
          it = getIterable(list),
          observer = this.observer,
          mapper = this.parent.mapper;

      function loopRecursive(i, recurse) {
        try {
          var next = it.next();
        } catch (e) {
          return observer.onError(e);
        }
        if (next.done) {
          return observer.onCompleted();
        }

        var result = next.value;

        if (mapper) {
          try {
            result = mapper(result, i);
          } catch (e) {
            return observer.onError(e);
          }
        }

        observer.onNext(result);
        recurse(i + 1);
      }

      return this.parent.scheduler.scheduleRecursiveWithState(0, loopRecursive);
    };

    return FromSink;
  }());

  var maxSafeInteger = Math.pow(2, 53) - 1;

  function StringIterable(str) {
    this._s = s;
  }

  StringIterable.prototype[$iterator$] = function () {
    return new StringIterator(this._s);
  };

  function StringIterator(str) {
    this._s = s;
    this._l = s.length;
    this._i = 0;
  }

  StringIterator.prototype[$iterator$] = function () {
    return this;
  };

  StringIterator.prototype.next = function () {
    return this._i < this._l ? { done: false, value: this._s.charAt(this._i++) } : doneEnumerator;
  };

  function ArrayIterable(a) {
    this._a = a;
  }

  ArrayIterable.prototype[$iterator$] = function () {
    return new ArrayIterator(this._a);
  };

  function ArrayIterator(a) {
    this._a = a;
    this._l = toLength(a);
    this._i = 0;
  }

  ArrayIterator.prototype[$iterator$] = function () {
    return this;
  };

  ArrayIterator.prototype.next = function () {
    return this._i < this._l ? { done: false, value: this._a[this._i++] } : doneEnumerator;
  };

  function numberIsFinite(value) {
    return typeof value === 'number' && root.isFinite(value);
  }

  function isNan(n) {
    return n !== n;
  }

  function getIterable(o) {
    var i = o[$iterator$], it;
    if (!i && typeof o === 'string') {
      it = new StringIterable(o);
      return it[$iterator$]();
    }
    if (!i && o.length !== undefined) {
      it = new ArrayIterable(o);
      return it[$iterator$]();
    }
    if (!i) { throw new TypeError('Object is not iterable'); }
    return o[$iterator$]();
  }

  function sign(value) {
    var number = +value;
    if (number === 0) { return number; }
    if (isNaN(number)) { return number; }
    return number < 0 ? -1 : 1;
  }

  function toLength(o) {
    var len = +o.length;
    if (isNaN(len)) { return 0; }
    if (len === 0 || !numberIsFinite(len)) { return len; }
    len = sign(len) * Math.floor(Math.abs(len));
    if (len <= 0) { return 0; }
    if (len > maxSafeInteger) { return maxSafeInteger; }
    return len;
  }

  /**
  * This method creates a new Observable sequence from an array-like or iterable object.
  * @param {Any} arrayLike An array-like or iterable object to convert to an Observable sequence.
  * @param {Function} [mapFn] Map function to call on every element of the array.
  * @param {Any} [thisArg] The context to use calling the mapFn if provided.
  * @param {Scheduler} [scheduler] Optional scheduler to use for scheduling.  If not provided, defaults to Scheduler.currentThread.
  */
  var observableFrom = Observable.from = function (iterable, mapFn, thisArg, scheduler) {
    if (iterable == null) {
      throw new Error('iterable cannot be null.')
    }
    if (mapFn && !isFunction(mapFn)) {
      throw new Error('mapFn when provided must be a function');
    }
    if (mapFn) {
      var mapper = bindCallback(mapFn, thisArg, 2);
    }
    isScheduler(scheduler) || (scheduler = currentThreadScheduler);
    return new FromObservable(iterable, mapper, scheduler);
  }

  var FromArrayObservable = (function(__super__) {
    inherits(FromArrayObservable, __super__);
    function FromArrayObservable(args, scheduler) {
      this.args = args;
      this.scheduler = scheduler;
      __super__.call(this);
    }

    FromArrayObservable.prototype.subscribeCore = function (observer) {
      var sink = new FromArraySink(observer, this);
      return sink.run();
    };

    return FromArrayObservable;
  }(ObservableBase));

  function FromArraySink(observer, parent) {
    this.observer = observer;
    this.parent = parent;
  }

  FromArraySink.prototype.run = function () {
    var observer = this.observer, args = this.parent.args, len = args.length;
    function loopRecursive(i, recurse) {
      if (i < len) {
        observer.onNext(args[i]);
        recurse(i + 1);
      } else {
        observer.onCompleted();
      }
    }

    return this.parent.scheduler.scheduleRecursiveWithState(0, loopRecursive);
  };

  /**
  *  Converts an array to an observable sequence, using an optional scheduler to enumerate the array.
  * @deprecated use Observable.from or Observable.of
  * @param {Scheduler} [scheduler] Scheduler to run the enumeration of the input sequence on.
  * @returns {Observable} The observable sequence whose elements are pulled from the given enumerable sequence.
  */
  var observableFromArray = Observable.fromArray = function (array, scheduler) {
    isScheduler(scheduler) || (scheduler = currentThreadScheduler);
    return new FromArrayObservable(array, scheduler)
  };

  /**
   *  Generates an observable sequence by running a state-driven loop producing the sequence's elements, using the specified scheduler to send out observer messages.
   *
   * @example
   *  var res = Rx.Observable.generate(0, function (x) { return x < 10; }, function (x) { return x + 1; }, function (x) { return x; });
   *  var res = Rx.Observable.generate(0, function (x) { return x < 10; }, function (x) { return x + 1; }, function (x) { return x; }, Rx.Scheduler.timeout);
   * @param {Mixed} initialState Initial state.
   * @param {Function} condition Condition to terminate generation (upon returning false).
   * @param {Function} iterate Iteration step function.
   * @param {Function} resultSelector Selector function for results produced in the sequence.
   * @param {Scheduler} [scheduler] Scheduler on which to run the generator loop. If not provided, defaults to Scheduler.currentThread.
   * @returns {Observable} The generated sequence.
   */
  Observable.generate = function (initialState, condition, iterate, resultSelector, scheduler) {
    isScheduler(scheduler) || (scheduler = currentThreadScheduler);
    return new AnonymousObservable(function (o) {
      var first = true;
      return scheduler.scheduleRecursiveWithState(initialState, function (state, self) {
        var hasResult, result;
        try {
          if (first) {
            first = false;
          } else {
            state = iterate(state);
          }
          hasResult = condition(state);
          hasResult && (result = resultSelector(state));
        } catch (e) {
          return o.onError(e);
        }
        if (hasResult) {
          o.onNext(result);
          self(state);
        } else {
          o.onCompleted();
        }
      });
    });
  };

  function observableOf (scheduler, array) {
    isScheduler(scheduler) || (scheduler = currentThreadScheduler);
    return new FromArrayObservable(array, scheduler);
  }

  /**
  *  This method creates a new Observable instance with a variable number of arguments, regardless of number or type of the arguments.
  * @returns {Observable} The observable sequence whose elements are pulled from the given arguments.
  */
  Observable.of = function () {
    var len = arguments.length, args = new Array(len);
    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
    return new FromArrayObservable(args, currentThreadScheduler);
  };

  /**
  *  This method creates a new Observable instance with a variable number of arguments, regardless of number or type of the arguments.
  * @param {Scheduler} scheduler A scheduler to use for scheduling the arguments.
  * @returns {Observable} The observable sequence whose elements are pulled from the given arguments.
  */
  Observable.ofWithScheduler = function (scheduler) {
    var len = arguments.length, args = new Array(len - 1);
    for(var i = 1; i < len; i++) { args[i - 1] = arguments[i]; }
    return new FromArrayObservable(args, scheduler);
  };

  /**
   * Creates an Observable sequence from changes to an array using Array.observe.
   * @param {Array} array An array to observe changes.
   * @returns {Observable} An observable sequence containing changes to an array from Array.observe.
   */
  Observable.ofArrayChanges = function(array) {
    if (!Array.isArray(array)) { throw new TypeError('Array.observe only accepts arrays.'); }
    if (typeof Array.observe !== 'function' && typeof Array.unobserve !== 'function') { throw new TypeError('Array.observe is not supported on your platform') }
    return new AnonymousObservable(function(observer) {
      function observerFn(changes) {
        for(var i = 0, len = changes.length; i < len; i++) {
          observer.onNext(changes[i]);
        }
      }
      
      Array.observe(array, observerFn);

      return function () {
        Array.unobserve(array, observerFn);
      };
    });
  };

  /**
   * Creates an Observable sequence from changes to an object using Object.observe.
   * @param {Object} obj An object to observe changes.
   * @returns {Observable} An observable sequence containing changes to an object from Object.observe.
   */
  Observable.ofObjectChanges = function(obj) {
    if (obj == null) { throw new TypeError('object must not be null or undefined.'); }
    if (typeof Object.observe !== 'function' && typeof Object.unobserve !== 'function') { throw new TypeError('Object.observe is not supported on your platform') }
    return new AnonymousObservable(function(observer) {
      function observerFn(changes) {
        for(var i = 0, len = changes.length; i < len; i++) {
          observer.onNext(changes[i]);
        }
      }

      Object.observe(obj, observerFn);

      return function () {
        Object.unobserve(obj, observerFn);
      };
    });
  };

  var NeverObservable = (function(__super__) {
    inherits(NeverObservable, __super__);
    function NeverObservable() {
      __super__.call(this);
    }

    NeverObservable.prototype.subscribeCore = function (observer) {
      return disposableEmpty;
    };

    return NeverObservable;
  }(ObservableBase));

  /**
   * Returns a non-terminating observable sequence, which can be used to denote an infinite duration (e.g. when using reactive joins).
   * @returns {Observable} An observable sequence whose observers will never get called.
   */
  var observableNever = Observable.never = function () {
    return new NeverObservable();
  };

  var PairsObservable = (function(__super__) {
    inherits(PairsObservable, __super__);
    function PairsObservable(obj, scheduler) {
      this.obj = obj;
      this.keys = Object.keys(obj);
      this.scheduler = scheduler;
      __super__.call(this);
    }

    PairsObservable.prototype.subscribeCore = function (observer) {
      var sink = new PairsSink(observer, this);
      return sink.run();
    };

    return PairsObservable;
  }(ObservableBase));

  function PairsSink(observer, parent) {
    this.observer = observer;
    this.parent = parent;
  }

  PairsSink.prototype.run = function () {
    var observer = this.observer, obj = this.parent.obj, keys = this.parent.keys, len = keys.length;
    function loopRecursive(i, recurse) {
      if (i < len) {
        var key = keys[i];
        observer.onNext([key, obj[key]]);
        recurse(i + 1);
      } else {
        observer.onCompleted();
      }
    }

    return this.parent.scheduler.scheduleRecursiveWithState(0, loopRecursive);
  };

  /**
   * Convert an object into an observable sequence of [key, value] pairs.
   * @param {Object} obj The object to inspect.
   * @param {Scheduler} [scheduler] Scheduler to run the enumeration of the input sequence on.
   * @returns {Observable} An observable sequence of [key, value] pairs from the object.
   */
  Observable.pairs = function (obj, scheduler) {
    scheduler || (scheduler = currentThreadScheduler);
    return new PairsObservable(obj, scheduler);
  };

    var RangeObservable = (function(__super__) {
    inherits(RangeObservable, __super__);
    function RangeObservable(start, count, scheduler) {
      this.start = start;
      this.rangeCount = count;
      this.scheduler = scheduler;
      __super__.call(this);
    }

    RangeObservable.prototype.subscribeCore = function (observer) {
      var sink = new RangeSink(observer, this);
      return sink.run();
    };

    return RangeObservable;
  }(ObservableBase));

  var RangeSink = (function () {
    function RangeSink(observer, parent) {
      this.observer = observer;
      this.parent = parent;
    }

    RangeSink.prototype.run = function () {
      var start = this.parent.start, count = this.parent.rangeCount, observer = this.observer;
      function loopRecursive(i, recurse) {
        if (i < count) {
          observer.onNext(start + i);
          recurse(i + 1);
        } else {
          observer.onCompleted();
        }
      }

      return this.parent.scheduler.scheduleRecursiveWithState(0, loopRecursive);
    };

    return RangeSink;
  }());

  /**
  *  Generates an observable sequence of integral numbers within a specified range, using the specified scheduler to send out observer messages.
  * @param {Number} start The value of the first integer in the sequence.
  * @param {Number} count The number of sequential integers to generate.
  * @param {Scheduler} [scheduler] Scheduler to run the generator loop on. If not specified, defaults to Scheduler.currentThread.
  * @returns {Observable} An observable sequence that contains a range of sequential integral numbers.
  */
  Observable.range = function (start, count, scheduler) {
    isScheduler(scheduler) || (scheduler = currentThreadScheduler);
    return new RangeObservable(start, count, scheduler);
  };

  var RepeatObservable = (function(__super__) {
    inherits(RepeatObservable, __super__);
    function RepeatObservable(value, repeatCount, scheduler) {
      this.value = value;
      this.repeatCount = repeatCount == null ? -1 : repeatCount;
      this.scheduler = scheduler;
      __super__.call(this);
    }

    RepeatObservable.prototype.subscribeCore = function (observer) {
      var sink = new RepeatSink(observer, this);
      return sink.run();
    };

    return RepeatObservable;
  }(ObservableBase));

  function RepeatSink(observer, parent) {
    this.observer = observer;
    this.parent = parent;
  }

  RepeatSink.prototype.run = function () {
    var observer = this.observer, value = this.parent.value;
    function loopRecursive(i, recurse) {
      if (i === -1 || i > 0) {
        observer.onNext(value);
        i > 0 && i--;
      }
      if (i === 0) { return observer.onCompleted(); }
      recurse(i);
    }

    return this.parent.scheduler.scheduleRecursiveWithState(this.parent.repeatCount, loopRecursive);
  };

  /**
   *  Generates an observable sequence that repeats the given element the specified number of times, using the specified scheduler to send out observer messages.
   * @param {Mixed} value Element to repeat.
   * @param {Number} repeatCount [Optiona] Number of times to repeat the element. If not specified, repeats indefinitely.
   * @param {Scheduler} scheduler Scheduler to run the producer loop on. If not specified, defaults to Scheduler.immediate.
   * @returns {Observable} An observable sequence that repeats the given element the specified number of times.
   */
  Observable.repeat = function (value, repeatCount, scheduler) {
    isScheduler(scheduler) || (scheduler = currentThreadScheduler);
    return new RepeatObservable(value, repeatCount, scheduler);
  };

  var JustObservable = (function(__super__) {
    inherits(JustObservable, __super__);
    function JustObservable(value, scheduler) {
      this.value = value;
      this.scheduler = scheduler;
      __super__.call(this);
    }

    JustObservable.prototype.subscribeCore = function (observer) {
      var sink = new JustSink(observer, this);
      return sink.run();
    };

    function JustSink(observer, parent) {
      this.observer = observer;
      this.parent = parent;
    }

    function scheduleItem(s, state) {
      var value = state[0], observer = state[1];
      observer.onNext(value);
      observer.onCompleted();
    }

    JustSink.prototype.run = function () {
      return this.parent.scheduler.scheduleWithState([this.parent.value, this.observer], scheduleItem);
    };

    return JustObservable;
  }(ObservableBase));

  /**
   *  Returns an observable sequence that contains a single element, using the specified scheduler to send out observer messages.
   *  There is an alias called 'just' or browsers <IE9.
   * @param {Mixed} value Single element in the resulting observable sequence.
   * @param {Scheduler} scheduler Scheduler to send the single element on. If not specified, defaults to Scheduler.immediate.
   * @returns {Observable} An observable sequence containing the single specified element.
   */
  var observableReturn = Observable['return'] = Observable.just = Observable.returnValue = function (value, scheduler) {
    isScheduler(scheduler) || (scheduler = immediateScheduler);
    return new JustObservable(value, scheduler);
  };

  var ThrowObservable = (function(__super__) {
    inherits(ThrowObservable, __super__);
    function ThrowObservable(error, scheduler) {
      this.error = error;
      this.scheduler = scheduler;
      __super__.call(this);
    }

    ThrowObservable.prototype.subscribeCore = function (o) {
      var sink = new ThrowSink(o, this);
      return sink.run();
    };

    function ThrowSink(o, p) {
      this.o = o;
      this.p = p;
    }

    function scheduleItem(s, state) {
      var e = state[0], o = state[1];
      o.onError(e);
    }

    ThrowSink.prototype.run = function () {
      return this.p.scheduler.scheduleWithState([this.p.error, this.o], scheduleItem);
    };

    return ThrowObservable;
  }(ObservableBase));

  /**
   *  Returns an observable sequence that terminates with an exception, using the specified scheduler to send out the single onError message.
   *  There is an alias to this method called 'throwError' for browsers <IE9.
   * @param {Mixed} error An object used for the sequence's termination.
   * @param {Scheduler} scheduler Scheduler to send the exceptional termination call on. If not specified, defaults to Scheduler.immediate.
   * @returns {Observable} The observable sequence that terminates exceptionally with the specified exception object.
   */
  var observableThrow = Observable['throw'] = Observable.throwError = Observable.throwException = function (error, scheduler) {
    isScheduler(scheduler) || (scheduler = immediateScheduler);
    return new ThrowObservable(error, scheduler);
  };

  /**
   * Constructs an observable sequence that depends on a resource object, whose lifetime is tied to the resulting observable sequence's lifetime.
   * @param {Function} resourceFactory Factory function to obtain a resource object.
   * @param {Function} observableFactory Factory function to obtain an observable sequence that depends on the obtained resource.
   * @returns {Observable} An observable sequence whose lifetime controls the lifetime of the dependent resource object.
   */
  Observable.using = function (resourceFactory, observableFactory) {
    return new AnonymousObservable(function (observer) {
      var disposable = disposableEmpty, resource, source;
      try {
        resource = resourceFactory();
        resource && (disposable = resource);
        source = observableFactory(resource);
      } catch (exception) {
        return new CompositeDisposable(observableThrow(exception).subscribe(observer), disposable);
      }
      return new CompositeDisposable(source.subscribe(observer), disposable);
    });
  };

  /**
   * Propagates the observable sequence or Promise that reacts first.
   * @param {Observable} rightSource Second observable sequence or Promise.
   * @returns {Observable} {Observable} An observable sequence that surfaces either of the given sequences, whichever reacted first.
   */
  observableProto.amb = function (rightSource) {
    var leftSource = this;
    return new AnonymousObservable(function (observer) {
      var choice,
        leftChoice = 'L', rightChoice = 'R',
        leftSubscription = new SingleAssignmentDisposable(),
        rightSubscription = new SingleAssignmentDisposable();

      isPromise(rightSource) && (rightSource = observableFromPromise(rightSource));

      function choiceL() {
        if (!choice) {
          choice = leftChoice;
          rightSubscription.dispose();
        }
      }

      function choiceR() {
        if (!choice) {
          choice = rightChoice;
          leftSubscription.dispose();
        }
      }

      leftSubscription.setDisposable(leftSource.subscribe(function (left) {
        choiceL();
        choice === leftChoice && observer.onNext(left);
      }, function (err) {
        choiceL();
        choice === leftChoice && observer.onError(err);
      }, function () {
        choiceL();
        choice === leftChoice && observer.onCompleted();
      }));

      rightSubscription.setDisposable(rightSource.subscribe(function (right) {
        choiceR();
        choice === rightChoice && observer.onNext(right);
      }, function (err) {
        choiceR();
        choice === rightChoice && observer.onError(err);
      }, function () {
        choiceR();
        choice === rightChoice && observer.onCompleted();
      }));

      return new CompositeDisposable(leftSubscription, rightSubscription);
    });
  };

  /**
   * Propagates the observable sequence or Promise that reacts first.
   *
   * @example
   * var = Rx.Observable.amb(xs, ys, zs);
   * @returns {Observable} An observable sequence that surfaces any of the given sequences, whichever reacted first.
   */
  Observable.amb = function () {
    var acc = observableNever(), items = [];
    if (Array.isArray(arguments[0])) {
      items = arguments[0];
    } else {
      for(var i = 0, len = arguments.length; i < len; i++) { items.push(arguments[i]); }
    }

    function func(previous, current) {
      return previous.amb(current);
    }
    for (var i = 0, len = items.length; i < len; i++) {
      acc = func(acc, items[i]);
    }
    return acc;
  };

  function observableCatchHandler(source, handler) {
    return new AnonymousObservable(function (o) {
      var d1 = new SingleAssignmentDisposable(), subscription = new SerialDisposable();
      subscription.setDisposable(d1);
      d1.setDisposable(source.subscribe(function (x) { o.onNext(x); }, function (e) {
        try {
          var result = handler(e);
        } catch (ex) {
          return o.onError(ex);
        }
        isPromise(result) && (result = observableFromPromise(result));

        var d = new SingleAssignmentDisposable();
        subscription.setDisposable(d);
        d.setDisposable(result.subscribe(o));
      }, function (x) { o.onCompleted(x); }));

      return subscription;
    }, source);
  }

  /**
   * Continues an observable sequence that is terminated by an exception with the next observable sequence.
   * @example
   * 1 - xs.catchException(ys)
   * 2 - xs.catchException(function (ex) { return ys(ex); })
   * @param {Mixed} handlerOrSecond Exception handler function that returns an observable sequence given the error that occurred in the first sequence, or a second observable sequence used to produce results when an error occurred in the first sequence.
   * @returns {Observable} An observable sequence containing the first sequence's elements, followed by the elements of the handler sequence in case an exception occurred.
   */
  observableProto['catch'] = observableProto.catchError = observableProto.catchException = function (handlerOrSecond) {
    return typeof handlerOrSecond === 'function' ?
      observableCatchHandler(this, handlerOrSecond) :
      observableCatch([this, handlerOrSecond]);
  };

  /**
   * Continues an observable sequence that is terminated by an exception with the next observable sequence.
   * @param {Array | Arguments} args Arguments or an array to use as the next sequence if an error occurs.
   * @returns {Observable} An observable sequence containing elements from consecutive source sequences until a source sequence terminates successfully.
   */
  var observableCatch = Observable.catchError = Observable['catch'] = Observable.catchException = function () {
    var items = [];
    if (Array.isArray(arguments[0])) {
      items = arguments[0];
    } else {
      for(var i = 0, len = arguments.length; i < len; i++) { items.push(arguments[i]); }
    }
    return enumerableOf(items).catchError();
  };

  /**
   * Merges the specified observable sequences into one observable sequence by using the selector function whenever any of the observable sequences or Promises produces an element.
   * This can be in the form of an argument list of observables or an array.
   *
   * @example
   * 1 - obs = observable.combineLatest(obs1, obs2, obs3, function (o1, o2, o3) { return o1 + o2 + o3; });
   * 2 - obs = observable.combineLatest([obs1, obs2, obs3], function (o1, o2, o3) { return o1 + o2 + o3; });
   * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
   */
  observableProto.combineLatest = function () {
    var len = arguments.length, args = new Array(len);
    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
    if (Array.isArray(args[0])) {
      args[0].unshift(this);
    } else {
      args.unshift(this);
    }
    return combineLatest.apply(this, args);
  };

  /**
   * Merges the specified observable sequences into one observable sequence by using the selector function whenever any of the observable sequences or Promises produces an element.
   *
   * @example
   * 1 - obs = Rx.Observable.combineLatest(obs1, obs2, obs3, function (o1, o2, o3) { return o1 + o2 + o3; });
   * 2 - obs = Rx.Observable.combineLatest([obs1, obs2, obs3], function (o1, o2, o3) { return o1 + o2 + o3; });
   * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
   */
  var combineLatest = Observable.combineLatest = function () {
    var len = arguments.length, args = new Array(len);
    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
    var resultSelector = args.pop();
    Array.isArray(args[0]) && (args = args[0]);

    return new AnonymousObservable(function (o) {
      var n = args.length,
        falseFactory = function () { return false; },
        hasValue = arrayInitialize(n, falseFactory),
        hasValueAll = false,
        isDone = arrayInitialize(n, falseFactory),
        values = new Array(n);

      function next(i) {
        hasValue[i] = true;
        if (hasValueAll || (hasValueAll = hasValue.every(identity))) {
          try {
            var res = resultSelector.apply(null, values);
          } catch (e) {
            return o.onError(e);
          }
          o.onNext(res);
        } else if (isDone.filter(function (x, j) { return j !== i; }).every(identity)) {
          o.onCompleted();
        }
      }

      function done (i) {
        isDone[i] = true;
        isDone.every(identity) && o.onCompleted();
      }

      var subscriptions = new Array(n);
      for (var idx = 0; idx < n; idx++) {
        (function (i) {
          var source = args[i], sad = new SingleAssignmentDisposable();
          isPromise(source) && (source = observableFromPromise(source));
          sad.setDisposable(source.subscribe(function (x) {
              values[i] = x;
              next(i);
            },
            function(e) { o.onError(e); },
            function () { done(i); }
          ));
          subscriptions[i] = sad;
        }(idx));
      }

      return new CompositeDisposable(subscriptions);
    }, this);
  };

  /**
   * Concatenates all the observable sequences.  This takes in either an array or variable arguments to concatenate.
   * @returns {Observable} An observable sequence that contains the elements of each given sequence, in sequential order.
   */
  observableProto.concat = function () {
    for(var args = [], i = 0, len = arguments.length; i < len; i++) { args.push(arguments[i]); }
    args.unshift(this);
    return observableConcat.apply(null, args);
  };

	var ConcatObservable = (function(__super__) {
		inherits(ConcatObservable, __super__);
		function ConcatObservable(sources) {
			this.sources = sources;
			__super__.call(this);
		}
		
		ConcatObservable.prototype.subscribeCore = function(o) {
      var sink = new ConcatSink(this.sources, o);
      return sink.run();
		};
    
    function ConcatSink(sources, o) {
      this.sources = sources;
      this.o = o;
    }
    ConcatSink.prototype.run = function () {
      var isDisposed, subscription = new SerialDisposable(), sources = this.sources, length = sources.length, o = this.o;
      var cancelable = immediateScheduler.scheduleRecursiveWithState(0, function (i, self) {
        if (isDisposed) { return; }
        if (i === length) {
					return o.onCompleted();
				}
	
        // Check if promise
        var currentValue = sources[i];
        isPromise(currentValue) && (currentValue = observableFromPromise(currentValue));

        var d = new SingleAssignmentDisposable();
        subscription.setDisposable(d);
        d.setDisposable(currentValue.subscribe(
          function (x) { o.onNext(x); },
          function (e) { o.onError(e); },
          function () { self(i + 1); }
        ));
      });

      return new CompositeDisposable(subscription, cancelable, disposableCreate(function () {
        isDisposed = true;
      }));
    };
    
		
		return ConcatObservable;
	}(ObservableBase));
  
  /**
   * Concatenates all the observable sequences.
   * @param {Array | Arguments} args Arguments or an array to concat to the observable sequence.
   * @returns {Observable} An observable sequence that contains the elements of each given sequence, in sequential order.
   */
  var observableConcat = Observable.concat = function () {
    var args;
    if (Array.isArray(arguments[0])) {
      args = arguments[0];
    } else {
      args = new Array(arguments.length);
      for(var i = 0, len = arguments.length; i < len; i++) { args[i] = arguments[i]; }
    }
    return new ConcatObservable(args);
  };

  /**
   * Concatenates an observable sequence of observable sequences.
   * @returns {Observable} An observable sequence that contains the elements of each observed inner sequence, in sequential order.
   */
  observableProto.concatAll = observableProto.concatObservable = function () {
    return this.merge(1);
  };

  var MergeObservable = (function (__super__) {
    inherits(MergeObservable, __super__);

    function MergeObservable(source, maxConcurrent) {
      this.source = source;
      this.maxConcurrent = maxConcurrent;
      __super__.call(this);
    }

    MergeObservable.prototype.subscribeCore = function(observer) {
      var g = new CompositeDisposable();
      g.add(this.source.subscribe(new MergeObserver(observer, this.maxConcurrent, g)));
      return g;
    };

    return MergeObservable;

  }(ObservableBase));

  var MergeObserver = (function () {
    function MergeObserver(o, max, g) {
      this.o = o;
      this.max = max;
      this.g = g;
      this.done = false;
      this.q = [];
      this.activeCount = 0;
      this.isStopped = false;
    }
    MergeObserver.prototype.handleSubscribe = function (xs) {
      var sad = new SingleAssignmentDisposable();
      this.g.add(sad);
      isPromise(xs) && (xs = observableFromPromise(xs));
      sad.setDisposable(xs.subscribe(new InnerObserver(this, sad)));
    };
    MergeObserver.prototype.onNext = function (innerSource) {
      if (this.isStopped) { return; }
        if(this.activeCount < this.max) {
          this.activeCount++;
          this.handleSubscribe(innerSource);
        } else {
          this.q.push(innerSource);
        }
      };
      MergeObserver.prototype.onError = function (e) {
        if (!this.isStopped) {
          this.isStopped = true;
          this.o.onError(e);
        }
      };
      MergeObserver.prototype.onCompleted = function () {
        if (!this.isStopped) {
          this.isStopped = true;
          this.done = true;
          this.activeCount === 0 && this.o.onCompleted();
        }
      };
      MergeObserver.prototype.dispose = function() { this.isStopped = true; };
      MergeObserver.prototype.fail = function (e) {
        if (!this.isStopped) {
          this.isStopped = true;
          this.o.onError(e);
          return true;
        }

        return false;
      };

      function InnerObserver(parent, sad) {
        this.parent = parent;
        this.sad = sad;
        this.isStopped = false;
      }
      InnerObserver.prototype.onNext = function (x) { if(!this.isStopped) { this.parent.o.onNext(x); } };
      InnerObserver.prototype.onError = function (e) {
        if (!this.isStopped) {
          this.isStopped = true;
          this.parent.o.onError(e);
        }
      };
      InnerObserver.prototype.onCompleted = function () {
        if(!this.isStopped) {
          this.isStopped = true;
          var parent = this.parent;
          parent.g.remove(this.sad);
          if (parent.q.length > 0) {
            parent.handleSubscribe(parent.q.shift());
          } else {
            parent.activeCount--;
            parent.done && parent.activeCount === 0 && parent.o.onCompleted();
          }
        }
      };
      InnerObserver.prototype.dispose = function() { this.isStopped = true; };
      InnerObserver.prototype.fail = function (e) {
        if (!this.isStopped) {
          this.isStopped = true;
          this.parent.o.onError(e);
          return true;
        }

        return false;
      };

      return MergeObserver;
  }());





  /**
  * Merges an observable sequence of observable sequences into an observable sequence, limiting the number of concurrent subscriptions to inner sequences.
  * Or merges two observable sequences into a single observable sequence.
  *
  * @example
  * 1 - merged = sources.merge(1);
  * 2 - merged = source.merge(otherSource);
  * @param {Mixed} [maxConcurrentOrOther] Maximum number of inner observable sequences being subscribed to concurrently or the second observable sequence.
  * @returns {Observable} The observable sequence that merges the elements of the inner sequences.
  */
  observableProto.merge = function (maxConcurrentOrOther) {
    return typeof maxConcurrentOrOther !== 'number' ?
      observableMerge(this, maxConcurrentOrOther) :
      new MergeObservable(this, maxConcurrentOrOther);
  };

  /**
   * Merges all the observable sequences into a single observable sequence.
   * The scheduler is optional and if not specified, the immediate scheduler is used.
   * @returns {Observable} The observable sequence that merges the elements of the observable sequences.
   */
  var observableMerge = Observable.merge = function () {
    var scheduler, sources = [], i, len = arguments.length;
    if (!arguments[0]) {
      scheduler = immediateScheduler;
      for(i = 1; i < len; i++) { sources.push(arguments[i]); }
    } else if (isScheduler(arguments[0])) {
      scheduler = arguments[0];
      for(i = 1; i < len; i++) { sources.push(arguments[i]); }
    } else {
      scheduler = immediateScheduler;
      for(i = 0; i < len; i++) { sources.push(arguments[i]); }
    }
    if (Array.isArray(sources[0])) {
      sources = sources[0];
    }
    return observableOf(scheduler, sources).mergeAll();
  };

  var MergeAllObservable = (function (__super__) {
    inherits(MergeAllObservable, __super__);

    function MergeAllObservable(source) {
      this.source = source;
      __super__.call(this);
    }

    MergeAllObservable.prototype.subscribeCore = function (observer) {
      var g = new CompositeDisposable(), m = new SingleAssignmentDisposable();
      g.add(m);
      m.setDisposable(this.source.subscribe(new MergeAllObserver(observer, g)));
      return g;
    };
    
    function MergeAllObserver(o, g) {
      this.o = o;
      this.g = g;
      this.isStopped = false;
      this.done = false;
    }
    MergeAllObserver.prototype.onNext = function(innerSource) {
      if(this.isStopped) { return; }
      var sad = new SingleAssignmentDisposable();
      this.g.add(sad);

      isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));

      sad.setDisposable(innerSource.subscribe(new InnerObserver(this, this.g, sad)));
    };
    MergeAllObserver.prototype.onError = function (e) {
      if(!this.isStopped) {
        this.isStopped = true;
        this.o.onError(e);
      }
    };
    MergeAllObserver.prototype.onCompleted = function () {
      if(!this.isStopped) {
        this.isStopped = true;
        this.done = true;
        this.g.length === 1 && this.o.onCompleted();
      }
    };
    MergeAllObserver.prototype.dispose = function() { this.isStopped = true; };
    MergeAllObserver.prototype.fail = function (e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onError(e);
        return true;
      }

      return false;
    };

    function InnerObserver(parent, g, sad) {
      this.parent = parent;
      this.g = g;
      this.sad = sad;
      this.isStopped = false;
    }
    InnerObserver.prototype.onNext = function (x) { if (!this.isStopped) { this.parent.o.onNext(x); } };
    InnerObserver.prototype.onError = function (e) {
      if(!this.isStopped) {
        this.isStopped = true;
        this.parent.o.onError(e);
      }
    };
    InnerObserver.prototype.onCompleted = function () {
      if(!this.isStopped) {
        var parent = this.parent;
        this.isStopped = true;
        parent.g.remove(this.sad);
        parent.done && parent.g.length === 1 && parent.o.onCompleted();
      }
    };
    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
    InnerObserver.prototype.fail = function (e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.parent.o.onError(e);
        return true;
      }

      return false;
    };

    return MergeAllObservable;
  }(ObservableBase));

  /**
  * Merges an observable sequence of observable sequences into an observable sequence.
  * @returns {Observable} The observable sequence that merges the elements of the inner sequences.
  */
  observableProto.mergeAll = observableProto.mergeObservable = function () {
    return new MergeAllObservable(this);
  };

  var CompositeError = Rx.CompositeError = function(errors) {
    this.name = "NotImplementedError";
    this.innerErrors = errors;
    this.message = 'This contains multiple errors. Check the innerErrors';
    Error.call(this);
  }
  CompositeError.prototype = Error.prototype;

  /**
  * Flattens an Observable that emits Observables into one Observable, in a way that allows an Observer to
  * receive all successfully emitted items from all of the source Observables without being interrupted by
  * an error notification from one of them.
  *
  * This behaves like Observable.prototype.mergeAll except that if any of the merged Observables notify of an
  * error via the Observer's onError, mergeDelayError will refrain from propagating that
  * error notification until all of the merged Observables have finished emitting items.
  * @param {Array | Arguments} args Arguments or an array to merge.
  * @returns {Observable} an Observable that emits all of the items emitted by the Observables emitted by the Observable
  */
  Observable.mergeDelayError = function() {
    var args;
    if (Array.isArray(arguments[0])) {
      args = arguments[0];
    } else {
      var len = arguments.length;
      args = new Array(len);
      for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
    }
    var source = observableOf(null, args);

    return new AnonymousObservable(function (o) {
      var group = new CompositeDisposable(),
        m = new SingleAssignmentDisposable(),
        isStopped = false,
        errors = [];

      function setCompletion() {
        if (errors.length === 0) {
          o.onCompleted();
        } else if (errors.length === 1) {
          o.onError(errors[0]);
        } else {
          o.onError(new CompositeError(errors));
        }
      }

      group.add(m);

      m.setDisposable(source.subscribe(
        function (innerSource) {
          var innerSubscription = new SingleAssignmentDisposable();
          group.add(innerSubscription);

          // Check for promises support
          isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));

          innerSubscription.setDisposable(innerSource.subscribe(
            function (x) { o.onNext(x); },
            function (e) {
              errors.push(e);
              group.remove(innerSubscription);
              isStopped && group.length === 1 && setCompletion();
            },
            function () {
              group.remove(innerSubscription);
              isStopped && group.length === 1 && setCompletion();
          }));
        },
        function (e) {
          errors.push(e);
          isStopped = true;
          group.length === 1 && setCompletion();
        },
        function () {
          isStopped = true;
          group.length === 1 && setCompletion();
        }));
      return group;
    });
  };

  /**
   * Continues an observable sequence that is terminated normally or by an exception with the next observable sequence.
   * @param {Observable} second Second observable sequence used to produce results after the first sequence terminates.
   * @returns {Observable} An observable sequence that concatenates the first and second sequence, even if the first sequence terminates exceptionally.
   */
  observableProto.onErrorResumeNext = function (second) {
    if (!second) { throw new Error('Second observable is required'); }
    return onErrorResumeNext([this, second]);
  };

  /**
   * Continues an observable sequence that is terminated normally or by an exception with the next observable sequence.
   *
   * @example
   * 1 - res = Rx.Observable.onErrorResumeNext(xs, ys, zs);
   * 1 - res = Rx.Observable.onErrorResumeNext([xs, ys, zs]);
   * @returns {Observable} An observable sequence that concatenates the source sequences, even if a sequence terminates exceptionally.
   */
  var onErrorResumeNext = Observable.onErrorResumeNext = function () {
    var sources = [];
    if (Array.isArray(arguments[0])) {
      sources = arguments[0];
    } else {
      for(var i = 0, len = arguments.length; i < len; i++) { sources.push(arguments[i]); }
    }
    return new AnonymousObservable(function (observer) {
      var pos = 0, subscription = new SerialDisposable(),
      cancelable = immediateScheduler.scheduleRecursive(function (self) {
        var current, d;
        if (pos < sources.length) {
          current = sources[pos++];
          isPromise(current) && (current = observableFromPromise(current));
          d = new SingleAssignmentDisposable();
          subscription.setDisposable(d);
          d.setDisposable(current.subscribe(observer.onNext.bind(observer), self, self));
        } else {
          observer.onCompleted();
        }
      });
      return new CompositeDisposable(subscription, cancelable);
    });
  };

  /**
   * Returns the values from the source observable sequence only after the other observable sequence produces a value.
   * @param {Observable | Promise} other The observable sequence or Promise that triggers propagation of elements of the source sequence.
   * @returns {Observable} An observable sequence containing the elements of the source sequence starting from the point the other sequence triggered propagation.
   */
  observableProto.skipUntil = function (other) {
    var source = this;
    return new AnonymousObservable(function (o) {
      var isOpen = false;
      var disposables = new CompositeDisposable(source.subscribe(function (left) {
        isOpen && o.onNext(left);
      }, function (e) { o.onError(e); }, function () {
        isOpen && o.onCompleted();
      }));

      isPromise(other) && (other = observableFromPromise(other));

      var rightSubscription = new SingleAssignmentDisposable();
      disposables.add(rightSubscription);
      rightSubscription.setDisposable(other.subscribe(function () {
        isOpen = true;
        rightSubscription.dispose();
      }, function (e) { o.onError(e); }, function () {
        rightSubscription.dispose();
      }));

      return disposables;
    }, source);
  };

  var SwitchObservable = (function(__super__) {
    inherits(SwitchObservable, __super__);
    function SwitchObservable(source) {
      this.source = source;
      __super__.call(this);
    }

    SwitchObservable.prototype.subscribeCore = function (o) {
      var inner = new SerialDisposable(), s = this.source.subscribe(new SwitchObserver(o, inner));
      return new CompositeDisposable(s, inner);
    };

    function SwitchObserver(o, inner) {
      this.o = o;
      this.inner = inner;
      this.stopped = false;
      this.latest = 0;
      this.hasLatest = false;
      this.isStopped = false;
    }
    SwitchObserver.prototype.onNext = function (innerSource) {
      if (this.isStopped) { return; }
      var d = new SingleAssignmentDisposable(), id = ++this.latest;
      this.hasLatest = true;
      this.inner.setDisposable(d);
      isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));
      d.setDisposable(innerSource.subscribe(new InnerObserver(this, id)));
    };
    SwitchObserver.prototype.onError = function (e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onError(e);
      }
    };
    SwitchObserver.prototype.onCompleted = function () {
      if (!this.isStopped) {
        this.isStopped = true;
        this.stopped = true;
        !this.hasLatest && this.o.onCompleted();
      }
    };
    SwitchObserver.prototype.dispose = function () { this.isStopped = true; };
    SwitchObserver.prototype.fail = function (e) {
      if(!this.isStopped) {
        this.isStopped = true;
        this.o.onError(e);
        return true;
      }
      return false;
    };

    function InnerObserver(parent, id) {
      this.parent = parent;
      this.id = id;
      this.isStopped = false;
    }
    InnerObserver.prototype.onNext = function (x) {
      if (this.isStopped) { return; }
      this.parent.latest === this.id && this.parent.o.onNext(x);
    };
    InnerObserver.prototype.onError = function (e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.parent.latest === this.id && this.parent.o.onError(e);
      }
    };
    InnerObserver.prototype.onCompleted = function () {
      if (!this.isStopped) {
        this.isStopped = true;
        if (this.parent.latest === this.id) {
          this.parent.hasLatest = false;
          this.parent.isStopped && this.parent.o.onCompleted();
        }
      }
    };
    InnerObserver.prototype.dispose = function () { this.isStopped = true; }
    InnerObserver.prototype.fail = function (e) {
      if(!this.isStopped) {
        this.isStopped = true;
        this.parent.o.onError(e);
        return true;
      }
      return false;
    };

    return SwitchObservable;
  }(ObservableBase));

  /**
  * Transforms an observable sequence of observable sequences into an observable sequence producing values only from the most recent observable sequence.
  * @returns {Observable} The observable sequence that at any point in time produces the elements of the most recent inner observable sequence that has been received.
  */
  observableProto['switch'] = observableProto.switchLatest = function () {
    return new SwitchObservable(this);
  };

  var TakeUntilObservable = (function(__super__) {
    inherits(TakeUntilObservable, __super__);

    function TakeUntilObservable(source, other) {
      this.source = source;
      this.other = isPromise(other) ? observableFromPromise(other) : other;
      __super__.call(this);
    }

    TakeUntilObservable.prototype.subscribeCore = function(o) {
      return new CompositeDisposable(
        this.source.subscribe(o),
        this.other.subscribe(new InnerObserver(o))
      );
    };

    function InnerObserver(o) {
      this.o = o;
      this.isStopped = false;
    }
    InnerObserver.prototype.onNext = function (x) {
      if (this.isStopped) { return; }
      this.o.onCompleted();
    };
    InnerObserver.prototype.onError = function (err) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onError(err);
      }
    };
    InnerObserver.prototype.onCompleted = function () {
      !this.isStopped && (this.isStopped = true);
    };
    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
    InnerObserver.prototype.fail = function (e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onError(e);
        return true;
      }
      return false;
    };

    return TakeUntilObservable;
  }(ObservableBase));

  /**
   * Returns the values from the source observable sequence until the other observable sequence produces a value.
   * @param {Observable | Promise} other Observable sequence or Promise that terminates propagation of elements of the source sequence.
   * @returns {Observable} An observable sequence containing the elements of the source sequence up to the point the other sequence interrupted further propagation.
   */
  observableProto.takeUntil = function (other) {
    return new TakeUntilObservable(this, other);
  };

  function falseFactory() { return false; }

  /**
   * Merges the specified observable sequences into one observable sequence by using the selector function only when the (first) source observable sequence produces an element.
   * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
   */
  observableProto.withLatestFrom = function () {
    var len = arguments.length, args = new Array(len)
    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
    var resultSelector = args.pop(), source = this;
    Array.isArray(args[0]) && (args = args[0]);

    return new AnonymousObservable(function (observer) {
      var n = args.length,
        hasValue = arrayInitialize(n, falseFactory),
        hasValueAll = false,
        values = new Array(n);

      var subscriptions = new Array(n + 1);
      for (var idx = 0; idx < n; idx++) {
        (function (i) {
          var other = args[i], sad = new SingleAssignmentDisposable();
          isPromise(other) && (other = observableFromPromise(other));
          sad.setDisposable(other.subscribe(function (x) {
            values[i] = x;
            hasValue[i] = true;
            hasValueAll = hasValue.every(identity);
          }, function (e) { observer.onError(e); }, noop));
          subscriptions[i] = sad;
        }(idx));
      }

      var sad = new SingleAssignmentDisposable();
      sad.setDisposable(source.subscribe(function (x) {
        var allValues = [x].concat(values);
        if (!hasValueAll) { return; }
        var res = tryCatch(resultSelector).apply(null, allValues);
        if (res === errorObj) { return observer.onError(res.e); }
        observer.onNext(res);
      }, function (e) { observer.onError(e); }, function () {
        observer.onCompleted();
      }));
      subscriptions[n] = sad;

      return new CompositeDisposable(subscriptions);
    }, this);
  };

  function zipArray(second, resultSelector) {
    var first = this;
    return new AnonymousObservable(function (o) {
      var index = 0, len = second.length;
      return first.subscribe(function (left) {
        if (index < len) {
          var right = second[index++], res = tryCatch(resultSelector)(left, right);
          if (res === errorObj) { return o.onError(res.e); }
          o.onNext(res);
        } else {
          o.onCompleted();
        }
      }, function (e) { o.onError(e); }, function () { o.onCompleted(); });
    }, first);
  }

  function falseFactory() { return false; }
  function emptyArrayFactory() { return []; }

  /**
   * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences or an array have produced an element at a corresponding index.
   * The last element in the arguments must be a function to invoke for each series of elements at corresponding indexes in the args.
   * @returns {Observable} An observable sequence containing the result of combining elements of the args using the specified result selector function.
   */
  observableProto.zip = function () {
    if (Array.isArray(arguments[0])) { return zipArray.apply(this, arguments); }
    var len = arguments.length, args = new Array(len);
    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }

    var parent = this, resultSelector = args.pop();
    args.unshift(parent);
    return new AnonymousObservable(function (o) {
      var n = args.length,
        queues = arrayInitialize(n, emptyArrayFactory),
        isDone = arrayInitialize(n, falseFactory);

      var subscriptions = new Array(n);
      for (var idx = 0; idx < n; idx++) {
        (function (i) {
          var source = args[i], sad = new SingleAssignmentDisposable();
          isPromise(source) && (source = observableFromPromise(source));
          sad.setDisposable(source.subscribe(function (x) {
            queues[i].push(x);
            if (queues.every(function (x) { return x.length > 0; })) {
              var queuedValues = queues.map(function (x) { return x.shift(); }),
                  res = tryCatch(resultSelector).apply(parent, queuedValues);
              if (res === errorObj) { return o.onError(res.e); }
              o.onNext(res);
            } else if (isDone.filter(function (x, j) { return j !== i; }).every(identity)) {
              o.onCompleted();
            }
          }, function (e) { o.onError(e); }, function () {
            isDone[i] = true;
            isDone.every(identity) && o.onCompleted();
          }));
          subscriptions[i] = sad;
        })(idx);
      }

      return new CompositeDisposable(subscriptions);
    }, parent);
  };

  /**
   * Merges the specified observable sequences into one observable sequence by using the selector function whenever all of the observable sequences have produced an element at a corresponding index.
   * @param arguments Observable sources.
   * @param {Function} resultSelector Function to invoke for each series of elements at corresponding indexes in the sources.
   * @returns {Observable} An observable sequence containing the result of combining elements of the sources using the specified result selector function.
   */
  Observable.zip = function () {
    var len = arguments.length, args = new Array(len);
    for(var i = 0; i < len; i++) { args[i] = arguments[i]; }
    var first = args.shift();
    return first.zip.apply(first, args);
  };

  function falseFactory() { return false; }
  function arrayFactory() { return []; }

  /**
   * Merges the specified observable sequences into one observable sequence by emitting a list with the elements of the observable sequences at corresponding indexes.
   * @param arguments Observable sources.
   * @returns {Observable} An observable sequence containing lists of elements at corresponding indexes.
   */
  Observable.zipArray = function () {
    var sources;
    if (Array.isArray(arguments[0])) {
      sources = arguments[0];
    } else {
      var len = arguments.length;
      sources = new Array(len);
      for(var i = 0; i < len; i++) { sources[i] = arguments[i]; }
    }
    return new AnonymousObservable(function (o) {
      var n = sources.length,
        queues = arrayInitialize(n, arrayFactory),
        isDone = arrayInitialize(n, falseFactory);

      var subscriptions = new Array(n);
      for (var idx = 0; idx < n; idx++) {
        (function (i) {
          subscriptions[i] = new SingleAssignmentDisposable();
          subscriptions[i].setDisposable(sources[i].subscribe(function (x) {
            queues[i].push(x);
            if (queues.every(function (x) { return x.length > 0; })) {
              var res = queues.map(function (x) { return x.shift(); });
              o.onNext(res);
            } else if (isDone.filter(function (x, j) { return j !== i; }).every(identity)) {
              return o.onCompleted();
            }
          }, function (e) { o.onError(e); }, function () {
            isDone[i] = true;
            isDone.every(identity) && o.onCompleted();
          }));
        })(idx);
      }

      return new CompositeDisposable(subscriptions);
    });
  };

  /**
   *  Hides the identity of an observable sequence.
   * @returns {Observable} An observable sequence that hides the identity of the source sequence.
   */
  observableProto.asObservable = function () {
    var source = this;
    return new AnonymousObservable(function (o) { return source.subscribe(o); }, source);
  };

  /**
   *  Projects each element of an observable sequence into zero or more buffers which are produced based on element count information.
   *
   * @example
   *  var res = xs.bufferWithCount(10);
   *  var res = xs.bufferWithCount(10, 1);
   * @param {Number} count Length of each buffer.
   * @param {Number} [skip] Number of elements to skip between creation of consecutive buffers. If not provided, defaults to the count.
   * @returns {Observable} An observable sequence of buffers.
   */
  observableProto.bufferWithCount = function (count, skip) {
    if (typeof skip !== 'number') {
      skip = count;
    }
    return this.windowWithCount(count, skip).selectMany(function (x) {
      return x.toArray();
    }).where(function (x) {
      return x.length > 0;
    });
  };

  /**
   * Dematerializes the explicit notification values of an observable sequence as implicit notifications.
   * @returns {Observable} An observable sequence exhibiting the behavior corresponding to the source sequence's notification values.
   */
  observableProto.dematerialize = function () {
    var source = this;
    return new AnonymousObservable(function (o) {
      return source.subscribe(function (x) { return x.accept(o); }, function(e) { o.onError(e); }, function () { o.onCompleted(); });
    }, this);
  };

  /**
   *  Returns an observable sequence that contains only distinct contiguous elements according to the keySelector and the comparer.
   *
   *  var obs = observable.distinctUntilChanged();
   *  var obs = observable.distinctUntilChanged(function (x) { return x.id; });
   *  var obs = observable.distinctUntilChanged(function (x) { return x.id; }, function (x, y) { return x === y; });
   *
   * @param {Function} [keySelector] A function to compute the comparison key for each element. If not provided, it projects the value.
   * @param {Function} [comparer] Equality comparer for computed key values. If not provided, defaults to an equality comparer function.
   * @returns {Observable} An observable sequence only containing the distinct contiguous elements, based on a computed key value, from the source sequence.
   */
  observableProto.distinctUntilChanged = function (keySelector, comparer) {
    var source = this;
    comparer || (comparer = defaultComparer);
    return new AnonymousObservable(function (o) {
      var hasCurrentKey = false, currentKey;
      return source.subscribe(function (value) {
        var key = value;
        if (keySelector) {
          key = tryCatch(keySelector)(value);
          if (key === errorObj) { return o.onError(key.e); }
        }
        if (hasCurrentKey) {
          var comparerEquals = tryCatch(comparer)(currentKey, key);
          if (comparerEquals === errorObj) { return o.onError(comparerEquals.e); }
        }
        if (!hasCurrentKey || !comparerEquals) {
          hasCurrentKey = true;
          currentKey = key;
          o.onNext(value);
        }
      }, function (e) { o.onError(e); }, function () { o.onCompleted(); });
    }, this);
  };

  var TapObservable = (function(__super__) {
    inherits(TapObservable,__super__);
    function TapObservable(source, observerOrOnNext, onError, onCompleted) {
      this.source = source;
      this.t = !observerOrOnNext || isFunction(observerOrOnNext) ?
        observerCreate(observerOrOnNext || noop, onError || noop, onCompleted || noop) :
        observerOrOnNext;
      __super__.call(this);
    }

    TapObservable.prototype.subscribeCore = function(o) {
      return this.source.subscribe(new InnerObserver(o, this.t));
    };

    function InnerObserver(o, t) {
      this.o = o;
      this.t = t;
      this.isStopped = false;
    }
    InnerObserver.prototype.onNext = function(x) {
      if (this.isStopped) { return; }
      var res = tryCatch(this.t.onNext).call(this.t, x);
      if (res === errorObj) { this.o.onError(res.e); }
      this.o.onNext(x);
    };
    InnerObserver.prototype.onError = function(err) {
      if (!this.isStopped) {
        this.isStopped = true;
        var res = tryCatch(this.t.onError).call(this.t, err);
        if (res === errorObj) { return this.o.onError(res.e); }
        this.o.onError(err);
      }
    };
    InnerObserver.prototype.onCompleted = function() {
      if (!this.isStopped) {
        this.isStopped = true;
        var res = tryCatch(this.t.onCompleted).call(this.t);
        if (res === errorObj) { return this.o.onError(res.e); }
        this.o.onCompleted();
      }
    };
    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
    InnerObserver.prototype.fail = function (e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onError(e);
        return true;
      }
      return false;
    };

    return TapObservable;
  }(ObservableBase));

  /**
  *  Invokes an action for each element in the observable sequence and invokes an action upon graceful or exceptional termination of the observable sequence.
  *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
  * @param {Function | Observer} observerOrOnNext Action to invoke for each element in the observable sequence or an o.
  * @param {Function} [onError]  Action to invoke upon exceptional termination of the observable sequence. Used if only the observerOrOnNext parameter is also a function.
  * @param {Function} [onCompleted]  Action to invoke upon graceful termination of the observable sequence. Used if only the observerOrOnNext parameter is also a function.
  * @returns {Observable} The source sequence with the side-effecting behavior applied.
  */
  observableProto['do'] = observableProto.tap = observableProto.doAction = function (observerOrOnNext, onError, onCompleted) {
    return new TapObservable(this, observerOrOnNext, onError, onCompleted);
  };

  /**
  *  Invokes an action for each element in the observable sequence.
  *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
  * @param {Function} onNext Action to invoke for each element in the observable sequence.
  * @param {Any} [thisArg] Object to use as this when executing callback.
  * @returns {Observable} The source sequence with the side-effecting behavior applied.
  */
  observableProto.doOnNext = observableProto.tapOnNext = function (onNext, thisArg) {
    return this.tap(typeof thisArg !== 'undefined' ? function (x) { onNext.call(thisArg, x); } : onNext);
  };

  /**
  *  Invokes an action upon exceptional termination of the observable sequence.
  *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
  * @param {Function} onError Action to invoke upon exceptional termination of the observable sequence.
  * @param {Any} [thisArg] Object to use as this when executing callback.
  * @returns {Observable} The source sequence with the side-effecting behavior applied.
  */
  observableProto.doOnError = observableProto.tapOnError = function (onError, thisArg) {
    return this.tap(noop, typeof thisArg !== 'undefined' ? function (e) { onError.call(thisArg, e); } : onError);
  };

  /**
  *  Invokes an action upon graceful termination of the observable sequence.
  *  This method can be used for debugging, logging, etc. of query behavior by intercepting the message stream to run arbitrary actions for messages on the pipeline.
  * @param {Function} onCompleted Action to invoke upon graceful termination of the observable sequence.
  * @param {Any} [thisArg] Object to use as this when executing callback.
  * @returns {Observable} The source sequence with the side-effecting behavior applied.
  */
  observableProto.doOnCompleted = observableProto.tapOnCompleted = function (onCompleted, thisArg) {
    return this.tap(noop, null, typeof thisArg !== 'undefined' ? function () { onCompleted.call(thisArg); } : onCompleted);
  };

  /**
   *  Invokes a specified action after the source observable sequence terminates gracefully or exceptionally.
   * @param {Function} finallyAction Action to invoke after the source observable sequence terminates.
   * @returns {Observable} Source sequence with the action-invoking termination behavior applied.
   */
  observableProto['finally'] = observableProto.ensure = function (action) {
    var source = this;
    return new AnonymousObservable(function (observer) {
      var subscription;
      try {
        subscription = source.subscribe(observer);
      } catch (e) {
        action();
        throw e;
      }
      return disposableCreate(function () {
        try {
          subscription.dispose();
        } catch (e) {
          throw e;
        } finally {
          action();
        }
      });
    }, this);
  };

  /**
   * @deprecated use #finally or #ensure instead.
   */
  observableProto.finallyAction = function (action) {
    //deprecate('finallyAction', 'finally or ensure');
    return this.ensure(action);
  };

  var IgnoreElementsObservable = (function(__super__) {
    inherits(IgnoreElementsObservable, __super__);

    function IgnoreElementsObservable(source) {
      this.source = source;
      __super__.call(this);
    }

    IgnoreElementsObservable.prototype.subscribeCore = function (o) {
      return this.source.subscribe(new InnerObserver(o));
    };

    function InnerObserver(o) {
      this.o = o;
      this.isStopped = false;
    }
    InnerObserver.prototype.onNext = noop;
    InnerObserver.prototype.onError = function (err) {
      if(!this.isStopped) {
        this.isStopped = true;
        this.o.onError(err);
      }
    };
    InnerObserver.prototype.onCompleted = function () {
      if(!this.isStopped) {
        this.isStopped = true;
        this.o.onCompleted();
      }
    };
    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
    InnerObserver.prototype.fail = function (e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.observer.onError(e);
        return true;
      }

      return false;
    };

    return IgnoreElementsObservable;
  }(ObservableBase));

  /**
   *  Ignores all elements in an observable sequence leaving only the termination messages.
   * @returns {Observable} An empty observable sequence that signals termination, successful or exceptional, of the source sequence.
   */
  observableProto.ignoreElements = function () {
    return new IgnoreElementsObservable(this);
  };

  /**
   *  Materializes the implicit notifications of an observable sequence as explicit notification values.
   * @returns {Observable} An observable sequence containing the materialized notification values from the source sequence.
   */
  observableProto.materialize = function () {
    var source = this;
    return new AnonymousObservable(function (observer) {
      return source.subscribe(function (value) {
        observer.onNext(notificationCreateOnNext(value));
      }, function (e) {
        observer.onNext(notificationCreateOnError(e));
        observer.onCompleted();
      }, function () {
        observer.onNext(notificationCreateOnCompleted());
        observer.onCompleted();
      });
    }, source);
  };

  /**
   *  Repeats the observable sequence a specified number of times. If the repeat count is not specified, the sequence repeats indefinitely.
   * @param {Number} [repeatCount]  Number of times to repeat the sequence. If not provided, repeats the sequence indefinitely.
   * @returns {Observable} The observable sequence producing the elements of the given sequence repeatedly.
   */
  observableProto.repeat = function (repeatCount) {
    return enumerableRepeat(this, repeatCount).concat();
  };

  /**
   *  Repeats the source observable sequence the specified number of times or until it successfully terminates. If the retry count is not specified, it retries indefinitely.
   *  Note if you encounter an error and want it to retry once, then you must use .retry(2);
   *
   * @example
   *  var res = retried = retry.repeat();
   *  var res = retried = retry.repeat(2);
   * @param {Number} [retryCount]  Number of times to retry the sequence. If not provided, retry the sequence indefinitely.
   * @returns {Observable} An observable sequence producing the elements of the given sequence repeatedly until it terminates successfully.
   */
  observableProto.retry = function (retryCount) {
    return enumerableRepeat(this, retryCount).catchError();
  };

  /**
   *  Repeats the source observable sequence upon error each time the notifier emits or until it successfully terminates. 
   *  if the notifier completes, the observable sequence completes.
   *
   * @example
   *  var timer = Observable.timer(500);
   *  var source = observable.retryWhen(timer);
   * @param {Observable} [notifier] An observable that triggers the retries or completes the observable with onNext or onCompleted respectively.
   * @returns {Observable} An observable sequence producing the elements of the given sequence repeatedly until it terminates successfully.
   */
  observableProto.retryWhen = function (notifier) {
    return enumerableRepeat(this).catchErrorWhen(notifier);
  };
  var ScanObservable = (function(__super__) {
    inherits(ScanObservable, __super__);
    function ScanObservable(source, accumulator, hasSeed, seed) {
      this.source = source;
      this.accumulator = accumulator;
      this.hasSeed = hasSeed;
      this.seed = seed;
      __super__.call(this);
    }

    ScanObservable.prototype.subscribeCore = function(observer) {
      return this.source.subscribe(new ScanObserver(observer,this));
    };

    return ScanObservable;
  }(ObservableBase));

  function ScanObserver(observer, parent) {
    this.observer = observer;
    this.accumulator = parent.accumulator;
    this.hasSeed = parent.hasSeed;
    this.seed = parent.seed;
    this.hasAccumulation = false;
    this.accumulation = null;
    this.hasValue = false;
    this.isStopped = false;
  }
  ScanObserver.prototype.onNext = function (x) {
    if (this.isStopped) { return; }
    !this.hasValue && (this.hasValue = true);
    try {
      if (this.hasAccumulation) {
        this.accumulation = this.accumulator(this.accumulation, x);
      } else {
        this.accumulation = this.hasSeed ? this.accumulator(this.seed, x) : x;
        this.hasAccumulation = true;
      }
    } catch (e) {
      return this.observer.onError(e);
    }
    this.observer.onNext(this.accumulation);
  };
  ScanObserver.prototype.onError = function (e) { 
    if (!this.isStopped) {
      this.isStopped = true;
      this.observer.onError(e);
    }
  };
  ScanObserver.prototype.onCompleted = function () {
    if (!this.isStopped) {
      this.isStopped = true;
      !this.hasValue && this.hasSeed && this.observer.onNext(this.seed);
      this.observer.onCompleted();
    }
  };
  ScanObserver.prototype.dispose = function() { this.isStopped = true; };
  ScanObserver.prototype.fail = function (e) {
    if (!this.isStopped) {
      this.isStopped = true;
      this.observer.onError(e);
      return true;
    }
    return false;
  };

  /**
  *  Applies an accumulator function over an observable sequence and returns each intermediate result. The optional seed value is used as the initial accumulator value.
  *  For aggregation behavior with no intermediate results, see Observable.aggregate.
  * @param {Mixed} [seed] The initial accumulator value.
  * @param {Function} accumulator An accumulator function to be invoked on each element.
  * @returns {Observable} An observable sequence containing the accumulated values.
  */
  observableProto.scan = function () {
    var hasSeed = false, seed, accumulator, source = this;
    if (arguments.length === 2) {
      hasSeed = true;
      seed = arguments[0];
      accumulator = arguments[1];
    } else {
      accumulator = arguments[0];
    }
    return new ScanObservable(this, accumulator, hasSeed, seed);
  };

  /**
   *  Bypasses a specified number of elements at the end of an observable sequence.
   * @description
   *  This operator accumulates a queue with a length enough to store the first `count` elements. As more elements are
   *  received, elements are taken from the front of the queue and produced on the result sequence. This causes elements to be delayed.
   * @param count Number of elements to bypass at the end of the source sequence.
   * @returns {Observable} An observable sequence containing the source sequence elements except for the bypassed ones at the end.
   */
  observableProto.skipLast = function (count) {
    if (count < 0) { throw new ArgumentOutOfRangeError(); }
    var source = this;
    return new AnonymousObservable(function (o) {
      var q = [];
      return source.subscribe(function (x) {
        q.push(x);
        q.length > count && o.onNext(q.shift());
      }, function (e) { o.onError(e); }, function () { o.onCompleted(); });
    }, source);
  };

  /**
   *  Prepends a sequence of values to an observable sequence with an optional scheduler and an argument list of values to prepend.
   *  @example
   *  var res = source.startWith(1, 2, 3);
   *  var res = source.startWith(Rx.Scheduler.timeout, 1, 2, 3);
   * @param {Arguments} args The specified values to prepend to the observable sequence
   * @returns {Observable} The source sequence prepended with the specified values.
   */
  observableProto.startWith = function () {
    var values, scheduler, start = 0;
    if (!!arguments.length && isScheduler(arguments[0])) {
      scheduler = arguments[0];
      start = 1;
    } else {
      scheduler = immediateScheduler;
    }
    for(var args = [], i = start, len = arguments.length; i < len; i++) { args.push(arguments[i]); }
    return enumerableOf([observableFromArray(args, scheduler), this]).concat();
  };

  /**
   *  Returns a specified number of contiguous elements from the end of an observable sequence.
   * @description
   *  This operator accumulates a buffer with a length enough to store elements count elements. Upon completion of
   *  the source sequence, this buffer is drained on the result sequence. This causes the elements to be delayed.
   * @param {Number} count Number of elements to take from the end of the source sequence.
   * @returns {Observable} An observable sequence containing the specified number of elements from the end of the source sequence.
   */
  observableProto.takeLast = function (count) {
    if (count < 0) { throw new ArgumentOutOfRangeError(); }
    var source = this;
    return new AnonymousObservable(function (o) {
      var q = [];
      return source.subscribe(function (x) {
        q.push(x);
        q.length > count && q.shift();
      }, function (e) { o.onError(e); }, function () {
        while (q.length > 0) { o.onNext(q.shift()); }
        o.onCompleted();
      });
    }, source);
  };

  /**
   *  Returns an array with the specified number of contiguous elements from the end of an observable sequence.
   *
   * @description
   *  This operator accumulates a buffer with a length enough to store count elements. Upon completion of the
   *  source sequence, this buffer is produced on the result sequence.
   * @param {Number} count Number of elements to take from the end of the source sequence.
   * @returns {Observable} An observable sequence containing a single array with the specified number of elements from the end of the source sequence.
   */
  observableProto.takeLastBuffer = function (count) {
    var source = this;
    return new AnonymousObservable(function (o) {
      var q = [];
      return source.subscribe(function (x) {
        q.push(x);
        q.length > count && q.shift();
      }, function (e) { o.onError(e); }, function () {
        o.onNext(q);
        o.onCompleted();
      });
    }, source);
  };

  /**
   *  Projects each element of an observable sequence into zero or more windows which are produced based on element count information.
   *
   *  var res = xs.windowWithCount(10);
   *  var res = xs.windowWithCount(10, 1);
   * @param {Number} count Length of each window.
   * @param {Number} [skip] Number of elements to skip between creation of consecutive windows. If not specified, defaults to the count.
   * @returns {Observable} An observable sequence of windows.
   */
  observableProto.windowWithCount = function (count, skip) {
    var source = this;
    +count || (count = 0);
    Math.abs(count) === Infinity && (count = 0);
    if (count <= 0) { throw new ArgumentOutOfRangeError(); }
    skip == null && (skip = count);
    +skip || (skip = 0);
    Math.abs(skip) === Infinity && (skip = 0);

    if (skip <= 0) { throw new ArgumentOutOfRangeError(); }
    return new AnonymousObservable(function (observer) {
      var m = new SingleAssignmentDisposable(),
        refCountDisposable = new RefCountDisposable(m),
        n = 0,
        q = [];

      function createWindow () {
        var s = new Subject();
        q.push(s);
        observer.onNext(addRef(s, refCountDisposable));
      }

      createWindow();

      m.setDisposable(source.subscribe(
        function (x) {
          for (var i = 0, len = q.length; i < len; i++) { q[i].onNext(x); }
          var c = n - count + 1;
          c >= 0 && c % skip === 0 && q.shift().onCompleted();
          ++n % skip === 0 && createWindow();
        },
        function (e) {
          while (q.length > 0) { q.shift().onError(e); }
          observer.onError(e);
        },
        function () {
          while (q.length > 0) { q.shift().onCompleted(); }
          observer.onCompleted();
        }
      ));
      return refCountDisposable;
    }, source);
  };

  function concatMap(source, selector, thisArg) {
    var selectorFunc = bindCallback(selector, thisArg, 3);
    return source.map(function (x, i) {
      var result = selectorFunc(x, i, source);
      isPromise(result) && (result = observableFromPromise(result));
      (isArrayLike(result) || isIterable(result)) && (result = observableFrom(result));
      return result;
    }).concatAll();
  }

  /**
   *  One of the Following:
   *  Projects each element of an observable sequence to an observable sequence and merges the resulting observable sequences into one observable sequence.
   *
   * @example
   *  var res = source.concatMap(function (x) { return Rx.Observable.range(0, x); });
   *  Or:
   *  Projects each element of an observable sequence to an observable sequence, invokes the result selector for the source element and each of the corresponding inner sequence's elements, and merges the results into one observable sequence.
   *
   *  var res = source.concatMap(function (x) { return Rx.Observable.range(0, x); }, function (x, y) { return x + y; });
   *  Or:
   *  Projects each element of the source observable sequence to the other observable sequence and merges the resulting observable sequences into one observable sequence.
   *
   *  var res = source.concatMap(Rx.Observable.fromArray([1,2,3]));
   * @param {Function} selector A transform function to apply to each element or an observable sequence to project each element from the
   * source sequence onto which could be either an observable or Promise.
   * @param {Function} [resultSelector]  A transform function to apply to each element of the intermediate sequence.
   * @returns {Observable} An observable sequence whose elements are the result of invoking the one-to-many transform function collectionSelector on each element of the input sequence and then mapping each of those sequence elements and their corresponding source element to a result element.
   */
  observableProto.selectConcat = observableProto.concatMap = function (selector, resultSelector, thisArg) {
    if (isFunction(selector) && isFunction(resultSelector)) {
      return this.concatMap(function (x, i) {
        var selectorResult = selector(x, i);
        isPromise(selectorResult) && (selectorResult = observableFromPromise(selectorResult));
        (isArrayLike(selectorResult) || isIterable(selectorResult)) && (selectorResult = observableFrom(selectorResult));

        return selectorResult.map(function (y, i2) {
          return resultSelector(x, y, i, i2);
        });
      });
    }
    return isFunction(selector) ?
      concatMap(this, selector, thisArg) :
      concatMap(this, function () { return selector; });
  };

  /**
   * Projects each notification of an observable sequence to an observable sequence and concats the resulting observable sequences into one observable sequence.
   * @param {Function} onNext A transform function to apply to each element; the second parameter of the function represents the index of the source element.
   * @param {Function} onError A transform function to apply when an error occurs in the source sequence.
   * @param {Function} onCompleted A transform function to apply when the end of the source sequence is reached.
   * @param {Any} [thisArg] An optional "this" to use to invoke each transform.
   * @returns {Observable} An observable sequence whose elements are the result of invoking the one-to-many transform function corresponding to each notification in the input sequence.
   */
  observableProto.concatMapObserver = observableProto.selectConcatObserver = function(onNext, onError, onCompleted, thisArg) {
    var source = this,
        onNextFunc = bindCallback(onNext, thisArg, 2),
        onErrorFunc = bindCallback(onError, thisArg, 1),
        onCompletedFunc = bindCallback(onCompleted, thisArg, 0);
    return new AnonymousObservable(function (observer) {
      var index = 0;
      return source.subscribe(
        function (x) {
          var result;
          try {
            result = onNextFunc(x, index++);
          } catch (e) {
            observer.onError(e);
            return;
          }
          isPromise(result) && (result = observableFromPromise(result));
          observer.onNext(result);
        },
        function (err) {
          var result;
          try {
            result = onErrorFunc(err);
          } catch (e) {
            observer.onError(e);
            return;
          }
          isPromise(result) && (result = observableFromPromise(result));
          observer.onNext(result);
          observer.onCompleted();
        },
        function () {
          var result;
          try {
            result = onCompletedFunc();
          } catch (e) {
            observer.onError(e);
            return;
          }
          isPromise(result) && (result = observableFromPromise(result));
          observer.onNext(result);
          observer.onCompleted();
        });
    }, this).concatAll();
  };

    /**
     *  Returns the elements of the specified sequence or the specified value in a singleton sequence if the sequence is empty.
     *
     *  var res = obs = xs.defaultIfEmpty();
     *  2 - obs = xs.defaultIfEmpty(false);
     *
     * @memberOf Observable#
     * @param defaultValue The value to return if the sequence is empty. If not provided, this defaults to null.
     * @returns {Observable} An observable sequence that contains the specified default value if the source is empty; otherwise, the elements of the source itself.
     */
    observableProto.defaultIfEmpty = function (defaultValue) {
      var source = this;
      defaultValue === undefined && (defaultValue = null);
      return new AnonymousObservable(function (observer) {
        var found = false;
        return source.subscribe(function (x) {
          found = true;
          observer.onNext(x);
        },
        function (e) { observer.onError(e); }, 
        function () {
          !found && observer.onNext(defaultValue);
          observer.onCompleted();
        });
      }, source);
    };

  // Swap out for Array.findIndex
  function arrayIndexOfComparer(array, item, comparer) {
    for (var i = 0, len = array.length; i < len; i++) {
      if (comparer(array[i], item)) { return i; }
    }
    return -1;
  }

  function HashSet(comparer) {
    this.comparer = comparer;
    this.set = [];
  }
  HashSet.prototype.push = function(value) {
    var retValue = arrayIndexOfComparer(this.set, value, this.comparer) === -1;
    retValue && this.set.push(value);
    return retValue;
  };

  /**
   *  Returns an observable sequence that contains only distinct elements according to the keySelector and the comparer.
   *  Usage of this operator should be considered carefully due to the maintenance of an internal lookup structure which can grow large.
   *
   * @example
   *  var res = obs = xs.distinct();
   *  2 - obs = xs.distinct(function (x) { return x.id; });
   *  2 - obs = xs.distinct(function (x) { return x.id; }, function (a,b) { return a === b; });
   * @param {Function} [keySelector]  A function to compute the comparison key for each element.
   * @param {Function} [comparer]  Used to compare items in the collection.
   * @returns {Observable} An observable sequence only containing the distinct elements, based on a computed key value, from the source sequence.
   */
  observableProto.distinct = function (keySelector, comparer) {
    var source = this;
    comparer || (comparer = defaultComparer);
    return new AnonymousObservable(function (o) {
      var hashSet = new HashSet(comparer);
      return source.subscribe(function (x) {
        var key = x;

        if (keySelector) {
          try {
            key = keySelector(x);
          } catch (e) {
            o.onError(e);
            return;
          }
        }
        hashSet.push(key) && o.onNext(x);
      },
      function (e) { o.onError(e); }, function () { o.onCompleted(); });
    }, this);
  };

  /**
   *  Groups the elements of an observable sequence according to a specified key selector function and comparer and selects the resulting elements by using a specified function.
   *
   * @example
   *  var res = observable.groupBy(function (x) { return x.id; });
   *  2 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; });
   *  3 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; }, function (x) { return x.toString(); });
   * @param {Function} keySelector A function to extract the key for each element.
   * @param {Function} [elementSelector]  A function to map each source element to an element in an observable group.
   * @param {Function} [comparer] Used to determine whether the objects are equal.
   * @returns {Observable} A sequence of observable groups, each of which corresponds to a unique key value, containing all elements that share that same key value.
   */
  observableProto.groupBy = function (keySelector, elementSelector, comparer) {
    return this.groupByUntil(keySelector, elementSelector, observableNever, comparer);
  };

    /**
     *  Groups the elements of an observable sequence according to a specified key selector function.
     *  A duration selector function is used to control the lifetime of groups. When a group expires, it receives an OnCompleted notification. When a new element with the same
     *  key value as a reclaimed group occurs, the group will be reborn with a new lifetime request.
     *
     * @example
     *  var res = observable.groupByUntil(function (x) { return x.id; }, null,  function () { return Rx.Observable.never(); });
     *  2 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; },  function () { return Rx.Observable.never(); });
     *  3 - observable.groupBy(function (x) { return x.id; }), function (x) { return x.name; },  function () { return Rx.Observable.never(); }, function (x) { return x.toString(); });
     * @param {Function} keySelector A function to extract the key for each element.
     * @param {Function} durationSelector A function to signal the expiration of a group.
     * @param {Function} [comparer] Used to compare objects. When not specified, the default comparer is used.
     * @returns {Observable}
     *  A sequence of observable groups, each of which corresponds to a unique key value, containing all elements that share that same key value.
     *  If a group's lifetime expires, a new group with the same key value can be created once an element with such a key value is encoutered.
     *
     */
    observableProto.groupByUntil = function (keySelector, elementSelector, durationSelector, comparer) {
      var source = this;
      elementSelector || (elementSelector = identity);
      comparer || (comparer = defaultComparer);
      return new AnonymousObservable(function (observer) {
        function handleError(e) { return function (item) { item.onError(e); }; }
        var map = new Dictionary(0, comparer),
          groupDisposable = new CompositeDisposable(),
          refCountDisposable = new RefCountDisposable(groupDisposable);

        groupDisposable.add(source.subscribe(function (x) {
          var key;
          try {
            key = keySelector(x);
          } catch (e) {
            map.getValues().forEach(handleError(e));
            observer.onError(e);
            return;
          }

          var fireNewMapEntry = false,
            writer = map.tryGetValue(key);
          if (!writer) {
            writer = new Subject();
            map.set(key, writer);
            fireNewMapEntry = true;
          }

          if (fireNewMapEntry) {
            var group = new GroupedObservable(key, writer, refCountDisposable),
              durationGroup = new GroupedObservable(key, writer);
            try {
              duration = durationSelector(durationGroup);
            } catch (e) {
              map.getValues().forEach(handleError(e));
              observer.onError(e);
              return;
            }

            observer.onNext(group);

            var md = new SingleAssignmentDisposable();
            groupDisposable.add(md);

            var expire = function () {
              map.remove(key) && writer.onCompleted();
              groupDisposable.remove(md);
            };

            md.setDisposable(duration.take(1).subscribe(
              noop,
              function (exn) {
                map.getValues().forEach(handleError(exn));
                observer.onError(exn);
              },
              expire)
            );
          }

          var element;
          try {
            element = elementSelector(x);
          } catch (e) {
            map.getValues().forEach(handleError(e));
            observer.onError(e);
            return;
          }

          writer.onNext(element);
      }, function (ex) {
        map.getValues().forEach(handleError(ex));
        observer.onError(ex);
      }, function () {
        map.getValues().forEach(function (item) { item.onCompleted(); });
        observer.onCompleted();
      }));

      return refCountDisposable;
    }, source);
  };

  var MapObservable = (function (__super__) {
    inherits(MapObservable, __super__);

    function MapObservable(source, selector, thisArg) {
      this.source = source;
      this.selector = bindCallback(selector, thisArg, 3);
      __super__.call(this);
    }
    
    function innerMap(selector, self) {
      return function (x, i, o) { return selector.call(this, self.selector(x, i, o), i, o); }
    }

    MapObservable.prototype.internalMap = function (selector, thisArg) {
      return new MapObservable(this.source, innerMap(selector, this), thisArg);
    };

    MapObservable.prototype.subscribeCore = function (o) {
      return this.source.subscribe(new InnerObserver(o, this.selector, this));
    };
    
    function InnerObserver(o, selector, source) {
      this.o = o;
      this.selector = selector;
      this.source = source;
      this.i = 0;
      this.isStopped = false;
    }
  
    InnerObserver.prototype.onNext = function(x) {
      if (this.isStopped) { return; }
      var result = tryCatch(this.selector)(x, this.i++, this.source);
      if (result === errorObj) {
        return this.o.onError(result.e);
      }
      this.o.onNext(result);
    };
    InnerObserver.prototype.onError = function (e) {
      if(!this.isStopped) { this.isStopped = true; this.o.onError(e); }
    };
    InnerObserver.prototype.onCompleted = function () {
      if(!this.isStopped) { this.isStopped = true; this.o.onCompleted(); }
    };
    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
    InnerObserver.prototype.fail = function (e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onError(e);
        return true;
      }
  
      return false;
    };

    return MapObservable;

  }(ObservableBase));

  /**
  * Projects each element of an observable sequence into a new form by incorporating the element's index.
  * @param {Function} selector A transform function to apply to each source element; the second parameter of the function represents the index of the source element.
  * @param {Any} [thisArg] Object to use as this when executing callback.
  * @returns {Observable} An observable sequence whose elements are the result of invoking the transform function on each element of source.
  */
  observableProto.map = observableProto.select = function (selector, thisArg) {
    var selectorFn = typeof selector === 'function' ? selector : function () { return selector; };
    return this instanceof MapObservable ?
      this.internalMap(selectorFn, thisArg) :
      new MapObservable(this, selectorFn, thisArg);
  };

  /**
   * Retrieves the value of a specified nested property from all elements in
   * the Observable sequence.
   * @param {Arguments} arguments The nested properties to pluck.
   * @returns {Observable} Returns a new Observable sequence of property values.
   */
  observableProto.pluck = function () {
    var args = arguments, len = arguments.length;
    if (len === 0) { throw new Error('List of properties cannot be empty.'); }
    return this.map(function (x) {
      var currentProp = x;
      for (var i = 0; i < len; i++) {
        var p = currentProp[args[i]];
        if (typeof p !== 'undefined') {
          currentProp = p;
        } else {
          return undefined;
        }
      }
      return currentProp;
    });
  };

  function flatMap(source, selector, thisArg) {
    var selectorFunc = bindCallback(selector, thisArg, 3);
    return source.map(function (x, i) {
      var result = selectorFunc(x, i, source);
      isPromise(result) && (result = observableFromPromise(result));
      (isArrayLike(result) || isIterable(result)) && (result = observableFrom(result));
      return result;
    }).mergeAll();
  }

  /**
   *  One of the Following:
   *  Projects each element of an observable sequence to an observable sequence and merges the resulting observable sequences into one observable sequence.
   *
   * @example
   *  var res = source.selectMany(function (x) { return Rx.Observable.range(0, x); });
   *  Or:
   *  Projects each element of an observable sequence to an observable sequence, invokes the result selector for the source element and each of the corresponding inner sequence's elements, and merges the results into one observable sequence.
   *
   *  var res = source.selectMany(function (x) { return Rx.Observable.range(0, x); }, function (x, y) { return x + y; });
   *  Or:
   *  Projects each element of the source observable sequence to the other observable sequence and merges the resulting observable sequences into one observable sequence.
   *
   *  var res = source.selectMany(Rx.Observable.fromArray([1,2,3]));
   * @param {Function} selector A transform function to apply to each element or an observable sequence to project each element from the source sequence onto which could be either an observable or Promise.
   * @param {Function} [resultSelector]  A transform function to apply to each element of the intermediate sequence.
   * @param {Any} [thisArg] Object to use as this when executing callback.
   * @returns {Observable} An observable sequence whose elements are the result of invoking the one-to-many transform function collectionSelector on each element of the input sequence and then mapping each of those sequence elements and their corresponding source element to a result element.
   */
  observableProto.selectMany = observableProto.flatMap = function (selector, resultSelector, thisArg) {
    if (isFunction(selector) && isFunction(resultSelector)) {
      return this.flatMap(function (x, i) {
        var selectorResult = selector(x, i);
        isPromise(selectorResult) && (selectorResult = observableFromPromise(selectorResult));
        (isArrayLike(selectorResult) || isIterable(selectorResult)) && (selectorResult = observableFrom(selectorResult));

        return selectorResult.map(function (y, i2) {
          return resultSelector(x, y, i, i2);
        });
      }, thisArg);
    }
    return isFunction(selector) ?
      flatMap(this, selector, thisArg) :
      flatMap(this, function () { return selector; });
  };

  /**
   * Projects each notification of an observable sequence to an observable sequence and merges the resulting observable sequences into one observable sequence.
   * @param {Function} onNext A transform function to apply to each element; the second parameter of the function represents the index of the source element.
   * @param {Function} onError A transform function to apply when an error occurs in the source sequence.
   * @param {Function} onCompleted A transform function to apply when the end of the source sequence is reached.
   * @param {Any} [thisArg] An optional "this" to use to invoke each transform.
   * @returns {Observable} An observable sequence whose elements are the result of invoking the one-to-many transform function corresponding to each notification in the input sequence.
   */
  observableProto.flatMapObserver = observableProto.selectManyObserver = function (onNext, onError, onCompleted, thisArg) {
    var source = this;
    return new AnonymousObservable(function (observer) {
      var index = 0;

      return source.subscribe(
        function (x) {
          var result;
          try {
            result = onNext.call(thisArg, x, index++);
          } catch (e) {
            observer.onError(e);
            return;
          }
          isPromise(result) && (result = observableFromPromise(result));
          observer.onNext(result);
        },
        function (err) {
          var result;
          try {
            result = onError.call(thisArg, err);
          } catch (e) {
            observer.onError(e);
            return;
          }
          isPromise(result) && (result = observableFromPromise(result));
          observer.onNext(result);
          observer.onCompleted();
        },
        function () {
          var result;
          try {
            result = onCompleted.call(thisArg);
          } catch (e) {
            observer.onError(e);
            return;
          }
          isPromise(result) && (result = observableFromPromise(result));
          observer.onNext(result);
          observer.onCompleted();
        });
    }, source).mergeAll();
  };

  /**
   *  Projects each element of an observable sequence into a new sequence of observable sequences by incorporating the element's index and then
   *  transforms an observable sequence of observable sequences into an observable sequence producing values only from the most recent observable sequence.
   * @param {Function} selector A transform function to apply to each source element; the second parameter of the function represents the index of the source element.
   * @param {Any} [thisArg] Object to use as this when executing callback.
   * @returns {Observable} An observable sequence whose elements are the result of invoking the transform function on each element of source producing an Observable of Observable sequences
   *  and that at any point in time produces the elements of the most recent inner observable sequence that has been received.
   */
  observableProto.selectSwitch = observableProto.flatMapLatest = observableProto.switchMap = function (selector, thisArg) {
    return this.select(selector, thisArg).switchLatest();
  };

  var SkipObservable = (function(__super__) {
    inherits(SkipObservable, __super__);
    function SkipObservable(source, count) {
      this.source = source;
      this.skipCount = count;
      __super__.call(this);
    }
    
    SkipObservable.prototype.subscribeCore = function (o) {
      return this.source.subscribe(new InnerObserver(o, this.skipCount));
    };
    
    function InnerObserver(o, c) {
      this.c = c;
      this.r = c;
      this.o = o;
      this.isStopped = false;
    }
    InnerObserver.prototype.onNext = function (x) {
      if (this.isStopped) { return; }
      if (this.r <= 0) { 
        this.o.onNext(x);
      } else {
        this.r--;
      }
    };
    InnerObserver.prototype.onError = function(e) {
      if (!this.isStopped) { this.isStopped = true; this.o.onError(e); }
    };
    InnerObserver.prototype.onCompleted = function() {
      if (!this.isStopped) { this.isStopped = true; this.o.onCompleted(); }
    };
    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
    InnerObserver.prototype.fail = function(e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onError(e);
        return true;
      }
      return false;
    };
    
    return SkipObservable;
  }(ObservableBase));  
  
  /**
   * Bypasses a specified number of elements in an observable sequence and then returns the remaining elements.
   * @param {Number} count The number of elements to skip before returning the remaining elements.
   * @returns {Observable} An observable sequence that contains the elements that occur after the specified index in the input sequence.
   */
  observableProto.skip = function (count) {
    if (count < 0) { throw new ArgumentOutOfRangeError(); }
    return new SkipObservable(this, count);
  };
  /**
   *  Bypasses elements in an observable sequence as long as a specified condition is true and then returns the remaining elements.
   *  The element's index is used in the logic of the predicate function.
   *
   *  var res = source.skipWhile(function (value) { return value < 10; });
   *  var res = source.skipWhile(function (value, index) { return value < 10 || index < 10; });
   * @param {Function} predicate A function to test each element for a condition; the second parameter of the function represents the index of the source element.
   * @param {Any} [thisArg] Object to use as this when executing callback.
   * @returns {Observable} An observable sequence that contains the elements from the input sequence starting at the first element in the linear series that does not pass the test specified by predicate.
   */
  observableProto.skipWhile = function (predicate, thisArg) {
    var source = this,
        callback = bindCallback(predicate, thisArg, 3);
    return new AnonymousObservable(function (o) {
      var i = 0, running = false;
      return source.subscribe(function (x) {
        if (!running) {
          try {
            running = !callback(x, i++, source);
          } catch (e) {
            o.onError(e);
            return;
          }
        }
        running && o.onNext(x);
      }, function (e) { o.onError(e); }, function () { o.onCompleted(); });
    }, source);
  };

  /**
   *  Returns a specified number of contiguous elements from the start of an observable sequence, using the specified scheduler for the edge case of take(0).
   *
   *  var res = source.take(5);
   *  var res = source.take(0, Rx.Scheduler.timeout);
   * @param {Number} count The number of elements to return.
   * @param {Scheduler} [scheduler] Scheduler used to produce an OnCompleted message in case <paramref name="count count</paramref> is set to 0.
   * @returns {Observable} An observable sequence that contains the specified number of elements from the start of the input sequence.
   */
  observableProto.take = function (count, scheduler) {
    if (count < 0) { throw new ArgumentOutOfRangeError(); }
    if (count === 0) { return observableEmpty(scheduler); }
    var source = this;
    return new AnonymousObservable(function (o) {
      var remaining = count;
      return source.subscribe(function (x) {
        if (remaining-- > 0) {
          o.onNext(x);
          remaining <= 0 && o.onCompleted();
        }
      }, function (e) { o.onError(e); }, function () { o.onCompleted(); });
    }, source);
  };

  /**
   *  Returns elements from an observable sequence as long as a specified condition is true.
   *  The element's index is used in the logic of the predicate function.
   * @param {Function} predicate A function to test each element for a condition; the second parameter of the function represents the index of the source element.
   * @param {Any} [thisArg] Object to use as this when executing callback.
   * @returns {Observable} An observable sequence that contains the elements from the input sequence that occur before the element at which the test no longer passes.
   */
  observableProto.takeWhile = function (predicate, thisArg) {
    var source = this,
        callback = bindCallback(predicate, thisArg, 3);
    return new AnonymousObservable(function (o) {
      var i = 0, running = true;
      return source.subscribe(function (x) {
        if (running) {
          try {
            running = callback(x, i++, source);
          } catch (e) {
            o.onError(e);
            return;
          }
          if (running) {
            o.onNext(x);
          } else {
            o.onCompleted();
          }
        }
      }, function (e) { o.onError(e); }, function () { o.onCompleted(); });
    }, source);
  };

  var FilterObservable = (function (__super__) {
    inherits(FilterObservable, __super__);

    function FilterObservable(source, predicate, thisArg) {
      this.source = source;
      this.predicate = bindCallback(predicate, thisArg, 3);
      __super__.call(this);
    }

    FilterObservable.prototype.subscribeCore = function (o) {
      return this.source.subscribe(new InnerObserver(o, this.predicate, this));
    };
    
    function innerPredicate(predicate, self) {
      return function(x, i, o) { return self.predicate(x, i, o) && predicate.call(this, x, i, o); }
    }

    FilterObservable.prototype.internalFilter = function(predicate, thisArg) {
      return new FilterObservable(this.source, innerPredicate(predicate, this), thisArg);
    };
    
    function InnerObserver(o, predicate, source) {
      this.o = o;
      this.predicate = predicate;
      this.source = source;
      this.i = 0;
      this.isStopped = false;
    }
  
    InnerObserver.prototype.onNext = function(x) {
      if (this.isStopped) { return; }
      var shouldYield = tryCatch(this.predicate)(x, this.i++, this.source);
      if (shouldYield === errorObj) {
        return this.o.onError(shouldYield.e);
      }
      shouldYield && this.o.onNext(x);
    };
    InnerObserver.prototype.onError = function (e) {
      if(!this.isStopped) { this.isStopped = true; this.o.onError(e); }
    };
    InnerObserver.prototype.onCompleted = function () {
      if(!this.isStopped) { this.isStopped = true; this.o.onCompleted(); }
    };
    InnerObserver.prototype.dispose = function() { this.isStopped = true; };
    InnerObserver.prototype.fail = function (e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onError(e);
        return true;
      }
      return false;
    };

    return FilterObservable;

  }(ObservableBase));

  /**
  *  Filters the elements of an observable sequence based on a predicate by incorporating the element's index.
  * @param {Function} predicate A function to test each source element for a condition; the second parameter of the function represents the index of the source element.
  * @param {Any} [thisArg] Object to use as this when executing callback.
  * @returns {Observable} An observable sequence that contains elements from the input sequence that satisfy the condition.
  */
  observableProto.filter = observableProto.where = function (predicate, thisArg) {
    return this instanceof FilterObservable ? this.internalFilter(predicate, thisArg) :
      new FilterObservable(this, predicate, thisArg);
  };

  function extremaBy(source, keySelector, comparer) {
    return new AnonymousObservable(function (o) {
      var hasValue = false, lastKey = null, list = [];
      return source.subscribe(function (x) {
        var comparison, key;
        try {
          key = keySelector(x);
        } catch (ex) {
          o.onError(ex);
          return;
        }
        comparison = 0;
        if (!hasValue) {
          hasValue = true;
          lastKey = key;
        } else {
          try {
            comparison = comparer(key, lastKey);
          } catch (ex1) {
            o.onError(ex1);
            return;
          }
        }
        if (comparison > 0) {
          lastKey = key;
          list = [];
        }
        if (comparison >= 0) { list.push(x); }
      }, function (e) { o.onError(e); }, function () {
        o.onNext(list);
        o.onCompleted();
      });
    }, source);
  }

  function firstOnly(x) {
    if (x.length === 0) { throw new EmptyError(); }
    return x[0];
  }

  /**
   * Applies an accumulator function over an observable sequence, returning the result of the aggregation as a single element in the result sequence. The specified seed value is used as the initial accumulator value.
   * For aggregation behavior with incremental intermediate results, see Observable.scan.
   * @deprecated Use #reduce instead
   * @param {Mixed} [seed] The initial accumulator value.
   * @param {Function} accumulator An accumulator function to be invoked on each element.
   * @returns {Observable} An observable sequence containing a single element with the final accumulator value.
   */
  observableProto.aggregate = function () {
    var hasSeed = false, accumulator, seed, source = this;
    if (arguments.length === 2) {
      hasSeed = true;
      seed = arguments[0];
      accumulator = arguments[1];
    } else {
      accumulator = arguments[0];
    }
    return new AnonymousObservable(function (o) {
      var hasAccumulation, accumulation, hasValue;
      return source.subscribe (
        function (x) {
          !hasValue && (hasValue = true);
          try {
            if (hasAccumulation) {
              accumulation = accumulator(accumulation, x);
            } else {
              accumulation = hasSeed ? accumulator(seed, x) : x;
              hasAccumulation = true;
            }
          } catch (e) {
            return o.onError(e);
          }
        },
        function (e) { o.onError(e); },
        function () {
          hasValue && o.onNext(accumulation);
          !hasValue && hasSeed && o.onNext(seed);
          !hasValue && !hasSeed && o.onError(new EmptyError());
          o.onCompleted();
        }
      );
    }, source);
  };

  var ReduceObservable = (function(__super__) {
    inherits(ReduceObservable, __super__);
    function ReduceObservable(source, acc, hasSeed, seed) {
      this.source = source;
      this.acc = acc;
      this.hasSeed = hasSeed;
      this.seed = seed;
      __super__.call(this);
    }

    ReduceObservable.prototype.subscribeCore = function(observer) {
      return this.source.subscribe(new InnerObserver(observer,this));
    };

    function InnerObserver(o, parent) {
      this.o = o;
      this.acc = parent.acc;
      this.hasSeed = parent.hasSeed;
      this.seed = parent.seed;
      this.hasAccumulation = false;
      this.result = null;
      this.hasValue = false;
      this.isStopped = false;
    }
    InnerObserver.prototype.onNext = function (x) {
      if (this.isStopped) { return; }
      !this.hasValue && (this.hasValue = true);
      if (this.hasAccumulation) {
        this.result = tryCatch(this.acc)(this.result, x);
      } else {
        this.result = this.hasSeed ? tryCatch(this.acc)(this.seed, x) : x;
        this.hasAccumulation = true;
      }
      if (this.result === errorObj) { this.o.onError(this.result.e); }
    };
    InnerObserver.prototype.onError = function (e) { 
      if (!this.isStopped) { this.isStopped = true; this.o.onError(e); } 
    };
    InnerObserver.prototype.onCompleted = function () {
      if (!this.isStopped) {
        this.isStopped = true;
        this.hasValue && this.o.onNext(this.result);
        !this.hasValue && this.hasSeed && this.o.onNext(this.seed);
        !this.hasValue && !this.hasSeed && this.o.onError(new EmptyError());
        this.o.onCompleted();
      }
    };
    InnerObserver.prototype.dispose = function () { this.isStopped = true; };
    InnerObserver.prototype.fail = function(e) {
      if (!this.isStopped) {
        this.isStopped = true;
        this.o.onError(e);
        return true;
      }
      return false;
    };

    return ReduceObservable;
  }(ObservableBase));

  /**
  * Applies an accumulator function over an observable sequence, returning the result of the aggregation as a single element in the result sequence. The specified seed value is used as the initial accumulator value.
  * For aggregation behavior with incremental intermediate results, see Observable.scan.
  * @param {Function} accumulator An accumulator function to be invoked on each element.
  * @param {Any} [seed] The initial accumulator value.
  * @returns {Observable} An observable sequence containing a single element with the final accumulator value.
  */
  observableProto.reduce = function (accumulator) {
    var hasSeed = false;
    if (arguments.length === 2) {
      hasSeed = true;
      var seed = arguments[1];
    }
    return new ReduceObservable(this, accumulator, hasSeed, seed);
  };

  /**
   * Determines whether any element of an observable sequence satisfies a condition if present, else if any items are in the sequence.
   * @param {Function} [predicate] A function to test each element for a condition.
   * @returns {Observable} An observable sequence containing a single element determining whether any elements in the source sequence pass the test in the specified predicate if given, else if any items are in the sequence.
   */
  observableProto.some = function (predicate, thisArg) {
    var source = this;
    return predicate ?
      source.filter(predicate, thisArg).some() :
      new AnonymousObservable(function (observer) {
        return source.subscribe(function () {
          observer.onNext(true);
          observer.onCompleted();
        }, function (e) { observer.onError(e); }, function () {
          observer.onNext(false);
          observer.onCompleted();
        });
      }, source);
  };

  /** @deprecated use #some instead */
  observableProto.any = function () {
    //deprecate('any', 'some');
    return this.some.apply(this, arguments);
  };

  /**
   * Determines whether an observable sequence is empty.
   * @returns {Observable} An observable sequence containing a single element determining whether the source sequence is empty.
   */
  observableProto.isEmpty = function () {
    return this.any().map(not);
  };

  /**
   * Determines whether all elements of an observable sequence satisfy a condition.
   * @param {Function} [predicate] A function to test each element for a condition.
   * @param {Any} [thisArg] Object to use as this when executing callback.
   * @returns {Observable} An observable sequence containing a single element determining whether all elements in the source sequence pass the test in the specified predicate.
   */
  observableProto.every = function (predicate, thisArg) {
    return this.filter(function (v) { return !predicate(v); }, thisArg).some().map(not);
  };

  /** @deprecated use #every instead */
  observableProto.all = function () {
    //deprecate('all', 'every');
    return this.every.apply(this, arguments);
  };

  /**
   * Determines whether an observable sequence includes a specified element with an optional equality comparer.
   * @param searchElement The value to locate in the source sequence.
   * @param {Number} [fromIndex] An equality comparer to compare elements.
   * @returns {Observable} An observable sequence containing a single element determining whether the source sequence includes an element that has the specified value from the given index.
   */
  observableProto.includes = function (searchElement, fromIndex) {
    var source = this;
    function comparer(a, b) {
      return (a === 0 && b === 0) || (a === b || (isNaN(a) && isNaN(b)));
    }
    return new AnonymousObservable(function (o) {
      var i = 0, n = +fromIndex || 0;
      Math.abs(n) === Infinity && (n = 0);
      if (n < 0) {
        o.onNext(false);
        o.onCompleted();
        return disposableEmpty;
      }
      return source.subscribe(
        function (x) {
          if (i++ >= n && comparer(x, searchElement)) {
            o.onNext(true);
            o.onCompleted();
          }
        },
        function (e) { o.onError(e); },
        function () {
          o.onNext(false);
          o.onCompleted();
        });
    }, this);
  };

  /**
   * @deprecated use #includes instead.
   */
  observableProto.contains = function (searchElement, fromIndex) {
    //deprecate('contains', 'includes');
    observableProto.includes(searchElement, fromIndex);
  };

  /**
   * Returns an observable sequence containing a value that represents how many elements in the specified observable sequence satisfy a condition if provided, else the count of items.
   * @example
   * res = source.count();
   * res = source.count(function (x) { return x > 3; });
   * @param {Function} [predicate]A function to test each element for a condition.
   * @param {Any} [thisArg] Object to use as this when executing callback.
   * @returns {Observable} An observable sequence containing a single element with a number that represents how many elements in the input sequence satisfy the condition in the predicate function if provided, else the count of items in the sequence.
   */
  observableProto.count = function (predicate, thisArg) {
    return predicate ?
      this.filter(predicate, thisArg).count() :
      this.reduce(function (count) { return count + 1; }, 0);
  };

  /**
   * Returns the first index at which a given element can be found in the observable sequence, or -1 if it is not present.
   * @param {Any} searchElement Element to locate in the array.
   * @param {Number} [fromIndex] The index to start the search.  If not specified, defaults to 0.
   * @returns {Observable} And observable sequence containing the first index at which a given element can be found in the observable sequence, or -1 if it is not present.
   */
  observableProto.indexOf = function(searchElement, fromIndex) {
    var source = this;
    return new AnonymousObservable(function (o) {
      var i = 0, n = +fromIndex || 0;
      Math.abs(n) === Infinity && (n = 0);
      if (n < 0) {
        o.onNext(-1);
        o.onCompleted();
        return disposableEmpty;
      }
      return source.subscribe(
        function (x) {
          if (i >= n && x === searchElement) {
            o.onNext(i);
            o.onCompleted();
          }
          i++;
        },
        function (e) { o.onError(e); },
        function () {
          o.onNext(-1);
          o.onCompleted();
        });
    }, source);
  };

  /**
   * Computes the sum of a sequence of values that are obtained by invoking an optional transform function on each element of the input sequence, else if not specified computes the sum on each item in the sequence.
   * @param {Function} [selector] A transform function to apply to each element.
   * @param {Any} [thisArg] Object to use as this when executing callback.
   * @returns {Observable} An observable sequence containing a single element with the sum of the values in the source sequence.
   */
  observableProto.sum = function (keySelector, thisArg) {
    return keySelector && isFunction(keySelector) ?
      this.map(keySelector, thisArg).sum() :
      this.reduce(function (prev, curr) { return prev + curr; }, 0);
  };

  /**
   * Returns the elements in an observable sequence with the minimum key value according to the specified comparer.
   * @example
   * var res = source.minBy(function (x) { return x.value; });
   * var res = source.minBy(function (x) { return x.value; }, function (x, y) { return x - y; });
   * @param {Function} keySelector Key selector function.
   * @param {Function} [comparer] Comparer used to compare key values.
   * @returns {Observable} An observable sequence containing a list of zero or more elements that have a minimum key value.
   */
  observableProto.minBy = function (keySelector, comparer) {
    comparer || (comparer = defaultSubComparer);
    return extremaBy(this, keySelector, function (x, y) { return comparer(x, y) * -1; });
  };

  /**
   * Returns the minimum element in an observable sequence according to the optional comparer else a default greater than less than check.
   * @example
   * var res = source.min();
   * var res = source.min(function (x, y) { return x.value - y.value; });
   * @param {Function} [comparer] Comparer used to compare elements.
   * @returns {Observable} An observable sequence containing a single element with the minimum element in the source sequence.
   */
  observableProto.min = function (comparer) {
    return this.minBy(identity, comparer).map(function (x) { return firstOnly(x); });
  };

  /**
   * Returns the elements in an observable sequence with the maximum  key value according to the specified comparer.
   * @example
   * var res = source.maxBy(function (x) { return x.value; });
   * var res = source.maxBy(function (x) { return x.value; }, function (x, y) { return x - y;; });
   * @param {Function} keySelector Key selector function.
   * @param {Function} [comparer]  Comparer used to compare key values.
   * @returns {Observable} An observable sequence containing a list of zero or more elements that have a maximum key value.
   */
  observableProto.maxBy = function (keySelector, comparer) {
    comparer || (comparer = defaultSubComparer);
    return extremaBy(this, keySelector, comparer);
  };

  /**
   * Returns the maximum value in an observable sequence according to the specified comparer.
   * @example
   * var res = source.max();
   * var res = source.max(function (x, y) { return x.value - y.value; });
   * @param {Function} [comparer] Comparer used to compare elements.
   * @returns {Observable} An observable sequence containing a single element with the maximum element in the source sequence.
   */
  observableProto.max = function (comparer) {
    return this.maxBy(identity, comparer).map(function (x) { return firstOnly(x); });
  };

  /**
   * Computes the average of an observable sequence of values that are in the sequence or obtained by invoking a transform function on each element of the input sequence if present.
   * @param {Function} [selector] A transform function to apply to each element.
   * @param {Any} [thisArg] Object to use as this when executing callback.
   * @returns {Observable} An observable sequence containing a single element with the average of the sequence of values.
   */
  observableProto.average = function (keySelector, thisArg) {
    return keySelector && isFunction(keySelector) ?
      this.map(keySelector, thisArg).average() :
      this.reduce(function (prev, cur) {
        return {
          sum: prev.sum + cur,
          count: prev.count + 1
        };
      }, {sum: 0, count: 0 }).map(function (s) {
        if (s.count === 0) { throw new EmptyError(); }
        return s.sum / s.count;
      });
  };

  /**
   *  Determines whether two sequences are equal by comparing the elements pairwise using a specified equality comparer.
   *
   * @example
   * var res = res = source.sequenceEqual([1,2,3]);
   * var res = res = source.sequenceEqual([{ value: 42 }], function (x, y) { return x.value === y.value; });
   * 3 - res = source.sequenceEqual(Rx.Observable.returnValue(42));
   * 4 - res = source.sequenceEqual(Rx.Observable.returnValue({ value: 42 }), function (x, y) { return x.value === y.value; });
   * @param {Observable} second Second observable sequence or array to compare.
   * @param {Function} [comparer] Comparer used to compare elements of both sequences.
   * @returns {Observable} An observable sequence that contains a single element which indicates whether both sequences are of equal length and their corresponding elements are equal according to the specified equality comparer.
   */
  observableProto.sequenceEqual = function (second, comparer) {
    var first = this;
    comparer || (comparer = defaultComparer);
    return new AnonymousObservable(function (o) {
      var donel = false, doner = false, ql = [], qr = [];
      var subscription1 = first.subscribe(function (x) {
        var equal, v;
        if (qr.length > 0) {
          v = qr.shift();
          try {
            equal = comparer(v, x);
          } catch (e) {
            o.onError(e);
            return;
          }
          if (!equal) {
            o.onNext(false);
            o.onCompleted();
          }
        } else if (doner) {
          o.onNext(false);
          o.onCompleted();
        } else {
          ql.push(x);
        }
      }, function(e) { o.onError(e); }, function () {
        donel = true;
        if (ql.length === 0) {
          if (qr.length > 0) {
            o.onNext(false);
            o.onCompleted();
          } else if (doner) {
            o.onNext(true);
            o.onCompleted();
          }
        }
      });

      (isArrayLike(second) || isIterable(second)) && (second = observableFrom(second));
      isPromise(second) && (second = observableFromPromise(second));
      var subscription2 = second.subscribe(function (x) {
        var equal;
        if (ql.length > 0) {
          var v = ql.shift();
          try {
            equal = comparer(v, x);
          } catch (exception) {
            o.onError(exception);
            return;
          }
          if (!equal) {
            o.onNext(false);
            o.onCompleted();
          }
        } else if (donel) {
          o.onNext(false);
          o.onCompleted();
        } else {
          qr.push(x);
        }
      }, function(e) { o.onError(e); }, function () {
        doner = true;
        if (qr.length === 0) {
          if (ql.length > 0) {
            o.onNext(false);
            o.onCompleted();
          } else if (donel) {
            o.onNext(true);
            o.onCompleted();
          }
        }
      });
      return new CompositeDisposable(subscription1, subscription2);
    }, first);
  };

  function elementAtOrDefault(source, index, hasDefault, defaultValue) {
    if (index < 0) { throw new ArgumentOutOfRangeError(); }
    return new AnonymousObservable(function (o) {
      var i = index;
      return source.subscribe(function (x) {
        if (i-- === 0) {
          o.onNext(x);
          o.onCompleted();
        }
      }, function (e) { o.onError(e); }, function () {
        if (!hasDefault) {
          o.onError(new ArgumentOutOfRangeError());
        } else {
          o.onNext(defaultValue);
          o.onCompleted();
        }
      });
    }, source);
  }

  /**
   * Returns the element at a specified index in a sequence.
   * @example
   * var res = source.elementAt(5);
   * @param {Number} index The zero-based index of the element to retrieve.
   * @returns {Observable} An observable sequence that produces the element at the specified position in the source sequence.
   */
  observableProto.elementAt =  function (index) {
    return elementAtOrDefault(this, index, false);
  };

  /**
   * Returns the element at a specified index in a sequence or a default value if the index is out of range.
   * @example
   * var res = source.elementAtOrDefault(5);
   * var res = source.elementAtOrDefault(5, 0);
   * @param {Number} index The zero-based index of the element to retrieve.
   * @param [defaultValue] The default value if the index is outside the bounds of the source sequence.
   * @returns {Observable} An observable sequence that produces the element at the specified position in the source sequence, or a default value if the index is outside the bounds of the source sequence.
   */
  observableProto.elementAtOrDefault = function (index, defaultValue) {
    return elementAtOrDefault(this, index, true, defaultValue);
  };

  function singleOrDefaultAsync(source, hasDefault, defaultValue) {
    return new AnonymousObservable(function (o) {
      var value = defaultValue, seenValue = false;
      return source.subscribe(function (x) {
        if (seenValue) {
          o.onError(new Error('Sequence contains more than one element'));
        } else {
          value = x;
          seenValue = true;
        }
      }, function (e) { o.onError(e); }, function () {
        if (!seenValue && !hasDefault) {
          o.onError(new EmptyError());
        } else {
          o.onNext(value);
          o.onCompleted();
        }
      });
    }, source);
  }

  /**
   * Returns the only element of an observable sequence that satisfies the condition in the optional predicate, and reports an exception if there is not exactly one element in the observable sequence.
   * @param {Function} [predicate] A predicate function to evaluate for elements in the source sequence.
   * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
   * @returns {Observable} Sequence containing the single element in the observable sequence that satisfies the condition in the predicate.
   */
  observableProto.single = function (predicate, thisArg) {
    return predicate && isFunction(predicate) ?
      this.where(predicate, thisArg).single() :
      singleOrDefaultAsync(this, false);
  };

  /**
   * Returns the only element of an observable sequence that matches the predicate, or a default value if no such element exists; this method reports an exception if there is more than one element in the observable sequence.
   * @example
   * var res = res = source.singleOrDefault();
   * var res = res = source.singleOrDefault(function (x) { return x === 42; });
   * res = source.singleOrDefault(function (x) { return x === 42; }, 0);
   * res = source.singleOrDefault(null, 0);
   * @memberOf Observable#
   * @param {Function} predicate A predicate function to evaluate for elements in the source sequence.
   * @param [defaultValue] The default value if the index is outside the bounds of the source sequence.
   * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
   * @returns {Observable} Sequence containing the single element in the observable sequence that satisfies the condition in the predicate, or a default value if no such element exists.
   */
  observableProto.singleOrDefault = function (predicate, defaultValue, thisArg) {
    return predicate && isFunction(predicate) ?
      this.filter(predicate, thisArg).singleOrDefault(null, defaultValue) :
      singleOrDefaultAsync(this, true, defaultValue);
  };

  function firstOrDefaultAsync(source, hasDefault, defaultValue) {
    return new AnonymousObservable(function (o) {
      return source.subscribe(function (x) {
        o.onNext(x);
        o.onCompleted();
      }, function (e) { o.onError(e); }, function () {
        if (!hasDefault) {
          o.onError(new EmptyError());
        } else {
          o.onNext(defaultValue);
          o.onCompleted();
        }
      });
    }, source);
  }

  /**
   * Returns the first element of an observable sequence that satisfies the condition in the predicate if present else the first item in the sequence.
   * @example
   * var res = res = source.first();
   * var res = res = source.first(function (x) { return x > 3; });
   * @param {Function} [predicate] A predicate function to evaluate for elements in the source sequence.
   * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
   * @returns {Observable} Sequence containing the first element in the observable sequence that satisfies the condition in the predicate if provided, else the first item in the sequence.
   */
  observableProto.first = function (predicate, thisArg) {
    return predicate ?
      this.where(predicate, thisArg).first() :
      firstOrDefaultAsync(this, false);
  };

  /**
   * Returns the first element of an observable sequence that satisfies the condition in the predicate, or a default value if no such element exists.
   * @param {Function} [predicate] A predicate function to evaluate for elements in the source sequence.
   * @param {Any} [defaultValue] The default value if no such element exists.  If not specified, defaults to null.
   * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
   * @returns {Observable} Sequence containing the first element in the observable sequence that satisfies the condition in the predicate, or a default value if no such element exists.
   */
  observableProto.firstOrDefault = function (predicate, defaultValue, thisArg) {
    return predicate ?
      this.where(predicate).firstOrDefault(null, defaultValue) :
      firstOrDefaultAsync(this, true, defaultValue);
  };

  function lastOrDefaultAsync(source, hasDefault, defaultValue) {
    return new AnonymousObservable(function (o) {
      var value = defaultValue, seenValue = false;
      return source.subscribe(function (x) {
        value = x;
        seenValue = true;
      }, function (e) { o.onError(e); }, function () {
        if (!seenValue && !hasDefault) {
          o.onError(new EmptyError());
        } else {
          o.onNext(value);
          o.onCompleted();
        }
      });
    }, source);
  }

  /**
   * Returns the last element of an observable sequence that satisfies the condition in the predicate if specified, else the last element.
   * @param {Function} [predicate] A predicate function to evaluate for elements in the source sequence.
   * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
   * @returns {Observable} Sequence containing the last element in the observable sequence that satisfies the condition in the predicate.
   */
  observableProto.last = function (predicate, thisArg) {
    return predicate ?
      this.where(predicate, thisArg).last() :
      lastOrDefaultAsync(this, false);
  };

  /**
   * Returns the last element of an observable sequence that satisfies the condition in the predicate, or a default value if no such element exists.
   * @param {Function} [predicate] A predicate function to evaluate for elements in the source sequence.
   * @param [defaultValue] The default value if no such element exists.  If not specified, defaults to null.
   * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
   * @returns {Observable} Sequence containing the last element in the observable sequence that satisfies the condition in the predicate, or a default value if no such element exists.
   */
  observableProto.lastOrDefault = function (predicate, defaultValue, thisArg) {
    return predicate ?
      this.where(predicate, thisArg).lastOrDefault(null, defaultValue) :
      lastOrDefaultAsync(this, true, defaultValue);
  };

  function findValue (source, predicate, thisArg, yieldIndex) {
    var callback = bindCallback(predicate, thisArg, 3);
    return new AnonymousObservable(function (o) {
      var i = 0;
      return source.subscribe(function (x) {
        var shouldRun;
        try {
          shouldRun = callback(x, i, source);
        } catch (e) {
          o.onError(e);
          return;
        }
        if (shouldRun) {
          o.onNext(yieldIndex ? i : x);
          o.onCompleted();
        } else {
          i++;
        }
      }, function (e) { o.onError(e); }, function () {
        o.onNext(yieldIndex ? -1 : undefined);
        o.onCompleted();
      });
    }, source);
  }

  /**
   * Searches for an element that matches the conditions defined by the specified predicate, and returns the first occurrence within the entire Observable sequence.
   * @param {Function} predicate The predicate that defines the conditions of the element to search for.
   * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
   * @returns {Observable} An Observable sequence with the first element that matches the conditions defined by the specified predicate, if found; otherwise, undefined.
   */
  observableProto.find = function (predicate, thisArg) {
    return findValue(this, predicate, thisArg, false);
  };

  /**
   * Searches for an element that matches the conditions defined by the specified predicate, and returns
   * an Observable sequence with the zero-based index of the first occurrence within the entire Observable sequence.
   * @param {Function} predicate The predicate that defines the conditions of the element to search for.
   * @param {Any} [thisArg] Object to use as `this` when executing the predicate.
   * @returns {Observable} An Observable sequence with the zero-based index of the first occurrence of an element that matches the conditions defined by match, if found; otherwise, –1.
  */
  observableProto.findIndex = function (predicate, thisArg) {
    return findValue(this, predicate, thisArg, true);
  };

  /**
   * Converts the observable sequence to a Set if it exists.
   * @returns {Observable} An observable sequence with a single value of a Set containing the values from the observable sequence.
   */
  observableProto.toSet = function () {
    if (typeof root.Set === 'undefined') { throw new TypeError(); }
    var source = this;
    return new AnonymousObservable(function (o) {
      var s = new root.Set();
      return source.subscribe(
        function (x) { s.add(x); },
        function (e) { o.onError(e); },
        function () {
          o.onNext(s);
          o.onCompleted();
        });
    }, source);
  };

  /**
  * Converts the observable sequence to a Map if it exists.
  * @param {Function} keySelector A function which produces the key for the Map.
  * @param {Function} [elementSelector] An optional function which produces the element for the Map. If not present, defaults to the value from the observable sequence.
  * @returns {Observable} An observable sequence with a single value of a Map containing the values from the observable sequence.
  */
  observableProto.toMap = function (keySelector, elementSelector) {
    if (typeof root.Map === 'undefined') { throw new TypeError(); }
    var source = this;
    return new AnonymousObservable(function (o) {
      var m = new root.Map();
      return source.subscribe(
        function (x) {
          var key;
          try {
            key = keySelector(x);
          } catch (e) {
            o.onError(e);
            return;
          }

          var element = x;
          if (elementSelector) {
            try {
              element = elementSelector(x);
            } catch (e) {
              o.onError(e);
              return;
            }
          }

          m.set(key, element);
        },
        function (e) { o.onError(e); },
        function () {
          o.onNext(m);
          o.onCompleted();
        });
    }, source);
  };

  var fnString = 'function',
      throwString = 'throw',
      isObject = Rx.internals.isObject;

  function toThunk(obj, ctx) {
    if (Array.isArray(obj)) {  return objectToThunk.call(ctx, obj); }
    if (isGeneratorFunction(obj)) { return observableSpawn(obj.call(ctx)); }
    if (isGenerator(obj)) {  return observableSpawn(obj); }
    if (isObservable(obj)) { return observableToThunk(obj); }
    if (isPromise(obj)) { return promiseToThunk(obj); }
    if (typeof obj === fnString) { return obj; }
    if (isObject(obj) || Array.isArray(obj)) { return objectToThunk.call(ctx, obj); }

    return obj;
  }

  function objectToThunk(obj) {
    var ctx = this;

    return function (done) {
      var keys = Object.keys(obj),
          pending = keys.length,
          results = new obj.constructor(),
          finished;

      if (!pending) {
        timeoutScheduler.schedule(function () { done(null, results); });
        return;
      }

      for (var i = 0, len = keys.length; i < len; i++) {
        run(obj[keys[i]], keys[i]);
      }

      function run(fn, key) {
        if (finished) { return; }
        try {
          fn = toThunk(fn, ctx);

          if (typeof fn !== fnString) {
            results[key] = fn;
            return --pending || done(null, results);
          }

          fn.call(ctx, function(err, res) {
            if (finished) { return; }

            if (err) {
              finished = true;
              return done(err);
            }

            results[key] = res;
            --pending || done(null, results);
          });
        } catch (e) {
          finished = true;
          done(e);
        }
      }
    }
  }

  function observableToThunk(observable) {
    return function (fn) {
      var value, hasValue = false;
      observable.subscribe(
        function (v) {
          value = v;
          hasValue = true;
        },
        fn,
        function () {
          hasValue && fn(null, value);
        });
    }
  }

  function promiseToThunk(promise) {
    return function(fn) {
      promise.then(function(res) {
        fn(null, res);
      }, fn);
    }
  }

  function isObservable(obj) {
    return obj && typeof obj.subscribe === fnString;
  }

  function isGeneratorFunction(obj) {
    return obj && obj.constructor && obj.constructor.name === 'GeneratorFunction';
  }

  function isGenerator(obj) {
    return obj && typeof obj.next === fnString && typeof obj[throwString] === fnString;
  }

  /*
   * Spawns a generator function which allows for Promises, Observable sequences, Arrays, Objects, Generators and functions.
   * @param {Function} The spawning function.
   * @returns {Function} a function which has a done continuation.
   */
  var observableSpawn = Rx.spawn = function (fn) {
    var isGenFun = isGeneratorFunction(fn);

    return function (done) {
      var ctx = this,
        gen = fn;

      if (isGenFun) {
        for(var args = [], i = 0, len = arguments.length; i < len; i++) { args.push(arguments[i]); }
        var len = args.length,
          hasCallback = len && typeof args[len - 1] === fnString;

        done = hasCallback ? args.pop() : handleError;
        gen = fn.apply(this, args);
      } else {
        done = done || handleError;
      }

      next();

      function exit(err, res) {
        timeoutScheduler.schedule(done.bind(ctx, err, res));
      }

      function next(err, res) {
        var ret;

        // multiple args
        if (arguments.length > 2) {
          for(var res = [], i = 1, len = arguments.length; i < len; i++) { res.push(arguments[i]); }
        }

        if (err) {
          try {
            ret = gen[throwString](err);
          } catch (e) {
            return exit(e);
          }
        }

        if (!err) {
          try {
            ret = gen.next(res);
          } catch (e) {
            return exit(e);
          }
        }

        if (ret.done)  {
          return exit(null, ret.value);
        }

        ret.value = toThunk(ret.value, ctx);

        if (typeof ret.value === fnString) {
          var called = false;
          try {
            ret.value.call(ctx, function() {
              if (called) {
                return;
              }

              called = true;
              next.apply(ctx, arguments);
            });
          } catch (e) {
            timeoutScheduler.schedule(function () {
              if (called) {
                return;
              }

              called = true;
              next.call(ctx, e);
            });
          }
          return;
        }

        // Not supported
        next(new TypeError('Rx.spawn only supports a function, Promise, Observable, Object or Array.'));
      }
    }
  };

  function handleError(err) {
    if (!err) { return; }
    timeoutScheduler.schedule(function() {
      throw err;
    });
  }

  /**
   * Invokes the specified function asynchronously on the specified scheduler, surfacing the result through an observable sequence.
   *
   * @example
   * var res = Rx.Observable.start(function () { console.log('hello'); });
   * var res = Rx.Observable.start(function () { console.log('hello'); }, Rx.Scheduler.timeout);
   * var res = Rx.Observable.start(function () { this.log('hello'); }, Rx.Scheduler.timeout, console);
   *
   * @param {Function} func Function to run asynchronously.
   * @param {Scheduler} [scheduler]  Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
   * @param [context]  The context for the func parameter to be executed.  If not specified, defaults to undefined.
   * @returns {Observable} An observable sequence exposing the function's result value, or an exception.
   *
   * Remarks
   * * The function is called immediately, not during the subscription of the resulting sequence.
   * * Multiple subscriptions to the resulting sequence can observe the function's result.
   */
  Observable.start = function (func, context, scheduler) {
    return observableToAsync(func, context, scheduler)();
  };

  /**
   * Converts the function into an asynchronous function. Each invocation of the resulting asynchronous function causes an invocation of the original synchronous function on the specified scheduler.
   * @param {Function} function Function to convert to an asynchronous function.
   * @param {Scheduler} [scheduler] Scheduler to run the function on. If not specified, defaults to Scheduler.timeout.
   * @param {Mixed} [context] The context for the func parameter to be executed.  If not specified, defaults to undefined.
   * @returns {Function} Asynchronous function.
   */
  var observableToAsync = Observable.toAsync = function (func, context, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return function () {
      var args = arguments,
        subject = new AsyncSubject();

      scheduler.schedule(function () {
        var result;
        try {
          result = func.apply(context, args);
        } catch (e) {
          subject.onError(e);
          return;
        }
        subject.onNext(result);
        subject.onCompleted();
      });
      return subject.asObservable();
    };
  };

  /**
   * Converts a callback function to an observable sequence.
   *
   * @param {Function} function Function with a callback as the last parameter to convert to an Observable sequence.
   * @param {Mixed} [context] The context for the func parameter to be executed.  If not specified, defaults to undefined.
   * @param {Function} [selector] A selector which takes the arguments from the callback to produce a single item to yield on next.
   * @returns {Function} A function, when executed with the required parameters minus the callback, produces an Observable sequence with a single value of the arguments to the callback as an array.
   */
  Observable.fromCallback = function (func, context, selector) {
    return function () {
      var len = arguments.length, args = new Array(len)
      for(var i = 0; i < len; i++) { args[i] = arguments[i]; }

      return new AnonymousObservable(function (observer) {
        function handler() {
          var len = arguments.length, results = new Array(len);
          for(var i = 0; i < len; i++) { results[i] = arguments[i]; }

          if (selector) {
            try {
              results = selector.apply(context, results);
            } catch (e) {
              return observer.onError(e);
            }

            observer.onNext(results);
          } else {
            if (results.length <= 1) {
              observer.onNext.apply(observer, results);
            } else {
              observer.onNext(results);
            }
          }

          observer.onCompleted();
        }

        args.push(handler);
        func.apply(context, args);
      }).publishLast().refCount();
    };
  };

  /**
   * Converts a Node.js callback style function to an observable sequence.  This must be in function (err, ...) format.
   * @param {Function} func The function to call
   * @param {Mixed} [context] The context for the func parameter to be executed.  If not specified, defaults to undefined.
   * @param {Function} [selector] A selector which takes the arguments from the callback minus the error to produce a single item to yield on next.
   * @returns {Function} An async function which when applied, returns an observable sequence with the callback arguments as an array.
   */
  Observable.fromNodeCallback = function (func, context, selector) {
    return function () {
      var len = arguments.length, args = new Array(len);
      for(var i = 0; i < len; i++) { args[i] = arguments[i]; }

      return new AnonymousObservable(function (observer) {
        function handler(err) {
          if (err) {
            observer.onError(err);
            return;
          }

          var len = arguments.length, results = [];
          for(var i = 1; i < len; i++) { results[i - 1] = arguments[i]; }

          if (selector) {
            try {
              results = selector.apply(context, results);
            } catch (e) {
              return observer.onError(e);
            }
            observer.onNext(results);
          } else {
            if (results.length <= 1) {
              observer.onNext.apply(observer, results);
            } else {
              observer.onNext(results);
            }
          }

          observer.onCompleted();
        }

        args.push(handler);
        func.apply(context, args);
      }).publishLast().refCount();
    };
  };

  function createListener (element, name, handler) {
    if (element.addEventListener) {
      element.addEventListener(name, handler, false);
      return disposableCreate(function () {
        element.removeEventListener(name, handler, false);
      });
    }
    throw new Error('No listener found');
  }

  function createEventListener (el, eventName, handler) {
    var disposables = new CompositeDisposable();

    // Asume NodeList or HTMLCollection
    var toStr = Object.prototype.toString;
    if (toStr.call(el) === '[object NodeList]' || toStr.call(el) === '[object HTMLCollection]') {
      for (var i = 0, len = el.length; i < len; i++) {
        disposables.add(createEventListener(el.item(i), eventName, handler));
      }
    } else if (el) {
      disposables.add(createListener(el, eventName, handler));
    }

    return disposables;
  }

  /**
   * Configuration option to determine whether to use native events only
   */
  Rx.config.useNativeEvents = false;

  /**
   * Creates an observable sequence by adding an event listener to the matching DOMElement or each item in the NodeList.
   *
   * @example
   *   var source = Rx.Observable.fromEvent(element, 'mouseup');
   *
   * @param {Object} element The DOMElement or NodeList to attach a listener.
   * @param {String} eventName The event name to attach the observable sequence.
   * @param {Function} [selector] A selector which takes the arguments from the event handler to produce a single item to yield on next.
   * @returns {Observable} An observable sequence of events from the specified element and the specified event.
   */
  Observable.fromEvent = function (element, eventName, selector) {
    // Node.js specific
    if (element.addListener) {
      return fromEventPattern(
        function (h) { element.addListener(eventName, h); },
        function (h) { element.removeListener(eventName, h); },
        selector);
    }

    // Use only if non-native events are allowed
    if (!Rx.config.useNativeEvents) {
      // Handles jq, Angular.js, Zepto, Marionette, Ember.js
      if (typeof element.on === 'function' && typeof element.off === 'function') {
        return fromEventPattern(
          function (h) { element.on(eventName, h); },
          function (h) { element.off(eventName, h); },
          selector);
      }
    }
    return new AnonymousObservable(function (observer) {
      return createEventListener(
        element,
        eventName,
        function handler (e) {
          var results = e;

          if (selector) {
            try {
              results = selector(arguments);
            } catch (err) {
              return observer.onError(err);
            }
          }

          observer.onNext(results);
        });
    }).publish().refCount();
  };

  /**
   * Creates an observable sequence from an event emitter via an addHandler/removeHandler pair.
   * @param {Function} addHandler The function to add a handler to the emitter.
   * @param {Function} [removeHandler] The optional function to remove a handler from an emitter.
   * @param {Function} [selector] A selector which takes the arguments from the event handler to produce a single item to yield on next.
   * @returns {Observable} An observable sequence which wraps an event from an event emitter
   */
  var fromEventPattern = Observable.fromEventPattern = function (addHandler, removeHandler, selector) {
    return new AnonymousObservable(function (observer) {
      function innerHandler (e) {
        var result = e;
        if (selector) {
          try {
            result = selector(arguments);
          } catch (err) {
            return observer.onError(err);
          }
        }
        observer.onNext(result);
      }

      var returnValue = addHandler(innerHandler);
      return disposableCreate(function () {
        if (removeHandler) {
          removeHandler(innerHandler, returnValue);
        }
      });
    }).publish().refCount();
  };

  /**
   * Invokes the asynchronous function, surfacing the result through an observable sequence.
   * @param {Function} functionAsync Asynchronous function which returns a Promise to run.
   * @returns {Observable} An observable sequence exposing the function's result value, or an exception.
   */
  Observable.startAsync = function (functionAsync) {
    var promise;
    try {
      promise = functionAsync();
    } catch (e) {
      return observableThrow(e);
    }
    return observableFromPromise(promise);
  }

  var PausableObservable = (function (__super__) {

    inherits(PausableObservable, __super__);

    function subscribe(observer) {
      var conn = this.source.publish(),
        subscription = conn.subscribe(observer),
        connection = disposableEmpty;

      var pausable = this.pauser.distinctUntilChanged().subscribe(function (b) {
        if (b) {
          connection = conn.connect();
        } else {
          connection.dispose();
          connection = disposableEmpty;
        }
      });

      return new CompositeDisposable(subscription, connection, pausable);
    }

    function PausableObservable(source, pauser) {
      this.source = source;
      this.controller = new Subject();

      if (pauser && pauser.subscribe) {
        this.pauser = this.controller.merge(pauser);
      } else {
        this.pauser = this.controller;
      }

      __super__.call(this, subscribe, source);
    }

    PausableObservable.prototype.pause = function () {
      this.controller.onNext(false);
    };

    PausableObservable.prototype.resume = function () {
      this.controller.onNext(true);
    };

    return PausableObservable;

  }(Observable));

  /**
   * Pauses the underlying observable sequence based upon the observable sequence which yields true/false.
   * @example
   * var pauser = new Rx.Subject();
   * var source = Rx.Observable.interval(100).pausable(pauser);
   * @param {Observable} pauser The observable sequence used to pause the underlying sequence.
   * @returns {Observable} The observable sequence which is paused based upon the pauser.
   */
  observableProto.pausable = function (pauser) {
    return new PausableObservable(this, pauser);
  };

  function combineLatestSource(source, subject, resultSelector) {
    return new AnonymousObservable(function (o) {
      var hasValue = [false, false],
        hasValueAll = false,
        isDone = false,
        values = new Array(2),
        err;

      function next(x, i) {
        values[i] = x
        hasValue[i] = true;
        if (hasValueAll || (hasValueAll = hasValue.every(identity))) {
          if (err) { return o.onError(err); }
          var res = tryCatch(resultSelector).apply(null, values);
          if (res === errorObj) { return o.onError(res.e); }
          o.onNext(res);
        }
        isDone && values[1] && o.onCompleted();
      }

      return new CompositeDisposable(
        source.subscribe(
          function (x) {
            next(x, 0);
          },
          function (e) {
            if (values[1]) {
              o.onError(e);
            } else {
              err = e;
            }
          },
          function () {
            isDone = true;
            values[1] && o.onCompleted();
          }),
        subject.subscribe(
          function (x) {
            next(x, 1);
          },
          function (e) { o.onError(e); },
          function () {
            isDone = true;
            next(true, 1);
          })
        );
    }, source);
  }

  var PausableBufferedObservable = (function (__super__) {

    inherits(PausableBufferedObservable, __super__);

    function subscribe(o) {
      var q = [], previousShouldFire;

      function drainQueue() { while (q.length > 0) { o.onNext(q.shift()); } }

      var subscription =
        combineLatestSource(
          this.source,
          this.pauser.distinctUntilChanged().startWith(false),
          function (data, shouldFire) {
            return { data: data, shouldFire: shouldFire };
          })
          .subscribe(
            function (results) {
              if (previousShouldFire !== undefined && results.shouldFire != previousShouldFire) {
                previousShouldFire = results.shouldFire;
                // change in shouldFire
                if (results.shouldFire) { drainQueue(); }
              } else {
                previousShouldFire = results.shouldFire;
                // new data
                if (results.shouldFire) {
                  o.onNext(results.data);
                } else {
                  q.push(results.data);
                }
              }
            },
            function (err) {
              drainQueue();
              o.onError(err);
            },
            function () {
              drainQueue();
              o.onCompleted();
            }
          );
      return subscription;
    }

    function PausableBufferedObservable(source, pauser) {
      this.source = source;
      this.controller = new Subject();

      if (pauser && pauser.subscribe) {
        this.pauser = this.controller.merge(pauser);
      } else {
        this.pauser = this.controller;
      }

      __super__.call(this, subscribe, source);
    }

    PausableBufferedObservable.prototype.pause = function () {
      this.controller.onNext(false);
    };

    PausableBufferedObservable.prototype.resume = function () {
      this.controller.onNext(true);
    };

    return PausableBufferedObservable;

  }(Observable));

  /**
   * Pauses the underlying observable sequence based upon the observable sequence which yields true/false,
   * and yields the values that were buffered while paused.
   * @example
   * var pauser = new Rx.Subject();
   * var source = Rx.Observable.interval(100).pausableBuffered(pauser);
   * @param {Observable} pauser The observable sequence used to pause the underlying sequence.
   * @returns {Observable} The observable sequence which is paused based upon the pauser.
   */
  observableProto.pausableBuffered = function (subject) {
    return new PausableBufferedObservable(this, subject);
  };

  var ControlledObservable = (function (__super__) {

    inherits(ControlledObservable, __super__);

    function subscribe (observer) {
      return this.source.subscribe(observer);
    }

    function ControlledObservable (source, enableQueue, scheduler) {
      __super__.call(this, subscribe, source);
      this.subject = new ControlledSubject(enableQueue, scheduler);
      this.source = source.multicast(this.subject).refCount();
    }

    ControlledObservable.prototype.request = function (numberOfItems) {
      return this.subject.request(numberOfItems == null ? -1 : numberOfItems);
    };

    return ControlledObservable;

  }(Observable));

  var ControlledSubject = (function (__super__) {

    function subscribe (observer) {
      return this.subject.subscribe(observer);
    }

    inherits(ControlledSubject, __super__);

    function ControlledSubject(enableQueue, scheduler) {
      enableQueue == null && (enableQueue = true);

      __super__.call(this, subscribe);
      this.subject = new Subject();
      this.enableQueue = enableQueue;
      this.queue = enableQueue ? [] : null;
      this.requestedCount = 0;
      this.requestedDisposable = disposableEmpty;
      this.error = null;
      this.hasFailed = false;
      this.hasCompleted = false;
      this.scheduler = scheduler || currentThreadScheduler;
    }

    addProperties(ControlledSubject.prototype, Observer, {
      onCompleted: function () {
        this.hasCompleted = true;
        if (!this.enableQueue || this.queue.length === 0) {
          this.subject.onCompleted();
        } else {
          this.queue.push(Notification.createOnCompleted());
        }
      },
      onError: function (error) {
        this.hasFailed = true;
        this.error = error;
        if (!this.enableQueue || this.queue.length === 0) {
          this.subject.onError(error);
        } else {
          this.queue.push(Notification.createOnError(error));
        }
      },
      onNext: function (value) {
        var hasRequested = false;

        if (this.requestedCount === 0) {
          this.enableQueue && this.queue.push(Notification.createOnNext(value));
        } else {
          (this.requestedCount !== -1 && this.requestedCount-- === 0) && this.disposeCurrentRequest();
          hasRequested = true;
        }
        hasRequested && this.subject.onNext(value);
      },
      _processRequest: function (numberOfItems) {
        if (this.enableQueue) {
          while ((this.queue.length >= numberOfItems && numberOfItems > 0) ||
          (this.queue.length > 0 && this.queue[0].kind !== 'N')) {
            var first = this.queue.shift();
            first.accept(this.subject);
            if (first.kind === 'N') {
              numberOfItems--;
            } else {
              this.disposeCurrentRequest();
              this.queue = [];
            }
          }

          return { numberOfItems : numberOfItems, returnValue: this.queue.length !== 0};
        }

        return { numberOfItems: numberOfItems, returnValue: false };
      },
      request: function (number) {
        this.disposeCurrentRequest();
        var self = this;

        this.requestedDisposable = this.scheduler.scheduleWithState(number,
        function(s, i) {
          var r = self._processRequest(i), remaining = r.numberOfItems;
          if (!r.returnValue) {
            self.requestedCount = remaining;
            self.requestedDisposable = disposableCreate(function () {
              self.requestedCount = 0;
            });
          }
        });

        return this.requestedDisposable;
      },
      disposeCurrentRequest: function () {
        this.requestedDisposable.dispose();
        this.requestedDisposable = disposableEmpty;
      }
    });

    return ControlledSubject;
  }(Observable));

  /**
   * Attaches a controller to the observable sequence with the ability to queue.
   * @example
   * var source = Rx.Observable.interval(100).controlled();
   * source.request(3); // Reads 3 values
   * @param {bool} enableQueue truthy value to determine if values should be queued pending the next request
   * @param {Scheduler} scheduler determines how the requests will be scheduled
   * @returns {Observable} The observable sequence which only propagates values on request.
   */
  observableProto.controlled = function (enableQueue, scheduler) {

    if (enableQueue && isScheduler(enableQueue)) {
        scheduler = enableQueue;
        enableQueue = true;
    }

    if (enableQueue == null) {  enableQueue = true; }
    return new ControlledObservable(this, enableQueue, scheduler);
  };

  var StopAndWaitObservable = (function (__super__) {

    function subscribe (observer) {
      this.subscription = this.source.subscribe(new StopAndWaitObserver(observer, this, this.subscription));

      var self = this;
      timeoutScheduler.schedule(function () { self.source.request(1); });

      return this.subscription;
    }

    inherits(StopAndWaitObservable, __super__);

    function StopAndWaitObservable (source) {
      __super__.call(this, subscribe, source);
      this.source = source;
    }

    var StopAndWaitObserver = (function (__sub__) {

      inherits(StopAndWaitObserver, __sub__);

      function StopAndWaitObserver (observer, observable, cancel) {
        __sub__.call(this);
        this.observer = observer;
        this.observable = observable;
        this.cancel = cancel;
      }

      var stopAndWaitObserverProto = StopAndWaitObserver.prototype;

      stopAndWaitObserverProto.completed = function () {
        this.observer.onCompleted();
        this.dispose();
      };

      stopAndWaitObserverProto.error = function (error) {
        this.observer.onError(error);
        this.dispose();
      }

      stopAndWaitObserverProto.next = function (value) {
        this.observer.onNext(value);

        var self = this;
        timeoutScheduler.schedule(function () {
          self.observable.source.request(1);
        });
      };

      stopAndWaitObserverProto.dispose = function () {
        this.observer = null;
        if (this.cancel) {
          this.cancel.dispose();
          this.cancel = null;
        }
        __sub__.prototype.dispose.call(this);
      };

      return StopAndWaitObserver;
    }(AbstractObserver));

    return StopAndWaitObservable;
  }(Observable));


  /**
   * Attaches a stop and wait observable to the current observable.
   * @returns {Observable} A stop and wait observable.
   */
  ControlledObservable.prototype.stopAndWait = function () {
    return new StopAndWaitObservable(this);
  };

  var WindowedObservable = (function (__super__) {

    function subscribe (observer) {
      this.subscription = this.source.subscribe(new WindowedObserver(observer, this, this.subscription));

      var self = this;
      timeoutScheduler.schedule(function () {
        self.source.request(self.windowSize);
      });

      return this.subscription;
    }

    inherits(WindowedObservable, __super__);

    function WindowedObservable(source, windowSize) {
      __super__.call(this, subscribe, source);
      this.source = source;
      this.windowSize = windowSize;
    }

    var WindowedObserver = (function (__sub__) {

      inherits(WindowedObserver, __sub__);

      function WindowedObserver(observer, observable, cancel) {
        this.observer = observer;
        this.observable = observable;
        this.cancel = cancel;
        this.received = 0;
      }

      var windowedObserverPrototype = WindowedObserver.prototype;

      windowedObserverPrototype.completed = function () {
        this.observer.onCompleted();
        this.dispose();
      };

      windowedObserverPrototype.error = function (error) {
        this.observer.onError(error);
        this.dispose();
      };

      windowedObserverPrototype.next = function (value) {
        this.observer.onNext(value);

        this.received = ++this.received % this.observable.windowSize;
        if (this.received === 0) {
          var self = this;
          timeoutScheduler.schedule(function () {
            self.observable.source.request(self.observable.windowSize);
          });
        }
      };

      windowedObserverPrototype.dispose = function () {
        this.observer = null;
        if (this.cancel) {
          this.cancel.dispose();
          this.cancel = null;
        }
        __sub__.prototype.dispose.call(this);
      };

      return WindowedObserver;
    }(AbstractObserver));

    return WindowedObservable;
  }(Observable));

  /**
   * Creates a sliding windowed observable based upon the window size.
   * @param {Number} windowSize The number of items in the window
   * @returns {Observable} A windowed observable based upon the window size.
   */
  ControlledObservable.prototype.windowed = function (windowSize) {
    return new WindowedObservable(this, windowSize);
  };

  /**
   * Pipes the existing Observable sequence into a Node.js Stream.
   * @param {Stream} dest The destination Node.js stream.
   * @returns {Stream} The destination stream.
   */
  observableProto.pipe = function (dest) {
    var source = this.pausableBuffered();

    function onDrain() {
      source.resume();
    }

    dest.addListener('drain', onDrain);

    source.subscribe(
      function (x) {
        !dest.write(String(x)) && source.pause();
      },
      function (err) {
        dest.emit('error', err);
      },
      function () {
        // Hack check because STDIO is not closable
        !dest._isStdio && dest.end();
        dest.removeListener('drain', onDrain);
      });

    source.resume();

    return dest;
  };

  /**
   * Multicasts the source sequence notifications through an instantiated subject into all uses of the sequence within a selector function. Each
   * subscription to the resulting sequence causes a separate multicast invocation, exposing the sequence resulting from the selector function's
   * invocation. For specializations with fixed subject types, see Publish, PublishLast, and Replay.
   *
   * @example
   * 1 - res = source.multicast(observable);
   * 2 - res = source.multicast(function () { return new Subject(); }, function (x) { return x; });
   *
   * @param {Function|Subject} subjectOrSubjectSelector
   * Factory function to create an intermediate subject through which the source sequence's elements will be multicast to the selector function.
   * Or:
   * Subject to push source elements into.
   *
   * @param {Function} [selector] Optional selector function which can use the multicasted source sequence subject to the policies enforced by the created subject. Specified only if <paramref name="subjectOrSubjectSelector" is a factory function.
   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
   */
  observableProto.multicast = function (subjectOrSubjectSelector, selector) {
    var source = this;
    return typeof subjectOrSubjectSelector === 'function' ?
      new AnonymousObservable(function (observer) {
        var connectable = source.multicast(subjectOrSubjectSelector());
        return new CompositeDisposable(selector(connectable).subscribe(observer), connectable.connect());
      }, source) :
      new ConnectableObservable(source, subjectOrSubjectSelector);
  };

  /**
   * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence.
   * This operator is a specialization of Multicast using a regular Subject.
   *
   * @example
   * var resres = source.publish();
   * var res = source.publish(function (x) { return x; });
   *
   * @param {Function} [selector] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive all notifications of the source from the time of the subscription on.
   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
   */
  observableProto.publish = function (selector) {
    return selector && isFunction(selector) ?
      this.multicast(function () { return new Subject(); }, selector) :
      this.multicast(new Subject());
  };

  /**
   * Returns an observable sequence that shares a single subscription to the underlying sequence.
   * This operator is a specialization of publish which creates a subscription when the number of observers goes from zero to one, then shares that subscription with all subsequent observers until the number of observers returns to zero, at which point the subscription is disposed.
   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence.
   */
  observableProto.share = function () {
    return this.publish().refCount();
  };

  /**
   * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence containing only the last notification.
   * This operator is a specialization of Multicast using a AsyncSubject.
   *
   * @example
   * var res = source.publishLast();
   * var res = source.publishLast(function (x) { return x; });
   *
   * @param selector [Optional] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will only receive the last notification of the source.
   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
   */
  observableProto.publishLast = function (selector) {
    return selector && isFunction(selector) ?
      this.multicast(function () { return new AsyncSubject(); }, selector) :
      this.multicast(new AsyncSubject());
  };

  /**
   * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence and starts with initialValue.
   * This operator is a specialization of Multicast using a BehaviorSubject.
   *
   * @example
   * var res = source.publishValue(42);
   * var res = source.publishValue(function (x) { return x.select(function (y) { return y * y; }) }, 42);
   *
   * @param {Function} [selector] Optional selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive immediately receive the initial value, followed by all notifications of the source from the time of the subscription on.
   * @param {Mixed} initialValue Initial value received by observers upon subscription.
   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
   */
  observableProto.publishValue = function (initialValueOrSelector, initialValue) {
    return arguments.length === 2 ?
      this.multicast(function () {
        return new BehaviorSubject(initialValue);
      }, initialValueOrSelector) :
      this.multicast(new BehaviorSubject(initialValueOrSelector));
  };

  /**
   * Returns an observable sequence that shares a single subscription to the underlying sequence and starts with an initialValue.
   * This operator is a specialization of publishValue which creates a subscription when the number of observers goes from zero to one, then shares that subscription with all subsequent observers until the number of observers returns to zero, at which point the subscription is disposed.
   * @param {Mixed} initialValue Initial value received by observers upon subscription.
   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence.
   */
  observableProto.shareValue = function (initialValue) {
    return this.publishValue(initialValue).refCount();
  };

  /**
   * Returns an observable sequence that is the result of invoking the selector on a connectable observable sequence that shares a single subscription to the underlying sequence replaying notifications subject to a maximum time length for the replay buffer.
   * This operator is a specialization of Multicast using a ReplaySubject.
   *
   * @example
   * var res = source.replay(null, 3);
   * var res = source.replay(null, 3, 500);
   * var res = source.replay(null, 3, 500, scheduler);
   * var res = source.replay(function (x) { return x.take(6).repeat(); }, 3, 500, scheduler);
   *
   * @param selector [Optional] Selector function which can use the multicasted source sequence as many times as needed, without causing multiple subscriptions to the source sequence. Subscribers to the given source will receive all the notifications of the source subject to the specified replay buffer trimming policy.
   * @param bufferSize [Optional] Maximum element count of the replay buffer.
   * @param windowSize [Optional] Maximum time length of the replay buffer.
   * @param scheduler [Optional] Scheduler where connected observers within the selector function will be invoked on.
   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
   */
  observableProto.replay = function (selector, bufferSize, windowSize, scheduler) {
    return selector && isFunction(selector) ?
      this.multicast(function () { return new ReplaySubject(bufferSize, windowSize, scheduler); }, selector) :
      this.multicast(new ReplaySubject(bufferSize, windowSize, scheduler));
  };

  /**
   * Returns an observable sequence that shares a single subscription to the underlying sequence replaying notifications subject to a maximum time length for the replay buffer.
   * This operator is a specialization of replay which creates a subscription when the number of observers goes from zero to one, then shares that subscription with all subsequent observers until the number of observers returns to zero, at which point the subscription is disposed.
   *
   * @example
   * var res = source.shareReplay(3);
   * var res = source.shareReplay(3, 500);
   * var res = source.shareReplay(3, 500, scheduler);
   *

   * @param bufferSize [Optional] Maximum element count of the replay buffer.
   * @param window [Optional] Maximum time length of the replay buffer.
   * @param scheduler [Optional] Scheduler where connected observers within the selector function will be invoked on.
   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence.
   */
  observableProto.shareReplay = function (bufferSize, windowSize, scheduler) {
    return this.replay(null, bufferSize, windowSize, scheduler).refCount();
  };

  var InnerSubscription = function (subject, observer) {
    this.subject = subject;
    this.observer = observer;
  };

  InnerSubscription.prototype.dispose = function () {
    if (!this.subject.isDisposed && this.observer !== null) {
      var idx = this.subject.observers.indexOf(this.observer);
      this.subject.observers.splice(idx, 1);
      this.observer = null;
    }
  };

  /**
   *  Represents a value that changes over time.
   *  Observers can subscribe to the subject to receive the last (or initial) value and all subsequent notifications.
   */
  var BehaviorSubject = Rx.BehaviorSubject = (function (__super__) {
    function subscribe(observer) {
      checkDisposed(this);
      if (!this.isStopped) {
        this.observers.push(observer);
        observer.onNext(this.value);
        return new InnerSubscription(this, observer);
      }
      if (this.hasError) {
        observer.onError(this.error);
      } else {
        observer.onCompleted();
      }
      return disposableEmpty;
    }

    inherits(BehaviorSubject, __super__);

    /**
     *  Initializes a new instance of the BehaviorSubject class which creates a subject that caches its last value and starts with the specified value.
     *  @param {Mixed} value Initial value sent to observers when no other value has been received by the subject yet.
     */
    function BehaviorSubject(value) {
      __super__.call(this, subscribe);
      this.value = value,
      this.observers = [],
      this.isDisposed = false,
      this.isStopped = false,
      this.hasError = false;
    }

    addProperties(BehaviorSubject.prototype, Observer, {
      /**
       * Gets the current value or throws an exception.
       * Value is frozen after onCompleted is called.
       * After onError is called always throws the specified exception.
       * An exception is always thrown after dispose is called.
       * @returns {Mixed} The initial value passed to the constructor until onNext is called; after which, the last value passed to onNext.
       */
      getValue: function () {
          checkDisposed(this);
          if (this.hasError) {
              throw this.error;
          }
          return this.value;
      },
      /**
       * Indicates whether the subject has observers subscribed to it.
       * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
       */
      hasObservers: function () { return this.observers.length > 0; },
      /**
       * Notifies all subscribed observers about the end of the sequence.
       */
      onCompleted: function () {
        checkDisposed(this);
        if (this.isStopped) { return; }
        this.isStopped = true;
        for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
          os[i].onCompleted();
        }

        this.observers.length = 0;
      },
      /**
       * Notifies all subscribed observers about the exception.
       * @param {Mixed} error The exception to send to all observers.
       */
      onError: function (error) {
        checkDisposed(this);
        if (this.isStopped) { return; }
        this.isStopped = true;
        this.hasError = true;
        this.error = error;

        for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
          os[i].onError(error);
        }

        this.observers.length = 0;
      },
      /**
       * Notifies all subscribed observers about the arrival of the specified element in the sequence.
       * @param {Mixed} value The value to send to all observers.
       */
      onNext: function (value) {
        checkDisposed(this);
        if (this.isStopped) { return; }
        this.value = value;
        for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
          os[i].onNext(value);
        }
      },
      /**
       * Unsubscribe all observers and release resources.
       */
      dispose: function () {
        this.isDisposed = true;
        this.observers = null;
        this.value = null;
        this.exception = null;
      }
    });

    return BehaviorSubject;
  }(Observable));

  /**
   * Represents an object that is both an observable sequence as well as an observer.
   * Each notification is broadcasted to all subscribed and future observers, subject to buffer trimming policies.
   */
  var ReplaySubject = Rx.ReplaySubject = (function (__super__) {

    var maxSafeInteger = Math.pow(2, 53) - 1;

    function createRemovableDisposable(subject, observer) {
      return disposableCreate(function () {
        observer.dispose();
        !subject.isDisposed && subject.observers.splice(subject.observers.indexOf(observer), 1);
      });
    }

    function subscribe(observer) {
      var so = new ScheduledObserver(this.scheduler, observer),
        subscription = createRemovableDisposable(this, so);
      checkDisposed(this);
      this._trim(this.scheduler.now());
      this.observers.push(so);

      for (var i = 0, len = this.q.length; i < len; i++) {
        so.onNext(this.q[i].value);
      }

      if (this.hasError) {
        so.onError(this.error);
      } else if (this.isStopped) {
        so.onCompleted();
      }

      so.ensureActive();
      return subscription;
    }

    inherits(ReplaySubject, __super__);

    /**
     *  Initializes a new instance of the ReplaySubject class with the specified buffer size, window size and scheduler.
     *  @param {Number} [bufferSize] Maximum element count of the replay buffer.
     *  @param {Number} [windowSize] Maximum time length of the replay buffer.
     *  @param {Scheduler} [scheduler] Scheduler the observers are invoked on.
     */
    function ReplaySubject(bufferSize, windowSize, scheduler) {
      this.bufferSize = bufferSize == null ? maxSafeInteger : bufferSize;
      this.windowSize = windowSize == null ? maxSafeInteger : windowSize;
      this.scheduler = scheduler || currentThreadScheduler;
      this.q = [];
      this.observers = [];
      this.isStopped = false;
      this.isDisposed = false;
      this.hasError = false;
      this.error = null;
      __super__.call(this, subscribe);
    }

    addProperties(ReplaySubject.prototype, Observer.prototype, {
      /**
       * Indicates whether the subject has observers subscribed to it.
       * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
       */
      hasObservers: function () {
        return this.observers.length > 0;
      },
      _trim: function (now) {
        while (this.q.length > this.bufferSize) {
          this.q.shift();
        }
        while (this.q.length > 0 && (now - this.q[0].interval) > this.windowSize) {
          this.q.shift();
        }
      },
      /**
       * Notifies all subscribed observers about the arrival of the specified element in the sequence.
       * @param {Mixed} value The value to send to all observers.
       */
      onNext: function (value) {
        checkDisposed(this);
        if (this.isStopped) { return; }
        var now = this.scheduler.now();
        this.q.push({ interval: now, value: value });
        this._trim(now);

        for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
          var observer = os[i];
          observer.onNext(value);
          observer.ensureActive();
        }
      },
      /**
       * Notifies all subscribed observers about the exception.
       * @param {Mixed} error The exception to send to all observers.
       */
      onError: function (error) {
        checkDisposed(this);
        if (this.isStopped) { return; }
        this.isStopped = true;
        this.error = error;
        this.hasError = true;
        var now = this.scheduler.now();
        this._trim(now);
        for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
          var observer = os[i];
          observer.onError(error);
          observer.ensureActive();
        }
        this.observers.length = 0;
      },
      /**
       * Notifies all subscribed observers about the end of the sequence.
       */
      onCompleted: function () {
        checkDisposed(this);
        if (this.isStopped) { return; }
        this.isStopped = true;
        var now = this.scheduler.now();
        this._trim(now);
        for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
          var observer = os[i];
          observer.onCompleted();
          observer.ensureActive();
        }
        this.observers.length = 0;
      },
      /**
       * Unsubscribe all observers and release resources.
       */
      dispose: function () {
        this.isDisposed = true;
        this.observers = null;
      }
    });

    return ReplaySubject;
  }(Observable));

  var ConnectableObservable = Rx.ConnectableObservable = (function (__super__) {
    inherits(ConnectableObservable, __super__);

    function ConnectableObservable(source, subject) {
      var hasSubscription = false,
        subscription,
        sourceObservable = source.asObservable();

      this.connect = function () {
        if (!hasSubscription) {
          hasSubscription = true;
          subscription = new CompositeDisposable(sourceObservable.subscribe(subject), disposableCreate(function () {
            hasSubscription = false;
          }));
        }
        return subscription;
      };

      __super__.call(this, function (o) { return subject.subscribe(o); });
    }

    ConnectableObservable.prototype.refCount = function () {
      var connectableSubscription, count = 0, source = this;
      return new AnonymousObservable(function (observer) {
          var shouldConnect = ++count === 1,
            subscription = source.subscribe(observer);
          shouldConnect && (connectableSubscription = source.connect());
          return function () {
            subscription.dispose();
            --count === 0 && connectableSubscription.dispose();
          };
      });
    };

    return ConnectableObservable;
  }(Observable));

  /**
   * Returns an observable sequence that shares a single subscription to the underlying sequence. This observable sequence
   * can be resubscribed to, even if all prior subscriptions have ended. (unlike `.publish().refCount()`)
   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source.
   */
  observableProto.singleInstance = function() {
    var source = this, hasObservable = false, observable;

    function getObservable() {
      if (!hasObservable) {
        hasObservable = true;
        observable = source.finally(function() { hasObservable = false; }).publish().refCount();
      }
      return observable;
    };

    return new AnonymousObservable(function(o) {
      return getObservable().subscribe(o);
    });
  };

  var Dictionary = (function () {

    var primes = [1, 3, 7, 13, 31, 61, 127, 251, 509, 1021, 2039, 4093, 8191, 16381, 32749, 65521, 131071, 262139, 524287, 1048573, 2097143, 4194301, 8388593, 16777213, 33554393, 67108859, 134217689, 268435399, 536870909, 1073741789, 2147483647],
      noSuchkey = "no such key",
      duplicatekey = "duplicate key";

    function isPrime(candidate) {
      if ((candidate & 1) === 0) { return candidate === 2; }
      var num1 = Math.sqrt(candidate),
        num2 = 3;
      while (num2 <= num1) {
        if (candidate % num2 === 0) { return false; }
        num2 += 2;
      }
      return true;
    }

    function getPrime(min) {
      var index, num, candidate;
      for (index = 0; index < primes.length; ++index) {
        num = primes[index];
        if (num >= min) { return num; }
      }
      candidate = min | 1;
      while (candidate < primes[primes.length - 1]) {
        if (isPrime(candidate)) { return candidate; }
        candidate += 2;
      }
      return min;
    }

    function stringHashFn(str) {
      var hash = 757602046;
      if (!str.length) { return hash; }
      for (var i = 0, len = str.length; i < len; i++) {
        var character = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + character;
        hash = hash & hash;
      }
      return hash;
    }

    function numberHashFn(key) {
      var c2 = 0x27d4eb2d;
      key = (key ^ 61) ^ (key >>> 16);
      key = key + (key << 3);
      key = key ^ (key >>> 4);
      key = key * c2;
      key = key ^ (key >>> 15);
      return key;
    }

    var getHashCode = (function () {
      var uniqueIdCounter = 0;

      return function (obj) {
        if (obj == null) { throw new Error(noSuchkey); }

        // Check for built-ins before tacking on our own for any object
        if (typeof obj === 'string') { return stringHashFn(obj); }
        if (typeof obj === 'number') { return numberHashFn(obj); }
        if (typeof obj === 'boolean') { return obj === true ? 1 : 0; }
        if (obj instanceof Date) { return numberHashFn(obj.valueOf()); }
        if (obj instanceof RegExp) { return stringHashFn(obj.toString()); }
        if (typeof obj.valueOf === 'function') {
          // Hack check for valueOf
          var valueOf = obj.valueOf();
          if (typeof valueOf === 'number') { return numberHashFn(valueOf); }
          if (typeof valueOf === 'string') { return stringHashFn(valueOf); }
        }
        if (obj.hashCode) { return obj.hashCode(); }

        var id = 17 * uniqueIdCounter++;
        obj.hashCode = function () { return id; };
        return id;
      };
    }());

    function newEntry() {
      return { key: null, value: null, next: 0, hashCode: 0 };
    }

    function Dictionary(capacity, comparer) {
      if (capacity < 0) { throw new ArgumentOutOfRangeError(); }
      if (capacity > 0) { this._initialize(capacity); }

      this.comparer = comparer || defaultComparer;
      this.freeCount = 0;
      this.size = 0;
      this.freeList = -1;
    }

    var dictionaryProto = Dictionary.prototype;

    dictionaryProto._initialize = function (capacity) {
      var prime = getPrime(capacity), i;
      this.buckets = new Array(prime);
      this.entries = new Array(prime);
      for (i = 0; i < prime; i++) {
        this.buckets[i] = -1;
        this.entries[i] = newEntry();
      }
      this.freeList = -1;
    };

    dictionaryProto.add = function (key, value) {
      this._insert(key, value, true);
    };

    dictionaryProto._insert = function (key, value, add) {
      if (!this.buckets) { this._initialize(0); }
      var index3,
        num = getHashCode(key) & 2147483647,
        index1 = num % this.buckets.length;
      for (var index2 = this.buckets[index1]; index2 >= 0; index2 = this.entries[index2].next) {
        if (this.entries[index2].hashCode === num && this.comparer(this.entries[index2].key, key)) {
          if (add) { throw new Error(duplicatekey); }
          this.entries[index2].value = value;
          return;
        }
      }
      if (this.freeCount > 0) {
        index3 = this.freeList;
        this.freeList = this.entries[index3].next;
        --this.freeCount;
      } else {
        if (this.size === this.entries.length) {
          this._resize();
          index1 = num % this.buckets.length;
        }
        index3 = this.size;
        ++this.size;
      }
      this.entries[index3].hashCode = num;
      this.entries[index3].next = this.buckets[index1];
      this.entries[index3].key = key;
      this.entries[index3].value = value;
      this.buckets[index1] = index3;
    };

    dictionaryProto._resize = function () {
      var prime = getPrime(this.size * 2),
        numArray = new Array(prime);
      for (index = 0; index < numArray.length; ++index) {  numArray[index] = -1; }
      var entryArray = new Array(prime);
      for (index = 0; index < this.size; ++index) { entryArray[index] = this.entries[index]; }
      for (var index = this.size; index < prime; ++index) { entryArray[index] = newEntry(); }
      for (var index1 = 0; index1 < this.size; ++index1) {
        var index2 = entryArray[index1].hashCode % prime;
        entryArray[index1].next = numArray[index2];
        numArray[index2] = index1;
      }
      this.buckets = numArray;
      this.entries = entryArray;
    };

    dictionaryProto.remove = function (key) {
      if (this.buckets) {
        var num = getHashCode(key) & 2147483647,
          index1 = num % this.buckets.length,
          index2 = -1;
        for (var index3 = this.buckets[index1]; index3 >= 0; index3 = this.entries[index3].next) {
          if (this.entries[index3].hashCode === num && this.comparer(this.entries[index3].key, key)) {
            if (index2 < 0) {
              this.buckets[index1] = this.entries[index3].next;
            } else {
              this.entries[index2].next = this.entries[index3].next;
            }
            this.entries[index3].hashCode = -1;
            this.entries[index3].next = this.freeList;
            this.entries[index3].key = null;
            this.entries[index3].value = null;
            this.freeList = index3;
            ++this.freeCount;
            return true;
          } else {
            index2 = index3;
          }
        }
      }
      return false;
    };

    dictionaryProto.clear = function () {
      var index, len;
      if (this.size <= 0) { return; }
      for (index = 0, len = this.buckets.length; index < len; ++index) {
        this.buckets[index] = -1;
      }
      for (index = 0; index < this.size; ++index) {
        this.entries[index] = newEntry();
      }
      this.freeList = -1;
      this.size = 0;
    };

    dictionaryProto._findEntry = function (key) {
      if (this.buckets) {
        var num = getHashCode(key) & 2147483647;
        for (var index = this.buckets[num % this.buckets.length]; index >= 0; index = this.entries[index].next) {
          if (this.entries[index].hashCode === num && this.comparer(this.entries[index].key, key)) {
            return index;
          }
        }
      }
      return -1;
    };

    dictionaryProto.count = function () {
      return this.size - this.freeCount;
    };

    dictionaryProto.tryGetValue = function (key) {
      var entry = this._findEntry(key);
      return entry >= 0 ?
        this.entries[entry].value :
        undefined;
    };

    dictionaryProto.getValues = function () {
      var index = 0, results = [];
      if (this.entries) {
        for (var index1 = 0; index1 < this.size; index1++) {
          if (this.entries[index1].hashCode >= 0) {
            results[index++] = this.entries[index1].value;
          }
        }
      }
      return results;
    };

    dictionaryProto.get = function (key) {
      var entry = this._findEntry(key);
      if (entry >= 0) { return this.entries[entry].value; }
      throw new Error(noSuchkey);
    };

    dictionaryProto.set = function (key, value) {
      this._insert(key, value, false);
    };

    dictionaryProto.containskey = function (key) {
      return this._findEntry(key) >= 0;
    };

    return Dictionary;
  }());

  /**
   *  Correlates the elements of two sequences based on overlapping durations.
   *
   *  @param {Observable} right The right observable sequence to join elements for.
   *  @param {Function} leftDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the left observable sequence, used to determine overlap.
   *  @param {Function} rightDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the right observable sequence, used to determine overlap.
   *  @param {Function} resultSelector A function invoked to compute a result element for any two overlapping elements of the left and right observable sequences. The parameters passed to the function correspond with the elements from the left and right source sequences for which overlap occurs.
   *  @returns {Observable} An observable sequence that contains result elements computed from source elements that have an overlapping duration.
   */
  observableProto.join = function (right, leftDurationSelector, rightDurationSelector, resultSelector) {
    var left = this;
    return new AnonymousObservable(function (observer) {
      var group = new CompositeDisposable();
      var leftDone = false, rightDone = false;
      var leftId = 0, rightId = 0;
      var leftMap = new Dictionary(), rightMap = new Dictionary();

      group.add(left.subscribe(
        function (value) {
          var id = leftId++;
          var md = new SingleAssignmentDisposable();

          leftMap.add(id, value);
          group.add(md);

          var expire = function () {
            leftMap.remove(id) && leftMap.count() === 0 && leftDone && observer.onCompleted();
            group.remove(md);
          };

          var duration;
          try {
            duration = leftDurationSelector(value);
          } catch (e) {
            observer.onError(e);
            return;
          }

          md.setDisposable(duration.take(1).subscribe(noop, observer.onError.bind(observer), expire));

          rightMap.getValues().forEach(function (v) {
            var result;
            try {
              result = resultSelector(value, v);
            } catch (exn) {
              observer.onError(exn);
              return;
            }

            observer.onNext(result);
          });
        },
        observer.onError.bind(observer),
        function () {
          leftDone = true;
          (rightDone || leftMap.count() === 0) && observer.onCompleted();
        })
      );

      group.add(right.subscribe(
        function (value) {
          var id = rightId++;
          var md = new SingleAssignmentDisposable();

          rightMap.add(id, value);
          group.add(md);

          var expire = function () {
            rightMap.remove(id) && rightMap.count() === 0 && rightDone && observer.onCompleted();
            group.remove(md);
          };

          var duration;
          try {
            duration = rightDurationSelector(value);
          } catch (e) {
            observer.onError(e);
            return;
          }

          md.setDisposable(duration.take(1).subscribe(noop, observer.onError.bind(observer), expire));

          leftMap.getValues().forEach(function (v) {
            var result;
            try {
              result = resultSelector(v, value);
            } catch (exn) {
              observer.onError(exn);
              return;
            }

            observer.onNext(result);
          });
        },
        observer.onError.bind(observer),
        function () {
          rightDone = true;
          (leftDone || rightMap.count() === 0) && observer.onCompleted();
        })
      );
      return group;
    }, left);
  };

  /**
   *  Correlates the elements of two sequences based on overlapping durations, and groups the results.
   *
   *  @param {Observable} right The right observable sequence to join elements for.
   *  @param {Function} leftDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the left observable sequence, used to determine overlap.
   *  @param {Function} rightDurationSelector A function to select the duration (expressed as an observable sequence) of each element of the right observable sequence, used to determine overlap.
   *  @param {Function} resultSelector A function invoked to compute a result element for any element of the left sequence with overlapping elements from the right observable sequence. The first parameter passed to the function is an element of the left sequence. The second parameter passed to the function is an observable sequence with elements from the right sequence that overlap with the left sequence's element.
   *  @returns {Observable} An observable sequence that contains result elements computed from source elements that have an overlapping duration.
   */
  observableProto.groupJoin = function (right, leftDurationSelector, rightDurationSelector, resultSelector) {
    var left = this;
    return new AnonymousObservable(function (observer) {
      var group = new CompositeDisposable();
      var r = new RefCountDisposable(group);
      var leftMap = new Dictionary(), rightMap = new Dictionary();
      var leftId = 0, rightId = 0;

      function handleError(e) { return function (v) { v.onError(e); }; };

      group.add(left.subscribe(
        function (value) {
          var s = new Subject();
          var id = leftId++;
          leftMap.add(id, s);

          var result;
          try {
            result = resultSelector(value, addRef(s, r));
          } catch (e) {
            leftMap.getValues().forEach(handleError(e));
            observer.onError(e);
            return;
          }
          observer.onNext(result);

          rightMap.getValues().forEach(function (v) { s.onNext(v); });

          var md = new SingleAssignmentDisposable();
          group.add(md);

          var expire = function () {
            leftMap.remove(id) && s.onCompleted();
            group.remove(md);
          };

          var duration;
          try {
            duration = leftDurationSelector(value);
          } catch (e) {
            leftMap.getValues().forEach(handleError(e));
            observer.onError(e);
            return;
          }

          md.setDisposable(duration.take(1).subscribe(
            noop,
            function (e) {
              leftMap.getValues().forEach(handleError(e));
              observer.onError(e);
            },
            expire)
          );
        },
        function (e) {
          leftMap.getValues().forEach(handleError(e));
          observer.onError(e);
        },
        observer.onCompleted.bind(observer))
      );

      group.add(right.subscribe(
        function (value) {
          var id = rightId++;
          rightMap.add(id, value);

          var md = new SingleAssignmentDisposable();
          group.add(md);

          var expire = function () {
            rightMap.remove(id);
            group.remove(md);
          };

          var duration;
          try {
            duration = rightDurationSelector(value);
          } catch (e) {
            leftMap.getValues().forEach(handleError(e));
            observer.onError(e);
            return;
          }
          md.setDisposable(duration.take(1).subscribe(
            noop,
            function (e) {
              leftMap.getValues().forEach(handleError(e));
              observer.onError(e);
            },
            expire)
          );

          leftMap.getValues().forEach(function (v) { v.onNext(value); });
        },
        function (e) {
          leftMap.getValues().forEach(handleError(e));
          observer.onError(e);
        })
      );

      return r;
    }, left);
  };

    /**
     *  Projects each element of an observable sequence into zero or more buffers.
     *
     *  @param {Mixed} bufferOpeningsOrClosingSelector Observable sequence whose elements denote the creation of new windows, or, a function invoked to define the boundaries of the produced windows (a new window is started when the previous one is closed, resulting in non-overlapping windows).
     *  @param {Function} [bufferClosingSelector] A function invoked to define the closing of each produced window. If a closing selector function is specified for the first parameter, this parameter is ignored.
     *  @returns {Observable} An observable sequence of windows.
     */
    observableProto.buffer = function (bufferOpeningsOrClosingSelector, bufferClosingSelector) {
        return this.window.apply(this, arguments).selectMany(function (x) { return x.toArray(); });
    };

  /**
   *  Projects each element of an observable sequence into zero or more windows.
   *
   *  @param {Mixed} windowOpeningsOrClosingSelector Observable sequence whose elements denote the creation of new windows, or, a function invoked to define the boundaries of the produced windows (a new window is started when the previous one is closed, resulting in non-overlapping windows).
   *  @param {Function} [windowClosingSelector] A function invoked to define the closing of each produced window. If a closing selector function is specified for the first parameter, this parameter is ignored.
   *  @returns {Observable} An observable sequence of windows.
   */
  observableProto.window = function (windowOpeningsOrClosingSelector, windowClosingSelector) {
    if (arguments.length === 1 && typeof arguments[0] !== 'function') {
      return observableWindowWithBoundaries.call(this, windowOpeningsOrClosingSelector);
    }
    return typeof windowOpeningsOrClosingSelector === 'function' ?
      observableWindowWithClosingSelector.call(this, windowOpeningsOrClosingSelector) :
      observableWindowWithOpenings.call(this, windowOpeningsOrClosingSelector, windowClosingSelector);
  };

  function observableWindowWithOpenings(windowOpenings, windowClosingSelector) {
    return windowOpenings.groupJoin(this, windowClosingSelector, observableEmpty, function (_, win) {
      return win;
    });
  }

  function observableWindowWithBoundaries(windowBoundaries) {
    var source = this;
    return new AnonymousObservable(function (observer) {
      var win = new Subject(),
        d = new CompositeDisposable(),
        r = new RefCountDisposable(d);

      observer.onNext(addRef(win, r));

      d.add(source.subscribe(function (x) {
        win.onNext(x);
      }, function (err) {
        win.onError(err);
        observer.onError(err);
      }, function () {
        win.onCompleted();
        observer.onCompleted();
      }));

      isPromise(windowBoundaries) && (windowBoundaries = observableFromPromise(windowBoundaries));

      d.add(windowBoundaries.subscribe(function (w) {
        win.onCompleted();
        win = new Subject();
        observer.onNext(addRef(win, r));
      }, function (err) {
        win.onError(err);
        observer.onError(err);
      }, function () {
        win.onCompleted();
        observer.onCompleted();
      }));

      return r;
    }, source);
  }

  function observableWindowWithClosingSelector(windowClosingSelector) {
    var source = this;
    return new AnonymousObservable(function (observer) {
      var m = new SerialDisposable(),
        d = new CompositeDisposable(m),
        r = new RefCountDisposable(d),
        win = new Subject();
      observer.onNext(addRef(win, r));
      d.add(source.subscribe(function (x) {
          win.onNext(x);
      }, function (err) {
          win.onError(err);
          observer.onError(err);
      }, function () {
          win.onCompleted();
          observer.onCompleted();
      }));

      function createWindowClose () {
        var windowClose;
        try {
          windowClose = windowClosingSelector();
        } catch (e) {
          observer.onError(e);
          return;
        }

        isPromise(windowClose) && (windowClose = observableFromPromise(windowClose));

        var m1 = new SingleAssignmentDisposable();
        m.setDisposable(m1);
        m1.setDisposable(windowClose.take(1).subscribe(noop, function (err) {
          win.onError(err);
          observer.onError(err);
        }, function () {
          win.onCompleted();
          win = new Subject();
          observer.onNext(addRef(win, r));
          createWindowClose();
        }));
      }

      createWindowClose();
      return r;
    }, source);
  }

  /**
   * Returns a new observable that triggers on the second and subsequent triggerings of the input observable.
   * The Nth triggering of the input observable passes the arguments from the N-1th and Nth triggering as a pair.
   * The argument passed to the N-1th triggering is held in hidden internal state until the Nth triggering occurs.
   * @returns {Observable} An observable that triggers on successive pairs of observations from the input observable as an array.
   */
  observableProto.pairwise = function () {
    var source = this;
    return new AnonymousObservable(function (observer) {
      var previous, hasPrevious = false;
      return source.subscribe(
        function (x) {
          if (hasPrevious) {
            observer.onNext([previous, x]);
          } else {
            hasPrevious = true;
          }
          previous = x;
        },
        observer.onError.bind(observer),
        observer.onCompleted.bind(observer));
    }, source);
  };

  /**
   * Returns two observables which partition the observations of the source by the given function.
   * The first will trigger observations for those values for which the predicate returns true.
   * The second will trigger observations for those values where the predicate returns false.
   * The predicate is executed once for each subscribed observer.
   * Both also propagate all error observations arising from the source and each completes
   * when the source completes.
   * @param {Function} predicate
   *    The function to determine which output Observable will trigger a particular observation.
   * @returns {Array}
   *    An array of observables. The first triggers when the predicate returns true,
   *    and the second triggers when the predicate returns false.
  */
  observableProto.partition = function(predicate, thisArg) {
    return [
      this.filter(predicate, thisArg),
      this.filter(function (x, i, o) { return !predicate.call(thisArg, x, i, o); })
    ];
  };

  var WhileEnumerable = (function(__super__) {
    inherits(WhileEnumerable, __super__);
    function WhileEnumerable(c, s) {
      this.c = c;
      this.s = s;
    }
    WhileEnumerable.prototype[$iterator$] = function () {
      var self = this;
      return {
        next: function () {
          return self.c() ?
           { done: false, value: self.s } :
           { done: true, value: void 0 };
        }
      };
    };
    return WhileEnumerable;
  }(Enumerable));
  
  function enumerableWhile(condition, source) {
    return new WhileEnumerable(condition, source);
  }  

   /**
   *  Returns an observable sequence that is the result of invoking the selector on the source sequence, without sharing subscriptions.
   *  This operator allows for a fluent style of writing queries that use the same sequence multiple times.
   *
   * @param {Function} selector Selector function which can use the source sequence as many times as needed, without sharing subscriptions to the source sequence.
   * @returns {Observable} An observable sequence that contains the elements of a sequence produced by multicasting the source sequence within a selector function.
   */
  observableProto.letBind = observableProto['let'] = function (func) {
    return func(this);
  };

   /**
   *  Determines whether an observable collection contains values. There is an alias for this method called 'ifThen' for browsers <IE9
   *
   * @example
   *  1 - res = Rx.Observable.if(condition, obs1);
   *  2 - res = Rx.Observable.if(condition, obs1, obs2);
   *  3 - res = Rx.Observable.if(condition, obs1, scheduler);
   * @param {Function} condition The condition which determines if the thenSource or elseSource will be run.
   * @param {Observable} thenSource The observable sequence or Promise that will be run if the condition function returns true.
   * @param {Observable} [elseSource] The observable sequence or Promise that will be run if the condition function returns false. If this is not provided, it defaults to Rx.Observabe.Empty with the specified scheduler.
   * @returns {Observable} An observable sequence which is either the thenSource or elseSource.
   */
  Observable['if'] = Observable.ifThen = function (condition, thenSource, elseSourceOrScheduler) {
    return observableDefer(function () {
      elseSourceOrScheduler || (elseSourceOrScheduler = observableEmpty());

      isPromise(thenSource) && (thenSource = observableFromPromise(thenSource));
      isPromise(elseSourceOrScheduler) && (elseSourceOrScheduler = observableFromPromise(elseSourceOrScheduler));

      // Assume a scheduler for empty only
      typeof elseSourceOrScheduler.now === 'function' && (elseSourceOrScheduler = observableEmpty(elseSourceOrScheduler));
      return condition() ? thenSource : elseSourceOrScheduler;
    });
  };

   /**
   *  Concatenates the observable sequences obtained by running the specified result selector for each element in source.
   * There is an alias for this method called 'forIn' for browsers <IE9
   * @param {Array} sources An array of values to turn into an observable sequence.
   * @param {Function} resultSelector A function to apply to each item in the sources array to turn it into an observable sequence.
   * @returns {Observable} An observable sequence from the concatenated observable sequences.
   */
  Observable['for'] = Observable.forIn = function (sources, resultSelector, thisArg) {
    return enumerableOf(sources, resultSelector, thisArg).concat();
  };

   /**
   *  Repeats source as long as condition holds emulating a while loop.
   * There is an alias for this method called 'whileDo' for browsers <IE9
   *
   * @param {Function} condition The condition which determines if the source will be repeated.
   * @param {Observable} source The observable sequence that will be run if the condition function returns true.
   * @returns {Observable} An observable sequence which is repeated as long as the condition holds.
   */
  var observableWhileDo = Observable['while'] = Observable.whileDo = function (condition, source) {
    isPromise(source) && (source = observableFromPromise(source));
    return enumerableWhile(condition, source).concat();
  };

   /**
   *  Repeats source as long as condition holds emulating a do while loop.
   *
   * @param {Function} condition The condition which determines if the source will be repeated.
   * @param {Observable} source The observable sequence that will be run if the condition function returns true.
   * @returns {Observable} An observable sequence which is repeated as long as the condition holds.
   */
  observableProto.doWhile = function (condition) {
    return observableConcat([this, observableWhileDo(condition, this)]);
  };

   /**
   *  Uses selector to determine which source in sources to use.
   *  There is an alias 'switchCase' for browsers <IE9.
   *
   * @example
   *  1 - res = Rx.Observable.case(selector, { '1': obs1, '2': obs2 });
   *  1 - res = Rx.Observable.case(selector, { '1': obs1, '2': obs2 }, obs0);
   *  1 - res = Rx.Observable.case(selector, { '1': obs1, '2': obs2 }, scheduler);
   *
   * @param {Function} selector The function which extracts the value for to test in a case statement.
   * @param {Array} sources A object which has keys which correspond to the case statement labels.
   * @param {Observable} [elseSource] The observable sequence or Promise that will be run if the sources are not matched. If this is not provided, it defaults to Rx.Observabe.empty with the specified scheduler.
   *
   * @returns {Observable} An observable sequence which is determined by a case statement.
   */
  Observable['case'] = Observable.switchCase = function (selector, sources, defaultSourceOrScheduler) {
    return observableDefer(function () {
      isPromise(defaultSourceOrScheduler) && (defaultSourceOrScheduler = observableFromPromise(defaultSourceOrScheduler));
      defaultSourceOrScheduler || (defaultSourceOrScheduler = observableEmpty());

      typeof defaultSourceOrScheduler.now === 'function' && (defaultSourceOrScheduler = observableEmpty(defaultSourceOrScheduler));

      var result = sources[selector()];
      isPromise(result) && (result = observableFromPromise(result));

      return result || defaultSourceOrScheduler;
    });
  };

   /**
   *  Expands an observable sequence by recursively invoking selector.
   *
   * @param {Function} selector Selector function to invoke for each produced element, resulting in another sequence to which the selector will be invoked recursively again.
   * @param {Scheduler} [scheduler] Scheduler on which to perform the expansion. If not provided, this defaults to the current thread scheduler.
   * @returns {Observable} An observable sequence containing all the elements produced by the recursive expansion.
   */
  observableProto.expand = function (selector, scheduler) {
    isScheduler(scheduler) || (scheduler = immediateScheduler);
    var source = this;
    return new AnonymousObservable(function (observer) {
      var q = [],
        m = new SerialDisposable(),
        d = new CompositeDisposable(m),
        activeCount = 0,
        isAcquired = false;

      var ensureActive = function () {
        var isOwner = false;
        if (q.length > 0) {
          isOwner = !isAcquired;
          isAcquired = true;
        }
        if (isOwner) {
          m.setDisposable(scheduler.scheduleRecursive(function (self) {
            var work;
            if (q.length > 0) {
              work = q.shift();
            } else {
              isAcquired = false;
              return;
            }
            var m1 = new SingleAssignmentDisposable();
            d.add(m1);
            m1.setDisposable(work.subscribe(function (x) {
              observer.onNext(x);
              var result = null;
              try {
                result = selector(x);
              } catch (e) {
                observer.onError(e);
              }
              q.push(result);
              activeCount++;
              ensureActive();
            }, observer.onError.bind(observer), function () {
              d.remove(m1);
              activeCount--;
              if (activeCount === 0) {
                observer.onCompleted();
              }
            }));
            self();
          }));
        }
      };

      q.push(source);
      activeCount++;
      ensureActive();
      return d;
    }, this);
  };

   /**
   *  Runs all observable sequences in parallel and collect their last elements.
   *
   * @example
   *  1 - res = Rx.Observable.forkJoin([obs1, obs2]);
   *  1 - res = Rx.Observable.forkJoin(obs1, obs2, ...);
   * @returns {Observable} An observable sequence with an array collecting the last elements of all the input sequences.
   */
  Observable.forkJoin = function () {
    var allSources = [];
    if (Array.isArray(arguments[0])) {
      allSources = arguments[0];
    } else {
      for(var i = 0, len = arguments.length; i < len; i++) { allSources.push(arguments[i]); }
    }
    return new AnonymousObservable(function (subscriber) {
      var count = allSources.length;
      if (count === 0) {
        subscriber.onCompleted();
        return disposableEmpty;
      }
      var group = new CompositeDisposable(),
        finished = false,
        hasResults = new Array(count),
        hasCompleted = new Array(count),
        results = new Array(count);

      for (var idx = 0; idx < count; idx++) {
        (function (i) {
          var source = allSources[i];
          isPromise(source) && (source = observableFromPromise(source));
          group.add(
            source.subscribe(
              function (value) {
              if (!finished) {
                hasResults[i] = true;
                results[i] = value;
              }
            },
            function (e) {
              finished = true;
              subscriber.onError(e);
              group.dispose();
            },
            function () {
              if (!finished) {
                if (!hasResults[i]) {
                    subscriber.onCompleted();
                    return;
                }
                hasCompleted[i] = true;
                for (var ix = 0; ix < count; ix++) {
                  if (!hasCompleted[ix]) { return; }
                }
                finished = true;
                subscriber.onNext(results);
                subscriber.onCompleted();
              }
            }));
        })(idx);
      }

      return group;
    });
  };

   /**
   *  Runs two observable sequences in parallel and combines their last elemenets.
   *
   * @param {Observable} second Second observable sequence.
   * @param {Function} resultSelector Result selector function to invoke with the last elements of both sequences.
   * @returns {Observable} An observable sequence with the result of calling the selector function with the last elements of both input sequences.
   */
  observableProto.forkJoin = function (second, resultSelector) {
    var first = this;
    return new AnonymousObservable(function (observer) {
      var leftStopped = false, rightStopped = false,
        hasLeft = false, hasRight = false,
        lastLeft, lastRight,
        leftSubscription = new SingleAssignmentDisposable(), rightSubscription = new SingleAssignmentDisposable();

      isPromise(second) && (second = observableFromPromise(second));

      leftSubscription.setDisposable(
          first.subscribe(function (left) {
            hasLeft = true;
            lastLeft = left;
          }, function (err) {
            rightSubscription.dispose();
            observer.onError(err);
          }, function () {
            leftStopped = true;
            if (rightStopped) {
              if (!hasLeft) {
                  observer.onCompleted();
              } else if (!hasRight) {
                  observer.onCompleted();
              } else {
                var result;
                try {
                  result = resultSelector(lastLeft, lastRight);
                } catch (e) {
                  observer.onError(e);
                  return;
                }
                observer.onNext(result);
                observer.onCompleted();
              }
            }
          })
      );

      rightSubscription.setDisposable(
        second.subscribe(function (right) {
          hasRight = true;
          lastRight = right;
        }, function (err) {
          leftSubscription.dispose();
          observer.onError(err);
        }, function () {
          rightStopped = true;
          if (leftStopped) {
            if (!hasLeft) {
              observer.onCompleted();
            } else if (!hasRight) {
              observer.onCompleted();
            } else {
              var result;
              try {
                result = resultSelector(lastLeft, lastRight);
              } catch (e) {
                observer.onError(e);
                return;
              }
              observer.onNext(result);
              observer.onCompleted();
            }
          }
        })
      );

      return new CompositeDisposable(leftSubscription, rightSubscription);
    }, first);
  };

  /**
   * Comonadic bind operator.
   * @param {Function} selector A transform function to apply to each element.
   * @param {Object} scheduler Scheduler used to execute the operation. If not specified, defaults to the ImmediateScheduler.
   * @returns {Observable} An observable sequence which results from the comonadic bind operation.
   */
  observableProto.manySelect = observableProto.extend = function (selector, scheduler) {
    isScheduler(scheduler) || (scheduler = immediateScheduler);
    var source = this;
    return observableDefer(function () {
      var chain;

      return source
        .map(function (x) {
          var curr = new ChainObservable(x);

          chain && chain.onNext(x);
          chain = curr;

          return curr;
        })
        .tap(
          noop,
          function (e) { chain && chain.onError(e); },
          function () { chain && chain.onCompleted(); }
        )
        .observeOn(scheduler)
        .map(selector);
    }, source);
  };

  var ChainObservable = (function (__super__) {

    function subscribe (observer) {
      var self = this, g = new CompositeDisposable();
      g.add(currentThreadScheduler.schedule(function () {
        observer.onNext(self.head);
        g.add(self.tail.mergeAll().subscribe(observer));
      }));

      return g;
    }

    inherits(ChainObservable, __super__);

    function ChainObservable(head) {
      __super__.call(this, subscribe);
      this.head = head;
      this.tail = new AsyncSubject();
    }

    addProperties(ChainObservable.prototype, Observer, {
      onCompleted: function () {
        this.onNext(Observable.empty());
      },
      onError: function (e) {
        this.onNext(Observable.throwError(e));
      },
      onNext: function (v) {
        this.tail.onNext(v);
        this.tail.onCompleted();
      }
    });

    return ChainObservable;

  }(Observable));

  /** @private */
  var Map = root.Map || (function () {

    function Map() {
      this._keys = [];
      this._values = [];
    }

    Map.prototype.get = function (key) {
      var i = this._keys.indexOf(key);
      return i !== -1 ? this._values[i] : undefined;
    };

    Map.prototype.set = function (key, value) {
      var i = this._keys.indexOf(key);
      i !== -1 && (this._values[i] = value);
      this._values[this._keys.push(key) - 1] = value;
    };

    Map.prototype.forEach = function (callback, thisArg) {
      for (var i = 0, len = this._keys.length; i < len; i++) {
        callback.call(thisArg, this._values[i], this._keys[i]);
      }
    };

    return Map;
  }());

  /**
   * @constructor
   * Represents a join pattern over observable sequences.
   */
  function Pattern(patterns) {
    this.patterns = patterns;
  }

  /**
   *  Creates a pattern that matches the current plan matches and when the specified observable sequences has an available value.
   *  @param other Observable sequence to match in addition to the current pattern.
   *  @return {Pattern} Pattern object that matches when all observable sequences in the pattern have an available value.
   */
  Pattern.prototype.and = function (other) {
    return new Pattern(this.patterns.concat(other));
  };

  /**
   *  Matches when all observable sequences in the pattern (specified using a chain of and operators) have an available value and projects the values.
   *  @param {Function} selector Selector that will be invoked with available values from the source sequences, in the same order of the sequences in the pattern.
   *  @return {Plan} Plan that produces the projected values, to be fed (with other plans) to the when operator.
   */
  Pattern.prototype.thenDo = function (selector) {
    return new Plan(this, selector);
  };

  function Plan(expression, selector) {
      this.expression = expression;
      this.selector = selector;
  }

  Plan.prototype.activate = function (externalSubscriptions, observer, deactivate) {
    var self = this;
    var joinObservers = [];
    for (var i = 0, len = this.expression.patterns.length; i < len; i++) {
      joinObservers.push(planCreateObserver(externalSubscriptions, this.expression.patterns[i], observer.onError.bind(observer)));
    }
    var activePlan = new ActivePlan(joinObservers, function () {
      var result;
      try {
        result = self.selector.apply(self, arguments);
      } catch (e) {
        observer.onError(e);
        return;
      }
      observer.onNext(result);
    }, function () {
      for (var j = 0, jlen = joinObservers.length; j < jlen; j++) {
        joinObservers[j].removeActivePlan(activePlan);
      }
      deactivate(activePlan);
    });
    for (i = 0, len = joinObservers.length; i < len; i++) {
      joinObservers[i].addActivePlan(activePlan);
    }
    return activePlan;
  };

  function planCreateObserver(externalSubscriptions, observable, onError) {
    var entry = externalSubscriptions.get(observable);
    if (!entry) {
      var observer = new JoinObserver(observable, onError);
      externalSubscriptions.set(observable, observer);
      return observer;
    }
    return entry;
  }

  function ActivePlan(joinObserverArray, onNext, onCompleted) {
    this.joinObserverArray = joinObserverArray;
    this.onNext = onNext;
    this.onCompleted = onCompleted;
    this.joinObservers = new Map();
    for (var i = 0, len = this.joinObserverArray.length; i < len; i++) {
      var joinObserver = this.joinObserverArray[i];
      this.joinObservers.set(joinObserver, joinObserver);
    }
  }

  ActivePlan.prototype.dequeue = function () {
    this.joinObservers.forEach(function (v) { v.queue.shift(); });
  };

  ActivePlan.prototype.match = function () {
    var i, len, hasValues = true;
    for (i = 0, len = this.joinObserverArray.length; i < len; i++) {
      if (this.joinObserverArray[i].queue.length === 0) {
        hasValues = false;
        break;
      }
    }
    if (hasValues) {
      var firstValues = [],
          isCompleted = false;
      for (i = 0, len = this.joinObserverArray.length; i < len; i++) {
        firstValues.push(this.joinObserverArray[i].queue[0]);
        this.joinObserverArray[i].queue[0].kind === 'C' && (isCompleted = true);
      }
      if (isCompleted) {
        this.onCompleted();
      } else {
        this.dequeue();
        var values = [];
        for (i = 0, len = firstValues.length; i < firstValues.length; i++) {
          values.push(firstValues[i].value);
        }
        this.onNext.apply(this, values);
      }
    }
  };

  var JoinObserver = (function (__super__) {
    inherits(JoinObserver, __super__);

    function JoinObserver(source, onError) {
      __super__.call(this);
      this.source = source;
      this.onError = onError;
      this.queue = [];
      this.activePlans = [];
      this.subscription = new SingleAssignmentDisposable();
      this.isDisposed = false;
    }

    var JoinObserverPrototype = JoinObserver.prototype;

    JoinObserverPrototype.next = function (notification) {
      if (!this.isDisposed) {
        if (notification.kind === 'E') {
          return this.onError(notification.exception);
        }
        this.queue.push(notification);
        var activePlans = this.activePlans.slice(0);
        for (var i = 0, len = activePlans.length; i < len; i++) {
          activePlans[i].match();
        }
      }
    };

    JoinObserverPrototype.error = noop;
    JoinObserverPrototype.completed = noop;

    JoinObserverPrototype.addActivePlan = function (activePlan) {
      this.activePlans.push(activePlan);
    };

    JoinObserverPrototype.subscribe = function () {
      this.subscription.setDisposable(this.source.materialize().subscribe(this));
    };

    JoinObserverPrototype.removeActivePlan = function (activePlan) {
      this.activePlans.splice(this.activePlans.indexOf(activePlan), 1);
      this.activePlans.length === 0 && this.dispose();
    };

    JoinObserverPrototype.dispose = function () {
      __super__.prototype.dispose.call(this);
      if (!this.isDisposed) {
        this.isDisposed = true;
        this.subscription.dispose();
      }
    };

    return JoinObserver;
  } (AbstractObserver));

  /**
   *  Creates a pattern that matches when both observable sequences have an available value.
   *
   *  @param right Observable sequence to match with the current sequence.
   *  @return {Pattern} Pattern object that matches when both observable sequences have an available value.
   */
  observableProto.and = function (right) {
    return new Pattern([this, right]);
  };

  /**
   *  Matches when the observable sequence has an available value and projects the value.
   *
   *  @param {Function} selector Selector that will be invoked for values in the source sequence.
   *  @returns {Plan} Plan that produces the projected values, to be fed (with other plans) to the when operator.
   */
  observableProto.thenDo = function (selector) {
    return new Pattern([this]).thenDo(selector);
  };

  /**
   *  Joins together the results from several patterns.
   *
   *  @param plans A series of plans (specified as an Array of as a series of arguments) created by use of the Then operator on patterns.
   *  @returns {Observable} Observable sequence with the results form matching several patterns.
   */
  Observable.when = function () {
    var len = arguments.length, plans;
    if (Array.isArray(arguments[0])) {
      plans = arguments[0];
    } else {
      plans = new Array(len);
      for(var i = 0; i < len; i++) { plans[i] = arguments[i]; }
    }
    return new AnonymousObservable(function (o) {
      var activePlans = [],
          externalSubscriptions = new Map();
      var outObserver = observerCreate(
        function (x) { o.onNext(x); },
        function (err) {
          externalSubscriptions.forEach(function (v) { v.onError(err); });
          o.onError(err);
        },
        function (x) { o.onCompleted(); }
      );
      try {
        for (var i = 0, len = plans.length; i < len; i++) {
          activePlans.push(plans[i].activate(externalSubscriptions, outObserver, function (activePlan) {
            var idx = activePlans.indexOf(activePlan);
            activePlans.splice(idx, 1);
            activePlans.length === 0 && o.onCompleted();
          }));
        }
      } catch (e) {
        observableThrow(e).subscribe(o);
      }
      var group = new CompositeDisposable();
      externalSubscriptions.forEach(function (joinObserver) {
        joinObserver.subscribe();
        group.add(joinObserver);
      });

      return group;
    });
  };

  function observableTimerDate(dueTime, scheduler) {
    return new AnonymousObservable(function (observer) {
      return scheduler.scheduleWithAbsolute(dueTime, function () {
        observer.onNext(0);
        observer.onCompleted();
      });
    });
  }

  function observableTimerDateAndPeriod(dueTime, period, scheduler) {
    return new AnonymousObservable(function (observer) {
      var d = dueTime, p = normalizeTime(period);
      return scheduler.scheduleRecursiveWithAbsoluteAndState(0, d, function (count, self) {
        if (p > 0) {
          var now = scheduler.now();
          d = d + p;
          d <= now && (d = now + p);
        }
        observer.onNext(count);
        self(count + 1, d);
      });
    });
  }

  function observableTimerTimeSpan(dueTime, scheduler) {
    return new AnonymousObservable(function (observer) {
      return scheduler.scheduleWithRelative(normalizeTime(dueTime), function () {
        observer.onNext(0);
        observer.onCompleted();
      });
    });
  }

  function observableTimerTimeSpanAndPeriod(dueTime, period, scheduler) {
    return dueTime === period ?
      new AnonymousObservable(function (observer) {
        return scheduler.schedulePeriodicWithState(0, period, function (count) {
          observer.onNext(count);
          return count + 1;
        });
      }) :
      observableDefer(function () {
        return observableTimerDateAndPeriod(scheduler.now() + dueTime, period, scheduler);
      });
  }

  /**
   *  Returns an observable sequence that produces a value after each period.
   *
   * @example
   *  1 - res = Rx.Observable.interval(1000);
   *  2 - res = Rx.Observable.interval(1000, Rx.Scheduler.timeout);
   *
   * @param {Number} period Period for producing the values in the resulting sequence (specified as an integer denoting milliseconds).
   * @param {Scheduler} [scheduler] Scheduler to run the timer on. If not specified, Rx.Scheduler.timeout is used.
   * @returns {Observable} An observable sequence that produces a value after each period.
   */
  var observableinterval = Observable.interval = function (period, scheduler) {
    return observableTimerTimeSpanAndPeriod(period, period, isScheduler(scheduler) ? scheduler : timeoutScheduler);
  };

  /**
   *  Returns an observable sequence that produces a value after dueTime has elapsed and then after each period.
   * @param {Number} dueTime Absolute (specified as a Date object) or relative time (specified as an integer denoting milliseconds) at which to produce the first value.
   * @param {Mixed} [periodOrScheduler]  Period to produce subsequent values (specified as an integer denoting milliseconds), or the scheduler to run the timer on. If not specified, the resulting timer is not recurring.
   * @param {Scheduler} [scheduler]  Scheduler to run the timer on. If not specified, the timeout scheduler is used.
   * @returns {Observable} An observable sequence that produces a value after due time has elapsed and then each period.
   */
  var observableTimer = Observable.timer = function (dueTime, periodOrScheduler, scheduler) {
    var period;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    if (periodOrScheduler !== undefined && typeof periodOrScheduler === 'number') {
      period = periodOrScheduler;
    } else if (isScheduler(periodOrScheduler)) {
      scheduler = periodOrScheduler;
    }
    if (dueTime instanceof Date && period === undefined) {
      return observableTimerDate(dueTime.getTime(), scheduler);
    }
    if (dueTime instanceof Date && period !== undefined) {
      period = periodOrScheduler;
      return observableTimerDateAndPeriod(dueTime.getTime(), period, scheduler);
    }
    return period === undefined ?
      observableTimerTimeSpan(dueTime, scheduler) :
      observableTimerTimeSpanAndPeriod(dueTime, period, scheduler);
  };

  function observableDelayTimeSpan(source, dueTime, scheduler) {
    return new AnonymousObservable(function (observer) {
      var active = false,
        cancelable = new SerialDisposable(),
        exception = null,
        q = [],
        running = false,
        subscription;
      subscription = source.materialize().timestamp(scheduler).subscribe(function (notification) {
        var d, shouldRun;
        if (notification.value.kind === 'E') {
          q = [];
          q.push(notification);
          exception = notification.value.exception;
          shouldRun = !running;
        } else {
          q.push({ value: notification.value, timestamp: notification.timestamp + dueTime });
          shouldRun = !active;
          active = true;
        }
        if (shouldRun) {
          if (exception !== null) {
            observer.onError(exception);
          } else {
            d = new SingleAssignmentDisposable();
            cancelable.setDisposable(d);
            d.setDisposable(scheduler.scheduleRecursiveWithRelative(dueTime, function (self) {
              var e, recurseDueTime, result, shouldRecurse;
              if (exception !== null) {
                return;
              }
              running = true;
              do {
                result = null;
                if (q.length > 0 && q[0].timestamp - scheduler.now() <= 0) {
                  result = q.shift().value;
                }
                if (result !== null) {
                  result.accept(observer);
                }
              } while (result !== null);
              shouldRecurse = false;
              recurseDueTime = 0;
              if (q.length > 0) {
                shouldRecurse = true;
                recurseDueTime = Math.max(0, q[0].timestamp - scheduler.now());
              } else {
                active = false;
              }
              e = exception;
              running = false;
              if (e !== null) {
                observer.onError(e);
              } else if (shouldRecurse) {
                self(recurseDueTime);
              }
            }));
          }
        }
      });
      return new CompositeDisposable(subscription, cancelable);
    }, source);
  }

  function observableDelayDate(source, dueTime, scheduler) {
    return observableDefer(function () {
      return observableDelayTimeSpan(source, dueTime - scheduler.now(), scheduler);
    });
  }

  /**
   *  Time shifts the observable sequence by dueTime. The relative time intervals between the values are preserved.
   *
   * @example
   *  1 - res = Rx.Observable.delay(new Date());
   *  2 - res = Rx.Observable.delay(new Date(), Rx.Scheduler.timeout);
   *
   *  3 - res = Rx.Observable.delay(5000);
   *  4 - res = Rx.Observable.delay(5000, 1000, Rx.Scheduler.timeout);
   * @memberOf Observable#
   * @param {Number} dueTime Absolute (specified as a Date object) or relative time (specified as an integer denoting milliseconds) by which to shift the observable sequence.
   * @param {Scheduler} [scheduler] Scheduler to run the delay timers on. If not specified, the timeout scheduler is used.
   * @returns {Observable} Time-shifted sequence.
   */
  observableProto.delay = function (dueTime, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return dueTime instanceof Date ?
      observableDelayDate(this, dueTime.getTime(), scheduler) :
      observableDelayTimeSpan(this, dueTime, scheduler);
  };

  /**
   *  Ignores values from an observable sequence which are followed by another value before dueTime.
   * @param {Number} dueTime Duration of the debounce period for each value (specified as an integer denoting milliseconds).
   * @param {Scheduler} [scheduler]  Scheduler to run the debounce timers on. If not specified, the timeout scheduler is used.
   * @returns {Observable} The debounced sequence.
   */
  observableProto.debounce = observableProto.throttleWithTimeout = function (dueTime, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    var source = this;
    return new AnonymousObservable(function (observer) {
      var cancelable = new SerialDisposable(), hasvalue = false, value, id = 0;
      var subscription = source.subscribe(
        function (x) {
          hasvalue = true;
          value = x;
          id++;
          var currentId = id,
            d = new SingleAssignmentDisposable();
          cancelable.setDisposable(d);
          d.setDisposable(scheduler.scheduleWithRelative(dueTime, function () {
            hasvalue && id === currentId && observer.onNext(value);
            hasvalue = false;
          }));
        },
        function (e) {
          cancelable.dispose();
          observer.onError(e);
          hasvalue = false;
          id++;
        },
        function () {
          cancelable.dispose();
          hasvalue && observer.onNext(value);
          observer.onCompleted();
          hasvalue = false;
          id++;
        });
      return new CompositeDisposable(subscription, cancelable);
    }, this);
  };

  /**
   * @deprecated use #debounce or #throttleWithTimeout instead.
   */
  observableProto.throttle = function(dueTime, scheduler) {
    //deprecate('throttle', 'debounce or throttleWithTimeout');
    return this.debounce(dueTime, scheduler);
  };

  /**
   *  Projects each element of an observable sequence into zero or more windows which are produced based on timing information.
   * @param {Number} timeSpan Length of each window (specified as an integer denoting milliseconds).
   * @param {Mixed} [timeShiftOrScheduler]  Interval between creation of consecutive windows (specified as an integer denoting milliseconds), or an optional scheduler parameter. If not specified, the time shift corresponds to the timeSpan parameter, resulting in non-overlapping adjacent windows.
   * @param {Scheduler} [scheduler]  Scheduler to run windowing timers on. If not specified, the timeout scheduler is used.
   * @returns {Observable} An observable sequence of windows.
   */
  observableProto.windowWithTime = function (timeSpan, timeShiftOrScheduler, scheduler) {
    var source = this, timeShift;
    timeShiftOrScheduler == null && (timeShift = timeSpan);
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    if (typeof timeShiftOrScheduler === 'number') {
      timeShift = timeShiftOrScheduler;
    } else if (isScheduler(timeShiftOrScheduler)) {
      timeShift = timeSpan;
      scheduler = timeShiftOrScheduler;
    }
    return new AnonymousObservable(function (observer) {
      var groupDisposable,
        nextShift = timeShift,
        nextSpan = timeSpan,
        q = [],
        refCountDisposable,
        timerD = new SerialDisposable(),
        totalTime = 0;
        groupDisposable = new CompositeDisposable(timerD),
        refCountDisposable = new RefCountDisposable(groupDisposable);

       function createTimer () {
        var m = new SingleAssignmentDisposable(),
          isSpan = false,
          isShift = false;
        timerD.setDisposable(m);
        if (nextSpan === nextShift) {
          isSpan = true;
          isShift = true;
        } else if (nextSpan < nextShift) {
            isSpan = true;
        } else {
          isShift = true;
        }
        var newTotalTime = isSpan ? nextSpan : nextShift,
          ts = newTotalTime - totalTime;
        totalTime = newTotalTime;
        if (isSpan) {
          nextSpan += timeShift;
        }
        if (isShift) {
          nextShift += timeShift;
        }
        m.setDisposable(scheduler.scheduleWithRelative(ts, function () {
          if (isShift) {
            var s = new Subject();
            q.push(s);
            observer.onNext(addRef(s, refCountDisposable));
          }
          isSpan && q.shift().onCompleted();
          createTimer();
        }));
      };
      q.push(new Subject());
      observer.onNext(addRef(q[0], refCountDisposable));
      createTimer();
      groupDisposable.add(source.subscribe(
        function (x) {
          for (var i = 0, len = q.length; i < len; i++) { q[i].onNext(x); }
        },
        function (e) {
          for (var i = 0, len = q.length; i < len; i++) { q[i].onError(e); }
          observer.onError(e);
        },
        function () {
          for (var i = 0, len = q.length; i < len; i++) { q[i].onCompleted(); }
          observer.onCompleted();
        }
      ));
      return refCountDisposable;
    }, source);
  };

  /**
   *  Projects each element of an observable sequence into a window that is completed when either it's full or a given amount of time has elapsed.
   * @param {Number} timeSpan Maximum time length of a window.
   * @param {Number} count Maximum element count of a window.
   * @param {Scheduler} [scheduler]  Scheduler to run windowing timers on. If not specified, the timeout scheduler is used.
   * @returns {Observable} An observable sequence of windows.
   */
  observableProto.windowWithTimeOrCount = function (timeSpan, count, scheduler) {
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function (observer) {
      var timerD = new SerialDisposable(),
          groupDisposable = new CompositeDisposable(timerD),
          refCountDisposable = new RefCountDisposable(groupDisposable),
          n = 0,
          windowId = 0,
          s = new Subject();

      function createTimer(id) {
        var m = new SingleAssignmentDisposable();
        timerD.setDisposable(m);
        m.setDisposable(scheduler.scheduleWithRelative(timeSpan, function () {
          if (id !== windowId) { return; }
          n = 0;
          var newId = ++windowId;
          s.onCompleted();
          s = new Subject();
          observer.onNext(addRef(s, refCountDisposable));
          createTimer(newId);
        }));
      }

      observer.onNext(addRef(s, refCountDisposable));
      createTimer(0);

      groupDisposable.add(source.subscribe(
        function (x) {
          var newId = 0, newWindow = false;
          s.onNext(x);
          if (++n === count) {
            newWindow = true;
            n = 0;
            newId = ++windowId;
            s.onCompleted();
            s = new Subject();
            observer.onNext(addRef(s, refCountDisposable));
          }
          newWindow && createTimer(newId);
        },
        function (e) {
          s.onError(e);
          observer.onError(e);
        }, function () {
          s.onCompleted();
          observer.onCompleted();
        }
      ));
      return refCountDisposable;
    }, source);
  };

    /**
     *  Projects each element of an observable sequence into zero or more buffers which are produced based on timing information.
     *
     * @example
     *  1 - res = xs.bufferWithTime(1000, scheduler); // non-overlapping segments of 1 second
     *  2 - res = xs.bufferWithTime(1000, 500, scheduler; // segments of 1 second with time shift 0.5 seconds
     *
     * @param {Number} timeSpan Length of each buffer (specified as an integer denoting milliseconds).
     * @param {Mixed} [timeShiftOrScheduler]  Interval between creation of consecutive buffers (specified as an integer denoting milliseconds), or an optional scheduler parameter. If not specified, the time shift corresponds to the timeSpan parameter, resulting in non-overlapping adjacent buffers.
     * @param {Scheduler} [scheduler]  Scheduler to run buffer timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence of buffers.
     */
    observableProto.bufferWithTime = function (timeSpan, timeShiftOrScheduler, scheduler) {
        return this.windowWithTime.apply(this, arguments).selectMany(function (x) { return x.toArray(); });
    };

    /**
     *  Projects each element of an observable sequence into a buffer that is completed when either it's full or a given amount of time has elapsed.
     *
     * @example
     *  1 - res = source.bufferWithTimeOrCount(5000, 50); // 5s or 50 items in an array
     *  2 - res = source.bufferWithTimeOrCount(5000, 50, scheduler); // 5s or 50 items in an array
     *
     * @param {Number} timeSpan Maximum time length of a buffer.
     * @param {Number} count Maximum element count of a buffer.
     * @param {Scheduler} [scheduler]  Scheduler to run bufferin timers on. If not specified, the timeout scheduler is used.
     * @returns {Observable} An observable sequence of buffers.
     */
    observableProto.bufferWithTimeOrCount = function (timeSpan, count, scheduler) {
        return this.windowWithTimeOrCount(timeSpan, count, scheduler).selectMany(function (x) {
            return x.toArray();
        });
    };

  /**
   *  Records the time interval between consecutive values in an observable sequence.
   *
   * @example
   *  1 - res = source.timeInterval();
   *  2 - res = source.timeInterval(Rx.Scheduler.timeout);
   *
   * @param [scheduler]  Scheduler used to compute time intervals. If not specified, the timeout scheduler is used.
   * @returns {Observable} An observable sequence with time interval information on values.
   */
  observableProto.timeInterval = function (scheduler) {
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return observableDefer(function () {
      var last = scheduler.now();
      return source.map(function (x) {
        var now = scheduler.now(), span = now - last;
        last = now;
        return { value: x, interval: span };
      });
    });
  };

  /**
   *  Records the timestamp for each value in an observable sequence.
   *
   * @example
   *  1 - res = source.timestamp(); // produces { value: x, timestamp: ts }
   *  2 - res = source.timestamp(Rx.Scheduler.default);
   *
   * @param {Scheduler} [scheduler]  Scheduler used to compute timestamps. If not specified, the default scheduler is used.
   * @returns {Observable} An observable sequence with timestamp information on values.
   */
  observableProto.timestamp = function (scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return this.map(function (x) {
      return { value: x, timestamp: scheduler.now() };
    });
  };

  function sampleObservable(source, sampler) {
    return new AnonymousObservable(function (o) {
      var atEnd = false, value, hasValue = false;

      function sampleSubscribe() {
        if (hasValue) {
          hasValue = false;
          o.onNext(value);
        }
        atEnd && o.onCompleted();
      }

      var sourceSubscription = new SingleAssignmentDisposable();
      sourceSubscription.setDisposable(source.subscribe(
        function (newValue) {
          hasValue = true;
          value = newValue;
        },
        function (e) { o.onError(e); },
        function () {
          atEnd = true;
          sourceSubscription.dispose(); 
        }
      ));

      return new CompositeDisposable(
        sourceSubscription,
        sampler.subscribe(sampleSubscribe, function (e) { o.onError(e); }, sampleSubscribe)
      );
    }, source);
  }

  /**
   *  Samples the observable sequence at each interval.
   *
   * @example
   *  1 - res = source.sample(sampleObservable); // Sampler tick sequence
   *  2 - res = source.sample(5000); // 5 seconds
   *  2 - res = source.sample(5000, Rx.Scheduler.timeout); // 5 seconds
   *
   * @param {Mixed} intervalOrSampler Interval at which to sample (specified as an integer denoting milliseconds) or Sampler Observable.
   * @param {Scheduler} [scheduler]  Scheduler to run the sampling timer on. If not specified, the timeout scheduler is used.
   * @returns {Observable} Sampled observable sequence.
   */
  observableProto.sample = observableProto.throttleLatest = function (intervalOrSampler, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return typeof intervalOrSampler === 'number' ?
      sampleObservable(this, observableinterval(intervalOrSampler, scheduler)) :
      sampleObservable(this, intervalOrSampler);
  };

  /**
   *  Returns the source observable sequence or the other observable sequence if dueTime elapses.
   * @param {Number} dueTime Absolute (specified as a Date object) or relative time (specified as an integer denoting milliseconds) when a timeout occurs.
   * @param {Observable} [other]  Sequence to return in case of a timeout. If not specified, a timeout error throwing sequence will be used.
   * @param {Scheduler} [scheduler]  Scheduler to run the timeout timers on. If not specified, the timeout scheduler is used.
   * @returns {Observable} The source sequence switching to the other sequence in case of a timeout.
   */
  observableProto.timeout = function (dueTime, other, scheduler) {
    (other == null || typeof other === 'string') && (other = observableThrow(new Error(other || 'Timeout')));
    isScheduler(scheduler) || (scheduler = timeoutScheduler);

    var source = this, schedulerMethod = dueTime instanceof Date ?
      'scheduleWithAbsolute' :
      'scheduleWithRelative';

    return new AnonymousObservable(function (observer) {
      var id = 0,
        original = new SingleAssignmentDisposable(),
        subscription = new SerialDisposable(),
        switched = false,
        timer = new SerialDisposable();

      subscription.setDisposable(original);

      function createTimer() {
        var myId = id;
        timer.setDisposable(scheduler[schedulerMethod](dueTime, function () {
          if (id === myId) {
            isPromise(other) && (other = observableFromPromise(other));
            subscription.setDisposable(other.subscribe(observer));
          }
        }));
      }

      createTimer();

      original.setDisposable(source.subscribe(function (x) {
        if (!switched) {
          id++;
          observer.onNext(x);
          createTimer();
        }
      }, function (e) {
        if (!switched) {
          id++;
          observer.onError(e);
        }
      }, function () {
        if (!switched) {
          id++;
          observer.onCompleted();
        }
      }));
      return new CompositeDisposable(subscription, timer);
    }, source);
  };

  /**
   *  Generates an observable sequence by iterating a state from an initial state until the condition fails.
   *
   * @example
   *  res = source.generateWithAbsoluteTime(0,
   *      function (x) { return return true; },
   *      function (x) { return x + 1; },
   *      function (x) { return x; },
   *      function (x) { return new Date(); }
   *  });
   *
   * @param {Mixed} initialState Initial state.
   * @param {Function} condition Condition to terminate generation (upon returning false).
   * @param {Function} iterate Iteration step function.
   * @param {Function} resultSelector Selector function for results produced in the sequence.
   * @param {Function} timeSelector Time selector function to control the speed of values being produced each iteration, returning Date values.
   * @param {Scheduler} [scheduler]  Scheduler on which to run the generator loop. If not specified, the timeout scheduler is used.
   * @returns {Observable} The generated sequence.
   */
  Observable.generateWithAbsoluteTime = function (initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function (observer) {
      var first = true,
        hasResult = false;
      return scheduler.scheduleRecursiveWithAbsoluteAndState(initialState, scheduler.now(), function (state, self) {
        hasResult && observer.onNext(state);

        try {
          if (first) {
            first = false;
          } else {
            state = iterate(state);
          }
          hasResult = condition(state);
          if (hasResult) {
            var result = resultSelector(state);
            var time = timeSelector(state);
          }
        } catch (e) {
          observer.onError(e);
          return;
        }
        if (hasResult) {
          self(result, time);
        } else {
          observer.onCompleted();
        }
      });
    });
  };

  /**
   *  Generates an observable sequence by iterating a state from an initial state until the condition fails.
   *
   * @example
   *  res = source.generateWithRelativeTime(0,
   *      function (x) { return return true; },
   *      function (x) { return x + 1; },
   *      function (x) { return x; },
   *      function (x) { return 500; }
   *  );
   *
   * @param {Mixed} initialState Initial state.
   * @param {Function} condition Condition to terminate generation (upon returning false).
   * @param {Function} iterate Iteration step function.
   * @param {Function} resultSelector Selector function for results produced in the sequence.
   * @param {Function} timeSelector Time selector function to control the speed of values being produced each iteration, returning integer values denoting milliseconds.
   * @param {Scheduler} [scheduler]  Scheduler on which to run the generator loop. If not specified, the timeout scheduler is used.
   * @returns {Observable} The generated sequence.
   */
  Observable.generateWithRelativeTime = function (initialState, condition, iterate, resultSelector, timeSelector, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function (observer) {
      var first = true,
        hasResult = false;
      return scheduler.scheduleRecursiveWithRelativeAndState(initialState, 0, function (state, self) {
        hasResult && observer.onNext(state);

        try {
          if (first) {
            first = false;
          } else {
            state = iterate(state);
          }
          hasResult = condition(state);
          if (hasResult) {
            var result = resultSelector(state);
            var time = timeSelector(state);
          }
        } catch (e) {
          observer.onError(e);
          return;
        }
        if (hasResult) {
          self(result, time);
        } else {
          observer.onCompleted();
        }
      });
    });
  };

  /**
   *  Time shifts the observable sequence by delaying the subscription with the specified relative time duration, using the specified scheduler to run timers.
   *
   * @example
   *  1 - res = source.delaySubscription(5000); // 5s
   *  2 - res = source.delaySubscription(5000, Rx.Scheduler.default); // 5 seconds
   *
   * @param {Number} dueTime Relative or absolute time shift of the subscription.
   * @param {Scheduler} [scheduler]  Scheduler to run the subscription delay timer on. If not specified, the timeout scheduler is used.
   * @returns {Observable} Time-shifted sequence.
   */
  observableProto.delaySubscription = function (dueTime, scheduler) {
    var scheduleMethod = dueTime instanceof Date ? 'scheduleWithAbsolute' : 'scheduleWithRelative';
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function (o) {
      var d = new SerialDisposable();

      d.setDisposable(scheduler[scheduleMethod](dueTime, function() {
        d.setDisposable(source.subscribe(o));
      }));

      return d;
    }, this);
  };

  /**
   *  Time shifts the observable sequence based on a subscription delay and a delay selector function for each element.
   *
   * @example
   *  1 - res = source.delayWithSelector(function (x) { return Rx.Scheduler.timer(5000); }); // with selector only
   *  1 - res = source.delayWithSelector(Rx.Observable.timer(2000), function (x) { return Rx.Observable.timer(x); }); // with delay and selector
   *
   * @param {Observable} [subscriptionDelay]  Sequence indicating the delay for the subscription to the source.
   * @param {Function} delayDurationSelector Selector function to retrieve a sequence indicating the delay for each given element.
   * @returns {Observable} Time-shifted sequence.
   */
  observableProto.delayWithSelector = function (subscriptionDelay, delayDurationSelector) {
    var source = this, subDelay, selector;
    if (isFunction(subscriptionDelay)) {
      selector = subscriptionDelay;
    } else {
      subDelay = subscriptionDelay;
      selector = delayDurationSelector;
    }
    return new AnonymousObservable(function (observer) {
      var delays = new CompositeDisposable(), atEnd = false, subscription = new SerialDisposable();

      function start() {
        subscription.setDisposable(source.subscribe(
          function (x) {
            var delay = tryCatch(selector)(x);
            if (delay === errorObj) { return observer.onError(delay.e); }
            var d = new SingleAssignmentDisposable();
            delays.add(d);
            d.setDisposable(delay.subscribe(
              function () {
                observer.onNext(x);
                delays.remove(d);
                done();
              },
              function (e) { observer.onError(e); },
              function () {
                observer.onNext(x);
                delays.remove(d);
                done();
              }
            ))
          },
          function (e) { observer.onError(e); },
          function () {
            atEnd = true;
            subscription.dispose();
            done();
          }
        ))
      }

      function done () {
        atEnd && delays.length === 0 && observer.onCompleted();
      }

      if (!subDelay) {
        start();
      } else {
        subscription.setDisposable(subDelay.subscribe(start, function (e) { observer.onError(e); }, start));
      }

      return new CompositeDisposable(subscription, delays);
    }, this);
  };

    /**
     *  Returns the source observable sequence, switching to the other observable sequence if a timeout is signaled.
     * @param {Observable} [firstTimeout]  Observable sequence that represents the timeout for the first element. If not provided, this defaults to Observable.never().
     * @param {Function} timeoutDurationSelector Selector to retrieve an observable sequence that represents the timeout between the current element and the next element.
     * @param {Observable} [other]  Sequence to return in case of a timeout. If not provided, this is set to Observable.throwException().
     * @returns {Observable} The source sequence switching to the other sequence in case of a timeout.
     */
    observableProto.timeoutWithSelector = function (firstTimeout, timeoutdurationSelector, other) {
      if (arguments.length === 1) {
          timeoutdurationSelector = firstTimeout;
          firstTimeout = observableNever();
      }
      other || (other = observableThrow(new Error('Timeout')));
      var source = this;
      return new AnonymousObservable(function (observer) {
        var subscription = new SerialDisposable(), timer = new SerialDisposable(), original = new SingleAssignmentDisposable();

        subscription.setDisposable(original);

        var id = 0, switched = false;

        function setTimer(timeout) {
          var myId = id;

          function timerWins () {
            return id === myId;
          }

          var d = new SingleAssignmentDisposable();
          timer.setDisposable(d);
          d.setDisposable(timeout.subscribe(function () {
            timerWins() && subscription.setDisposable(other.subscribe(observer));
            d.dispose();
          }, function (e) {
            timerWins() && observer.onError(e);
          }, function () {
            timerWins() && subscription.setDisposable(other.subscribe(observer));
          }));
        };

        setTimer(firstTimeout);

        function observerWins() {
          var res = !switched;
          if (res) { id++; }
          return res;
        }

        original.setDisposable(source.subscribe(function (x) {
          if (observerWins()) {
            observer.onNext(x);
            var timeout;
            try {
              timeout = timeoutdurationSelector(x);
            } catch (e) {
              observer.onError(e);
              return;
            }
            setTimer(isPromise(timeout) ? observableFromPromise(timeout) : timeout);
          }
        }, function (e) {
          observerWins() && observer.onError(e);
        }, function () {
          observerWins() && observer.onCompleted();
        }));
        return new CompositeDisposable(subscription, timer);
      }, source);
    };

  /**
   * Ignores values from an observable sequence which are followed by another value within a computed throttle duration.
   * @param {Function} durationSelector Selector function to retrieve a sequence indicating the throttle duration for each given element.
   * @returns {Observable} The debounced sequence.
   */
  observableProto.debounceWithSelector = function (durationSelector) {
    var source = this;
    return new AnonymousObservable(function (observer) {
      var value, hasValue = false, cancelable = new SerialDisposable(), id = 0;
      var subscription = source.subscribe(function (x) {
        var throttle;
        try {
          throttle = durationSelector(x);
        } catch (e) {
          observer.onError(e);
          return;
        }

        isPromise(throttle) && (throttle = observableFromPromise(throttle));

        hasValue = true;
        value = x;
        id++;
        var currentid = id, d = new SingleAssignmentDisposable();
        cancelable.setDisposable(d);
        d.setDisposable(throttle.subscribe(function () {
          hasValue && id === currentid && observer.onNext(value);
          hasValue = false;
          d.dispose();
        }, observer.onError.bind(observer), function () {
          hasValue && id === currentid && observer.onNext(value);
          hasValue = false;
          d.dispose();
        }));
      }, function (e) {
        cancelable.dispose();
        observer.onError(e);
        hasValue = false;
        id++;
      }, function () {
        cancelable.dispose();
        hasValue && observer.onNext(value);
        observer.onCompleted();
        hasValue = false;
        id++;
      });
      return new CompositeDisposable(subscription, cancelable);
    }, source);
  };

  /**
   * @deprecated use #debounceWithSelector instead.
   */
  observableProto.throttleWithSelector = function (durationSelector) {
    //deprecate('throttleWithSelector', 'debounceWithSelector');
    return this.debounceWithSelector(durationSelector);
  };

  /**
   *  Skips elements for the specified duration from the end of the observable source sequence, using the specified scheduler to run timers.
   *
   *  1 - res = source.skipLastWithTime(5000);
   *  2 - res = source.skipLastWithTime(5000, scheduler);
   *
   * @description
   *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
   *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
   *  result sequence. This causes elements to be delayed with duration.
   * @param {Number} duration Duration for skipping elements from the end of the sequence.
   * @param {Scheduler} [scheduler]  Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout
   * @returns {Observable} An observable sequence with the elements skipped during the specified duration from the end of the source sequence.
   */
  observableProto.skipLastWithTime = function (duration, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    var source = this;
    return new AnonymousObservable(function (o) {
      var q = [];
      return source.subscribe(function (x) {
        var now = scheduler.now();
        q.push({ interval: now, value: x });
        while (q.length > 0 && now - q[0].interval >= duration) {
          o.onNext(q.shift().value);
        }
      }, function (e) { o.onError(e); }, function () {
        var now = scheduler.now();
        while (q.length > 0 && now - q[0].interval >= duration) {
          o.onNext(q.shift().value);
        }
        o.onCompleted();
      });
    }, source);
  };

  /**
   *  Returns elements within the specified duration from the end of the observable source sequence, using the specified schedulers to run timers and to drain the collected elements.
   * @description
   *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
   *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
   *  result sequence. This causes elements to be delayed with duration.
   * @param {Number} duration Duration for taking elements from the end of the sequence.
   * @param {Scheduler} [scheduler]  Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
   * @returns {Observable} An observable sequence with the elements taken during the specified duration from the end of the source sequence.
   */
  observableProto.takeLastWithTime = function (duration, scheduler) {
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function (o) {
      var q = [];
      return source.subscribe(function (x) {
        var now = scheduler.now();
        q.push({ interval: now, value: x });
        while (q.length > 0 && now - q[0].interval >= duration) {
          q.shift();
        }
      }, function (e) { o.onError(e); }, function () {
        var now = scheduler.now();
        while (q.length > 0) {
          var next = q.shift();
          if (now - next.interval <= duration) { o.onNext(next.value); }
        }
        o.onCompleted();
      });
    }, source);
  };

  /**
   *  Returns an array with the elements within the specified duration from the end of the observable source sequence, using the specified scheduler to run timers.
   * @description
   *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
   *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
   *  result sequence. This causes elements to be delayed with duration.
   * @param {Number} duration Duration for taking elements from the end of the sequence.
   * @param {Scheduler} scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
   * @returns {Observable} An observable sequence containing a single array with the elements taken during the specified duration from the end of the source sequence.
   */
  observableProto.takeLastBufferWithTime = function (duration, scheduler) {
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function (o) {
      var q = [];
      return source.subscribe(function (x) {
        var now = scheduler.now();
        q.push({ interval: now, value: x });
        while (q.length > 0 && now - q[0].interval >= duration) {
          q.shift();
        }
      }, function (e) { o.onError(e); }, function () {
        var now = scheduler.now(), res = [];
        while (q.length > 0) {
          var next = q.shift();
          now - next.interval <= duration && res.push(next.value);
        }
        o.onNext(res);
        o.onCompleted();
      });
    }, source);
  };

  /**
   *  Takes elements for the specified duration from the start of the observable source sequence, using the specified scheduler to run timers.
   *
   * @example
   *  1 - res = source.takeWithTime(5000,  [optional scheduler]);
   * @description
   *  This operator accumulates a queue with a length enough to store elements received during the initial duration window.
   *  As more elements are received, elements older than the specified duration are taken from the queue and produced on the
   *  result sequence. This causes elements to be delayed with duration.
   * @param {Number} duration Duration for taking elements from the start of the sequence.
   * @param {Scheduler} scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
   * @returns {Observable} An observable sequence with the elements taken during the specified duration from the start of the source sequence.
   */
  observableProto.takeWithTime = function (duration, scheduler) {
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function (o) {
      return new CompositeDisposable(scheduler.scheduleWithRelative(duration, function () { o.onCompleted(); }), source.subscribe(o));
    }, source);
  };

  /**
   *  Skips elements for the specified duration from the start of the observable source sequence, using the specified scheduler to run timers.
   *
   * @example
   *  1 - res = source.skipWithTime(5000, [optional scheduler]);
   *
   * @description
   *  Specifying a zero value for duration doesn't guarantee no elements will be dropped from the start of the source sequence.
   *  This is a side-effect of the asynchrony introduced by the scheduler, where the action that causes callbacks from the source sequence to be forwarded
   *  may not execute immediately, despite the zero due time.
   *
   *  Errors produced by the source sequence are always forwarded to the result sequence, even if the error occurs before the duration.
   * @param {Number} duration Duration for skipping elements from the start of the sequence.
   * @param {Scheduler} scheduler Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
   * @returns {Observable} An observable sequence with the elements skipped during the specified duration from the start of the source sequence.
   */
  observableProto.skipWithTime = function (duration, scheduler) {
    var source = this;
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    return new AnonymousObservable(function (observer) {
      var open = false;
      return new CompositeDisposable(
        scheduler.scheduleWithRelative(duration, function () { open = true; }),
        source.subscribe(function (x) { open && observer.onNext(x); }, observer.onError.bind(observer), observer.onCompleted.bind(observer)));
    }, source);
  };

  /**
   *  Skips elements from the observable source sequence until the specified start time, using the specified scheduler to run timers.
   *  Errors produced by the source sequence are always forwarded to the result sequence, even if the error occurs before the start time.
   *
   * @examples
   *  1 - res = source.skipUntilWithTime(new Date(), [scheduler]);
   *  2 - res = source.skipUntilWithTime(5000, [scheduler]);
   * @param {Date|Number} startTime Time to start taking elements from the source sequence. If this value is less than or equal to Date(), no elements will be skipped.
   * @param {Scheduler} [scheduler] Scheduler to run the timer on. If not specified, defaults to Rx.Scheduler.timeout.
   * @returns {Observable} An observable sequence with the elements skipped until the specified start time.
   */
  observableProto.skipUntilWithTime = function (startTime, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    var source = this, schedulerMethod = startTime instanceof Date ?
      'scheduleWithAbsolute' :
      'scheduleWithRelative';
    return new AnonymousObservable(function (o) {
      var open = false;

      return new CompositeDisposable(
        scheduler[schedulerMethod](startTime, function () { open = true; }),
        source.subscribe(
          function (x) { open && o.onNext(x); },
          function (e) { o.onError(e); }, function () { o.onCompleted(); }));
    }, source);
  };

  /**
   *  Takes elements for the specified duration until the specified end time, using the specified scheduler to run timers.
   * @param {Number | Date} endTime Time to stop taking elements from the source sequence. If this value is less than or equal to new Date(), the result stream will complete immediately.
   * @param {Scheduler} [scheduler] Scheduler to run the timer on.
   * @returns {Observable} An observable sequence with the elements taken until the specified end time.
   */
  observableProto.takeUntilWithTime = function (endTime, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    var source = this, schedulerMethod = endTime instanceof Date ?
      'scheduleWithAbsolute' :
      'scheduleWithRelative';
    return new AnonymousObservable(function (o) {
      return new CompositeDisposable(
        scheduler[schedulerMethod](endTime, function () { o.onCompleted(); }),
        source.subscribe(o));
    }, source);
  };

  /**
   * Returns an Observable that emits only the first item emitted by the source Observable during sequential time windows of a specified duration.
   * @param {Number} windowDuration time to wait before emitting another item after emitting the last item
   * @param {Scheduler} [scheduler] the Scheduler to use internally to manage the timers that handle timeout for each item. If not provided, defaults to Scheduler.timeout.
   * @returns {Observable} An Observable that performs the throttle operation.
   */
  observableProto.throttleFirst = function (windowDuration, scheduler) {
    isScheduler(scheduler) || (scheduler = timeoutScheduler);
    var duration = +windowDuration || 0;
    if (duration <= 0) { throw new RangeError('windowDuration cannot be less or equal zero.'); }
    var source = this;
    return new AnonymousObservable(function (o) {
      var lastOnNext = 0;
      return source.subscribe(
        function (x) {
          var now = scheduler.now();
          if (lastOnNext === 0 || now - lastOnNext >= duration) {
            lastOnNext = now;
            o.onNext(x);
          }
        },function (e) { o.onError(e); }, function () { o.onCompleted(); }
      );
    }, source);
  };

  /**
   * Executes a transducer to transform the observable sequence
   * @param {Transducer} transducer A transducer to execute
   * @returns {Observable} An Observable sequence containing the results from the transducer.
   */
  observableProto.transduce = function(transducer) {
    var source = this;

    function transformForObserver(o) {
      return {
        '@@transducer/init': function() {
          return o;
        },
        '@@transducer/step': function(obs, input) {
          return obs.onNext(input);
        },
        '@@transducer/result': function(obs) {
          return obs.onCompleted();
        }
      };
    }

    return new AnonymousObservable(function(o) {
      var xform = transducer(transformForObserver(o));
      return source.subscribe(
        function(v) {
          try {
            xform['@@transducer/step'](o, v);
          } catch (e) {
            o.onError(e);
          }
        },
        function (e) { o.onError(e); },
        function() { xform['@@transducer/result'](o); }
      );
    }, source);
  };

  /*
   * Performs a exclusive waiting for the first to finish before subscribing to another observable.
   * Observables that come in between subscriptions will be dropped on the floor.
   * @returns {Observable} A exclusive observable with only the results that happen when subscribed.
   */
  observableProto.exclusive = function () {
    var sources = this;
    return new AnonymousObservable(function (observer) {
      var hasCurrent = false,
        isStopped = false,
        m = new SingleAssignmentDisposable(),
        g = new CompositeDisposable();

      g.add(m);

      m.setDisposable(sources.subscribe(
        function (innerSource) {
          if (!hasCurrent) {
            hasCurrent = true;

            isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));

            var innerSubscription = new SingleAssignmentDisposable();
            g.add(innerSubscription);

            innerSubscription.setDisposable(innerSource.subscribe(
              observer.onNext.bind(observer),
              observer.onError.bind(observer),
              function () {
                g.remove(innerSubscription);
                hasCurrent = false;
                if (isStopped && g.length === 1) {
                  observer.onCompleted();
                }
            }));
          }
        },
        observer.onError.bind(observer),
        function () {
          isStopped = true;
          if (!hasCurrent && g.length === 1) {
            observer.onCompleted();
          }
        }));

      return g;
    }, this);
  };

  /*
   * Performs a exclusive map waiting for the first to finish before subscribing to another observable.
   * Observables that come in between subscriptions will be dropped on the floor.
   * @param {Function} selector Selector to invoke for every item in the current subscription.
   * @param {Any} [thisArg] An optional context to invoke with the selector parameter.
   * @returns {Observable} An exclusive observable with only the results that happen when subscribed.
   */
  observableProto.exclusiveMap = function (selector, thisArg) {
    var sources = this,
        selectorFunc = bindCallback(selector, thisArg, 3);
    return new AnonymousObservable(function (observer) {
      var index = 0,
        hasCurrent = false,
        isStopped = true,
        m = new SingleAssignmentDisposable(),
        g = new CompositeDisposable();

      g.add(m);

      m.setDisposable(sources.subscribe(
        function (innerSource) {

          if (!hasCurrent) {
            hasCurrent = true;

            innerSubscription = new SingleAssignmentDisposable();
            g.add(innerSubscription);

            isPromise(innerSource) && (innerSource = observableFromPromise(innerSource));

            innerSubscription.setDisposable(innerSource.subscribe(
              function (x) {
                var result;
                try {
                  result = selectorFunc(x, index++, innerSource);
                } catch (e) {
                  observer.onError(e);
                  return;
                }

                observer.onNext(result);
              },
              function (e) { observer.onError(e); },
              function () {
                g.remove(innerSubscription);
                hasCurrent = false;

                if (isStopped && g.length === 1) {
                  observer.onCompleted();
                }
              }));
          }
        },
        function (e) { observer.onError(e); },
        function () {
          isStopped = true;
          if (g.length === 1 && !hasCurrent) {
            observer.onCompleted();
          }
        }));
      return g;
    }, this);
  };

  /** Provides a set of extension methods for virtual time scheduling. */
  Rx.VirtualTimeScheduler = (function (__super__) {

    function localNow() {
      return this.toDateTimeOffset(this.clock);
    }

    function scheduleNow(state, action) {
      return this.scheduleAbsoluteWithState(state, this.clock, action);
    }

    function scheduleRelative(state, dueTime, action) {
      return this.scheduleRelativeWithState(state, this.toRelative(dueTime), action);
    }

    function scheduleAbsolute(state, dueTime, action) {
      return this.scheduleRelativeWithState(state, this.toRelative(dueTime - this.now()), action);
    }

    function invokeAction(scheduler, action) {
      action();
      return disposableEmpty;
    }

    inherits(VirtualTimeScheduler, __super__);

    /**
     * Creates a new virtual time scheduler with the specified initial clock value and absolute time comparer.
     *
     * @constructor
     * @param {Number} initialClock Initial value for the clock.
     * @param {Function} comparer Comparer to determine causality of events based on absolute time.
     */
    function VirtualTimeScheduler(initialClock, comparer) {
      this.clock = initialClock;
      this.comparer = comparer;
      this.isEnabled = false;
      this.queue = new PriorityQueue(1024);
      __super__.call(this, localNow, scheduleNow, scheduleRelative, scheduleAbsolute);
    }

    var VirtualTimeSchedulerPrototype = VirtualTimeScheduler.prototype;

    /**
     * Adds a relative time value to an absolute time value.
     * @param {Number} absolute Absolute virtual time value.
     * @param {Number} relative Relative virtual time value to add.
     * @return {Number} Resulting absolute virtual time sum value.
     */
    VirtualTimeSchedulerPrototype.add = notImplemented;

    /**
     * Converts an absolute time to a number
     * @param {Any} The absolute time.
     * @returns {Number} The absolute time in ms
     */
    VirtualTimeSchedulerPrototype.toDateTimeOffset = notImplemented;

    /**
     * Converts the TimeSpan value to a relative virtual time value.
     * @param {Number} timeSpan TimeSpan value to convert.
     * @return {Number} Corresponding relative virtual time value.
     */
    VirtualTimeSchedulerPrototype.toRelative = notImplemented;

    /**
     * Schedules a periodic piece of work by dynamically discovering the scheduler's capabilities. The periodic task will be emulated using recursive scheduling.
     * @param {Mixed} state Initial state passed to the action upon the first iteration.
     * @param {Number} period Period for running the work periodically.
     * @param {Function} action Action to be executed, potentially updating the state.
     * @returns {Disposable} The disposable object used to cancel the scheduled recurring action (best effort).
     */
    VirtualTimeSchedulerPrototype.schedulePeriodicWithState = function (state, period, action) {
      var s = new SchedulePeriodicRecursive(this, state, period, action);
      return s.start();
    };

    /**
     * Schedules an action to be executed after dueTime.
     * @param {Mixed} state State passed to the action to be executed.
     * @param {Number} dueTime Relative time after which to execute the action.
     * @param {Function} action Action to be executed.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    VirtualTimeSchedulerPrototype.scheduleRelativeWithState = function (state, dueTime, action) {
      var runAt = this.add(this.clock, dueTime);
      return this.scheduleAbsoluteWithState(state, runAt, action);
    };

    /**
     * Schedules an action to be executed at dueTime.
     * @param {Number} dueTime Relative time after which to execute the action.
     * @param {Function} action Action to be executed.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    VirtualTimeSchedulerPrototype.scheduleRelative = function (dueTime, action) {
      return this.scheduleRelativeWithState(action, dueTime, invokeAction);
    };

    /**
     * Starts the virtual time scheduler.
     */
    VirtualTimeSchedulerPrototype.start = function () {
      if (!this.isEnabled) {
        this.isEnabled = true;
        do {
          var next = this.getNext();
          if (next !== null) {
            this.comparer(next.dueTime, this.clock) > 0 && (this.clock = next.dueTime);
            next.invoke();
          } else {
            this.isEnabled = false;
          }
        } while (this.isEnabled);
      }
    };

    /**
     * Stops the virtual time scheduler.
     */
    VirtualTimeSchedulerPrototype.stop = function () {
      this.isEnabled = false;
    };

    /**
     * Advances the scheduler's clock to the specified time, running all work till that point.
     * @param {Number} time Absolute time to advance the scheduler's clock to.
     */
    VirtualTimeSchedulerPrototype.advanceTo = function (time) {
      var dueToClock = this.comparer(this.clock, time);
      if (this.comparer(this.clock, time) > 0) { throw new ArgumentOutOfRangeError(); }
      if (dueToClock === 0) { return; }
      if (!this.isEnabled) {
        this.isEnabled = true;
        do {
          var next = this.getNext();
          if (next !== null && this.comparer(next.dueTime, time) <= 0) {
            this.comparer(next.dueTime, this.clock) > 0 && (this.clock = next.dueTime);
            next.invoke();
          } else {
            this.isEnabled = false;
          }
        } while (this.isEnabled);
        this.clock = time;
      }
    };

    /**
     * Advances the scheduler's clock by the specified relative time, running all work scheduled for that timespan.
     * @param {Number} time Relative time to advance the scheduler's clock by.
     */
    VirtualTimeSchedulerPrototype.advanceBy = function (time) {
      var dt = this.add(this.clock, time),
          dueToClock = this.comparer(this.clock, dt);
      if (dueToClock > 0) { throw new ArgumentOutOfRangeError(); }
      if (dueToClock === 0) {  return; }

      this.advanceTo(dt);
    };

    /**
     * Advances the scheduler's clock by the specified relative time.
     * @param {Number} time Relative time to advance the scheduler's clock by.
     */
    VirtualTimeSchedulerPrototype.sleep = function (time) {
      var dt = this.add(this.clock, time);
      if (this.comparer(this.clock, dt) >= 0) { throw new ArgumentOutOfRangeError(); }

      this.clock = dt;
    };

    /**
     * Gets the next scheduled item to be executed.
     * @returns {ScheduledItem} The next scheduled item.
     */
    VirtualTimeSchedulerPrototype.getNext = function () {
      while (this.queue.length > 0) {
        var next = this.queue.peek();
        if (next.isCancelled()) {
          this.queue.dequeue();
        } else {
          return next;
        }
      }
      return null;
    };

    /**
     * Schedules an action to be executed at dueTime.
     * @param {Scheduler} scheduler Scheduler to execute the action on.
     * @param {Number} dueTime Absolute time at which to execute the action.
     * @param {Function} action Action to be executed.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    VirtualTimeSchedulerPrototype.scheduleAbsolute = function (dueTime, action) {
      return this.scheduleAbsoluteWithState(action, dueTime, invokeAction);
    };

    /**
     * Schedules an action to be executed at dueTime.
     * @param {Mixed} state State passed to the action to be executed.
     * @param {Number} dueTime Absolute time at which to execute the action.
     * @param {Function} action Action to be executed.
     * @returns {Disposable} The disposable object used to cancel the scheduled action (best effort).
     */
    VirtualTimeSchedulerPrototype.scheduleAbsoluteWithState = function (state, dueTime, action) {
      var self = this;

      function run(scheduler, state1) {
        self.queue.remove(si);
        return action(scheduler, state1);
      }

      var si = new ScheduledItem(this, state, run, dueTime, this.comparer);
      this.queue.enqueue(si);

      return si.disposable;
    };

    return VirtualTimeScheduler;
  }(Scheduler));

  /** Provides a virtual time scheduler that uses Date for absolute time and number for relative time. */
  Rx.HistoricalScheduler = (function (__super__) {
    inherits(HistoricalScheduler, __super__);

    /**
     * Creates a new historical scheduler with the specified initial clock value.
     * @constructor
     * @param {Number} initialClock Initial value for the clock.
     * @param {Function} comparer Comparer to determine causality of events based on absolute time.
     */
    function HistoricalScheduler(initialClock, comparer) {
      var clock = initialClock == null ? 0 : initialClock;
      var cmp = comparer || defaultSubComparer;
      __super__.call(this, clock, cmp);
    }

    var HistoricalSchedulerProto = HistoricalScheduler.prototype;

    /**
     * Adds a relative time value to an absolute time value.
     * @param {Number} absolute Absolute virtual time value.
     * @param {Number} relative Relative virtual time value to add.
     * @return {Number} Resulting absolute virtual time sum value.
     */
    HistoricalSchedulerProto.add = function (absolute, relative) {
      return absolute + relative;
    };

    HistoricalSchedulerProto.toDateTimeOffset = function (absolute) {
      return new Date(absolute).getTime();
    };

    /**
     * Converts the TimeSpan value to a relative virtual time value.
     * @memberOf HistoricalScheduler
     * @param {Number} timeSpan TimeSpan value to convert.
     * @return {Number} Corresponding relative virtual time value.
     */
    HistoricalSchedulerProto.toRelative = function (timeSpan) {
      return timeSpan;
    };

    return HistoricalScheduler;
  }(Rx.VirtualTimeScheduler));

  var AnonymousObservable = Rx.AnonymousObservable = (function (__super__) {
    inherits(AnonymousObservable, __super__);

    // Fix subscriber to check for undefined or function returned to decorate as Disposable
    function fixSubscriber(subscriber) {
      return subscriber && isFunction(subscriber.dispose) ? subscriber :
        isFunction(subscriber) ? disposableCreate(subscriber) : disposableEmpty;
    }

    function setDisposable(s, state) {
      var ado = state[0], subscribe = state[1];
      var sub = tryCatch(subscribe)(ado);

      if (sub === errorObj) {
        if(!ado.fail(errorObj.e)) { return thrower(errorObj.e); }
      }
      ado.setDisposable(fixSubscriber(sub));
    }

    function AnonymousObservable(subscribe, parent) {
      this.source = parent;

      function s(observer) {
        var ado = new AutoDetachObserver(observer), state = [ado, subscribe];

        if (currentThreadScheduler.scheduleRequired()) {
          currentThreadScheduler.scheduleWithState(state, setDisposable);
        } else {
          setDisposable(null, state);
        }
        return ado;
      }

      __super__.call(this, s);
    }

    return AnonymousObservable;

  }(Observable));

  var AutoDetachObserver = (function (__super__) {
    inherits(AutoDetachObserver, __super__);

    function AutoDetachObserver(observer) {
      __super__.call(this);
      this.observer = observer;
      this.m = new SingleAssignmentDisposable();
    }

    var AutoDetachObserverPrototype = AutoDetachObserver.prototype;

    AutoDetachObserverPrototype.next = function (value) {
      var result = tryCatch(this.observer.onNext).call(this.observer, value);
      if (result === errorObj) {
        this.dispose();
        thrower(result.e);
      }
    };

    AutoDetachObserverPrototype.error = function (err) {
      var result = tryCatch(this.observer.onError).call(this.observer, err);
      this.dispose();
      result === errorObj && thrower(result.e);
    };

    AutoDetachObserverPrototype.completed = function () {
      var result = tryCatch(this.observer.onCompleted).call(this.observer);
      this.dispose();
      result === errorObj && thrower(result.e);
    };

    AutoDetachObserverPrototype.setDisposable = function (value) { this.m.setDisposable(value); };
    AutoDetachObserverPrototype.getDisposable = function () { return this.m.getDisposable(); };

    AutoDetachObserverPrototype.dispose = function () {
      __super__.prototype.dispose.call(this);
      this.m.dispose();
    };

    return AutoDetachObserver;
  }(AbstractObserver));

  var GroupedObservable = (function (__super__) {
    inherits(GroupedObservable, __super__);

    function subscribe(observer) {
      return this.underlyingObservable.subscribe(observer);
    }

    function GroupedObservable(key, underlyingObservable, mergedDisposable) {
      __super__.call(this, subscribe);
      this.key = key;
      this.underlyingObservable = !mergedDisposable ?
        underlyingObservable :
        new AnonymousObservable(function (observer) {
          return new CompositeDisposable(mergedDisposable.getDisposable(), underlyingObservable.subscribe(observer));
        });
    }

    return GroupedObservable;
  }(Observable));

  /**
   *  Represents an object that is both an observable sequence as well as an observer.
   *  Each notification is broadcasted to all subscribed observers.
   */
  var Subject = Rx.Subject = (function (__super__) {
    function subscribe(observer) {
      checkDisposed(this);
      if (!this.isStopped) {
        this.observers.push(observer);
        return new InnerSubscription(this, observer);
      }
      if (this.hasError) {
        observer.onError(this.error);
        return disposableEmpty;
      }
      observer.onCompleted();
      return disposableEmpty;
    }

    inherits(Subject, __super__);

    /**
     * Creates a subject.
     */
    function Subject() {
      __super__.call(this, subscribe);
      this.isDisposed = false,
      this.isStopped = false,
      this.observers = [];
      this.hasError = false;
    }

    addProperties(Subject.prototype, Observer.prototype, {
      /**
       * Indicates whether the subject has observers subscribed to it.
       * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
       */
      hasObservers: function () { return this.observers.length > 0; },
      /**
       * Notifies all subscribed observers about the end of the sequence.
       */
      onCompleted: function () {
        checkDisposed(this);
        if (!this.isStopped) {
          this.isStopped = true;
          for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
            os[i].onCompleted();
          }

          this.observers.length = 0;
        }
      },
      /**
       * Notifies all subscribed observers about the exception.
       * @param {Mixed} error The exception to send to all observers.
       */
      onError: function (error) {
        checkDisposed(this);
        if (!this.isStopped) {
          this.isStopped = true;
          this.error = error;
          this.hasError = true;
          for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
            os[i].onError(error);
          }

          this.observers.length = 0;
        }
      },
      /**
       * Notifies all subscribed observers about the arrival of the specified element in the sequence.
       * @param {Mixed} value The value to send to all observers.
       */
      onNext: function (value) {
        checkDisposed(this);
        if (!this.isStopped) {
          for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
            os[i].onNext(value);
          }
        }
      },
      /**
       * Unsubscribe all observers and release resources.
       */
      dispose: function () {
        this.isDisposed = true;
        this.observers = null;
      }
    });

    /**
     * Creates a subject from the specified observer and observable.
     * @param {Observer} observer The observer used to send messages to the subject.
     * @param {Observable} observable The observable used to subscribe to messages sent from the subject.
     * @returns {Subject} Subject implemented using the given observer and observable.
     */
    Subject.create = function (observer, observable) {
      return new AnonymousSubject(observer, observable);
    };

    return Subject;
  }(Observable));

  /**
   *  Represents the result of an asynchronous operation.
   *  The last value before the OnCompleted notification, or the error received through OnError, is sent to all subscribed observers.
   */
  var AsyncSubject = Rx.AsyncSubject = (function (__super__) {

    function subscribe(observer) {
      checkDisposed(this);

      if (!this.isStopped) {
        this.observers.push(observer);
        return new InnerSubscription(this, observer);
      }

      if (this.hasError) {
        observer.onError(this.error);
      } else if (this.hasValue) {
        observer.onNext(this.value);
        observer.onCompleted();
      } else {
        observer.onCompleted();
      }

      return disposableEmpty;
    }

    inherits(AsyncSubject, __super__);

    /**
     * Creates a subject that can only receive one value and that value is cached for all future observations.
     * @constructor
     */
    function AsyncSubject() {
      __super__.call(this, subscribe);

      this.isDisposed = false;
      this.isStopped = false;
      this.hasValue = false;
      this.observers = [];
      this.hasError = false;
    }

    addProperties(AsyncSubject.prototype, Observer, {
      /**
       * Indicates whether the subject has observers subscribed to it.
       * @returns {Boolean} Indicates whether the subject has observers subscribed to it.
       */
      hasObservers: function () {
        checkDisposed(this);
        return this.observers.length > 0;
      },
      /**
       * Notifies all subscribed observers about the end of the sequence, also causing the last received value to be sent out (if any).
       */
      onCompleted: function () {
        var i, len;
        checkDisposed(this);
        if (!this.isStopped) {
          this.isStopped = true;
          var os = cloneArray(this.observers), len = os.length;

          if (this.hasValue) {
            for (i = 0; i < len; i++) {
              var o = os[i];
              o.onNext(this.value);
              o.onCompleted();
            }
          } else {
            for (i = 0; i < len; i++) {
              os[i].onCompleted();
            }
          }

          this.observers.length = 0;
        }
      },
      /**
       * Notifies all subscribed observers about the error.
       * @param {Mixed} error The Error to send to all observers.
       */
      onError: function (error) {
        checkDisposed(this);
        if (!this.isStopped) {
          this.isStopped = true;
          this.hasError = true;
          this.error = error;

          for (var i = 0, os = cloneArray(this.observers), len = os.length; i < len; i++) {
            os[i].onError(error);
          }

          this.observers.length = 0;
        }
      },
      /**
       * Sends a value to the subject. The last value received before successful termination will be sent to all subscribed and future observers.
       * @param {Mixed} value The value to store in the subject.
       */
      onNext: function (value) {
        checkDisposed(this);
        if (this.isStopped) { return; }
        this.value = value;
        this.hasValue = true;
      },
      /**
       * Unsubscribe all observers and release resources.
       */
      dispose: function () {
        this.isDisposed = true;
        this.observers = null;
        this.exception = null;
        this.value = null;
      }
    });

    return AsyncSubject;
  }(Observable));

  var AnonymousSubject = Rx.AnonymousSubject = (function (__super__) {
    inherits(AnonymousSubject, __super__);

    function subscribe(observer) {
      return this.observable.subscribe(observer);
    }

    function AnonymousSubject(observer, observable) {
      this.observer = observer;
      this.observable = observable;
      __super__.call(this, subscribe);
    }

    addProperties(AnonymousSubject.prototype, Observer.prototype, {
      onCompleted: function () {
        this.observer.onCompleted();
      },
      onError: function (error) {
        this.observer.onError(error);
      },
      onNext: function (value) {
        this.observer.onNext(value);
      }
    });

    return AnonymousSubject;
  }(Observable));

  /**
  * Used to pause and resume streams.
  */
  Rx.Pauser = (function (__super__) {
    inherits(Pauser, __super__);

    function Pauser() {
      __super__.call(this);
    }

    /**
     * Pauses the underlying sequence.
     */
    Pauser.prototype.pause = function () { this.onNext(false); };

    /**
    * Resumes the underlying sequence.
    */
    Pauser.prototype.resume = function () { this.onNext(true); };

    return Pauser;
  }(Subject));

  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    root.Rx = Rx;

    define(function() {
      return Rx;
    });
  } else if (freeExports && freeModule) {
    // in Node.js or RingoJS
    if (moduleExports) {
      (freeModule.exports = Rx).Rx = Rx;
    } else {
      freeExports.Rx = Rx;
    }
  } else {
    // in a browser or Rhino
    root.Rx = Rx;
  }

  // All code before this point will be filtered from stack traces.
  var rEndingLine = captureLine();

}.call(this));

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":1}],3:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Alt = function (__superclass_Prelude$dotFunctor_0, alt) {
    this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
    this.alt = alt;
};
var altArray = new Alt(function () {
    return Prelude.functorArray;
}, Prelude.append(Prelude.semigroupArray));
var alt = function (dict) {
    return dict.alt;
};
var $less$bar$greater = function (__dict_Alt_0) {
    return alt(__dict_Alt_0);
};
module.exports = {
    Alt: Alt, 
    "<|>": $less$bar$greater, 
    alt: alt, 
    altArray: altArray
};

},{"Prelude":107}],4:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Alt = require("Control.Alt");
var Control_Lazy = require("Control.Lazy");
var Control_Plus = require("Control.Plus");
var Alternative = function (__superclass_Control$dotPlus$dotPlus_1, __superclass_Prelude$dotApplicative_0) {
    this["__superclass_Control.Plus.Plus_1"] = __superclass_Control$dotPlus$dotPlus_1;
    this["__superclass_Prelude.Applicative_0"] = __superclass_Prelude$dotApplicative_0;
};
var alternativeArray = new Alternative(function () {
    return Control_Plus.plusArray;
}, function () {
    return Prelude.applicativeArray;
});
module.exports = {
    Alternative: Alternative, 
    alternativeArray: alternativeArray
};

},{"Control.Alt":3,"Control.Lazy":10,"Control.Plus":38,"Prelude":107}],5:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var $less$times = function (__dict_Apply_0) {
    return function (a) {
        return function (b) {
            return Prelude["<*>"](__dict_Apply_0)(Prelude["<$>"](__dict_Apply_0["__superclass_Prelude.Functor_0"]())(Prelude["const"])(a))(b);
        };
    };
};
var $times$greater = function (__dict_Apply_1) {
    return function (a) {
        return function (b) {
            return Prelude["<*>"](__dict_Apply_1)(Prelude["<$>"](__dict_Apply_1["__superclass_Prelude.Functor_0"]())(Prelude["const"](Prelude.id(Prelude.categoryFn)))(a))(b);
        };
    };
};
var lift5 = function (__dict_Apply_2) {
    return function (f) {
        return function (a) {
            return function (b) {
                return function (c) {
                    return function (d) {
                        return function (e) {
                            return Prelude["<*>"](__dict_Apply_2)(Prelude["<*>"](__dict_Apply_2)(Prelude["<*>"](__dict_Apply_2)(Prelude["<*>"](__dict_Apply_2)(Prelude["<$>"](__dict_Apply_2["__superclass_Prelude.Functor_0"]())(f)(a))(b))(c))(d))(e);
                        };
                    };
                };
            };
        };
    };
};
var lift4 = function (__dict_Apply_3) {
    return function (f) {
        return function (a) {
            return function (b) {
                return function (c) {
                    return function (d) {
                        return Prelude["<*>"](__dict_Apply_3)(Prelude["<*>"](__dict_Apply_3)(Prelude["<*>"](__dict_Apply_3)(Prelude["<$>"](__dict_Apply_3["__superclass_Prelude.Functor_0"]())(f)(a))(b))(c))(d);
                    };
                };
            };
        };
    };
};
var lift3 = function (__dict_Apply_4) {
    return function (f) {
        return function (a) {
            return function (b) {
                return function (c) {
                    return Prelude["<*>"](__dict_Apply_4)(Prelude["<*>"](__dict_Apply_4)(Prelude["<$>"](__dict_Apply_4["__superclass_Prelude.Functor_0"]())(f)(a))(b))(c);
                };
            };
        };
    };
};
var lift2 = function (__dict_Apply_5) {
    return function (f) {
        return function (a) {
            return function (b) {
                return Prelude["<*>"](__dict_Apply_5)(Prelude["<$>"](__dict_Apply_5["__superclass_Prelude.Functor_0"]())(f)(a))(b);
            };
        };
    };
};
module.exports = {
    lift5: lift5, 
    lift4: lift4, 
    lift3: lift3, 
    lift2: lift2, 
    "*>": $times$greater, 
    "<*": $less$times
};

},{"Prelude":107}],6:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Biapply = require("Control.Biapply");
var Biapplicative = function (__superclass_Control$dotBiapply$dotBiapply_0, bipure) {
    this["__superclass_Control.Biapply.Biapply_0"] = __superclass_Control$dotBiapply$dotBiapply_0;
    this.bipure = bipure;
};
var bipure = function (dict) {
    return dict.bipure;
};
module.exports = {
    Biapplicative: Biapplicative, 
    bipure: bipure
};

},{"Control.Biapply":7,"Prelude":107}],7:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Bifunctor = require("Data.Bifunctor");
var Biapply = function (__superclass_Data$dotBifunctor$dotBifunctor_0, biapply) {
    this["__superclass_Data.Bifunctor.Bifunctor_0"] = __superclass_Data$dotBifunctor$dotBifunctor_0;
    this.biapply = biapply;
};
var $less$less$dollar$greater$greater = Prelude.id(Prelude.categoryFn);
var biapply = function (dict) {
    return dict.biapply;
};
var $less$less$times$greater$greater = function (__dict_Biapply_0) {
    return biapply(__dict_Biapply_0);
};
var bilift2 = function (__dict_Biapply_1) {
    return function (f) {
        return function (g) {
            return function (a) {
                return function (b) {
                    return $less$less$times$greater$greater(__dict_Biapply_1)($less$less$dollar$greater$greater(Data_Bifunctor.bimap(__dict_Biapply_1["__superclass_Data.Bifunctor.Bifunctor_0"]())(f)(g))(a))(b);
                };
            };
        };
    };
};
var bilift3 = function (__dict_Biapply_2) {
    return function (f) {
        return function (g) {
            return function (a) {
                return function (b) {
                    return function (c) {
                        return $less$less$times$greater$greater(__dict_Biapply_2)($less$less$times$greater$greater(__dict_Biapply_2)($less$less$dollar$greater$greater(Data_Bifunctor.bimap(__dict_Biapply_2["__superclass_Data.Bifunctor.Bifunctor_0"]())(f)(g))(a))(b))(c);
                    };
                };
            };
        };
    };
};
var $times$greater$greater = function (__dict_Biapply_3) {
    return function (a) {
        return function (b) {
            return $less$less$times$greater$greater(__dict_Biapply_3)($less$less$dollar$greater$greater(Data_Bifunctor.bimap(__dict_Biapply_3["__superclass_Data.Bifunctor.Bifunctor_0"]())(Prelude["const"](Prelude.id(Prelude.categoryFn)))(Prelude["const"](Prelude.id(Prelude.categoryFn))))(a))(b);
        };
    };
};
var $less$less$times = function (__dict_Biapply_4) {
    return function (a) {
        return function (b) {
            return $less$less$times$greater$greater(__dict_Biapply_4)($less$less$dollar$greater$greater(Data_Bifunctor.bimap(__dict_Biapply_4["__superclass_Data.Bifunctor.Bifunctor_0"]())(Prelude["const"])(Prelude["const"]))(a))(b);
        };
    };
};
module.exports = {
    Biapply: Biapply, 
    bilift3: bilift3, 
    bilift2: bilift2, 
    "<<*": $less$less$times, 
    "*>>": $times$greater$greater, 
    "<<*>>": $less$less$times$greater$greater, 
    biapply: biapply, 
    "<<$>>": $less$less$dollar$greater$greater
};

},{"Data.Bifunctor":46,"Prelude":107}],8:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Extend = require("Control.Extend");
var Comonad = function (__superclass_Control$dotExtend$dotExtend_0, extract) {
    this["__superclass_Control.Extend.Extend_0"] = __superclass_Control$dotExtend$dotExtend_0;
    this.extract = extract;
};
var extract = function (dict) {
    return dict.extract;
};
module.exports = {
    Comonad: Comonad, 
    extract: extract
};

},{"Control.Extend":9,"Prelude":107}],9:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Extend = function (__superclass_Prelude$dotFunctor_0, extend) {
    this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
    this.extend = extend;
};
var extendFn = function (__dict_Semigroup_0) {
    return new Extend(function () {
        return Prelude.functorFn;
    }, function (f) {
        return function (g) {
            return function (w) {
                return f(function (w$prime) {
                    return g(Prelude["<>"](__dict_Semigroup_0)(w)(w$prime));
                });
            };
        };
    });
};
var extend = function (dict) {
    return dict.extend;
};
var $less$less$eq = function (__dict_Extend_1) {
    return extend(__dict_Extend_1);
};
var $eq$less$eq = function (__dict_Extend_2) {
    return function (f) {
        return function (g) {
            return function (w) {
                return f($less$less$eq(__dict_Extend_2)(g)(w));
            };
        };
    };
};
var $eq$greater$eq = function (__dict_Extend_3) {
    return function (f) {
        return function (g) {
            return function (w) {
                return g($less$less$eq(__dict_Extend_3)(f)(w));
            };
        };
    };
};
var $eq$greater$greater = function (__dict_Extend_4) {
    return function (w) {
        return function (f) {
            return $less$less$eq(__dict_Extend_4)(f)(w);
        };
    };
};
var duplicate = function (__dict_Extend_5) {
    return extend(__dict_Extend_5)(Prelude.id(Prelude.categoryFn));
};
module.exports = {
    Extend: Extend, 
    duplicate: duplicate, 
    "=<=": $eq$less$eq, 
    "=>=": $eq$greater$eq, 
    "=>>": $eq$greater$greater, 
    "<<=": $less$less$eq, 
    extend: extend, 
    extendFn: extendFn
};

},{"Prelude":107}],10:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Lazy = function (defer) {
    this.defer = defer;
};
var defer = function (dict) {
    return dict.defer;
};
var fix = function (__dict_Lazy_0) {
    return function (f) {
        return defer(__dict_Lazy_0)(function (_263) {
            return f(fix(__dict_Lazy_0)(f));
        });
    };
};
module.exports = {
    Lazy: Lazy, 
    fix: fix, 
    defer: defer
};

},{"Prelude":107}],11:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
var MonadEff = function (__superclass_Prelude$dotMonad_0, liftEff) {
    this["__superclass_Prelude.Monad_0"] = __superclass_Prelude$dotMonad_0;
    this.liftEff = liftEff;
};
var monadEffEff = new MonadEff(function () {
    return Control_Monad_Eff.monadEff;
}, Prelude.id(Prelude.categoryFn));
var liftEff = function (dict) {
    return dict.liftEff;
};
module.exports = {
    MonadEff: MonadEff, 
    liftEff: liftEff, 
    monadEffEff: monadEffEff
};

},{"Control.Monad.Eff":23,"Prelude":107}],12:[function(require,module,exports){
/* global exports, console */
"use strict";

// module Control.Monad.Eff.Console

exports.log = function (s) {
  return function () {
    console.log(s);
    return {};
  };
};

exports.error = function (s) {
  return function () {
    console.error(s);
    return {};
  };
};

},{}],13:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
var print = function (__dict_Show_0) {
    return Prelude["<<<"](Prelude.semigroupoidFn)($foreign.log)(Prelude.show(__dict_Show_0));
};
module.exports = {
    print: print, 
    error: $foreign.error, 
    log: $foreign.log
};

},{"./foreign":12,"Control.Monad.Eff":23,"Prelude":107}],14:[function(require,module,exports){
/* global exports */
"use strict";

// module Control.Monad.Eff.Exception

exports.showErrorImpl = function (err) {
  return err.stack || err.toString();
};

exports.error = function (msg) {
  return new Error(msg);
};

exports.message = function (e) {
  return e.message;
};

exports.throwException = function (e) {
  return function () {
    throw e;
  };
};

exports.catchException = function (c) {
  return function (t) {
    return function () {
      try {
        return t();
      } catch (e) {
        if (e instanceof Error || Object.prototype.toString.call(e) === "[object Error]") {
          return c(e)();
        } else {
          return c(new Error(e.toString()))();
        }
      }
    };
  };
};

},{}],15:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
var showError = new Prelude.Show($foreign.showErrorImpl);
module.exports = {
    showError: showError, 
    catchException: $foreign.catchException, 
    throwException: $foreign.throwException, 
    message: $foreign.message, 
    error: $foreign.error
};

},{"./foreign":14,"Control.Monad.Eff":23,"Prelude":107}],16:[function(require,module,exports){
/* global exports */
"use strict";

// module Control.Monad.Eff.Random

exports.random = Math.random;

},{}],17:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Data_Maybe_Unsafe = require("Data.Maybe.Unsafe");
var Data_Int = require("Data.Int");
var $$Math = require("Math");
var Control_Monad_Eff = require("Control.Monad.Eff");
var randomRange = function (min) {
    return function (max) {
        return Prelude["<$>"](Control_Monad_Eff.functorEff)(Prelude["*"](Prelude.semiringNumber)((max - min) + min))($foreign.random);
    };
};
var randomInt = function (low) {
    return function (high) {
        return function __do() {
            var _22 = $foreign.random();
            return Prelude["<<<"](Prelude.semigroupoidFn)(Prelude.pure(Control_Monad_Eff.applicativeEff))(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Maybe_Unsafe.fromJust)(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Int.fromNumber)($$Math.floor)))(Data_Int.toNumber(Prelude["+"](Prelude.semiringInt)(Prelude["+"](Prelude.semiringInt)(Prelude["-"](Prelude.ringInt)(high)(low))(Prelude.one(Prelude.semiringInt)))(low)) * _22)();
        };
    };
};
var randomBool = Prelude["<$>"](Control_Monad_Eff.functorEff)(function (_2) {
    return _2 < 0.5;
})($foreign.random);
module.exports = {
    randomBool: randomBool, 
    randomRange: randomRange, 
    randomInt: randomInt, 
    random: $foreign.random
};

},{"./foreign":16,"Control.Monad.Eff":23,"Data.Int":77,"Data.Maybe.Unsafe":80,"Math":105,"Prelude":107}],18:[function(require,module,exports){
/* global exports */
"use strict";

// module Control.Monad.Eff.Ref

exports.newRef = function (val) {
  return function () {
    return { value: val };
  };
};

exports.readRef = function (ref) {
  return function () {
    return ref.value;
  };
};

exports["modifyRef'"] = function (ref) {
  return function (f) {
    return function () {
      var t = f(ref.value);
      ref.value = t.state;
      return t.value;
    };
  };
};

exports.writeRef = function (ref) {
  return function (val) {
    return function () {
      ref.value = val;
      return {};
    };
  };
};

},{}],19:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
var modifyRef = function (ref) {
    return function (f) {
        return $foreign["modifyRef'"](ref)(function (s) {
            return {
                state: f(s), 
                value: Prelude.unit
            };
        });
    };
};
module.exports = {
    modifyRef: modifyRef, 
    writeRef: $foreign.writeRef, 
    "modifyRef'": $foreign["modifyRef'"], 
    readRef: $foreign.readRef, 
    newRef: $foreign.newRef
};

},{"./foreign":18,"Control.Monad.Eff":23,"Prelude":107}],20:[function(require,module,exports){
/* global exports */
"use strict";

// module Control.Monad.Eff.Unsafe

exports.unsafeInterleaveEff = function (f) {
  return f;
};

},{}],21:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
module.exports = {
    unsafeInterleaveEff: $foreign.unsafeInterleaveEff
};

},{"./foreign":20,"Control.Monad.Eff":23,"Prelude":107}],22:[function(require,module,exports){
/* global exports */
"use strict";

// module Control.Monad.Eff

exports.returnE = function (a) {
  return function () {
    return a;
  };
};

exports.bindE = function (a) {
  return function (f) {
    return function () {
      return f(a())();
    };
  };
};

exports.runPure = function (f) {
  return f();
};

exports.untilE = function (f) {
  return function () {
    while (!f());
    return {};
  };
};

exports.whileE = function (f) {
  return function (a) {
    return function () {
      while (f()) {
        a();
      }
      return {};
    };
  };
};

exports.forE = function (lo) {
  return function (hi) {
    return function (f) {
      return function () {
        for (var i = lo; i < hi; i++) {
          f(i)();
        }
      };
    };
  };
};

exports.foreachE = function (as) {
  return function (f) {
    return function () {
      for (var i = 0, l = as.length; i < l; i++) {
        f(as[i])();
      }
    };
  };
};

},{}],23:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var monadEff = new Prelude.Monad(function () {
    return applicativeEff;
}, function () {
    return bindEff;
});
var bindEff = new Prelude.Bind(function () {
    return applyEff;
}, $foreign.bindE);
var applyEff = new Prelude.Apply(function () {
    return functorEff;
}, Prelude.ap(monadEff));
var applicativeEff = new Prelude.Applicative(function () {
    return applyEff;
}, $foreign.returnE);
var functorEff = new Prelude.Functor(Prelude.liftA1(applicativeEff));
module.exports = {
    functorEff: functorEff, 
    applyEff: applyEff, 
    applicativeEff: applicativeEff, 
    bindEff: bindEff, 
    monadEff: monadEff, 
    foreachE: $foreign.foreachE, 
    forE: $foreign.forE, 
    whileE: $foreign.whileE, 
    untilE: $foreign.untilE, 
    runPure: $foreign.runPure
};

},{"./foreign":22,"Prelude":107}],24:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Monad_Error_Trans = require("Control.Monad.Error.Trans");
var Control_Monad_Except_Trans = require("Control.Monad.Except.Trans");
var Control_Monad_Trans = require("Control.Monad.Trans");
var Control_Monad_Maybe_Trans = require("Control.Monad.Maybe.Trans");
var Control_Monad_Reader_Trans = require("Control.Monad.Reader.Trans");
var Control_Monad_Writer_Trans = require("Control.Monad.Writer.Trans");
var Control_Monad_State_Trans = require("Control.Monad.State.Trans");
var Control_Monad_Error = require("Control.Monad.Error");
var Data_Either = require("Data.Either");
var Data_Maybe = require("Data.Maybe");
var Data_Monoid = require("Data.Monoid");
var MonadError = function (catchError, throwError) {
    this.catchError = catchError;
    this.throwError = throwError;
};
var throwError = function (dict) {
    return dict.throwError;
};
var monadErrorMaybe = new MonadError(function (_621) {
    return function (f) {
        if (_621 instanceof Data_Maybe.Nothing) {
            return f(Prelude.unit);
        };
        if (_621 instanceof Data_Maybe.Just) {
            return new Data_Maybe.Just(_621.value0);
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Error/Class.purs line 60, column 1 - line 65, column 1: " + [ _621.constructor.name, f.constructor.name ]);
    };
}, Prelude["const"](Data_Maybe.Nothing.value));
var monadErrorExceptT = function (__dict_Monad_0) {
    return new MonadError(Control_Monad_Except_Trans.catchE(__dict_Monad_0), Control_Monad_Except_Trans.throwE(__dict_Monad_0["__superclass_Prelude.Applicative_0"]()));
};
var monadErrorErrorT = function (__dict_Monad_1) {
    return new MonadError(function (m) {
        return function (h) {
            return Control_Monad_Error_Trans.ErrorT(Prelude.bind(__dict_Monad_1["__superclass_Prelude.Bind_1"]())(Control_Monad_Error_Trans.runErrorT(m))(function (_51) {
                if (_51 instanceof Data_Either.Left) {
                    return Control_Monad_Error_Trans.runErrorT(h(_51.value0));
                };
                if (_51 instanceof Data_Either.Right) {
                    return Prelude["return"](__dict_Monad_1["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(_51.value0));
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Error/Class.purs line 65, column 1 - line 73, column 1: " + [ _51.constructor.name ]);
            }));
        };
    }, function (e) {
        return Control_Monad_Error_Trans.ErrorT(Prelude["return"](__dict_Monad_1["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(e)));
    });
};
var monadErrorEither = new MonadError(function (_620) {
    return function (h) {
        if (_620 instanceof Data_Either.Left) {
            return h(_620.value0);
        };
        if (_620 instanceof Data_Either.Right) {
            return new Data_Either.Right(_620.value0);
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Error/Class.purs line 55, column 1 - line 60, column 1: " + [ _620.constructor.name, h.constructor.name ]);
    };
}, Data_Either.Left.create);
var catchError = function (dict) {
    return dict.catchError;
};
var catchJust = function (__dict_MonadError_2) {
    return function (p) {
        return function (act) {
            return function (handler) {
                var handle = function (e) {
                    var _1084 = p(e);
                    if (_1084 instanceof Data_Maybe.Nothing) {
                        return throwError(__dict_MonadError_2)(e);
                    };
                    if (_1084 instanceof Data_Maybe.Just) {
                        return handler(_1084.value0);
                    };
                    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Error/Class.purs line 50, column 3 - line 55, column 1: " + [ _1084.constructor.name ]);
                };
                return catchError(__dict_MonadError_2)(act)(handle);
            };
        };
    };
};
var monadErrorMaybeT = function (__dict_Monad_3) {
    return function (__dict_MonadError_4) {
        return new MonadError(Control_Monad_Maybe_Trans.liftCatchMaybe(catchError(__dict_MonadError_4)), function (e) {
            return Control_Monad_Trans.lift(Control_Monad_Maybe_Trans.monadTransMaybeT)(__dict_Monad_3)(throwError(__dict_MonadError_4)(e));
        });
    };
};
var monadErrorReaderT = function (__dict_Monad_5) {
    return function (__dict_MonadError_6) {
        return new MonadError(Control_Monad_Reader_Trans.liftCatchReader(catchError(__dict_MonadError_6)), function (e) {
            return Control_Monad_Trans.lift(Control_Monad_Reader_Trans.monadTransReaderT)(__dict_Monad_5)(throwError(__dict_MonadError_6)(e));
        });
    };
};
var monadErrorStateT = function (__dict_Monad_7) {
    return function (__dict_MonadError_8) {
        return new MonadError(Control_Monad_State_Trans.liftCatchState(catchError(__dict_MonadError_8)), function (e) {
            return Control_Monad_Trans.lift(Control_Monad_State_Trans.monadTransStateT)(__dict_Monad_7)(throwError(__dict_MonadError_8)(e));
        });
    };
};
var monadErrorWriterT = function (__dict_Monad_9) {
    return function (__dict_Monoid_10) {
        return function (__dict_MonadError_11) {
            return new MonadError(Control_Monad_Writer_Trans.liftCatchWriter(catchError(__dict_MonadError_11)), function (e) {
                return Control_Monad_Trans.lift(Control_Monad_Writer_Trans.monadTransWriterT(__dict_Monoid_10))(__dict_Monad_9)(throwError(__dict_MonadError_11)(e));
            });
        };
    };
};
module.exports = {
    MonadError: MonadError, 
    catchJust: catchJust, 
    catchError: catchError, 
    throwError: throwError, 
    monadErrorEither: monadErrorEither, 
    monadErrorMaybe: monadErrorMaybe, 
    monadErrorErrorT: monadErrorErrorT, 
    monadErrorExceptT: monadErrorExceptT, 
    monadErrorMaybeT: monadErrorMaybeT, 
    monadErrorReaderT: monadErrorReaderT, 
    monadErrorWriterT: monadErrorWriterT, 
    monadErrorStateT: monadErrorStateT
};

},{"Control.Monad.Error":26,"Control.Monad.Error.Trans":25,"Control.Monad.Except.Trans":27,"Control.Monad.Maybe.Trans":28,"Control.Monad.Reader.Trans":29,"Control.Monad.State.Trans":33,"Control.Monad.Trans":34,"Control.Monad.Writer.Trans":35,"Data.Either":65,"Data.Maybe":81,"Data.Monoid":87,"Prelude":107}],25:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Apply = require("Control.Apply");
var Control_Monad_Error = require("Control.Monad.Error");
var Control_Monad_Rec_Class = require("Control.Monad.Rec.Class");
var Control_Monad_Trans = require("Control.Monad.Trans");
var Control_Monad_Eff_Class = require("Control.Monad.Eff.Class");
var Control_Alt = require("Control.Alt");
var Control_Alternative = require("Control.Alternative");
var Control_MonadPlus = require("Control.MonadPlus");
var Control_Plus = require("Control.Plus");
var Data_Either = require("Data.Either");
var Data_Monoid = require("Data.Monoid");
var Data_Tuple = require("Data.Tuple");
var ErrorT = function (x) {
    return x;
};
var runErrorT = function (_593) {
    return _593;
};
var monadTransErrorT = new Control_Monad_Trans.MonadTrans(function (__dict_Monad_2) {
    return function (m) {
        return ErrorT(Prelude.bind(__dict_Monad_2["__superclass_Prelude.Bind_1"]())(m)(function (_34) {
            return Prelude["return"](__dict_Monad_2["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(_34));
        }));
    };
});
var mapErrorT = function (f) {
    return function (m) {
        return ErrorT(f(runErrorT(m)));
    };
};
var liftPassError = function (__dict_Monad_10) {
    return function (pass) {
        return mapErrorT(function (m) {
            return pass(Prelude.bind(__dict_Monad_10["__superclass_Prelude.Bind_1"]())(m)(function (_36) {
                return Prelude["return"](__dict_Monad_10["__superclass_Prelude.Applicative_0"]())((function () {
                    if (_36 instanceof Data_Either.Left) {
                        return new Data_Tuple.Tuple(new Data_Either.Left(_36.value0), Prelude.id(Prelude.categoryFn));
                    };
                    if (_36 instanceof Data_Either.Right) {
                        return new Data_Tuple.Tuple(new Data_Either.Right(_36.value0.value0), _36.value0.value1);
                    };
                    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Error/Trans.purs line 87, column 1 - line 88, column 1: " + [ _36.constructor.name ]);
                })());
            }));
        });
    };
};
var liftListenError = function (__dict_Monad_11) {
    return function (listen) {
        return mapErrorT(function (m) {
            return Prelude.bind(__dict_Monad_11["__superclass_Prelude.Bind_1"]())(listen(m))(function (_35) {
                return Prelude["return"](__dict_Monad_11["__superclass_Prelude.Applicative_0"]())(Prelude["<$>"](Data_Either.functorEither)(function (r) {
                    return new Data_Tuple.Tuple(r, _35.value1);
                })(_35.value0));
            });
        });
    };
};
var liftCallCCError = function (callCC) {
    return function (f) {
        return ErrorT(callCC(function (c) {
            return runErrorT(f(function (a) {
                return ErrorT(c(new Data_Either.Right(a)));
            }));
        }));
    };
};
var functorErrorT = function (__dict_Functor_12) {
    return new Prelude.Functor(function (f) {
        return Prelude["<<<"](Prelude.semigroupoidFn)(ErrorT)(Prelude["<<<"](Prelude.semigroupoidFn)(Prelude["<$>"](__dict_Functor_12)(Prelude["<$>"](Data_Either.functorEither)(f)))(runErrorT));
    });
};
var applyErrorT = function (__dict_Apply_14) {
    return new Prelude.Apply(function () {
        return functorErrorT(__dict_Apply_14["__superclass_Prelude.Functor_0"]());
    }, function (_594) {
        return function (_595) {
            return ErrorT(Prelude["<*>"](__dict_Apply_14)(Prelude["<$>"](__dict_Apply_14["__superclass_Prelude.Functor_0"]())(Control_Apply.lift2(Data_Either.applyEither)(Prelude["$"]))(_594))(_595));
        };
    });
};
var bindErrorT = function (__dict_Monad_13) {
    return new Prelude.Bind(function () {
        return applyErrorT((__dict_Monad_13["__superclass_Prelude.Applicative_0"]())["__superclass_Prelude.Apply_0"]());
    }, function (m) {
        return function (f) {
            return ErrorT(Prelude.bind(__dict_Monad_13["__superclass_Prelude.Bind_1"]())(runErrorT(m))(function (_32) {
                if (_32 instanceof Data_Either.Left) {
                    return Prelude["return"](__dict_Monad_13["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(_32.value0));
                };
                if (_32 instanceof Data_Either.Right) {
                    return runErrorT(f(_32.value0));
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Error/Trans.purs line 55, column 1 - line 62, column 1: " + [ _32.constructor.name ]);
            }));
        };
    });
};
var applicativeErrorT = function (__dict_Applicative_15) {
    return new Prelude.Applicative(function () {
        return applyErrorT(__dict_Applicative_15["__superclass_Prelude.Apply_0"]());
    }, function (a) {
        return ErrorT(Prelude.pure(__dict_Applicative_15)(new Data_Either.Right(a)));
    });
};
var monadErrorT = function (__dict_Monad_7) {
    return new Prelude.Monad(function () {
        return applicativeErrorT(__dict_Monad_7["__superclass_Prelude.Applicative_0"]());
    }, function () {
        return bindErrorT(__dict_Monad_7);
    });
};
var monadEffError = function (__dict_Monad_8) {
    return function (__dict_MonadEff_9) {
        return new Control_Monad_Eff_Class.MonadEff(function () {
            return monadErrorT(__dict_Monad_8);
        }, Prelude["<<<"](Prelude.semigroupoidFn)(Control_Monad_Trans.lift(monadTransErrorT)(__dict_Monad_8))(Control_Monad_Eff_Class.liftEff(__dict_MonadEff_9)));
    };
};
var monadRecErrorT = function (__dict_Error_3) {
    return function (__dict_MonadRec_4) {
        return new Control_Monad_Rec_Class.MonadRec(function () {
            return monadErrorT(__dict_MonadRec_4["__superclass_Prelude.Monad_0"]());
        }, function (f) {
            return Prelude["<<<"](Prelude.semigroupoidFn)(ErrorT)(Control_Monad_Rec_Class.tailRecM(__dict_MonadRec_4)(function (a) {
                return Prelude.bind((__dict_MonadRec_4["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(runErrorT(f(a)))(function (_33) {
                    return Prelude["return"]((__dict_MonadRec_4["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())((function () {
                        if (_33 instanceof Data_Either.Left) {
                            return new Data_Either.Right(new Data_Either.Left(_33.value0));
                        };
                        if (_33 instanceof Data_Either.Right && _33.value0 instanceof Data_Either.Left) {
                            return new Data_Either.Left(_33.value0.value0);
                        };
                        if (_33 instanceof Data_Either.Right && _33.value0 instanceof Data_Either.Right) {
                            return new Data_Either.Right(new Data_Either.Right(_33.value0.value0));
                        };
                        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Error/Trans.purs line 64, column 1 - line 72, column 1: " + [ _33.constructor.name ]);
                    })());
                });
            }));
        });
    };
};
var altErrorT = function (__dict_Monad_18) {
    return new Control_Alt.Alt(function () {
        return functorErrorT(((__dict_Monad_18["__superclass_Prelude.Applicative_0"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]());
    }, function (x) {
        return function (y) {
            return ErrorT(Prelude[">>="](__dict_Monad_18["__superclass_Prelude.Bind_1"]())(runErrorT(x))(function (e) {
                if (e instanceof Data_Either.Left) {
                    return runErrorT(y);
                };
                return Prelude["return"](__dict_Monad_18["__superclass_Prelude.Applicative_0"]())(e);
            }));
        };
    });
};
var plusErrorT = function (__dict_Monad_0) {
    return function (__dict_Error_1) {
        return new Control_Plus.Plus(function () {
            return altErrorT(__dict_Monad_0);
        }, Prelude["return"](__dict_Monad_0["__superclass_Prelude.Applicative_0"]())(Data_Either.Left.create(Control_Monad_Error.strMsg(__dict_Error_1)("No alternative"))));
    };
};
var alternativeErrorT = function (__dict_Monad_16) {
    return function (__dict_Error_17) {
        return new Control_Alternative.Alternative(function () {
            return plusErrorT(__dict_Monad_16)(__dict_Error_17);
        }, function () {
            return applicativeErrorT(__dict_Monad_16["__superclass_Prelude.Applicative_0"]());
        });
    };
};
var monadPlusErrorT = function (__dict_Monad_5) {
    return function (__dict_Error_6) {
        return new Control_MonadPlus.MonadPlus(function () {
            return alternativeErrorT(__dict_Monad_5)(__dict_Error_6);
        }, function () {
            return monadErrorT(__dict_Monad_5);
        });
    };
};
module.exports = {
    ErrorT: ErrorT, 
    liftCallCCError: liftCallCCError, 
    liftPassError: liftPassError, 
    liftListenError: liftListenError, 
    mapErrorT: mapErrorT, 
    runErrorT: runErrorT, 
    functorErrorT: functorErrorT, 
    applyErrorT: applyErrorT, 
    applicativeErrorT: applicativeErrorT, 
    altErrorT: altErrorT, 
    plusErrorT: plusErrorT, 
    alternativeErrorT: alternativeErrorT, 
    bindErrorT: bindErrorT, 
    monadErrorT: monadErrorT, 
    monadRecErrorT: monadRecErrorT, 
    monadPlusErrorT: monadPlusErrorT, 
    monadTransErrorT: monadTransErrorT, 
    monadEffError: monadEffError
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Apply":5,"Control.Monad.Eff.Class":11,"Control.Monad.Error":26,"Control.Monad.Rec.Class":30,"Control.Monad.Trans":34,"Control.MonadPlus":37,"Control.Plus":38,"Data.Either":65,"Data.Monoid":87,"Data.Tuple":95,"Prelude":107}],26:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var $$Error = function (noMsg, strMsg) {
    this.noMsg = noMsg;
    this.strMsg = strMsg;
};
var strMsg = function (dict) {
    return dict.strMsg;
};
var noMsg = function (dict) {
    return dict.noMsg;
};
var errorString = new $$Error("", Prelude.id(Prelude.categoryFn));
module.exports = {
    "Error": $$Error, 
    strMsg: strMsg, 
    noMsg: noMsg, 
    errorString: errorString
};

},{"Prelude":107}],27:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Either = require("Data.Either");
var Control_Monad_Rec_Class = require("Control.Monad.Rec.Class");
var Data_Monoid = require("Data.Monoid");
var Control_Monad_Trans = require("Control.Monad.Trans");
var Control_Monad_Eff_Class = require("Control.Monad.Eff.Class");
var Control_Alt = require("Control.Alt");
var Control_Alternative = require("Control.Alternative");
var Control_MonadPlus = require("Control.MonadPlus");
var Control_Plus = require("Control.Plus");
var ExceptT = function (x) {
    return x;
};
var throwE = function (__dict_Applicative_0) {
    return Prelude["<<<"](Prelude.semigroupoidFn)(ExceptT)(Prelude["<<<"](Prelude.semigroupoidFn)(Prelude.pure(__dict_Applicative_0))(Data_Either.Left.create));
};
var runExceptT = function (_519) {
    return _519;
};
var withExceptT = function (__dict_Functor_1) {
    return function (f) {
        var mapLeft = function (f_1) {
            return function (_520) {
                if (_520 instanceof Data_Either.Right) {
                    return new Data_Either.Right(_520.value0);
                };
                if (_520 instanceof Data_Either.Left) {
                    return new Data_Either.Left(f_1(_520.value0));
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Except/Trans.purs line 30, column 3 - line 31, column 3: " + [ f_1.constructor.name, _520.constructor.name ]);
            };
        };
        return Prelude["<<<"](Prelude.semigroupoidFn)(ExceptT)(Prelude["<<<"](Prelude.semigroupoidFn)(Prelude["<$>"](__dict_Functor_1)(mapLeft(f)))(runExceptT));
    };
};
var monadTransExceptT = new Control_Monad_Trans.MonadTrans(function (__dict_Monad_4) {
    return function (m) {
        return ExceptT(Prelude.bind(__dict_Monad_4["__superclass_Prelude.Bind_1"]())(m)(function (_30) {
            return Prelude["return"](__dict_Monad_4["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(_30));
        }));
    };
});
var mapExceptT = function (f) {
    return function (m) {
        return f(runExceptT(m));
    };
};
var functorExceptT = function (__dict_Functor_12) {
    return new Prelude.Functor(function (f) {
        return mapExceptT(Prelude["<$>"](__dict_Functor_12)(Prelude["<$>"](Data_Either.functorEither)(f)));
    });
};
var catchE = function (__dict_Monad_13) {
    return function (m) {
        return function (handler) {
            return Prelude[">>="](__dict_Monad_13["__superclass_Prelude.Bind_1"]())(runExceptT(m))(Data_Either.either(Prelude["<<<"](Prelude.semigroupoidFn)(runExceptT)(handler))(Prelude["<<<"](Prelude.semigroupoidFn)(Prelude.pure(__dict_Monad_13["__superclass_Prelude.Applicative_0"]()))(Data_Either.Right.create)));
        };
    };
};
var applyExceptT = function (__dict_Apply_15) {
    return new Prelude.Apply(function () {
        return functorExceptT(__dict_Apply_15["__superclass_Prelude.Functor_0"]());
    }, function (_521) {
        return function (_522) {
            var f$prime = Prelude["<$>"](__dict_Apply_15["__superclass_Prelude.Functor_0"]())(Prelude["<*>"](Data_Either.applyEither))(_521);
            var x$prime = Prelude["<*>"](__dict_Apply_15)(f$prime)(_522);
            return x$prime;
        };
    });
};
var bindExceptT = function (__dict_Monad_14) {
    return new Prelude.Bind(function () {
        return applyExceptT((__dict_Monad_14["__superclass_Prelude.Applicative_0"]())["__superclass_Prelude.Apply_0"]());
    }, function (m) {
        return function (k) {
            return Prelude[">>="](__dict_Monad_14["__superclass_Prelude.Bind_1"]())(runExceptT(m))(Data_Either.either(Prelude["<<<"](Prelude.semigroupoidFn)(Prelude["return"](__dict_Monad_14["__superclass_Prelude.Applicative_0"]()))(Data_Either.Left.create))(Prelude["<<<"](Prelude.semigroupoidFn)(runExceptT)(k)));
        };
    });
};
var applicativeExceptT = function (__dict_Applicative_16) {
    return new Prelude.Applicative(function () {
        return applyExceptT(__dict_Applicative_16["__superclass_Prelude.Apply_0"]());
    }, Prelude["<<<"](Prelude.semigroupoidFn)(ExceptT)(Prelude["<<<"](Prelude.semigroupoidFn)(Prelude.pure(__dict_Applicative_16))(Data_Either.Right.create)));
};
var monadExceptT = function (__dict_Monad_9) {
    return new Prelude.Monad(function () {
        return applicativeExceptT(__dict_Monad_9["__superclass_Prelude.Applicative_0"]());
    }, function () {
        return bindExceptT(__dict_Monad_9);
    });
};
var monadEffExceptT = function (__dict_Monad_10) {
    return function (__dict_MonadEff_11) {
        return new Control_Monad_Eff_Class.MonadEff(function () {
            return monadExceptT(__dict_Monad_10);
        }, Prelude["<<<"](Prelude.semigroupoidFn)(Control_Monad_Trans.lift(monadTransExceptT)(__dict_Monad_10))(Control_Monad_Eff_Class.liftEff(__dict_MonadEff_11)));
    };
};
var monadRecErrorT = function (__dict_Semigroup_5) {
    return function (__dict_MonadRec_6) {
        return new Control_Monad_Rec_Class.MonadRec(function () {
            return monadExceptT(__dict_MonadRec_6["__superclass_Prelude.Monad_0"]());
        }, function (f) {
            return Prelude["<<<"](Prelude.semigroupoidFn)(ExceptT)(Control_Monad_Rec_Class.tailRecM(__dict_MonadRec_6)(function (a) {
                return Prelude.bind((__dict_MonadRec_6["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(runExceptT(f(a)))(function (_27) {
                    return Prelude["return"]((__dict_MonadRec_6["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())((function () {
                        if (_27 instanceof Data_Either.Left) {
                            return new Data_Either.Right(new Data_Either.Left(_27.value0));
                        };
                        if (_27 instanceof Data_Either.Right && _27.value0 instanceof Data_Either.Left) {
                            return new Data_Either.Left(_27.value0.value0);
                        };
                        if (_27 instanceof Data_Either.Right && _27.value0 instanceof Data_Either.Right) {
                            return new Data_Either.Right(new Data_Either.Right(_27.value0.value0));
                        };
                        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Except/Trans.purs line 55, column 1 - line 63, column 1: " + [ _27.constructor.name ]);
                    })());
                });
            }));
        });
    };
};
var altExceptT = function (__dict_Semigroup_19) {
    return function (__dict_Monad_20) {
        return new Control_Alt.Alt(function () {
            return functorExceptT(((__dict_Monad_20["__superclass_Prelude.Applicative_0"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]());
        }, function (m) {
            return function (n) {
                return ExceptT(Prelude.bind(__dict_Monad_20["__superclass_Prelude.Bind_1"]())(runExceptT(m))(function (_29) {
                    if (_29 instanceof Data_Either.Right) {
                        return Prelude.pure(__dict_Monad_20["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(_29.value0));
                    };
                    if (_29 instanceof Data_Either.Left) {
                        return Prelude.bind(__dict_Monad_20["__superclass_Prelude.Bind_1"]())(runExceptT(n))(function (_28) {
                            if (_28 instanceof Data_Either.Right) {
                                return Prelude.pure(__dict_Monad_20["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(_28.value0));
                            };
                            if (_28 instanceof Data_Either.Left) {
                                return Prelude.pure(__dict_Monad_20["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(Prelude["<>"](__dict_Semigroup_19)(_29.value0)(_28.value0)));
                            };
                            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Except/Trans.purs line 63, column 1 - line 74, column 1: " + [ _28.constructor.name ]);
                        });
                    };
                    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Except/Trans.purs line 63, column 1 - line 74, column 1: " + [ _29.constructor.name ]);
                }));
            };
        });
    };
};
var plusExceptT = function (__dict_Monoid_2) {
    return function (__dict_Monad_3) {
        return new Control_Plus.Plus(function () {
            return altExceptT(__dict_Monoid_2["__superclass_Prelude.Semigroup_0"]())(__dict_Monad_3);
        }, throwE(__dict_Monad_3["__superclass_Prelude.Applicative_0"]())(Data_Monoid.mempty(__dict_Monoid_2)));
    };
};
var alternativeExceptT = function (__dict_Monoid_17) {
    return function (__dict_Monad_18) {
        return new Control_Alternative.Alternative(function () {
            return plusExceptT(__dict_Monoid_17)(__dict_Monad_18);
        }, function () {
            return applicativeExceptT(__dict_Monad_18["__superclass_Prelude.Applicative_0"]());
        });
    };
};
var monadPlusExceptT = function (__dict_Monoid_7) {
    return function (__dict_Monad_8) {
        return new Control_MonadPlus.MonadPlus(function () {
            return alternativeExceptT(__dict_Monoid_7)(__dict_Monad_8);
        }, function () {
            return monadExceptT(__dict_Monad_8);
        });
    };
};
module.exports = {
    ExceptT: ExceptT, 
    catchE: catchE, 
    throwE: throwE, 
    mapExceptT: mapExceptT, 
    withExceptT: withExceptT, 
    runExceptT: runExceptT, 
    functorExceptT: functorExceptT, 
    applyExceptT: applyExceptT, 
    applicativeExceptT: applicativeExceptT, 
    bindExceptT: bindExceptT, 
    monadExceptT: monadExceptT, 
    monadRecErrorT: monadRecErrorT, 
    altExceptT: altExceptT, 
    plusExceptT: plusExceptT, 
    alternativeExceptT: alternativeExceptT, 
    monadPlusExceptT: monadPlusExceptT, 
    monadTransExceptT: monadTransExceptT, 
    monadEffExceptT: monadEffExceptT
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Monad.Eff.Class":11,"Control.Monad.Rec.Class":30,"Control.Monad.Trans":34,"Control.MonadPlus":37,"Control.Plus":38,"Data.Either":65,"Data.Monoid":87,"Prelude":107}],28:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Monad_Rec_Class = require("Control.Monad.Rec.Class");
var Control_Monad_Trans = require("Control.Monad.Trans");
var Control_Monad_Eff_Class = require("Control.Monad.Eff.Class");
var Control_Alt = require("Control.Alt");
var Control_Alternative = require("Control.Alternative");
var Control_Monad = require("Control.Monad");
var Control_MonadPlus = require("Control.MonadPlus");
var Control_Plus = require("Control.Plus");
var Data_Either = require("Data.Either");
var Data_Maybe = require("Data.Maybe");
var Data_Tuple = require("Data.Tuple");
var MaybeT = function (x) {
    return x;
};
var runMaybeT = function (_596) {
    return _596;
};
var monadTransMaybeT = new Control_Monad_Trans.MonadTrans(function (__dict_Monad_1) {
    return Prelude["<<<"](Prelude.semigroupoidFn)(MaybeT)(Prelude.liftM1(__dict_Monad_1)(Data_Maybe.Just.create));
});
var mapMaybeT = function (f) {
    return Prelude["<<<"](Prelude.semigroupoidFn)(MaybeT)(Prelude["<<<"](Prelude.semigroupoidFn)(f)(runMaybeT));
};
var liftPassMaybe = function (__dict_Monad_7) {
    return function (pass) {
        return mapMaybeT(function (m) {
            return pass(Prelude.bind(__dict_Monad_7["__superclass_Prelude.Bind_1"]())(m)(function (_41) {
                return Prelude["return"](__dict_Monad_7["__superclass_Prelude.Applicative_0"]())((function () {
                    if (_41 instanceof Data_Maybe.Nothing) {
                        return new Data_Tuple.Tuple(Data_Maybe.Nothing.value, Prelude.id(Prelude.categoryFn));
                    };
                    if (_41 instanceof Data_Maybe.Just) {
                        return new Data_Tuple.Tuple(new Data_Maybe.Just(_41.value0.value0), _41.value0.value1);
                    };
                    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Maybe/Trans.purs line 87, column 1 - line 88, column 1: " + [ _41.constructor.name ]);
                })());
            }));
        });
    };
};
var liftListenMaybe = function (__dict_Monad_8) {
    return function (listen) {
        return mapMaybeT(function (m) {
            return Prelude.bind(__dict_Monad_8["__superclass_Prelude.Bind_1"]())(listen(m))(function (_40) {
                return Prelude["return"](__dict_Monad_8["__superclass_Prelude.Applicative_0"]())(Prelude["<$>"](Data_Maybe.functorMaybe)(function (r) {
                    return new Data_Tuple.Tuple(r, _40.value1);
                })(_40.value0));
            });
        });
    };
};
var liftCatchMaybe = function ($$catch) {
    return function (m) {
        return function (h) {
            return MaybeT($$catch(runMaybeT(m))(Prelude["<<<"](Prelude.semigroupoidFn)(runMaybeT)(h)));
        };
    };
};
var liftCallCCMaybe = function (callCC) {
    return function (f) {
        return MaybeT(callCC(function (c) {
            return runMaybeT(f(function (a) {
                return MaybeT(c(new Data_Maybe.Just(a)));
            }));
        }));
    };
};
var monadMaybeT = function (__dict_Monad_4) {
    return new Prelude.Monad(function () {
        return applicativeMaybeT(__dict_Monad_4);
    }, function () {
        return bindMaybeT(__dict_Monad_4);
    });
};
var functorMaybeT = function (__dict_Monad_9) {
    return new Prelude.Functor(Prelude.liftA1(applicativeMaybeT(__dict_Monad_9)));
};
var bindMaybeT = function (__dict_Monad_10) {
    return new Prelude.Bind(function () {
        return applyMaybeT(__dict_Monad_10);
    }, function (x) {
        return function (f) {
            return MaybeT(Prelude.bind(__dict_Monad_10["__superclass_Prelude.Bind_1"]())(runMaybeT(x))(function (_37) {
                if (_37 instanceof Data_Maybe.Nothing) {
                    return Prelude["return"](__dict_Monad_10["__superclass_Prelude.Applicative_0"]())(Data_Maybe.Nothing.value);
                };
                if (_37 instanceof Data_Maybe.Just) {
                    return runMaybeT(f(_37.value0));
                };
                throw new Error("Failed pattern match: " + [ _37.constructor.name ]);
            }));
        };
    });
};
var applyMaybeT = function (__dict_Monad_11) {
    return new Prelude.Apply(function () {
        return functorMaybeT(__dict_Monad_11);
    }, Prelude.ap(monadMaybeT(__dict_Monad_11)));
};
var applicativeMaybeT = function (__dict_Monad_12) {
    return new Prelude.Applicative(function () {
        return applyMaybeT(__dict_Monad_12);
    }, Prelude["<<<"](Prelude.semigroupoidFn)(MaybeT)(Prelude["<<<"](Prelude.semigroupoidFn)(Prelude.pure(__dict_Monad_12["__superclass_Prelude.Applicative_0"]()))(Data_Maybe.Just.create)));
};
var monadEffMaybe = function (__dict_Monad_5) {
    return function (__dict_MonadEff_6) {
        return new Control_Monad_Eff_Class.MonadEff(function () {
            return monadMaybeT(__dict_Monad_5);
        }, Prelude["<<<"](Prelude.semigroupoidFn)(Control_Monad_Trans.lift(monadTransMaybeT)(__dict_Monad_5))(Control_Monad_Eff_Class.liftEff(__dict_MonadEff_6)));
    };
};
var monadRecMaybeT = function (__dict_MonadRec_2) {
    return new Control_Monad_Rec_Class.MonadRec(function () {
        return monadMaybeT(__dict_MonadRec_2["__superclass_Prelude.Monad_0"]());
    }, function (f) {
        return Prelude["<<<"](Prelude.semigroupoidFn)(MaybeT)(Control_Monad_Rec_Class.tailRecM(__dict_MonadRec_2)(function (a) {
            return Prelude.bind((__dict_MonadRec_2["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(runMaybeT(f(a)))(function (_39) {
                return Prelude["return"]((__dict_MonadRec_2["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())((function () {
                    if (_39 instanceof Data_Maybe.Nothing) {
                        return new Data_Either.Right(Data_Maybe.Nothing.value);
                    };
                    if (_39 instanceof Data_Maybe.Just && _39.value0 instanceof Data_Either.Left) {
                        return new Data_Either.Left(_39.value0.value0);
                    };
                    if (_39 instanceof Data_Maybe.Just && _39.value0 instanceof Data_Either.Right) {
                        return new Data_Either.Right(new Data_Maybe.Just(_39.value0.value0));
                    };
                    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Maybe/Trans.purs line 68, column 1 - line 76, column 1: " + [ _39.constructor.name ]);
                })());
            });
        }));
    });
};
var altMaybeT = function (__dict_Monad_14) {
    return new Control_Alt.Alt(function () {
        return functorMaybeT(__dict_Monad_14);
    }, function (m1) {
        return function (m2) {
            return Prelude.bind(__dict_Monad_14["__superclass_Prelude.Bind_1"]())(runMaybeT(m1))(function (_38) {
                if (_38 instanceof Data_Maybe.Nothing) {
                    return runMaybeT(m2);
                };
                return Prelude["return"](__dict_Monad_14["__superclass_Prelude.Applicative_0"]())(_38);
            });
        };
    });
};
var plusMaybeT = function (__dict_Monad_0) {
    return new Control_Plus.Plus(function () {
        return altMaybeT(__dict_Monad_0);
    }, Prelude.pure(__dict_Monad_0["__superclass_Prelude.Applicative_0"]())(Data_Maybe.Nothing.value));
};
var alternativeMaybeT = function (__dict_Monad_13) {
    return new Control_Alternative.Alternative(function () {
        return plusMaybeT(__dict_Monad_13);
    }, function () {
        return applicativeMaybeT(__dict_Monad_13);
    });
};
var monadPlusMaybeT = function (__dict_Monad_3) {
    return new Control_MonadPlus.MonadPlus(function () {
        return alternativeMaybeT(__dict_Monad_3);
    }, function () {
        return monadMaybeT(__dict_Monad_3);
    });
};
module.exports = {
    MaybeT: MaybeT, 
    liftCallCCMaybe: liftCallCCMaybe, 
    liftPassMaybe: liftPassMaybe, 
    liftListenMaybe: liftListenMaybe, 
    liftCatchMaybe: liftCatchMaybe, 
    mapMaybeT: mapMaybeT, 
    runMaybeT: runMaybeT, 
    functorMaybeT: functorMaybeT, 
    applyMaybeT: applyMaybeT, 
    applicativeMaybeT: applicativeMaybeT, 
    bindMaybeT: bindMaybeT, 
    monadMaybeT: monadMaybeT, 
    monadTransMaybeT: monadTransMaybeT, 
    altMaybeT: altMaybeT, 
    plusMaybeT: plusMaybeT, 
    alternativeMaybeT: alternativeMaybeT, 
    monadPlusMaybeT: monadPlusMaybeT, 
    monadRecMaybeT: monadRecMaybeT, 
    monadEffMaybe: monadEffMaybe
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Monad":36,"Control.Monad.Eff.Class":11,"Control.Monad.Rec.Class":30,"Control.Monad.Trans":34,"Control.MonadPlus":37,"Control.Plus":38,"Data.Either":65,"Data.Maybe":81,"Data.Tuple":95,"Prelude":107}],29:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Alt = require("Control.Alt");
var Control_Plus = require("Control.Plus");
var Control_Monad_Trans = require("Control.Monad.Trans");
var Control_Monad_Eff_Class = require("Control.Monad.Eff.Class");
var Data_Distributive = require("Data.Distributive");
var Control_Alternative = require("Control.Alternative");
var Control_MonadPlus = require("Control.MonadPlus");
var ReaderT = function (x) {
    return x;
};
var runReaderT = function (_523) {
    return _523;
};
var withReaderT = function (f) {
    return function (m) {
        return ReaderT(Prelude["<<<"](Prelude.semigroupoidFn)(runReaderT(m))(f));
    };
};
var mapReaderT = function (f) {
    return function (m) {
        return ReaderT(Prelude["<<<"](Prelude.semigroupoidFn)(f)(runReaderT(m)));
    };
};
var liftReaderT = function (m) {
    return Prelude["const"](m);
};
var monadTransReaderT = new Control_Monad_Trans.MonadTrans(function (__dict_Monad_4) {
    return liftReaderT;
});
var liftCatchReader = function ($$catch) {
    return function (m) {
        return function (h) {
            return ReaderT(function (r) {
                return $$catch(runReaderT(m)(r))(function (e) {
                    return runReaderT(h(e))(r);
                });
            });
        };
    };
};
var liftCallCCReader = function (callCC) {
    return function (f) {
        return ReaderT(function (r) {
            return callCC(function (c) {
                return runReaderT(f(function (a) {
                    return ReaderT(Prelude["const"](c(a)));
                }))(r);
            });
        });
    };
};
var functorReaderT = function (__dict_Functor_6) {
    return new Prelude.Functor(function (f) {
        return mapReaderT(Prelude["<$>"](__dict_Functor_6)(f));
    });
};
var distributiveReaderT = function (__dict_Distributive_7) {
    return new Data_Distributive.Distributive(function () {
        return functorReaderT(__dict_Distributive_7["__superclass_Prelude.Functor_0"]());
    }, function (__dict_Functor_9) {
        return function (f) {
            return Prelude["<<<"](Prelude.semigroupoidFn)(Data_Distributive.distribute(distributiveReaderT(__dict_Distributive_7))(__dict_Functor_9))(Prelude.map(__dict_Functor_9)(f));
        };
    }, function (__dict_Functor_8) {
        return function (a) {
            return function (e) {
                return Data_Distributive.collect(__dict_Distributive_7)(__dict_Functor_8)(Prelude.flip(runReaderT)(e))(a);
            };
        };
    });
};
var applyReaderT = function (__dict_Applicative_11) {
    return new Prelude.Apply(function () {
        return functorReaderT((__dict_Applicative_11["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]());
    }, function (f) {
        return function (v) {
            return function (r) {
                return Prelude["<*>"](__dict_Applicative_11["__superclass_Prelude.Apply_0"]())(runReaderT(f)(r))(runReaderT(v)(r));
            };
        };
    });
};
var bindReaderT = function (__dict_Monad_10) {
    return new Prelude.Bind(function () {
        return applyReaderT(__dict_Monad_10["__superclass_Prelude.Applicative_0"]());
    }, function (m) {
        return function (k) {
            return function (r) {
                return Prelude.bind(__dict_Monad_10["__superclass_Prelude.Bind_1"]())(runReaderT(m)(r))(function (_31) {
                    return runReaderT(k(_31))(r);
                });
            };
        };
    });
};
var applicativeReaderT = function (__dict_Applicative_12) {
    return new Prelude.Applicative(function () {
        return applyReaderT(__dict_Applicative_12);
    }, Prelude["<<<"](Prelude.semigroupoidFn)(liftReaderT)(Prelude.pure(__dict_Applicative_12)));
};
var monadReaderT = function (__dict_Monad_0) {
    return new Prelude.Monad(function () {
        return applicativeReaderT(__dict_Monad_0["__superclass_Prelude.Applicative_0"]());
    }, function () {
        return bindReaderT(__dict_Monad_0);
    });
};
var monadEffReader = function (__dict_Monad_2) {
    return function (__dict_MonadEff_3) {
        return new Control_Monad_Eff_Class.MonadEff(function () {
            return monadReaderT(__dict_Monad_2);
        }, Prelude["<<<"](Prelude.semigroupoidFn)(Control_Monad_Trans.lift(monadTransReaderT)(__dict_Monad_2))(Control_Monad_Eff_Class.liftEff(__dict_MonadEff_3)));
    };
};
var altReaderT = function (__dict_Alt_14) {
    return new Control_Alt.Alt(function () {
        return functorReaderT(__dict_Alt_14["__superclass_Prelude.Functor_0"]());
    }, function (m) {
        return function (n) {
            return function (r) {
                return Control_Alt["<|>"](__dict_Alt_14)(runReaderT(m)(r))(runReaderT(n)(r));
            };
        };
    });
};
var plusReaderT = function (__dict_Plus_5) {
    return new Control_Plus.Plus(function () {
        return altReaderT(__dict_Plus_5["__superclass_Control.Alt.Alt_0"]());
    }, liftReaderT(Control_Plus.empty(__dict_Plus_5)));
};
var alternativeReaderT = function (__dict_Alternative_13) {
    return new Control_Alternative.Alternative(function () {
        return plusReaderT(__dict_Alternative_13["__superclass_Control.Plus.Plus_1"]());
    }, function () {
        return applicativeReaderT(__dict_Alternative_13["__superclass_Prelude.Applicative_0"]());
    });
};
var monadPlusReaderT = function (__dict_MonadPlus_1) {
    return new Control_MonadPlus.MonadPlus(function () {
        return alternativeReaderT(__dict_MonadPlus_1["__superclass_Control.Alternative.Alternative_1"]());
    }, function () {
        return monadReaderT(__dict_MonadPlus_1["__superclass_Prelude.Monad_0"]());
    });
};
module.exports = {
    ReaderT: ReaderT, 
    liftCallCCReader: liftCallCCReader, 
    liftCatchReader: liftCatchReader, 
    liftReaderT: liftReaderT, 
    mapReaderT: mapReaderT, 
    withReaderT: withReaderT, 
    runReaderT: runReaderT, 
    functorReaderT: functorReaderT, 
    applyReaderT: applyReaderT, 
    applicativeReaderT: applicativeReaderT, 
    altReaderT: altReaderT, 
    plusReaderT: plusReaderT, 
    alternativeReaderT: alternativeReaderT, 
    bindReaderT: bindReaderT, 
    monadReaderT: monadReaderT, 
    monadPlusReaderT: monadPlusReaderT, 
    monadTransReaderT: monadTransReaderT, 
    monadEffReader: monadEffReader, 
    distributiveReaderT: distributiveReaderT
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Monad.Eff.Class":11,"Control.Monad.Trans":34,"Control.MonadPlus":37,"Control.Plus":38,"Data.Distributive":64,"Prelude":107}],30:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Identity = require("Data.Identity");
var Control_Monad_Eff_Unsafe = require("Control.Monad.Eff.Unsafe");
var Control_Monad_ST = require("Control.Monad.ST");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Functor = require("Data.Functor");
var Data_Either = require("Data.Either");
var MonadRec = function (__superclass_Prelude$dotMonad_0, tailRecM) {
    this["__superclass_Prelude.Monad_0"] = __superclass_Prelude$dotMonad_0;
    this.tailRecM = tailRecM;
};
var tailRecM = function (dict) {
    return dict.tailRecM;
};
var tailRecM2 = function (__dict_MonadRec_0) {
    return function (f) {
        return function (a) {
            return function (b) {
                return tailRecM(__dict_MonadRec_0)(function (o) {
                    return f(o.a)(o.b);
                })({
                    a: a, 
                    b: b
                });
            };
        };
    };
};
var tailRecM3 = function (__dict_MonadRec_1) {
    return function (f) {
        return function (a) {
            return function (b) {
                return function (c) {
                    return tailRecM(__dict_MonadRec_1)(function (o) {
                        return f(o.a)(o.b)(o.c);
                    })({
                        a: a, 
                        b: b, 
                        c: c
                    });
                };
            };
        };
    };
};
var tailRecEff = function (f) {
    return function (a) {
        var fromRight = function (_518) {
            if (_518 instanceof Data_Either.Right) {
                return _518.value0;
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-tailrec/src/Control/Monad/Rec/Class.purs line 87, column 3 - line 88, column 3: " + [ _518.constructor.name ]);
        };
        var f$prime = Prelude["<<<"](Prelude.semigroupoidFn)(Control_Monad_Eff_Unsafe.unsafeInterleaveEff)(f);
        return function __do() {
            var _26 = f$prime(a)();
            var _25 = {
                value: _26
            };
            (function () {
                while (!(function __do() {
                    var _24 = _25.value;
                    return (function () {
                        if (_24 instanceof Data_Either.Left) {
                            return function __do() {
                                var _23 = f$prime(_24.value0)();
                                _25.value = _23;
                                return Prelude["return"](Control_Monad_Eff.applicativeEff)(false)();
                            };
                        };
                        if (_24 instanceof Data_Either.Right) {
                            return Prelude["return"](Control_Monad_Eff.applicativeEff)(true);
                        };
                        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-tailrec/src/Control/Monad/Rec/Class.purs line 74, column 1 - line 75, column 1: " + [ _24.constructor.name ]);
                    })()();
                })()) {

                };
                return {};
            })();
            return Prelude["<$>"](Control_Monad_Eff.functorEff)(fromRight)(Control_Monad_ST.readSTRef(_25))();
        };
    };
};
var tailRec = function (f) {
    return function (a) {
        var go = function (__copy__517) {
            var _517 = __copy__517;
            tco: while (true) {
                if (_517 instanceof Data_Either.Left) {
                    var __tco__517 = f(_517.value0);
                    _517 = __tco__517;
                    continue tco;
                };
                if (_517 instanceof Data_Either.Right) {
                    return _517.value0;
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-tailrec/src/Control/Monad/Rec/Class.purs line 62, column 1 - line 63, column 1: " + [ _517.constructor.name ]);
            };
        };
        return go(f(a));
    };
};
var monadRecIdentity = new MonadRec(function () {
    return Data_Identity.monadIdentity;
}, function (f) {
    return Prelude["<<<"](Prelude.semigroupoidFn)(Data_Identity.Identity)(tailRec(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Identity.runIdentity)(f)));
});
var monadRecEff = new MonadRec(function () {
    return Control_Monad_Eff.monadEff;
}, tailRecEff);
var forever = function (__dict_MonadRec_2) {
    return function (ma) {
        return tailRecM(__dict_MonadRec_2)(function (u) {
            return Data_Functor["<$"]((((__dict_MonadRec_2["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(new Data_Either.Left(u))(ma);
        })(Prelude.unit);
    };
};
module.exports = {
    MonadRec: MonadRec, 
    forever: forever, 
    tailRecM3: tailRecM3, 
    tailRecM2: tailRecM2, 
    tailRecM: tailRecM, 
    tailRec: tailRec, 
    monadRecIdentity: monadRecIdentity, 
    monadRecEff: monadRecEff
};

},{"Control.Monad.Eff":23,"Control.Monad.Eff.Unsafe":21,"Control.Monad.ST":32,"Data.Either":65,"Data.Functor":72,"Data.Identity":73,"Prelude":107}],31:[function(require,module,exports){
/* global exports */
"use strict";

// module Control.Monad.ST

exports.newSTRef = function (val) {
  return function () {
    return { value: val };
  };
};

exports.readSTRef = function (ref) {
  return function () {
    return ref.value;
  };
};

exports.modifySTRef = function (ref) {
  return function (f) {
    return function () {
      /* jshint boss: true */
      return ref.value = f(ref.value);
    };
  };
};

exports.writeSTRef = function (ref) {
  return function (a) {
    return function () {
      /* jshint boss: true */
      return ref.value = a;
    };
  };
};

exports.runST = function (f) {
  return f;
};

},{}],32:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Prelude = require("Prelude");
var pureST = function (st) {
    return Control_Monad_Eff.runPure($foreign.runST(st));
};
module.exports = {
    pureST: pureST, 
    runST: $foreign.runST, 
    writeSTRef: $foreign.writeSTRef, 
    modifySTRef: $foreign.modifySTRef, 
    readSTRef: $foreign.readSTRef, 
    newSTRef: $foreign.newSTRef
};

},{"./foreign":31,"Control.Monad.Eff":23,"Prelude":107}],33:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Tuple = require("Data.Tuple");
var Control_Alt = require("Control.Alt");
var Control_Plus = require("Control.Plus");
var Control_Monad_Rec_Class = require("Control.Monad.Rec.Class");
var Control_Monad_Trans = require("Control.Monad.Trans");
var Control_Monad_Eff_Class = require("Control.Monad.Eff.Class");
var Control_Alternative = require("Control.Alternative");
var Control_Lazy = require("Control.Lazy");
var Control_MonadPlus = require("Control.MonadPlus");
var Data_Either = require("Data.Either");
var StateT = function (x) {
    return x;
};
var runStateT = function (_612) {
    return _612;
};
var withStateT = function (f) {
    return function (s) {
        return StateT(Prelude["<<<"](Prelude.semigroupoidFn)(runStateT(s))(f));
    };
};
var monadTransStateT = new Control_Monad_Trans.MonadTrans(function (__dict_Monad_2) {
    return function (m) {
        return function (s) {
            return Prelude.bind(__dict_Monad_2["__superclass_Prelude.Bind_1"]())(m)(function (_44) {
                return Prelude["return"](__dict_Monad_2["__superclass_Prelude.Applicative_0"]())(new Data_Tuple.Tuple(_44, s));
            });
        };
    };
});
var mapStateT = function (f) {
    return function (m) {
        return StateT(Prelude["<<<"](Prelude.semigroupoidFn)(f)(runStateT(m)));
    };
};
var liftPassState = function (__dict_Monad_8) {
    return function (pass) {
        return function (m) {
            return StateT(function (s) {
                return pass(Prelude.bind(__dict_Monad_8["__superclass_Prelude.Bind_1"]())(runStateT(m)(s))(function (_46) {
                    return Prelude["return"](__dict_Monad_8["__superclass_Prelude.Applicative_0"]())(new Data_Tuple.Tuple(new Data_Tuple.Tuple(_46.value0.value0, _46.value1), _46.value0.value1));
                }));
            });
        };
    };
};
var liftListenState = function (__dict_Monad_9) {
    return function (listen) {
        return function (m) {
            return StateT(function (s) {
                return Prelude.bind(__dict_Monad_9["__superclass_Prelude.Bind_1"]())(listen(runStateT(m)(s)))(function (_45) {
                    return Prelude["return"](__dict_Monad_9["__superclass_Prelude.Applicative_0"]())(new Data_Tuple.Tuple(new Data_Tuple.Tuple(_45.value0.value0, _45.value1), _45.value0.value1));
                });
            });
        };
    };
};
var liftCatchState = function ($$catch) {
    return function (m) {
        return function (h) {
            return StateT(function (s) {
                return $$catch(runStateT(m)(s))(function (e) {
                    return runStateT(h(e))(s);
                });
            });
        };
    };
};
var liftCallCCState$prime = function (callCC) {
    return function (f) {
        return StateT(function (s) {
            return callCC(function (c) {
                return runStateT(f(function (a) {
                    return StateT(function (s$prime) {
                        return c(new Data_Tuple.Tuple(a, s$prime));
                    });
                }))(s);
            });
        });
    };
};
var liftCallCCState = function (callCC) {
    return function (f) {
        return StateT(function (s) {
            return callCC(function (c) {
                return runStateT(f(function (a) {
                    return StateT(function (_611) {
                        return c(new Data_Tuple.Tuple(a, s));
                    });
                }))(s);
            });
        });
    };
};
var lazyStateT = new Control_Lazy.Lazy(function (f) {
    return StateT(function (s) {
        return runStateT(f(Prelude.unit))(s);
    });
});
var execStateT = function (__dict_Apply_11) {
    return function (m) {
        return function (s) {
            return Prelude["<$>"](__dict_Apply_11["__superclass_Prelude.Functor_0"]())(Data_Tuple.snd)(runStateT(m)(s));
        };
    };
};
var evalStateT = function (__dict_Apply_12) {
    return function (m) {
        return function (s) {
            return Prelude["<$>"](__dict_Apply_12["__superclass_Prelude.Functor_0"]())(Data_Tuple.fst)(runStateT(m)(s));
        };
    };
};
var monadStateT = function (__dict_Monad_3) {
    return new Prelude.Monad(function () {
        return applicativeStateT(__dict_Monad_3);
    }, function () {
        return bindStateT(__dict_Monad_3);
    });
};
var functorStateT = function (__dict_Monad_10) {
    return new Prelude.Functor(Prelude.liftM1(monadStateT(__dict_Monad_10)));
};
var bindStateT = function (__dict_Monad_13) {
    return new Prelude.Bind(function () {
        return applyStateT(__dict_Monad_13);
    }, function (_613) {
        return function (f) {
            return function (s) {
                return Prelude.bind(__dict_Monad_13["__superclass_Prelude.Bind_1"]())(_613(s))(function (_42) {
                    return runStateT(f(_42.value0))(_42.value1);
                });
            };
        };
    });
};
var applyStateT = function (__dict_Monad_14) {
    return new Prelude.Apply(function () {
        return functorStateT(__dict_Monad_14);
    }, Prelude.ap(monadStateT(__dict_Monad_14)));
};
var applicativeStateT = function (__dict_Monad_15) {
    return new Prelude.Applicative(function () {
        return applyStateT(__dict_Monad_15);
    }, function (a) {
        return StateT(function (s) {
            return Prelude["return"](__dict_Monad_15["__superclass_Prelude.Applicative_0"]())(new Data_Tuple.Tuple(a, s));
        });
    });
};
var monadEffState = function (__dict_Monad_6) {
    return function (__dict_MonadEff_7) {
        return new Control_Monad_Eff_Class.MonadEff(function () {
            return monadStateT(__dict_Monad_6);
        }, Prelude["<<<"](Prelude.semigroupoidFn)(Control_Monad_Trans.lift(monadTransStateT)(__dict_Monad_6))(Control_Monad_Eff_Class.liftEff(__dict_MonadEff_7)));
    };
};
var monadRecStateT = function (__dict_MonadRec_4) {
    return new Control_Monad_Rec_Class.MonadRec(function () {
        return monadStateT(__dict_MonadRec_4["__superclass_Prelude.Monad_0"]());
    }, function (f) {
        return function (a) {
            var f$prime = function (_614) {
                return Prelude.bind((__dict_MonadRec_4["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(runStateT(f(_614.value0))(_614.value1))(function (_43) {
                    return Prelude["return"]((__dict_MonadRec_4["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())((function () {
                        if (_43.value0 instanceof Data_Either.Left) {
                            return new Data_Either.Left(new Data_Tuple.Tuple(_43.value0.value0, _43.value1));
                        };
                        if (_43.value0 instanceof Data_Either.Right) {
                            return new Data_Either.Right(new Data_Tuple.Tuple(_43.value0.value0, _43.value1));
                        };
                        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/State/Trans.purs line 73, column 5 - line 79, column 1: " + [ _43.value0.constructor.name ]);
                    })());
                });
            };
            return function (s) {
                return Control_Monad_Rec_Class.tailRecM(__dict_MonadRec_4)(f$prime)(new Data_Tuple.Tuple(a, s));
            };
        };
    });
};
var altStateT = function (__dict_Monad_18) {
    return function (__dict_Alt_19) {
        return new Control_Alt.Alt(function () {
            return functorStateT(__dict_Monad_18);
        }, function (x) {
            return function (y) {
                return StateT(function (s) {
                    return Control_Alt["<|>"](__dict_Alt_19)(runStateT(x)(s))(runStateT(y)(s));
                });
            };
        });
    };
};
var plusStateT = function (__dict_Monad_0) {
    return function (__dict_Plus_1) {
        return new Control_Plus.Plus(function () {
            return altStateT(__dict_Monad_0)(__dict_Plus_1["__superclass_Control.Alt.Alt_0"]());
        }, StateT(function (_610) {
            return Control_Plus.empty(__dict_Plus_1);
        }));
    };
};
var alternativeStateT = function (__dict_Monad_16) {
    return function (__dict_Alternative_17) {
        return new Control_Alternative.Alternative(function () {
            return plusStateT(__dict_Monad_16)(__dict_Alternative_17["__superclass_Control.Plus.Plus_1"]());
        }, function () {
            return applicativeStateT(__dict_Monad_16);
        });
    };
};
var monadPlusStateT = function (__dict_MonadPlus_5) {
    return new Control_MonadPlus.MonadPlus(function () {
        return alternativeStateT(__dict_MonadPlus_5["__superclass_Prelude.Monad_0"]())(__dict_MonadPlus_5["__superclass_Control.Alternative.Alternative_1"]());
    }, function () {
        return monadStateT(__dict_MonadPlus_5["__superclass_Prelude.Monad_0"]());
    });
};
module.exports = {
    StateT: StateT, 
    "liftCallCCState'": liftCallCCState$prime, 
    liftCallCCState: liftCallCCState, 
    liftPassState: liftPassState, 
    liftListenState: liftListenState, 
    liftCatchState: liftCatchState, 
    withStateT: withStateT, 
    mapStateT: mapStateT, 
    execStateT: execStateT, 
    evalStateT: evalStateT, 
    runStateT: runStateT, 
    functorStateT: functorStateT, 
    applyStateT: applyStateT, 
    applicativeStateT: applicativeStateT, 
    altStateT: altStateT, 
    plusStateT: plusStateT, 
    alternativeStateT: alternativeStateT, 
    bindStateT: bindStateT, 
    monadStateT: monadStateT, 
    monadRecStateT: monadRecStateT, 
    monadPlusStateT: monadPlusStateT, 
    monadTransStateT: monadTransStateT, 
    lazyStateT: lazyStateT, 
    monadEffState: monadEffState
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Lazy":10,"Control.Monad.Eff.Class":11,"Control.Monad.Rec.Class":30,"Control.Monad.Trans":34,"Control.MonadPlus":37,"Control.Plus":38,"Data.Either":65,"Data.Tuple":95,"Prelude":107}],34:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var MonadTrans = function (lift) {
    this.lift = lift;
};
var lift = function (dict) {
    return dict.lift;
};
module.exports = {
    MonadTrans: MonadTrans, 
    lift: lift
};

},{"Prelude":107}],35:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Tuple = require("Data.Tuple");
var Data_Monoid = require("Data.Monoid");
var Control_Alt = require("Control.Alt");
var Control_Plus = require("Control.Plus");
var Control_Monad_Rec_Class = require("Control.Monad.Rec.Class");
var Control_Monad_Trans = require("Control.Monad.Trans");
var Control_Monad_Eff_Class = require("Control.Monad.Eff.Class");
var Control_Alternative = require("Control.Alternative");
var Control_MonadPlus = require("Control.MonadPlus");
var Data_Either = require("Data.Either");
var WriterT = function (x) {
    return x;
};
var runWriterT = function (_616) {
    return _616;
};
var monadTransWriterT = function (__dict_Monoid_4) {
    return new Control_Monad_Trans.MonadTrans(function (__dict_Monad_5) {
        return function (m) {
            return WriterT(Prelude.bind(__dict_Monad_5["__superclass_Prelude.Bind_1"]())(m)(function (_50) {
                return Prelude["return"](__dict_Monad_5["__superclass_Prelude.Applicative_0"]())(new Data_Tuple.Tuple(_50, Data_Monoid.mempty(__dict_Monoid_4)));
            }));
        };
    });
};
var mapWriterT = function (f) {
    return function (m) {
        return WriterT(f(runWriterT(m)));
    };
};
var liftCatchWriter = function ($$catch) {
    return function (m) {
        return function (h) {
            return WriterT($$catch(runWriterT(m))(function (e) {
                return runWriterT(h(e));
            }));
        };
    };
};
var liftCallCCWriter = function (__dict_Monoid_13) {
    return function (callCC) {
        return function (f) {
            return WriterT(callCC(function (c) {
                return runWriterT(f(function (a) {
                    return WriterT(c(new Data_Tuple.Tuple(a, Data_Monoid.mempty(__dict_Monoid_13))));
                }));
            }));
        };
    };
};
var functorWriterT = function (__dict_Functor_14) {
    return new Prelude.Functor(function (f) {
        return mapWriterT(Prelude["<$>"](__dict_Functor_14)(function (_615) {
            return new Data_Tuple.Tuple(f(_615.value0), _615.value1);
        }));
    });
};
var execWriterT = function (__dict_Apply_15) {
    return function (m) {
        return Prelude["<$>"](__dict_Apply_15["__superclass_Prelude.Functor_0"]())(Data_Tuple.snd)(runWriterT(m));
    };
};
var applyWriterT = function (__dict_Monoid_18) {
    return function (__dict_Apply_19) {
        return new Prelude.Apply(function () {
            return functorWriterT(__dict_Apply_19["__superclass_Prelude.Functor_0"]());
        }, function (f) {
            return function (v) {
                return WriterT((function () {
                    var k = function (_617) {
                        return function (_618) {
                            return new Data_Tuple.Tuple(_617.value0(_618.value0), Prelude["<>"](__dict_Monoid_18["__superclass_Prelude.Semigroup_0"]())(_617.value1)(_618.value1));
                        };
                    };
                    return Prelude["<*>"](__dict_Apply_19)(Prelude["<$>"](__dict_Apply_19["__superclass_Prelude.Functor_0"]())(k)(runWriterT(f)))(runWriterT(v));
                })());
            };
        });
    };
};
var bindWriterT = function (__dict_Monoid_16) {
    return function (__dict_Monad_17) {
        return new Prelude.Bind(function () {
            return applyWriterT(__dict_Monoid_16)((__dict_Monad_17["__superclass_Prelude.Applicative_0"]())["__superclass_Prelude.Apply_0"]());
        }, function (m) {
            return function (k) {
                return WriterT(Prelude.bind(__dict_Monad_17["__superclass_Prelude.Bind_1"]())(runWriterT(m))(function (_48) {
                    return Prelude.bind(__dict_Monad_17["__superclass_Prelude.Bind_1"]())(runWriterT(k(_48.value0)))(function (_47) {
                        return Prelude["return"](__dict_Monad_17["__superclass_Prelude.Applicative_0"]())(new Data_Tuple.Tuple(_47.value0, Prelude["<>"](__dict_Monoid_16["__superclass_Prelude.Semigroup_0"]())(_48.value1)(_47.value1)));
                    });
                }));
            };
        });
    };
};
var applicativeWriterT = function (__dict_Monoid_20) {
    return function (__dict_Applicative_21) {
        return new Prelude.Applicative(function () {
            return applyWriterT(__dict_Monoid_20)(__dict_Applicative_21["__superclass_Prelude.Apply_0"]());
        }, function (a) {
            return WriterT(Prelude.pure(__dict_Applicative_21)(new Data_Tuple.Tuple(a, Data_Monoid.mempty(__dict_Monoid_20))));
        });
    };
};
var monadWriterT = function (__dict_Monoid_2) {
    return function (__dict_Monad_3) {
        return new Prelude.Monad(function () {
            return applicativeWriterT(__dict_Monoid_2)(__dict_Monad_3["__superclass_Prelude.Applicative_0"]());
        }, function () {
            return bindWriterT(__dict_Monoid_2)(__dict_Monad_3);
        });
    };
};
var monadEffWriter = function (__dict_Monad_10) {
    return function (__dict_Monoid_11) {
        return function (__dict_MonadEff_12) {
            return new Control_Monad_Eff_Class.MonadEff(function () {
                return monadWriterT(__dict_Monoid_11)(__dict_Monad_10);
            }, Prelude["<<<"](Prelude.semigroupoidFn)(Control_Monad_Trans.lift(monadTransWriterT(__dict_Monoid_11))(__dict_Monad_10))(Control_Monad_Eff_Class.liftEff(__dict_MonadEff_12)));
        };
    };
};
var monadRecWriterT = function (__dict_Monoid_6) {
    return function (__dict_MonadRec_7) {
        return new Control_Monad_Rec_Class.MonadRec(function () {
            return monadWriterT(__dict_Monoid_6)(__dict_MonadRec_7["__superclass_Prelude.Monad_0"]());
        }, function (f) {
            return function (a) {
                var f$prime = function (_619) {
                    return Prelude.bind((__dict_MonadRec_7["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Bind_1"]())(runWriterT(f(_619.value0)))(function (_49) {
                        return Prelude["return"]((__dict_MonadRec_7["__superclass_Prelude.Monad_0"]())["__superclass_Prelude.Applicative_0"]())((function () {
                            if (_49.value0 instanceof Data_Either.Left) {
                                return new Data_Either.Left(new Data_Tuple.Tuple(_49.value0.value0, Prelude["<>"](__dict_Monoid_6["__superclass_Prelude.Semigroup_0"]())(_619.value1)(_49.value1)));
                            };
                            if (_49.value0 instanceof Data_Either.Right) {
                                return new Data_Either.Right(new Data_Tuple.Tuple(_49.value0.value0, Prelude["<>"](__dict_Monoid_6["__superclass_Prelude.Semigroup_0"]())(_619.value1)(_49.value1)));
                            };
                            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-transformers/src/Control/Monad/Writer/Trans.purs line 68, column 5 - line 74, column 1: " + [ _49.value0.constructor.name ]);
                        })());
                    });
                };
                return WriterT(Control_Monad_Rec_Class.tailRecM(__dict_MonadRec_7)(f$prime)(new Data_Tuple.Tuple(a, Data_Monoid.mempty(__dict_Monoid_6))));
            };
        });
    };
};
var altWriterT = function (__dict_Monoid_24) {
    return function (__dict_Alt_25) {
        return new Control_Alt.Alt(function () {
            return functorWriterT(__dict_Alt_25["__superclass_Prelude.Functor_0"]());
        }, function (m) {
            return function (n) {
                return WriterT(Control_Alt["<|>"](__dict_Alt_25)(runWriterT(m))(runWriterT(n)));
            };
        });
    };
};
var plusWriterT = function (__dict_Monoid_0) {
    return function (__dict_Plus_1) {
        return new Control_Plus.Plus(function () {
            return altWriterT(__dict_Monoid_0)(__dict_Plus_1["__superclass_Control.Alt.Alt_0"]());
        }, Control_Plus.empty(__dict_Plus_1));
    };
};
var alternativeWriterT = function (__dict_Monoid_22) {
    return function (__dict_Alternative_23) {
        return new Control_Alternative.Alternative(function () {
            return plusWriterT(__dict_Monoid_22)(__dict_Alternative_23["__superclass_Control.Plus.Plus_1"]());
        }, function () {
            return applicativeWriterT(__dict_Monoid_22)(__dict_Alternative_23["__superclass_Prelude.Applicative_0"]());
        });
    };
};
var monadPlusWriterT = function (__dict_Monoid_8) {
    return function (__dict_MonadPlus_9) {
        return new Control_MonadPlus.MonadPlus(function () {
            return alternativeWriterT(__dict_Monoid_8)(__dict_MonadPlus_9["__superclass_Control.Alternative.Alternative_1"]());
        }, function () {
            return monadWriterT(__dict_Monoid_8)(__dict_MonadPlus_9["__superclass_Prelude.Monad_0"]());
        });
    };
};
module.exports = {
    WriterT: WriterT, 
    liftCallCCWriter: liftCallCCWriter, 
    liftCatchWriter: liftCatchWriter, 
    mapWriterT: mapWriterT, 
    execWriterT: execWriterT, 
    runWriterT: runWriterT, 
    functorWriterT: functorWriterT, 
    applyWriterT: applyWriterT, 
    applicativeWriterT: applicativeWriterT, 
    altWriterT: altWriterT, 
    plusWriterT: plusWriterT, 
    alternativeWriterT: alternativeWriterT, 
    bindWriterT: bindWriterT, 
    monadWriterT: monadWriterT, 
    monadRecWriterT: monadRecWriterT, 
    monadPlusWriterT: monadPlusWriterT, 
    monadTransWriterT: monadTransWriterT, 
    monadEffWriter: monadEffWriter
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Monad.Eff.Class":11,"Control.Monad.Rec.Class":30,"Control.Monad.Trans":34,"Control.MonadPlus":37,"Control.Plus":38,"Data.Either":65,"Data.Monoid":87,"Data.Tuple":95,"Prelude":107}],36:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var when = function (__dict_Monad_0) {
    return function (_261) {
        return function (m) {
            if (_261) {
                return m;
            };
            if (!_261) {
                return Prelude["return"](__dict_Monad_0["__superclass_Prelude.Applicative_0"]())(Prelude.unit);
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-control/src/Control/Monad.purs line 8, column 1 - line 9, column 1: " + [ _261.constructor.name, m.constructor.name ]);
        };
    };
};
var unless = function (__dict_Monad_1) {
    return function (_262) {
        return function (m) {
            if (!_262) {
                return m;
            };
            if (_262) {
                return Prelude["return"](__dict_Monad_1["__superclass_Prelude.Applicative_0"]())(Prelude.unit);
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-control/src/Control/Monad.purs line 13, column 1 - line 14, column 1: " + [ _262.constructor.name, m.constructor.name ]);
        };
    };
};
module.exports = {
    unless: unless, 
    when: when
};

},{"Prelude":107}],37:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Plus = require("Control.Plus");
var Control_Alternative = require("Control.Alternative");
var MonadPlus = function (__superclass_Control$dotAlternative$dotAlternative_1, __superclass_Prelude$dotMonad_0) {
    this["__superclass_Control.Alternative.Alternative_1"] = __superclass_Control$dotAlternative$dotAlternative_1;
    this["__superclass_Prelude.Monad_0"] = __superclass_Prelude$dotMonad_0;
};
var monadPlusArray = new MonadPlus(function () {
    return Control_Alternative.alternativeArray;
}, function () {
    return Prelude.monadArray;
});
var guard = function (__dict_MonadPlus_0) {
    return function (_370) {
        if (_370) {
            return Prelude["return"]((__dict_MonadPlus_0["__superclass_Control.Alternative.Alternative_1"]())["__superclass_Prelude.Applicative_0"]())(Prelude.unit);
        };
        if (!_370) {
            return Control_Plus.empty((__dict_MonadPlus_0["__superclass_Control.Alternative.Alternative_1"]())["__superclass_Control.Plus.Plus_1"]());
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-control/src/Control/MonadPlus.purs line 35, column 1 - line 36, column 1: " + [ _370.constructor.name ]);
    };
};
module.exports = {
    MonadPlus: MonadPlus, 
    guard: guard, 
    monadPlusArray: monadPlusArray
};

},{"Control.Alternative":4,"Control.Plus":38,"Prelude":107}],38:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Alt = require("Control.Alt");
var Plus = function (__superclass_Control$dotAlt$dotAlt_0, empty) {
    this["__superclass_Control.Alt.Alt_0"] = __superclass_Control$dotAlt$dotAlt_0;
    this.empty = empty;
};
var plusArray = new Plus(function () {
    return Control_Alt.altArray;
}, [  ]);
var empty = function (dict) {
    return dict.empty;
};
module.exports = {
    Plus: Plus, 
    empty: empty, 
    plusArray: plusArray
};

},{"Control.Alt":3,"Prelude":107}],39:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Date = require("Data.Date");
var Data = require("Data");
var Data_Array = require("Data.Array");
var Data_Maybe = require("Data.Maybe");
var Utils = require("Utils");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Traversable = require("Data.Traversable");
var Control_Monad_Eff_Random = require("Control.Monad.Eff.Random");
var Control_Apply = require("Control.Apply");
var Control_Monad_Eff_Console = require("Control.Monad.Eff.Console");
var Data_Function = require("Data.Function");
var Data_Tuple = require("Data.Tuple");
var Rx_Observable = require("Rx.Observable");
var Types = require("Types");
var updateTimer = function (_32) {
    return function __do() {
        var _1 = Data_Date.now();
        return (function () {
            var x = Utils.timeDelta(_32.value0.startTime)(_1);
            return Prelude.pure(Control_Monad_Eff.applicativeEff)(new Types.State((function () {
                var _77 = {};
                for (var _78 in _32.value0) {
                    if (_32.value0.hasOwnProperty(_78)) {
                        _77[_78] = _32.value0[_78];
                    };
                };
                _77.secondsElapsed = Utils.toFixed(x / 1000.0)(2.0);
                _77.genCounter = 0.0;
                _77.genRatio = _32.value0.genCounter;
                return _77;
            })()));
        })()();
    };
};
var toggleTicks = function (rs) {
    return function (playPauseStream) {
        return function (_30) {
            return Control_Monad_Eff.runPure(function __do() {
                Utils.onNext(playPauseStream)((function () {
                    if (rs instanceof Types.Running) {
                        return true;
                    };
                    if (rs instanceof Types.Paused) {
                        return false;
                    };
                    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Core.purs line 121, column 1 - line 122, column 1: " + [ rs.constructor.name ]);
                })())();
                return new Types.State((function () {
                    var _84 = {};
                    for (var _85 in _30.value0) {
                        if (_30.value0.hasOwnProperty(_85)) {
                            _84[_85] = _30.value0[_85];
                        };
                    };
                    _84.runningState = rs;
                    return _84;
                })());
            });
        };
    };
};
var saveNewGeneration = function (_27) {
    return function (ng) {
        return new Types.State((function () {
            var _89 = {};
            for (var _90 in _27.value0) {
                if (_27.value0.hasOwnProperty(_90)) {
                    _89[_90] = _27.value0[_90];
                };
            };
            _89.cells = Data_Array.snoc(_27.value0.cells)(ng);
            _89.genCounter = _27.value0.genCounter + 1.0;
            return _89;
        })());
    };
};
var rewind = function (n) {
    return function (_28) {
        var newCurrent = (function () {
            if (_28.value0.current instanceof Data_Maybe.Just) {
                return Prelude["-"](Prelude.ringInt)(_28.value0.current.value0)(n);
            };
            if (_28.value0.current instanceof Data_Maybe.Nothing) {
                return Prelude["-"](Prelude.ringInt)(Data_Array.length(_28.value0.cells))(n);
            };
            throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Core.purs line 64, column 9 - line 65, column 5: " + [ _28.value0.current.constructor.name ]);
        })();
        var boundedNewCurrent = (function () {
            var _96 = Prelude["<"](Prelude.ordInt)(newCurrent)(0);
            if (_96) {
                return 0;
            };
            if (!_96) {
                return newCurrent;
            };
            throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Core.purs line 59, column 1 - line 60, column 1: " + [ _96.constructor.name ]);
        })();
        return new Types.State((function () {
            var _97 = {};
            for (var _98 in _28.value0) {
                if (_28.value0.hasOwnProperty(_98)) {
                    _97[_98] = _28.value0[_98];
                };
            };
            _97.current = new Data_Maybe.Just(boundedNewCurrent);
            return _97;
        })());
    };
};
var play = toggleTicks(Types.Running.value);
var pause = toggleTicks(Types.Paused.value);
var toggle = function (playPauseStream) {
    return function (_31) {
        if (Prelude["=="](Types.eqRunStatus)(_31.value0.runningState)(Types.Running.value)) {
            return pause(playPauseStream)(_31);
        };
        if (Prelude["=="](Types.eqRunStatus)(_31.value0.runningState)(Types.Paused.value)) {
            return play(playPauseStream)(_31);
        };
        throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Core.purs line 131, column 1 - line 132, column 1: " + [ playPauseStream.constructor.name, _31.constructor.name ]);
    };
};
var initialSpeed = 50.0;
var getTotalGenerations = function (_25) {
    return Data_Array.length(_25.value0.cells);
};
var getInitialState = function __do() {
    var _0 = Data_Date.now();
    return new Types.State({
        cells: [ Data.initialCells ], 
        runningState: Types.Running.value, 
        current: Data_Maybe.Nothing.value, 
        startTime: _0, 
        secondsElapsed: 0.0, 
        genCounter: 0.0, 
        genRatio: 0.0
    });
};
var genNewGeneration = function (currentGeneration) {
    var lifeStep = function (liveCount) {
        return function (cell) {
            if (cell instanceof Types.Alive) {
                var _107 = Prelude["||"](Prelude.booleanAlgebraBoolean)(Prelude["<"](Prelude.ordInt)(liveCount)(2))(Prelude[">"](Prelude.ordInt)(liveCount)(3));
                if (_107) {
                    return Types.Dead.value;
                };
                if (!_107) {
                    return Types.Alive.value;
                };
                throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Core.purs line 82, column 5 - line 89, column 5: " + [ _107.constructor.name ]);
            };
            if (cell instanceof Types.Dead) {
                var _108 = Prelude["=="](Prelude.eqInt)(liveCount)(3);
                if (_108) {
                    return Types.Alive.value;
                };
                if (!_108) {
                    return Types.Dead.value;
                };
                throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Core.purs line 82, column 5 - line 89, column 5: " + [ _108.constructor.name ]);
            };
            throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Core.purs line 82, column 5 - line 89, column 5: " + [ cell.constructor.name ]);
        };
    };
    var findNeighbours = function (y) {
        return function (x) {
            return function (cells) {
                var newCells = [ [ Prelude["-"](Prelude.ringInt)(y)(1), Prelude["-"](Prelude.ringInt)(x)(1) ], [ Prelude["-"](Prelude.ringInt)(y)(1), x ], [ Prelude["-"](Prelude.ringInt)(y)(1), Prelude["+"](Prelude.semiringInt)(x)(1) ], [ y, Prelude["-"](Prelude.ringInt)(x)(1) ], [ y, Prelude["+"](Prelude.semiringInt)(x)(1) ], [ Prelude["+"](Prelude.semiringInt)(y)(1), Prelude["-"](Prelude.ringInt)(x)(1) ], [ Prelude["+"](Prelude.semiringInt)(y)(1), x ], [ Prelude["+"](Prelude.semiringInt)(y)(1), Prelude["+"](Prelude.semiringInt)(x)(1) ] ];
                var maybeNeighbours = Prelude.map(Prelude.functorArray)(function (_24) {
                    if (_24.length === 2) {
                        return Utils.getByIndex2(cells)(_24[0])(_24[1]);
                    };
                    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Core.purs line 79, column 1 - line 80, column 1: " + [ _24.constructor.name ]);
                })(newCells);
                return Data_Array.catMaybes(maybeNeighbours);
            };
        };
    };
    var calcNewCells = function (cells) {
        return Utils.map_(Prelude.functorArray)(Data_Array.zip(cells)(Data_Array[".."](0)(Data_Array.length(cells))))(function (_23) {
            return Utils.map_(Prelude.functorArray)(Data_Array.zip(_23.value0)(Data_Array[".."](0)(Data_Array.length(_23.value0))))(function (_22) {
                var neighbours = findNeighbours(_23.value1)(_22.value1)(cells);
                var liveCount = Data_Array.length(Data_Array.filter(Prelude["=="](Types.eqCell)(Types.Alive.value))(neighbours));
                return lifeStep(liveCount)(_22.value0);
            });
        });
    };
    return calcNewCells(currentGeneration);
};
var emptyGeneration = [ [  ] ];
var getCurrentGeneration = function (_26) {
    if (_26.value0.current instanceof Data_Maybe.Nothing) {
        return Data_Maybe.maybe(emptyGeneration)(Prelude.id(Prelude.categoryFn))(Data_Array.last(_26.value0.cells));
    };
    if (_26.value0.current instanceof Data_Maybe.Just) {
        return Data_Maybe.maybe(emptyGeneration)(Prelude.id(Prelude.categoryFn))(Data_Array["!!"](_26.value0.cells)(_26.value0.current.value0));
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Core.purs line 50, column 1 - line 51, column 1: " + [ _26.value0.current.constructor.name ]);
};
var fforward = function (n) {
    return function (_29) {
        if (_29.value0.current instanceof Data_Maybe.Just) {
            var maxIndex = Prelude["-"](Prelude.ringInt)(Data_Array.length(_29.value0.cells))(1);
            var newCurrent = (function () {
                var _125 = Prelude[">"](Prelude.ordInt)(Prelude["+"](Prelude.semiringInt)(_29.value0.current.value0)(n))(maxIndex);
                if (_125) {
                    return Data_Maybe.Nothing.value;
                };
                if (!_125) {
                    return new Data_Maybe.Just(Prelude["+"](Prelude.semiringInt)(_29.value0.current.value0)(n));
                };
                throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Core.purs line 67, column 1 - line 68, column 1: " + [ _125.constructor.name ]);
            })();
            return new Types.State((function () {
                var _126 = {};
                for (var _127 in _29.value0) {
                    if (_29.value0.hasOwnProperty(_127)) {
                        _126[_127] = _29.value0[_127];
                    };
                };
                _126.current = newCurrent;
                return _126;
            })());
        };
        if (_29.value0.current instanceof Data_Maybe.Nothing) {
            return saveNewGeneration(_29)(Prelude[">>>"](Prelude.semigroupoidFn)(getCurrentGeneration)(genNewGeneration)(_29));
        };
        throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Core.purs line 67, column 1 - line 68, column 1: " + [ _29.value0.current.constructor.name ]);
    };
};
var genRandomGeneration = function (state) {
    var g = getCurrentGeneration(state);
    return function __do() {
        var _3 = Data_Traversable["for"](Control_Monad_Eff.applicativeEff)(Data_Traversable.traversableArray)(g)(function (row) {
            return Data_Traversable["for"](Control_Monad_Eff.applicativeEff)(Data_Traversable.traversableArray)(row)(function (x) {
                return function __do() {
                    var _2 = Control_Monad_Eff_Random.random();
                    var _131 = _2 > 0.5;
                    if (_131) {
                        return Types.Alive.value;
                    };
                    if (!_131) {
                        return Types.Dead.value;
                    };
                    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Core.purs line 143, column 1 - line 152, column 1: " + [ _131.constructor.name ]);
                };
            });
        })();
        return saveNewGeneration(state)(_3);
    };
};
var updatePoint = function (newCell) {
    return function (state) {
        return function (y) {
            return function (x) {
                var currentGeneration = getCurrentGeneration(state);
                var newGeneration = Utils.updateAt2(y)(x)(newCell)(currentGeneration);
                return saveNewGeneration(state)(newGeneration);
            };
        };
    };
};
var removePoint = updatePoint(Types.Dead.value);
var calculateNewGeneration = function (state) {
    var newGeneration = Prelude[">>>"](Prelude.semigroupoidFn)(getCurrentGeneration)(genNewGeneration)(state);
    return saveNewGeneration(state)(newGeneration);
};
var addPoint = updatePoint(Types.Alive.value);
var togglePoint = function (state) {
    return function (y) {
        return function (x) {
            var _133 = Utils.getByIndex2(getCurrentGeneration(state))(y)(x);
            if (_133 instanceof Data_Maybe.Just && _133.value0 instanceof Types.Alive) {
                return removePoint(state)(y)(x);
            };
            if (_133 instanceof Data_Maybe.Just && _133.value0 instanceof Types.Dead) {
                return addPoint(state)(y)(x);
            };
            return state;
        };
    };
};
var processStateFactory = function (playPauseStream) {
    var processState = function (_33) {
        return function (state) {
            if (_33 instanceof Types.Tick) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(calculateNewGeneration(state));
            };
            if (_33 instanceof Types.Play) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(play(playPauseStream)(state));
            };
            if (_33 instanceof Types.Pause) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(pause(playPauseStream)(state));
            };
            if (_33 instanceof Types.Toggle) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(toggle(playPauseStream)(state));
            };
            if (_33 instanceof Types.Save) {
                return Control_Apply["*>"](Control_Monad_Eff.applyEff)(Prelude["<<<"](Prelude.semigroupoidFn)(Control_Monad_Eff_Console.log)(Prelude.show(Types.showState))(state))(Prelude.pure(Control_Monad_Eff.applicativeEff)(state));
            };
            if (_33 instanceof Types.Point) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(addPoint(state)(_33.value0)(_33.value1));
            };
            if (_33 instanceof Types.NoPoint) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(removePoint(state)(_33.value0)(_33.value1));
            };
            if (_33 instanceof Types.TogglePoint) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(togglePoint(state)(_33.value0)(_33.value1));
            };
            if (_33 instanceof Types.NewCells) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(saveNewGeneration(state)(_33.value0));
            };
            if (_33 instanceof Types.Rewind) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude[">>>"](Prelude.semigroupoidFn)(pause(playPauseStream))(rewind(_33.value0))(state));
            };
            if (_33 instanceof Types.FForward) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude[">>>"](Prelude.semigroupoidFn)(pause(playPauseStream))(fforward(_33.value0))(state));
            };
            if (_33 instanceof Types.Timer) {
                return updateTimer(state);
            };
            if (_33 instanceof Types.RandomGen) {
                return genRandomGeneration(state);
            };
            throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Core.purs line 157, column 3 - line 158, column 3: " + [ _33.constructor.name, state.constructor.name ]);
        };
    };
    return processState;
};
module.exports = {
    getInitialState: getInitialState, 
    initialSpeed: initialSpeed, 
    saveNewGeneration: saveNewGeneration, 
    getCurrentGeneration: getCurrentGeneration, 
    getTotalGenerations: getTotalGenerations, 
    processStateFactory: processStateFactory, 
    pause: pause, 
    play: play, 
    removePoint: removePoint, 
    addPoint: addPoint, 
    calculateNewGeneration: calculateNewGeneration
};

},{"Control.Apply":5,"Control.Monad.Eff":23,"Control.Monad.Eff.Console":13,"Control.Monad.Eff.Random":17,"Data":97,"Data.Array":44,"Data.Date":63,"Data.Function":70,"Data.Maybe":81,"Data.Traversable":94,"Data.Tuple":95,"Prelude":107,"Rx.Observable":116,"Types":117,"Utils":125}],40:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
module.exports = {};

},{}],41:[function(require,module,exports){
/* global exports */
"use strict";

// module Data.Array.ST

exports.runSTArray = function (f) {
  return f;
};

exports.emptySTArray = function () {
  return [];
};

exports.peekSTArrayImpl = function (just) {
  return function (nothing) {
    return function (xs) {
      return function (i) {
        return function () {
          return i >= 0 && i < xs.length ? just(xs[i]) : nothing;
        };
      };
    };
  };
};

exports.pokeSTArray = function (xs) {
  return function (i) {
    return function (a) {
      return function () {
        var ret = i >= 0 && i < xs.length;
        if (ret) xs[i] = a;
        return ret;
      };
    };
  };
};

exports.pushAllSTArray = function (xs) {
  return function (as) {
    return function () {
      return xs.push.apply(xs, as);
    };
  };
};

exports.spliceSTArray = function (xs) {
  return function (i) {
    return function (howMany) {
      return function (bs) {
        return function () {
          return xs.splice.apply(xs, [i, howMany].concat(bs));
        };
      };
    };
  };
};

exports.copyImpl = function (xs) {
  return function () {
    return xs.slice();
  };
};

exports.toAssocArray = function (xs) {
  return function () {
    var n = xs.length;
    var as = new Array(n);
    for (var i = 0; i < n; i++) as[i] = { value: xs[i], index: i };
    return as;
  };
};

},{}],42:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Control_Monad_ST = require("Control.Monad.ST");
var Data_Maybe = require("Data.Maybe");
var thaw = $foreign.copyImpl;
var pushSTArray = function (arr) {
    return function (a) {
        return $foreign.pushAllSTArray(arr)([ a ]);
    };
};
var peekSTArray = $foreign.peekSTArrayImpl(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var freeze = $foreign.copyImpl;
module.exports = {
    thaw: thaw, 
    freeze: freeze, 
    pushSTArray: pushSTArray, 
    peekSTArray: peekSTArray, 
    toAssocArray: $foreign.toAssocArray, 
    spliceSTArray: $foreign.spliceSTArray, 
    pushAllSTArray: $foreign.pushAllSTArray, 
    pokeSTArray: $foreign.pokeSTArray, 
    emptySTArray: $foreign.emptySTArray, 
    runSTArray: $foreign.runSTArray
};

},{"./foreign":41,"Control.Monad.Eff":23,"Control.Monad.ST":32,"Data.Maybe":81,"Prelude":107}],43:[function(require,module,exports){
/* global exports */
"use strict";

// module Data.Array

//------------------------------------------------------------------------------
// Array creation --------------------------------------------------------------
//------------------------------------------------------------------------------

exports.range = function (start) {
  return function (end) {
    var step = start > end ? -1 : 1;
    var result = [];
    for (var i = start, n = 0; i !== end; i += step) {
      result[n++] = i;
    }
    result[n] = i;
    return result;
  };
};

exports.replicate = function (n) {
  return function (v) {
    if (n < 1) return [];
    var r = new Array(n);
    for (var i = 0; i < n; i++) r[i] = v;
    return r;
  };
};

//------------------------------------------------------------------------------
// Array size ------------------------------------------------------------------
//------------------------------------------------------------------------------

exports.length = function (xs) {
  return xs.length;
};

//------------------------------------------------------------------------------
// Extending arrays ------------------------------------------------------------
//------------------------------------------------------------------------------

exports.cons = function (e) {
  return function (l) {
    return [e].concat(l);
  };
};

exports.snoc = function (l) {
  return function (e) {
    var l1 = l.slice();
    l1.push(e);
    return l1;
  };
};

//------------------------------------------------------------------------------
// Non-indexed reads -----------------------------------------------------------
//------------------------------------------------------------------------------

exports["uncons'"] = function (empty) {
  return function (next) {
    return function (xs) {
      return xs.length === 0 ? empty({}) : next(xs[0])(xs.slice(1));
    };
  };
};

//------------------------------------------------------------------------------
// Indexed operations ----------------------------------------------------------
//------------------------------------------------------------------------------

exports.indexImpl = function (just) {
  return function (nothing) {
    return function (xs) {
      return function (i) {
        return i < 0 || i >= xs.length ? nothing :  just(xs[i]);
      };
    };
  };
};

exports.findIndexImpl = function (just) {
  return function (nothing) {
    return function (f) {
      return function (xs) {
        for (var i = 0, l = xs.length; i < l; i++) {
          if (f(xs[i])) return just(i);
        }
        return nothing;
      };
    };
  };
};

exports.findLastIndexImpl = function (just) {
  return function (nothing) {
    return function (f) {
      return function (xs) {
        for (var i = xs.length - 1; i >= 0; i--) {
          if (f(xs[i])) return just(i);
        }
        return nothing;
      };
    };
  };
};

exports._insertAt = function (just) {
  return function (nothing) {
    return function (i) {
      return function (a) {
        return function (l) {
          if (i < 0 || i > l.length) return nothing;
          var l1 = l.slice();
          l1.splice(i, 0, a);
          return just(l1);
        };
      };
    };
  };
};

exports._deleteAt = function (just) {
  return function (nothing) {
    return function (i) {
      return function (l) {
        if (i < 0 || i >= l.length) return nothing;
        var l1 = l.slice();
        l1.splice(i, 1);
        return just(l1);
      };
    };
  };
};

exports._updateAt = function (just) {
  return function (nothing) {
    return function (i) {
      return function (a) {
        return function (l) {
          if (i < 0 || i >= l.length) return nothing;
          var l1 = l.slice();
          l1[i] = a;
          return just(l1);
        };
      };
    };
  };
};

//------------------------------------------------------------------------------
// Transformations -------------------------------------------------------------
//------------------------------------------------------------------------------

exports.reverse = function (l) {
  return l.slice().reverse();
};

exports.concat = function (xss) {
  var result = [];
  for (var i = 0, l = xss.length; i < l; i++) {
    var xs = xss[i];
    for (var j = 0, m = xs.length; j < m; j++) {
      result.push(xs[j]);
    }
  }
  return result;
};

exports.filter = function (f) {
  return function (xs) {
    return xs.filter(f);
  };
};

//------------------------------------------------------------------------------
// Sorting ---------------------------------------------------------------------
//------------------------------------------------------------------------------

exports.sortImpl = function (f) {
  return function (l) {
    /* jshint maxparams: 2 */
    return l.slice().sort(function (x, y) {
      return f(x)(y);
    });
  };
};

//------------------------------------------------------------------------------
// Subarrays -------------------------------------------------------------------
//------------------------------------------------------------------------------

exports.slice = function (s) {
  return function (e) {
    return function (l) {
      return l.slice(s, e);
    };
  };
};

exports.drop = function (n) {
  return function (l) {
    return n < 1 ? l : l.slice(n);
  };
};

//------------------------------------------------------------------------------
// Zipping ---------------------------------------------------------------------
//------------------------------------------------------------------------------

exports.zipWith = function (f) {
  return function (xs) {
    return function (ys) {
      var l = xs.length < ys.length ? xs.length : ys.length;
      var result = new Array(l);
      for (var i = 0; i < l; i++) {
        result[i] = f(xs[i])(ys[i]);
      }
      return result;
    };
  };
};

},{}],44:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Control_Lazy = require("Control.Lazy");
var Control_Alt = require("Control.Alt");
var Data_Maybe = require("Data.Maybe");
var Data_Maybe_Unsafe = require("Data.Maybe.Unsafe");
var Data_Foldable = require("Data.Foldable");
var Data_Traversable = require("Data.Traversable");
var Control_Alternative = require("Control.Alternative");
var Control_MonadPlus = require("Control.MonadPlus");
var Control_Plus = require("Control.Plus");
var Data_Functor_Invariant = require("Data.Functor.Invariant");
var Data_Monoid = require("Data.Monoid");
var Data_Tuple = require("Data.Tuple");
var $colon = $foreign.cons;
var $dot$dot = $foreign.range;
var zipWithA = function (__dict_Applicative_0) {
    return function (f) {
        return function (xs) {
            return function (ys) {
                return Data_Traversable.sequence(Data_Traversable.traversableArray)(__dict_Applicative_0)($foreign.zipWith(f)(xs)(ys));
            };
        };
    };
};
var zip = $foreign.zipWith(Data_Tuple.Tuple.create);
var updateAt = $foreign._updateAt(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var unzip = $foreign["uncons'"](function (_636) {
    return new Data_Tuple.Tuple([  ], [  ]);
})(function (_637) {
    return function (ts) {
        var _1087 = unzip(ts);
        return new Data_Tuple.Tuple($colon(_637.value0)(_1087.value0), $colon(_637.value1)(_1087.value1));
    };
});
var uncons = $foreign["uncons'"](Prelude["const"](Data_Maybe.Nothing.value))(function (x) {
    return function (xs) {
        return new Data_Maybe.Just({
            head: x, 
            tail: xs
        });
    };
});
var take = $foreign.slice(0);
var tail = $foreign["uncons'"](Prelude["const"](Data_Maybe.Nothing.value))(function (_634) {
    return function (xs) {
        return new Data_Maybe.Just(xs);
    };
});
var span = function (p) {
    var go = function (__copy_acc) {
        return function (__copy_xs) {
            var acc = __copy_acc;
            var xs = __copy_xs;
            tco: while (true) {
                var _1093 = uncons(xs);
                if (_1093 instanceof Data_Maybe.Just && p(_1093.value0.head)) {
                    var __tco_acc = $colon(_1093.value0.head)(acc);
                    acc = __tco_acc;
                    xs = _1093.value0.tail;
                    continue tco;
                };
                return {
                    init: $foreign.reverse(acc), 
                    rest: xs
                };
            };
        };
    };
    return go([  ]);
};
var takeWhile = function (p) {
    return function (xs) {
        return (span(p)(xs)).init;
    };
};
var sortBy = function (comp) {
    return function (xs) {
        var comp$prime = function (x) {
            return function (y) {
                var _1097 = comp(x)(y);
                if (_1097 instanceof Prelude.GT) {
                    return 1;
                };
                if (_1097 instanceof Prelude.EQ) {
                    return 0;
                };
                if (_1097 instanceof Prelude.LT) {
                    return Prelude.negate(Prelude.ringInt)(1);
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-arrays/src/Data/Array.purs line 379, column 3 - line 384, column 1: " + [ _1097.constructor.name ]);
            };
        };
        return $foreign.sortImpl(comp$prime)(xs);
    };
};
var sort = function (__dict_Ord_1) {
    return function (xs) {
        return sortBy(Prelude.compare(__dict_Ord_1))(xs);
    };
};
var singleton = function (a) {
    return [ a ];
};
var replicateM = function (__dict_Monad_2) {
    return function (n) {
        return function (m) {
            if (Prelude["<"](Prelude.ordInt)(n)(1)) {
                return Prelude["return"](__dict_Monad_2["__superclass_Prelude.Applicative_0"]())([  ]);
            };
            if (Prelude.otherwise) {
                return Prelude.bind(__dict_Monad_2["__superclass_Prelude.Bind_1"]())(m)(function (_68) {
                    return Prelude.bind(__dict_Monad_2["__superclass_Prelude.Bind_1"]())(replicateM(__dict_Monad_2)(Prelude["-"](Prelude.ringInt)(n)(1))(m))(function (_67) {
                        return Prelude["return"](__dict_Monad_2["__superclass_Prelude.Applicative_0"]())($colon(_68)(_67));
                    });
                });
            };
            throw new Error("Failed pattern match: " + [ n.constructor.name, m.constructor.name ]);
        };
    };
};
var $$null = function (xs) {
    return Prelude["=="](Prelude.eqInt)($foreign.length(xs))(0);
};
var nubBy = function (eq) {
    return function (_639) {
        if (_639.length === 0) {
            return [  ];
        };
        var _1104 = uncons(_639);
        if (_1104 instanceof Data_Maybe.Just) {
            return $colon(_1104.value0.head)(nubBy(eq)($foreign.filter(function (y) {
                return Prelude.not(Prelude.booleanAlgebraBoolean)(eq(_1104.value0.head)(y));
            })(_1104.value0.tail)));
        };
        throw new Error("Failed pattern match: " + [ _1104.constructor.name ]);
    };
};
var nub = function (__dict_Eq_3) {
    return nubBy(Prelude.eq(__dict_Eq_3));
};
var some = function (__dict_Alternative_4) {
    return function (__dict_Lazy_5) {
        return function (v) {
            return Prelude["<*>"]((__dict_Alternative_4["__superclass_Prelude.Applicative_0"]())["__superclass_Prelude.Apply_0"]())(Prelude["<$>"](((__dict_Alternative_4["__superclass_Control.Plus.Plus_1"]())["__superclass_Control.Alt.Alt_0"]())["__superclass_Prelude.Functor_0"]())($colon)(v))(Control_Lazy.defer(__dict_Lazy_5)(function (_632) {
                return many(__dict_Alternative_4)(__dict_Lazy_5)(v);
            }));
        };
    };
};
var many = function (__dict_Alternative_6) {
    return function (__dict_Lazy_7) {
        return function (v) {
            return Control_Alt["<|>"]((__dict_Alternative_6["__superclass_Control.Plus.Plus_1"]())["__superclass_Control.Alt.Alt_0"]())(some(__dict_Alternative_6)(__dict_Lazy_7)(v))(Prelude.pure(__dict_Alternative_6["__superclass_Prelude.Applicative_0"]())([  ]));
        };
    };
};
var insertAt = $foreign._insertAt(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var init = function (xs) {
    if ($$null(xs)) {
        return Data_Maybe.Nothing.value;
    };
    if (Prelude.otherwise) {
        return new Data_Maybe.Just($foreign.slice(Prelude.zero(Prelude.semiringInt))(Prelude["-"](Prelude.ringInt)($foreign.length(xs))(Prelude.one(Prelude.semiringInt)))(xs));
    };
    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-arrays/src/Data/Array.purs line 209, column 1 - line 210, column 1: " + [ xs.constructor.name ]);
};
var index = $foreign.indexImpl(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var $bang$bang = index;
var last = function (xs) {
    return $bang$bang(xs)(Prelude["-"](Prelude.ringInt)($foreign.length(xs))(1));
};
var modifyAt = function (i) {
    return function (f) {
        return function (xs) {
            var go = function (x) {
                return updateAt(i)(f(x))(xs);
            };
            return Data_Maybe.maybe(Data_Maybe.Nothing.value)(go)($bang$bang(xs)(i));
        };
    };
};
var head = $foreign["uncons'"](Prelude["const"](Data_Maybe.Nothing.value))(function (x) {
    return function (_633) {
        return new Data_Maybe.Just(x);
    };
});
var groupBy = function (op) {
    var go = function (__copy_acc) {
        return function (__copy__641) {
            var acc = __copy_acc;
            var _641 = __copy__641;
            tco: while (true) {
                if (_641.length === 0) {
                    return $foreign.reverse(acc);
                };
                var _1111 = uncons(_641);
                if (_1111 instanceof Data_Maybe.Just) {
                    var sp = span(op(_1111.value0.head))(_1111.value0.tail);
                    var __tco_acc = $colon($colon(_1111.value0.head)(sp.init))(acc);
                    acc = __tco_acc;
                    _641 = sp.rest;
                    continue tco;
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-arrays/src/Data/Array.purs line 446, column 1 - line 447, column 1: " + [ _1111.constructor.name ]);
            };
        };
    };
    return go([  ]);
};
var group = function (__dict_Eq_8) {
    return function (xs) {
        return groupBy(Prelude.eq(__dict_Eq_8))(xs);
    };
};
var group$prime = function (__dict_Ord_9) {
    return Prelude["<<<"](Prelude.semigroupoidFn)(group(__dict_Ord_9["__superclass_Prelude.Eq_0"]()))(sort(__dict_Ord_9));
};
var foldM = function (__dict_Monad_10) {
    return function (f) {
        return function (a) {
            return $foreign["uncons'"](function (_638) {
                return Prelude["return"](__dict_Monad_10["__superclass_Prelude.Applicative_0"]())(a);
            })(function (b) {
                return function (bs) {
                    return Prelude[">>="](__dict_Monad_10["__superclass_Prelude.Bind_1"]())(f(a)(b))(function (a$prime) {
                        return foldM(__dict_Monad_10)(f)(a$prime)(bs);
                    });
                };
            });
        };
    };
};
var findLastIndex = $foreign.findLastIndexImpl(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var insertBy = function (cmp) {
    return function (x) {
        return function (ys) {
            var i = Data_Maybe.maybe(0)(function (_4) {
                return Prelude["+"](Prelude.semiringInt)(_4)(1);
            })(findLastIndex(function (y) {
                return Prelude["=="](Prelude.eqOrdering)(cmp(x)(y))(Prelude.GT.value);
            })(ys));
            return Data_Maybe_Unsafe.fromJust(insertAt(i)(x)(ys));
        };
    };
};
var insert = function (__dict_Ord_11) {
    return insertBy(Prelude.compare(__dict_Ord_11));
};
var findIndex = $foreign.findIndexImpl(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var intersectBy = function (eq) {
    return function (xs) {
        return function (ys) {
            return $foreign.filter(function (x) {
                return Data_Maybe.isJust(findIndex(eq(x))(ys));
            })(xs);
        };
    };
};
var intersect = function (__dict_Eq_12) {
    return intersectBy(Prelude.eq(__dict_Eq_12));
};
var filterM = function (__dict_Monad_13) {
    return function (p) {
        return $foreign["uncons'"](function (_635) {
            return Prelude.pure(__dict_Monad_13["__superclass_Prelude.Applicative_0"]())([  ]);
        })(function (x) {
            return function (xs) {
                return Prelude.bind(__dict_Monad_13["__superclass_Prelude.Bind_1"]())(p(x))(function (_70) {
                    return Prelude.bind(__dict_Monad_13["__superclass_Prelude.Bind_1"]())(filterM(__dict_Monad_13)(p)(xs))(function (_69) {
                        return Prelude["return"](__dict_Monad_13["__superclass_Prelude.Applicative_0"]())((function () {
                            if (_70) {
                                return $colon(x)(_69);
                            };
                            if (!_70) {
                                return _69;
                            };
                            throw new Error("Failed pattern match: " + [ _70.constructor.name ]);
                        })());
                    });
                });
            };
        });
    };
};
var elemLastIndex = function (__dict_Eq_14) {
    return function (x) {
        return findLastIndex(function (_6) {
            return Prelude["=="](__dict_Eq_14)(_6)(x);
        });
    };
};
var elemIndex = function (__dict_Eq_15) {
    return function (x) {
        return findIndex(function (_5) {
            return Prelude["=="](__dict_Eq_15)(_5)(x);
        });
    };
};
var dropWhile = function (p) {
    return function (xs) {
        return (span(p)(xs)).rest;
    };
};
var deleteAt = $foreign._deleteAt(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var deleteBy = function (eq) {
    return function (x) {
        return function (_640) {
            if (_640.length === 0) {
                return [  ];
            };
            return Data_Maybe.maybe(_640)(function (i) {
                return Data_Maybe_Unsafe.fromJust(deleteAt(i)(_640));
            })(findIndex(eq(x))(_640));
        };
    };
};
var unionBy = function (eq) {
    return function (xs) {
        return function (ys) {
            return Prelude["++"](Prelude.semigroupArray)(xs)(Data_Foldable.foldl(Data_Foldable.foldableArray)(Prelude.flip(deleteBy(eq)))(nubBy(eq)(ys))(xs));
        };
    };
};
var union = function (__dict_Eq_16) {
    return unionBy(Prelude["=="](__dict_Eq_16));
};
var $$delete = function (__dict_Eq_17) {
    return deleteBy(Prelude.eq(__dict_Eq_17));
};
var $bslash$bslash = function (__dict_Eq_18) {
    return function (xs) {
        return function (ys) {
            if ($$null(xs)) {
                return [  ];
            };
            if (Prelude.otherwise) {
                return $foreign["uncons'"](Prelude["const"](xs))(function (y) {
                    return function (ys_2) {
                        return $bslash$bslash(__dict_Eq_18)($$delete(__dict_Eq_18)(y)(xs))(ys_2);
                    };
                })(ys);
            };
            throw new Error("Failed pattern match: " + [ xs.constructor.name, ys.constructor.name ]);
        };
    };
};
var concatMap = Prelude.flip(Prelude.bind(Prelude.bindArray));
var mapMaybe = function (f) {
    return concatMap(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Maybe.maybe([  ])(singleton))(f));
};
var catMaybes = mapMaybe(Prelude.id(Prelude.categoryFn));
var alterAt = function (i) {
    return function (f) {
        return function (xs) {
            var go = function (x) {
                var _1123 = f(x);
                if (_1123 instanceof Data_Maybe.Nothing) {
                    return deleteAt(i)(xs);
                };
                if (_1123 instanceof Data_Maybe.Just) {
                    return updateAt(i)(_1123.value0)(xs);
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-arrays/src/Data/Array.purs line 319, column 3 - line 328, column 1: " + [ _1123.constructor.name ]);
            };
            return Data_Maybe.maybe(Data_Maybe.Nothing.value)(go)($bang$bang(xs)(i));
        };
    };
};
module.exports = {
    foldM: foldM, 
    unzip: unzip, 
    zip: zip, 
    zipWithA: zipWithA, 
    intersectBy: intersectBy, 
    intersect: intersect, 
    "\\\\": $bslash$bslash, 
    deleteBy: deleteBy, 
    "delete": $$delete, 
    unionBy: unionBy, 
    union: union, 
    nubBy: nubBy, 
    nub: nub, 
    groupBy: groupBy, 
    "group'": group$prime, 
    group: group, 
    span: span, 
    dropWhile: dropWhile, 
    takeWhile: takeWhile, 
    take: take, 
    sortBy: sortBy, 
    sort: sort, 
    catMaybes: catMaybes, 
    mapMaybe: mapMaybe, 
    filterM: filterM, 
    concatMap: concatMap, 
    alterAt: alterAt, 
    modifyAt: modifyAt, 
    updateAt: updateAt, 
    deleteAt: deleteAt, 
    insertAt: insertAt, 
    findLastIndex: findLastIndex, 
    findIndex: findIndex, 
    elemLastIndex: elemLastIndex, 
    elemIndex: elemIndex, 
    index: index, 
    "!!": $bang$bang, 
    uncons: uncons, 
    init: init, 
    tail: tail, 
    last: last, 
    head: head, 
    insertBy: insertBy, 
    insert: insert, 
    ":": $colon, 
    "null": $$null, 
    many: many, 
    some: some, 
    replicateM: replicateM, 
    "..": $dot$dot, 
    singleton: singleton, 
    zipWith: $foreign.zipWith, 
    drop: $foreign.drop, 
    slice: $foreign.slice, 
    filter: $foreign.filter, 
    concat: $foreign.concat, 
    reverse: $foreign.reverse, 
    snoc: $foreign.snoc, 
    cons: $foreign.cons, 
    length: $foreign.length, 
    replicate: $foreign.replicate, 
    range: $foreign.range
};

},{"./foreign":43,"Control.Alt":3,"Control.Alternative":4,"Control.Lazy":10,"Control.MonadPlus":37,"Control.Plus":38,"Data.Foldable":68,"Data.Functor.Invariant":71,"Data.Maybe":81,"Data.Maybe.Unsafe":80,"Data.Monoid":87,"Data.Traversable":94,"Data.Tuple":95,"Prelude":107}],45:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Apply = require("Control.Apply");
var Data_Monoid_Disj = require("Data.Monoid.Disj");
var Data_Monoid_Conj = require("Data.Monoid.Conj");
var Data_Monoid = require("Data.Monoid");
var Bifoldable = function (bifoldMap, bifoldl, bifoldr) {
    this.bifoldMap = bifoldMap;
    this.bifoldl = bifoldl;
    this.bifoldr = bifoldr;
};
var bifoldr = function (dict) {
    return dict.bifoldr;
};
var bitraverse_ = function (__dict_Bifoldable_0) {
    return function (__dict_Applicative_1) {
        return function (f) {
            return function (g) {
                return bifoldr(__dict_Bifoldable_0)(Prelude["<<<"](Prelude.semigroupoidFn)(Control_Apply["*>"](__dict_Applicative_1["__superclass_Prelude.Apply_0"]()))(f))(Prelude["<<<"](Prelude.semigroupoidFn)(Control_Apply["*>"](__dict_Applicative_1["__superclass_Prelude.Apply_0"]()))(g))(Prelude.pure(__dict_Applicative_1)(Prelude.unit));
            };
        };
    };
};
var bifor_ = function (__dict_Bifoldable_2) {
    return function (__dict_Applicative_3) {
        return function (t) {
            return function (f) {
                return function (g) {
                    return bitraverse_(__dict_Bifoldable_2)(__dict_Applicative_3)(f)(g)(t);
                };
            };
        };
    };
};
var bisequence_ = function (__dict_Bifoldable_4) {
    return function (__dict_Applicative_5) {
        return bitraverse_(__dict_Bifoldable_4)(__dict_Applicative_5)(Prelude.id(Prelude.categoryFn))(Prelude.id(Prelude.categoryFn));
    };
};
var bifoldl = function (dict) {
    return dict.bifoldl;
};
var bifoldMap = function (dict) {
    return dict.bifoldMap;
};
var bifold = function (__dict_Bifoldable_6) {
    return function (__dict_Monoid_7) {
        return bifoldMap(__dict_Bifoldable_6)(__dict_Monoid_7)(Prelude.id(Prelude.categoryFn))(Prelude.id(Prelude.categoryFn));
    };
};
var biany = function (__dict_Bifoldable_8) {
    return function (__dict_BooleanAlgebra_9) {
        return function (p) {
            return function (q) {
                return Prelude["<<<"](Prelude.semigroupoidFn)(Data_Monoid_Disj.runDisj)(bifoldMap(__dict_Bifoldable_8)(Data_Monoid_Disj.monoidDisj(__dict_BooleanAlgebra_9))(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Monoid_Disj.Disj)(p))(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Monoid_Disj.Disj)(q)));
            };
        };
    };
};
var biall = function (__dict_Bifoldable_10) {
    return function (__dict_BooleanAlgebra_11) {
        return function (p) {
            return function (q) {
                return Prelude["<<<"](Prelude.semigroupoidFn)(Data_Monoid_Conj.runConj)(bifoldMap(__dict_Bifoldable_10)(Data_Monoid_Conj.monoidConj(__dict_BooleanAlgebra_11))(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Monoid_Conj.Conj)(p))(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Monoid_Conj.Conj)(q)));
            };
        };
    };
};
module.exports = {
    Bifoldable: Bifoldable, 
    biall: biall, 
    biany: biany, 
    bisequence_: bisequence_, 
    bifor_: bifor_, 
    bitraverse_: bitraverse_, 
    bifold: bifold, 
    bifoldMap: bifoldMap, 
    bifoldl: bifoldl, 
    bifoldr: bifoldr
};

},{"Control.Apply":5,"Data.Monoid":87,"Data.Monoid.Conj":83,"Data.Monoid.Disj":84,"Prelude":107}],46:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Bifunctor = function (bimap) {
    this.bimap = bimap;
};
var bimap = function (dict) {
    return dict.bimap;
};
var lmap = function (__dict_Bifunctor_0) {
    return function (f) {
        return bimap(__dict_Bifunctor_0)(f)(Prelude.id(Prelude.categoryFn));
    };
};
var rmap = function (__dict_Bifunctor_1) {
    return bimap(__dict_Bifunctor_1)(Prelude.id(Prelude.categoryFn));
};
module.exports = {
    Bifunctor: Bifunctor, 
    rmap: rmap, 
    lmap: lmap, 
    bimap: bimap
};

},{"Prelude":107}],47:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Bifoldable = require("Data.Bifoldable");
var Data_Bifunctor = require("Data.Bifunctor");
var Bitraversable = function (__superclass_Data$dotBifoldable$dotBifoldable_1, __superclass_Data$dotBifunctor$dotBifunctor_0, bisequence, bitraverse) {
    this["__superclass_Data.Bifoldable.Bifoldable_1"] = __superclass_Data$dotBifoldable$dotBifoldable_1;
    this["__superclass_Data.Bifunctor.Bifunctor_0"] = __superclass_Data$dotBifunctor$dotBifunctor_0;
    this.bisequence = bisequence;
    this.bitraverse = bitraverse;
};
var bitraverse = function (dict) {
    return dict.bitraverse;
};
var bisequence = function (dict) {
    return dict.bisequence;
};
var bifor = function (__dict_Bitraversable_0) {
    return function (__dict_Applicative_1) {
        return function (t) {
            return function (f) {
                return function (g) {
                    return bitraverse(__dict_Bitraversable_0)(__dict_Applicative_1)(f)(g)(t);
                };
            };
        };
    };
};
module.exports = {
    Bitraversable: Bitraversable, 
    bifor: bifor, 
    bisequence: bisequence, 
    bitraverse: bitraverse
};

},{"Data.Bifoldable":45,"Data.Bifunctor":46,"Prelude":107}],48:[function(require,module,exports){
/* global exports */
"use strict";

// module Data.Char

exports.toString = function (c) {
  return c;
};

exports.toCharCode = function (c) {
  return c.charCodeAt(0);
};

exports.fromCharCode = function (c) {
  return String.fromCharCode(c);
};

},{}],49:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var showChar = new Prelude.Show(function (c) {
    return "Char " + Prelude.show(Prelude.showString)($foreign.toString(c));
});
var boundedChar = new Prelude.Bounded($foreign.fromCharCode(65535), $foreign.fromCharCode(Prelude.zero(Prelude.semiringInt)));
module.exports = {
    boundedChar: boundedChar, 
    showChar: showChar, 
    toCharCode: $foreign.toCharCode, 
    fromCharCode: $foreign.fromCharCode, 
    toString: $foreign.toString
};

},{"./foreign":48,"Prelude":107}],50:[function(require,module,exports){
/* jshint maxparams: false */
/* global exports, XMLHttpRequest */
"use strict";

// module Data.DOM.Simple.Ajax

exports.maybeFn = function (nothing, just, a) {
  return a == null ? nothing : just(a);
};

exports.makeXMLHttpRequest = function () {
  return new XMLHttpRequest();
};

exports.responseText = function (obj) {
  return function () {
    return obj.responseText;
  };
};

exports.status = function (obj) {
  return function () {
    return obj.status;
  };
};

exports.statusText = function (obj) {
  return function () {
    return obj.statusText;
  };
};

exports.setRequestHeader = function (key) {
  return function (value) {
    return function (obj) {
      return function () {
        obj.setRequestHeader(key, value);
        return {};
      };
    };
  };
};

exports.getAllResponseHeaders = function (obj) {
  return function () {
    return obj.getAllResponseHeaders();
  };
};

exports.overrideMimeType = function (mime) {
  return function (obj) {
    return function () {
      obj.overrideMimeType(mime);
      return {};
    };
  };
};

},{}],51:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Data_Function = require("Data.Function");
var Prelude = require("Prelude");
var Data_DOM_Simple_Unsafe_Ajax = require("Data.DOM.Simple.Unsafe.Ajax");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Maybe = require("Data.Maybe");
var DOM = require("DOM");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
var Default = (function () {
    function Default() {

    };
    Default.value = new Default();
    return Default;
})();
var $$ArrayBuffer = (function () {
    function ArrayBuffer() {

    };
    ArrayBuffer.value = new ArrayBuffer();
    return ArrayBuffer;
})();
var Blob = (function () {
    function Blob() {

    };
    Blob.value = new Blob();
    return Blob;
})();
var Document = (function () {
    function Document() {

    };
    Document.value = new Document();
    return Document;
})();
var Json = (function () {
    function Json() {

    };
    Json.value = new Json();
    return Json;
})();
var Text = (function () {
    function Text() {

    };
    Text.value = new Text();
    return Text;
})();
var MozBlob = (function () {
    function MozBlob() {

    };
    MozBlob.value = new MozBlob();
    return MozBlob;
})();
var MozChunkedText = (function () {
    function MozChunkedText() {

    };
    MozChunkedText.value = new MozChunkedText();
    return MozChunkedText;
})();
var MozChunkedArrayBuffer = (function () {
    function MozChunkedArrayBuffer() {

    };
    MozChunkedArrayBuffer.value = new MozChunkedArrayBuffer();
    return MozChunkedArrayBuffer;
})();
var Unsent = (function () {
    function Unsent() {

    };
    Unsent.value = new Unsent();
    return Unsent;
})();
var Opened = (function () {
    function Opened() {

    };
    Opened.value = new Opened();
    return Opened;
})();
var HeadersReceived = (function () {
    function HeadersReceived() {

    };
    HeadersReceived.value = new HeadersReceived();
    return HeadersReceived;
})();
var Loading = (function () {
    function Loading() {

    };
    Loading.value = new Loading();
    return Loading;
})();
var Done = (function () {
    function Done() {

    };
    Done.value = new Done();
    return Done;
})();
var GET = (function () {
    function GET() {

    };
    GET.value = new GET();
    return GET;
})();
var POST = (function () {
    function POST() {

    };
    POST.value = new POST();
    return POST;
})();
var PUT = (function () {
    function PUT() {

    };
    PUT.value = new PUT();
    return PUT;
})();
var DELETE = (function () {
    function DELETE() {

    };
    DELETE.value = new DELETE();
    return DELETE;
})();
var PATCH = (function () {
    function PATCH() {

    };
    PATCH.value = new PATCH();
    return PATCH;
})();
var HEAD = (function () {
    function HEAD() {

    };
    HEAD.value = new HEAD();
    return HEAD;
})();
var OPTIONS = (function () {
    function OPTIONS() {

    };
    OPTIONS.value = new OPTIONS();
    return OPTIONS;
})();
var JSONP = (function () {
    function JSONP() {

    };
    JSONP.value = new JSONP();
    return JSONP;
})();
var HttpMethod = (function () {
    function HttpMethod(value0) {
        this.value0 = value0;
    };
    HttpMethod.create = function (value0) {
        return new HttpMethod(value0);
    };
    return HttpMethod;
})();
var NoData = (function () {
    function NoData() {

    };
    NoData.value = new NoData();
    return NoData;
})();
var TextData = (function () {
    function TextData(value0) {
        this.value0 = value0;
    };
    TextData.create = function (value0) {
        return new TextData(value0);
    };
    return TextData;
})();
var ArrayBufferData = (function () {
    function ArrayBufferData(value0) {
        this.value0 = value0;
    };
    ArrayBufferData.create = function (value0) {
        return new ArrayBufferData(value0);
    };
    return ArrayBufferData;
})();
var ArrayBufferViewData = (function () {
    function ArrayBufferViewData(value0) {
        this.value0 = value0;
    };
    ArrayBufferViewData.create = function (value0) {
        return new ArrayBufferViewData(value0);
    };
    return ArrayBufferViewData;
})();
var BlobData = (function () {
    function BlobData(value0) {
        this.value0 = value0;
    };
    BlobData.create = function (value0) {
        return new BlobData(value0);
    };
    return BlobData;
})();
var FormData = (function () {
    function FormData(value0) {
        this.value0 = value0;
    };
    FormData.create = function (value0) {
        return new FormData(value0);
    };
    return FormData;
})();
var DocumentData = (function () {
    function DocumentData(value0) {
        this.value0 = value0;
    };
    DocumentData.create = function (value0) {
        return new DocumentData(value0);
    };
    return DocumentData;
})();
var JsonData = (function () {
    function JsonData(value0) {
        this.value0 = value0;
    };
    JsonData.create = function (value0) {
        return new JsonData(value0);
    };
    return JsonData;
})();
var showResponseType = new Prelude.Show(function (_48) {
    if (_48 instanceof Default) {
        return "";
    };
    if (_48 instanceof $$ArrayBuffer) {
        return "arraybuffer";
    };
    if (_48 instanceof Blob) {
        return "blob";
    };
    if (_48 instanceof Document) {
        return "document";
    };
    if (_48 instanceof Json) {
        return "json";
    };
    if (_48 instanceof Text) {
        return "text";
    };
    if (_48 instanceof MozBlob) {
        return "moz-blob";
    };
    if (_48 instanceof MozChunkedText) {
        return "moz-chunked-text";
    };
    if (_48 instanceof MozChunkedArrayBuffer) {
        return "moz-chunked-arraybuffer";
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Ajax.purs line 73, column 1 - line 84, column 1: " + [ _48.constructor.name ]);
});
var showHttpMethod = new Prelude.Show(function (_47) {
    if (_47 instanceof GET) {
        return "GET";
    };
    if (_47 instanceof POST) {
        return "POST";
    };
    if (_47 instanceof PUT) {
        return "PUT";
    };
    if (_47 instanceof DELETE) {
        return "DELETE";
    };
    if (_47 instanceof PATCH) {
        return "PATCH";
    };
    if (_47 instanceof HEAD) {
        return "HEAD";
    };
    if (_47 instanceof OPTIONS) {
        return "OPTIONS";
    };
    if (_47 instanceof JSONP) {
        return "JSONP";
    };
    if (_47 instanceof HttpMethod) {
        return _47.value0;
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Ajax.purs line 62, column 1 - line 73, column 1: " + [ _47.constructor.name ]);
});
var setResponseType = function (rt) {
    return function (x) {
        return Data_DOM_Simple_Unsafe_Ajax.unsafeSetResponseType(x, Prelude.show(showResponseType)(rt));
    };
};
var send = function (_46) {
    return function (x) {
        if (_46 instanceof NoData) {
            return Data_DOM_Simple_Unsafe_Ajax.unsafeSend(x);
        };
        if (_46 instanceof TextData) {
            return Data_DOM_Simple_Unsafe_Ajax.unsafeSendWithPayload(x, _46.value0);
        };
        if (_46 instanceof ArrayBufferData) {
            return Data_DOM_Simple_Unsafe_Ajax.unsafeSendWithPayload(x, _46.value0);
        };
        if (_46 instanceof ArrayBufferViewData) {
            return Data_DOM_Simple_Unsafe_Ajax.unsafeSendWithPayload(x, _46.value0);
        };
        if (_46 instanceof BlobData) {
            return Data_DOM_Simple_Unsafe_Ajax.unsafeSendWithPayload(x, _46.value0);
        };
        if (_46 instanceof DocumentData) {
            return Data_DOM_Simple_Unsafe_Ajax.unsafeSendWithPayload(x, _46.value0);
        };
        if (_46 instanceof FormData) {
            return Data_DOM_Simple_Unsafe_Ajax.unsafeSendWithPayload(x, _46.value0);
        };
        if (_46 instanceof JsonData) {
            return Data_DOM_Simple_Unsafe_Ajax.unsafeSendWithPayload(x, _46.value0);
        };
        throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Ajax.purs line 107, column 1 - line 108, column 1: " + [ _46.constructor.name, x.constructor.name ]);
    };
};
var responseType = function (obj) {
    return function __do() {
        var _2 = Data_DOM_Simple_Unsafe_Ajax.unsafeResponseType(obj)();
        return Prelude["return"](Control_Monad_Eff.applicativeEff)((function () {
            if (_2 === "") {
                return Default.value;
            };
            if (_2 === "arraybuffer") {
                return $$ArrayBuffer.value;
            };
            if (_2 === "blob") {
                return Blob.value;
            };
            if (_2 === "document") {
                return Document.value;
            };
            if (_2 === "json") {
                return Json.value;
            };
            if (_2 === "text") {
                return Text.value;
            };
            if (_2 === "moz-blob") {
                return MozBlob.value;
            };
            if (_2 === "moz-chunked-test") {
                return MozChunkedText.value;
            };
            if (_2 === "moz-chunked-arraybuffer") {
                return MozChunkedArrayBuffer.value;
            };
            throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Ajax.purs line 120, column 1 - line 121, column 1: " + [ _2.constructor.name ]);
        })())();
    };
};
var response = function (x) {
    var get = function (t) {
        return Prelude["<$>"](Control_Monad_Eff.functorEff)(Data_Function.runFn3($foreign.maybeFn)(NoData.value)(t))(Data_DOM_Simple_Unsafe_Ajax.unsafeResponse(x));
    };
    return function __do() {
        var _3 = responseType(x)();
        return (function () {
            if (_3 instanceof Default) {
                return get(TextData.create);
            };
            if (_3 instanceof $$ArrayBuffer) {
                return get(ArrayBufferData.create);
            };
            if (_3 instanceof Blob) {
                return get(BlobData.create);
            };
            if (_3 instanceof Document) {
                return get(DocumentData.create);
            };
            if (_3 instanceof Json) {
                return get(JsonData.create);
            };
            if (_3 instanceof Text) {
                return get(TextData.create);
            };
            if (_3 instanceof MozBlob) {
                return get(BlobData.create);
            };
            if (_3 instanceof MozChunkedText) {
                return get(TextData.create);
            };
            if (_3 instanceof MozChunkedArrayBuffer) {
                return get(ArrayBufferData.create);
            };
            throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Ajax.purs line 134, column 1 - line 135, column 1: " + [ _3.constructor.name ]);
        })()();
    };
};
var readyState = function (x) {
    return function __do() {
        var _1 = Data_DOM_Simple_Unsafe_Ajax.unsafeReadyState(x)();
        return Prelude["return"](Control_Monad_Eff.applicativeEff)((function () {
            if (_1 === 0) {
                return Unsent.value;
            };
            if (_1 === 1) {
                return Opened.value;
            };
            if (_1 === 2) {
                return HeadersReceived.value;
            };
            if (_1 === 3) {
                return Loading.value;
            };
            if (_1 === 4) {
                return Done.value;
            };
            throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Ajax.purs line 91, column 1 - line 92, column 1: " + [ _1.constructor.name ]);
        })())();
    };
};
var open = function (m) {
    return function (u) {
        return function (x) {
            return Data_DOM_Simple_Unsafe_Ajax.unsafeOpen(x, Prelude.show(showHttpMethod)(m), u);
        };
    };
};
var onReadyStateChange = function (f) {
    return function (x) {
        return Data_DOM_Simple_Unsafe_Ajax.unsafeOnReadyStateChange(x, f);
    };
};
var maybe = Data_Function.runFn3($foreign.maybeFn)(Data_Maybe.Nothing.value)(Data_Maybe.Just.create);
var getResponseHeader = function (k) {
    return function (x) {
        return Prelude["<$>"](Control_Monad_Eff.functorEff)(maybe)(Data_DOM_Simple_Unsafe_Ajax.unsafeGetResponseHeader(x, k));
    };
};
module.exports = {
    NoData: NoData, 
    TextData: TextData, 
    ArrayBufferData: ArrayBufferData, 
    ArrayBufferViewData: ArrayBufferViewData, 
    BlobData: BlobData, 
    FormData: FormData, 
    DocumentData: DocumentData, 
    JsonData: JsonData, 
    Default: Default, 
    "ArrayBuffer": $$ArrayBuffer, 
    Blob: Blob, 
    Document: Document, 
    Json: Json, 
    Text: Text, 
    MozBlob: MozBlob, 
    MozChunkedText: MozChunkedText, 
    MozChunkedArrayBuffer: MozChunkedArrayBuffer, 
    GET: GET, 
    POST: POST, 
    PUT: PUT, 
    DELETE: DELETE, 
    PATCH: PATCH, 
    HEAD: HEAD, 
    OPTIONS: OPTIONS, 
    JSONP: JSONP, 
    HttpMethod: HttpMethod, 
    Unsent: Unsent, 
    Opened: Opened, 
    HeadersReceived: HeadersReceived, 
    Loading: Loading, 
    Done: Done, 
    getResponseHeader: getResponseHeader, 
    response: response, 
    responseType: responseType, 
    setResponseType: setResponseType, 
    send: send, 
    open: open, 
    onReadyStateChange: onReadyStateChange, 
    readyState: readyState, 
    showHttpMethod: showHttpMethod, 
    showResponseType: showResponseType, 
    overrideMimeType: $foreign.overrideMimeType, 
    getAllResponseHeaders: $foreign.getAllResponseHeaders, 
    setRequestHeader: $foreign.setRequestHeader, 
    statusText: $foreign.statusText, 
    status: $foreign.status, 
    responseText: $foreign.responseText, 
    makeXMLHttpRequest: $foreign.makeXMLHttpRequest
};

},{"./foreign":50,"Control.Monad.Eff":23,"DOM":40,"Data.DOM.Simple.Types":53,"Data.DOM.Simple.Unsafe.Ajax":55,"Data.Function":70,"Data.Maybe":81,"Prelude":107}],52:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Data_DOM_Simple_Unsafe_Events = require("Data.DOM.Simple.Unsafe.Events");
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Control_Monad = require("Control.Monad");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
var Data_DOM_Simple_Window = require("Data.DOM.Simple.Window");
var Data_DOM_Simple_Ajax = require("Data.DOM.Simple.Ajax");
var DOM = require("DOM");
var LoadEvent = (function () {
    function LoadEvent() {

    };
    LoadEvent.value = new LoadEvent();
    return LoadEvent;
})();
var UnloadEvent = (function () {
    function UnloadEvent() {

    };
    UnloadEvent.value = new UnloadEvent();
    return UnloadEvent;
})();
var AbortEvent = (function () {
    function AbortEvent() {

    };
    AbortEvent.value = new AbortEvent();
    return AbortEvent;
})();
var ErrorEvent = (function () {
    function ErrorEvent() {

    };
    ErrorEvent.value = new ErrorEvent();
    return ErrorEvent;
})();
var SelectEvent = (function () {
    function SelectEvent() {

    };
    SelectEvent.value = new SelectEvent();
    return SelectEvent;
})();
var ResizeEvent = (function () {
    function ResizeEvent() {

    };
    ResizeEvent.value = new ResizeEvent();
    return ResizeEvent;
})();
var ScrollEvent = (function () {
    function ScrollEvent() {

    };
    ScrollEvent.value = new ScrollEvent();
    return ScrollEvent;
})();
var MouseMoveEvent = (function () {
    function MouseMoveEvent() {

    };
    MouseMoveEvent.value = new MouseMoveEvent();
    return MouseMoveEvent;
})();
var MouseOverEvent = (function () {
    function MouseOverEvent() {

    };
    MouseOverEvent.value = new MouseOverEvent();
    return MouseOverEvent;
})();
var MouseEnterEvent = (function () {
    function MouseEnterEvent() {

    };
    MouseEnterEvent.value = new MouseEnterEvent();
    return MouseEnterEvent;
})();
var MouseOutEvent = (function () {
    function MouseOutEvent() {

    };
    MouseOutEvent.value = new MouseOutEvent();
    return MouseOutEvent;
})();
var MouseLeaveEvent = (function () {
    function MouseLeaveEvent() {

    };
    MouseLeaveEvent.value = new MouseLeaveEvent();
    return MouseLeaveEvent;
})();
var MouseClickEvent = (function () {
    function MouseClickEvent() {

    };
    MouseClickEvent.value = new MouseClickEvent();
    return MouseClickEvent;
})();
var MouseDblClickEvent = (function () {
    function MouseDblClickEvent() {

    };
    MouseDblClickEvent.value = new MouseDblClickEvent();
    return MouseDblClickEvent;
})();
var MouseUpEvent = (function () {
    function MouseUpEvent() {

    };
    MouseUpEvent.value = new MouseUpEvent();
    return MouseUpEvent;
})();
var MouseDownEvent = (function () {
    function MouseDownEvent() {

    };
    MouseDownEvent.value = new MouseDownEvent();
    return MouseDownEvent;
})();
var KeydownEvent = (function () {
    function KeydownEvent() {

    };
    KeydownEvent.value = new KeydownEvent();
    return KeydownEvent;
})();
var KeypressEvent = (function () {
    function KeypressEvent() {

    };
    KeypressEvent.value = new KeypressEvent();
    return KeypressEvent;
})();
var KeyupEvent = (function () {
    function KeyupEvent() {

    };
    KeyupEvent.value = new KeyupEvent();
    return KeyupEvent;
})();
var KeyLocationStandard = (function () {
    function KeyLocationStandard() {

    };
    KeyLocationStandard.value = new KeyLocationStandard();
    return KeyLocationStandard;
})();
var KeyLocationLeft = (function () {
    function KeyLocationLeft() {

    };
    KeyLocationLeft.value = new KeyLocationLeft();
    return KeyLocationLeft;
})();
var KeyLocationRight = (function () {
    function KeyLocationRight() {

    };
    KeyLocationRight.value = new KeyLocationRight();
    return KeyLocationRight;
})();
var KeyLocationNumpad = (function () {
    function KeyLocationNumpad() {

    };
    KeyLocationNumpad.value = new KeyLocationNumpad();
    return KeyLocationNumpad;
})();
var Read = function (read) {
    this.read = read;
};
var Event = function (eventTarget, preventDefault, stopPropagation) {
    this.eventTarget = eventTarget;
    this.preventDefault = preventDefault;
    this.stopPropagation = stopPropagation;
};
var MouseEvent = function (__superclass_Data$dotDOM$dotSimple$dotEvents$dotEvent_0, mouseEventType, screenX, screenY) {
    this["__superclass_Data.DOM.Simple.Events.Event_0"] = __superclass_Data$dotDOM$dotSimple$dotEvents$dotEvent_0;
    this.mouseEventType = mouseEventType;
    this.screenX = screenX;
    this.screenY = screenY;
};
var MouseEventTarget = function (addMouseEventListener, removeMouseEventListener) {
    this.addMouseEventListener = addMouseEventListener;
    this.removeMouseEventListener = removeMouseEventListener;
};
var KeyboardEvent = function (__superclass_Data$dotDOM$dotSimple$dotEvents$dotEvent_0, altKey, ctrlKey, key, keyCode, keyLocation, keyboardEventType, metaKey, shiftKey) {
    this["__superclass_Data.DOM.Simple.Events.Event_0"] = __superclass_Data$dotDOM$dotSimple$dotEvents$dotEvent_0;
    this.altKey = altKey;
    this.ctrlKey = ctrlKey;
    this.key = key;
    this.keyCode = keyCode;
    this.keyLocation = keyLocation;
    this.keyboardEventType = keyboardEventType;
    this.metaKey = metaKey;
    this.shiftKey = shiftKey;
};
var KeyboardEventTarget = function (addKeyboardEventListener, removeKeyboardEventListener) {
    this.addKeyboardEventListener = addKeyboardEventListener;
    this.removeKeyboardEventListener = removeKeyboardEventListener;
};
var UIEvent = function (__superclass_Data$dotDOM$dotSimple$dotEvents$dotEvent_0, detail, view) {
    this["__superclass_Data.DOM.Simple.Events.Event_0"] = __superclass_Data$dotDOM$dotSimple$dotEvents$dotEvent_0;
    this.detail = detail;
    this.view = view;
};
var UIEventTarget = function (addUIEventListener, removeUIEventListener) {
    this.addUIEventListener = addUIEventListener;
    this.removeUIEventListener = removeUIEventListener;
};
var view = function (dict) {
    return dict.view;
};
var uiEventTypeShow = new Prelude.Show(function (_63) {
    if (_63 instanceof LoadEvent) {
        return "load";
    };
    if (_63 instanceof UnloadEvent) {
        return "unload";
    };
    if (_63 instanceof AbortEvent) {
        return "abort";
    };
    if (_63 instanceof ErrorEvent) {
        return "error";
    };
    if (_63 instanceof SelectEvent) {
        return "select";
    };
    if (_63 instanceof ResizeEvent) {
        return "resize";
    };
    if (_63 instanceof ScrollEvent) {
        return "scroll";
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Events.purs line 176, column 1 - line 185, column 1: " + [ _63.constructor.name ]);
});
var uiEventTypeRead = new Read(function (_64) {
    if (_64 === "load") {
        return LoadEvent.value;
    };
    if (_64 === "unload") {
        return UnloadEvent.value;
    };
    if (_64 === "abort") {
        return AbortEvent.value;
    };
    if (_64 === "error") {
        return ErrorEvent.value;
    };
    if (_64 === "select") {
        return SelectEvent.value;
    };
    if (_64 === "resize") {
        return ResizeEvent.value;
    };
    if (_64 === "scroll") {
        return ScrollEvent.value;
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Events.purs line 185, column 1 - line 194, column 1: " + [ _64.constructor.name ]);
});
var uiEventTargetHTMLWindow = new UIEventTarget(function (__dict_UIEvent_0) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(uiEventTypeShow)(typ));
    };
}, function (__dict_UIEvent_1) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(uiEventTypeShow)(typ));
    };
});
var toKeyLocation = function (_58) {
    if (_58 === 0) {
        return KeyLocationStandard.value;
    };
    if (_58 === 1) {
        return KeyLocationLeft.value;
    };
    if (_58 === 2) {
        return KeyLocationRight.value;
    };
    if (_58 === 3) {
        return KeyLocationNumpad.value;
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Events.purs line 110, column 1 - line 111, column 1: " + [ _58.constructor.name ]);
};
var stopPropagation = function (dict) {
    return dict.stopPropagation;
};
var shiftKey = function (dict) {
    return dict.shiftKey;
};
var screenY = function (dict) {
    return dict.screenY;
};
var screenX = function (dict) {
    return dict.screenX;
};
var removeUIEventListener = function (dict) {
    return dict.removeUIEventListener;
};
var removeMouseEventListener = function (dict) {
    return dict.removeMouseEventListener;
};
var removeKeyboardEventListener = function (dict) {
    return dict.removeKeyboardEventListener;
};
var read = function (dict) {
    return dict.read;
};
var preventDefault = function (dict) {
    return dict.preventDefault;
};
var mouseEventTypeShow = new Prelude.Show(function (_59) {
    if (_59 instanceof MouseMoveEvent) {
        return "mousemove";
    };
    if (_59 instanceof MouseOverEvent) {
        return "mouseover";
    };
    if (_59 instanceof MouseEnterEvent) {
        return "mouseenter";
    };
    if (_59 instanceof MouseOutEvent) {
        return "mouseout";
    };
    if (_59 instanceof MouseLeaveEvent) {
        return "mouseleave";
    };
    if (_59 instanceof MouseClickEvent) {
        return "click";
    };
    if (_59 instanceof MouseDblClickEvent) {
        return "dblclick";
    };
    if (_59 instanceof MouseUpEvent) {
        return "mouseup";
    };
    if (_59 instanceof MouseDownEvent) {
        return "mousedown";
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Events.purs line 36, column 1 - line 47, column 1: " + [ _59.constructor.name ]);
});
var mouseEventTypeRead = new Read(function (_60) {
    if (_60 === "mousemove") {
        return MouseMoveEvent.value;
    };
    if (_60 === "mouseover") {
        return MouseOverEvent.value;
    };
    if (_60 === "mouseenter") {
        return MouseEnterEvent.value;
    };
    if (_60 === "mouseout") {
        return MouseOutEvent.value;
    };
    if (_60 === "mouseleave") {
        return MouseLeaveEvent.value;
    };
    if (_60 === "click") {
        return MouseClickEvent.value;
    };
    if (_60 === "dblclick") {
        return MouseDblClickEvent.value;
    };
    if (_60 === "mouseup") {
        return MouseUpEvent.value;
    };
    if (_60 === "mousedown") {
        return MouseDownEvent.value;
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Events.purs line 47, column 1 - line 58, column 1: " + [ _60.constructor.name ]);
});
var mouseEventType = function (dict) {
    return dict.mouseEventType;
};
var mouseEventTargetHTMLWindow = new MouseEventTarget(function (__dict_MouseEvent_2) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(mouseEventTypeShow)(typ));
    };
}, function (__dict_MouseEvent_3) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(mouseEventTypeShow)(typ));
    };
});
var mouseEventTargetHTMLElement = new MouseEventTarget(function (__dict_MouseEvent_4) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(mouseEventTypeShow)(typ));
    };
}, function (__dict_MouseEvent_5) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(mouseEventTypeShow)(typ));
    };
});
var mouseEventTargetHTMLDocument = new MouseEventTarget(function (__dict_MouseEvent_6) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(mouseEventTypeShow)(typ));
    };
}, function (__dict_MouseEvent_7) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(mouseEventTypeShow)(typ));
    };
});
var metaKey = function (dict) {
    return dict.metaKey;
};
var keyboardEventTypeShow = new Prelude.Show(function (_61) {
    if (_61 instanceof KeydownEvent) {
        return "keydown";
    };
    if (_61 instanceof KeypressEvent) {
        return "keypress";
    };
    if (_61 instanceof KeyupEvent) {
        return "keyup";
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Events.purs line 98, column 1 - line 103, column 1: " + [ _61.constructor.name ]);
});
var keyboardEventTypeRead = new Read(function (_62) {
    if (_62 === "keydown") {
        return KeydownEvent.value;
    };
    if (_62 === "keypress") {
        return KeypressEvent.value;
    };
    if (_62 === "keyup") {
        return KeyupEvent.value;
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Events.purs line 103, column 1 - line 108, column 1: " + [ _62.constructor.name ]);
});
var keyboardEventType = function (dict) {
    return dict.keyboardEventType;
};
var keyboardEventTargetHTMLWindow = new KeyboardEventTarget(function (__dict_KeyboardEvent_8) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(keyboardEventTypeShow)(typ));
    };
}, function (__dict_KeyboardEvent_9) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(keyboardEventTypeShow)(typ));
    };
});
var keyboardEventTargetHTMLElement = new KeyboardEventTarget(function (__dict_KeyboardEvent_10) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(keyboardEventTypeShow)(typ));
    };
}, function (__dict_KeyboardEvent_11) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(keyboardEventTypeShow)(typ));
    };
});
var keyboardEventTargetHTMLDocument = new KeyboardEventTarget(function (__dict_KeyboardEvent_12) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(keyboardEventTypeShow)(typ));
    };
}, function (__dict_KeyboardEvent_13) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(keyboardEventTypeShow)(typ));
    };
});
var keyLocation = function (dict) {
    return dict.keyLocation;
};
var keyCode = function (dict) {
    return dict.keyCode;
};
var key = function (dict) {
    return dict.key;
};
var eventTarget = function (dict) {
    return dict.eventTarget;
};
var eventDOMEvent = new Event(Data_DOM_Simple_Unsafe_Events.unsafeEventTarget, Data_DOM_Simple_Unsafe_Events.unsafePreventDefault, Data_DOM_Simple_Unsafe_Events.unsafeStopPropagation);
var keyboardEventDOMEvent = new KeyboardEvent(function () {
    return eventDOMEvent;
}, Data_DOM_Simple_Unsafe_Events.unsafeEventBooleanProp("altKey"), Data_DOM_Simple_Unsafe_Events.unsafeEventBooleanProp("ctrlKey"), Data_DOM_Simple_Unsafe_Events.unsafeEventKey, Data_DOM_Simple_Unsafe_Events.unsafeEventKeyCode, function (ev) {
    return Prelude["<$>"](Control_Monad_Eff.functorEff)(toKeyLocation)(Data_DOM_Simple_Unsafe_Events.unsafeEventNumberProp("keyLocation")(ev));
}, function (ev) {
    return Prelude["<$>"](Control_Monad_Eff.functorEff)(read(keyboardEventTypeRead))(Data_DOM_Simple_Unsafe_Events.unsafeEventStringProp("type")(ev));
}, Data_DOM_Simple_Unsafe_Events.unsafeEventBooleanProp("metaKey"), Data_DOM_Simple_Unsafe_Events.unsafeEventBooleanProp("shiftKey"));
var mouseEventDOMEvent = new MouseEvent(function () {
    return eventDOMEvent;
}, function (ev) {
    return Prelude["<$>"](Control_Monad_Eff.functorEff)(read(mouseEventTypeRead))(Data_DOM_Simple_Unsafe_Events.unsafeEventStringProp("type")(ev));
}, Data_DOM_Simple_Unsafe_Events.unsafeEventNumberProp("screenX"), Data_DOM_Simple_Unsafe_Events.unsafeEventNumberProp("screenY"));
var uiEventDOMEvent = new UIEvent(function () {
    return eventDOMEvent;
}, Data_DOM_Simple_Unsafe_Events.unsafeEventNumberProp("detail"), Data_DOM_Simple_Unsafe_Events.unsafeEventView);
var detail = function (dict) {
    return dict.detail;
};
var ctrlKey = function (dict) {
    return dict.ctrlKey;
};
var altKey = function (dict) {
    return dict.altKey;
};
var addUIEventListener = function (dict) {
    return dict.addUIEventListener;
};
var addMouseEventListener = function (dict) {
    return dict.addMouseEventListener;
};
var addKeyboardEventListener = function (dict) {
    return dict.addKeyboardEventListener;
};
module.exports = {
    LoadEvent: LoadEvent, 
    UnloadEvent: UnloadEvent, 
    AbortEvent: AbortEvent, 
    ErrorEvent: ErrorEvent, 
    SelectEvent: SelectEvent, 
    ResizeEvent: ResizeEvent, 
    ScrollEvent: ScrollEvent, 
    KeyLocationStandard: KeyLocationStandard, 
    KeyLocationLeft: KeyLocationLeft, 
    KeyLocationRight: KeyLocationRight, 
    KeyLocationNumpad: KeyLocationNumpad, 
    KeydownEvent: KeydownEvent, 
    KeypressEvent: KeypressEvent, 
    KeyupEvent: KeyupEvent, 
    MouseMoveEvent: MouseMoveEvent, 
    MouseOverEvent: MouseOverEvent, 
    MouseEnterEvent: MouseEnterEvent, 
    MouseOutEvent: MouseOutEvent, 
    MouseLeaveEvent: MouseLeaveEvent, 
    MouseClickEvent: MouseClickEvent, 
    MouseDblClickEvent: MouseDblClickEvent, 
    MouseUpEvent: MouseUpEvent, 
    MouseDownEvent: MouseDownEvent, 
    UIEventTarget: UIEventTarget, 
    UIEvent: UIEvent, 
    KeyboardEventTarget: KeyboardEventTarget, 
    KeyboardEvent: KeyboardEvent, 
    MouseEventTarget: MouseEventTarget, 
    MouseEvent: MouseEvent, 
    Event: Event, 
    Read: Read, 
    removeUIEventListener: removeUIEventListener, 
    addUIEventListener: addUIEventListener, 
    detail: detail, 
    view: view, 
    removeKeyboardEventListener: removeKeyboardEventListener, 
    addKeyboardEventListener: addKeyboardEventListener, 
    shiftKey: shiftKey, 
    metaKey: metaKey, 
    ctrlKey: ctrlKey, 
    altKey: altKey, 
    keyLocation: keyLocation, 
    keyCode: keyCode, 
    key: key, 
    keyboardEventType: keyboardEventType, 
    toKeyLocation: toKeyLocation, 
    removeMouseEventListener: removeMouseEventListener, 
    addMouseEventListener: addMouseEventListener, 
    screenY: screenY, 
    screenX: screenX, 
    mouseEventType: mouseEventType, 
    preventDefault: preventDefault, 
    stopPropagation: stopPropagation, 
    eventTarget: eventTarget, 
    read: read, 
    eventDOMEvent: eventDOMEvent, 
    mouseEventTypeShow: mouseEventTypeShow, 
    mouseEventTypeRead: mouseEventTypeRead, 
    mouseEventDOMEvent: mouseEventDOMEvent, 
    mouseEventTargetHTMLWindow: mouseEventTargetHTMLWindow, 
    mouseEventTargetHTMLDocument: mouseEventTargetHTMLDocument, 
    mouseEventTargetHTMLElement: mouseEventTargetHTMLElement, 
    keyboardEventTypeShow: keyboardEventTypeShow, 
    keyboardEventTypeRead: keyboardEventTypeRead, 
    keyboardEventDOMEvent: keyboardEventDOMEvent, 
    keyboardEventTargetHTMLWindow: keyboardEventTargetHTMLWindow, 
    keyboardEventTargetHTMLDocument: keyboardEventTargetHTMLDocument, 
    keyboardEventTargetHTMLElement: keyboardEventTargetHTMLElement, 
    uiEventTypeShow: uiEventTypeShow, 
    uiEventTypeRead: uiEventTypeRead, 
    uiEventDOMEvent: uiEventDOMEvent, 
    uiEventTargetHTMLWindow: uiEventTargetHTMLWindow
};

},{"Control.Monad":36,"Control.Monad.Eff":23,"DOM":40,"Data.DOM.Simple.Ajax":51,"Data.DOM.Simple.Types":53,"Data.DOM.Simple.Unsafe.Events":57,"Data.DOM.Simple.Window":61,"Prelude":107}],53:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Control_Monad_Eff = require("Control.Monad.Eff");
module.exports = {};

},{"Control.Monad.Eff":23}],54:[function(require,module,exports){
/* jshint maxparams: false */
/* global exports */
"use strict";

// module Data.DOM.Simple.Unsafe.Ajax

exports.unsafeReadyState = function (obj) {
  return function () {
    return obj.readyState;
  };
};

exports.unsafeOnReadyStateChange = function (obj, fn) {
  return function () {
    obj.onreadystatechange = fn;
    return {};
  };
};

exports.unsafeOpen = function (obj, method, url) {
  return function () {
    obj.open(method, url);
    return {};
  };
};

exports.unsafeSend = function (obj) {
  return function () {
    obj.send();
    return {};
  };
};

exports.unsafeSendWithPayload = function (obj, payload) {
  return function () {
    obj.send(payload);
    return {};
  };
};

exports.unsafeSetResponseType = function (obj, rt) {
  return function () {
    obj.responseType = rt;
    return {};
  };
};

exports.unsafeResponseType = function (obj) {
  return function () {
    return obj.responseType;
  };
};

exports.unsafeResponse = function (obj) {
  return function () {
    return obj.response;
  };
};

exports.unsafeGetResponseHeader = function (obj, key) {
  return function () {
    return obj.getResponseHeader(key);
  };
};

},{}],55:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var DOM = require("DOM");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Function = require("Data.Function");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
module.exports = {
    unsafeGetResponseHeader: $foreign.unsafeGetResponseHeader, 
    unsafeResponse: $foreign.unsafeResponse, 
    unsafeResponseType: $foreign.unsafeResponseType, 
    unsafeSetResponseType: $foreign.unsafeSetResponseType, 
    unsafeSendWithPayload: $foreign.unsafeSendWithPayload, 
    unsafeSend: $foreign.unsafeSend, 
    unsafeOpen: $foreign.unsafeOpen, 
    unsafeOnReadyStateChange: $foreign.unsafeOnReadyStateChange, 
    unsafeReadyState: $foreign.unsafeReadyState
};

},{"./foreign":54,"Control.Monad.Eff":23,"DOM":40,"Data.DOM.Simple.Types":53,"Data.Function":70,"Prelude":107}],56:[function(require,module,exports){
/* global exports */
"use strict";

// module Data.DOM.Simple.Unsafe.Events

exports.unsafeAddEventListener = function (targ) {
  return function (cb) {
    return function (src) {
      return function () {
        src.addEventListener(targ, function (evt) {
          cb(evt)();
        });
      };
    };
  };
};

exports.unsafeRemoveEventListener = function (targ) {
  return function (cb) {
    return function (src) {
      return function () {
        src.removeEventListener(targ, function (evt) {
          cb(evt)();
        });
      };
    };
  };
};

exports.unsafeEventTarget = function (event) {
  return function () {
    return event.target;
  };
};

exports.unsafeStopPropagation = function (event) {
  return function () {
    event.stopPropagation();
  };
};

exports.unsafePreventDefault = function (event) {
  return function () {
    event.preventDefault();
  };
};

// XXX Wallpaper over the fact that some browsers don't support
// KeyboardEvent.key yet.  It's a hack, since it doesn't correctly
// handle modifier keys, etc.
exports.unsafeEventKey = function (event) {
  return function () {
    return event.key === undefined ? String.fromCharCode(event.keyCode) : event.key;
  };
};

exports.unsafeEventKeyCode = function (event) {
  return function () {
    return event.keyCode;
  };
};

exports.unsafeEventNumberProp = function (prop) {
  return function (event) {
    return function () {
      return event[prop];
    };
  };
};

exports.unsafeEventStringProp = function (prop) {
  return function (event) {
    return function () {
      return event[prop];
    };
  };
};

exports.unsafeEventBooleanProp = function (prop) {
  return function (event) {
    return function () {
      return !!event[prop];
    };
  };
};

// XXX really should be returning an HTMLAbstractView here...
exports.unsafeEventView = function (event) {
  return function () {
    return event.view;
  };
};

},{}],57:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var DOM = require("DOM");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
module.exports = {
    unsafeEventView: $foreign.unsafeEventView, 
    unsafeEventBooleanProp: $foreign.unsafeEventBooleanProp, 
    unsafeEventStringProp: $foreign.unsafeEventStringProp, 
    unsafeEventNumberProp: $foreign.unsafeEventNumberProp, 
    unsafeEventKeyCode: $foreign.unsafeEventKeyCode, 
    unsafeEventKey: $foreign.unsafeEventKey, 
    unsafePreventDefault: $foreign.unsafePreventDefault, 
    unsafeStopPropagation: $foreign.unsafeStopPropagation, 
    unsafeEventTarget: $foreign.unsafeEventTarget, 
    unsafeRemoveEventListener: $foreign.unsafeRemoveEventListener, 
    unsafeAddEventListener: $foreign.unsafeAddEventListener
};

},{"./foreign":56,"Control.Monad.Eff":23,"DOM":40,"Data.DOM.Simple.Types":53,"Prelude":107}],58:[function(require,module,exports){
/* global exports */
"use strict";

// module Data.DOM.Simple.Unsafe.Window

exports.unsafeDocument = function (win) {
  return function () {
    return win.document;
  };
};

exports.unsafeNavigator = function (win) {
  return function () {
    return win.navigator;
  };
};

exports.unsafeLocation = function (win) {
  return function () {
    return win.location;
  };
};

exports.unsafeGetLocation = function (loc) {
  return function () {
    return loc;
  };
};

exports.unsafeSetLocation = function (value) {
  return function (loc) {
    return function () {
      loc.assign(value);
    };
  };
};

exports.unsafeGetSearchLocation = function (loc) {
  return function () {
    return loc.search;
  };
};

exports.unsafeSetTimeout = function (win) {
  return function (delay) {
    return function (func) {
      return function () {
        return win.setTimeout(func, delay);
      };
    };
  };
};

exports.unsafeSetInterval = function (win) {
  return function (delay) {
    return function (func) {
      return function () {
        return win.setInterval(func, delay);
      };
    };
  };
};

exports.unsafeClearTimeout = function (win) {
  return function (timeout) {
    return function () {
      win.clearTimeout(timeout);
    };
  };
};

exports.unsafeInnerWidth = function (win) {
  return function () {
    return win.innerWidth;
  };
};

exports.unsafeInnerHeight = function (win) {
  return function () {
    return win.innerHeight;
  };
};

},{}],59:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var DOM = require("DOM");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
module.exports = {
    unsafeInnerHeight: $foreign.unsafeInnerHeight, 
    unsafeInnerWidth: $foreign.unsafeInnerWidth, 
    unsafeClearTimeout: $foreign.unsafeClearTimeout, 
    unsafeSetInterval: $foreign.unsafeSetInterval, 
    unsafeSetTimeout: $foreign.unsafeSetTimeout, 
    unsafeGetSearchLocation: $foreign.unsafeGetSearchLocation, 
    unsafeSetLocation: $foreign.unsafeSetLocation, 
    unsafeGetLocation: $foreign.unsafeGetLocation, 
    unsafeLocation: $foreign.unsafeLocation, 
    unsafeNavigator: $foreign.unsafeNavigator, 
    unsafeDocument: $foreign.unsafeDocument
};

},{"./foreign":58,"Control.Monad.Eff":23,"DOM":40,"Data.DOM.Simple.Types":53,"Prelude":107}],60:[function(require,module,exports){
/* global exports, window */
"use strict";

// module Data.DOM.Simple.Window

exports.globalWindow = window;

},{}],61:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Data_DOM_Simple_Unsafe_Window = require("Data.DOM.Simple.Unsafe.Window");
var Prelude = require("Prelude");
var Data_String = require("Data.String");
var Data_Array = require("Data.Array");
var DOM = require("DOM");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
var Data_Maybe = require("Data.Maybe");
var Location = function (getLocation, search, setLocation) {
    this.getLocation = getLocation;
    this.search = search;
    this.setLocation = setLocation;
};
var Window = function (clearTimeout, document, innerHeight, innerWidth, location, navigator, setInterval, setTimeout) {
    this.clearTimeout = clearTimeout;
    this.document = document;
    this.innerHeight = innerHeight;
    this.innerWidth = innerWidth;
    this.location = location;
    this.navigator = navigator;
    this.setInterval = setInterval;
    this.setTimeout = setTimeout;
};
var setTimeout = function (dict) {
    return dict.setTimeout;
};
var setLocation = function (dict) {
    return dict.setLocation;
};
var setInterval = function (dict) {
    return dict.setInterval;
};
var search = function (dict) {
    return dict.search;
};
var navigator = function (dict) {
    return dict.navigator;
};
var location = function (dict) {
    return dict.location;
};
var innerWidth = function (dict) {
    return dict.innerWidth;
};
var innerHeight = function (dict) {
    return dict.innerHeight;
};
var htmlWindow = new Window(Data_DOM_Simple_Unsafe_Window.unsafeClearTimeout, Data_DOM_Simple_Unsafe_Window.unsafeDocument, Data_DOM_Simple_Unsafe_Window.unsafeInnerHeight, Data_DOM_Simple_Unsafe_Window.unsafeInnerWidth, Data_DOM_Simple_Unsafe_Window.unsafeLocation, Data_DOM_Simple_Unsafe_Window.unsafeNavigator, Data_DOM_Simple_Unsafe_Window.unsafeSetInterval, Data_DOM_Simple_Unsafe_Window.unsafeSetTimeout);
var getLocationValue = function (input) {
    return function (key) {
        var kvParser = function (value) {
            if (value.length === 2 && Prelude["=="](Prelude.eqString)(value[0])(key)) {
                return new Data_Maybe.Just(value[1]);
            };
            return Data_Maybe.Nothing.value;
        };
        var sanitizedInput = (function () {
            var _161 = Prelude["=="](Data_Maybe.eqMaybe(Prelude.eqInt))(Data_String.indexOf("?")(input))(new Data_Maybe.Just(0));
            if (_161) {
                return Data_String.drop(1)(input);
            };
            if (!_161) {
                return input;
            };
            throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-simple-dom/src/Data/DOM/Simple/Window.purs line 53, column 7 - line 53, column 104: " + [ _161.constructor.name ]);
        })();
        var kv = Prelude.map(Prelude.functorArray)(Data_String.split("="))(Data_String.split("&")(sanitizedInput));
        return Data_Array.head(Data_Array.mapMaybe(kvParser)(kv));
    };
};
var getLocation = function (dict) {
    return dict.getLocation;
};
var domLocation = new Location(Data_DOM_Simple_Unsafe_Window.unsafeGetLocation, Data_DOM_Simple_Unsafe_Window.unsafeGetSearchLocation, Data_DOM_Simple_Unsafe_Window.unsafeSetLocation);
var document = function (dict) {
    return dict.document;
};
var clearTimeout = function (dict) {
    return dict.clearTimeout;
};
module.exports = {
    Window: Window, 
    Location: Location, 
    getLocationValue: getLocationValue, 
    innerHeight: innerHeight, 
    innerWidth: innerWidth, 
    clearTimeout: clearTimeout, 
    setInterval: setInterval, 
    setTimeout: setTimeout, 
    location: location, 
    navigator: navigator, 
    document: document, 
    search: search, 
    setLocation: setLocation, 
    getLocation: getLocation, 
    htmlWindow: htmlWindow, 
    domLocation: domLocation, 
    globalWindow: $foreign.globalWindow
};

},{"./foreign":60,"Control.Monad.Eff":23,"DOM":40,"Data.Array":44,"Data.DOM.Simple.Types":53,"Data.DOM.Simple.Unsafe.Window":59,"Data.Maybe":81,"Data.String":91,"Prelude":107}],62:[function(require,module,exports){
/* global exports */
"use strict";

// module Data.Date

exports.nowEpochMilliseconds = function () {
  return Date.now();
};

exports.nowImpl = function (ctor) {
  return function () {
    return ctor(new Date());
  };
};

exports.jsDateConstructor = function (x) {
  return new Date(x);
};

exports.jsDateMethod = function (method, date) {
  return date[method]();
};

exports.strictJsDate = function (just, nothing, s) {
  var epoch = Date.parse(s);
  if (isNaN(epoch)) return nothing;
  var date = new Date(epoch);
  var s2 = date.toISOString();
  var idx = s2.indexOf(s);
  return idx < 0 ? nothing : just(date);
};

},{}],63:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Global = require("Global");
var Data_Function = require("Data.Function");
var Data_Enum = require("Data.Enum");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Maybe = require("Data.Maybe");
var Data_Time = require("Data.Time");
var Year = function (x) {
    return x;
};
var January = (function () {
    function January() {

    };
    January.value = new January();
    return January;
})();
var February = (function () {
    function February() {

    };
    February.value = new February();
    return February;
})();
var March = (function () {
    function March() {

    };
    March.value = new March();
    return March;
})();
var April = (function () {
    function April() {

    };
    April.value = new April();
    return April;
})();
var May = (function () {
    function May() {

    };
    May.value = new May();
    return May;
})();
var June = (function () {
    function June() {

    };
    June.value = new June();
    return June;
})();
var July = (function () {
    function July() {

    };
    July.value = new July();
    return July;
})();
var August = (function () {
    function August() {

    };
    August.value = new August();
    return August;
})();
var September = (function () {
    function September() {

    };
    September.value = new September();
    return September;
})();
var October = (function () {
    function October() {

    };
    October.value = new October();
    return October;
})();
var November = (function () {
    function November() {

    };
    November.value = new November();
    return November;
})();
var December = (function () {
    function December() {

    };
    December.value = new December();
    return December;
})();
var LocaleOffset = function (x) {
    return x;
};
var Sunday = (function () {
    function Sunday() {

    };
    Sunday.value = new Sunday();
    return Sunday;
})();
var Monday = (function () {
    function Monday() {

    };
    Monday.value = new Monday();
    return Monday;
})();
var Tuesday = (function () {
    function Tuesday() {

    };
    Tuesday.value = new Tuesday();
    return Tuesday;
})();
var Wednesday = (function () {
    function Wednesday() {

    };
    Wednesday.value = new Wednesday();
    return Wednesday;
})();
var Thursday = (function () {
    function Thursday() {

    };
    Thursday.value = new Thursday();
    return Thursday;
})();
var Friday = (function () {
    function Friday() {

    };
    Friday.value = new Friday();
    return Friday;
})();
var Saturday = (function () {
    function Saturday() {

    };
    Saturday.value = new Saturday();
    return Saturday;
})();
var DayOfMonth = function (x) {
    return x;
};
var DateTime = function (x) {
    return x;
};
var toJSDate = function (_700) {
    return _700;
};
var toEpochMilliseconds = function (_701) {
    return $foreign.jsDateMethod("getTime", _701);
};
var timezoneOffset = function (_702) {
    return $foreign.jsDateMethod("getTimezoneOffset", _702);
};
var showYear = new Prelude.Show(function (_717) {
    return "(Year " + (Prelude.show(Prelude.showInt)(_717) + ")");
});
var showMonth = new Prelude.Show(function (_720) {
    if (_720 instanceof January) {
        return "January";
    };
    if (_720 instanceof February) {
        return "February";
    };
    if (_720 instanceof March) {
        return "March";
    };
    if (_720 instanceof April) {
        return "April";
    };
    if (_720 instanceof May) {
        return "May";
    };
    if (_720 instanceof June) {
        return "June";
    };
    if (_720 instanceof July) {
        return "July";
    };
    if (_720 instanceof August) {
        return "August";
    };
    if (_720 instanceof September) {
        return "September";
    };
    if (_720 instanceof October) {
        return "October";
    };
    if (_720 instanceof November) {
        return "November";
    };
    if (_720 instanceof December) {
        return "December";
    };
    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-datetime/src/Data/Date.purs line 161, column 1 - line 175, column 1: " + [ _720.constructor.name ]);
});
var showDayOfWeek = new Prelude.Show(function (_727) {
    if (_727 instanceof Sunday) {
        return "Sunday";
    };
    if (_727 instanceof Monday) {
        return "Monday";
    };
    if (_727 instanceof Tuesday) {
        return "Tuesday";
    };
    if (_727 instanceof Wednesday) {
        return "Wednesday";
    };
    if (_727 instanceof Thursday) {
        return "Thursday";
    };
    if (_727 instanceof Friday) {
        return "Friday";
    };
    if (_727 instanceof Saturday) {
        return "Saturday";
    };
    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-datetime/src/Data/Date.purs line 249, column 1 - line 258, column 1: " + [ _727.constructor.name ]);
});
var showDate = new Prelude.Show(function (d) {
    return "(fromEpochMilliseconds " + (Prelude.show(Data_Time.showMilliseconds)(toEpochMilliseconds(d)) + ")");
});
var semiringYear = new Prelude.Semiring(function (_711) {
    return function (_712) {
        return Prelude["+"](Prelude.semiringInt)(_711)(_712);
    };
}, function (_713) {
    return function (_714) {
        return Prelude["*"](Prelude.semiringInt)(_713)(_714);
    };
}, Prelude.one(Prelude.semiringInt), Prelude.zero(Prelude.semiringInt));
var ringYear = new Prelude.Ring(function () {
    return semiringYear;
}, function (_715) {
    return function (_716) {
        return Prelude["-"](Prelude.ringInt)(_715)(_716);
    };
});
var now = $foreign.nowImpl(DateTime);
var monthToEnum = function (_703) {
    if (_703 === 0) {
        return new Data_Maybe.Just(January.value);
    };
    if (_703 === 1) {
        return new Data_Maybe.Just(February.value);
    };
    if (_703 === 2) {
        return new Data_Maybe.Just(March.value);
    };
    if (_703 === 3) {
        return new Data_Maybe.Just(April.value);
    };
    if (_703 === 4) {
        return new Data_Maybe.Just(May.value);
    };
    if (_703 === 5) {
        return new Data_Maybe.Just(June.value);
    };
    if (_703 === 6) {
        return new Data_Maybe.Just(July.value);
    };
    if (_703 === 7) {
        return new Data_Maybe.Just(August.value);
    };
    if (_703 === 8) {
        return new Data_Maybe.Just(September.value);
    };
    if (_703 === 9) {
        return new Data_Maybe.Just(October.value);
    };
    if (_703 === 10) {
        return new Data_Maybe.Just(November.value);
    };
    if (_703 === 11) {
        return new Data_Maybe.Just(December.value);
    };
    return Data_Maybe.Nothing.value;
};
var monthFromEnum = function (_704) {
    if (_704 instanceof January) {
        return 0;
    };
    if (_704 instanceof February) {
        return 1;
    };
    if (_704 instanceof March) {
        return 2;
    };
    if (_704 instanceof April) {
        return 3;
    };
    if (_704 instanceof May) {
        return 4;
    };
    if (_704 instanceof June) {
        return 5;
    };
    if (_704 instanceof July) {
        return 6;
    };
    if (_704 instanceof August) {
        return 7;
    };
    if (_704 instanceof September) {
        return 8;
    };
    if (_704 instanceof October) {
        return 9;
    };
    if (_704 instanceof November) {
        return 10;
    };
    if (_704 instanceof December) {
        return 11;
    };
    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-datetime/src/Data/Date.purs line 197, column 1 - line 198, column 1: " + [ _704.constructor.name ]);
};
var fromJSDate = function (d) {
    var _1114 = Global.isNaN($foreign.jsDateMethod("getTime", d));
    if (_1114) {
        return Data_Maybe.Nothing.value;
    };
    if (!_1114) {
        return new Data_Maybe.Just(d);
    };
    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-datetime/src/Data/Date.purs line 50, column 1 - line 51, column 1: " + [ _1114.constructor.name ]);
};
var fromString = Prelude["<<<"](Prelude.semigroupoidFn)(fromJSDate)($foreign.jsDateConstructor);
var fromStringStrict = function (s) {
    return Prelude[">>="](Data_Maybe.bindMaybe)($foreign.strictJsDate(Data_Maybe.Just.create, Data_Maybe.Nothing.value, s))(fromJSDate);
};
var fromEpochMilliseconds = Prelude["<<<"](Prelude.semigroupoidFn)(fromJSDate)($foreign.jsDateConstructor);
var eqYear = new Prelude.Eq(function (_707) {
    return function (_708) {
        return Prelude["=="](Prelude.eqInt)(_707)(_708);
    };
});
var ordYear = new Prelude.Ord(function () {
    return eqYear;
}, function (_709) {
    return function (_710) {
        return Prelude.compare(Prelude.ordInt)(_709)(_710);
    };
});
var eqMonth = new Prelude.Eq(function (_718) {
    return function (_719) {
        if (_718 instanceof January && _719 instanceof January) {
            return true;
        };
        if (_718 instanceof February && _719 instanceof February) {
            return true;
        };
        if (_718 instanceof March && _719 instanceof March) {
            return true;
        };
        if (_718 instanceof April && _719 instanceof April) {
            return true;
        };
        if (_718 instanceof May && _719 instanceof May) {
            return true;
        };
        if (_718 instanceof June && _719 instanceof June) {
            return true;
        };
        if (_718 instanceof July && _719 instanceof July) {
            return true;
        };
        if (_718 instanceof August && _719 instanceof August) {
            return true;
        };
        if (_718 instanceof September && _719 instanceof September) {
            return true;
        };
        if (_718 instanceof October && _719 instanceof October) {
            return true;
        };
        if (_718 instanceof November && _719 instanceof November) {
            return true;
        };
        if (_718 instanceof December && _719 instanceof December) {
            return true;
        };
        return false;
    };
});
var eqDayOfWeek = new Prelude.Eq(function (_725) {
    return function (_726) {
        if (_725 instanceof Sunday && _726 instanceof Sunday) {
            return true;
        };
        if (_725 instanceof Monday && _726 instanceof Monday) {
            return true;
        };
        if (_725 instanceof Tuesday && _726 instanceof Tuesday) {
            return true;
        };
        if (_725 instanceof Wednesday && _726 instanceof Wednesday) {
            return true;
        };
        if (_725 instanceof Thursday && _726 instanceof Thursday) {
            return true;
        };
        if (_725 instanceof Friday && _726 instanceof Friday) {
            return true;
        };
        if (_725 instanceof Saturday && _726 instanceof Saturday) {
            return true;
        };
        return false;
    };
});
var eqDayOfMonth = new Prelude.Eq(function (_721) {
    return function (_722) {
        return Prelude["=="](Prelude.eqInt)(_721)(_722);
    };
});
var ordDayOfMonth = new Prelude.Ord(function () {
    return eqDayOfMonth;
}, function (_723) {
    return function (_724) {
        return Prelude.compare(Prelude.ordInt)(_723)(_724);
    };
});
var eqDate = new Prelude.Eq(Data_Function.on(Prelude.eq(Data_Time.eqMilliseconds))(toEpochMilliseconds));
var ordDate = new Prelude.Ord(function () {
    return eqDate;
}, Data_Function.on(Prelude.compare(Data_Time.ordMilliseconds))(toEpochMilliseconds));
var dayOfWeekToEnum = function (_705) {
    if (_705 === 0) {
        return new Data_Maybe.Just(Sunday.value);
    };
    if (_705 === 1) {
        return new Data_Maybe.Just(Monday.value);
    };
    if (_705 === 2) {
        return new Data_Maybe.Just(Tuesday.value);
    };
    if (_705 === 3) {
        return new Data_Maybe.Just(Wednesday.value);
    };
    if (_705 === 4) {
        return new Data_Maybe.Just(Thursday.value);
    };
    if (_705 === 5) {
        return new Data_Maybe.Just(Friday.value);
    };
    if (_705 === 6) {
        return new Data_Maybe.Just(Saturday.value);
    };
    return Data_Maybe.Nothing.value;
};
var dayOfWeekFromEnum = function (_706) {
    if (_706 instanceof Sunday) {
        return 0;
    };
    if (_706 instanceof Monday) {
        return 1;
    };
    if (_706 instanceof Tuesday) {
        return 2;
    };
    if (_706 instanceof Wednesday) {
        return 3;
    };
    if (_706 instanceof Thursday) {
        return 4;
    };
    if (_706 instanceof Friday) {
        return 5;
    };
    if (_706 instanceof Saturday) {
        return 6;
    };
    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-datetime/src/Data/Date.purs line 275, column 1 - line 276, column 1: " + [ _706.constructor.name ]);
};
var boundedMonth = new Prelude.Bounded(January.value, December.value);
var enumMonth = new Data_Enum.Enum(function () {
    return boundedMonth;
}, 12, monthFromEnum, Data_Enum.defaultPred(monthToEnum)(monthFromEnum), Data_Enum.defaultSucc(monthToEnum)(monthFromEnum), monthToEnum);
var ordMonth = new Prelude.Ord(function () {
    return eqMonth;
}, Data_Function.on(Prelude.compare(Prelude.ordInt))(Data_Enum.fromEnum(enumMonth)));
var boundedOrdMonth = new Prelude.BoundedOrd(function () {
    return boundedMonth;
}, function () {
    return ordMonth;
});
var boundedDayOfWeek = new Prelude.Bounded(Sunday.value, Saturday.value);
var enumDayOfWeek = new Data_Enum.Enum(function () {
    return boundedDayOfWeek;
}, 7, dayOfWeekFromEnum, Data_Enum.defaultPred(dayOfWeekToEnum)(dayOfWeekFromEnum), Data_Enum.defaultSucc(dayOfWeekToEnum)(dayOfWeekFromEnum), dayOfWeekToEnum);
var ordDayOfWeek = new Prelude.Ord(function () {
    return eqDayOfWeek;
}, Data_Function.on(Prelude.compare(Prelude.ordInt))(Data_Enum.fromEnum(enumDayOfWeek)));
var boundedOrdDayOfWeek = new Prelude.BoundedOrd(function () {
    return boundedDayOfWeek;
}, function () {
    return ordDayOfWeek;
});
module.exports = {
    Sunday: Sunday, 
    Monday: Monday, 
    Tuesday: Tuesday, 
    Wednesday: Wednesday, 
    Thursday: Thursday, 
    Friday: Friday, 
    Saturday: Saturday, 
    DayOfMonth: DayOfMonth, 
    January: January, 
    February: February, 
    March: March, 
    April: April, 
    May: May, 
    June: June, 
    July: July, 
    August: August, 
    September: September, 
    October: October, 
    November: November, 
    December: December, 
    Year: Year, 
    LocaleOffset: LocaleOffset, 
    timezoneOffset: timezoneOffset, 
    now: now, 
    fromStringStrict: fromStringStrict, 
    fromString: fromString, 
    toEpochMilliseconds: toEpochMilliseconds, 
    fromEpochMilliseconds: fromEpochMilliseconds, 
    toJSDate: toJSDate, 
    fromJSDate: fromJSDate, 
    eqDate: eqDate, 
    ordDate: ordDate, 
    showDate: showDate, 
    eqYear: eqYear, 
    ordYear: ordYear, 
    semiringYear: semiringYear, 
    ringYear: ringYear, 
    showYear: showYear, 
    eqMonth: eqMonth, 
    ordMonth: ordMonth, 
    boundedMonth: boundedMonth, 
    boundedOrdMonth: boundedOrdMonth, 
    showMonth: showMonth, 
    enumMonth: enumMonth, 
    eqDayOfMonth: eqDayOfMonth, 
    ordDayOfMonth: ordDayOfMonth, 
    eqDayOfWeek: eqDayOfWeek, 
    ordDayOfWeek: ordDayOfWeek, 
    boundedDayOfWeek: boundedDayOfWeek, 
    boundedOrdDayOfWeek: boundedOrdDayOfWeek, 
    showDayOfWeek: showDayOfWeek, 
    enumDayOfWeek: enumDayOfWeek, 
    nowEpochMilliseconds: $foreign.nowEpochMilliseconds
};

},{"./foreign":62,"Control.Monad.Eff":23,"Data.Enum":66,"Data.Function":70,"Data.Maybe":81,"Data.Time":92,"Global":99,"Prelude":107}],64:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Identity = require("Data.Identity");
var Distributive = function (__superclass_Prelude$dotFunctor_0, collect, distribute) {
    this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
    this.collect = collect;
    this.distribute = distribute;
};
var distributiveIdentity = new Distributive(function () {
    return Data_Identity.functorIdentity;
}, function (__dict_Functor_1) {
    return function (f) {
        return Prelude["<<<"](Prelude.semigroupoidFn)(Data_Identity.Identity)(Prelude.map(__dict_Functor_1)(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Identity.runIdentity)(f)));
    };
}, function (__dict_Functor_0) {
    return Prelude["<<<"](Prelude.semigroupoidFn)(Data_Identity.Identity)(Prelude.map(__dict_Functor_0)(Data_Identity.runIdentity));
});
var distribute = function (dict) {
    return dict.distribute;
};
var distributiveFunction = new Distributive(function () {
    return Prelude.functorFn;
}, function (__dict_Functor_3) {
    return function (f) {
        return Prelude["<<<"](Prelude.semigroupoidFn)(distribute(distributiveFunction)(__dict_Functor_3))(Prelude.map(__dict_Functor_3)(f));
    };
}, function (__dict_Functor_2) {
    return function (a) {
        return function (e) {
            return Prelude.map(__dict_Functor_2)(function (_3) {
                return _3(e);
            })(a);
        };
    };
});
var cotraverse = function (__dict_Distributive_4) {
    return function (__dict_Functor_5) {
        return function (f) {
            return Prelude["<<<"](Prelude.semigroupoidFn)(Prelude.map(__dict_Distributive_4["__superclass_Prelude.Functor_0"]())(f))(distribute(__dict_Distributive_4)(__dict_Functor_5));
        };
    };
};
var collect = function (dict) {
    return dict.collect;
};
module.exports = {
    Distributive: Distributive, 
    cotraverse: cotraverse, 
    collect: collect, 
    distribute: distribute, 
    distributiveIdentity: distributiveIdentity, 
    distributiveFunction: distributiveFunction
};

},{"Data.Identity":73,"Prelude":107}],65:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Monoid = require("Data.Monoid");
var Control_Alt = require("Control.Alt");
var Control_Extend = require("Control.Extend");
var Data_Bifoldable = require("Data.Bifoldable");
var Data_Bifunctor = require("Data.Bifunctor");
var Data_Bitraversable = require("Data.Bitraversable");
var Data_Foldable = require("Data.Foldable");
var Data_Traversable = require("Data.Traversable");
var Left = (function () {
    function Left(value0) {
        this.value0 = value0;
    };
    Left.create = function (value0) {
        return new Left(value0);
    };
    return Left;
})();
var Right = (function () {
    function Right(value0) {
        this.value0 = value0;
    };
    Right.create = function (value0) {
        return new Right(value0);
    };
    return Right;
})();
var showEither = function (__dict_Show_2) {
    return function (__dict_Show_3) {
        return new Prelude.Show(function (_461) {
            if (_461 instanceof Left) {
                return "Left (" + (Prelude.show(__dict_Show_2)(_461.value0) + ")");
            };
            if (_461 instanceof Right) {
                return "Right (" + (Prelude.show(__dict_Show_3)(_461.value0) + ")");
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 174, column 1 - line 181, column 1: " + [ _461.constructor.name ]);
        });
    };
};
var functorEither = new Prelude.Functor(function (f) {
    return function (_456) {
        if (_456 instanceof Left) {
            return new Left(_456.value0);
        };
        if (_456 instanceof Right) {
            return new Right(f(_456.value0));
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 52, column 1 - line 56, column 1: " + [ f.constructor.name, _456.constructor.name ]);
    };
});
var foldableEither = new Data_Foldable.Foldable(function (__dict_Monoid_6) {
    return function (f) {
        return function (_468) {
            if (_468 instanceof Left) {
                return Data_Monoid.mempty(__dict_Monoid_6);
            };
            if (_468 instanceof Right) {
                return f(_468.value0);
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 201, column 1 - line 209, column 1: " + [ f.constructor.name, _468.constructor.name ]);
        };
    };
}, function (f) {
    return function (z) {
        return function (_467) {
            if (_467 instanceof Left) {
                return z;
            };
            if (_467 instanceof Right) {
                return f(z)(_467.value0);
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 201, column 1 - line 209, column 1: " + [ f.constructor.name, z.constructor.name, _467.constructor.name ]);
        };
    };
}, function (f) {
    return function (z) {
        return function (_466) {
            if (_466 instanceof Left) {
                return z;
            };
            if (_466 instanceof Right) {
                return f(_466.value0)(z);
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 201, column 1 - line 209, column 1: " + [ f.constructor.name, z.constructor.name, _466.constructor.name ]);
        };
    };
});
var traversableEither = new Data_Traversable.Traversable(function () {
    return foldableEither;
}, function () {
    return functorEither;
}, function (__dict_Applicative_1) {
    return function (_473) {
        if (_473 instanceof Left) {
            return Prelude.pure(__dict_Applicative_1)(new Left(_473.value0));
        };
        if (_473 instanceof Right) {
            return Prelude["<$>"]((__dict_Applicative_1["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Right.create)(_473.value0);
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 217, column 1 - line 223, column 1: " + [ _473.constructor.name ]);
    };
}, function (__dict_Applicative_0) {
    return function (f) {
        return function (_472) {
            if (_472 instanceof Left) {
                return Prelude.pure(__dict_Applicative_0)(new Left(_472.value0));
            };
            if (_472 instanceof Right) {
                return Prelude["<$>"]((__dict_Applicative_0["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Right.create)(f(_472.value0));
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 217, column 1 - line 223, column 1: " + [ f.constructor.name, _472.constructor.name ]);
        };
    };
});
var extendEither = new Control_Extend.Extend(function () {
    return functorEither;
}, function (f) {
    return function (_460) {
        if (_460 instanceof Left) {
            return new Left(_460.value0);
        };
        return new Right(f(_460));
    };
});
var eqEither = function (__dict_Eq_7) {
    return function (__dict_Eq_8) {
        return new Prelude.Eq(function (_462) {
            return function (_463) {
                if (_462 instanceof Left && _463 instanceof Left) {
                    return Prelude["=="](__dict_Eq_7)(_462.value0)(_463.value0);
                };
                if (_462 instanceof Right && _463 instanceof Right) {
                    return Prelude["=="](__dict_Eq_8)(_462.value0)(_463.value0);
                };
                return false;
            };
        });
    };
};
var ordEither = function (__dict_Ord_4) {
    return function (__dict_Ord_5) {
        return new Prelude.Ord(function () {
            return eqEither(__dict_Ord_4["__superclass_Prelude.Eq_0"]())(__dict_Ord_5["__superclass_Prelude.Eq_0"]());
        }, function (_464) {
            return function (_465) {
                if (_464 instanceof Left && _465 instanceof Left) {
                    return Prelude.compare(__dict_Ord_4)(_464.value0)(_465.value0);
                };
                if (_464 instanceof Right && _465 instanceof Right) {
                    return Prelude.compare(__dict_Ord_5)(_464.value0)(_465.value0);
                };
                if (_464 instanceof Left) {
                    return Prelude.LT.value;
                };
                if (_465 instanceof Left) {
                    return Prelude.GT.value;
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 191, column 1 - line 197, column 1: " + [ _464.constructor.name, _465.constructor.name ]);
            };
        });
    };
};
var either = function (f) {
    return function (g) {
        return function (_455) {
            if (_455 instanceof Left) {
                return f(_455.value0);
            };
            if (_455 instanceof Right) {
                return g(_455.value0);
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 28, column 1 - line 29, column 1: " + [ f.constructor.name, g.constructor.name, _455.constructor.name ]);
        };
    };
};
var isLeft = either(Prelude["const"](true))(Prelude["const"](false));
var isRight = either(Prelude["const"](false))(Prelude["const"](true));
var boundedEither = function (__dict_Bounded_9) {
    return function (__dict_Bounded_10) {
        return new Prelude.Bounded(new Left(Prelude.bottom(__dict_Bounded_9)), new Right(Prelude.top(__dict_Bounded_10)));
    };
};
var bifunctorEither = new Data_Bifunctor.Bifunctor(function (f) {
    return function (g) {
        return function (_457) {
            if (_457 instanceof Left) {
                return new Left(f(_457.value0));
            };
            if (_457 instanceof Right) {
                return new Right(g(_457.value0));
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 56, column 1 - line 92, column 1: " + [ f.constructor.name, g.constructor.name, _457.constructor.name ]);
        };
    };
});
var bifoldableEither = new Data_Bifoldable.Bifoldable(function (__dict_Monoid_13) {
    return function (f) {
        return function (g) {
            return function (_471) {
                if (_471 instanceof Left) {
                    return f(_471.value0);
                };
                if (_471 instanceof Right) {
                    return g(_471.value0);
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 209, column 1 - line 217, column 1: " + [ f.constructor.name, g.constructor.name, _471.constructor.name ]);
            };
        };
    };
}, function (f) {
    return function (g) {
        return function (z) {
            return function (_470) {
                if (_470 instanceof Left) {
                    return f(z)(_470.value0);
                };
                if (_470 instanceof Right) {
                    return g(z)(_470.value0);
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 209, column 1 - line 217, column 1: " + [ f.constructor.name, g.constructor.name, z.constructor.name, _470.constructor.name ]);
            };
        };
    };
}, function (f) {
    return function (g) {
        return function (z) {
            return function (_469) {
                if (_469 instanceof Left) {
                    return f(_469.value0)(z);
                };
                if (_469 instanceof Right) {
                    return g(_469.value0)(z);
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 209, column 1 - line 217, column 1: " + [ f.constructor.name, g.constructor.name, z.constructor.name, _469.constructor.name ]);
            };
        };
    };
});
var bitraversableEither = new Data_Bitraversable.Bitraversable(function () {
    return bifoldableEither;
}, function () {
    return bifunctorEither;
}, function (__dict_Applicative_12) {
    return function (_475) {
        if (_475 instanceof Left) {
            return Prelude["<$>"]((__dict_Applicative_12["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Left.create)(_475.value0);
        };
        if (_475 instanceof Right) {
            return Prelude["<$>"]((__dict_Applicative_12["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Right.create)(_475.value0);
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 223, column 1 - line 227, column 36: " + [ _475.constructor.name ]);
    };
}, function (__dict_Applicative_11) {
    return function (f) {
        return function (g) {
            return function (_474) {
                if (_474 instanceof Left) {
                    return Prelude["<$>"]((__dict_Applicative_11["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Left.create)(f(_474.value0));
                };
                if (_474 instanceof Right) {
                    return Prelude["<$>"]((__dict_Applicative_11["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Right.create)(g(_474.value0));
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 223, column 1 - line 227, column 36: " + [ f.constructor.name, g.constructor.name, _474.constructor.name ]);
            };
        };
    };
});
var applyEither = new Prelude.Apply(function () {
    return functorEither;
}, function (_458) {
    return function (r) {
        if (_458 instanceof Left) {
            return new Left(_458.value0);
        };
        if (_458 instanceof Right) {
            return Prelude["<$>"](functorEither)(_458.value0)(r);
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-either/src/Data/Either.purs line 92, column 1 - line 116, column 1: " + [ _458.constructor.name, r.constructor.name ]);
    };
});
var bindEither = new Prelude.Bind(function () {
    return applyEither;
}, either(function (e) {
    return function (_454) {
        return new Left(e);
    };
})(function (a) {
    return function (f) {
        return f(a);
    };
}));
var applicativeEither = new Prelude.Applicative(function () {
    return applyEither;
}, Right.create);
var monadEither = new Prelude.Monad(function () {
    return applicativeEither;
}, function () {
    return bindEither;
});
var altEither = new Control_Alt.Alt(function () {
    return functorEither;
}, function (_459) {
    return function (r) {
        if (_459 instanceof Left) {
            return r;
        };
        return _459;
    };
});
module.exports = {
    Left: Left, 
    Right: Right, 
    isRight: isRight, 
    isLeft: isLeft, 
    either: either, 
    functorEither: functorEither, 
    bifunctorEither: bifunctorEither, 
    applyEither: applyEither, 
    applicativeEither: applicativeEither, 
    altEither: altEither, 
    bindEither: bindEither, 
    monadEither: monadEither, 
    extendEither: extendEither, 
    showEither: showEither, 
    eqEither: eqEither, 
    ordEither: ordEither, 
    boundedEither: boundedEither, 
    foldableEither: foldableEither, 
    bifoldableEither: bifoldableEither, 
    traversableEither: traversableEither, 
    bitraversableEither: bitraversableEither
};

},{"Control.Alt":3,"Control.Extend":9,"Data.Bifoldable":45,"Data.Bifunctor":46,"Data.Bitraversable":47,"Data.Foldable":68,"Data.Monoid":87,"Data.Traversable":94,"Prelude":107}],66:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Maybe = require("Data.Maybe");
var Data_Maybe_Unsafe = require("Data.Maybe.Unsafe");
var Data_Unfoldable = require("Data.Unfoldable");
var Data_Char = require("Data.Char");
var Data_Either = require("Data.Either");
var Data_Tuple = require("Data.Tuple");
var Cardinality = function (x) {
    return x;
};
var Enum = function (__superclass_Prelude$dotBounded_0, cardinality, fromEnum, pred, succ, toEnum) {
    this["__superclass_Prelude.Bounded_0"] = __superclass_Prelude$dotBounded_0;
    this.cardinality = cardinality;
    this.fromEnum = fromEnum;
    this.pred = pred;
    this.succ = succ;
    this.toEnum = toEnum;
};
var toEnum = function (dict) {
    return dict.toEnum;
};
var succ = function (dict) {
    return dict.succ;
};
var runCardinality = function (_688) {
    return _688;
};
var tupleCardinality = function (__dict_Enum_0) {
    return function (__dict_Enum_1) {
        return function (l) {
            return function (r) {
                return Cardinality(Prelude["*"](Prelude.semiringInt)(runCardinality(l))(runCardinality(r)));
            };
        };
    };
};
var tupleToEnum = function (__dict_Enum_2) {
    return function (__dict_Enum_3) {
        return function (cardb) {
            return function (n) {
                return Prelude["<*>"](Data_Maybe.applyMaybe)(Prelude["<$>"](Data_Maybe.functorMaybe)(Data_Tuple.Tuple.create)(toEnum(__dict_Enum_2)(Prelude["/"](Prelude.moduloSemiringInt)(n)(runCardinality(cardb)))))(toEnum(__dict_Enum_3)(Prelude.mod(Prelude.moduloSemiringInt)(n)(runCardinality(cardb))));
            };
        };
    };
};
var pred = function (dict) {
    return dict.pred;
};
var maybeCardinality = function (__dict_Enum_4) {
    return function (c) {
        return Cardinality(Prelude["+"](Prelude.semiringInt)(Prelude.one(Prelude.semiringInt))(runCardinality(c)));
    };
};
var maybeToEnum = function (__dict_Enum_5) {
    return function (carda) {
        return function (n) {
            if (Prelude["<="](Prelude.ordInt)(n)(runCardinality(maybeCardinality(__dict_Enum_5)(carda)))) {
                var _1102 = Prelude["=="](Prelude.eqInt)(n)(Prelude.zero(Prelude.semiringInt));
                if (_1102) {
                    return Data_Maybe.Just.create(Data_Maybe.Nothing.value);
                };
                if (!_1102) {
                    return Data_Maybe.Just.create(toEnum(__dict_Enum_5)(Prelude["-"](Prelude.ringInt)(n)(Prelude.one(Prelude.semiringInt))));
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-enums/src/Data/Enum.purs line 138, column 1 - line 139, column 1: " + [ _1102.constructor.name ]);
            };
            return Data_Maybe.Nothing.value;
        };
    };
};
var intStepFromTo = function (step) {
    return function (from) {
        return function (to) {
            return Data_Unfoldable.unfoldr(Data_Unfoldable.unfoldableArray)(function (e) {
                var _1103 = Prelude["<="](Prelude.ordInt)(e)(to);
                if (_1103) {
                    return Data_Maybe.Just.create(new Data_Tuple.Tuple(e, Prelude["+"](Prelude.semiringInt)(e)(step)));
                };
                if (!_1103) {
                    return Data_Maybe.Nothing.value;
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-enums/src/Data/Enum.purs line 103, column 1 - line 104, column 1: " + [ _1103.constructor.name ]);
            })(from);
        };
    };
};
var intFromTo = intStepFromTo(Prelude.one(Prelude.semiringInt));
var fromEnum = function (dict) {
    return dict.fromEnum;
};
var tupleFromEnum = function (__dict_Enum_6) {
    return function (__dict_Enum_7) {
        return function (cardb) {
            return function (_691) {
                return Prelude["+"](Prelude.semiringInt)(Prelude["*"](Prelude.semiringInt)(fromEnum(__dict_Enum_6)(_691.value0))(runCardinality(cardb)))(fromEnum(__dict_Enum_7)(_691.value1));
            };
        };
    };
};
var enumFromTo = function (__dict_Enum_8) {
    return function (a) {
        return function (b) {
            var b$prime = fromEnum(__dict_Enum_8)(b);
            var a$prime = fromEnum(__dict_Enum_8)(a);
            return Prelude["<$>"](Prelude.functorArray)(Prelude[">>>"](Prelude.semigroupoidFn)(toEnum(__dict_Enum_8))(Data_Maybe_Unsafe.fromJust))(intFromTo(a$prime)(b$prime));
        };
    };
};
var enumFromThenTo = function (__dict_Enum_9) {
    return function (a) {
        return function (b) {
            return function (c) {
                var c$prime = fromEnum(__dict_Enum_9)(c);
                var b$prime = fromEnum(__dict_Enum_9)(b);
                var a$prime = fromEnum(__dict_Enum_9)(a);
                return Prelude["<$>"](Prelude.functorArray)(Prelude[">>>"](Prelude.semigroupoidFn)(toEnum(__dict_Enum_9))(Data_Maybe_Unsafe.fromJust))(intStepFromTo(Prelude["-"](Prelude.ringInt)(b$prime)(a$prime))(a$prime)(c$prime));
            };
        };
    };
};
var eitherFromEnum = function (__dict_Enum_10) {
    return function (__dict_Enum_11) {
        return function (carda) {
            return function (_692) {
                if (_692 instanceof Data_Either.Left) {
                    return fromEnum(__dict_Enum_10)(_692.value0);
                };
                if (_692 instanceof Data_Either.Right) {
                    return Prelude["+"](Prelude.semiringInt)(fromEnum(__dict_Enum_11)(_692.value0))(runCardinality(carda));
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-enums/src/Data/Enum.purs line 197, column 1 - line 198, column 1: " + [ carda.constructor.name, _692.constructor.name ]);
            };
        };
    };
};
var eitherCardinality = function (__dict_Enum_12) {
    return function (__dict_Enum_13) {
        return function (l) {
            return function (r) {
                return Cardinality(Prelude["+"](Prelude.semiringInt)(runCardinality(l))(runCardinality(r)));
            };
        };
    };
};
var eitherToEnum = function (__dict_Enum_14) {
    return function (__dict_Enum_15) {
        return function (carda) {
            return function (cardb) {
                return function (n) {
                    var _1112 = Prelude["&&"](Prelude.booleanAlgebraBoolean)(Prelude[">="](Prelude.ordInt)(n)(Prelude.zero(Prelude.semiringInt)))(Prelude["<"](Prelude.ordInt)(n)(runCardinality(carda)));
                    if (_1112) {
                        return Prelude["<$>"](Data_Maybe.functorMaybe)(Data_Either.Left.create)(toEnum(__dict_Enum_14)(n));
                    };
                    if (!_1112) {
                        var _1113 = Prelude["&&"](Prelude.booleanAlgebraBoolean)(Prelude[">="](Prelude.ordInt)(n)(runCardinality(carda)))(Prelude["<"](Prelude.ordInt)(n)(runCardinality(eitherCardinality(__dict_Enum_14)(__dict_Enum_15)(carda)(cardb))));
                        if (_1113) {
                            return Prelude["<$>"](Data_Maybe.functorMaybe)(Data_Either.Right.create)(toEnum(__dict_Enum_15)(Prelude["-"](Prelude.ringInt)(n)(runCardinality(carda))));
                        };
                        if (!_1113) {
                            return Data_Maybe.Nothing.value;
                        };
                        throw new Error("Failed pattern match: " + [ _1113.constructor.name ]);
                    };
                    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-enums/src/Data/Enum.purs line 189, column 1 - line 190, column 1: " + [ _1112.constructor.name ]);
                };
            };
        };
    };
};
var defaultToEnum = function (succ$prime) {
    return function (bottom$prime) {
        return function (n) {
            if (Prelude["<"](Prelude.ordInt)(n)(Prelude.zero(Prelude.semiringInt))) {
                return Data_Maybe.Nothing.value;
            };
            if (Prelude["=="](Prelude.eqInt)(n)(Prelude.zero(Prelude.semiringInt))) {
                return new Data_Maybe.Just(bottom$prime);
            };
            if (Prelude.otherwise) {
                return Prelude[">>="](Data_Maybe.bindMaybe)(defaultToEnum(succ$prime)(bottom$prime)(Prelude["-"](Prelude.ringInt)(n)(Prelude.one(Prelude.semiringInt))))(succ$prime);
            };
            throw new Error("Failed pattern match: " + [ succ$prime.constructor.name, bottom$prime.constructor.name, n.constructor.name ]);
        };
    };
};
var defaultSucc = function (toEnum$prime) {
    return function (fromEnum$prime) {
        return function (a) {
            return toEnum$prime(Prelude["+"](Prelude.semiringInt)(fromEnum$prime(a))(Prelude.one(Prelude.semiringInt)));
        };
    };
};
var defaultPred = function (toEnum$prime) {
    return function (fromEnum$prime) {
        return function (a) {
            return toEnum$prime(Prelude["-"](Prelude.ringInt)(fromEnum$prime(a))(Prelude.one(Prelude.semiringInt)));
        };
    };
};
var defaultFromEnum = function (pred$prime) {
    return function (e) {
        return Data_Maybe.maybe(Prelude.zero(Prelude.semiringInt))(function (prd) {
            return Prelude["+"](Prelude.semiringInt)(defaultFromEnum(pred$prime)(prd))(Prelude.one(Prelude.semiringInt));
        })(pred$prime(e));
    };
};
var charToEnum = function (n) {
    if (Prelude["&&"](Prelude.booleanAlgebraBoolean)(Prelude[">="](Prelude.ordInt)(n)(0))(Prelude["<="](Prelude.ordInt)(n)(65535))) {
        return Data_Maybe.Just.create(Data_Char.fromCharCode(n));
    };
    return Data_Maybe.Nothing.value;
};
var charFromEnum = Data_Char.toCharCode;
var enumChar = new Enum(function () {
    return Data_Char.boundedChar;
}, 65536, charFromEnum, defaultPred(charToEnum)(charFromEnum), defaultSucc(charToEnum)(charFromEnum), charToEnum);
var cardinality = function (dict) {
    return dict.cardinality;
};
var enumEither = function (__dict_Enum_16) {
    return function (__dict_Enum_17) {
        return new Enum(function () {
            return Data_Either.boundedEither(__dict_Enum_16["__superclass_Prelude.Bounded_0"]())(__dict_Enum_17["__superclass_Prelude.Bounded_0"]());
        }, eitherCardinality(__dict_Enum_16)(__dict_Enum_17)(cardinality(__dict_Enum_16))(cardinality(__dict_Enum_17)), eitherFromEnum(__dict_Enum_16)(__dict_Enum_17)(cardinality(__dict_Enum_16)), function (_699) {
            if (_699 instanceof Data_Either.Left) {
                return Data_Maybe.maybe(Data_Maybe.Nothing.value)(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Maybe.Just.create)(Data_Either.Left.create))(pred(__dict_Enum_16)(_699.value0));
            };
            if (_699 instanceof Data_Either.Right) {
                return Data_Maybe.maybe(Data_Maybe.Just.create(new Data_Either.Left(Prelude.top(__dict_Enum_16["__superclass_Prelude.Bounded_0"]()))))(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Maybe.Just.create)(Data_Either.Right.create))(pred(__dict_Enum_17)(_699.value0));
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-enums/src/Data/Enum.purs line 180, column 1 - line 189, column 1: " + [ _699.constructor.name ]);
        }, function (_698) {
            if (_698 instanceof Data_Either.Left) {
                return Data_Maybe.maybe(Data_Maybe.Just.create(new Data_Either.Right(Prelude.bottom(__dict_Enum_17["__superclass_Prelude.Bounded_0"]()))))(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Maybe.Just.create)(Data_Either.Left.create))(succ(__dict_Enum_16)(_698.value0));
            };
            if (_698 instanceof Data_Either.Right) {
                return Data_Maybe.maybe(Data_Maybe.Nothing.value)(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Maybe.Just.create)(Data_Either.Right.create))(succ(__dict_Enum_17)(_698.value0));
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-enums/src/Data/Enum.purs line 180, column 1 - line 189, column 1: " + [ _698.constructor.name ]);
        }, eitherToEnum(__dict_Enum_16)(__dict_Enum_17)(cardinality(__dict_Enum_16))(cardinality(__dict_Enum_17)));
    };
};
var enumMaybe = function (__dict_Enum_18) {
    return new Enum(function () {
        return Data_Maybe.boundedMaybe(__dict_Enum_18["__superclass_Prelude.Bounded_0"]());
    }, maybeCardinality(__dict_Enum_18)(cardinality(__dict_Enum_18)), function (_695) {
        if (_695 instanceof Data_Maybe.Nothing) {
            return Prelude.zero(Prelude.semiringInt);
        };
        if (_695 instanceof Data_Maybe.Just) {
            return Prelude["+"](Prelude.semiringInt)(fromEnum(__dict_Enum_18)(_695.value0))(Prelude.one(Prelude.semiringInt));
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-enums/src/Data/Enum.purs line 128, column 1 - line 138, column 1: " + [ _695.constructor.name ]);
    }, function (_694) {
        if (_694 instanceof Data_Maybe.Nothing) {
            return Data_Maybe.Nothing.value;
        };
        if (_694 instanceof Data_Maybe.Just) {
            return Prelude["<$>"](Data_Maybe.functorMaybe)(Data_Maybe.Just.create)(pred(__dict_Enum_18)(_694.value0));
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-enums/src/Data/Enum.purs line 128, column 1 - line 138, column 1: " + [ _694.constructor.name ]);
    }, function (_693) {
        if (_693 instanceof Data_Maybe.Nothing) {
            return Data_Maybe.Just.create(Prelude.bottom(Data_Maybe.boundedMaybe(__dict_Enum_18["__superclass_Prelude.Bounded_0"]())));
        };
        if (_693 instanceof Data_Maybe.Just) {
            return Prelude["<$>"](Data_Maybe.functorMaybe)(Data_Maybe.Just.create)(succ(__dict_Enum_18)(_693.value0));
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-enums/src/Data/Enum.purs line 128, column 1 - line 138, column 1: " + [ _693.constructor.name ]);
    }, maybeToEnum(__dict_Enum_18)(cardinality(__dict_Enum_18)));
};
var enumTuple = function (__dict_Enum_19) {
    return function (__dict_Enum_20) {
        return new Enum(function () {
            return Data_Tuple.boundedTuple(__dict_Enum_19["__superclass_Prelude.Bounded_0"]())(__dict_Enum_20["__superclass_Prelude.Bounded_0"]());
        }, tupleCardinality(__dict_Enum_19)(__dict_Enum_20)(cardinality(__dict_Enum_19))(cardinality(__dict_Enum_20)), tupleFromEnum(__dict_Enum_19)(__dict_Enum_20)(cardinality(__dict_Enum_20)), function (_697) {
            return Data_Maybe.maybe(Prelude["<$>"](Data_Maybe.functorMaybe)(Prelude.flip(Data_Tuple.Tuple.create)(Prelude.bottom(__dict_Enum_20["__superclass_Prelude.Bounded_0"]())))(pred(__dict_Enum_19)(_697.value0)))(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Maybe.Just.create)(Data_Tuple.Tuple.create(_697.value0)))(pred(__dict_Enum_20)(_697.value1));
        }, function (_696) {
            return Data_Maybe.maybe(Prelude["<$>"](Data_Maybe.functorMaybe)(Prelude.flip(Data_Tuple.Tuple.create)(Prelude.bottom(__dict_Enum_20["__superclass_Prelude.Bounded_0"]())))(succ(__dict_Enum_19)(_696.value0)))(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Maybe.Just.create)(Data_Tuple.Tuple.create(_696.value0)))(succ(__dict_Enum_20)(_696.value1));
        }, tupleToEnum(__dict_Enum_19)(__dict_Enum_20)(cardinality(__dict_Enum_20)));
    };
};
var booleanSucc = function (_689) {
    if (!_689) {
        return new Data_Maybe.Just(true);
    };
    return Data_Maybe.Nothing.value;
};
var booleanPred = function (_690) {
    if (_690) {
        return new Data_Maybe.Just(false);
    };
    return Data_Maybe.Nothing.value;
};
var enumBoolean = new Enum(function () {
    return Prelude.boundedBoolean;
}, 2, defaultFromEnum(booleanPred), booleanPred, booleanSucc, defaultToEnum(booleanSucc)(false));
module.exports = {
    Cardinality: Cardinality, 
    Enum: Enum, 
    enumFromThenTo: enumFromThenTo, 
    enumFromTo: enumFromTo, 
    intStepFromTo: intStepFromTo, 
    intFromTo: intFromTo, 
    defaultFromEnum: defaultFromEnum, 
    defaultToEnum: defaultToEnum, 
    defaultPred: defaultPred, 
    defaultSucc: defaultSucc, 
    toEnum: toEnum, 
    succ: succ, 
    runCardinality: runCardinality, 
    pred: pred, 
    fromEnum: fromEnum, 
    cardinality: cardinality, 
    enumChar: enumChar, 
    enumMaybe: enumMaybe, 
    enumBoolean: enumBoolean, 
    enumTuple: enumTuple, 
    enumEither: enumEither
};

},{"Data.Char":49,"Data.Either":65,"Data.Maybe":81,"Data.Maybe.Unsafe":80,"Data.Tuple":95,"Data.Unfoldable":96,"Prelude":107}],67:[function(require,module,exports){
/* global exports */
"use strict";

// module Data.Foldable

exports.foldrArray = function (f) {
  return function (init) {
    return function (xs) {
      var acc = init;
      var len = xs.length;
      for (var i = len - 1; i >= 0; i--) {
        acc = f(xs[i])(acc);
      }
      return acc;
    };
  };
};

exports.foldlArray = function (f) {
  return function (init) {
    return function (xs) {
      var acc = init;
      var len = xs.length;
      for (var i = 0; i < len; i++) {
        acc = f(acc)(xs[i]);
      }
      return acc;
    };
  };
};

},{}],68:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Data_Monoid = require("Data.Monoid");
var Control_Apply = require("Control.Apply");
var Data_Monoid_Disj = require("Data.Monoid.Disj");
var Data_Monoid_Conj = require("Data.Monoid.Conj");
var Data_Maybe = require("Data.Maybe");
var Data_Maybe_First = require("Data.Maybe.First");
var Data_Maybe_Last = require("Data.Maybe.Last");
var Data_Monoid_Additive = require("Data.Monoid.Additive");
var Data_Monoid_Dual = require("Data.Monoid.Dual");
var Data_Monoid_Multiplicative = require("Data.Monoid.Multiplicative");
var Foldable = function (foldMap, foldl, foldr) {
    this.foldMap = foldMap;
    this.foldl = foldl;
    this.foldr = foldr;
};
var foldr = function (dict) {
    return dict.foldr;
};
var traverse_ = function (__dict_Applicative_0) {
    return function (__dict_Foldable_1) {
        return function (f) {
            return foldr(__dict_Foldable_1)(Prelude["<<<"](Prelude.semigroupoidFn)(Control_Apply["*>"](__dict_Applicative_0["__superclass_Prelude.Apply_0"]()))(f))(Prelude.pure(__dict_Applicative_0)(Prelude.unit));
        };
    };
};
var for_ = function (__dict_Applicative_2) {
    return function (__dict_Foldable_3) {
        return Prelude.flip(traverse_(__dict_Applicative_2)(__dict_Foldable_3));
    };
};
var sequence_ = function (__dict_Applicative_4) {
    return function (__dict_Foldable_5) {
        return traverse_(__dict_Applicative_4)(__dict_Foldable_5)(Prelude.id(Prelude.categoryFn));
    };
};
var foldl = function (dict) {
    return dict.foldl;
};
var intercalate = function (__dict_Foldable_6) {
    return function (__dict_Monoid_7) {
        return function (sep) {
            return function (xs) {
                var go = function (_433) {
                    return function (x) {
                        if (_433.init) {
                            return {
                                init: false, 
                                acc: x
                            };
                        };
                        return {
                            init: false, 
                            acc: Prelude["<>"](__dict_Monoid_7["__superclass_Prelude.Semigroup_0"]())(_433.acc)(Prelude["<>"](__dict_Monoid_7["__superclass_Prelude.Semigroup_0"]())(sep)(x))
                        };
                    };
                };
                return (foldl(__dict_Foldable_6)(go)({
                    init: true, 
                    acc: Data_Monoid.mempty(__dict_Monoid_7)
                })(xs)).acc;
            };
        };
    };
};
var mconcat = function (__dict_Foldable_8) {
    return function (__dict_Monoid_9) {
        return foldl(__dict_Foldable_8)(Prelude["<>"](__dict_Monoid_9["__superclass_Prelude.Semigroup_0"]()))(Data_Monoid.mempty(__dict_Monoid_9));
    };
};
var product = function (__dict_Foldable_10) {
    return function (__dict_Semiring_11) {
        return foldl(__dict_Foldable_10)(Prelude["*"](__dict_Semiring_11))(Prelude.one(__dict_Semiring_11));
    };
};
var sum = function (__dict_Foldable_12) {
    return function (__dict_Semiring_13) {
        return foldl(__dict_Foldable_12)(Prelude["+"](__dict_Semiring_13))(Prelude.zero(__dict_Semiring_13));
    };
};
var foldableMultiplicative = new Foldable(function (__dict_Monoid_14) {
    return function (f) {
        return function (_432) {
            return f(_432);
        };
    };
}, function (f) {
    return function (z) {
        return function (_431) {
            return f(z)(_431);
        };
    };
}, function (f) {
    return function (z) {
        return function (_430) {
            return f(_430)(z);
        };
    };
});
var foldableMaybe = new Foldable(function (__dict_Monoid_15) {
    return function (f) {
        return function (_411) {
            if (_411 instanceof Data_Maybe.Nothing) {
                return Data_Monoid.mempty(__dict_Monoid_15);
            };
            if (_411 instanceof Data_Maybe.Just) {
                return f(_411.value0);
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-foldable-traversable/src/Data/Foldable.purs line 51, column 1 - line 59, column 1: " + [ f.constructor.name, _411.constructor.name ]);
        };
    };
}, function (f) {
    return function (z) {
        return function (_410) {
            if (_410 instanceof Data_Maybe.Nothing) {
                return z;
            };
            if (_410 instanceof Data_Maybe.Just) {
                return f(z)(_410.value0);
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-foldable-traversable/src/Data/Foldable.purs line 51, column 1 - line 59, column 1: " + [ f.constructor.name, z.constructor.name, _410.constructor.name ]);
        };
    };
}, function (f) {
    return function (z) {
        return function (_409) {
            if (_409 instanceof Data_Maybe.Nothing) {
                return z;
            };
            if (_409 instanceof Data_Maybe.Just) {
                return f(_409.value0)(z);
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-foldable-traversable/src/Data/Foldable.purs line 51, column 1 - line 59, column 1: " + [ f.constructor.name, z.constructor.name, _409.constructor.name ]);
        };
    };
});
var foldableDual = new Foldable(function (__dict_Monoid_16) {
    return function (f) {
        return function (_423) {
            return f(_423);
        };
    };
}, function (f) {
    return function (z) {
        return function (_422) {
            return f(z)(_422);
        };
    };
}, function (f) {
    return function (z) {
        return function (_421) {
            return f(_421)(z);
        };
    };
});
var foldableDisj = new Foldable(function (__dict_Monoid_17) {
    return function (f) {
        return function (_426) {
            return f(_426);
        };
    };
}, function (f) {
    return function (z) {
        return function (_425) {
            return f(z)(_425);
        };
    };
}, function (f) {
    return function (z) {
        return function (_424) {
            return f(_424)(z);
        };
    };
});
var foldableConj = new Foldable(function (__dict_Monoid_18) {
    return function (f) {
        return function (_429) {
            return f(_429);
        };
    };
}, function (f) {
    return function (z) {
        return function (_428) {
            return f(z)(_428);
        };
    };
}, function (f) {
    return function (z) {
        return function (_427) {
            return f(_427)(z);
        };
    };
});
var foldableArray = new Foldable(function (__dict_Monoid_19) {
    return function (f) {
        return function (xs) {
            return foldr(foldableArray)(function (x) {
                return function (acc) {
                    return Prelude["<>"](__dict_Monoid_19["__superclass_Prelude.Semigroup_0"]())(f(x))(acc);
                };
            })(Data_Monoid.mempty(__dict_Monoid_19))(xs);
        };
    };
}, $foreign.foldlArray, $foreign.foldrArray);
var foldableAdditive = new Foldable(function (__dict_Monoid_20) {
    return function (f) {
        return function (_420) {
            return f(_420);
        };
    };
}, function (f) {
    return function (z) {
        return function (_419) {
            return f(z)(_419);
        };
    };
}, function (f) {
    return function (z) {
        return function (_418) {
            return f(_418)(z);
        };
    };
});
var foldMap = function (dict) {
    return dict.foldMap;
};
var foldableFirst = new Foldable(function (__dict_Monoid_21) {
    return function (f) {
        return function (_414) {
            return foldMap(foldableMaybe)(__dict_Monoid_21)(f)(_414);
        };
    };
}, function (f) {
    return function (z) {
        return function (_413) {
            return foldl(foldableMaybe)(f)(z)(_413);
        };
    };
}, function (f) {
    return function (z) {
        return function (_412) {
            return foldr(foldableMaybe)(f)(z)(_412);
        };
    };
});
var foldableLast = new Foldable(function (__dict_Monoid_22) {
    return function (f) {
        return function (_417) {
            return foldMap(foldableMaybe)(__dict_Monoid_22)(f)(_417);
        };
    };
}, function (f) {
    return function (z) {
        return function (_416) {
            return foldl(foldableMaybe)(f)(z)(_416);
        };
    };
}, function (f) {
    return function (z) {
        return function (_415) {
            return foldr(foldableMaybe)(f)(z)(_415);
        };
    };
});
var fold = function (__dict_Foldable_23) {
    return function (__dict_Monoid_24) {
        return foldMap(__dict_Foldable_23)(__dict_Monoid_24)(Prelude.id(Prelude.categoryFn));
    };
};
var find = function (__dict_Foldable_25) {
    return function (p) {
        return foldl(__dict_Foldable_25)(function (r) {
            return function (x) {
                var _1103 = p(x);
                if (_1103) {
                    return new Data_Maybe.Just(x);
                };
                if (!_1103) {
                    return r;
                };
                throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-foldable-traversable/src/Data/Foldable.purs line 181, column 1 - line 182, column 1: " + [ _1103.constructor.name ]);
            };
        })(Data_Maybe.Nothing.value);
    };
};
var any = function (__dict_Foldable_26) {
    return function (__dict_BooleanAlgebra_27) {
        return function (p) {
            return Prelude["<<<"](Prelude.semigroupoidFn)(Data_Monoid_Disj.runDisj)(foldMap(__dict_Foldable_26)(Data_Monoid_Disj.monoidDisj(__dict_BooleanAlgebra_27))(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Monoid_Disj.Disj)(p)));
        };
    };
};
var elem = function (__dict_Foldable_28) {
    return function (__dict_Eq_29) {
        return Prelude["<<<"](Prelude.semigroupoidFn)(any(__dict_Foldable_28)(Prelude.booleanAlgebraBoolean))(Prelude["=="](__dict_Eq_29));
    };
};
var notElem = function (__dict_Foldable_30) {
    return function (__dict_Eq_31) {
        return function (x) {
            return Prelude["<<<"](Prelude.semigroupoidFn)(Prelude.not(Prelude.booleanAlgebraBoolean))(elem(__dict_Foldable_30)(__dict_Eq_31)(x));
        };
    };
};
var or = function (__dict_Foldable_32) {
    return function (__dict_BooleanAlgebra_33) {
        return any(__dict_Foldable_32)(__dict_BooleanAlgebra_33)(Prelude.id(Prelude.categoryFn));
    };
};
var all = function (__dict_Foldable_34) {
    return function (__dict_BooleanAlgebra_35) {
        return function (p) {
            return Prelude["<<<"](Prelude.semigroupoidFn)(Data_Monoid_Conj.runConj)(foldMap(__dict_Foldable_34)(Data_Monoid_Conj.monoidConj(__dict_BooleanAlgebra_35))(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Monoid_Conj.Conj)(p)));
        };
    };
};
var and = function (__dict_Foldable_36) {
    return function (__dict_BooleanAlgebra_37) {
        return all(__dict_Foldable_36)(__dict_BooleanAlgebra_37)(Prelude.id(Prelude.categoryFn));
    };
};
module.exports = {
    Foldable: Foldable, 
    find: find, 
    notElem: notElem, 
    elem: elem, 
    product: product, 
    sum: sum, 
    all: all, 
    any: any, 
    or: or, 
    and: and, 
    intercalate: intercalate, 
    mconcat: mconcat, 
    sequence_: sequence_, 
    for_: for_, 
    traverse_: traverse_, 
    fold: fold, 
    foldMap: foldMap, 
    foldl: foldl, 
    foldr: foldr, 
    foldableArray: foldableArray, 
    foldableMaybe: foldableMaybe, 
    foldableFirst: foldableFirst, 
    foldableLast: foldableLast, 
    foldableAdditive: foldableAdditive, 
    foldableDual: foldableDual, 
    foldableDisj: foldableDisj, 
    foldableConj: foldableConj, 
    foldableMultiplicative: foldableMultiplicative
};

},{"./foreign":67,"Control.Apply":5,"Data.Maybe":81,"Data.Maybe.First":78,"Data.Maybe.Last":79,"Data.Monoid":87,"Data.Monoid.Additive":82,"Data.Monoid.Conj":83,"Data.Monoid.Disj":84,"Data.Monoid.Dual":85,"Data.Monoid.Multiplicative":86,"Prelude":107}],69:[function(require,module,exports){
/* global exports */
"use strict";

// module Data.Function

exports.mkFn0 = function (fn) {
  return function () {
    return fn({});
  };
};

exports.mkFn1 = function (fn) {
  return function (a) {
    return fn(a);
  };
};

exports.mkFn2 = function (fn) {
  /* jshint maxparams: 2 */
  return function (a, b) {
    return fn(a)(b);
  };
};

exports.mkFn3 = function (fn) {
  /* jshint maxparams: 3 */
  return function (a, b, c) {
    return fn(a)(b)(c);
  };
};

exports.mkFn4 = function (fn) {
  /* jshint maxparams: 4 */
  return function (a, b, c, d) {
    return fn(a)(b)(c)(d);
  };
};

exports.mkFn5 = function (fn) {
  /* jshint maxparams: 5 */
  return function (a, b, c, d, e) {
    return fn(a)(b)(c)(d)(e);
  };
};

exports.mkFn6 = function (fn) {
  /* jshint maxparams: 6 */
  return function (a, b, c, d, e, f) {
    return fn(a)(b)(c)(d)(e)(f);
  };
};

exports.mkFn7 = function (fn) {
  /* jshint maxparams: 7 */
  return function (a, b, c, d, e, f, g) {
    return fn(a)(b)(c)(d)(e)(f)(g);
  };
};

exports.mkFn8 = function (fn) {
  /* jshint maxparams: 8 */
  return function (a, b, c, d, e, f, g, h) {
    return fn(a)(b)(c)(d)(e)(f)(g)(h);
  };
};

exports.mkFn9 = function (fn) {
  /* jshint maxparams: 9 */
  return function (a, b, c, d, e, f, g, h, i) {
    return fn(a)(b)(c)(d)(e)(f)(g)(h)(i);
  };
};

exports.mkFn10 = function (fn) {
  /* jshint maxparams: 10 */
  return function (a, b, c, d, e, f, g, h, i, j) {
    return fn(a)(b)(c)(d)(e)(f)(g)(h)(i)(j);
  };
};

exports.runFn0 = function (fn) {
  return fn();
};

exports.runFn1 = function (fn) {
  return function (a) {
    return fn(a);
  };
};

exports.runFn2 = function (fn) {
  return function (a) {
    return function (b) {
      return fn(a, b);
    };
  };
};

exports.runFn3 = function (fn) {
  return function (a) {
    return function (b) {
      return function (c) {
        return fn(a, b, c);
      };
    };
  };
};

exports.runFn4 = function (fn) {
  return function (a) {
    return function (b) {
      return function (c) {
        return function (d) {
          return fn(a, b, c, d);
        };
      };
    };
  };
};

exports.runFn5 = function (fn) {
  return function (a) {
    return function (b) {
      return function (c) {
        return function (d) {
          return function (e) {
            return fn(a, b, c, d, e);
          };
        };
      };
    };
  };
};

exports.runFn6 = function (fn) {
  return function (a) {
    return function (b) {
      return function (c) {
        return function (d) {
          return function (e) {
            return function (f) {
              return fn(a, b, c, d, e, f);
            };
          };
        };
      };
    };
  };
};

exports.runFn7 = function (fn) {
  return function (a) {
    return function (b) {
      return function (c) {
        return function (d) {
          return function (e) {
            return function (f) {
              return function (g) {
                return fn(a, b, c, d, e, f, g);
              };
            };
          };
        };
      };
    };
  };
};

exports.runFn8 = function (fn) {
  return function (a) {
    return function (b) {
      return function (c) {
        return function (d) {
          return function (e) {
            return function (f) {
              return function (g) {
                return function (h) {
                  return fn(a, b, c, d, e, f, g, h);
                };
              };
            };
          };
        };
      };
    };
  };
};

exports.runFn9 = function (fn) {
  return function (a) {
    return function (b) {
      return function (c) {
        return function (d) {
          return function (e) {
            return function (f) {
              return function (g) {
                return function (h) {
                  return function (i) {
                    return fn(a, b, c, d, e, f, g, h, i);
                  };
                };
              };
            };
          };
        };
      };
    };
  };
};

exports.runFn10 = function (fn) {
  return function (a) {
    return function (b) {
      return function (c) {
        return function (d) {
          return function (e) {
            return function (f) {
              return function (g) {
                return function (h) {
                  return function (i) {
                    return function (j) {
                      return fn(a, b, c, d, e, f, g, h, i, j);
                    };
                  };
                };
              };
            };
          };
        };
      };
    };
  };
};

},{}],70:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var on = function (f) {
    return function (g) {
        return function (x) {
            return function (y) {
                return f(g(x))(g(y));
            };
        };
    };
};
module.exports = {
    on: on, 
    runFn10: $foreign.runFn10, 
    runFn9: $foreign.runFn9, 
    runFn8: $foreign.runFn8, 
    runFn7: $foreign.runFn7, 
    runFn6: $foreign.runFn6, 
    runFn5: $foreign.runFn5, 
    runFn4: $foreign.runFn4, 
    runFn3: $foreign.runFn3, 
    runFn2: $foreign.runFn2, 
    runFn1: $foreign.runFn1, 
    runFn0: $foreign.runFn0, 
    mkFn10: $foreign.mkFn10, 
    mkFn9: $foreign.mkFn9, 
    mkFn8: $foreign.mkFn8, 
    mkFn7: $foreign.mkFn7, 
    mkFn6: $foreign.mkFn6, 
    mkFn5: $foreign.mkFn5, 
    mkFn4: $foreign.mkFn4, 
    mkFn3: $foreign.mkFn3, 
    mkFn2: $foreign.mkFn2, 
    mkFn1: $foreign.mkFn1, 
    mkFn0: $foreign.mkFn0
};

},{"./foreign":69,"Prelude":107}],71:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Invariant = function (imap) {
    this.imap = imap;
};
var imapF = function (__dict_Functor_0) {
    return Prelude["<<<"](Prelude.semigroupoidFn)(Prelude["const"])(Prelude.map(__dict_Functor_0));
};
var invariantArray = new Invariant(imapF(Prelude.functorArray));
var invariantFn = new Invariant(imapF(Prelude.functorFn));
var imap = function (dict) {
    return dict.imap;
};
module.exports = {
    Invariant: Invariant, 
    imapF: imapF, 
    imap: imap, 
    invariantFn: invariantFn, 
    invariantArray: invariantArray
};

},{"Prelude":107}],72:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var $less$dollar = function (__dict_Functor_0) {
    return function (x) {
        return function (f) {
            return Prelude["<$>"](__dict_Functor_0)(Prelude["const"](x))(f);
        };
    };
};
var $dollar$greater = function (__dict_Functor_1) {
    return function (f) {
        return function (x) {
            return Prelude["<$>"](__dict_Functor_1)(Prelude["const"](x))(f);
        };
    };
};
module.exports = {
    "$>": $dollar$greater, 
    "<$": $less$dollar
};

},{"Prelude":107}],73:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Monoid = require("Data.Monoid");
var Data_Functor_Invariant = require("Data.Functor.Invariant");
var Control_Comonad = require("Control.Comonad");
var Control_Extend = require("Control.Extend");
var Data_Foldable = require("Data.Foldable");
var Data_Traversable = require("Data.Traversable");
var Identity = function (x) {
    return x;
};
var showIdentity = function (__dict_Show_2) {
    return new Prelude.Show(function (_506) {
        return "Identity (" + (Prelude.show(__dict_Show_2)(_506) + ")");
    });
};
var semiringIdentity = function (__dict_Semiring_3) {
    return new Prelude.Semiring(function (_496) {
        return function (_497) {
            return Prelude["+"](__dict_Semiring_3)(_496)(_497);
        };
    }, function (_498) {
        return function (_499) {
            return Prelude["*"](__dict_Semiring_3)(_498)(_499);
        };
    }, Prelude.one(__dict_Semiring_3), Prelude.zero(__dict_Semiring_3));
};
var semigroupIdenity = function (__dict_Semigroup_4) {
    return new Prelude.Semigroup(function (_494) {
        return function (_495) {
            return Prelude["<>"](__dict_Semigroup_4)(_494)(_495);
        };
    });
};
var runIdentity = function (_484) {
    return _484;
};
var ringIdentity = function (__dict_Ring_5) {
    return new Prelude.Ring(function () {
        return semiringIdentity(__dict_Ring_5["__superclass_Prelude.Semiring_0"]());
    }, function (_504) {
        return function (_505) {
            return Prelude["-"](__dict_Ring_5)(_504)(_505);
        };
    });
};
var monoidIdentity = function (__dict_Monoid_8) {
    return new Data_Monoid.Monoid(function () {
        return semigroupIdenity(__dict_Monoid_8["__superclass_Prelude.Semigroup_0"]());
    }, Data_Monoid.mempty(__dict_Monoid_8));
};
var moduloSemiringIdentity = function (__dict_ModuloSemiring_9) {
    return new Prelude.ModuloSemiring(function () {
        return semiringIdentity(__dict_ModuloSemiring_9["__superclass_Prelude.Semiring_0"]());
    }, function (_502) {
        return function (_503) {
            return Prelude["/"](__dict_ModuloSemiring_9)(_502)(_503);
        };
    }, function (_500) {
        return function (_501) {
            return Prelude.mod(__dict_ModuloSemiring_9)(_500)(_501);
        };
    });
};
var functorIdentity = new Prelude.Functor(function (f) {
    return function (_507) {
        return f(_507);
    };
});
var invariantIdentity = new Data_Functor_Invariant.Invariant(Data_Functor_Invariant.imapF(functorIdentity));
var foldableIdentity = new Data_Foldable.Foldable(function (__dict_Monoid_10) {
    return function (f) {
        return function (_514) {
            return f(_514);
        };
    };
}, function (f) {
    return function (z) {
        return function (_513) {
            return f(z)(_513);
        };
    };
}, function (f) {
    return function (z) {
        return function (_512) {
            return f(_512)(z);
        };
    };
});
var traversableIdentity = new Data_Traversable.Traversable(function () {
    return foldableIdentity;
}, function () {
    return functorIdentity;
}, function (__dict_Applicative_1) {
    return function (_516) {
        return Prelude["<$>"]((__dict_Applicative_1["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Identity)(_516);
    };
}, function (__dict_Applicative_0) {
    return function (f) {
        return function (_515) {
            return Prelude["<$>"]((__dict_Applicative_0["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Identity)(f(_515));
        };
    };
});
var extendIdentity = new Control_Extend.Extend(function () {
    return functorIdentity;
}, function (f) {
    return function (m) {
        return f(m);
    };
});
var eqIdentity = function (__dict_Eq_11) {
    return new Prelude.Eq(function (_485) {
        return function (_486) {
            return Prelude["=="](__dict_Eq_11)(_485)(_486);
        };
    });
};
var ordIdentity = function (__dict_Ord_6) {
    return new Prelude.Ord(function () {
        return eqIdentity(__dict_Ord_6["__superclass_Prelude.Eq_0"]());
    }, function (_487) {
        return function (_488) {
            return Prelude.compare(__dict_Ord_6)(_487)(_488);
        };
    });
};
var divisionRingIdentity = function (__dict_DivisionRing_12) {
    return new Prelude.DivisionRing(function () {
        return moduloSemiringIdentity(__dict_DivisionRing_12["__superclass_Prelude.ModuloSemiring_1"]());
    }, function () {
        return ringIdentity(__dict_DivisionRing_12["__superclass_Prelude.Ring_0"]());
    });
};
var numIdentity = function (__dict_Num_7) {
    return new Prelude.Num(function () {
        return divisionRingIdentity(__dict_Num_7["__superclass_Prelude.DivisionRing_0"]());
    });
};
var comonadIdentity = new Control_Comonad.Comonad(function () {
    return extendIdentity;
}, function (_511) {
    return _511;
});
var boundedIdentity = function (__dict_Bounded_14) {
    return new Prelude.Bounded(Prelude.bottom(__dict_Bounded_14), Prelude.top(__dict_Bounded_14));
};
var boundedOrdIdentity = function (__dict_BoundedOrd_13) {
    return new Prelude.BoundedOrd(function () {
        return boundedIdentity(__dict_BoundedOrd_13["__superclass_Prelude.Bounded_0"]());
    }, function () {
        return ordIdentity(__dict_BoundedOrd_13["__superclass_Prelude.Ord_1"]());
    });
};
var booleanAlgebraIdentity = function (__dict_BooleanAlgebra_15) {
    return new Prelude.BooleanAlgebra(function () {
        return boundedIdentity(__dict_BooleanAlgebra_15["__superclass_Prelude.Bounded_0"]());
    }, function (_489) {
        return function (_490) {
            return Prelude.conj(__dict_BooleanAlgebra_15)(_489)(_490);
        };
    }, function (_491) {
        return function (_492) {
            return Prelude.disj(__dict_BooleanAlgebra_15)(_491)(_492);
        };
    }, function (_493) {
        return Prelude.not(__dict_BooleanAlgebra_15)(_493);
    });
};
var applyIdentity = new Prelude.Apply(function () {
    return functorIdentity;
}, function (_508) {
    return function (_509) {
        return _508(_509);
    };
});
var bindIdentity = new Prelude.Bind(function () {
    return applyIdentity;
}, function (_510) {
    return function (f) {
        return f(_510);
    };
});
var applicativeIdentity = new Prelude.Applicative(function () {
    return applyIdentity;
}, Identity);
var monadIdentity = new Prelude.Monad(function () {
    return applicativeIdentity;
}, function () {
    return bindIdentity;
});
module.exports = {
    Identity: Identity, 
    runIdentity: runIdentity, 
    eqIdentity: eqIdentity, 
    ordIdentity: ordIdentity, 
    boundedIdentity: boundedIdentity, 
    boundedOrdIdentity: boundedOrdIdentity, 
    booleanAlgebraIdentity: booleanAlgebraIdentity, 
    semigroupIdenity: semigroupIdenity, 
    monoidIdentity: monoidIdentity, 
    semiringIdentity: semiringIdentity, 
    moduloSemiringIdentity: moduloSemiringIdentity, 
    ringIdentity: ringIdentity, 
    divisionRingIdentity: divisionRingIdentity, 
    numIdentity: numIdentity, 
    showIdentity: showIdentity, 
    functorIdentity: functorIdentity, 
    invariantIdentity: invariantIdentity, 
    applyIdentity: applyIdentity, 
    applicativeIdentity: applicativeIdentity, 
    bindIdentity: bindIdentity, 
    monadIdentity: monadIdentity, 
    extendIdentity: extendIdentity, 
    comonadIdentity: comonadIdentity, 
    foldableIdentity: foldableIdentity, 
    traversableIdentity: traversableIdentity
};

},{"Control.Comonad":8,"Control.Extend":9,"Data.Foldable":68,"Data.Functor.Invariant":71,"Data.Monoid":87,"Data.Traversable":94,"Prelude":107}],74:[function(require,module,exports){
/* global exports */
"use strict";

// module Data.Int.Bits

exports.andImpl = function (n1) {
  return function (n2) {
    /* jshint bitwise: false */
    return n1 & n2;
  };
};

exports.orImpl = function (n1) {
  return function (n2) {
    /* jshint bitwise: false */
    return n1 | n2;
  };
};

exports.xorImpl = function (n1) {
  return function (n2) {
    /* jshint bitwise: false */
    return n1 ^ n2;
  };
};

exports.shl = function (n1) {
  return function (n2) {
    /* jshint bitwise: false */
    return n1 << n2;
  };
};

exports.shr = function (n1) {
  return function (n2) {
    /* jshint bitwise: false */
    return n1 >> n2;
  };
};

exports.zshr = function (n1) {
  return function (n2) {
    /* jshint bitwise: false */
    return n1 >>> n2;
  };
};

exports.complement = function (n) {
  /* jshint bitwise: false */
  return ~n;
};

},{}],75:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var $dot$bar$dot = $foreign.orImpl;
var $dot$up$dot = $foreign.xorImpl;
var $dot$amp$dot = $foreign.andImpl;
module.exports = {
    ".^.": $dot$up$dot, 
    ".|.": $dot$bar$dot, 
    ".&.": $dot$amp$dot, 
    complement: $foreign.complement, 
    zshr: $foreign.zshr, 
    shr: $foreign.shr, 
    shl: $foreign.shl
};

},{"./foreign":74}],76:[function(require,module,exports){
/* global exports */
"use strict";

// module Data.Int

exports.fromNumberImpl = function (just) {
  return function (nothing) {
    return function (n) {
      /* jshint bitwise: false */
      return (n | 0) === n ? just(n) : nothing;
    };
  };
};

exports.toNumber = function (n) {
  return n;
};

exports.fromStringImpl = function (just) {
  return function (nothing) {
    return function (s) {
      /* jshint bitwise: false */
      var i = parseFloat(s);
      return (i | 0) === i ? just(i) : nothing;
    };
  };
};

},{}],77:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Data_Int_Bits = require("Data.Int.Bits");
var Prelude = require("Prelude");
var Data_Maybe = require("Data.Maybe");
var odd = function (x) {
    return Prelude["/="](Prelude.eqInt)(x & 1)(0);
};
var fromString = $foreign.fromStringImpl(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var fromNumber = $foreign.fromNumberImpl(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var even = function (x) {
    return Prelude["=="](Prelude.eqInt)(x & 1)(0);
};
module.exports = {
    odd: odd, 
    even: even, 
    fromString: fromString, 
    fromNumber: fromNumber, 
    toNumber: $foreign.toNumber
};

},{"./foreign":76,"Data.Int.Bits":75,"Data.Maybe":81,"Prelude":107}],78:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Extend = require("Control.Extend");
var Data_Functor_Invariant = require("Data.Functor.Invariant");
var Control_Comonad = require("Control.Comonad");
var Data_Maybe = require("Data.Maybe");
var Data_Monoid = require("Data.Monoid");
var First = function (x) {
    return x;
};
var showFirst = function (__dict_Show_0) {
    return new Prelude.Show(function (_395) {
        return "First (" + (Prelude.show(Data_Maybe.showMaybe(__dict_Show_0))(_395) + ")");
    });
};
var semigroupFirst = new Prelude.Semigroup(function (_396) {
    return function (second) {
        if (_396 instanceof Data_Maybe.Just) {
            return _396;
        };
        return second;
    };
});
var runFirst = function (_385) {
    return _385;
};
var monoidFirst = new Data_Monoid.Monoid(function () {
    return semigroupFirst;
}, Data_Maybe.Nothing.value);
var functorFirst = new Prelude.Functor(function (f) {
    return function (_390) {
        return Prelude["<$>"](Data_Maybe.functorMaybe)(f)(_390);
    };
});
var invariantFirst = new Data_Functor_Invariant.Invariant(Data_Functor_Invariant.imapF(functorFirst));
var extendFirst = new Control_Extend.Extend(function () {
    return functorFirst;
}, function (f) {
    return function (_394) {
        return Control_Extend.extend(Data_Maybe.extendMaybe)(Prelude["<<<"](Prelude.semigroupoidFn)(f)(First))(_394);
    };
});
var eqFirst = function (__dict_Eq_2) {
    return new Prelude.Eq(function (_386) {
        return function (_387) {
            return Prelude["=="](Data_Maybe.eqMaybe(__dict_Eq_2))(_386)(_387);
        };
    });
};
var ordFirst = function (__dict_Ord_1) {
    return new Prelude.Ord(function () {
        return eqFirst(__dict_Ord_1["__superclass_Prelude.Eq_0"]());
    }, function (_388) {
        return function (_389) {
            return Prelude.compare(Data_Maybe.ordMaybe(__dict_Ord_1))(_388)(_389);
        };
    });
};
var boundedFirst = function (__dict_Bounded_3) {
    return new Prelude.Bounded(Prelude.bottom(Data_Maybe.boundedMaybe(__dict_Bounded_3)), Prelude.top(Data_Maybe.boundedMaybe(__dict_Bounded_3)));
};
var applyFirst = new Prelude.Apply(function () {
    return functorFirst;
}, function (_391) {
    return function (_392) {
        return Prelude["<*>"](Data_Maybe.applyMaybe)(_391)(_392);
    };
});
var bindFirst = new Prelude.Bind(function () {
    return applyFirst;
}, function (_393) {
    return function (f) {
        return Prelude.bind(Data_Maybe.bindMaybe)(_393)(Prelude["<<<"](Prelude.semigroupoidFn)(runFirst)(f));
    };
});
var applicativeFirst = new Prelude.Applicative(function () {
    return applyFirst;
}, Prelude["<<<"](Prelude.semigroupoidFn)(First)(Prelude.pure(Data_Maybe.applicativeMaybe)));
var monadFirst = new Prelude.Monad(function () {
    return applicativeFirst;
}, function () {
    return bindFirst;
});
module.exports = {
    First: First, 
    runFirst: runFirst, 
    eqFirst: eqFirst, 
    ordFirst: ordFirst, 
    boundedFirst: boundedFirst, 
    functorFirst: functorFirst, 
    applyFirst: applyFirst, 
    applicativeFirst: applicativeFirst, 
    bindFirst: bindFirst, 
    monadFirst: monadFirst, 
    extendFirst: extendFirst, 
    invariantFirst: invariantFirst, 
    showFirst: showFirst, 
    semigroupFirst: semigroupFirst, 
    monoidFirst: monoidFirst
};

},{"Control.Comonad":8,"Control.Extend":9,"Data.Functor.Invariant":71,"Data.Maybe":81,"Data.Monoid":87,"Prelude":107}],79:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Extend = require("Control.Extend");
var Data_Functor_Invariant = require("Data.Functor.Invariant");
var Control_Comonad = require("Control.Comonad");
var Data_Maybe = require("Data.Maybe");
var Data_Monoid = require("Data.Monoid");
var Last = function (x) {
    return x;
};
var showLast = function (__dict_Show_0) {
    return new Prelude.Show(function (_407) {
        return "Last (" + (Prelude.show(Data_Maybe.showMaybe(__dict_Show_0))(_407) + ")");
    });
};
var semigroupLast = new Prelude.Semigroup(function (last) {
    return function (_408) {
        if (_408 instanceof Data_Maybe.Just) {
            return _408;
        };
        if (_408 instanceof Data_Maybe.Nothing) {
            return last;
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-maybe/src/Data/Maybe/Last.purs line 57, column 1 - line 61, column 1: " + [ last.constructor.name, _408.constructor.name ]);
    };
});
var runLast = function (_397) {
    return _397;
};
var monoidLast = new Data_Monoid.Monoid(function () {
    return semigroupLast;
}, Data_Maybe.Nothing.value);
var functorLast = new Prelude.Functor(function (f) {
    return function (_402) {
        return Prelude["<$>"](Data_Maybe.functorMaybe)(f)(_402);
    };
});
var invariantLast = new Data_Functor_Invariant.Invariant(Data_Functor_Invariant.imapF(functorLast));
var extendLast = new Control_Extend.Extend(function () {
    return functorLast;
}, function (f) {
    return function (_406) {
        return Control_Extend.extend(Data_Maybe.extendMaybe)(Prelude["<<<"](Prelude.semigroupoidFn)(f)(Last))(_406);
    };
});
var eqLast = function (__dict_Eq_2) {
    return new Prelude.Eq(function (_398) {
        return function (_399) {
            return Prelude["=="](Data_Maybe.eqMaybe(__dict_Eq_2))(_398)(_399);
        };
    });
};
var ordLast = function (__dict_Ord_1) {
    return new Prelude.Ord(function () {
        return eqLast(__dict_Ord_1["__superclass_Prelude.Eq_0"]());
    }, function (_400) {
        return function (_401) {
            return Prelude.compare(Data_Maybe.ordMaybe(__dict_Ord_1))(_400)(_401);
        };
    });
};
var boundedLast = function (__dict_Bounded_3) {
    return new Prelude.Bounded(Prelude.bottom(Data_Maybe.boundedMaybe(__dict_Bounded_3)), Prelude.top(Data_Maybe.boundedMaybe(__dict_Bounded_3)));
};
var applyLast = new Prelude.Apply(function () {
    return functorLast;
}, function (_403) {
    return function (_404) {
        return Prelude["<*>"](Data_Maybe.applyMaybe)(_403)(_404);
    };
});
var bindLast = new Prelude.Bind(function () {
    return applyLast;
}, function (_405) {
    return function (f) {
        return Prelude.bind(Data_Maybe.bindMaybe)(_405)(Prelude["<<<"](Prelude.semigroupoidFn)(runLast)(f));
    };
});
var applicativeLast = new Prelude.Applicative(function () {
    return applyLast;
}, Prelude["<<<"](Prelude.semigroupoidFn)(Last)(Prelude.pure(Data_Maybe.applicativeMaybe)));
var monadLast = new Prelude.Monad(function () {
    return applicativeLast;
}, function () {
    return bindLast;
});
module.exports = {
    Last: Last, 
    runLast: runLast, 
    eqLast: eqLast, 
    ordLast: ordLast, 
    boundedLast: boundedLast, 
    functorLast: functorLast, 
    applyLast: applyLast, 
    applicativeLast: applicativeLast, 
    bindLast: bindLast, 
    monadLast: monadLast, 
    extendLast: extendLast, 
    invariantLast: invariantLast, 
    showLast: showLast, 
    semigroupLast: semigroupLast, 
    monoidLast: monoidLast
};

},{"Control.Comonad":8,"Control.Extend":9,"Data.Functor.Invariant":71,"Data.Maybe":81,"Data.Monoid":87,"Prelude":107}],80:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Maybe = require("Data.Maybe");
var fromJust = function (_434) {
    if (_434 instanceof Data_Maybe.Just) {
        return _434.value0;
    };
    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-maybe/src/Data/Maybe/Unsafe.purs line 10, column 1 - line 11, column 1: " + [ _434.constructor.name ]);
};
module.exports = {
    fromJust: fromJust
};

},{"Data.Maybe":81,"Prelude":107}],81:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Functor_Invariant = require("Data.Functor.Invariant");
var Control_Alt = require("Control.Alt");
var Control_Alternative = require("Control.Alternative");
var Control_Extend = require("Control.Extend");
var Control_MonadPlus = require("Control.MonadPlus");
var Control_Plus = require("Control.Plus");
var Data_Monoid = require("Data.Monoid");
var Nothing = (function () {
    function Nothing() {

    };
    Nothing.value = new Nothing();
    return Nothing;
})();
var Just = (function () {
    function Just(value0) {
        this.value0 = value0;
    };
    Just.create = function (value0) {
        return new Just(value0);
    };
    return Just;
})();
var showMaybe = function (__dict_Show_0) {
    return new Prelude.Show(function (_381) {
        if (_381 instanceof Just) {
            return "Just (" + (Prelude.show(__dict_Show_0)(_381.value0) + ")");
        };
        if (_381 instanceof Nothing) {
            return "Nothing";
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-maybe/src/Data/Maybe.purs line 262, column 1 - line 264, column 19: " + [ _381.constructor.name ]);
    });
};
var maybe = function (b) {
    return function (f) {
        return function (_371) {
            if (_371 instanceof Nothing) {
                return b;
            };
            if (_371 instanceof Just) {
                return f(_371.value0);
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-maybe/src/Data/Maybe.purs line 26, column 1 - line 27, column 1: " + [ b.constructor.name, f.constructor.name, _371.constructor.name ]);
        };
    };
};
var isNothing = maybe(true)(Prelude["const"](false));
var isJust = maybe(false)(Prelude["const"](true));
var functorMaybe = new Prelude.Functor(function (fn) {
    return function (_372) {
        if (_372 instanceof Just) {
            return new Just(fn(_372.value0));
        };
        return Nothing.value;
    };
});
var invariantMaybe = new Data_Functor_Invariant.Invariant(Data_Functor_Invariant.imapF(functorMaybe));
var fromMaybe = function (a) {
    return maybe(a)(Prelude.id(Prelude.categoryFn));
};
var extendMaybe = new Control_Extend.Extend(function () {
    return functorMaybe;
}, function (f) {
    return function (_376) {
        if (_376 instanceof Nothing) {
            return Nothing.value;
        };
        return new Just(f(_376));
    };
});
var eqMaybe = function (__dict_Eq_8) {
    return new Prelude.Eq(function (_377) {
        return function (_378) {
            if (_377 instanceof Nothing && _378 instanceof Nothing) {
                return true;
            };
            if (_377 instanceof Just && _378 instanceof Just) {
                return Prelude["=="](__dict_Eq_8)(_377.value0)(_378.value0);
            };
            return false;
        };
    });
};
var ordMaybe = function (__dict_Ord_4) {
    return new Prelude.Ord(function () {
        return eqMaybe(__dict_Ord_4["__superclass_Prelude.Eq_0"]());
    }, function (_379) {
        return function (_380) {
            if (_379 instanceof Just && _380 instanceof Just) {
                return Prelude.compare(__dict_Ord_4)(_379.value0)(_380.value0);
            };
            if (_379 instanceof Nothing && _380 instanceof Nothing) {
                return Prelude.EQ.value;
            };
            if (_379 instanceof Nothing) {
                return Prelude.LT.value;
            };
            if (_380 instanceof Nothing) {
                return Prelude.GT.value;
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-maybe/src/Data/Maybe.purs line 242, column 1 - line 248, column 1: " + [ _379.constructor.name, _380.constructor.name ]);
        };
    });
};
var boundedMaybe = function (__dict_Bounded_11) {
    return new Prelude.Bounded(Nothing.value, new Just(Prelude.top(__dict_Bounded_11)));
};
var boundedOrdMaybe = function (__dict_BoundedOrd_10) {
    return new Prelude.BoundedOrd(function () {
        return boundedMaybe(__dict_BoundedOrd_10["__superclass_Prelude.Bounded_0"]());
    }, function () {
        return ordMaybe(__dict_BoundedOrd_10["__superclass_Prelude.Ord_1"]());
    });
};
var applyMaybe = new Prelude.Apply(function () {
    return functorMaybe;
}, function (_373) {
    return function (x) {
        if (_373 instanceof Just) {
            return Prelude["<$>"](functorMaybe)(_373.value0)(x);
        };
        if (_373 instanceof Nothing) {
            return Nothing.value;
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-maybe/src/Data/Maybe.purs line 96, column 1 - line 120, column 1: " + [ _373.constructor.name, x.constructor.name ]);
    };
});
var bindMaybe = new Prelude.Bind(function () {
    return applyMaybe;
}, function (_375) {
    return function (k) {
        if (_375 instanceof Just) {
            return k(_375.value0);
        };
        if (_375 instanceof Nothing) {
            return Nothing.value;
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-maybe/src/Data/Maybe.purs line 155, column 1 - line 174, column 1: " + [ _375.constructor.name, k.constructor.name ]);
    };
});
var booleanAlgebraMaybe = function (__dict_BooleanAlgebra_12) {
    return new Prelude.BooleanAlgebra(function () {
        return boundedMaybe(__dict_BooleanAlgebra_12["__superclass_Prelude.Bounded_0"]());
    }, function (x) {
        return function (y) {
            return Prelude["<*>"](applyMaybe)(Prelude["<$>"](functorMaybe)(Prelude.conj(__dict_BooleanAlgebra_12))(x))(y);
        };
    }, function (x) {
        return function (y) {
            return Prelude["<*>"](applyMaybe)(Prelude["<$>"](functorMaybe)(Prelude.disj(__dict_BooleanAlgebra_12))(x))(y);
        };
    }, Prelude.map(functorMaybe)(Prelude.not(__dict_BooleanAlgebra_12)));
};
var semigroupMaybe = function (__dict_Semigroup_2) {
    return new Prelude.Semigroup(function (x) {
        return function (y) {
            return Prelude["<*>"](applyMaybe)(Prelude["<$>"](functorMaybe)(Prelude.append(__dict_Semigroup_2))(x))(y);
        };
    });
};
var monoidMaybe = function (__dict_Semigroup_6) {
    return new Data_Monoid.Monoid(function () {
        return semigroupMaybe(__dict_Semigroup_6);
    }, Nothing.value);
};
var semiringMaybe = function (__dict_Semiring_1) {
    return new Prelude.Semiring(function (x) {
        return function (y) {
            return Prelude["<*>"](applyMaybe)(Prelude["<$>"](functorMaybe)(Prelude.add(__dict_Semiring_1))(x))(y);
        };
    }, function (x) {
        return function (y) {
            return Prelude["<*>"](applyMaybe)(Prelude["<$>"](functorMaybe)(Prelude.mul(__dict_Semiring_1))(x))(y);
        };
    }, new Just(Prelude.one(__dict_Semiring_1)), new Just(Prelude.zero(__dict_Semiring_1)));
};
var moduloSemiringMaybe = function (__dict_ModuloSemiring_7) {
    return new Prelude.ModuloSemiring(function () {
        return semiringMaybe(__dict_ModuloSemiring_7["__superclass_Prelude.Semiring_0"]());
    }, function (x) {
        return function (y) {
            return Prelude["<*>"](applyMaybe)(Prelude["<$>"](functorMaybe)(Prelude.div(__dict_ModuloSemiring_7))(x))(y);
        };
    }, function (x) {
        return function (y) {
            return Prelude["<*>"](applyMaybe)(Prelude["<$>"](functorMaybe)(Prelude.mod(__dict_ModuloSemiring_7))(x))(y);
        };
    });
};
var ringMaybe = function (__dict_Ring_3) {
    return new Prelude.Ring(function () {
        return semiringMaybe(__dict_Ring_3["__superclass_Prelude.Semiring_0"]());
    }, function (x) {
        return function (y) {
            return Prelude["<*>"](applyMaybe)(Prelude["<$>"](functorMaybe)(Prelude.sub(__dict_Ring_3))(x))(y);
        };
    });
};
var divisionRingMaybe = function (__dict_DivisionRing_9) {
    return new Prelude.DivisionRing(function () {
        return moduloSemiringMaybe(__dict_DivisionRing_9["__superclass_Prelude.ModuloSemiring_1"]());
    }, function () {
        return ringMaybe(__dict_DivisionRing_9["__superclass_Prelude.Ring_0"]());
    });
};
var numMaybe = function (__dict_Num_5) {
    return new Prelude.Num(function () {
        return divisionRingMaybe(__dict_Num_5["__superclass_Prelude.DivisionRing_0"]());
    });
};
var applicativeMaybe = new Prelude.Applicative(function () {
    return applyMaybe;
}, Just.create);
var monadMaybe = new Prelude.Monad(function () {
    return applicativeMaybe;
}, function () {
    return bindMaybe;
});
var altMaybe = new Control_Alt.Alt(function () {
    return functorMaybe;
}, function (_374) {
    return function (r) {
        if (_374 instanceof Nothing) {
            return r;
        };
        return _374;
    };
});
var plusMaybe = new Control_Plus.Plus(function () {
    return altMaybe;
}, Nothing.value);
var alternativeMaybe = new Control_Alternative.Alternative(function () {
    return plusMaybe;
}, function () {
    return applicativeMaybe;
});
var monadPlusMaybe = new Control_MonadPlus.MonadPlus(function () {
    return alternativeMaybe;
}, function () {
    return monadMaybe;
});
module.exports = {
    Nothing: Nothing, 
    Just: Just, 
    isNothing: isNothing, 
    isJust: isJust, 
    fromMaybe: fromMaybe, 
    maybe: maybe, 
    functorMaybe: functorMaybe, 
    applyMaybe: applyMaybe, 
    applicativeMaybe: applicativeMaybe, 
    altMaybe: altMaybe, 
    plusMaybe: plusMaybe, 
    alternativeMaybe: alternativeMaybe, 
    bindMaybe: bindMaybe, 
    monadMaybe: monadMaybe, 
    monadPlusMaybe: monadPlusMaybe, 
    extendMaybe: extendMaybe, 
    invariantMaybe: invariantMaybe, 
    semigroupMaybe: semigroupMaybe, 
    monoidMaybe: monoidMaybe, 
    semiringMaybe: semiringMaybe, 
    moduloSemiringMaybe: moduloSemiringMaybe, 
    ringMaybe: ringMaybe, 
    divisionRingMaybe: divisionRingMaybe, 
    numMaybe: numMaybe, 
    eqMaybe: eqMaybe, 
    ordMaybe: ordMaybe, 
    boundedMaybe: boundedMaybe, 
    boundedOrdMaybe: boundedOrdMaybe, 
    booleanAlgebraMaybe: booleanAlgebraMaybe, 
    showMaybe: showMaybe
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Extend":9,"Control.MonadPlus":37,"Control.Plus":38,"Data.Functor.Invariant":71,"Data.Monoid":87,"Prelude":107}],82:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Comonad = require("Control.Comonad");
var Control_Extend = require("Control.Extend");
var Data_Functor_Invariant = require("Data.Functor.Invariant");
var Data_Monoid = require("Data.Monoid");
var Additive = function (x) {
    return x;
};
var showAdditive = function (__dict_Show_0) {
    return new Prelude.Show(function (_292) {
        return "Additive (" + (Prelude.show(__dict_Show_0)(_292) + ")");
    });
};
var semigroupAdditive = function (__dict_Semiring_1) {
    return new Prelude.Semigroup(function (_293) {
        return function (_294) {
            return Prelude["+"](__dict_Semiring_1)(_293)(_294);
        };
    });
};
var runAdditive = function (_281) {
    return _281;
};
var monoidAdditive = function (__dict_Semiring_3) {
    return new Data_Monoid.Monoid(function () {
        return semigroupAdditive(__dict_Semiring_3);
    }, Prelude.zero(__dict_Semiring_3));
};
var invariantAdditive = new Data_Functor_Invariant.Invariant(function (f) {
    return function (_290) {
        return function (_291) {
            return f(_291);
        };
    };
});
var functorAdditive = new Prelude.Functor(function (f) {
    return function (_286) {
        return f(_286);
    };
});
var extendAdditive = new Control_Extend.Extend(function () {
    return functorAdditive;
}, function (f) {
    return function (x) {
        return f(x);
    };
});
var eqAdditive = function (__dict_Eq_4) {
    return new Prelude.Eq(function (_282) {
        return function (_283) {
            return Prelude["=="](__dict_Eq_4)(_282)(_283);
        };
    });
};
var ordAdditive = function (__dict_Ord_2) {
    return new Prelude.Ord(function () {
        return eqAdditive(__dict_Ord_2["__superclass_Prelude.Eq_0"]());
    }, function (_284) {
        return function (_285) {
            return Prelude.compare(__dict_Ord_2)(_284)(_285);
        };
    });
};
var comonadAdditive = new Control_Comonad.Comonad(function () {
    return extendAdditive;
}, runAdditive);
var applyAdditive = new Prelude.Apply(function () {
    return functorAdditive;
}, function (_287) {
    return function (_288) {
        return _287(_288);
    };
});
var bindAdditive = new Prelude.Bind(function () {
    return applyAdditive;
}, function (_289) {
    return function (f) {
        return f(_289);
    };
});
var applicativeAdditive = new Prelude.Applicative(function () {
    return applyAdditive;
}, Additive);
var monadAdditive = new Prelude.Monad(function () {
    return applicativeAdditive;
}, function () {
    return bindAdditive;
});
module.exports = {
    Additive: Additive, 
    runAdditive: runAdditive, 
    eqAdditive: eqAdditive, 
    ordAdditive: ordAdditive, 
    functorAdditive: functorAdditive, 
    applyAdditive: applyAdditive, 
    applicativeAdditive: applicativeAdditive, 
    bindAdditive: bindAdditive, 
    monadAdditive: monadAdditive, 
    extendAdditive: extendAdditive, 
    comonadAdditive: comonadAdditive, 
    invariantAdditive: invariantAdditive, 
    showAdditive: showAdditive, 
    semigroupAdditive: semigroupAdditive, 
    monoidAdditive: monoidAdditive
};

},{"Control.Comonad":8,"Control.Extend":9,"Data.Functor.Invariant":71,"Data.Monoid":87,"Prelude":107}],83:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Comonad = require("Control.Comonad");
var Control_Extend = require("Control.Extend");
var Data_Monoid = require("Data.Monoid");
var Conj = function (x) {
    return x;
};
var showConj = function (__dict_Show_0) {
    return new Prelude.Show(function (_304) {
        return "Conj (" + (Prelude.show(__dict_Show_0)(_304) + ")");
    });
};
var semigroupConj = function (__dict_BooleanAlgebra_1) {
    return new Prelude.Semigroup(function (_305) {
        return function (_306) {
            return Prelude.conj(__dict_BooleanAlgebra_1)(_305)(_306);
        };
    });
};
var runConj = function (_295) {
    return _295;
};
var monoidConj = function (__dict_BooleanAlgebra_3) {
    return new Data_Monoid.Monoid(function () {
        return semigroupConj(__dict_BooleanAlgebra_3);
    }, Prelude.top(__dict_BooleanAlgebra_3["__superclass_Prelude.Bounded_0"]()));
};
var functorConj = new Prelude.Functor(function (f) {
    return function (_300) {
        return f(_300);
    };
});
var extendConj = new Control_Extend.Extend(function () {
    return functorConj;
}, function (f) {
    return function (x) {
        return f(x);
    };
});
var eqConj = function (__dict_Eq_4) {
    return new Prelude.Eq(function (_296) {
        return function (_297) {
            return Prelude["=="](__dict_Eq_4)(_296)(_297);
        };
    });
};
var ordConj = function (__dict_Ord_2) {
    return new Prelude.Ord(function () {
        return eqConj(__dict_Ord_2["__superclass_Prelude.Eq_0"]());
    }, function (_298) {
        return function (_299) {
            return Prelude.compare(__dict_Ord_2)(_298)(_299);
        };
    });
};
var comonadConj = new Control_Comonad.Comonad(function () {
    return extendConj;
}, runConj);
var boundedConj = function (__dict_Bounded_5) {
    return new Prelude.Bounded(Prelude.bottom(__dict_Bounded_5), Prelude.top(__dict_Bounded_5));
};
var applyConj = new Prelude.Apply(function () {
    return functorConj;
}, function (_301) {
    return function (_302) {
        return _301(_302);
    };
});
var bindConj = new Prelude.Bind(function () {
    return applyConj;
}, function (_303) {
    return function (f) {
        return f(_303);
    };
});
var applicativeConj = new Prelude.Applicative(function () {
    return applyConj;
}, Conj);
var monadConj = new Prelude.Monad(function () {
    return applicativeConj;
}, function () {
    return bindConj;
});
module.exports = {
    Conj: Conj, 
    runConj: runConj, 
    eqConj: eqConj, 
    ordConj: ordConj, 
    boundedConj: boundedConj, 
    functorConj: functorConj, 
    applyConj: applyConj, 
    applicativeConj: applicativeConj, 
    bindConj: bindConj, 
    monadConj: monadConj, 
    extendConj: extendConj, 
    comonadConj: comonadConj, 
    showConj: showConj, 
    semigroupConj: semigroupConj, 
    monoidConj: monoidConj
};

},{"Control.Comonad":8,"Control.Extend":9,"Data.Monoid":87,"Prelude":107}],84:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Comonad = require("Control.Comonad");
var Control_Extend = require("Control.Extend");
var Data_Monoid = require("Data.Monoid");
var Disj = function (x) {
    return x;
};
var showDisj = function (__dict_Show_0) {
    return new Prelude.Show(function (_316) {
        return "Disj (" + (Prelude.show(__dict_Show_0)(_316) + ")");
    });
};
var semigroupDisj = function (__dict_BooleanAlgebra_1) {
    return new Prelude.Semigroup(function (_317) {
        return function (_318) {
            return Prelude.disj(__dict_BooleanAlgebra_1)(_317)(_318);
        };
    });
};
var runDisj = function (_307) {
    return _307;
};
var monoidDisj = function (__dict_BooleanAlgebra_3) {
    return new Data_Monoid.Monoid(function () {
        return semigroupDisj(__dict_BooleanAlgebra_3);
    }, Prelude.bottom(__dict_BooleanAlgebra_3["__superclass_Prelude.Bounded_0"]()));
};
var functorDisj = new Prelude.Functor(function (f) {
    return function (_312) {
        return f(_312);
    };
});
var extendDisj = new Control_Extend.Extend(function () {
    return functorDisj;
}, function (f) {
    return function (x) {
        return f(x);
    };
});
var eqDisj = function (__dict_Eq_4) {
    return new Prelude.Eq(function (_308) {
        return function (_309) {
            return Prelude["=="](__dict_Eq_4)(_308)(_309);
        };
    });
};
var ordDisj = function (__dict_Ord_2) {
    return new Prelude.Ord(function () {
        return eqDisj(__dict_Ord_2["__superclass_Prelude.Eq_0"]());
    }, function (_310) {
        return function (_311) {
            return Prelude.compare(__dict_Ord_2)(_310)(_311);
        };
    });
};
var comonadDisj = new Control_Comonad.Comonad(function () {
    return extendDisj;
}, runDisj);
var boundedDisj = function (__dict_Bounded_5) {
    return new Prelude.Bounded(Prelude.bottom(__dict_Bounded_5), Prelude.top(__dict_Bounded_5));
};
var applyDisj = new Prelude.Apply(function () {
    return functorDisj;
}, function (_313) {
    return function (_314) {
        return _313(_314);
    };
});
var bindDisj = new Prelude.Bind(function () {
    return applyDisj;
}, function (_315) {
    return function (f) {
        return f(_315);
    };
});
var applicativeDisj = new Prelude.Applicative(function () {
    return applyDisj;
}, Disj);
var monadDisj = new Prelude.Monad(function () {
    return applicativeDisj;
}, function () {
    return bindDisj;
});
module.exports = {
    Disj: Disj, 
    runDisj: runDisj, 
    eqDisj: eqDisj, 
    ordDisj: ordDisj, 
    boundedDisj: boundedDisj, 
    functorDisj: functorDisj, 
    applyDisj: applyDisj, 
    applicativeDisj: applicativeDisj, 
    bindDisj: bindDisj, 
    monadDisj: monadDisj, 
    extendDisj: extendDisj, 
    comonadDisj: comonadDisj, 
    showDisj: showDisj, 
    semigroupDisj: semigroupDisj, 
    monoidDisj: monoidDisj
};

},{"Control.Comonad":8,"Control.Extend":9,"Data.Monoid":87,"Prelude":107}],85:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Monoid = require("Data.Monoid");
var Control_Comonad = require("Control.Comonad");
var Control_Extend = require("Control.Extend");
var Data_Functor_Invariant = require("Data.Functor.Invariant");
var Dual = function (x) {
    return x;
};
var showDual = function (__dict_Show_0) {
    return new Prelude.Show(function (_330) {
        return "Dual (" + (Prelude.show(__dict_Show_0)(_330) + ")");
    });
};
var semigroupDual = function (__dict_Semigroup_1) {
    return new Prelude.Semigroup(function (_331) {
        return function (_332) {
            return Prelude["<>"](__dict_Semigroup_1)(_332)(_331);
        };
    });
};
var runDual = function (_319) {
    return _319;
};
var monoidDual = function (__dict_Monoid_3) {
    return new Data_Monoid.Monoid(function () {
        return semigroupDual(__dict_Monoid_3["__superclass_Prelude.Semigroup_0"]());
    }, Data_Monoid.mempty(__dict_Monoid_3));
};
var invariantDual = new Data_Functor_Invariant.Invariant(function (f) {
    return function (_328) {
        return function (_329) {
            return f(_329);
        };
    };
});
var functorDual = new Prelude.Functor(function (f) {
    return function (_324) {
        return f(_324);
    };
});
var extendDual = new Control_Extend.Extend(function () {
    return functorDual;
}, function (f) {
    return function (x) {
        return f(x);
    };
});
var eqDual = function (__dict_Eq_4) {
    return new Prelude.Eq(function (_320) {
        return function (_321) {
            return Prelude["=="](__dict_Eq_4)(_320)(_321);
        };
    });
};
var ordDual = function (__dict_Ord_2) {
    return new Prelude.Ord(function () {
        return eqDual(__dict_Ord_2["__superclass_Prelude.Eq_0"]());
    }, function (_322) {
        return function (_323) {
            return Prelude.compare(__dict_Ord_2)(_322)(_323);
        };
    });
};
var comonadDual = new Control_Comonad.Comonad(function () {
    return extendDual;
}, runDual);
var applyDual = new Prelude.Apply(function () {
    return functorDual;
}, function (_325) {
    return function (_326) {
        return _325(_326);
    };
});
var bindDual = new Prelude.Bind(function () {
    return applyDual;
}, function (_327) {
    return function (f) {
        return f(_327);
    };
});
var applicativeDual = new Prelude.Applicative(function () {
    return applyDual;
}, Dual);
var monadDual = new Prelude.Monad(function () {
    return applicativeDual;
}, function () {
    return bindDual;
});
module.exports = {
    Dual: Dual, 
    runDual: runDual, 
    eqDual: eqDual, 
    ordDual: ordDual, 
    functorDual: functorDual, 
    applyDual: applyDual, 
    applicativeDual: applicativeDual, 
    bindDual: bindDual, 
    monadDual: monadDual, 
    extendDual: extendDual, 
    comonadDual: comonadDual, 
    invariantDual: invariantDual, 
    showDual: showDual, 
    semigroupDual: semigroupDual, 
    monoidDual: monoidDual
};

},{"Control.Comonad":8,"Control.Extend":9,"Data.Functor.Invariant":71,"Data.Monoid":87,"Prelude":107}],86:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Comonad = require("Control.Comonad");
var Control_Extend = require("Control.Extend");
var Data_Functor_Invariant = require("Data.Functor.Invariant");
var Data_Monoid = require("Data.Monoid");
var Multiplicative = function (x) {
    return x;
};
var showMultiplicative = function (__dict_Show_0) {
    return new Prelude.Show(function (_344) {
        return "Multiplicative (" + (Prelude.show(__dict_Show_0)(_344) + ")");
    });
};
var semigroupMultiplicative = function (__dict_Semiring_1) {
    return new Prelude.Semigroup(function (_345) {
        return function (_346) {
            return Prelude["*"](__dict_Semiring_1)(_345)(_346);
        };
    });
};
var runMultiplicative = function (_333) {
    return _333;
};
var monoidMultiplicative = function (__dict_Semiring_3) {
    return new Data_Monoid.Monoid(function () {
        return semigroupMultiplicative(__dict_Semiring_3);
    }, Prelude.one(__dict_Semiring_3));
};
var invariantMultiplicative = new Data_Functor_Invariant.Invariant(function (f) {
    return function (_342) {
        return function (_343) {
            return f(_343);
        };
    };
});
var functorMultiplicative = new Prelude.Functor(function (f) {
    return function (_338) {
        return f(_338);
    };
});
var extendMultiplicative = new Control_Extend.Extend(function () {
    return functorMultiplicative;
}, function (f) {
    return function (x) {
        return f(x);
    };
});
var eqMultiplicative = function (__dict_Eq_4) {
    return new Prelude.Eq(function (_334) {
        return function (_335) {
            return Prelude["=="](__dict_Eq_4)(_334)(_335);
        };
    });
};
var ordMultiplicative = function (__dict_Ord_2) {
    return new Prelude.Ord(function () {
        return eqMultiplicative(__dict_Ord_2["__superclass_Prelude.Eq_0"]());
    }, function (_336) {
        return function (_337) {
            return Prelude.compare(__dict_Ord_2)(_336)(_337);
        };
    });
};
var comonadMultiplicative = new Control_Comonad.Comonad(function () {
    return extendMultiplicative;
}, runMultiplicative);
var applyMultiplicative = new Prelude.Apply(function () {
    return functorMultiplicative;
}, function (_339) {
    return function (_340) {
        return _339(_340);
    };
});
var bindMultiplicative = new Prelude.Bind(function () {
    return applyMultiplicative;
}, function (_341) {
    return function (f) {
        return f(_341);
    };
});
var applicativeMultiplicative = new Prelude.Applicative(function () {
    return applyMultiplicative;
}, Multiplicative);
var monadMultiplicative = new Prelude.Monad(function () {
    return applicativeMultiplicative;
}, function () {
    return bindMultiplicative;
});
module.exports = {
    Multiplicative: Multiplicative, 
    runMultiplicative: runMultiplicative, 
    eqMultiplicative: eqMultiplicative, 
    ordMultiplicative: ordMultiplicative, 
    functorMultiplicative: functorMultiplicative, 
    applyMultiplicative: applyMultiplicative, 
    applicativeMultiplicative: applicativeMultiplicative, 
    bindMultiplicative: bindMultiplicative, 
    monadMultiplicative: monadMultiplicative, 
    extendMultiplicative: extendMultiplicative, 
    comonadMultiplicative: comonadMultiplicative, 
    invariantMultiplicative: invariantMultiplicative, 
    showMultiplicative: showMultiplicative, 
    semigroupMultiplicative: semigroupMultiplicative, 
    monoidMultiplicative: monoidMultiplicative
};

},{"Control.Comonad":8,"Control.Extend":9,"Data.Functor.Invariant":71,"Data.Monoid":87,"Prelude":107}],87:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Monoid = function (__superclass_Prelude$dotSemigroup_0, mempty) {
    this["__superclass_Prelude.Semigroup_0"] = __superclass_Prelude$dotSemigroup_0;
    this.mempty = mempty;
};
var monoidUnit = new Monoid(function () {
    return Prelude.semigroupUnit;
}, Prelude.unit);
var monoidString = new Monoid(function () {
    return Prelude.semigroupString;
}, "");
var monoidArray = new Monoid(function () {
    return Prelude.semigroupArray;
}, [  ]);
var mempty = function (dict) {
    return dict.mempty;
};
var monoidFn = function (__dict_Monoid_0) {
    return new Monoid(function () {
        return Prelude.semigroupFn(__dict_Monoid_0["__superclass_Prelude.Semigroup_0"]());
    }, Prelude["const"](mempty(__dict_Monoid_0)));
};
module.exports = {
    Monoid: Monoid, 
    mempty: mempty, 
    monoidUnit: monoidUnit, 
    monoidFn: monoidFn, 
    monoidString: monoidString, 
    monoidArray: monoidArray
};

},{"Prelude":107}],88:[function(require,module,exports){
/* global exports */
"use strict";

// module Data.String.Unsafe

exports.charCodeAt = function (i) {
  return function (s) {
    if (i < 0 || i >= s.length) return s.charCodeAt(i);
    throw new Error("Data.String.Unsafe.charCodeAt: Invalid index.");
  };
};

exports.charAt = function (i) {
  return function (s) {
    if (i >= 0 && i < s.length) return s.charAt(i);
    throw new Error("Data.String.Unsafe.charAt: Invalid index.");
  };
};

exports["char"] = function (s) {
  if (s.length !== 1) return s.charAt(0);
  throw new Error("Data.String.Unsafe.char: Expected string of length 1.");
};

},{}],89:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Data_Char = require("Data.Char");
module.exports = {
    charCodeAt: $foreign.charCodeAt, 
    charAt: $foreign.charAt, 
    "char": $foreign["char"]
};

},{"./foreign":88,"Data.Char":49}],90:[function(require,module,exports){
/* global exports */
"use strict";

// module Data.String

exports._charAt = function (just) {
  return function (nothing) {
    return function (i) {
      return function (s) {
        return i >= 0 && i < s.length ? just(s.charAt(i)) : nothing;
      };
    };
  };
};

exports._charCodeAt = function (just) {
  return function (nothing) {
    return function (i) {
      return function (s) {
        return i >= 0 && i < s.length ? just(s.charCodeAt(i)) : nothing;
      };
    };
  };
};

exports._toChar = function (just) {
  return function (nothing) {
    return function (s) {
      return s.length === 1 ? just(s) : nothing;
    };
  };
};

exports.fromCharArray = function (a) {
  return a.join("");
};

exports._indexOf = function (just) {
  return function (nothing) {
    return function (x) {
      return function (s) {
        var i = s.indexOf(x);
        return i === -1 ? nothing : just(i);
      };
    };
  };
};

exports["_indexOf'"] = function (just) {
  return function (nothing) {
    return function (x) {
      return function (startAt) {
        return function (s) {
          var i = s.indexOf(x, startAt);
          return i === -1 ? nothing : just(i);
        };
      };
    };
  };
};

exports._lastIndexOf = function (just) {
  return function (nothing) {
    return function (x) {
      return function (s) {
        var i = s.lastIndexOf(x);
        return i === -1 ? nothing : just(i);
      };
    };
  };
};

exports["_lastIndexOf'"] = function (just) {
  return function (nothing) {
    return function (x) {
      return function (startAt) {
        return function (s) {
          var i = s.lastIndexOf(x, startAt);
          return i === -1 ? nothing : just(i);
        };
      };
    };
  };
};

exports.length = function (s) {
  return s.length;
};

exports["_localeCompare"] = function (lt) {
  return function (eq) {
    return function (gt) {
      return function (s1) {
        return function (s2) {
          var result = s1.localeCompare(s2);
          return result < 0 ? lt : result > 1 ? gt : eq;
        };
      };
    };
  };
};

exports.replace = function (s1) {
  return function (s2) {
    return function (s3) {
      return s3.replace(s1, s2);
    };
  };
};

exports.take = function (n) {
  return function (s) {
    return s.substr(0, n);
  };
};

exports.drop = function (n) {
  return function (s) {
    return s.substr(n);
  };
};

exports.split = function (sep) {
  return function (s) {
    return s.split(sep);
  };
};

exports.toCharArray = function (s) {
  return s.split("");
};

exports.toLower = function (s) {
  return s.toLowerCase();
};

exports.toUpper = function (s) {
  return s.toUpperCase();
};

exports.trim = function (s) {
  return s.trim();
};

exports.joinWith = function (s) {
  return function (xs) {
    return xs.join(s);
  };
};

},{}],91:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Data_Char = require("Data.Char");
var Prelude = require("Prelude");
var Data_String_Unsafe = require("Data.String.Unsafe");
var Data_Maybe = require("Data.Maybe");
var Data_Monoid = require("Data.Monoid");
var uncons = function (_435) {
    if (_435 === "") {
        return Data_Maybe.Nothing.value;
    };
    return new Data_Maybe.Just({
        head: Data_String_Unsafe.charAt(Prelude.zero(Prelude.semiringInt))(_435), 
        tail: $foreign.drop(Prelude.one(Prelude.semiringInt))(_435)
    });
};
var toChar = $foreign._toChar(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var takeWhile = function (p) {
    return function (s) {
        return $foreign.take($foreign.count(p)(s))(s);
    };
};
var $$null = function (s) {
    return Prelude["=="](Prelude.eqInt)($foreign.length(s))(Prelude.zero(Prelude.semiringInt));
};
var localeCompare = $foreign._localeCompare(Prelude.LT.value)(Prelude.EQ.value)(Prelude.GT.value);
var lastIndexOf$prime = $foreign["_lastIndexOf'"](Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var lastIndexOf = $foreign._lastIndexOf(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var indexOf$prime = $foreign["_indexOf'"](Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var indexOf = $foreign._indexOf(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var fromChar = Data_Char.toString;
var singleton = fromChar;
var dropWhile = function (p) {
    return function (s) {
        return $foreign.drop($foreign.count(p)(s))(s);
    };
};
var contains = function (x) {
    return function (s) {
        return Data_Maybe.isJust(indexOf(x)(s));
    };
};
var charCodeAt = $foreign._charCodeAt(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
var charAt = $foreign._charAt(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
module.exports = {
    dropWhile: dropWhile, 
    takeWhile: takeWhile, 
    localeCompare: localeCompare, 
    singleton: singleton, 
    uncons: uncons, 
    "null": $$null, 
    "lastIndexOf'": lastIndexOf$prime, 
    lastIndexOf: lastIndexOf, 
    "indexOf'": indexOf$prime, 
    indexOf: indexOf, 
    contains: contains, 
    toChar: toChar, 
    fromChar: fromChar, 
    charCodeAt: charCodeAt, 
    charAt: charAt, 
    joinWith: $foreign.joinWith, 
    trim: $foreign.trim, 
    toUpper: $foreign.toUpper, 
    toLower: $foreign.toLower, 
    toCharArray: $foreign.toCharArray, 
    split: $foreign.split, 
    drop: $foreign.drop, 
    take: $foreign.take, 
    count: $foreign.count, 
    replace: $foreign.replace, 
    length: $foreign.length, 
    fromCharArray: $foreign.fromCharArray
};

},{"./foreign":90,"Data.Char":49,"Data.Maybe":81,"Data.Monoid":87,"Data.String.Unsafe":89,"Prelude":107}],92:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Seconds = function (x) {
    return x;
};
var SecondOfMinute = function (x) {
    return x;
};
var Minutes = function (x) {
    return x;
};
var MinuteOfHour = function (x) {
    return x;
};
var Milliseconds = function (x) {
    return x;
};
var MillisecondOfSecond = function (x) {
    return x;
};
var Hours = function (x) {
    return x;
};
var HourOfDay = function (x) {
    return x;
};
var TimeValue = function (fromHours, fromMilliseconds, fromMinutes, fromSeconds, toHours, toMilliseconds, toMinutes, toSeconds) {
    this.fromHours = fromHours;
    this.fromMilliseconds = fromMilliseconds;
    this.fromMinutes = fromMinutes;
    this.fromSeconds = fromSeconds;
    this.toHours = toHours;
    this.toMilliseconds = toMilliseconds;
    this.toMinutes = toMinutes;
    this.toSeconds = toSeconds;
};
var toSeconds = function (dict) {
    return dict.toSeconds;
};
var toMinutes = function (dict) {
    return dict.toMinutes;
};
var toMilliseconds = function (dict) {
    return dict.toMilliseconds;
};
var toHours = function (dict) {
    return dict.toHours;
};
var timeValueSeconds = new TimeValue(function (_237) {
    return Prelude["*"](Prelude.semiringInt)(_237)(3600);
}, function (_239) {
    return Prelude["/"](Prelude.moduloSemiringInt)(_239)(1000);
}, function (_238) {
    return Prelude["*"](Prelude.semiringInt)(_238)(60);
}, function (n) {
    return n;
}, function (_234) {
    return Prelude["/"](Prelude.moduloSemiringInt)(_234)(3600);
}, function (_236) {
    return Prelude["*"](Prelude.semiringInt)(_236)(1000);
}, function (_235) {
    return Prelude["/"](Prelude.moduloSemiringInt)(_235)(60);
}, function (n) {
    return n;
});
var timeValueMinutes = new TimeValue(function (_231) {
    return Prelude["*"](Prelude.semiringInt)(_231)(60);
}, function (_233) {
    return Prelude["/"](Prelude.moduloSemiringInt)(_233)(60000);
}, function (n) {
    return n;
}, function (_232) {
    return Prelude["/"](Prelude.moduloSemiringInt)(_232)(60);
}, function (_228) {
    return Prelude["/"](Prelude.moduloSemiringInt)(_228)(60);
}, function (_230) {
    return Prelude["*"](Prelude.semiringInt)(_230)(60000);
}, function (n) {
    return n;
}, function (_229) {
    return Prelude["*"](Prelude.semiringInt)(_229)(60);
});
var timeValueMilliseconds = new TimeValue(function (_243) {
    return Prelude["*"](Prelude.semiringInt)(_243)(3600000);
}, function (n) {
    return n;
}, function (_244) {
    return Prelude["*"](Prelude.semiringInt)(_244)(60000);
}, function (_245) {
    return Prelude["*"](Prelude.semiringInt)(_245)(1000);
}, function (_240) {
    return Prelude["/"](Prelude.moduloSemiringInt)(_240)(3600000);
}, function (n) {
    return n;
}, function (_241) {
    return Prelude["/"](Prelude.moduloSemiringInt)(_241)(60000);
}, function (_242) {
    return Prelude["/"](Prelude.moduloSemiringInt)(_242)(1000);
});
var timeValueHours = new TimeValue(function (n) {
    return n;
}, function (_227) {
    return Prelude["/"](Prelude.moduloSemiringInt)(_227)(3600000);
}, function (_225) {
    return Prelude["/"](Prelude.moduloSemiringInt)(_225)(60);
}, function (_226) {
    return Prelude["/"](Prelude.moduloSemiringInt)(_226)(3600);
}, function (n) {
    return n;
}, function (_224) {
    return Prelude["*"](Prelude.semiringInt)(_224)(3600000);
}, function (_222) {
    return Prelude["*"](Prelude.semiringInt)(_222)(60);
}, function (_223) {
    return Prelude["*"](Prelude.semiringInt)(_223)(3600);
});
var showSeconds = new Prelude.Show(function (_202) {
    return "(Seconds " + (Prelude.show(Prelude.showInt)(_202) + ")");
});
var showMinutes = new Prelude.Show(function (_183) {
    return "(Minutes " + (Prelude.show(Prelude.showInt)(_183) + ")");
});
var showMilliseconds = new Prelude.Show(function (_221) {
    return "(Milliseconds " + (Prelude.show(Prelude.showInt)(_221) + ")");
});
var showHours = new Prelude.Show(function (_164) {
    return "(Hours " + (Prelude.show(Prelude.showInt)(_164) + ")");
});
var semiringSeconds = new Prelude.Semiring(function (_192) {
    return function (_193) {
        return Prelude["+"](Prelude.semiringInt)(_192)(_193);
    };
}, function (_194) {
    return function (_195) {
        return Prelude["*"](Prelude.semiringInt)(_194)(_195);
    };
}, 1, 0);
var semiringMinutes = new Prelude.Semiring(function (_173) {
    return function (_174) {
        return Prelude["+"](Prelude.semiringInt)(_173)(_174);
    };
}, function (_175) {
    return function (_176) {
        return Prelude["*"](Prelude.semiringInt)(_175)(_176);
    };
}, 1, 0);
var semiringMilliseconds = new Prelude.Semiring(function (_211) {
    return function (_212) {
        return Prelude["+"](Prelude.semiringInt)(_211)(_212);
    };
}, function (_213) {
    return function (_214) {
        return Prelude["*"](Prelude.semiringInt)(_213)(_214);
    };
}, 1, 0);
var semiringHours = new Prelude.Semiring(function (_154) {
    return function (_155) {
        return Prelude["+"](Prelude.semiringInt)(_154)(_155);
    };
}, function (_156) {
    return function (_157) {
        return Prelude["*"](Prelude.semiringInt)(_156)(_157);
    };
}, 1, 0);
var ringSeconds = new Prelude.Ring(function () {
    return semiringSeconds;
}, function (_196) {
    return function (_197) {
        return Prelude["-"](Prelude.ringInt)(_196)(_197);
    };
});
var ringMinutes = new Prelude.Ring(function () {
    return semiringMinutes;
}, function (_177) {
    return function (_178) {
        return Prelude["-"](Prelude.ringInt)(_177)(_178);
    };
});
var ringMilliseconds = new Prelude.Ring(function () {
    return semiringMilliseconds;
}, function (_215) {
    return function (_216) {
        return Prelude["-"](Prelude.ringInt)(_215)(_216);
    };
});
var ringHours = new Prelude.Ring(function () {
    return semiringHours;
}, function (_158) {
    return function (_159) {
        return Prelude["-"](Prelude.ringInt)(_158)(_159);
    };
});
var moduloSemiringSeconds = new Prelude.ModuloSemiring(function () {
    return semiringSeconds;
}, function (_198) {
    return function (_199) {
        return Prelude["/"](Prelude.moduloSemiringInt)(_198)(_199);
    };
}, function (_200) {
    return function (_201) {
        return 0;
    };
});
var moduloSemiringMinutes = new Prelude.ModuloSemiring(function () {
    return semiringMinutes;
}, function (_179) {
    return function (_180) {
        return Prelude["/"](Prelude.moduloSemiringInt)(_179)(_180);
    };
}, function (_181) {
    return function (_182) {
        return 0;
    };
});
var moduloSemiringMilliseconds = new Prelude.ModuloSemiring(function () {
    return semiringMilliseconds;
}, function (_217) {
    return function (_218) {
        return Prelude["/"](Prelude.moduloSemiringInt)(_217)(_218);
    };
}, function (_219) {
    return function (_220) {
        return 0;
    };
});
var moduloSemiringHours = new Prelude.ModuloSemiring(function () {
    return semiringHours;
}, function (_160) {
    return function (_161) {
        return Prelude["/"](Prelude.moduloSemiringInt)(_160)(_161);
    };
}, function (_162) {
    return function (_163) {
        return 0;
    };
});
var fromSeconds = function (dict) {
    return dict.fromSeconds;
};
var fromMinutes = function (dict) {
    return dict.fromMinutes;
};
var fromMilliseconds = function (dict) {
    return dict.fromMilliseconds;
};
var fromHours = function (dict) {
    return dict.fromHours;
};
var eqSeconds = new Prelude.Eq(function (_188) {
    return function (_189) {
        return Prelude["=="](Prelude.eqInt)(_188)(_189);
    };
});
var ordSeconds = new Prelude.Ord(function () {
    return eqSeconds;
}, function (_190) {
    return function (_191) {
        return Prelude.compare(Prelude.ordInt)(_190)(_191);
    };
});
var eqSecondOfMinute = new Prelude.Eq(function (_184) {
    return function (_185) {
        return Prelude["=="](Prelude.eqInt)(_184)(_185);
    };
});
var ordSecondOfMinute = new Prelude.Ord(function () {
    return eqSecondOfMinute;
}, function (_186) {
    return function (_187) {
        return Prelude.compare(Prelude.ordInt)(_186)(_187);
    };
});
var eqMinutes = new Prelude.Eq(function (_169) {
    return function (_170) {
        return Prelude["=="](Prelude.eqInt)(_169)(_170);
    };
});
var ordMinutes = new Prelude.Ord(function () {
    return eqMinutes;
}, function (_171) {
    return function (_172) {
        return Prelude.compare(Prelude.ordInt)(_171)(_172);
    };
});
var eqMinuteOfHour = new Prelude.Eq(function (_165) {
    return function (_166) {
        return Prelude["=="](Prelude.eqInt)(_165)(_166);
    };
});
var ordMinuteOfHour = new Prelude.Ord(function () {
    return eqMinuteOfHour;
}, function (_167) {
    return function (_168) {
        return Prelude.compare(Prelude.ordInt)(_167)(_168);
    };
});
var eqMilliseconds = new Prelude.Eq(function (_207) {
    return function (_208) {
        return Prelude["=="](Prelude.eqInt)(_207)(_208);
    };
});
var ordMilliseconds = new Prelude.Ord(function () {
    return eqMilliseconds;
}, function (_209) {
    return function (_210) {
        return Prelude.compare(Prelude.ordInt)(_209)(_210);
    };
});
var eqMillisecondOfSecond = new Prelude.Eq(function (_203) {
    return function (_204) {
        return Prelude["=="](Prelude.eqInt)(_203)(_204);
    };
});
var ordMillisecondOfSecond = new Prelude.Ord(function () {
    return eqMillisecondOfSecond;
}, function (_205) {
    return function (_206) {
        return Prelude.compare(Prelude.ordInt)(_205)(_206);
    };
});
var eqHours = new Prelude.Eq(function (_150) {
    return function (_151) {
        return Prelude["=="](Prelude.eqInt)(_150)(_151);
    };
});
var ordHours = new Prelude.Ord(function () {
    return eqHours;
}, function (_152) {
    return function (_153) {
        return Prelude.compare(Prelude.ordInt)(_152)(_153);
    };
});
var eqHourOfDay = new Prelude.Eq(function (_146) {
    return function (_147) {
        return Prelude["=="](Prelude.eqInt)(_146)(_147);
    };
});
var ordHourOfDay = new Prelude.Ord(function () {
    return eqHourOfDay;
}, function (_148) {
    return function (_149) {
        return Prelude.compare(Prelude.ordInt)(_148)(_149);
    };
});
var divisionRingSeconds = new Prelude.DivisionRing(function () {
    return moduloSemiringSeconds;
}, function () {
    return ringSeconds;
});
var numSeconds = new Prelude.Num(function () {
    return divisionRingSeconds;
});
var divisionRingMinutes = new Prelude.DivisionRing(function () {
    return moduloSemiringMinutes;
}, function () {
    return ringMinutes;
});
var numMinutes = new Prelude.Num(function () {
    return divisionRingMinutes;
});
var divisionRingMilliseconds = new Prelude.DivisionRing(function () {
    return moduloSemiringMilliseconds;
}, function () {
    return ringMilliseconds;
});
var numMilliseconds = new Prelude.Num(function () {
    return divisionRingMilliseconds;
});
var divisionRingHours = new Prelude.DivisionRing(function () {
    return moduloSemiringHours;
}, function () {
    return ringHours;
});
var numHours = new Prelude.Num(function () {
    return divisionRingHours;
});
module.exports = {
    Milliseconds: Milliseconds, 
    MillisecondOfSecond: MillisecondOfSecond, 
    Seconds: Seconds, 
    SecondOfMinute: SecondOfMinute, 
    Minutes: Minutes, 
    MinuteOfHour: MinuteOfHour, 
    Hours: Hours, 
    HourOfDay: HourOfDay, 
    TimeValue: TimeValue, 
    fromMilliseconds: fromMilliseconds, 
    fromSeconds: fromSeconds, 
    fromMinutes: fromMinutes, 
    fromHours: fromHours, 
    toMilliseconds: toMilliseconds, 
    toSeconds: toSeconds, 
    toMinutes: toMinutes, 
    toHours: toHours, 
    eqHourOfDay: eqHourOfDay, 
    ordHourOfDay: ordHourOfDay, 
    eqHours: eqHours, 
    ordHours: ordHours, 
    semiringHours: semiringHours, 
    ringHours: ringHours, 
    moduloSemiringHours: moduloSemiringHours, 
    divisionRingHours: divisionRingHours, 
    numHours: numHours, 
    showHours: showHours, 
    eqMinuteOfHour: eqMinuteOfHour, 
    ordMinuteOfHour: ordMinuteOfHour, 
    eqMinutes: eqMinutes, 
    ordMinutes: ordMinutes, 
    semiringMinutes: semiringMinutes, 
    ringMinutes: ringMinutes, 
    moduloSemiringMinutes: moduloSemiringMinutes, 
    divisionRingMinutes: divisionRingMinutes, 
    numMinutes: numMinutes, 
    showMinutes: showMinutes, 
    eqSecondOfMinute: eqSecondOfMinute, 
    ordSecondOfMinute: ordSecondOfMinute, 
    eqSeconds: eqSeconds, 
    ordSeconds: ordSeconds, 
    semiringSeconds: semiringSeconds, 
    ringSeconds: ringSeconds, 
    moduloSemiringSeconds: moduloSemiringSeconds, 
    divisionRingSeconds: divisionRingSeconds, 
    numSeconds: numSeconds, 
    showSeconds: showSeconds, 
    eqMillisecondOfSecond: eqMillisecondOfSecond, 
    ordMillisecondOfSecond: ordMillisecondOfSecond, 
    eqMilliseconds: eqMilliseconds, 
    ordMilliseconds: ordMilliseconds, 
    semiringMilliseconds: semiringMilliseconds, 
    ringMilliseconds: ringMilliseconds, 
    moduloSemiringMilliseconds: moduloSemiringMilliseconds, 
    divisionRingMilliseconds: divisionRingMilliseconds, 
    numMilliseconds: numMilliseconds, 
    showMilliseconds: showMilliseconds, 
    timeValueHours: timeValueHours, 
    timeValueMinutes: timeValueMinutes, 
    timeValueSeconds: timeValueSeconds, 
    timeValueMilliseconds: timeValueMilliseconds
};

},{"Prelude":107}],93:[function(require,module,exports){
/* global exports */
"use strict";

// module Data.Traversable

// jshint maxparams: 3

exports.traverseArrayImpl = function () {
  function Cont (fn) {
    this.fn = fn;
  }

  var emptyList = {};

  var ConsCell = function (head, tail) {
    this.head = head;
    this.tail = tail;
  };

  function consList (x) {
    return function (xs) {
      return new ConsCell(x, xs);
    };
  }

  function listToArray (list) {
    var arr = [];
    while (list !== emptyList) {
      arr.push(list.head);
      list = list.tail;
    }
    return arr;
  }

  return function (apply) {
    return function (map) {
      return function (pure) {
        return function (f) {
          var buildFrom = function (x, ys) {
            return apply(map(consList)(f(x)))(ys);
          };

          var go = function (acc, currentLen, xs) {
            if (currentLen === 0) {
              return acc;
            } else {
              var last = xs[currentLen - 1];
              return new Cont(function () {
                return go(buildFrom(last, acc), currentLen - 1, xs);
              });
            }
          };

          return function (array) {
            var result = go(pure(emptyList), array.length, array);
            while (result instanceof Cont) {
              result = result.fn();
            }

            return map(listToArray)(result);
          };
        };
      };
    };
  };
}();

},{}],94:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Data_Foldable = require("Data.Foldable");
var Data_Maybe = require("Data.Maybe");
var Data_Maybe_First = require("Data.Maybe.First");
var Data_Maybe_Last = require("Data.Maybe.Last");
var Data_Monoid_Additive = require("Data.Monoid.Additive");
var Data_Monoid_Dual = require("Data.Monoid.Dual");
var Data_Monoid_Multiplicative = require("Data.Monoid.Multiplicative");
var Data_Monoid_Disj = require("Data.Monoid.Disj");
var Data_Monoid_Conj = require("Data.Monoid.Conj");
var StateL = function (x) {
    return x;
};
var StateR = function (x) {
    return x;
};
var Traversable = function (__superclass_Data$dotFoldable$dotFoldable_1, __superclass_Prelude$dotFunctor_0, sequence, traverse) {
    this["__superclass_Data.Foldable.Foldable_1"] = __superclass_Data$dotFoldable$dotFoldable_1;
    this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
    this.sequence = sequence;
    this.traverse = traverse;
};
var traverse = function (dict) {
    return dict.traverse;
};
var traversableMultiplicative = new Traversable(function () {
    return Data_Foldable.foldableMultiplicative;
}, function () {
    return Data_Monoid_Multiplicative.functorMultiplicative;
}, function (__dict_Applicative_1) {
    return function (_453) {
        return Prelude["<$>"]((__dict_Applicative_1["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Multiplicative.Multiplicative)(_453);
    };
}, function (__dict_Applicative_0) {
    return function (f) {
        return function (_452) {
            return Prelude["<$>"]((__dict_Applicative_0["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Multiplicative.Multiplicative)(f(_452));
        };
    };
});
var traversableMaybe = new Traversable(function () {
    return Data_Foldable.foldableMaybe;
}, function () {
    return Data_Maybe.functorMaybe;
}, function (__dict_Applicative_3) {
    return function (_439) {
        if (_439 instanceof Data_Maybe.Nothing) {
            return Prelude.pure(__dict_Applicative_3)(Data_Maybe.Nothing.value);
        };
        if (_439 instanceof Data_Maybe.Just) {
            return Prelude["<$>"]((__dict_Applicative_3["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Maybe.Just.create)(_439.value0);
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-foldable-traversable/src/Data/Traversable.purs line 59, column 1 - line 65, column 1: " + [ _439.constructor.name ]);
    };
}, function (__dict_Applicative_2) {
    return function (f) {
        return function (_438) {
            if (_438 instanceof Data_Maybe.Nothing) {
                return Prelude.pure(__dict_Applicative_2)(Data_Maybe.Nothing.value);
            };
            if (_438 instanceof Data_Maybe.Just) {
                return Prelude["<$>"]((__dict_Applicative_2["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Maybe.Just.create)(f(_438.value0));
            };
            throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-foldable-traversable/src/Data/Traversable.purs line 59, column 1 - line 65, column 1: " + [ f.constructor.name, _438.constructor.name ]);
        };
    };
});
var traversableDual = new Traversable(function () {
    return Data_Foldable.foldableDual;
}, function () {
    return Data_Monoid_Dual.functorDual;
}, function (__dict_Applicative_5) {
    return function (_447) {
        return Prelude["<$>"]((__dict_Applicative_5["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Dual.Dual)(_447);
    };
}, function (__dict_Applicative_4) {
    return function (f) {
        return function (_446) {
            return Prelude["<$>"]((__dict_Applicative_4["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Dual.Dual)(f(_446));
        };
    };
});
var traversableDisj = new Traversable(function () {
    return Data_Foldable.foldableDisj;
}, function () {
    return Data_Monoid_Disj.functorDisj;
}, function (__dict_Applicative_7) {
    return function (_451) {
        return Prelude["<$>"]((__dict_Applicative_7["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Disj.Disj)(_451);
    };
}, function (__dict_Applicative_6) {
    return function (f) {
        return function (_450) {
            return Prelude["<$>"]((__dict_Applicative_6["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Disj.Disj)(f(_450));
        };
    };
});
var traversableConj = new Traversable(function () {
    return Data_Foldable.foldableConj;
}, function () {
    return Data_Monoid_Conj.functorConj;
}, function (__dict_Applicative_9) {
    return function (_449) {
        return Prelude["<$>"]((__dict_Applicative_9["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Conj.Conj)(_449);
    };
}, function (__dict_Applicative_8) {
    return function (f) {
        return function (_448) {
            return Prelude["<$>"]((__dict_Applicative_8["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Conj.Conj)(f(_448));
        };
    };
});
var traversableArray = new Traversable(function () {
    return Data_Foldable.foldableArray;
}, function () {
    return Prelude.functorArray;
}, function (__dict_Applicative_11) {
    return traverse(traversableArray)(__dict_Applicative_11)(Prelude.id(Prelude.categoryFn));
}, function (__dict_Applicative_10) {
    return $foreign.traverseArrayImpl(Prelude.apply(__dict_Applicative_10["__superclass_Prelude.Apply_0"]()))(Prelude.map((__dict_Applicative_10["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]()))(Prelude.pure(__dict_Applicative_10));
});
var traversableAdditive = new Traversable(function () {
    return Data_Foldable.foldableAdditive;
}, function () {
    return Data_Monoid_Additive.functorAdditive;
}, function (__dict_Applicative_13) {
    return function (_445) {
        return Prelude["<$>"]((__dict_Applicative_13["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Additive.Additive)(_445);
    };
}, function (__dict_Applicative_12) {
    return function (f) {
        return function (_444) {
            return Prelude["<$>"]((__dict_Applicative_12["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Additive.Additive)(f(_444));
        };
    };
});
var stateR = function (_437) {
    return _437;
};
var stateL = function (_436) {
    return _436;
};
var sequence = function (dict) {
    return dict.sequence;
};
var traversableFirst = new Traversable(function () {
    return Data_Foldable.foldableFirst;
}, function () {
    return Data_Maybe_First.functorFirst;
}, function (__dict_Applicative_15) {
    return function (_441) {
        return Prelude["<$>"]((__dict_Applicative_15["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Maybe_First.First)(sequence(traversableMaybe)(__dict_Applicative_15)(_441));
    };
}, function (__dict_Applicative_14) {
    return function (f) {
        return function (_440) {
            return Prelude["<$>"]((__dict_Applicative_14["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Maybe_First.First)(traverse(traversableMaybe)(__dict_Applicative_14)(f)(_440));
        };
    };
});
var traversableLast = new Traversable(function () {
    return Data_Foldable.foldableLast;
}, function () {
    return Data_Maybe_Last.functorLast;
}, function (__dict_Applicative_17) {
    return function (_443) {
        return Prelude["<$>"]((__dict_Applicative_17["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Maybe_Last.Last)(sequence(traversableMaybe)(__dict_Applicative_17)(_443));
    };
}, function (__dict_Applicative_16) {
    return function (f) {
        return function (_442) {
            return Prelude["<$>"]((__dict_Applicative_16["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Maybe_Last.Last)(traverse(traversableMaybe)(__dict_Applicative_16)(f)(_442));
        };
    };
});
var functorStateR = new Prelude.Functor(function (f) {
    return function (k) {
        return function (s) {
            var _1066 = stateR(k)(s);
            return {
                accum: _1066.accum, 
                value: f(_1066.value)
            };
        };
    };
});
var functorStateL = new Prelude.Functor(function (f) {
    return function (k) {
        return function (s) {
            var _1069 = stateL(k)(s);
            return {
                accum: _1069.accum, 
                value: f(_1069.value)
            };
        };
    };
});
var $$for = function (__dict_Applicative_22) {
    return function (__dict_Traversable_23) {
        return function (x) {
            return function (f) {
                return traverse(__dict_Traversable_23)(__dict_Applicative_22)(f)(x);
            };
        };
    };
};
var applyStateR = new Prelude.Apply(function () {
    return functorStateR;
}, function (f) {
    return function (x) {
        return function (s) {
            var _1072 = stateR(x)(s);
            var _1073 = stateR(f)(_1072.accum);
            return {
                accum: _1073.accum, 
                value: _1073.value(_1072.value)
            };
        };
    };
});
var applyStateL = new Prelude.Apply(function () {
    return functorStateL;
}, function (f) {
    return function (x) {
        return function (s) {
            var _1078 = stateL(f)(s);
            var _1079 = stateL(x)(_1078.accum);
            return {
                accum: _1079.accum, 
                value: _1078.value(_1079.value)
            };
        };
    };
});
var applicativeStateR = new Prelude.Applicative(function () {
    return applyStateR;
}, function (a) {
    return function (s) {
        return {
            accum: s, 
            value: a
        };
    };
});
var mapAccumR = function (__dict_Traversable_18) {
    return function (f) {
        return function (s0) {
            return function (xs) {
                return stateR(traverse(__dict_Traversable_18)(applicativeStateR)(function (a) {
                    return function (s) {
                        return f(s)(a);
                    };
                })(xs))(s0);
            };
        };
    };
};
var scanr = function (__dict_Traversable_19) {
    return function (f) {
        return function (b0) {
            return function (xs) {
                return (mapAccumR(__dict_Traversable_19)(function (b) {
                    return function (a) {
                        var b$prime = f(a)(b);
                        return {
                            accum: b$prime, 
                            value: b$prime
                        };
                    };
                })(b0)(xs)).value;
            };
        };
    };
};
var applicativeStateL = new Prelude.Applicative(function () {
    return applyStateL;
}, function (a) {
    return function (s) {
        return {
            accum: s, 
            value: a
        };
    };
});
var mapAccumL = function (__dict_Traversable_20) {
    return function (f) {
        return function (s0) {
            return function (xs) {
                return stateL(traverse(__dict_Traversable_20)(applicativeStateL)(function (a) {
                    return function (s) {
                        return f(s)(a);
                    };
                })(xs))(s0);
            };
        };
    };
};
var scanl = function (__dict_Traversable_21) {
    return function (f) {
        return function (b0) {
            return function (xs) {
                return (mapAccumL(__dict_Traversable_21)(function (b) {
                    return function (a) {
                        var b$prime = f(b)(a);
                        return {
                            accum: b$prime, 
                            value: b$prime
                        };
                    };
                })(b0)(xs)).value;
            };
        };
    };
};
module.exports = {
    Traversable: Traversable, 
    mapAccumR: mapAccumR, 
    mapAccumL: mapAccumL, 
    scanr: scanr, 
    scanl: scanl, 
    "for": $$for, 
    sequence: sequence, 
    traverse: traverse, 
    traversableArray: traversableArray, 
    traversableMaybe: traversableMaybe, 
    traversableFirst: traversableFirst, 
    traversableLast: traversableLast, 
    traversableAdditive: traversableAdditive, 
    traversableDual: traversableDual, 
    traversableConj: traversableConj, 
    traversableDisj: traversableDisj, 
    traversableMultiplicative: traversableMultiplicative
};

},{"./foreign":93,"Data.Foldable":68,"Data.Maybe":81,"Data.Maybe.First":78,"Data.Maybe.Last":79,"Data.Monoid.Additive":82,"Data.Monoid.Conj":83,"Data.Monoid.Disj":84,"Data.Monoid.Dual":85,"Data.Monoid.Multiplicative":86,"Prelude":107}],95:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Monoid = require("Data.Monoid");
var Data_Functor_Invariant = require("Data.Functor.Invariant");
var Control_Lazy = require("Control.Lazy");
var Data_Maybe_First = require("Data.Maybe.First");
var Data_Foldable = require("Data.Foldable");
var Control_Biapplicative = require("Control.Biapplicative");
var Control_Biapply = require("Control.Biapply");
var Control_Comonad = require("Control.Comonad");
var Control_Extend = require("Control.Extend");
var Data_Bifoldable = require("Data.Bifoldable");
var Data_Bifunctor = require("Data.Bifunctor");
var Data_Bitraversable = require("Data.Bitraversable");
var Data_Maybe = require("Data.Maybe");
var Data_Traversable = require("Data.Traversable");
var Tuple = (function () {
    function Tuple(value0, value1) {
        this.value0 = value0;
        this.value1 = value1;
    };
    Tuple.create = function (value0) {
        return function (value1) {
            return new Tuple(value0, value1);
        };
    };
    return Tuple;
})();
var uncurry = function (f) {
    return function (_529) {
        return f(_529.value0)(_529.value1);
    };
};
var swap = function (_530) {
    return new Tuple(_530.value1, _530.value0);
};
var snd = function (_528) {
    return _528.value1;
};
var showTuple = function (__dict_Show_2) {
    return function (__dict_Show_3) {
        return new Prelude.Show(function (_531) {
            return "Tuple (" + (Prelude.show(__dict_Show_2)(_531.value0) + (") (" + (Prelude.show(__dict_Show_3)(_531.value1) + ")")));
        });
    };
};
var semiringTuple = function (__dict_Semiring_4) {
    return function (__dict_Semiring_5) {
        return new Prelude.Semiring(function (_540) {
            return function (_541) {
                return new Tuple(Prelude.add(__dict_Semiring_4)(_540.value0)(_541.value0), Prelude.add(__dict_Semiring_5)(_540.value1)(_541.value1));
            };
        }, function (_542) {
            return function (_543) {
                return new Tuple(Prelude.mul(__dict_Semiring_4)(_542.value0)(_543.value0), Prelude.mul(__dict_Semiring_5)(_542.value1)(_543.value1));
            };
        }, new Tuple(Prelude.one(__dict_Semiring_4), Prelude.one(__dict_Semiring_5)), new Tuple(Prelude.zero(__dict_Semiring_4), Prelude.zero(__dict_Semiring_5)));
    };
};
var semigroupoidTuple = new Prelude.Semigroupoid(function (_536) {
    return function (_537) {
        return new Tuple(_537.value0, _536.value1);
    };
});
var semigroupTuple = function (__dict_Semigroup_6) {
    return function (__dict_Semigroup_7) {
        return new Prelude.Semigroup(function (_538) {
            return function (_539) {
                return new Tuple(Prelude["<>"](__dict_Semigroup_6)(_538.value0)(_539.value0), Prelude["<>"](__dict_Semigroup_7)(_538.value1)(_539.value1));
            };
        });
    };
};
var ringTuple = function (__dict_Ring_8) {
    return function (__dict_Ring_9) {
        return new Prelude.Ring(function () {
            return semiringTuple(__dict_Ring_8["__superclass_Prelude.Semiring_0"]())(__dict_Ring_9["__superclass_Prelude.Semiring_0"]());
        }, function (_548) {
            return function (_549) {
                return new Tuple(Prelude.sub(__dict_Ring_8)(_548.value0)(_549.value0), Prelude.sub(__dict_Ring_9)(_548.value1)(_549.value1));
            };
        });
    };
};
var monoidTuple = function (__dict_Monoid_14) {
    return function (__dict_Monoid_15) {
        return new Data_Monoid.Monoid(function () {
            return semigroupTuple(__dict_Monoid_14["__superclass_Prelude.Semigroup_0"]())(__dict_Monoid_15["__superclass_Prelude.Semigroup_0"]());
        }, new Tuple(Data_Monoid.mempty(__dict_Monoid_14), Data_Monoid.mempty(__dict_Monoid_15)));
    };
};
var moduloSemiringTuple = function (__dict_ModuloSemiring_17) {
    return function (__dict_ModuloSemiring_18) {
        return new Prelude.ModuloSemiring(function () {
            return semiringTuple(__dict_ModuloSemiring_17["__superclass_Prelude.Semiring_0"]())(__dict_ModuloSemiring_18["__superclass_Prelude.Semiring_0"]());
        }, function (_544) {
            return function (_545) {
                return new Tuple(Prelude.div(__dict_ModuloSemiring_17)(_544.value0)(_545.value0), Prelude.div(__dict_ModuloSemiring_18)(_544.value1)(_545.value1));
            };
        }, function (_546) {
            return function (_547) {
                return new Tuple(Prelude.mod(__dict_ModuloSemiring_17)(_546.value0)(_547.value0), Prelude.mod(__dict_ModuloSemiring_18)(_546.value1)(_547.value1));
            };
        });
    };
};
var lookup = function (__dict_Foldable_19) {
    return function (__dict_Eq_20) {
        return function (a) {
            return function (f) {
                return Data_Maybe_First.runFirst(Data_Foldable.foldMap(__dict_Foldable_19)(Data_Maybe_First.monoidFirst)(function (_526) {
                    var _1111 = Prelude["=="](__dict_Eq_20)(a)(_526.value0);
                    if (_1111) {
                        return new Data_Maybe.Just(_526.value1);
                    };
                    if (!_1111) {
                        return Data_Maybe.Nothing.value;
                    };
                    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-tuples/src/Data/Tuple.purs line 173, column 1 - line 174, column 1: " + [ _1111.constructor.name ]);
                })(f));
            };
        };
    };
};
var functorTuple = new Prelude.Functor(function (f) {
    return function (_555) {
        return new Tuple(_555.value0, f(_555.value1));
    };
});
var invariantTuple = new Data_Functor_Invariant.Invariant(Data_Functor_Invariant.imapF(functorTuple));
var fst = function (_527) {
    return _527.value0;
};
var lazyTuple = function (__dict_Lazy_21) {
    return function (__dict_Lazy_22) {
        return new Control_Lazy.Lazy(function (f) {
            return new Tuple(Control_Lazy.defer(__dict_Lazy_21)(function (_524) {
                return fst(f(Prelude.unit));
            }), Control_Lazy.defer(__dict_Lazy_22)(function (_525) {
                return snd(f(Prelude.unit));
            }));
        });
    };
};
var foldableTuple = new Data_Foldable.Foldable(function (__dict_Monoid_23) {
    return function (f) {
        return function (_565) {
            return f(_565.value1);
        };
    };
}, function (f) {
    return function (z) {
        return function (_564) {
            return f(z)(_564.value1);
        };
    };
}, function (f) {
    return function (z) {
        return function (_563) {
            return f(_563.value1)(z);
        };
    };
});
var traversableTuple = new Data_Traversable.Traversable(function () {
    return foldableTuple;
}, function () {
    return functorTuple;
}, function (__dict_Applicative_1) {
    return function (_570) {
        return Prelude["<$>"]((__dict_Applicative_1["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Tuple.create(_570.value0))(_570.value1);
    };
}, function (__dict_Applicative_0) {
    return function (f) {
        return function (_569) {
            return Prelude["<$>"]((__dict_Applicative_0["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Tuple.create(_569.value0))(f(_569.value1));
        };
    };
});
var extendTuple = new Control_Extend.Extend(function () {
    return functorTuple;
}, function (f) {
    return function (_562) {
        return new Tuple(_562.value0, f(_562));
    };
});
var eqTuple = function (__dict_Eq_24) {
    return function (__dict_Eq_25) {
        return new Prelude.Eq(function (_532) {
            return function (_533) {
                return Prelude["&&"](Prelude.booleanAlgebraBoolean)(Prelude["=="](__dict_Eq_24)(_532.value0)(_533.value0))(Prelude["=="](__dict_Eq_25)(_532.value1)(_533.value1));
            };
        });
    };
};
var ordTuple = function (__dict_Ord_10) {
    return function (__dict_Ord_11) {
        return new Prelude.Ord(function () {
            return eqTuple(__dict_Ord_10["__superclass_Prelude.Eq_0"]())(__dict_Ord_11["__superclass_Prelude.Eq_0"]());
        }, function (_534) {
            return function (_535) {
                var _1156 = Prelude.compare(__dict_Ord_10)(_534.value0)(_535.value0);
                if (_1156 instanceof Prelude.EQ) {
                    return Prelude.compare(__dict_Ord_11)(_534.value1)(_535.value1);
                };
                return _1156;
            };
        });
    };
};
var divisionRingTuple = function (__dict_DivisionRing_26) {
    return function (__dict_DivisionRing_27) {
        return new Prelude.DivisionRing(function () {
            return moduloSemiringTuple(__dict_DivisionRing_26["__superclass_Prelude.ModuloSemiring_1"]())(__dict_DivisionRing_27["__superclass_Prelude.ModuloSemiring_1"]());
        }, function () {
            return ringTuple(__dict_DivisionRing_26["__superclass_Prelude.Ring_0"]())(__dict_DivisionRing_27["__superclass_Prelude.Ring_0"]());
        });
    };
};
var numTuple = function (__dict_Num_12) {
    return function (__dict_Num_13) {
        return new Prelude.Num(function () {
            return divisionRingTuple(__dict_Num_12["__superclass_Prelude.DivisionRing_0"]())(__dict_Num_13["__superclass_Prelude.DivisionRing_0"]());
        });
    };
};
var curry = function (f) {
    return function (a) {
        return function (b) {
            return f(new Tuple(a, b));
        };
    };
};
var comonadTuple = new Control_Comonad.Comonad(function () {
    return extendTuple;
}, snd);
var boundedTuple = function (__dict_Bounded_28) {
    return function (__dict_Bounded_29) {
        return new Prelude.Bounded(new Tuple(Prelude.bottom(__dict_Bounded_28), Prelude.bottom(__dict_Bounded_29)), new Tuple(Prelude.top(__dict_Bounded_28), Prelude.top(__dict_Bounded_29)));
    };
};
var boundedOrdTuple = function (__dict_BoundedOrd_30) {
    return function (__dict_BoundedOrd_31) {
        return new Prelude.BoundedOrd(function () {
            return boundedTuple(__dict_BoundedOrd_30["__superclass_Prelude.Bounded_0"]())(__dict_BoundedOrd_31["__superclass_Prelude.Bounded_0"]());
        }, function () {
            return ordTuple(__dict_BoundedOrd_30["__superclass_Prelude.Ord_1"]())(__dict_BoundedOrd_31["__superclass_Prelude.Ord_1"]());
        });
    };
};
var booleanAlgebraTuple = function (__dict_BooleanAlgebra_32) {
    return function (__dict_BooleanAlgebra_33) {
        return new Prelude.BooleanAlgebra(function () {
            return boundedTuple(__dict_BooleanAlgebra_32["__superclass_Prelude.Bounded_0"]())(__dict_BooleanAlgebra_33["__superclass_Prelude.Bounded_0"]());
        }, function (_550) {
            return function (_551) {
                return new Tuple(Prelude.conj(__dict_BooleanAlgebra_32)(_550.value0)(_551.value0), Prelude.conj(__dict_BooleanAlgebra_33)(_550.value1)(_551.value1));
            };
        }, function (_552) {
            return function (_553) {
                return new Tuple(Prelude.disj(__dict_BooleanAlgebra_32)(_552.value0)(_553.value0), Prelude.disj(__dict_BooleanAlgebra_33)(_552.value1)(_553.value1));
            };
        }, function (_554) {
            return new Tuple(Prelude.not(__dict_BooleanAlgebra_32)(_554.value0), Prelude.not(__dict_BooleanAlgebra_33)(_554.value1));
        });
    };
};
var bifunctorTuple = new Data_Bifunctor.Bifunctor(function (f) {
    return function (g) {
        return function (_556) {
            return new Tuple(f(_556.value0), g(_556.value1));
        };
    };
});
var bifoldableTuple = new Data_Bifoldable.Bifoldable(function (__dict_Monoid_37) {
    return function (f) {
        return function (g) {
            return function (_566) {
                return Prelude["<>"](__dict_Monoid_37["__superclass_Prelude.Semigroup_0"]())(f(_566.value0))(g(_566.value1));
            };
        };
    };
}, function (f) {
    return function (g) {
        return function (z) {
            return function (_568) {
                return g(f(z)(_568.value0))(_568.value1);
            };
        };
    };
}, function (f) {
    return function (g) {
        return function (z) {
            return function (_567) {
                return f(_567.value0)(g(_567.value1)(z));
            };
        };
    };
});
var bitraversableTuple = new Data_Bitraversable.Bitraversable(function () {
    return bifoldableTuple;
}, function () {
    return bifunctorTuple;
}, function (__dict_Applicative_35) {
    return function (_572) {
        return Prelude["<*>"](__dict_Applicative_35["__superclass_Prelude.Apply_0"]())(Prelude["<$>"]((__dict_Applicative_35["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Tuple.create)(_572.value0))(_572.value1);
    };
}, function (__dict_Applicative_34) {
    return function (f) {
        return function (g) {
            return function (_571) {
                return Prelude["<*>"](__dict_Applicative_34["__superclass_Prelude.Apply_0"]())(Prelude["<$>"]((__dict_Applicative_34["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Tuple.create)(f(_571.value0)))(g(_571.value1));
            };
        };
    };
});
var biapplyTuple = new Control_Biapply.Biapply(function () {
    return bifunctorTuple;
}, function (_559) {
    return function (_560) {
        return new Tuple(_559.value0(_560.value0), _559.value1(_560.value1));
    };
});
var biapplicativeTuple = new Control_Biapplicative.Biapplicative(function () {
    return biapplyTuple;
}, Tuple.create);
var applyTuple = function (__dict_Semigroup_38) {
    return new Prelude.Apply(function () {
        return functorTuple;
    }, function (_557) {
        return function (_558) {
            return new Tuple(Prelude["<>"](__dict_Semigroup_38)(_557.value0)(_558.value0), _557.value1(_558.value1));
        };
    });
};
var bindTuple = function (__dict_Semigroup_36) {
    return new Prelude.Bind(function () {
        return applyTuple(__dict_Semigroup_36);
    }, function (_561) {
        return function (f) {
            var _1220 = f(_561.value1);
            return new Tuple(Prelude["<>"](__dict_Semigroup_36)(_561.value0)(_1220.value0), _1220.value1);
        };
    });
};
var applicativeTuple = function (__dict_Monoid_39) {
    return new Prelude.Applicative(function () {
        return applyTuple(__dict_Monoid_39["__superclass_Prelude.Semigroup_0"]());
    }, Tuple.create(Data_Monoid.mempty(__dict_Monoid_39)));
};
var monadTuple = function (__dict_Monoid_16) {
    return new Prelude.Monad(function () {
        return applicativeTuple(__dict_Monoid_16);
    }, function () {
        return bindTuple(__dict_Monoid_16["__superclass_Prelude.Semigroup_0"]());
    });
};
module.exports = {
    Tuple: Tuple, 
    lookup: lookup, 
    swap: swap, 
    uncurry: uncurry, 
    curry: curry, 
    snd: snd, 
    fst: fst, 
    showTuple: showTuple, 
    eqTuple: eqTuple, 
    ordTuple: ordTuple, 
    boundedTuple: boundedTuple, 
    boundedOrdTuple: boundedOrdTuple, 
    semigroupoidTuple: semigroupoidTuple, 
    semigroupTuple: semigroupTuple, 
    monoidTuple: monoidTuple, 
    semiringTuple: semiringTuple, 
    moduloSemiringTuple: moduloSemiringTuple, 
    ringTuple: ringTuple, 
    divisionRingTuple: divisionRingTuple, 
    numTuple: numTuple, 
    booleanAlgebraTuple: booleanAlgebraTuple, 
    functorTuple: functorTuple, 
    invariantTuple: invariantTuple, 
    bifunctorTuple: bifunctorTuple, 
    applyTuple: applyTuple, 
    biapplyTuple: biapplyTuple, 
    applicativeTuple: applicativeTuple, 
    biapplicativeTuple: biapplicativeTuple, 
    bindTuple: bindTuple, 
    monadTuple: monadTuple, 
    extendTuple: extendTuple, 
    comonadTuple: comonadTuple, 
    lazyTuple: lazyTuple, 
    foldableTuple: foldableTuple, 
    bifoldableTuple: bifoldableTuple, 
    traversableTuple: traversableTuple, 
    bitraversableTuple: bitraversableTuple
};

},{"Control.Biapplicative":6,"Control.Biapply":7,"Control.Comonad":8,"Control.Extend":9,"Control.Lazy":10,"Data.Bifoldable":45,"Data.Bifunctor":46,"Data.Bitraversable":47,"Data.Foldable":68,"Data.Functor.Invariant":71,"Data.Maybe":81,"Data.Maybe.First":78,"Data.Monoid":87,"Data.Traversable":94,"Prelude":107}],96:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Array_ST = require("Data.Array.ST");
var Prelude = require("Prelude");
var Control_Monad_ST = require("Control.Monad.ST");
var Data_Maybe = require("Data.Maybe");
var Data_Tuple = require("Data.Tuple");
var Unfoldable = function (unfoldr) {
    this.unfoldr = unfoldr;
};
var unfoldr = function (dict) {
    return dict.unfoldr;
};
var unfoldableArray = new Unfoldable(function (f) {
    return function (b) {
        return Control_Monad_Eff.runPure(Data_Array_ST.runSTArray(function __do() {
            var _75 = Data_Array_ST.emptySTArray();
            var _74 = Control_Monad_ST.newSTRef(b)();
            (function () {
                while (!(function __do() {
                    var _73 = Control_Monad_ST.readSTRef(_74)();
                    return (function () {
                        var _1100 = f(_73);
                        if (_1100 instanceof Data_Maybe.Nothing) {
                            return Prelude["return"](Control_Monad_Eff.applicativeEff)(true);
                        };
                        if (_1100 instanceof Data_Maybe.Just) {
                            return function __do() {
                                Data_Array_ST.pushSTArray(_75)(_1100.value0.value0)();
                                Control_Monad_ST.writeSTRef(_74)(_1100.value0.value1)();
                                return Prelude["return"](Control_Monad_Eff.applicativeEff)(false)();
                            };
                        };
                        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-unfoldable/src/Data/Unfoldable.purs line 28, column 1 - line 40, column 16: " + [ _1100.constructor.name ]);
                    })()();
                })()) {

                };
                return {};
            })();
            return Prelude["return"](Control_Monad_Eff.applicativeEff)(_75)();
        }));
    };
});
module.exports = {
    Unfoldable: Unfoldable, 
    unfoldr: unfoldr, 
    unfoldableArray: unfoldableArray
};

},{"Control.Monad.Eff":23,"Control.Monad.ST":32,"Data.Array.ST":42,"Data.Maybe":81,"Data.Tuple":95,"Prelude":107}],97:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Types = require("Types");
var initialCells2 = [ [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Alive.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ] ];
var initialCells = [ [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ] ];
module.exports = {
    initialCells2: initialCells2, 
    initialCells: initialCells
};

},{"Types":117}],98:[function(require,module,exports){
/* globals exports */
"use strict";

// module Global

exports.nan = NaN;

exports.isNaN = isNaN;

exports.infinity = Infinity;

exports.isFinite = isFinite;

exports.readInt = function (radix) {
  return function (n) {
    return parseInt(n, radix);
  };
};

exports.readFloat = parseFloat;

},{}],99:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
module.exports = {
    readFloat: $foreign.readFloat, 
    readInt: $foreign.readInt, 
    isFinite: $foreign.isFinite, 
    infinity: $foreign.infinity, 
    isNaN: $foreign.isNaN, 
    nan: $foreign.nan
};

},{"./foreign":98}],100:[function(require,module,exports){
/* global exports */
"use strict";

// module Graphics.Canvas

exports.getCanvasElementByIdImpl = function(id, Just, Nothing) {
    return function() {
        var el = document.getElementById(id);
        if (el && el instanceof HTMLCanvasElement) {
            return Just(el);
        } else {
            return Nothing;
        }
    };
};

exports.getContext2D = function(c) {
    return function() {
        return c.getContext('2d');
    };
};

exports.getCanvasWidth = function(canvas) {
    return function() {
        return canvas.width;
    };
};

exports.getCanvasHeight = function(canvas) {
    return function() {
        return canvas.height;
    };
};

exports.setCanvasWidth = function(width) {
    return function(canvas) {
        return function() {
            canvas.width = width;
            return canvas;
        };
    };
};

exports.setCanvasHeight = function(height) {
    return function(canvas) {
        return function() {
            canvas.height = height;
            return canvas;
        };
    };
};

exports.canvasToDataURL = function(canvas) {
    return function() {
        return canvas.toDataURL();
    };
};

exports.setLineWidth = function(width) {
    return function(ctx) {
        return function() {
            ctx.lineWidth = width;
            return ctx;
        };
    };
};

exports.setFillStyle = function(style) {
    return function(ctx) {
        return function() {
            ctx.fillStyle = style;
            return ctx;
        };
    };
};

exports.setStrokeStyle = function(style) {
    return function(ctx) {
        return function() {
            ctx.strokeStyle = style;
            return ctx;
        };
    };
};

exports.setShadowColor = function(color) {
    return function(ctx) {
        return function() {
            ctx.shadowColor = color;
            return ctx;
        };
    };
};

exports.setShadowBlur = function(blur) {
    return function(ctx) {
        return function() {
            ctx.shadowBlur = blur;
            return ctx;
        };
    };
};

exports.setShadowOffsetX = function(offsetX) {
    return function(ctx) {
        return function() {
            ctx.shadowOffsetX = offsetX;
            return ctx;
        };
    };
};

exports.setShadowOffsetY = function(offsetY) {
    return function(ctx) {
        return function() {
            ctx.shadowOffsetY = offsetY;
            return ctx;
        };
    };
};

exports.setLineCapImpl = function(cap) {
    return function(ctx) {
        return function() {
            ctx.lineCap = cap;
            return ctx;
        };
    };
};

exports.setGlobalCompositeOperationImpl = function(ctx) {
    return function(op) {
        return function() {
            ctx.globalCompositeOperation = op;
            return ctx;
        };
    };
};

exports.setGlobalAlpha = function(ctx) {
    return function(alpha) {
        return function() {
            ctx.setGlobalAlpha = alpha;
            return ctx;
        };
    };
};

exports.beginPath = function(ctx) {
    return function() {
        ctx.beginPath();
        return ctx;
    };
};

exports.stroke = function(ctx) {
    return function() {
        ctx.stroke();
        return ctx;
    };
};

exports.fill = function(ctx) {
    return function() {
        ctx.fill();
        return ctx;
    };
};

exports.clip = function(ctx) {
    return function() {
        ctx.clip();
        return ctx;
    };
};

exports.lineTo = function(ctx) {
    return function(x) {
        return function(y) {
            return function() {
                ctx.lineTo(x, y);
                return ctx;
            };
        };
    };
};

exports.moveTo = function(ctx) {
    return function(x) {
        return function(y) {
            return function() {
                ctx.moveTo(x, y);
                return ctx;
            };
        };
    };
};

exports.closePath = function(ctx) {
    return function() {
        ctx.closePath();
        return ctx;
    };
};

exports.arc = function(ctx) {
    return function(a) {
        return function() {
            ctx.arc(a.x, a.y, a.r, a.start, a.end);
            return ctx;
        };
    };
};

exports.rect = function(ctx) {
    return function(r) {
        return function() {
            ctx.rect(r.x, r.y, r.w, r.h);
            return ctx;
        };
    };
};

exports.fillRect = function(ctx) {
    return function(r) {
        return function() {
            ctx.fillRect(r.x, r.y, r.w, r.h);
            return ctx;
        };
    };
};

exports.strokeRect = function(ctx) {
    return function(r) {
        return function() {
            ctx.strokeRect(r.x, r.y, r.w, r.h);
            return ctx;
        };
    };
};

exports.scale = function(t) {
    return function(ctx) {
        return function() {
            ctx.scale(t.scaleX, t.scaleY);
            return ctx;
        };
    };
};

exports.rotate = function(angle) {
    return function(ctx) {
        return function() {
            ctx.rotate(angle);
            return ctx;
        };
    };
};

exports.translate = function(t) {
    return function(ctx) {
        return function() {
            ctx.translate(t.translateX, t.translateY);
            return ctx;
        };
    };
};

exports.transform = function(t) {
    return function(ctx) {
        return function() {
            ctx.transform(t.m11, t.m12, t.m21, t.m22, t.m31, t.m32);
            return ctx;
        };
    };
};

exports.clearRect = function(ctx) {
    return function(r) {
        return function() {
            ctx.clearRect(r.x, r.y, r.w, r.h);
            return ctx;
        };
    };
};

exports.textAlignImpl = function(ctx) {
    return function() {
        return ctx.textAlign;
    }
};

exports.setTextAlignImpl = function(ctx) {
    return function(textAlign) {
        return function() {
            ctx.textAlign = textAlign;
            return ctx;
        }
    }
};

exports.font = function(ctx) {
    return function() {
        return ctx.font;
    };
};

exports.setFont = function(fontspec) {
    return function(ctx) {
        return function() {
            ctx.font = fontspec;
            return ctx;
        };
    };
};

exports.fillText = function(ctx) {
    return function(text) {
        return function(x) {
            return function(y) {
                return function() {
                    ctx.fillText(text, x, y);
                    return ctx;
                };
            };
        };
    };
};

exports.strokeText = function(ctx) {
    return function(text) {
        return function(x) {
            return function(y) {
                return function() {
                    ctx.strokeText(text, x, y);
                    return ctx;
                };
            };
        };
    };
};

exports.measureText = function(ctx) {
    return function(text) {
        return function() {
            return ctx.measureText(text);
        };
    };
};

exports.save = function(ctx) {
    return function() {
        ctx.save();
        return ctx;
    };
};

exports.restore = function(ctx) {
    return function() {
        ctx.restore();
        return ctx;
    };
};

exports.getImageData = function(ctx) {
    return function(x) {
        return function(y) {
            return function(w) {
                return function(h) {
                    return function() {
                        return ctx.getImageData(x, y, w, h);
                    };
                };
            };
        };
    };
};

exports.putImageDataFull = function(ctx) {
    return function(image_data) {
        return function(x) {
            return function(y) {
                return function(dx) {
                    return function(dy) {
                        return function(dw) {
                            return function(dh) {
                                return function() {
                                    ctx.putImageData(image_data, x, y, dx, dy, dw, dh);
                                    return ctx;
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};

exports.putImageData = function(ctx) {
    return function(image_data) {
        return function(x) {
            return function(y) {
                return function() {
                    ctx.putImageData(image_data, x, y);
                    return ctx;
                };
            };
        };
    };
};

exports.createImageData = function(ctx) {
    return function(sw) {
        return function(sh) {
            return function() {
                return ctx.createImageData(sw, sh);
            };
        };
    };
};

exports.createImageDataCopy = function(ctx) {
    return function(image_data) {
        return function() {
            return ctx.createImageData(image_data);
        };
    };
};

exports.getImageDataWidth = function(image_data) {
    return function() {
        return image_data.width;
    };
};

exports.getImageDataHeight = function(image_data) {
    return function() {
        return image_data.height;
    };
};

exports.getImageDataPixelArray = function(image_data) {
    return function() {
        return image_data.data;
    };
};

},{}],101:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Data_Function = require("Data.Function");
var Prelude = require("Prelude");
var Data_Maybe = require("Data.Maybe");
var Control_Monad_Eff = require("Control.Monad.Eff");
var AlignLeft = (function () {
    function AlignLeft() {

    };
    AlignLeft.value = new AlignLeft();
    return AlignLeft;
})();
var AlignRight = (function () {
    function AlignRight() {

    };
    AlignRight.value = new AlignRight();
    return AlignRight;
})();
var AlignCenter = (function () {
    function AlignCenter() {

    };
    AlignCenter.value = new AlignCenter();
    return AlignCenter;
})();
var AlignStart = (function () {
    function AlignStart() {

    };
    AlignStart.value = new AlignStart();
    return AlignStart;
})();
var AlignEnd = (function () {
    function AlignEnd() {

    };
    AlignEnd.value = new AlignEnd();
    return AlignEnd;
})();
var Round = (function () {
    function Round() {

    };
    Round.value = new Round();
    return Round;
})();
var Square = (function () {
    function Square() {

    };
    Square.value = new Square();
    return Square;
})();
var Butt = (function () {
    function Butt() {

    };
    Butt.value = new Butt();
    return Butt;
})();
var SourceOver = (function () {
    function SourceOver() {

    };
    SourceOver.value = new SourceOver();
    return SourceOver;
})();
var SourceIn = (function () {
    function SourceIn() {

    };
    SourceIn.value = new SourceIn();
    return SourceIn;
})();
var SourceOut = (function () {
    function SourceOut() {

    };
    SourceOut.value = new SourceOut();
    return SourceOut;
})();
var SourceAtop = (function () {
    function SourceAtop() {

    };
    SourceAtop.value = new SourceAtop();
    return SourceAtop;
})();
var DestinationOver = (function () {
    function DestinationOver() {

    };
    DestinationOver.value = new DestinationOver();
    return DestinationOver;
})();
var DestinationIn = (function () {
    function DestinationIn() {

    };
    DestinationIn.value = new DestinationIn();
    return DestinationIn;
})();
var DestinationOut = (function () {
    function DestinationOut() {

    };
    DestinationOut.value = new DestinationOut();
    return DestinationOut;
})();
var DestinationAtop = (function () {
    function DestinationAtop() {

    };
    DestinationAtop.value = new DestinationAtop();
    return DestinationAtop;
})();
var Lighter = (function () {
    function Lighter() {

    };
    Lighter.value = new Lighter();
    return Lighter;
})();
var Copy = (function () {
    function Copy() {

    };
    Copy.value = new Copy();
    return Copy;
})();
var Xor = (function () {
    function Xor() {

    };
    Xor.value = new Xor();
    return Xor;
})();
var withContext = function (ctx) {
    return function (action) {
        return function __do() {
            $foreign.save(ctx)();
            var _90 = action();
            $foreign.restore(ctx)();
            return Prelude["return"](Control_Monad_Eff.applicativeEff)(_90)();
        };
    };
};
var textAlign = function (ctx) {
    var unsafeParseTextAlign = function (_893) {
        if (_893 === "left") {
            return AlignLeft.value;
        };
        if (_893 === "right") {
            return AlignRight.value;
        };
        if (_893 === "center") {
            return AlignCenter.value;
        };
        if (_893 === "start") {
            return AlignStart.value;
        };
        if (_893 === "end") {
            return AlignEnd.value;
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-canvas/src/Graphics/Canvas.purs line 369, column 3 - line 370, column 3: " + [ _893.constructor.name ]);
    };
    return Prelude["<$>"](Control_Monad_Eff.functorEff)(unsafeParseTextAlign)($foreign.textAlignImpl(ctx));
};
var strokePath = function (ctx) {
    return function (path) {
        return function __do() {
            $foreign.beginPath(ctx)();
            var _88 = path();
            $foreign.stroke(ctx)();
            return Prelude["return"](Control_Monad_Eff.applicativeEff)(_88)();
        };
    };
};
var showTextAlign = new Prelude.Show(function (_892) {
    if (_892 instanceof AlignLeft) {
        return "left";
    };
    if (_892 instanceof AlignRight) {
        return "right";
    };
    if (_892 instanceof AlignCenter) {
        return "center";
    };
    if (_892 instanceof AlignStart) {
        return "start";
    };
    if (_892 instanceof AlignEnd) {
        return "end";
    };
    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-canvas/src/Graphics/Canvas.purs line 356, column 1 - line 363, column 1: " + [ _892.constructor.name ]);
});
var showComposite = new Prelude.Show(function (_891) {
    if (_891 instanceof SourceOver) {
        return "source-over";
    };
    if (_891 instanceof SourceIn) {
        return "source-in";
    };
    if (_891 instanceof SourceOut) {
        return "source-out";
    };
    if (_891 instanceof SourceAtop) {
        return "source-atop";
    };
    if (_891 instanceof DestinationOver) {
        return "destination-over";
    };
    if (_891 instanceof DestinationIn) {
        return "destination-in";
    };
    if (_891 instanceof DestinationOut) {
        return "destination-out";
    };
    if (_891 instanceof DestinationAtop) {
        return "destination-atop";
    };
    if (_891 instanceof Lighter) {
        return "lighter";
    };
    if (_891 instanceof Copy) {
        return "copy";
    };
    if (_891 instanceof Xor) {
        return "xor";
    };
    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-canvas/src/Graphics/Canvas.purs line 196, column 1 - line 209, column 1: " + [ _891.constructor.name ]);
});
var setTextAlign = function (ctx) {
    return function (textAlign_1) {
        return $foreign.setTextAlignImpl(ctx)(Prelude.show(showTextAlign)(textAlign_1));
    };
};
var setLineCap = function (_890) {
    if (_890 instanceof Round) {
        return $foreign.setLineCapImpl("round");
    };
    if (_890 instanceof Square) {
        return $foreign.setLineCapImpl("square");
    };
    if (_890 instanceof Butt) {
        return $foreign.setLineCapImpl("butt");
    };
    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-canvas/src/Graphics/Canvas.purs line 177, column 1 - line 178, column 1: " + [ _890.constructor.name ]);
};
var setGlobalCompositeOperation = function (ctx) {
    return function (composite) {
        return $foreign.setGlobalCompositeOperationImpl(ctx)(Prelude.show(showComposite)(composite));
    };
};
var setCanvasDimensions = function (d) {
    return function (ce) {
        return Prelude[">>="](Control_Monad_Eff.bindEff)($foreign.setCanvasHeight(d.height)(ce))($foreign.setCanvasWidth(d.width));
    };
};
var getCanvasElementById = function (elId) {
    return $foreign.getCanvasElementByIdImpl(elId, Data_Maybe.Just.create, Data_Maybe.Nothing.value);
};
var getCanvasDimensions = function (ce) {
    return function __do() {
        var _87 = $foreign.getCanvasWidth(ce)();
        var _86 = $foreign.getCanvasHeight(ce)();
        return Prelude["return"](Control_Monad_Eff.applicativeEff)({
            width: _87, 
            height: _86
        })();
    };
};
var fillPath = function (ctx) {
    return function (path) {
        return function __do() {
            $foreign.beginPath(ctx)();
            var _89 = path();
            $foreign.fill(ctx)();
            return Prelude["return"](Control_Monad_Eff.applicativeEff)(_89)();
        };
    };
};
module.exports = {
    AlignLeft: AlignLeft, 
    AlignRight: AlignRight, 
    AlignCenter: AlignCenter, 
    AlignStart: AlignStart, 
    AlignEnd: AlignEnd, 
    Round: Round, 
    Square: Square, 
    Butt: Butt, 
    SourceOver: SourceOver, 
    SourceIn: SourceIn, 
    SourceOut: SourceOut, 
    SourceAtop: SourceAtop, 
    DestinationOver: DestinationOver, 
    DestinationIn: DestinationIn, 
    DestinationOut: DestinationOut, 
    DestinationAtop: DestinationAtop, 
    Lighter: Lighter, 
    Copy: Copy, 
    Xor: Xor, 
    withContext: withContext, 
    setTextAlign: setTextAlign, 
    textAlign: textAlign, 
    fillPath: fillPath, 
    strokePath: strokePath, 
    setGlobalCompositeOperation: setGlobalCompositeOperation, 
    setLineCap: setLineCap, 
    setCanvasDimensions: setCanvasDimensions, 
    getCanvasDimensions: getCanvasDimensions, 
    getCanvasElementById: getCanvasElementById, 
    showComposite: showComposite, 
    showTextAlign: showTextAlign, 
    createImageDataCopy: $foreign.createImageDataCopy, 
    createImageData: $foreign.createImageData, 
    putImageDataFull: $foreign.putImageDataFull, 
    putImageData: $foreign.putImageData, 
    getImageDataPixelArray: $foreign.getImageDataPixelArray, 
    getImageDataHeight: $foreign.getImageDataHeight, 
    getImageDataWidth: $foreign.getImageDataWidth, 
    getImageData: $foreign.getImageData, 
    restore: $foreign.restore, 
    save: $foreign.save, 
    measureText: $foreign.measureText, 
    strokeText: $foreign.strokeText, 
    fillText: $foreign.fillText, 
    setFont: $foreign.setFont, 
    font: $foreign.font, 
    transform: $foreign.transform, 
    translate: $foreign.translate, 
    rotate: $foreign.rotate, 
    scale: $foreign.scale, 
    clearRect: $foreign.clearRect, 
    strokeRect: $foreign.strokeRect, 
    fillRect: $foreign.fillRect, 
    rect: $foreign.rect, 
    arc: $foreign.arc, 
    closePath: $foreign.closePath, 
    moveTo: $foreign.moveTo, 
    lineTo: $foreign.lineTo, 
    clip: $foreign.clip, 
    fill: $foreign.fill, 
    stroke: $foreign.stroke, 
    beginPath: $foreign.beginPath, 
    setGlobalAlpha: $foreign.setGlobalAlpha, 
    setShadowColor: $foreign.setShadowColor, 
    setShadowOffsetY: $foreign.setShadowOffsetY, 
    setShadowOffsetX: $foreign.setShadowOffsetX, 
    setShadowBlur: $foreign.setShadowBlur, 
    setStrokeStyle: $foreign.setStrokeStyle, 
    setFillStyle: $foreign.setFillStyle, 
    setLineWidth: $foreign.setLineWidth, 
    canvasToDataURL: $foreign.canvasToDataURL, 
    setCanvasHeight: $foreign.setCanvasHeight, 
    getCanvasHeight: $foreign.getCanvasHeight, 
    setCanvasWidth: $foreign.setCanvasWidth, 
    getCanvasWidth: $foreign.getCanvasWidth, 
    getContext2D: $foreign.getContext2D
};

},{"./foreign":100,"Control.Monad.Eff":23,"Data.Function":70,"Data.Maybe":81,"Prelude":107}],102:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Utils = require("Utils");
var Insert = (function () {
    function Insert() {

    };
    Insert.value = new Insert();
    return Insert;
})();
var Escape = (function () {
    function Escape() {

    };
    Escape.value = new Escape();
    return Escape;
})();
var Enter = (function () {
    function Enter() {

    };
    Enter.value = new Enter();
    return Enter;
})();
var Delete = (function () {
    function Delete() {

    };
    Delete.value = new Delete();
    return Delete;
})();
var F1 = (function () {
    function F1() {

    };
    F1.value = new F1();
    return F1;
})();
var F2 = (function () {
    function F2() {

    };
    F2.value = new F2();
    return F2;
})();
var F3 = (function () {
    function F3() {

    };
    F3.value = new F3();
    return F3;
})();
var F4 = (function () {
    function F4() {

    };
    F4.value = new F4();
    return F4;
})();
var F5 = (function () {
    function F5() {

    };
    F5.value = new F5();
    return F5;
})();
var Space = (function () {
    function Space() {

    };
    Space.value = new Space();
    return Space;
})();
var LeftArrow = (function () {
    function LeftArrow() {

    };
    LeftArrow.value = new LeftArrow();
    return LeftArrow;
})();
var RightArrow = (function () {
    function RightArrow() {

    };
    RightArrow.value = new RightArrow();
    return RightArrow;
})();
var Rsmall = (function () {
    function Rsmall() {

    };
    Rsmall.value = new Rsmall();
    return Rsmall;
})();
var Rbig = (function () {
    function Rbig() {

    };
    Rbig.value = new Rbig();
    return Rbig;
})();
var UnknownKey = (function () {
    function UnknownKey(value0) {
        this.value0 = value0;
    };
    UnknownKey.create = function (value0) {
        return new UnknownKey(value0);
    };
    return UnknownKey;
})();
var keyEventToKeyCode = function (x) {
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(13)) {
        return Enter.value;
    };
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(27)) {
        return Escape.value;
    };
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(45)) {
        return Insert.value;
    };
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(46)) {
        return Delete.value;
    };
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(112)) {
        return F1.value;
    };
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(113)) {
        return F2.value;
    };
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(114)) {
        return F3.value;
    };
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(115)) {
        return F4.value;
    };
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(116)) {
        return F5.value;
    };
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(32)) {
        return Space.value;
    };
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(37)) {
        return LeftArrow.value;
    };
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(39)) {
        return RightArrow.value;
    };
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(114)) {
        return Rsmall.value;
    };
    if (Prelude["=="](Prelude.eqInt)(Utils.which(x))(82)) {
        return Rbig.value;
    };
    return UnknownKey.create(Utils.which(x));
};
var eqKeyCode = new Prelude.Eq(function (_34) {
    return function (_35) {
        if (_34 instanceof Insert && _35 instanceof Insert) {
            return true;
        };
        if (_34 instanceof Escape && _35 instanceof Escape) {
            return true;
        };
        if (_34 instanceof Enter && _35 instanceof Enter) {
            return true;
        };
        if (_34 instanceof Delete && _35 instanceof Delete) {
            return true;
        };
        if (_34 instanceof F1 && _35 instanceof F1) {
            return true;
        };
        if (_34 instanceof F2 && _35 instanceof F2) {
            return true;
        };
        if (_34 instanceof F3 && _35 instanceof F3) {
            return true;
        };
        if (_34 instanceof F4 && _35 instanceof F4) {
            return true;
        };
        if (_34 instanceof F5 && _35 instanceof F5) {
            return true;
        };
        if (_34 instanceof Space && _35 instanceof Space) {
            return true;
        };
        if (_34 instanceof LeftArrow && _35 instanceof LeftArrow) {
            return true;
        };
        if (_34 instanceof RightArrow && _35 instanceof RightArrow) {
            return true;
        };
        if (_34 instanceof Rbig && _35 instanceof Rbig) {
            return true;
        };
        if (_34 instanceof Rsmall && _35 instanceof Rsmall) {
            return true;
        };
        return false;
    };
});
module.exports = {
    Insert: Insert, 
    Escape: Escape, 
    Enter: Enter, 
    Delete: Delete, 
    F1: F1, 
    F2: F2, 
    F3: F3, 
    F4: F4, 
    F5: F5, 
    Space: Space, 
    LeftArrow: LeftArrow, 
    RightArrow: RightArrow, 
    Rsmall: Rsmall, 
    Rbig: Rbig, 
    UnknownKey: UnknownKey, 
    keyEventToKeyCode: keyEventToKeyCode, 
    eqKeyCode: eqKeyCode
};

},{"Prelude":107,"Utils":125}],103:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var UI_React = require("UI.React");
var UI_Canvas = require("UI.Canvas");
var UI_Console = require("UI.Console");
var Prelude = require("Prelude");
var Utils = require("Utils");
var Core = require("Core");
var Data_Function = require("Data.Function");
var Control_Alt = require("Control.Alt");
var Control_Apply = require("Control.Apply");
var KeyCodes = require("KeyCodes");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Maybe = require("Data.Maybe");
var Rx_Observable = require("Rx.Observable");
var Types = require("Types");
var main = (function () {
    var timerStream = Prelude["<$>"](Rx_Observable.functorObservable)(function (_34) {
        return Types.Timer.value;
    })(Utils.getIntervalStream(1000.0));
    var ticksStream = Prelude["<$>"](Rx_Observable.functorObservable)(function (_35) {
        return Types.Tick.value;
    })(Utils.getIntervalStream(Core.initialSpeed));
    var ticksPlayPauseStream = Utils.newSubject();
    var processState = Core.processStateFactory(ticksPlayPauseStream);
    var pausableTicksStream = Utils.pausable(ticksStream)(ticksPlayPauseStream);
    var keyToAction = function (_36) {
        if (_36 instanceof KeyCodes.Space) {
            return new Data_Maybe.Just(Types.Toggle.value);
        };
        if (_36 instanceof KeyCodes.LeftArrow) {
            return Data_Maybe.Just.create(new Types.Rewind(1));
        };
        if (_36 instanceof KeyCodes.RightArrow) {
            return Data_Maybe.Just.create(new Types.FForward(1));
        };
        if (_36 instanceof KeyCodes.Rsmall) {
            return Data_Maybe.Just.create(Types.RandomGen.value);
        };
        if (_36 instanceof KeyCodes.Rbig) {
            return Data_Maybe.Just.create(Types.RandomGen.value);
        };
        return Data_Maybe.Nothing.value;
    };
    var actionsStream = Utils.newSubject();
    var jointActionsStream = Control_Alt["<|>"](Rx_Observable.altObservable)(Control_Alt["<|>"](Rx_Observable.altObservable)(pausableTicksStream)(actionsStream))(timerStream);
    var keyCommand = function (key) {
        var _41 = keyToAction(key);
        if (_41 instanceof Data_Maybe.Just) {
            return Utils.onNext(actionsStream)(_41.value0);
        };
        if (_41 instanceof Data_Maybe.Nothing) {
            return Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude.unit);
        };
        throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Main.purs line 20, column 1 - line 72, column 27: " + [ _41.constructor.name ]);
    };
    var setupUI = function (ui) {
        return function (placeholderId) {
            return function (initialState) {
                return function (stateStream) {
                    return Prelude["void"](Control_Monad_Eff.functorEff)(function __do() {
                        var _9 = ui(initialState)(actionsStream)(placeholderId)();
                        return Rx_Observable.subscribe(stateStream)(Utils.onNext(_9))();
                    });
                };
            };
        };
    };
    var setupCanvas = setupUI(UI_Canvas.setupUI)("canvas");
    var setupConsole = setupUI(UI_Console.setupUI)("");
    var setupReact = setupUI(UI_React.setupUI)("root_layout");
    return function __do() {
        var _13 = Utils.getParameterByName("ui")();
        var _12 = Core.getInitialState();
        var _11 = Utils.scan(processState)(_12)(jointActionsStream)();
        (function () {
            if (_13 === "react") {
                return setupReact(_12)(_11);
            };
            if (_13 === "canvas") {
                return setupCanvas(_12)(_11);
            };
            if (_13 === "console") {
                return setupConsole(_12)(_11);
            };
            if (_13 === "react_canvas") {
                return Control_Apply["*>"](Control_Monad_Eff.applyEff)(setupReact(_12)(_11))(setupCanvas(_12)(_11));
            };
            return setupCanvas(_12)(_11);
        })()();
        var _10 = Utils.fromEvent("keyup")();
        Rx_Observable.subscribe(Prelude["<$>"](Rx_Observable.functorObservable)(KeyCodes.keyEventToKeyCode)(_10))(keyCommand)();
        return Utils.onNext(ticksPlayPauseStream)(true)();
    };
})();
module.exports = {
    main: main
};

},{"Control.Alt":3,"Control.Apply":5,"Control.Monad.Eff":23,"Core":39,"Data.Function":70,"Data.Maybe":81,"KeyCodes":102,"Prelude":107,"Rx.Observable":116,"Types":117,"UI.Canvas":119,"UI.Console":121,"UI.React":123,"Utils":125}],104:[function(require,module,exports){
/* global exports */
"use strict";

// module Math

exports.abs = Math.abs;

exports.acos = Math.acos;

exports.asin = Math.asin;

exports.atan = Math.atan;

exports.atan2 = function (y) {
  return function (x) {
    return Math.atan2(y, x);
  };
};

exports.ceil = Math.ceil;

exports.cos = Math.cos;

exports.exp = Math.exp;

exports.floor = Math.floor;

exports.log = Math.log;

exports.max = function (n1) {
  return function (n2) {
    return Math.max(n1, n2);
  };
};

exports.min = function (n1) {
  return function (n2) {
    return Math.min(n1, n2);
  };
};

exports.pow = function (n) {
  return function (p) {
    return Math.pow(n, p);
  };
};

exports["%"] = function(n) {
  return function(m) {
    return n % m;
  };
};

exports.round = Math.round;

exports.sin = Math.sin;

exports.sqrt = Math.sqrt;

exports.tan = Math.tan;

exports.e = Math.E;

exports.ln2 = Math.LN2;

exports.ln10 = Math.LN10;

exports.log2e = Math.LOG2E;

exports.log10e = Math.LOG10E;

exports.pi = Math.PI;

exports.sqrt1_2 = Math.SQRT1_2;

exports.sqrt2 = Math.SQRT2;

},{}],105:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
module.exports = {
    sqrt2: $foreign.sqrt2, 
    sqrt1_2: $foreign.sqrt1_2, 
    pi: $foreign.pi, 
    log10e: $foreign.log10e, 
    log2e: $foreign.log2e, 
    ln10: $foreign.ln10, 
    ln2: $foreign.ln2, 
    e: $foreign.e, 
    "%": $foreign["%"], 
    tan: $foreign.tan, 
    sqrt: $foreign.sqrt, 
    sin: $foreign.sin, 
    round: $foreign.round, 
    pow: $foreign.pow, 
    min: $foreign.min, 
    max: $foreign.max, 
    log: $foreign.log, 
    floor: $foreign.floor, 
    exp: $foreign.exp, 
    cos: $foreign.cos, 
    ceil: $foreign.ceil, 
    atan2: $foreign.atan2, 
    atan: $foreign.atan, 
    asin: $foreign.asin, 
    acos: $foreign.acos, 
    abs: $foreign.abs
};

},{"./foreign":104}],106:[function(require,module,exports){
/* global exports */
"use strict";

// module Prelude

//- Functor --------------------------------------------------------------------

exports.arrayMap = function (f) {
  return function (arr) {
    var l = arr.length;
    var result = new Array(l);
    for (var i = 0; i < l; i++) {
      result[i] = f(arr[i]);
    }
    return result;
  };
};

//- Bind -----------------------------------------------------------------------

exports.arrayBind = function (arr) {
  return function (f) {
    var result = [];
    for (var i = 0, l = arr.length; i < l; i++) {
      Array.prototype.push.apply(result, f(arr[i]));
    }
    return result;
  };
};

//- Monoid ---------------------------------------------------------------------

exports.concatString = function (s1) {
  return function (s2) {
    return s1 + s2;
  };
};

exports.concatArray = function (xs) {
  return function (ys) {
    return xs.concat(ys);
  };
};

//- Semiring -------------------------------------------------------------------

exports.intAdd = function (x) {
  return function (y) {
    /* jshint bitwise: false */
    return x + y | 0;
  };
};

exports.intMul = function (x) {
  return function (y) {
    /* jshint bitwise: false */
    return x * y | 0;
  };
};

exports.numAdd = function (n1) {
  return function (n2) {
    return n1 + n2;
  };
};

exports.numMul = function (n1) {
  return function (n2) {
    return n1 * n2;
  };
};

//- ModuloSemiring -------------------------------------------------------------

exports.intDiv = function (x) {
  return function (y) {
    /* jshint bitwise: false */
    return x / y | 0;
  };
};

exports.intMod = function (x) {
  return function (y) {
    return x % y;
  };
};

exports.numDiv = function (n1) {
  return function (n2) {
    return n1 / n2;
  };
};

//- Ring -----------------------------------------------------------------------

exports.intSub = function (x) {
  return function (y) {
    /* jshint bitwise: false */
    return x - y | 0;
  };
};

exports.numSub = function (n1) {
  return function (n2) {
    return n1 - n2;
  };
};

//- Eq -------------------------------------------------------------------------

exports.refEq = function (r1) {
  return function (r2) {
    return r1 === r2;
  };
};

exports.refIneq = function (r1) {
  return function (r2) {
    return r1 !== r2;
  };
};

exports.eqArrayImpl = function (f) {
  return function (xs) {
    return function (ys) {
      if (xs.length !== ys.length) return false;
      for (var i = 0; i < xs.length; i++) {
        if (!f(xs[i])(ys[i])) return false;
      }
      return true;
    };
  };
};

exports.ordArrayImpl = function (f) {
  return function (xs) {
    return function (ys) {
      var i = 0;
      var xlen = xs.length;
      var ylen = ys.length;
      while (i < xlen && i < ylen) {
        var x = xs[i];
        var y = ys[i];
        var o = f(x)(y);
        if (o !== 0) {
          return o;
        }
        i++;
      }
      if (xlen === ylen) {
        return 0;
      } else if (xlen > ylen) {
        return -1;
      } else {
        return 1;
      }
    };
  };
};

//- Ord ------------------------------------------------------------------------

exports.unsafeCompareImpl = function (lt) {
  return function (eq) {
    return function (gt) {
      return function (x) {
        return function (y) {
          return x < y ? lt : x > y ? gt : eq;
        };
      };
    };
  };
};

//- Lattice --------------------------------------------------------------------

exports.boolOr = function (b1) {
  return function (b2) {
    return b1 || b2;
  };
};

exports.boolAnd = function (b1) {
  return function (b2) {
    return b1 && b2;
  };
};

//- ComplementedLattice --------------------------------------------------------

exports.boolNot = function (b) {
  return !b;
};

//- Show -----------------------------------------------------------------------

exports.showIntImpl = function (n) {
  return n.toString();
};

exports.showNumberImpl = function (n) {
  /* jshint bitwise: false */
  return n === (n | 0) ? n + ".0" : n.toString();
};

exports.showCharImpl = function (c) {
  return c === "'" ? "'\\''" : "'" + c + "'";
};

exports.showStringImpl = function (s) {
  return JSON.stringify(s);
};

exports.showArrayImpl = function (f) {
  return function (xs) {
    var ss = [];
    for (var i = 0, l = xs.length; i < l; i++) {
      ss[i] = f(xs[i]);
    }
    return "[" + ss.join(",") + "]";
  };
};

},{}],107:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Unit = function (x) {
    return x;
};
var LT = (function () {
    function LT() {

    };
    LT.value = new LT();
    return LT;
})();
var GT = (function () {
    function GT() {

    };
    GT.value = new GT();
    return GT;
})();
var EQ = (function () {
    function EQ() {

    };
    EQ.value = new EQ();
    return EQ;
})();
var Semigroupoid = function (compose) {
    this.compose = compose;
};
var Category = function (__superclass_Prelude$dotSemigroupoid_0, id) {
    this["__superclass_Prelude.Semigroupoid_0"] = __superclass_Prelude$dotSemigroupoid_0;
    this.id = id;
};
var Functor = function (map) {
    this.map = map;
};
var Apply = function (__superclass_Prelude$dotFunctor_0, apply) {
    this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
    this.apply = apply;
};
var Applicative = function (__superclass_Prelude$dotApply_0, pure) {
    this["__superclass_Prelude.Apply_0"] = __superclass_Prelude$dotApply_0;
    this.pure = pure;
};
var Bind = function (__superclass_Prelude$dotApply_0, bind) {
    this["__superclass_Prelude.Apply_0"] = __superclass_Prelude$dotApply_0;
    this.bind = bind;
};
var Monad = function (__superclass_Prelude$dotApplicative_0, __superclass_Prelude$dotBind_1) {
    this["__superclass_Prelude.Applicative_0"] = __superclass_Prelude$dotApplicative_0;
    this["__superclass_Prelude.Bind_1"] = __superclass_Prelude$dotBind_1;
};
var Semigroup = function (append) {
    this.append = append;
};
var Semiring = function (add, mul, one, zero) {
    this.add = add;
    this.mul = mul;
    this.one = one;
    this.zero = zero;
};
var Ring = function (__superclass_Prelude$dotSemiring_0, sub) {
    this["__superclass_Prelude.Semiring_0"] = __superclass_Prelude$dotSemiring_0;
    this.sub = sub;
};
var ModuloSemiring = function (__superclass_Prelude$dotSemiring_0, div, mod) {
    this["__superclass_Prelude.Semiring_0"] = __superclass_Prelude$dotSemiring_0;
    this.div = div;
    this.mod = mod;
};
var DivisionRing = function (__superclass_Prelude$dotModuloSemiring_1, __superclass_Prelude$dotRing_0) {
    this["__superclass_Prelude.ModuloSemiring_1"] = __superclass_Prelude$dotModuloSemiring_1;
    this["__superclass_Prelude.Ring_0"] = __superclass_Prelude$dotRing_0;
};
var Num = function (__superclass_Prelude$dotDivisionRing_0) {
    this["__superclass_Prelude.DivisionRing_0"] = __superclass_Prelude$dotDivisionRing_0;
};
var Eq = function (eq) {
    this.eq = eq;
};
var Ord = function (__superclass_Prelude$dotEq_0, compare) {
    this["__superclass_Prelude.Eq_0"] = __superclass_Prelude$dotEq_0;
    this.compare = compare;
};
var Bounded = function (bottom, top) {
    this.bottom = bottom;
    this.top = top;
};
var BoundedOrd = function (__superclass_Prelude$dotBounded_0, __superclass_Prelude$dotOrd_1) {
    this["__superclass_Prelude.Bounded_0"] = __superclass_Prelude$dotBounded_0;
    this["__superclass_Prelude.Ord_1"] = __superclass_Prelude$dotOrd_1;
};
var BooleanAlgebra = function (__superclass_Prelude$dotBounded_0, conj, disj, not) {
    this["__superclass_Prelude.Bounded_0"] = __superclass_Prelude$dotBounded_0;
    this.conj = conj;
    this.disj = disj;
    this.not = not;
};
var Show = function (show) {
    this.show = show;
};
var $dollar = function (f) {
    return function (x) {
        return f(x);
    };
};
var $hash = function (x) {
    return function (f) {
        return f(x);
    };
};
var zero = function (dict) {
    return dict.zero;
};
var unsafeCompare = $foreign.unsafeCompareImpl(LT.value)(EQ.value)(GT.value);
var unit = {};
var top = function (dict) {
    return dict.top;
};
var sub = function (dict) {
    return dict.sub;
};
var $minus = function (__dict_Ring_0) {
    return sub(__dict_Ring_0);
};
var showUnit = new Show(function (_144) {
    return "unit";
});
var showString = new Show($foreign.showStringImpl);
var showOrdering = new Show(function (_145) {
    if (_145 instanceof LT) {
        return "LT";
    };
    if (_145 instanceof GT) {
        return "GT";
    };
    if (_145 instanceof EQ) {
        return "EQ";
    };
    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-prelude/src/Prelude.purs line 850, column 1 - line 855, column 1: " + [ _145.constructor.name ]);
});
var showNumber = new Show($foreign.showNumberImpl);
var showInt = new Show($foreign.showIntImpl);
var showChar = new Show($foreign.showCharImpl);
var showBoolean = new Show(function (_143) {
    if (_143) {
        return "true";
    };
    if (!_143) {
        return "false";
    };
    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-prelude/src/Prelude.purs line 828, column 1 - line 832, column 1: " + [ _143.constructor.name ]);
});
var show = function (dict) {
    return dict.show;
};
var showArray = function (__dict_Show_1) {
    return new Show($foreign.showArrayImpl(show(__dict_Show_1)));
};
var semiringUnit = new Semiring(function (_116) {
    return function (_117) {
        return unit;
    };
}, function (_118) {
    return function (_119) {
        return unit;
    };
}, unit, unit);
var semiringNumber = new Semiring($foreign.numAdd, $foreign.numMul, 1.0, 0.0);
var semiringInt = new Semiring($foreign.intAdd, $foreign.intMul, 1, 0);
var semigroupoidFn = new Semigroupoid(function (f) {
    return function (g) {
        return function (x) {
            return f(g(x));
        };
    };
});
var semigroupUnit = new Semigroup(function (_113) {
    return function (_114) {
        return unit;
    };
});
var semigroupString = new Semigroup($foreign.concatString);
var semigroupOrdering = new Semigroup(function (_115) {
    return function (y) {
        if (_115 instanceof LT) {
            return LT.value;
        };
        if (_115 instanceof GT) {
            return GT.value;
        };
        if (_115 instanceof EQ) {
            return y;
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-prelude/src/Prelude.purs line 412, column 1 - line 417, column 1: " + [ _115.constructor.name, y.constructor.name ]);
    };
});
var semigroupArray = new Semigroup($foreign.concatArray);
var ringUnit = new Ring(function () {
    return semiringUnit;
}, function (_120) {
    return function (_121) {
        return unit;
    };
});
var ringNumber = new Ring(function () {
    return semiringNumber;
}, $foreign.numSub);
var ringInt = new Ring(function () {
    return semiringInt;
}, $foreign.intSub);
var pure = function (dict) {
    return dict.pure;
};
var $$return = function (__dict_Applicative_2) {
    return pure(__dict_Applicative_2);
};
var otherwise = true;
var one = function (dict) {
    return dict.one;
};
var not = function (dict) {
    return dict.not;
};
var negate = function (__dict_Ring_3) {
    return function (a) {
        return $minus(__dict_Ring_3)(zero(__dict_Ring_3["__superclass_Prelude.Semiring_0"]()))(a);
    };
};
var mul = function (dict) {
    return dict.mul;
};
var $times = function (__dict_Semiring_4) {
    return mul(__dict_Semiring_4);
};
var moduloSemiringUnit = new ModuloSemiring(function () {
    return semiringUnit;
}, function (_124) {
    return function (_125) {
        return unit;
    };
}, function (_126) {
    return function (_127) {
        return unit;
    };
});
var moduloSemiringNumber = new ModuloSemiring(function () {
    return semiringNumber;
}, $foreign.numDiv, function (_122) {
    return function (_123) {
        return 0.0;
    };
});
var moduloSemiringInt = new ModuloSemiring(function () {
    return semiringInt;
}, $foreign.intDiv, $foreign.intMod);
var mod = function (dict) {
    return dict.mod;
};
var map = function (dict) {
    return dict.map;
};
var $less$dollar$greater = function (__dict_Functor_5) {
    return map(__dict_Functor_5);
};
var $less$hash$greater = function (__dict_Functor_6) {
    return function (fa) {
        return function (f) {
            return $less$dollar$greater(__dict_Functor_6)(f)(fa);
        };
    };
};
var id = function (dict) {
    return dict.id;
};
var functorArray = new Functor($foreign.arrayMap);
var flip = function (f) {
    return function (b) {
        return function (a) {
            return f(a)(b);
        };
    };
};
var eqUnit = new Eq(function (_128) {
    return function (_129) {
        return true;
    };
});
var ordUnit = new Ord(function () {
    return eqUnit;
}, function (_132) {
    return function (_133) {
        return EQ.value;
    };
});
var eqString = new Eq($foreign.refEq);
var ordString = new Ord(function () {
    return eqString;
}, unsafeCompare);
var eqOrdering = new Eq(function (_130) {
    return function (_131) {
        if (_130 instanceof LT && _131 instanceof LT) {
            return true;
        };
        if (_130 instanceof GT && _131 instanceof GT) {
            return true;
        };
        if (_130 instanceof EQ && _131 instanceof EQ) {
            return true;
        };
        return false;
    };
});
var ordOrdering = new Ord(function () {
    return eqOrdering;
}, function (_134) {
    return function (_135) {
        if (_134 instanceof LT && _135 instanceof LT) {
            return EQ.value;
        };
        if (_134 instanceof EQ && _135 instanceof EQ) {
            return EQ.value;
        };
        if (_134 instanceof GT && _135 instanceof GT) {
            return EQ.value;
        };
        if (_134 instanceof LT) {
            return LT.value;
        };
        if (_134 instanceof EQ && _135 instanceof LT) {
            return GT.value;
        };
        if (_134 instanceof EQ && _135 instanceof GT) {
            return LT.value;
        };
        if (_134 instanceof GT) {
            return GT.value;
        };
        throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-prelude/src/Prelude.purs line 667, column 1 - line 676, column 1: " + [ _134.constructor.name, _135.constructor.name ]);
    };
});
var eqNumber = new Eq($foreign.refEq);
var ordNumber = new Ord(function () {
    return eqNumber;
}, unsafeCompare);
var eqInt = new Eq($foreign.refEq);
var ordInt = new Ord(function () {
    return eqInt;
}, unsafeCompare);
var eqChar = new Eq($foreign.refEq);
var ordChar = new Ord(function () {
    return eqChar;
}, unsafeCompare);
var eqBoolean = new Eq($foreign.refEq);
var ordBoolean = new Ord(function () {
    return eqBoolean;
}, unsafeCompare);
var eq = function (dict) {
    return dict.eq;
};
var $eq$eq = function (__dict_Eq_7) {
    return eq(__dict_Eq_7);
};
var eqArray = function (__dict_Eq_8) {
    return new Eq($foreign.eqArrayImpl($eq$eq(__dict_Eq_8)));
};
var divisionRingUnit = new DivisionRing(function () {
    return moduloSemiringUnit;
}, function () {
    return ringUnit;
});
var numUnit = new Num(function () {
    return divisionRingUnit;
});
var divisionRingNumber = new DivisionRing(function () {
    return moduloSemiringNumber;
}, function () {
    return ringNumber;
});
var numNumber = new Num(function () {
    return divisionRingNumber;
});
var div = function (dict) {
    return dict.div;
};
var $div = function (__dict_ModuloSemiring_10) {
    return div(__dict_ModuloSemiring_10);
};
var disj = function (dict) {
    return dict.disj;
};
var $bar$bar = function (__dict_BooleanAlgebra_11) {
    return disj(__dict_BooleanAlgebra_11);
};
var $$const = function (a) {
    return function (_111) {
        return a;
    };
};
var $$void = function (__dict_Functor_12) {
    return function (fa) {
        return $less$dollar$greater(__dict_Functor_12)($$const(unit))(fa);
    };
};
var conj = function (dict) {
    return dict.conj;
};
var $amp$amp = function (__dict_BooleanAlgebra_13) {
    return conj(__dict_BooleanAlgebra_13);
};
var compose = function (dict) {
    return dict.compose;
};
var functorFn = new Functor(compose(semigroupoidFn));
var $less$less$less = function (__dict_Semigroupoid_14) {
    return compose(__dict_Semigroupoid_14);
};
var $greater$greater$greater = function (__dict_Semigroupoid_15) {
    return flip(compose(__dict_Semigroupoid_15));
};
var compare = function (dict) {
    return dict.compare;
};
var ordArray = function (__dict_Ord_16) {
    return new Ord(function () {
        return eqArray(__dict_Ord_16["__superclass_Prelude.Eq_0"]());
    }, function (xs) {
        return function (ys) {
            return $dollar(compare(ordInt)(0))($foreign.ordArrayImpl(function (x) {
                return function (y) {
                    var _965 = compare(__dict_Ord_16)(x)(y);
                    if (_965 instanceof EQ) {
                        return 0;
                    };
                    if (_965 instanceof LT) {
                        return 1;
                    };
                    if (_965 instanceof GT) {
                        return negate(ringInt)(1);
                    };
                    throw new Error("Failed pattern match at /home/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-prelude/src/Prelude.purs line 659, column 1 - line 665, column 1: " + [ _965.constructor.name ]);
                };
            })(xs)(ys));
        };
    });
};
var $less = function (__dict_Ord_17) {
    return function (a1) {
        return function (a2) {
            var _966 = compare(__dict_Ord_17)(a1)(a2);
            if (_966 instanceof LT) {
                return true;
            };
            return false;
        };
    };
};
var $less$eq = function (__dict_Ord_18) {
    return function (a1) {
        return function (a2) {
            var _967 = compare(__dict_Ord_18)(a1)(a2);
            if (_967 instanceof GT) {
                return false;
            };
            return true;
        };
    };
};
var $greater = function (__dict_Ord_19) {
    return function (a1) {
        return function (a2) {
            var _968 = compare(__dict_Ord_19)(a1)(a2);
            if (_968 instanceof GT) {
                return true;
            };
            return false;
        };
    };
};
var $greater$eq = function (__dict_Ord_20) {
    return function (a1) {
        return function (a2) {
            var _969 = compare(__dict_Ord_20)(a1)(a2);
            if (_969 instanceof LT) {
                return false;
            };
            return true;
        };
    };
};
var categoryFn = new Category(function () {
    return semigroupoidFn;
}, function (x) {
    return x;
});
var boundedUnit = new Bounded(unit, unit);
var boundedOrdering = new Bounded(LT.value, GT.value);
var boundedOrdUnit = new BoundedOrd(function () {
    return boundedUnit;
}, function () {
    return ordUnit;
});
var boundedOrdOrdering = new BoundedOrd(function () {
    return boundedOrdering;
}, function () {
    return ordOrdering;
});
var boundedInt = new Bounded(negate(ringInt)(2147483648), 2147483647);
var boundedOrdInt = new BoundedOrd(function () {
    return boundedInt;
}, function () {
    return ordInt;
});
var boundedBoolean = new Bounded(false, true);
var boundedOrdBoolean = new BoundedOrd(function () {
    return boundedBoolean;
}, function () {
    return ordBoolean;
});
var bottom = function (dict) {
    return dict.bottom;
};
var boundedFn = function (__dict_Bounded_21) {
    return new Bounded(function (_137) {
        return bottom(__dict_Bounded_21);
    }, function (_136) {
        return top(__dict_Bounded_21);
    });
};
var booleanAlgebraUnit = new BooleanAlgebra(function () {
    return boundedUnit;
}, function (_138) {
    return function (_139) {
        return unit;
    };
}, function (_140) {
    return function (_141) {
        return unit;
    };
}, function (_142) {
    return unit;
});
var booleanAlgebraFn = function (__dict_BooleanAlgebra_22) {
    return new BooleanAlgebra(function () {
        return boundedFn(__dict_BooleanAlgebra_22["__superclass_Prelude.Bounded_0"]());
    }, function (fx) {
        return function (fy) {
            return function (a) {
                return conj(__dict_BooleanAlgebra_22)(fx(a))(fy(a));
            };
        };
    }, function (fx) {
        return function (fy) {
            return function (a) {
                return disj(__dict_BooleanAlgebra_22)(fx(a))(fy(a));
            };
        };
    }, function (fx) {
        return function (a) {
            return not(__dict_BooleanAlgebra_22)(fx(a));
        };
    });
};
var booleanAlgebraBoolean = new BooleanAlgebra(function () {
    return boundedBoolean;
}, $foreign.boolAnd, $foreign.boolOr, $foreign.boolNot);
var $div$eq = function (__dict_Eq_9) {
    return function (x) {
        return function (y) {
            return not(booleanAlgebraBoolean)($eq$eq(__dict_Eq_9)(x)(y));
        };
    };
};
var bind = function (dict) {
    return dict.bind;
};
var liftM1 = function (__dict_Monad_23) {
    return function (f) {
        return function (a) {
            return bind(__dict_Monad_23["__superclass_Prelude.Bind_1"]())(a)(function (_15) {
                return $$return(__dict_Monad_23["__superclass_Prelude.Applicative_0"]())(f(_15));
            });
        };
    };
};
var $greater$greater$eq = function (__dict_Bind_24) {
    return bind(__dict_Bind_24);
};
var asTypeOf = function (x) {
    return function (_112) {
        return x;
    };
};
var applyFn = new Apply(function () {
    return functorFn;
}, function (f) {
    return function (g) {
        return function (x) {
            return f(x)(g(x));
        };
    };
});
var bindFn = new Bind(function () {
    return applyFn;
}, function (m) {
    return function (f) {
        return function (x) {
            return f(m(x))(x);
        };
    };
});
var apply = function (dict) {
    return dict.apply;
};
var $less$times$greater = function (__dict_Apply_25) {
    return apply(__dict_Apply_25);
};
var liftA1 = function (__dict_Applicative_26) {
    return function (f) {
        return function (a) {
            return $less$times$greater(__dict_Applicative_26["__superclass_Prelude.Apply_0"]())(pure(__dict_Applicative_26)(f))(a);
        };
    };
};
var applicativeFn = new Applicative(function () {
    return applyFn;
}, $$const);
var monadFn = new Monad(function () {
    return applicativeFn;
}, function () {
    return bindFn;
});
var append = function (dict) {
    return dict.append;
};
var $plus$plus = function (__dict_Semigroup_27) {
    return append(__dict_Semigroup_27);
};
var $less$greater = function (__dict_Semigroup_28) {
    return append(__dict_Semigroup_28);
};
var semigroupFn = function (__dict_Semigroup_29) {
    return new Semigroup(function (f) {
        return function (g) {
            return function (x) {
                return $less$greater(__dict_Semigroup_29)(f(x))(g(x));
            };
        };
    });
};
var ap = function (__dict_Monad_30) {
    return function (f) {
        return function (a) {
            return bind(__dict_Monad_30["__superclass_Prelude.Bind_1"]())(f)(function (_17) {
                return bind(__dict_Monad_30["__superclass_Prelude.Bind_1"]())(a)(function (_16) {
                    return $$return(__dict_Monad_30["__superclass_Prelude.Applicative_0"]())(_17(_16));
                });
            });
        };
    };
};
var monadArray = new Monad(function () {
    return applicativeArray;
}, function () {
    return bindArray;
});
var bindArray = new Bind(function () {
    return applyArray;
}, $foreign.arrayBind);
var applyArray = new Apply(function () {
    return functorArray;
}, ap(monadArray));
var applicativeArray = new Applicative(function () {
    return applyArray;
}, function (x) {
    return [ x ];
});
var add = function (dict) {
    return dict.add;
};
var $plus = function (__dict_Semiring_31) {
    return add(__dict_Semiring_31);
};
module.exports = {
    LT: LT, 
    GT: GT, 
    EQ: EQ, 
    Show: Show, 
    BooleanAlgebra: BooleanAlgebra, 
    BoundedOrd: BoundedOrd, 
    Bounded: Bounded, 
    Ord: Ord, 
    Eq: Eq, 
    DivisionRing: DivisionRing, 
    Num: Num, 
    Ring: Ring, 
    ModuloSemiring: ModuloSemiring, 
    Semiring: Semiring, 
    Semigroup: Semigroup, 
    Monad: Monad, 
    Bind: Bind, 
    Applicative: Applicative, 
    Apply: Apply, 
    Functor: Functor, 
    Category: Category, 
    Semigroupoid: Semigroupoid, 
    show: show, 
    "||": $bar$bar, 
    "&&": $amp$amp, 
    not: not, 
    disj: disj, 
    conj: conj, 
    bottom: bottom, 
    top: top, 
    ">=": $greater$eq, 
    "<=": $less$eq, 
    ">": $greater, 
    "<": $less, 
    compare: compare, 
    "/=": $div$eq, 
    "==": $eq$eq, 
    eq: eq, 
    "-": $minus, 
    negate: negate, 
    sub: sub, 
    "/": $div, 
    mod: mod, 
    div: div, 
    "*": $times, 
    "+": $plus, 
    one: one, 
    mul: mul, 
    zero: zero, 
    add: add, 
    "++": $plus$plus, 
    "<>": $less$greater, 
    append: append, 
    ap: ap, 
    liftM1: liftM1, 
    "return": $$return, 
    ">>=": $greater$greater$eq, 
    bind: bind, 
    liftA1: liftA1, 
    pure: pure, 
    "<*>": $less$times$greater, 
    apply: apply, 
    "void": $$void, 
    "<#>": $less$hash$greater, 
    "<$>": $less$dollar$greater, 
    map: map, 
    id: id, 
    ">>>": $greater$greater$greater, 
    "<<<": $less$less$less, 
    compose: compose, 
    otherwise: otherwise, 
    asTypeOf: asTypeOf, 
    "const": $$const, 
    flip: flip, 
    "#": $hash, 
    "$": $dollar, 
    unit: unit, 
    semigroupoidFn: semigroupoidFn, 
    categoryFn: categoryFn, 
    functorFn: functorFn, 
    functorArray: functorArray, 
    applyFn: applyFn, 
    applyArray: applyArray, 
    applicativeFn: applicativeFn, 
    applicativeArray: applicativeArray, 
    bindFn: bindFn, 
    bindArray: bindArray, 
    monadFn: monadFn, 
    monadArray: monadArray, 
    semigroupString: semigroupString, 
    semigroupUnit: semigroupUnit, 
    semigroupFn: semigroupFn, 
    semigroupOrdering: semigroupOrdering, 
    semigroupArray: semigroupArray, 
    semiringInt: semiringInt, 
    semiringNumber: semiringNumber, 
    semiringUnit: semiringUnit, 
    ringInt: ringInt, 
    ringNumber: ringNumber, 
    ringUnit: ringUnit, 
    moduloSemiringInt: moduloSemiringInt, 
    moduloSemiringNumber: moduloSemiringNumber, 
    moduloSemiringUnit: moduloSemiringUnit, 
    divisionRingNumber: divisionRingNumber, 
    divisionRingUnit: divisionRingUnit, 
    numNumber: numNumber, 
    numUnit: numUnit, 
    eqBoolean: eqBoolean, 
    eqInt: eqInt, 
    eqNumber: eqNumber, 
    eqChar: eqChar, 
    eqString: eqString, 
    eqUnit: eqUnit, 
    eqArray: eqArray, 
    eqOrdering: eqOrdering, 
    ordBoolean: ordBoolean, 
    ordInt: ordInt, 
    ordNumber: ordNumber, 
    ordString: ordString, 
    ordChar: ordChar, 
    ordUnit: ordUnit, 
    ordArray: ordArray, 
    ordOrdering: ordOrdering, 
    boundedBoolean: boundedBoolean, 
    boundedUnit: boundedUnit, 
    boundedOrdering: boundedOrdering, 
    boundedInt: boundedInt, 
    boundedFn: boundedFn, 
    boundedOrdBoolean: boundedOrdBoolean, 
    boundedOrdUnit: boundedOrdUnit, 
    boundedOrdOrdering: boundedOrdOrdering, 
    boundedOrdInt: boundedOrdInt, 
    booleanAlgebraBoolean: booleanAlgebraBoolean, 
    booleanAlgebraUnit: booleanAlgebraUnit, 
    booleanAlgebraFn: booleanAlgebraFn, 
    showBoolean: showBoolean, 
    showInt: showInt, 
    showNumber: showNumber, 
    showChar: showChar, 
    showString: showString, 
    showUnit: showUnit, 
    showArray: showArray, 
    showOrdering: showOrdering
};

},{"./foreign":106}],108:[function(require,module,exports){
/* global exports */
"use strict";

// module React.DOM.Props

exports.unsafeMkProps = function(key) {
    return function(value) {
        var result = {};
        result[key] = value;
        return result;
    };
};

exports.unsafeUnfoldProps = function(key) {
    return function(value) {
        var result = {};

        for (var subprop in value) {
            if (value.hasOwnProperty(subprop)) {
                result[key + '-' + subprop] = value[subprop];
            }
        }

        return result;
    };
};

},{}],109:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var React = require("React");
var Prelude = require("Prelude");
var wmode = $foreign.unsafeMkProps("wmode");
var width = $foreign.unsafeMkProps("width");
var value = $foreign.unsafeMkProps("value");
var useMap = $foreign.unsafeMkProps("useMap");
var title = $foreign.unsafeMkProps("title");
var target = $foreign.unsafeMkProps("target");
var tabIndex = $foreign.unsafeMkProps("tabIndex");
var style = $foreign.unsafeUnfoldProps("style");
var step = $foreign.unsafeMkProps("step");
var start = $foreign.unsafeMkProps("start");
var srcSet = $foreign.unsafeMkProps("srcSet");
var srcDoc = $foreign.unsafeMkProps("srcDoc");
var src = $foreign.unsafeMkProps("src");
var spellCheck = $foreign.unsafeMkProps("spellCheck");
var span = $foreign.unsafeMkProps("span");
var sizes = $foreign.unsafeMkProps("sizes");
var size = $foreign.unsafeMkProps("size");
var shape = $foreign.unsafeMkProps("shape");
var selected = $foreign.unsafeMkProps("selected");
var seamless = $foreign.unsafeMkProps("seamless");
var scrolling = $foreign.unsafeMkProps("scrolling");
var scope = $foreign.unsafeMkProps("scope");
var sandbox = $foreign.unsafeMkProps("sandbox");
var rows = $foreign.unsafeMkProps("rows");
var rowSpan = $foreign.unsafeMkProps("rowSpan");
var role = $foreign.unsafeMkProps("role");
var required = $foreign.unsafeMkProps("required");
var rel = $foreign.unsafeMkProps("rel");
var readOnly = $foreign.unsafeMkProps("readOnly");
var radioGroup = $foreign.unsafeMkProps("radioGroup");
var preload = $foreign.unsafeMkProps("preload");
var poster = $foreign.unsafeMkProps("poster");
var placeholder = $foreign.unsafeMkProps("placeholder");
var pattern = $foreign.unsafeMkProps("pattern");
var open = $foreign.unsafeMkProps("open");
var onWheel = function (f) {
    return $foreign.unsafeMkProps("onWheel")(React.handle(f));
};
var onTouchStart = function (f) {
    return $foreign.unsafeMkProps("onTouchStart")(React.handle(f));
};
var onTouchMove = function (f) {
    return $foreign.unsafeMkProps("onTouchMove")(React.handle(f));
};
var onTouchEnd = function (f) {
    return $foreign.unsafeMkProps("onTouchEnd")(React.handle(f));
};
var onTouchCancel = function (f) {
    return $foreign.unsafeMkProps("onTouchCancel")(React.handle(f));
};
var onSubmit = function (f) {
    return $foreign.unsafeMkProps("onSubmit")(React.handle(f));
};
var onScroll = function (f) {
    return $foreign.unsafeMkProps("onScroll")(React.handle(f));
};
var onPaste = function (f) {
    return $foreign.unsafeMkProps("onPaste")(React.handle(f));
};
var onMouseUp = function (f) {
    return $foreign.unsafeMkProps("onMouseUp")(React.handle(f));
};
var onMouseOver = function (f) {
    return $foreign.unsafeMkProps("onMouseOver")(React.handle(f));
};
var onMouseOut = function (f) {
    return $foreign.unsafeMkProps("onMouseOut")(React.handle(f));
};
var onMouseMove = function (f) {
    return $foreign.unsafeMkProps("onMouseMove")(React.handle(f));
};
var onMouseLeave = function (f) {
    return $foreign.unsafeMkProps("onMouseLeave")(React.handle(f));
};
var onMouseEnter = function (f) {
    return $foreign.unsafeMkProps("onMouseEnter")(React.handle(f));
};
var onMouseDown = function (f) {
    return $foreign.unsafeMkProps("onMouseDown")(React.handle(f));
};
var onKeyUp = function (f) {
    return $foreign.unsafeMkProps("onKeyUp")(React.handle(f));
};
var onKeyPress = function (f) {
    return $foreign.unsafeMkProps("onKeyPress")(React.handle(f));
};
var onKeyDown = function (f) {
    return $foreign.unsafeMkProps("onKeyDown")(React.handle(f));
};
var onInput = function (f) {
    return $foreign.unsafeMkProps("onInput")(React.handle(f));
};
var onFocus = function (f) {
    return $foreign.unsafeMkProps("onFocus")(React.handle(f));
};
var onDrop = function (f) {
    return $foreign.unsafeMkProps("onDrop")(React.handle(f));
};
var onDragStart = function (f) {
    return $foreign.unsafeMkProps("onDragStart")(React.handle(f));
};
var onDragOver = function (f) {
    return $foreign.unsafeMkProps("onDragOver")(React.handle(f));
};
var onDragLeave = function (f) {
    return $foreign.unsafeMkProps("onDragLeave")(React.handle(f));
};
var onDragExit = function (f) {
    return $foreign.unsafeMkProps("onDragExit")(React.handle(f));
};
var onDragEnter = function (f) {
    return $foreign.unsafeMkProps("onDragEnter")(React.handle(f));
};
var onDragEnd = function (f) {
    return $foreign.unsafeMkProps("onDragEnd")(React.handle(f));
};
var onDrag = function (f) {
    return $foreign.unsafeMkProps("onDrag")(React.handle(f));
};
var onDoubleClick = function (f) {
    return $foreign.unsafeMkProps("onDoubleClick")(React.handle(f));
};
var onCut = function (f) {
    return $foreign.unsafeMkProps("onCut")(React.handle(f));
};
var onCopy = function (f) {
    return $foreign.unsafeMkProps("onCopy")(React.handle(f));
};
var onClick = function (f) {
    return $foreign.unsafeMkProps("onClick")(React.handle(f));
};
var onChange = function (f) {
    return $foreign.unsafeMkProps("onChange")(React.handle(f));
};
var onBlur = function (f) {
    return $foreign.unsafeMkProps("onBlur")(React.handle(f));
};
var noValidate = $foreign.unsafeMkProps("noValidate");
var name = $foreign.unsafeMkProps("name");
var muted = $foreign.unsafeMkProps("muted");
var multiple = $foreign.unsafeMkProps("multiple");
var min = $foreign.unsafeMkProps("min");
var method = $foreign.unsafeMkProps("method");
var mediaGroup = $foreign.unsafeMkProps("mediaGroup");
var media = $foreign.unsafeMkProps("media");
var maxLength = $foreign.unsafeMkProps("maxLength");
var max = $foreign.unsafeMkProps("max");
var marginWidth = $foreign.unsafeMkProps("marginWidth");
var marginHeight = $foreign.unsafeMkProps("marginHeight");
var manifest = $foreign.unsafeMkProps("manifest");
var loop = $foreign.unsafeMkProps("loop");
var list = $foreign.unsafeMkProps("list");
var lang = $foreign.unsafeMkProps("lang");
var label = $foreign.unsafeMkProps("label");
var key = $foreign.unsafeMkProps("key");
var icon = $foreign.unsafeMkProps("icon");
var httpEquiv = $foreign.unsafeMkProps("httpEquiv");
var htmlFor = $foreign.unsafeMkProps("htmlFor");
var hrefLang = $foreign.unsafeMkProps("hrefLang");
var href = $foreign.unsafeMkProps("href");
var hidden = $foreign.unsafeMkProps("hidden");
var height = $foreign.unsafeMkProps("height");
var frameBorder = $foreign.unsafeMkProps("frameBorder");
var formTarget = $foreign.unsafeMkProps("formTarget");
var formNoValidate = $foreign.unsafeMkProps("formNoValidate");
var formMethod = $foreign.unsafeMkProps("formMethod");
var formEncType = $foreign.unsafeMkProps("formEncType");
var formAction = $foreign.unsafeMkProps("formAction");
var form = $foreign.unsafeMkProps("form");
var encType = $foreign.unsafeMkProps("encType");
var draggable = $foreign.unsafeMkProps("draggable");
var download = $foreign.unsafeMkProps("download");
var disabled = $foreign.unsafeMkProps("disabled");
var dir = $foreign.unsafeMkProps("dir");
var defer = $foreign.unsafeMkProps("defer");
var dateTime = $foreign.unsafeMkProps("dateTime");
var dangerouslySetInnerHTML = $foreign.unsafeMkProps("dangerouslySetInnerHTML");
var crossOrigin = $foreign.unsafeMkProps("crossOrigin");
var coords = $foreign.unsafeMkProps("coords");
var controls = $foreign.unsafeMkProps("controls");
var contextMenu = $foreign.unsafeMkProps("contextMenu");
var contentEditable = $foreign.unsafeMkProps("contentEditable");
var content = $foreign.unsafeMkProps("content");
var cols = $foreign.unsafeMkProps("cols");
var colSpan = $foreign.unsafeMkProps("colSpan");
var className = $foreign.unsafeMkProps("className");
var classID = $foreign.unsafeMkProps("classID");
var checked = $foreign.unsafeMkProps("checked");
var charSet = $foreign.unsafeMkProps("charSet");
var cellSpacing = $foreign.unsafeMkProps("cellSpacing");
var cellPadding = $foreign.unsafeMkProps("cellPadding");
var autoPlay = $foreign.unsafeMkProps("autoPlay");
var autoFocus = $foreign.unsafeMkProps("autoFocus");
var autoComplete = $foreign.unsafeMkProps("autoComplete");
var async = $foreign.unsafeMkProps("async");
var aria = $foreign.unsafeUnfoldProps("aria");
var alt = $foreign.unsafeMkProps("alt");
var allowTransparency = $foreign.unsafeMkProps("allowTransparency");
var allowFullScreen = $foreign.unsafeMkProps("allowFullScreen");
var action = $foreign.unsafeMkProps("action");
var accessKey = $foreign.unsafeMkProps("accessKey");
var acceptCharset = $foreign.unsafeMkProps("acceptCharset");
var accept = $foreign.unsafeMkProps("accept");
var _type = $foreign.unsafeMkProps("type");
var _id = $foreign.unsafeMkProps("id");
var _data = $foreign.unsafeUnfoldProps("data");
module.exports = {
    onWheel: onWheel, 
    onScroll: onScroll, 
    onTouchStart: onTouchStart, 
    onTouchMove: onTouchMove, 
    onTouchEnd: onTouchEnd, 
    onTouchCancel: onTouchCancel, 
    onMouseUp: onMouseUp, 
    onMouseOver: onMouseOver, 
    onMouseOut: onMouseOut, 
    onMouseMove: onMouseMove, 
    onMouseLeave: onMouseLeave, 
    onMouseEnter: onMouseEnter, 
    onMouseDown: onMouseDown, 
    onDrop: onDrop, 
    onDragStart: onDragStart, 
    onDragOver: onDragOver, 
    onDragLeave: onDragLeave, 
    onDragExit: onDragExit, 
    onDragEnter: onDragEnter, 
    onDragEnd: onDragEnd, 
    onDrag: onDrag, 
    onDoubleClick: onDoubleClick, 
    onClick: onClick, 
    onSubmit: onSubmit, 
    onInput: onInput, 
    onChange: onChange, 
    onBlur: onBlur, 
    onFocus: onFocus, 
    onKeyUp: onKeyUp, 
    onKeyPress: onKeyPress, 
    onKeyDown: onKeyDown, 
    onPaste: onPaste, 
    onCut: onCut, 
    onCopy: onCopy, 
    wmode: wmode, 
    width: width, 
    value: value, 
    useMap: useMap, 
    _type: _type, 
    title: title, 
    target: target, 
    tabIndex: tabIndex, 
    step: step, 
    start: start, 
    srcSet: srcSet, 
    srcDoc: srcDoc, 
    src: src, 
    spellCheck: spellCheck, 
    span: span, 
    sizes: sizes, 
    size: size, 
    shape: shape, 
    selected: selected, 
    seamless: seamless, 
    scrolling: scrolling, 
    scope: scope, 
    sandbox: sandbox, 
    rowSpan: rowSpan, 
    rows: rows, 
    role: role, 
    required: required, 
    rel: rel, 
    readOnly: readOnly, 
    radioGroup: radioGroup, 
    preload: preload, 
    poster: poster, 
    placeholder: placeholder, 
    pattern: pattern, 
    open: open, 
    noValidate: noValidate, 
    name: name, 
    muted: muted, 
    multiple: multiple, 
    min: min, 
    method: method, 
    mediaGroup: mediaGroup, 
    media: media, 
    maxLength: maxLength, 
    max: max, 
    marginWidth: marginWidth, 
    marginHeight: marginHeight, 
    manifest: manifest, 
    loop: loop, 
    list: list, 
    lang: lang, 
    label: label, 
    key: key, 
    _id: _id, 
    icon: icon, 
    httpEquiv: httpEquiv, 
    htmlFor: htmlFor, 
    hrefLang: hrefLang, 
    href: href, 
    hidden: hidden, 
    height: height, 
    frameBorder: frameBorder, 
    formTarget: formTarget, 
    formNoValidate: formNoValidate, 
    formMethod: formMethod, 
    formEncType: formEncType, 
    formAction: formAction, 
    form: form, 
    encType: encType, 
    draggable: draggable, 
    download: download, 
    disabled: disabled, 
    dir: dir, 
    defer: defer, 
    dateTime: dateTime, 
    crossOrigin: crossOrigin, 
    coords: coords, 
    controls: controls, 
    contextMenu: contextMenu, 
    contentEditable: contentEditable, 
    content: content, 
    colSpan: colSpan, 
    cols: cols, 
    className: className, 
    classID: classID, 
    checked: checked, 
    charSet: charSet, 
    cellSpacing: cellSpacing, 
    cellPadding: cellPadding, 
    autoPlay: autoPlay, 
    autoFocus: autoFocus, 
    autoComplete: autoComplete, 
    async: async, 
    alt: alt, 
    allowTransparency: allowTransparency, 
    allowFullScreen: allowFullScreen, 
    action: action, 
    accessKey: accessKey, 
    acceptCharset: acceptCharset, 
    accept: accept, 
    dangerouslySetInnerHTML: dangerouslySetInnerHTML, 
    style: style, 
    _data: _data, 
    aria: aria, 
    unsafeUnfoldProps: $foreign.unsafeUnfoldProps, 
    unsafeMkProps: $foreign.unsafeMkProps
};

},{"./foreign":108,"Prelude":107,"React":113}],110:[function(require,module,exports){
/* global exports */
"use strict";

// module React.DOM

function mkProps(props) {
    var result = {};
    
    for (var i = 0, len = props.length; i < len; i++) {
        var prop = props[i];
        
        for (var key in prop) {
            if (prop.hasOwnProperty(key)) {
                result[key] = prop[key];
            }
        }
    }
    
    return result;
};

exports.mkDOM = function(tagName) {
    return function(props) {
        return function(children) {
            return React.createElement(tagName, props.length > 0 ? mkProps(props) : null, children);
        }
    }
};

exports.text = function(text) {
    return text;
};

},{}],111:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var React = require("React");
var React_DOM_Props = require("React.DOM.Props");
var wbr = $foreign.mkDOM("body");
var wbr$prime = wbr([  ]);
var video = $foreign.mkDOM("video");
var video$prime = video([  ]);
var $$var = $foreign.mkDOM("var");
var var$prime = $$var([  ]);
var ul = $foreign.mkDOM("ul");
var ul$prime = ul([  ]);
var u = $foreign.mkDOM("u");
var u$prime = u([  ]);
var track = $foreign.mkDOM("track");
var track$prime = track([  ]);
var tr = $foreign.mkDOM("tr");
var tr$prime = tr([  ]);
var title = $foreign.mkDOM("title");
var title$prime = title([  ]);
var time = $foreign.mkDOM("time");
var time$prime = time([  ]);
var thead = $foreign.mkDOM("thead");
var thead$prime = thead([  ]);
var th = $foreign.mkDOM("th");
var th$prime = th([  ]);
var tfoot = $foreign.mkDOM("tfoot");
var tfoot$prime = tfoot([  ]);
var textarea = $foreign.mkDOM("textarea");
var textarea$prime = textarea([  ]);
var td = $foreign.mkDOM("td");
var td$prime = td([  ]);
var tbody = $foreign.mkDOM("tbody");
var tbody$prime = tbody([  ]);
var table = $foreign.mkDOM("table");
var table$prime = table([  ]);
var sup = $foreign.mkDOM("sup");
var sup$prime = sup([  ]);
var summary = $foreign.mkDOM("summary");
var summary$prime = summary([  ]);
var sub = $foreign.mkDOM("sub");
var sub$prime = sub([  ]);
var style = $foreign.mkDOM("style");
var style$prime = style([  ]);
var strong = $foreign.mkDOM("strong");
var strong$prime = strong([  ]);
var span = $foreign.mkDOM("span");
var span$prime = span([  ]);
var source = $foreign.mkDOM("source");
var source$prime = source([  ]);
var small = $foreign.mkDOM("small");
var small$prime = small([  ]);
var select = $foreign.mkDOM("select");
var select$prime = select([  ]);
var section = $foreign.mkDOM("section");
var section$prime = section([  ]);
var script = $foreign.mkDOM("script");
var script$prime = script([  ]);
var samp = $foreign.mkDOM("samp");
var samp$prime = samp([  ]);
var s = $foreign.mkDOM("s");
var s$prime = s([  ]);
var ruby = $foreign.mkDOM("ruby");
var ruby$prime = ruby([  ]);
var rt = $foreign.mkDOM("rt");
var rt$prime = rt([  ]);
var rp = $foreign.mkDOM("rp");
var rp$prime = rp([  ]);
var q = $foreign.mkDOM("q");
var q$prime = q([  ]);
var progress = $foreign.mkDOM("progress");
var progress$prime = progress([  ]);
var pre = $foreign.mkDOM("pre");
var pre$prime = pre([  ]);
var picture = $foreign.mkDOM("picture");
var picture$prime = picture([  ]);
var param = $foreign.mkDOM("param");
var param$prime = param([  ]);
var p = $foreign.mkDOM("p");
var p$prime = p([  ]);
var output = $foreign.mkDOM("output");
var output$prime = output([  ]);
var option = $foreign.mkDOM("option");
var option$prime = option([  ]);
var optgroup = $foreign.mkDOM("optgroup");
var optgroup$prime = optgroup([  ]);
var ol = $foreign.mkDOM("ol");
var ol$prime = ol([  ]);
var object = $foreign.mkDOM("object");
var object$prime = object([  ]);
var noscript = $foreign.mkDOM("noscript");
var noscript$prime = noscript([  ]);
var nav = $foreign.mkDOM("nav");
var nav$prime = nav([  ]);
var meter = $foreign.mkDOM("meter");
var meter$prime = meter([  ]);
var meta = $foreign.mkDOM("meta");
var meta$prime = meta([  ]);
var menuitem = $foreign.mkDOM("menuitem");
var menuitem$prime = menuitem([  ]);
var menu = $foreign.mkDOM("menu");
var menu$prime = menu([  ]);
var mark = $foreign.mkDOM("mark");
var mark$prime = mark([  ]);
var map = $foreign.mkDOM("map");
var map$prime = map([  ]);
var main = $foreign.mkDOM("main");
var main$prime = main([  ]);
var link = $foreign.mkDOM("link");
var li = $foreign.mkDOM("li");
var li$prime = li([  ]);
var legend = $foreign.mkDOM("legend");
var legend$prime = legend([  ]);
var label = $foreign.mkDOM("label");
var label$prime = label([  ]);
var keygen = $foreign.mkDOM("keygen");
var keygen$prime = keygen([  ]);
var kbd = $foreign.mkDOM("kbd");
var kbd$prime = kbd([  ]);
var ins = $foreign.mkDOM("ins");
var ins$prime = ins([  ]);
var input = $foreign.mkDOM("input");
var input$prime = input([  ]);
var img = $foreign.mkDOM("img");
var img$prime = img([  ]);
var iframe = $foreign.mkDOM("iframe");
var iframe$prime = iframe([  ]);
var i = $foreign.mkDOM("i");
var i$prime = i([  ]);
var html = $foreign.mkDOM("html");
var html$prime = html([  ]);
var hr = $foreign.mkDOM("hr");
var hr$prime = hr([  ]);
var header = $foreign.mkDOM("header");
var header$prime = header([  ]);
var head = $foreign.mkDOM("head");
var head$prime = head([  ]);
var h6 = $foreign.mkDOM("h6");
var h6$prime = h6([  ]);
var h5 = $foreign.mkDOM("h5");
var h5$prime = h5([  ]);
var h4 = $foreign.mkDOM("h4");
var h4$prime = h4([  ]);
var h3 = $foreign.mkDOM("h3");
var h3$prime = h3([  ]);
var h2 = $foreign.mkDOM("h2");
var h2$prime = h2([  ]);
var h1 = $foreign.mkDOM("h1");
var h1$prime = h1([  ]);
var form = $foreign.mkDOM("form");
var form$prime = form([  ]);
var footer = $foreign.mkDOM("footer");
var footer$prime = footer([  ]);
var figure = $foreign.mkDOM("figure");
var figure$prime = figure([  ]);
var figcaption = $foreign.mkDOM("figcaption");
var figcaption$prime = figcaption([  ]);
var fieldset = $foreign.mkDOM("fieldset");
var fieldset$prime = fieldset([  ]);
var embed = $foreign.mkDOM("embed");
var embed$prime = embed([  ]);
var em = $foreign.mkDOM("em");
var em$prime = em([  ]);
var dt = $foreign.mkDOM("dt");
var dt$prime = dt([  ]);
var dl = $foreign.mkDOM("dl");
var dl$prime = dl([  ]);
var div = $foreign.mkDOM("div");
var div$prime = div([  ]);
var dialog = $foreign.mkDOM("dialog");
var dialog$prime = dialog([  ]);
var dfn = $foreign.mkDOM("dfn");
var dfn$prime = dfn([  ]);
var details = $foreign.mkDOM("details");
var details$prime = details([  ]);
var del = $foreign.mkDOM("del");
var del$prime = del([  ]);
var dd = $foreign.mkDOM("dd");
var dd$prime = dd([  ]);
var datalist = $foreign.mkDOM("datalist");
var datalist$prime = datalist([  ]);
var colgroup = $foreign.mkDOM("colgroup");
var colgroup$prime = colgroup([  ]);
var col = $foreign.mkDOM("col");
var col$prime = col([  ]);
var code = $foreign.mkDOM("code");
var code$prime = code([  ]);
var cite = $foreign.mkDOM("cite");
var cite$prime = cite([  ]);
var caption = $foreign.mkDOM("caption");
var caption$prime = caption([  ]);
var canvas = $foreign.mkDOM("canvas");
var canvas$prime = canvas([  ]);
var button = $foreign.mkDOM("button");
var button$prime = button([  ]);
var br = $foreign.mkDOM("br");
var br$prime = br([  ]);
var body = $foreign.mkDOM("body");
var body$prime = body([  ]);
var link$prime = body([  ]);
var blockquote = $foreign.mkDOM("blockquote");
var blockquote$prime = blockquote([  ]);
var big = $foreign.mkDOM("big");
var big$prime = big([  ]);
var bdo = $foreign.mkDOM("bdo");
var bdo$prime = bdo([  ]);
var bdi = $foreign.mkDOM("bdi");
var bdi$prime = bdi([  ]);
var base = $foreign.mkDOM("base");
var base$prime = base([  ]);
var b = $foreign.mkDOM("b");
var b$prime = b([  ]);
var audio = $foreign.mkDOM("audio");
var audio$prime = audio([  ]);
var aside = $foreign.mkDOM("aside");
var aside$prime = aside([  ]);
var article = $foreign.mkDOM("article");
var article$prime = article([  ]);
var area = $foreign.mkDOM("area");
var area$prime = area([  ]);
var address = $foreign.mkDOM("address");
var address$prime = address([  ]);
var abbr = $foreign.mkDOM("abbr");
var abbr$prime = abbr([  ]);
var a = $foreign.mkDOM("a");
var a$prime = a([  ]);
var _data = $foreign.mkDOM("data");
var _data$prime = _data([  ]);
module.exports = {
    "wbr'": wbr$prime, 
    wbr: wbr, 
    "video'": video$prime, 
    video: video, 
    "var'": var$prime, 
    "var": $$var, 
    "ul'": ul$prime, 
    ul: ul, 
    "u'": u$prime, 
    u: u, 
    "track'": track$prime, 
    track: track, 
    "tr'": tr$prime, 
    tr: tr, 
    "title'": title$prime, 
    title: title, 
    "time'": time$prime, 
    time: time, 
    "thead'": thead$prime, 
    thead: thead, 
    "th'": th$prime, 
    th: th, 
    "tfoot'": tfoot$prime, 
    tfoot: tfoot, 
    "textarea'": textarea$prime, 
    textarea: textarea, 
    "td'": td$prime, 
    td: td, 
    "tbody'": tbody$prime, 
    tbody: tbody, 
    "table'": table$prime, 
    table: table, 
    "sup'": sup$prime, 
    sup: sup, 
    "summary'": summary$prime, 
    summary: summary, 
    "sub'": sub$prime, 
    sub: sub, 
    "style'": style$prime, 
    style: style, 
    "strong'": strong$prime, 
    strong: strong, 
    "span'": span$prime, 
    span: span, 
    "source'": source$prime, 
    source: source, 
    "small'": small$prime, 
    small: small, 
    "select'": select$prime, 
    select: select, 
    "section'": section$prime, 
    section: section, 
    "script'": script$prime, 
    script: script, 
    "samp'": samp$prime, 
    samp: samp, 
    "s'": s$prime, 
    s: s, 
    "ruby'": ruby$prime, 
    ruby: ruby, 
    "rt'": rt$prime, 
    rt: rt, 
    "rp'": rp$prime, 
    rp: rp, 
    "q'": q$prime, 
    q: q, 
    "progress'": progress$prime, 
    progress: progress, 
    "pre'": pre$prime, 
    pre: pre, 
    "picture'": picture$prime, 
    picture: picture, 
    "param'": param$prime, 
    param: param, 
    "p'": p$prime, 
    p: p, 
    "output'": output$prime, 
    output: output, 
    "option'": option$prime, 
    option: option, 
    "optgroup'": optgroup$prime, 
    optgroup: optgroup, 
    "ol'": ol$prime, 
    ol: ol, 
    "object'": object$prime, 
    object: object, 
    "noscript'": noscript$prime, 
    noscript: noscript, 
    "nav'": nav$prime, 
    nav: nav, 
    "meter'": meter$prime, 
    meter: meter, 
    "meta'": meta$prime, 
    meta: meta, 
    "menuitem'": menuitem$prime, 
    menuitem: menuitem, 
    "menu'": menu$prime, 
    menu: menu, 
    "mark'": mark$prime, 
    mark: mark, 
    "map'": map$prime, 
    map: map, 
    "main'": main$prime, 
    main: main, 
    "link'": link$prime, 
    link: link, 
    "li'": li$prime, 
    li: li, 
    "legend'": legend$prime, 
    legend: legend, 
    "label'": label$prime, 
    label: label, 
    "keygen'": keygen$prime, 
    keygen: keygen, 
    "kbd'": kbd$prime, 
    kbd: kbd, 
    "ins'": ins$prime, 
    ins: ins, 
    "input'": input$prime, 
    input: input, 
    "img'": img$prime, 
    img: img, 
    "iframe'": iframe$prime, 
    iframe: iframe, 
    "i'": i$prime, 
    i: i, 
    "html'": html$prime, 
    html: html, 
    "hr'": hr$prime, 
    hr: hr, 
    "header'": header$prime, 
    header: header, 
    "head'": head$prime, 
    head: head, 
    "h6'": h6$prime, 
    h6: h6, 
    "h5'": h5$prime, 
    h5: h5, 
    "h4'": h4$prime, 
    h4: h4, 
    "h3'": h3$prime, 
    h3: h3, 
    "h2'": h2$prime, 
    h2: h2, 
    "h1'": h1$prime, 
    h1: h1, 
    "form'": form$prime, 
    form: form, 
    "footer'": footer$prime, 
    footer: footer, 
    "figure'": figure$prime, 
    figure: figure, 
    "figcaption'": figcaption$prime, 
    figcaption: figcaption, 
    "fieldset'": fieldset$prime, 
    fieldset: fieldset, 
    "embed'": embed$prime, 
    embed: embed, 
    "em'": em$prime, 
    em: em, 
    "dt'": dt$prime, 
    dt: dt, 
    "dl'": dl$prime, 
    dl: dl, 
    "div'": div$prime, 
    div: div, 
    "dialog'": dialog$prime, 
    dialog: dialog, 
    "dfn'": dfn$prime, 
    dfn: dfn, 
    "details'": details$prime, 
    details: details, 
    "del'": del$prime, 
    del: del, 
    "dd'": dd$prime, 
    dd: dd, 
    "datalist'": datalist$prime, 
    datalist: datalist, 
    "_data'": _data$prime, 
    _data: _data, 
    "colgroup'": colgroup$prime, 
    colgroup: colgroup, 
    "col'": col$prime, 
    col: col, 
    "code'": code$prime, 
    code: code, 
    "cite'": cite$prime, 
    cite: cite, 
    "caption'": caption$prime, 
    caption: caption, 
    "canvas'": canvas$prime, 
    canvas: canvas, 
    "button'": button$prime, 
    button: button, 
    "br'": br$prime, 
    br: br, 
    "body'": body$prime, 
    body: body, 
    "blockquote'": blockquote$prime, 
    blockquote: blockquote, 
    "big'": big$prime, 
    big: big, 
    "bdo'": bdo$prime, 
    bdo: bdo, 
    "bdi'": bdi$prime, 
    bdi: bdi, 
    "base'": base$prime, 
    base: base, 
    "b'": b$prime, 
    b: b, 
    "audio'": audio$prime, 
    audio: audio, 
    "aside'": aside$prime, 
    aside: aside, 
    "article'": article$prime, 
    article: article, 
    "area'": area$prime, 
    area: area, 
    "address'": address$prime, 
    address: address, 
    "abbr'": abbr$prime, 
    abbr: abbr, 
    "a'": a$prime, 
    a: a, 
    text: $foreign.text, 
    mkDOM: $foreign.mkDOM
};

},{"./foreign":110,"Prelude":107,"React":113,"React.DOM.Props":109}],112:[function(require,module,exports){
/* global exports */
"use strict";

// module React

exports.getProps = function(ctx) {
    return function() {
        return ctx.props;
    };
};

exports.getRefs = function(ctx) {
    return function() {
        return ctx.refs;
    };
};

exports.writeState = function(ctx) {
    return function(state) {
        return function() {
            ctx.replaceState({
                state: state
            });
            return function() {
                return state;
            }
        };
    };
};

exports.readState = function(ctx) {
    return function() {
        return ctx.state.state;
    };
};

exports.mkUI = function(ss) {
    var result = {};
    for (var s in ss) {
        if (ss.hasOwnProperty(s)) {
            result[s] = (function(impl) {
                return function() {
                    return impl(this)();
                }
            })(ss[s]);
        }
    }
    result.getInitialState = function() {
        return {
            state: ss.getInitialState(this)()
        };
    };
    return React.createClass(result);
};

exports.handle = function(f) {
    return function(e) {
        return f(e)();
    };
};

exports.renderToString = React.renderComponentToString;

exports.renderToBody = function(component) {
    return function() {
        return React.renderComponent(component, document.body);
    }
};

exports.renderToElementById = function(id) {
    return function(component) {
        return function() {
            return React.renderComponent(component, document.getElementById(id));
        }
    }
};

},{}],113:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var DOM = require("DOM");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Control_Monad_Eff_Console = require("Control.Monad.Eff.Console");
var transformState = function (ctx) {
    return function (f) {
        return function __do() {
            var _0 = $foreign.readState(ctx)();
            return $foreign.writeState(ctx)(f(_0))();
        };
    };
};
var spec = function (st) {
    return function (render) {
        return {
            render: render, 
            getInitialState: function (_38) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(st);
            }, 
            componentWillMount: function (_39) {
                return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit);
            }, 
            componentDidMount: function (_40) {
                return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit);
            }, 
            componentWillReceiveProps: function (_41) {
                return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit);
            }, 
            shouldComponentUpdate: function (_42) {
                return Prelude["return"](Control_Monad_Eff.applicativeEff)(true);
            }, 
            componentWillUpdate: function (_43) {
                return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit);
            }, 
            componentDidUpdate: function (_44) {
                return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit);
            }, 
            componentWillUnmount: function (_45) {
                return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit);
            }
        };
    };
};
module.exports = {
    transformState: transformState, 
    spec: spec, 
    renderToElementById: $foreign.renderToElementById, 
    renderToBody: $foreign.renderToBody, 
    renderToString: $foreign.renderToString, 
    handle: $foreign.handle, 
    mkUI: $foreign.mkUI, 
    writeState: $foreign.writeState, 
    readState: $foreign.readState, 
    getRefs: $foreign.getRefs, 
    getProps: $foreign.getProps
};

},{"./foreign":112,"Control.Monad.Eff":23,"Control.Monad.Eff.Console":13,"DOM":40,"Prelude":107}],114:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Control_Monad_Eff_Exception = require("Control.Monad.Eff.Exception");
var OnError = (function () {
    function OnError(value0) {
        this.value0 = value0;
    };
    OnError.create = function (value0) {
        return new OnError(value0);
    };
    return OnError;
})();
var OnNext = (function () {
    function OnNext(value0) {
        this.value0 = value0;
    };
    OnNext.create = function (value0) {
        return new OnNext(value0);
    };
    return OnNext;
})();
var OnCompleted = (function () {
    function OnCompleted() {

    };
    OnCompleted.value = new OnCompleted();
    return OnCompleted;
})();
var showNotification = function (__dict_Show_0) {
    return new Prelude.Show(function (_37) {
        if (_37 instanceof OnNext) {
            return "(OnNext " + (Prelude.show(__dict_Show_0)(_37.value0) + ")");
        };
        if (_37 instanceof OnError) {
            return "(OnError " + (Control_Monad_Eff_Exception.message(_37.value0) + ")");
        };
        if (_37 instanceof OnCompleted) {
            return "(OnCompleted)";
        };
        throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/bower_components/purescript-rx/src/Rx/Notification.purs line 8, column 1 - line 11, column 24: " + [ _37.constructor.name ]);
    });
};
module.exports = {
    OnError: OnError, 
    OnNext: OnNext, 
    OnCompleted: OnCompleted, 
    showNotification: showNotification
};

},{"Control.Monad.Eff.Exception":15,"Prelude":107}],115:[function(require,module,exports){
/* global exports */
"use strict";

// module Rx.Observable

var Rx = require('rx');

exports.just = Rx.Observable.just;

exports.fromArray = Rx.Observable.fromArray;

exports._empty = Rx.Observable.empty();

exports.generate = function (initial) {
  return function (condition) {
    return function (step) {
      return function (selector) {
        return Rx.Observable.generate(initial, condition, step, selector);
      };
    };
  };
}

exports["subscribe'"] = function (ob) {
  return function(onNext) {
    return function(onError) {
      return function(onCompleted) {
        return function() {
          return ob.subscribe(
            function(value) { onNext(value)(); },
            function(err) { onError(err)(); },
            function() { onCompleted()(); }
          );
        };
      };
    };
  };
}

exports.subscribe = function (ob) {
  return function(f) {
    return function() {
      return ob.subscribe(function(value) {
        f(value)();
      });
    };
  };
}

exports.subscribeOnCompleted = function (ob) {
  return function(f) {
    return function() {
      return ob.subscribeOnCompleted(function(value) {
        f(value)();
      });
    };
  };
}

exports.subscribeOnError = function (ob) {
  return function(f) {
    return function() {
      return ob.subscribeOnError(function(err) {
        f(err)();
      });
    };
  };
}

exports.merge = function (ob) {
  return function(other) {
    return ob.merge(other);
  };
}

exports.combineLatest = function (f) {
  return function(ob1) {
    return function(ob2) {
      return ob1.combineLatest(ob2, function (x, y) {
        return f(x)(y);
      });
    };
  };
}

exports.concat = function (x) {
  return function(y) {
    return x.concat(y);
  };
}

exports.take = function (n) {
  return function(ob) {
    return ob.take(n);
  };
}

exports.takeUntil = function (other) {
  return function(ob) {
    return ob.takeUntil(other);
  };
}

exports._map = function (f) {
  return function(ob) {
    return ob.map(f);
  };
}

exports.flatMap = function (ob) {
  return function(f) {
    return ob.flatMap(f);
  };
}

exports.flatMapLatest = function (ob) {
  return function(f) {
    return ob.flatMapLatest(f);
  };
}

exports.scan = function scan(f) {
  return function(seed) {
    return function(ob) {
      return ob.scan(seed, function(acc, value) {
        return f(value)(acc);
      });
    };
  };
}

exports.unwrap = function (ob) {
  return function() {
    return ob.map(function(eff) {
      return eff();
    });
  };
}

exports.runObservable = function (ob) {
  return function() {
    ob.subscribe(function(eff) {
      eff();
    });
  };
}

exports.switchLatest = function (ob) {
  return ob.switchLatest();
}

exports.debounce = function (ms) {
  return function(ob) {
    return ob.debounce(ms);
  };
}

exports.zip = function (f){
  return function(ob1){
    return function(ob2){
      return ob1.zip(ob2, function (x, y) {
        return f(x)(y);
      });
    };
  };
}

exports.range = function (begin) {
  return function (end) {
    return Rx.Observable.range(begin, end);
  };
}

exports.reduce = function (f){
  return function(seed){
    return function(ob){
      return ob.reduce(function (x, y) {
        return f(x)(y);
      }, seed);
    };
  };
}

exports.delay = function (ms){
  return function(ob){
    return ob.delay(ms);
  };
}

exports._materialize = function (ob, onNext, onError, onCompleted) {
  return ob.materialize().map(function(x) {
    switch (x.kind) {
      case 'N': return onNext(x.value);
      case 'E': return onError(x.exception);
      case 'C': return onCompleted;
    }
  });
}

exports.dematerialize = function (ob) {
  return ob.map(function(a) {
    switch (a.constructor.name) {
      case "OnNext": return Rx.Notification.createOnNext(a.value0);
      case "OnError": return Rx.Notification.createOnError(a.value0);
      case "OnCompleted": return Rx.Notification.createOnCompleted();
    }
  }).dematerialize();
}

exports.distinct = function (ob){
  return ob.distinct();
}

exports.distinctUntilChanged = function (ob){
  return ob.distinctUntilChanged();
}

exports.filter = function (p){
  return function(ob){
    return ob.filter(p);
  };
}

exports.withLatestFrom = function (f) {
  return function (ob1) {
    return function (ob2) {
      return ob1.withLatestFrom(ob2, function(x, y) {
        return f(x)(y);
      })
    };
  };
}

exports._throwError = Rx.Observable.throw;

exports._catchError = function (ob, f) {
  return ob.catch(f);
}

},{"rx":2}],116:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Data_Function = require("Data.Function");
var Control_Alt = require("Control.Alt");
var Control_Plus = require("Control.Plus");
var Control_MonadPlus = require("Control.MonadPlus");
var Control_Monad_Eff_Exception = require("Control.Monad.Eff.Exception");
var Control_Monad_Error_Class = require("Control.Monad.Error.Class");
var Control_Alternative = require("Control.Alternative");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Rx_Notification = require("Rx.Notification");
var semigroupObservable = new Prelude.Semigroup($foreign.concat);
var monadErrorObservable = new Control_Monad_Error_Class.MonadError(Data_Function.runFn2($foreign._catchError), $foreign._throwError);
var materialize = function (ob) {
    return $foreign._materialize(ob, Rx_Notification.OnNext.create, Rx_Notification.OnError.create, Rx_Notification.OnCompleted.value);
};
var functorObservable = new Prelude.Functor($foreign._map);
var applyObservable = new Prelude.Apply(function () {
    return functorObservable;
}, $foreign.combineLatest(Prelude.id(Prelude.categoryFn)));
var observableBind = new Prelude.Bind(function () {
    return applyObservable;
}, $foreign.flatMap);
var applicativeObservable = new Prelude.Applicative(function () {
    return applyObservable;
}, $foreign.just);
var monadObservable = new Prelude.Monad(function () {
    return applicativeObservable;
}, function () {
    return observableBind;
});
var altObservable = new Control_Alt.Alt(function () {
    return functorObservable;
}, $foreign.merge);
var plusObservable = new Control_Plus.Plus(function () {
    return altObservable;
}, $foreign._empty);
var alternativeObservable = new Control_Alternative.Alternative(function () {
    return plusObservable;
}, function () {
    return applicativeObservable;
});
var monadPlusObservable = new Control_MonadPlus.MonadPlus(function () {
    return alternativeObservable;
}, function () {
    return monadObservable;
});
module.exports = {
    materialize: materialize, 
    functorObservable: functorObservable, 
    applyObservable: applyObservable, 
    applicativeObservable: applicativeObservable, 
    observableBind: observableBind, 
    monadObservable: monadObservable, 
    semigroupObservable: semigroupObservable, 
    altObservable: altObservable, 
    plusObservable: plusObservable, 
    alternativeObservable: alternativeObservable, 
    monadPlusObservable: monadPlusObservable, 
    monadErrorObservable: monadErrorObservable, 
    withLatestFrom: $foreign.withLatestFrom, 
    zip: $foreign.zip, 
    unwrap: $foreign.unwrap, 
    takeUntil: $foreign.takeUntil, 
    take: $foreign.take, 
    switchLatest: $foreign.switchLatest, 
    subscribeOnError: $foreign.subscribeOnError, 
    subscribeOnCompleted: $foreign.subscribeOnCompleted, 
    subscribe: $foreign.subscribe, 
    "subscribe'": $foreign["subscribe'"], 
    scan: $foreign.scan, 
    runObservable: $foreign.runObservable, 
    range: $foreign.range, 
    reduce: $foreign.reduce, 
    merge: $foreign.merge, 
    generate: $foreign.generate, 
    fromArray: $foreign.fromArray, 
    flatMapLatest: $foreign.flatMapLatest, 
    flatMap: $foreign.flatMap, 
    filter: $foreign.filter, 
    distinctUntilChanged: $foreign.distinctUntilChanged, 
    distinct: $foreign.distinct, 
    dematerialize: $foreign.dematerialize, 
    delay: $foreign.delay, 
    debounce: $foreign.debounce, 
    concat: $foreign.concat, 
    combineLatest: $foreign.combineLatest
};

},{"./foreign":115,"Control.Alt":3,"Control.Alternative":4,"Control.Monad.Eff":23,"Control.Monad.Eff.Exception":15,"Control.Monad.Error.Class":24,"Control.MonadPlus":37,"Control.Plus":38,"Data.Function":70,"Prelude":107,"Rx.Notification":114}],117:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var Prelude = require("Prelude");
var Data_Date = require("Data.Date");
var Data_Maybe = require("Data.Maybe");
var Running = (function () {
    function Running() {

    };
    Running.value = new Running();
    return Running;
})();
var Paused = (function () {
    function Paused() {

    };
    Paused.value = new Paused();
    return Paused;
})();
var Alive = (function () {
    function Alive() {

    };
    Alive.value = new Alive();
    return Alive;
})();
var Dead = (function () {
    function Dead() {

    };
    Dead.value = new Dead();
    return Dead;
})();
var State = (function () {
    function State(value0) {
        this.value0 = value0;
    };
    State.create = function (value0) {
        return new State(value0);
    };
    return State;
})();
var Point = (function () {
    function Point(value0, value1) {
        this.value0 = value0;
        this.value1 = value1;
    };
    Point.create = function (value0) {
        return function (value1) {
            return new Point(value0, value1);
        };
    };
    return Point;
})();
var NoPoint = (function () {
    function NoPoint(value0, value1) {
        this.value0 = value0;
        this.value1 = value1;
    };
    NoPoint.create = function (value0) {
        return function (value1) {
            return new NoPoint(value0, value1);
        };
    };
    return NoPoint;
})();
var TogglePoint = (function () {
    function TogglePoint(value0, value1) {
        this.value0 = value0;
        this.value1 = value1;
    };
    TogglePoint.create = function (value0) {
        return function (value1) {
            return new TogglePoint(value0, value1);
        };
    };
    return TogglePoint;
})();
var Tick = (function () {
    function Tick() {

    };
    Tick.value = new Tick();
    return Tick;
})();
var Pause = (function () {
    function Pause() {

    };
    Pause.value = new Pause();
    return Pause;
})();
var Play = (function () {
    function Play() {

    };
    Play.value = new Play();
    return Play;
})();
var Toggle = (function () {
    function Toggle() {

    };
    Toggle.value = new Toggle();
    return Toggle;
})();
var Save = (function () {
    function Save() {

    };
    Save.value = new Save();
    return Save;
})();
var NewCells = (function () {
    function NewCells(value0) {
        this.value0 = value0;
    };
    NewCells.create = function (value0) {
        return new NewCells(value0);
    };
    return NewCells;
})();
var Rewind = (function () {
    function Rewind(value0) {
        this.value0 = value0;
    };
    Rewind.create = function (value0) {
        return new Rewind(value0);
    };
    return Rewind;
})();
var FForward = (function () {
    function FForward(value0) {
        this.value0 = value0;
    };
    FForward.create = function (value0) {
        return new FForward(value0);
    };
    return FForward;
})();
var Timer = (function () {
    function Timer() {

    };
    Timer.value = new Timer();
    return Timer;
})();
var RandomGen = (function () {
    function RandomGen() {

    };
    RandomGen.value = new RandomGen();
    return RandomGen;
})();
var showRunStatus = new Prelude.Show(function (_75) {
    if (_75 instanceof Running) {
        return "Running";
    };
    if (_75 instanceof Paused) {
        return "Paused";
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Types.purs line 70, column 1 - line 74, column 1: " + [ _75.constructor.name ]);
});
var showCell = new Prelude.Show(function (_74) {
    if (_74 instanceof Alive) {
        return "Alive";
    };
    if (_74 instanceof Dead) {
        return "Dead";
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Types.purs line 64, column 1 - line 68, column 1: " + [ _74.constructor.name ]);
});
var showState = new Prelude.Show(function (_70) {
    return "State { cells: " + (Prelude.show(Prelude.showArray(Prelude.showArray(Prelude.showArray(showCell))))(_70.value0.cells) + (", runningState: " + (Prelude.show(showRunStatus)(_70.value0.runningState) + (", current: " + (Prelude.show(Data_Maybe.showMaybe(Prelude.showInt))(_70.value0.current) + (", startTime: " + (Prelude.show(Data_Date.showDate)(_70.value0.startTime) + (", genRatio:" + (Prelude.show(Prelude.showNumber)(_70.value0.genRatio) + (", genCounter: " + (Prelude.show(Prelude.showNumber)(_70.value0.genCounter) + (", secondsElapsed: " + (Prelude.show(Prelude.showNumber)(_70.value0.secondsElapsed) + "}")))))))))))));
});
var showAction = new Prelude.Show(function (_71) {
    if (_71 instanceof Point) {
        return "Point(" + (Prelude.show(Prelude.showInt)(_71.value0) + (", " + (Prelude.show(Prelude.showInt)(_71.value1) + ")")));
    };
    if (_71 instanceof NoPoint) {
        return "NoPoint(" + (Prelude.show(Prelude.showInt)(_71.value0) + (", " + (Prelude.show(Prelude.showInt)(_71.value1) + ")")));
    };
    if (_71 instanceof TogglePoint) {
        return "TogglePoint(" + (Prelude.show(Prelude.showInt)(_71.value0) + (", " + (Prelude.show(Prelude.showInt)(_71.value1) + ")")));
    };
    if (_71 instanceof Tick) {
        return "Tick";
    };
    if (_71 instanceof Play) {
        return "Play";
    };
    if (_71 instanceof Pause) {
        return "Pause";
    };
    if (_71 instanceof Toggle) {
        return "Toggle";
    };
    if (_71 instanceof Save) {
        return "Save";
    };
    if (_71 instanceof NewCells) {
        return "NewCells " + Prelude.show(Prelude.showArray(Prelude.showArray(showCell)))(_71.value0);
    };
    if (_71 instanceof Rewind) {
        return "Rewind " + Prelude.show(Prelude.showInt)(_71.value0);
    };
    if (_71 instanceof FForward) {
        return "FForward " + Prelude.show(Prelude.showInt)(_71.value0);
    };
    if (_71 instanceof Timer) {
        return "Timer";
    };
    if (_71 instanceof RandomGen) {
        return "RandomGen";
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Types.purs line 42, column 1 - line 57, column 1: " + [ _71.constructor.name ]);
});
var eqRunStatus = new Prelude.Eq(function (_76) {
    return function (_77) {
        if (_76 instanceof Running && _77 instanceof Running) {
            return true;
        };
        if (_76 instanceof Paused && _77 instanceof Paused) {
            return true;
        };
        return false;
    };
});
var eqCell = new Prelude.Eq(function (_72) {
    return function (_73) {
        if (_72 instanceof Alive && _73 instanceof Alive) {
            return true;
        };
        if (_72 instanceof Dead && _73 instanceof Dead) {
            return true;
        };
        return false;
    };
});
module.exports = {
    Running: Running, 
    Paused: Paused, 
    Alive: Alive, 
    Dead: Dead, 
    Point: Point, 
    NoPoint: NoPoint, 
    TogglePoint: TogglePoint, 
    Tick: Tick, 
    Pause: Pause, 
    Play: Play, 
    Toggle: Toggle, 
    Save: Save, 
    NewCells: NewCells, 
    Rewind: Rewind, 
    FForward: FForward, 
    Timer: Timer, 
    RandomGen: RandomGen, 
    State: State, 
    showState: showState, 
    showAction: showAction, 
    eqCell: eqCell, 
    showCell: showCell, 
    showRunStatus: showRunStatus, 
    eqRunStatus: eqRunStatus
};

},{"Data.Date":63,"Data.Maybe":81,"Prelude":107}],118:[function(require,module,exports){
// module UI.Canvas

exports.fromUiEvent = function (el) {return function(ev) {return Rx.Observable.fromEvent(el, ev) } }

},{}],119:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Utils = require("Utils");
var Control_Monad_Eff_Ref = require("Control.Monad.Eff.Ref");
var $$Math = require("Math");
var Data_Maybe = require("Data.Maybe");
var Data_Int = require("Data.Int");
var Core = require("Core");
var Graphics_Canvas = require("Graphics.Canvas");
var Data_Function = require("Data.Function");
var Data_Traversable = require("Data.Traversable");
var Data_Array = require("Data.Array");
var Control_Monad_Eff_Random = require("Control.Monad.Eff.Random");
var Data = require("Data");
var Types = require("Types");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Control_Monad = require("Control.Monad");
var Control_Apply = require("Control.Apply");
var Data_Tuple = require("Data.Tuple");
var DOM = require("DOM");
var Control_Monad_Eff_Console = require("Control.Monad.Eff.Console");
var Rx_Observable = require("Rx.Observable");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
var Data_DOM_Simple_Window = require("Data.DOM.Simple.Window");
var Data_DOM_Simple_Events = require("Data.DOM.Simple.Events");
var Color = (function () {
    function Color(value0) {
        this.value0 = value0;
    };
    Color.create = function (value0) {
        return new Color(value0);
    };
    return Color;
})();
var LocalState = (function () {
    function LocalState(value0) {
        this.value0 = value0;
    };
    LocalState.create = function (value0) {
        return new LocalState(value0);
    };
    return LocalState;
})();
var white = "#ffffff";
var topOffset = 90;
var startPhase = 0.0;
var startColor = new Color({
    r: 0, 
    g: 0, 
    b: 0
});
var showColor = new Prelude.Show(function (_29) {
    return "#" + (Utils.toHex(_29.value0.r) + (Utils.toHex(_29.value0.g) + Utils.toHex(_29.value0.b)));
});
var semiringColor = new Prelude.Semiring(function (_23) {
    return function (_24) {
        return new Color({
            r: Prelude["+"](Prelude.semiringInt)(_23.value0.r)(_24.value0.r), 
            g: Prelude["+"](Prelude.semiringInt)(_23.value0.g)(_24.value0.g), 
            b: Prelude["+"](Prelude.semiringInt)(_23.value0.b)(_24.value0.b)
        });
    };
}, function (_25) {
    return function (_26) {
        return new Color({
            r: Prelude["*"](Prelude.semiringInt)(_25.value0.r)(_26.value0.r), 
            g: Prelude["*"](Prelude.semiringInt)(_25.value0.g)(_26.value0.g), 
            b: Prelude["*"](Prelude.semiringInt)(_25.value0.b)(_26.value0.b)
        });
    };
}, new Color({
    r: 1, 
    g: 1, 
    b: 1
}), new Color({
    r: 0, 
    g: 0, 
    b: 0
}));
var ringColor = new Prelude.Ring(function () {
    return semiringColor;
}, function (_27) {
    return function (_28) {
        return new Color({
            r: Prelude["-"](Prelude.ringInt)(_27.value0.r)(_28.value0.r), 
            g: Prelude["-"](Prelude.ringInt)(_27.value0.g)(_28.value0.g), 
            b: Prelude["-"](Prelude.ringInt)(_27.value0.b)(_28.value0.b)
        });
    };
});
var renderLoopInterval = 50.0;
var leftOffset = 0;
var halfCell = 5;
var gridColor = "#F8F8F8";
var getWidth = function (rows) {
    var _57 = Data_Array["!!"](rows)(0);
    if (_57 instanceof Data_Maybe.Nothing) {
        return 0;
    };
    if (_57 instanceof Data_Maybe.Just) {
        return Data_Array.length(_57.value0);
    };
    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/UI/Canvas.purs line 335, column 1 - line 336, column 1: " + [ _57.constructor.name ]);
};
var getRandomColor = function __do() {
    var _8 = Control_Monad_Eff_Random.randomRange(50.0)(250.0)();
    var _7 = Control_Monad_Eff_Random.randomRange(50.0)(250.0)();
    var _6 = Control_Monad_Eff_Random.randomRange(50.0)(250.0)();
    return Prelude["return"](Control_Monad_Eff.applicativeEff)("#" + (Utils.hex($$Math.floor(_8)) + (Utils.hex($$Math.floor(_7)) + Utils.hex($$Math.floor(_6)))))();
};
var getHeight = function (xs) {
    return Data_Array.length(xs);
};
var freq = 0.2;
var eqColor = new Prelude.Eq(function (_19) {
    return function (_20) {
        return Prelude["&&"](Prelude.booleanAlgebraBoolean)(Prelude["=="](Prelude.eqInt)(_19.value0.r)(_20.value0.r))(Prelude["&&"](Prelude.booleanAlgebraBoolean)(Prelude["=="](Prelude.eqInt)(_19.value0.g)(_20.value0.g))(Prelude["=="](Prelude.eqInt)(_19.value0.b)(_20.value0.b)));
    };
});
var ordColor = new Prelude.Ord(function () {
    return eqColor;
}, function (_21) {
    return function (_22) {
        var _68 = Prelude["=="](eqColor)(_21)(_22);
        if (_68) {
            return Prelude.EQ.value;
        };
        if (!_68) {
            var _69 = Prelude["&&"](Prelude.booleanAlgebraBoolean)(Prelude["<"](Prelude.ordInt)(_21.value0.r)(_22.value0.r))(Prelude["&&"](Prelude.booleanAlgebraBoolean)(Prelude["<"](Prelude.ordInt)(_21.value0.g)(_22.value0.g))(Prelude["<"](Prelude.ordInt)(_21.value0.b)(_22.value0.b)));
            if (_69) {
                return Prelude.LT.value;
            };
            if (!_69) {
                return Prelude.GT.value;
            };
            throw new Error("Failed pattern match: " + [ _69.constructor.name ]);
        };
        throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/UI/Canvas.purs line 62, column 1 - line 70, column 1: " + [ _68.constructor.name ]);
    };
});
var cellSize = 10;
var drawCircle = function (color) {
    return function (ctx) {
        return function (x) {
            return function (y) {
                return function __do() {
                    Graphics_Canvas.save(ctx)();
                    Graphics_Canvas.setFillStyle(color)(ctx)();
                    Graphics_Canvas.fillPath(ctx)(Graphics_Canvas.arc(ctx)({
                        x: Data_Int.toNumber(Prelude["+"](Prelude.semiringInt)(Prelude["+"](Prelude.semiringInt)(Prelude["*"](Prelude.semiringInt)(x)(cellSize))(halfCell))(leftOffset)), 
                        y: Data_Int.toNumber(Prelude["+"](Prelude.semiringInt)(Prelude["+"](Prelude.semiringInt)(Prelude["*"](Prelude.semiringInt)(y)(cellSize))(halfCell))(topOffset)), 
                        r: Data_Int.toNumber(cellSize) / 4.0 + 1.0, 
                        start: 0.0, 
                        end: 360.0
                    }))();
                    Graphics_Canvas.restore(ctx)();
                    return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit)();
                };
            };
        };
    };
};
var drawCell = drawCircle;
var drawCells = function (ctx) {
    return function (cells) {
        return function (cellColor_1) {
            return function __do() {
                Graphics_Canvas.save(ctx)();
                Data_Traversable["for"](Control_Monad_Eff.applicativeEff)(Data_Traversable.traversableArray)(Data_Array.zip(cells)(Data_Array[".."](0)(Data_Array.length(cells))))(function (_16) {
                    return Data_Traversable["for"](Control_Monad_Eff.applicativeEff)(Data_Traversable.traversableArray)(Data_Array.zip(_16.value0)(Data_Array[".."](0)(Data_Array.length(_16.value0))))(function (_15) {
                        if (_15.value0 instanceof Types.Alive) {
                            return drawCell(Prelude.show(showColor)(cellColor_1))(ctx)(_15.value1)(_16.value1);
                        };
                        if (_15.value0 instanceof Types.Dead) {
                            return Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude.unit);
                        };
                        throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/UI/Canvas.purs line 290, column 1 - line 291, column 1: " + [ _15.value0.constructor.name ]);
                    });
                })();
                Graphics_Canvas.restore(ctx)();
                return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit)();
            };
        };
    };
};
var drawGrid = function (ctx) {
    return function (x) {
        return function (y) {
            return function (minX) {
                return function (minY) {
                    return function (maxX) {
                        return function (maxY) {
                            return function __do() {
                                Graphics_Canvas.save(ctx)();
                                Graphics_Canvas.setLineWidth(1.0)(ctx)();
                                Graphics_Canvas.setStrokeStyle(gridColor)(ctx)();
                                Graphics_Canvas.beginPath(ctx)();
                                Data_Traversable.sequence(Data_Traversable.traversableArray)(Control_Monad_Eff.applicativeEff)(Utils.map_(Prelude.functorArray)(Data_Array[".."](0)(y))(function (y$prime) {
                                    return function __do() {
                                        Graphics_Canvas.moveTo(ctx)(Data_Int.toNumber(minX))(Data_Int.toNumber(Prelude["+"](Prelude.semiringInt)(Prelude["*"](Prelude.semiringInt)(y$prime)(cellSize))(topOffset)))();
                                        return Graphics_Canvas.lineTo(ctx)(Data_Int.toNumber(maxX))(Data_Int.toNumber(Prelude["+"](Prelude.semiringInt)(Prelude["*"](Prelude.semiringInt)(y$prime)(cellSize))(topOffset)))();
                                    };
                                }))();
                                Data_Traversable.sequence(Data_Traversable.traversableArray)(Control_Monad_Eff.applicativeEff)(Utils.map_(Prelude.functorArray)(Data_Array[".."](0)(x))(function (x$prime) {
                                    return function __do() {
                                        Graphics_Canvas.moveTo(ctx)(Data_Int.toNumber(Prelude["+"](Prelude.semiringInt)(Prelude["*"](Prelude.semiringInt)(x$prime)(cellSize))(leftOffset)))(Data_Int.toNumber(minY))();
                                        return Graphics_Canvas.lineTo(ctx)(Data_Int.toNumber(Prelude["+"](Prelude.semiringInt)(Prelude["*"](Prelude.semiringInt)(x$prime)(cellSize))(leftOffset)))(Data_Int.toNumber(maxY))();
                                    };
                                }))();
                                Graphics_Canvas.stroke(ctx)();
                                Graphics_Canvas.restore(ctx)();
                                return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit)();
                            };
                        };
                    };
                };
            };
        };
    };
};
var drawSquare = function (color) {
    return function (ctx) {
        return function (x) {
            return function (y) {
                return function __do() {
                    Graphics_Canvas.save(ctx)();
                    Graphics_Canvas.setFillStyle(color)(ctx)();
                    Graphics_Canvas.fillPath(ctx)(Graphics_Canvas.rect(ctx)({
                        x: Data_Int.toNumber(Prelude["+"](Prelude.semiringInt)(Prelude["+"](Prelude.semiringInt)(Prelude["*"](Prelude.semiringInt)(x)(cellSize))(1))(leftOffset)), 
                        y: Data_Int.toNumber(Prelude["+"](Prelude.semiringInt)(Prelude["+"](Prelude.semiringInt)(Prelude["*"](Prelude.semiringInt)(y)(cellSize))(1))(topOffset)), 
                        w: Data_Int.toNumber(Prelude["-"](Prelude.ringInt)(cellSize)(1)), 
                        h: Data_Int.toNumber(Prelude["-"](Prelude.ringInt)(cellSize)(1))
                    }))();
                    Graphics_Canvas.restore(ctx)();
                    return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit)();
                };
            };
        };
    };
};
var black = "#000000";
var borderColor = black;
var drawBorders = function (ctx) {
    return function (minX) {
        return function (minY) {
            return function (maxX) {
                return function (maxY) {
                    return function __do() {
                        Graphics_Canvas.save(ctx)();
                        Graphics_Canvas.setLineWidth(1.0)(ctx)();
                        Graphics_Canvas.setStrokeStyle(borderColor)(ctx)();
                        Graphics_Canvas.beginPath(ctx)();
                        Graphics_Canvas.moveTo(ctx)(Data_Int.toNumber(minX))(Data_Int.toNumber(minY))();
                        Graphics_Canvas.lineTo(ctx)(Data_Int.toNumber(maxX))(Data_Int.toNumber(minY))();
                        Graphics_Canvas.lineTo(ctx)(Data_Int.toNumber(maxX))(Data_Int.toNumber(maxY))();
                        Graphics_Canvas.lineTo(ctx)(Data_Int.toNumber(minX))(Data_Int.toNumber(maxY))();
                        Graphics_Canvas.lineTo(ctx)(Data_Int.toNumber(minX))(Data_Int.toNumber(minY))();
                        Graphics_Canvas.stroke(ctx)();
                        Graphics_Canvas.restore(ctx)();
                        return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit)();
                    };
                };
            };
        };
    };
};
var cellColor = black;
var labelColor = black;
var drawLabels = function (ctx) {
    return function (_18) {
        var getCurrentGenerationLabel = function (x) {
            if (x instanceof Data_Maybe.Nothing) {
                return "Latest";
            };
            if (x instanceof Data_Maybe.Just) {
                return Prelude.show(Prelude.showInt)(x.value0);
            };
            throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/UI/Canvas.purs line 236, column 5 - line 240, column 1: " + [ x.constructor.name ]);
        };
        return function __do() {
            Graphics_Canvas.save(ctx)();
            Graphics_Canvas.setFillStyle(labelColor)(ctx)();
            Graphics_Canvas.setFont("16px Source Code Pro")(ctx)();
            Graphics_Canvas.fillText(ctx)(Prelude.show(Types.showRunStatus)(_18.value0.runningState))(5.0)(20.0)();
            Graphics_Canvas.fillText(ctx)("Time elapsed, s: " + Prelude.show(Prelude.showNumber)(_18.value0.secondsElapsed))(5.0)(40.0)();
            Graphics_Canvas.fillText(ctx)("Gen/sec: " + Prelude.show(Prelude.showNumber)(_18.value0.genRatio))(350.0)(40.0)();
            Graphics_Canvas.fillText(ctx)("Current generation: " + getCurrentGenerationLabel(_18.value0.current))(5.0)(60.0)();
            Graphics_Canvas.fillText(ctx)("Total generations: " + Prelude.show(Prelude.showInt)(Core.getTotalGenerations(_18)))(350.0)(60.0)();
            Graphics_Canvas.setFont("12px Source Code Pro")(ctx)();
            Graphics_Canvas.fillText(ctx)("Space - toggle play/pause, \u27f5\u27f6 - navigate generations, r - random generation.")(5.0)(80.0)();
            Graphics_Canvas.restore(ctx)();
            return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit)();
        };
    };
};
var bgColor = white;
var drawBackground = function (ctx) {
    return function (minX) {
        return function (minY) {
            return function (maxX) {
                return function (maxY) {
                    return function __do() {
                        Graphics_Canvas.save(ctx)();
                        Graphics_Canvas.setFillStyle(bgColor)(ctx)();
                        Graphics_Canvas.fillPath(ctx)(Graphics_Canvas.rect(ctx)({
                            x: Data_Int.toNumber(minX), 
                            y: Data_Int.toNumber(minY), 
                            w: Data_Int.toNumber(maxX), 
                            h: Data_Int.toNumber(maxY)
                        }))();
                        Graphics_Canvas.restore(ctx)();
                        return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit)();
                    };
                };
            };
        };
    };
};
var renderCanvas = function (canvas) {
    return function (_17) {
        return function (color) {
            var totalGenerations = Core.getTotalGenerations(_17);
            var currentGeneration = Core.getCurrentGeneration(_17);
            var height = getHeight(currentGeneration);
            var heightPx = Prelude["*"](Prelude.semiringInt)(height)(cellSize);
            var maxY = Prelude["+"](Prelude.semiringInt)(heightPx)(topOffset);
            var width = getWidth(currentGeneration);
            var widthPx = Prelude["*"](Prelude.semiringInt)(width)(cellSize);
            var maxX = Prelude["+"](Prelude.semiringInt)(widthPx)(leftOffset);
            return function __do() {
                var _5 = Graphics_Canvas.getContext2D(canvas)();
                drawBackground(_5)(0)(0)(maxX)(maxY)();
                drawGrid(_5)(width)(height)(leftOffset)(topOffset)(maxX)(maxY)();
                drawBorders(_5)(leftOffset)(topOffset)(maxX)(maxY)();
                drawCells(_5)(currentGeneration)(color)();
                drawLabels(_5)(_17)();
                return Prelude["return"](Control_Monad_Eff.applicativeEff)(Prelude.unit)();
            };
        };
    };
};
var setupUI = function (state) {
    return function (outputActionsStream) {
        return function (canvasId) {
            var stepColor = function (cur) {
                return function (phase) {
                    var r$prime = $$Math.sin(freq * phase + 0.0) * 127.0 + 128.0;
                    var r = Data_Maybe.maybe(0)(Prelude.id(Prelude.categoryFn))(Data_Int.fromNumber($$Math.round(r$prime)));
                    var g$prime = $$Math.sin(freq * phase + 2.0) * 127.0 + 128.0;
                    var g = Data_Maybe.maybe(0)(Prelude.id(Prelude.categoryFn))(Data_Int.fromNumber($$Math.round(g$prime)));
                    var b$prime = $$Math.sin(freq * phase + 4.0) * 127.0 + 128.0;
                    var b = Data_Maybe.maybe(0)(Prelude.id(Prelude.categoryFn))(Data_Int.fromNumber($$Math.round(b$prime)));
                    return {
                        color: new Color({
                            r: r, 
                            g: g, 
                            b: b
                        }), 
                        phase: (function () {
                            var _89 = phase < 32.0;
                            if (_89) {
                                return phase + 1.0;
                            };
                            if (!_89) {
                                return 0.0;
                            };
                            throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/UI/Canvas.purs line 160, column 5 - line 161, column 5: " + [ _89.constructor.name ]);
                        })()
                    };
                };
            };
            var renderLoop = Utils.getIntervalStream(renderLoopInterval);
            var renderLocalState = function (canvas) {
                return function (ls) {
                    return function (_30) {
                        return function __do() {
                            var _0 = Control_Monad_Eff_Ref.readRef(ls)();
                            return (function () {
                                var x = stepColor(_0.value0.color)(_0.value0.phase);
                                return function __do() {
                                    Control_Monad_Eff_Ref.writeRef(ls)(new LocalState((function () {
                                        var _91 = {};
                                        for (var _92 in _0.value0) {
                                            if (_0.value0.hasOwnProperty(_92)) {
                                                _91[_92] = _0.value0[_92];
                                            };
                                        };
                                        _91.color = x.color;
                                        _91.phase = x.phase;
                                        return _91;
                                    })()))();
                                    return renderCanvas(canvas)(_0.value0.state)(x.color)();
                                };
                            })()();
                        };
                    };
                };
            };
            var pxToCell = function (fieldOffsetLeft) {
                return function (fieldOffsetTop) {
                    return function (_33) {
                        var z = Prelude["<*>"](Data_Maybe.applyMaybe)(Prelude["<$>"](Data_Maybe.functorMaybe)(Data_Tuple.Tuple.create)(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Int.fromNumber)($$Math.floor)((_33.value0 - Data_Int.toNumber(fieldOffsetLeft)) / Data_Int.toNumber(cellSize))))(Prelude["<<<"](Prelude.semigroupoidFn)(Data_Int.fromNumber)($$Math.floor)((_33.value1 - Data_Int.toNumber(fieldOffsetTop)) / Data_Int.toNumber(cellSize)));
                        if (z instanceof Data_Maybe.Just) {
                            return z.value0;
                        };
                        return new Data_Tuple.Tuple(0, 0);
                    };
                };
            };
            var postUpstream = function (_31) {
                return Utils.onNext(outputActionsStream)(new Types.TogglePoint(_31.value1, _31.value0));
            };
            var eventToCoords = function (e) {
                return new Data_Tuple.Tuple(e.pageX, e.pageY);
            };
            var currentGeneration = Core.getCurrentGeneration(state);
            var height = getHeight(currentGeneration);
            var fieldHeight = Prelude["*"](Prelude.semiringInt)(height)(cellSize);
            var width = getWidth(currentGeneration);
            var fieldWidth = Prelude["*"](Prelude.semiringInt)(width)(cellSize);
            var coordsInField = function (fieldOffsetLeft) {
                return function (fieldOffsetTop) {
                    return function (_32) {
                        return Prelude["&&"](Prelude.booleanAlgebraBoolean)(_32.value0 > Data_Int.toNumber(fieldOffsetLeft))(Prelude["&&"](Prelude.booleanAlgebraBoolean)(_32.value0 < Data_Int.toNumber(Prelude["+"](Prelude.semiringInt)(fieldOffsetLeft)(fieldWidth)))(Prelude["&&"](Prelude.booleanAlgebraBoolean)(_32.value1 > Data_Int.toNumber(fieldOffsetTop))(_32.value1 < Data_Int.toNumber(Prelude["+"](Prelude.semiringInt)(fieldOffsetTop)(fieldHeight)))));
                    };
                };
            };
            return function __do() {
                Utils.displayBlock(canvasId)();
                var _4 = Graphics_Canvas.getCanvasElementById(canvasId)();
                if (_4 instanceof Data_Maybe.Just) {
                    var _3 = Utils.getElementOffsetTop("canvas")();
                    var _2 = Utils.getElementOffsetLeft("canvas")();
                    var _1 = Control_Monad_Eff_Ref.newRef(new LocalState({
                        state: state, 
                        color: startColor, 
                        phase: startPhase
                    }))();
                    return (function () {
                        var rawClicksStream = $foreign.fromUiEvent(_4.value0)("click");
                        var pxStream = Prelude["<$>"](Rx_Observable.functorObservable)(eventToCoords)(rawClicksStream);
                        var inputStateStream = Utils.newSubject();
                        var fieldOffsetTop = Prelude["+"](Prelude.semiringInt)(topOffset)(_3);
                        var fieldOffsetLeft = Prelude["+"](Prelude.semiringInt)(leftOffset)(_2);
                        var fieldStream = Rx_Observable.filter(coordsInField(fieldOffsetLeft)(fieldOffsetTop))(pxStream);
                        var cellsClicksStream = Prelude["<$>"](Rx_Observable.functorObservable)(pxToCell(fieldOffsetLeft)(fieldOffsetTop))(fieldStream);
                        return function __do() {
                            Rx_Observable.subscribe(cellsClicksStream)(postUpstream)();
                            Rx_Observable.subscribe(inputStateStream)(function (s) {
                                return Control_Monad_Eff_Ref.modifyRef(_1)(function (_14) {
                                    return new LocalState((function () {
                                        var _114 = {};
                                        for (var _115 in _14.value0) {
                                            if (_14.value0.hasOwnProperty(_115)) {
                                                _114[_115] = _14.value0[_115];
                                            };
                                        };
                                        _114.state = s;
                                        return _114;
                                    })());
                                });
                            })();
                            Rx_Observable.subscribe(renderLoop)(renderLocalState(_4.value0)(_1))();
                            return inputStateStream;
                        };
                    })()();
                };
                throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/UI/Canvas.purs line 98, column 1 - line 101, column 1: " + [ _4.constructor.name ]);
            };
        };
    };
};
module.exports = {
    LocalState: LocalState, 
    Color: Color, 
    getHeight: getHeight, 
    getWidth: getWidth, 
    drawCircle: drawCircle, 
    drawSquare: drawSquare, 
    drawCell: drawCell, 
    drawCells: drawCells, 
    getRandomColor: getRandomColor, 
    drawGrid: drawGrid, 
    drawBorders: drawBorders, 
    drawLabels: drawLabels, 
    drawBackground: drawBackground, 
    renderCanvas: renderCanvas, 
    setupUI: setupUI, 
    startPhase: startPhase, 
    startColor: startColor, 
    renderLoopInterval: renderLoopInterval, 
    freq: freq, 
    labelColor: labelColor, 
    cellColor: cellColor, 
    gridColor: gridColor, 
    borderColor: borderColor, 
    bgColor: bgColor, 
    black: black, 
    white: white, 
    leftOffset: leftOffset, 
    topOffset: topOffset, 
    halfCell: halfCell, 
    cellSize: cellSize, 
    eqColor: eqColor, 
    ordColor: ordColor, 
    semiringColor: semiringColor, 
    ringColor: ringColor, 
    showColor: showColor, 
    fromUiEvent: $foreign.fromUiEvent
};

},{"./foreign":118,"Control.Apply":5,"Control.Monad":36,"Control.Monad.Eff":23,"Control.Monad.Eff.Console":13,"Control.Monad.Eff.Random":17,"Control.Monad.Eff.Ref":19,"Core":39,"DOM":40,"Data":97,"Data.Array":44,"Data.DOM.Simple.Events":52,"Data.DOM.Simple.Types":53,"Data.DOM.Simple.Window":61,"Data.Function":70,"Data.Int":77,"Data.Maybe":81,"Data.Traversable":94,"Data.Tuple":95,"Graphics.Canvas":101,"Math":105,"Prelude":107,"Rx.Observable":116,"Types":117,"Utils":125}],120:[function(require,module,exports){
// module UI.Console

exports.exportGlobal = function (fname) {return function(f) {return function() {window[fname] = f; return {}; } } }

},{}],121:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Core = require("Core");
var Data_Foldable = require("Data.Foldable");
var Prelude = require("Prelude");
var Control_Monad_Eff_Console = require("Control.Monad.Eff.Console");
var Data_Function = require("Data.Function");
var Utils = require("Utils");
var Types = require("Types");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Array = require("Data.Array");
var Data_Tuple = require("Data.Tuple");
var Rx_Observable = require("Rx.Observable");
var setupUI = function (state) {
    return function (actionsStream) {
        return function (_60) {
            var printCells = function (state_1) {
                var toChar = function (_61) {
                    if (_61 instanceof Types.Alive) {
                        return "x";
                    };
                    if (_61 instanceof Types.Dead) {
                        return ".";
                    };
                    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/UI/Console.purs line 36, column 9 - line 38, column 9: " + [ _61.constructor.name ]);
                };
                var foldRow = Data_Foldable.foldl(Data_Foldable.foldableArray)(function (acc) {
                    return function (cell) {
                        return acc + toChar(cell);
                    };
                })("");
                var foldRows = Data_Foldable.foldl(Data_Foldable.foldableArray)(function (acc) {
                    return function (row) {
                        return acc + ("\n" + foldRow(row));
                    };
                })("");
                var currentGeneration = Core.getCurrentGeneration(state_1);
                var charCells = foldRows(currentGeneration);
                return Control_Monad_Eff_Console.log(charCells);
            };
            var vStream = Utils.newSubject();
            return function __do() {
                $foreign.exportGlobal("point")(function (x) {
                    return function (y) {
                        return Utils.onNext(actionsStream)(new Types.Point(x, y));
                    };
                })();
                $foreign.exportGlobal("noPoint")(function (x) {
                    return function (y) {
                        return Utils.onNext(actionsStream)(new Types.NoPoint(x, y));
                    };
                })();
                $foreign.exportGlobal("play")(function (_57) {
                    return function (_56) {
                        return Utils.onNext(actionsStream)(Types.Play.value);
                    };
                })();
                $foreign.exportGlobal("pause")(function (_59) {
                    return function (_58) {
                        return Utils.onNext(actionsStream)(Types.Pause.value);
                    };
                })();
                Rx_Observable.subscribe(vStream)(printCells)();
                return vStream;
            };
        };
    };
};
module.exports = {
    setupUI: setupUI, 
    exportGlobal: $foreign.exportGlobal
};

},{"./foreign":120,"Control.Monad.Eff":23,"Control.Monad.Eff.Console":13,"Core":39,"Data.Array":44,"Data.Foldable":68,"Data.Function":70,"Data.Tuple":95,"Prelude":107,"Rx.Observable":116,"Types":117,"Utils":125}],122:[function(require,module,exports){
// module UI.React

exports.setProps = function (view) { return function(props) { return function(){ return view.setProps(props); } } }

},{}],123:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Utils = require("Utils");
var Data_Function = require("Data.Function");
var React = require("React");
var Core = require("Core");
var React_DOM = require("React.DOM");
var React_DOM_Props = require("React.DOM.Props");
var Data_Array = require("Data.Array");
var Data = require("Data");
var Types = require("Types");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Maybe = require("Data.Maybe");
var Data_Tuple = require("Data.Tuple");
var DOM = require("DOM");
var Rx_Observable = require("Rx.Observable");
var aRender = function ($$this) {
    return function __do() {
        var _14 = React.getProps($$this)();
        return (function () {
            var totalGenerations = Core.getTotalGenerations(_14.state);
            var currentGeneration = Core.getCurrentGeneration(_14.state);
            return Prelude.pure(Control_Monad_Eff.applicativeEff)(React_DOM.div([ React_DOM_Props.className("map") ])([ React_DOM.div([ React_DOM_Props.className("toolbar") ])([ (function () {
                if (_14.state.value0.runningState instanceof Types.Running) {
                    return React_DOM.button([ React_DOM_Props.className("icon-button"), React_DOM_Props.onClick(function (_62) {
                        return Utils.onNext(_14.actionsStream)(Types.Pause.value);
                    }) ])([ React_DOM.text("\u25ae\u25ae") ]);
                };
                if (_14.state.value0.runningState instanceof Types.Paused) {
                    return React_DOM.button([ React_DOM_Props.className("icon-button"), React_DOM_Props.onClick(function (_63) {
                        return Utils.onNext(_14.actionsStream)(Types.Play.value);
                    }) ])([ React_DOM.text("\u25b6") ]);
                };
                throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/UI/React.purs line 42, column 1 - line 101, column 1: " + [ _14.state.value0.runningState.constructor.name ]);
            })(), React_DOM.button([ React_DOM_Props.onClick(function (_64) {
                return Utils.onNext(_14.actionsStream)(Types.Save.value);
            }) ])([ React_DOM.text("Save") ]), React_DOM.span([ React_DOM_Props.className("label") ])([ React_DOM.text("Time elapsed, s: " + Prelude.show(Prelude.showNumber)(_14.state.value0.secondsElapsed)) ]), React_DOM.span([ React_DOM_Props.className("label") ])([ React_DOM.text("Gen/sec: " + Prelude.show(Prelude.showNumber)(_14.state.value0.genRatio)) ]) ]), React_DOM.div([ React_DOM_Props.className("toolbar") ])([ React_DOM.button([ React_DOM_Props.className("icon-button"), React_DOM_Props.onClick(function (_65) {
                return Utils.onNext(_14.actionsStream)(new Types.Rewind(1));
            }) ])([ React_DOM.text("\u25c0\u25c0") ]), React_DOM.button([ React_DOM_Props.className("icon-button"), React_DOM_Props.onClick(function (_66) {
                return Utils.onNext(_14.actionsStream)(new Types.FForward(1));
            }) ])([ React_DOM.text("\u25b6\u25b6") ]), React_DOM.span([ React_DOM_Props.className("label") ])([ React_DOM.text("Current generation: " + (function () {
                if (_14.state.value0.current instanceof Data_Maybe.Nothing) {
                    return "Latest";
                };
                if (_14.state.value0.current instanceof Data_Maybe.Just) {
                    return Prelude.show(Prelude.showInt)(_14.state.value0.current.value0);
                };
                throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/UI/React.purs line 42, column 1 - line 101, column 1: " + [ _14.state.value0.current.constructor.name ]);
            })()) ]), React_DOM.span([ React_DOM_Props.className("label") ])([ React_DOM.text("Total generations: " + Prelude.show(Prelude.showInt)(totalGenerations)) ]) ]), React_DOM.div([ React_DOM_Props.className("toolbar") ])([ React_DOM.span([ React_DOM_Props.style({
                fontSize: "80%"
            }) ])([ React_DOM.span([ React_DOM_Props.className("button-like") ])([ React_DOM.text("Space") ]), React_DOM.text(" - toggle play/pause, "), React_DOM.span([ React_DOM_Props.className("button-like") ])([ React_DOM.text("\u27f5") ]), React_DOM.span([ React_DOM_Props.className("button-like") ])([ React_DOM.text("\u27f6") ]), React_DOM.text(" - navigate generations,"), React_DOM.span([ React_DOM_Props.className("button-like") ])([ React_DOM.text("r") ]), React_DOM.text(" - random generation. Or use buttons above.") ]) ]), React_DOM.table([ React_DOM_Props.style({
                border: "1px solid gray", 
                "margin-top": "10px"
            }) ])([ React_DOM.tbody([  ])(Utils.map_(Prelude.functorArray)(Data_Array.zip(currentGeneration)(Data_Array[".."](0)(Data_Array.length(currentGeneration))))(function (_70) {
                return React_DOM.tr([  ])(Utils.map_(Prelude.functorArray)(Data_Array.zip(_70.value0)(Data_Array[".."](0)(Data_Array.length(_70.value0))))(function (_69) {
                    if (_69.value0 instanceof Types.Alive) {
                        return React_DOM.td([ React_DOM_Props.className("live"), React_DOM_Props.onClick(function (_67) {
                            return Utils.onNext(_14.actionsStream)(new Types.NoPoint(_70.value1, _69.value1));
                        }) ])([  ]);
                    };
                    if (_69.value0 instanceof Types.Dead) {
                        return React_DOM.td([ React_DOM_Props.className("dead"), React_DOM_Props.onClick(function (_68) {
                            return Utils.onNext(_14.actionsStream)(new Types.Point(_70.value1, _69.value1));
                        }) ])([  ]);
                    };
                    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/UI/React.purs line 42, column 1 - line 101, column 1: " + [ _69.value0.constructor.name ]);
                }));
            })) ]) ]));
        })()();
    };
};
var mainView = React.mkUI(React.spec({})(aRender));
var renderMainView = function (targetId) {
    return function (state) {
        return function (actionsStream) {
            return React.renderToElementById(targetId)(mainView({
                actionsStream: actionsStream, 
                state: state
            }));
        };
    };
};
var setupUI = function (initialState) {
    return function (actionsStream) {
        return function (targetId) {
            return function __do() {
                Utils.displayBlock(targetId)();
                var _13 = renderMainView(targetId)(initialState)(actionsStream)();
                return (function () {
                    var vStream = Utils.newSubject();
                    return function __do() {
                        Rx_Observable.subscribe(vStream)(function (s) {
                            return $foreign.setProps(_13)({
                                actionsStream: actionsStream, 
                                state: s
                            });
                        })();
                        return vStream;
                    };
                })()();
            };
        };
    };
};
module.exports = {
    aRender: aRender, 
    mainView: mainView, 
    renderMainView: renderMainView, 
    setupUI: setupUI, 
    setProps: $foreign.setProps
};

},{"./foreign":122,"Control.Monad.Eff":23,"Core":39,"DOM":40,"Data":97,"Data.Array":44,"Data.Function":70,"Data.Maybe":81,"Data.Tuple":95,"Prelude":107,"React":113,"React.DOM":111,"React.DOM.Props":109,"Rx.Observable":116,"Types":117,"Utils":125}],124:[function(require,module,exports){
// module Utils
exports.timeDelta = function (a) { return function(b) { return b - a } }
exports.toFixed = function (x) { return function(n) { return +x.toFixed(n) } }
exports.hex = function (n) {return n.toString(16) }
exports.newSubject = function () { return new Rx.Subject() }
exports.fromEvent = function (ev) { return function() {return Rx.Observable.fromEvent(document.body, ev)} }
exports.getIntervalStream = function (interval) { return Rx.Observable.interval(interval) }
exports.onNext = function (obs){ return function(val) { return function () { return obs.onNext(val); } } }
exports.pausable = function (obs){ return function (pauser) { return obs.pausable(pauser); } }
exports.scan = function (f) {
    return function(seed) {
        return function(ob) {
            return function() {
                return ob.scan(seed, function(acc, value) {
                    return f(value)(acc)();
                });
            };
        };
    };
}
exports.getElementOffsetLeft = function (el){ return function() { return document.getElementById(el).offsetLeft } }
exports.getElementOffsetTop = function (el){ return function() { return document.getElementById(el).offsetTop } }
exports.getParameterByName = function (name) {
    return function() {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }
}
exports.displayBlock = function (elid) {return function() {document.getElementById(elid).style.display = "block"} }
exports.which = function (ev) { return ev.which; }
exports.toHex = function (n) {
  var nybHexString = "0123456789ABCDEF";
  return String(nybHexString.substr((n >> 4) & 0x0F,1)) + nybHexString.substr(n & 0x0F,1);
}

},{}],125:[function(require,module,exports){
// Generated by psc version 0.7.0.0
"use strict";
var $foreign = require("./foreign");
var Prelude = require("Prelude");
var Data_Array = require("Data.Array");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Function = require("Data.Function");
var Data_Maybe = require("Data.Maybe");
var Data_Tuple = require("Data.Tuple");
var DOM = require("DOM");
var Rx_Observable = require("Rx.Observable");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
var Data_Date = require("Data.Date");
var Types = require("Types");
var map_ = Prelude["<#>"];
var updateAt2 = function (y) {
    return function (x) {
        return function (newVal) {
            return function (arr) {
                return map_(Prelude.functorArray)(Data_Array.zip(arr)(Data_Array[".."](0)(Data_Array.length(arr))))(function (_21) {
                    var _75 = Prelude["=="](Prelude.eqInt)(_21.value1)(y);
                    if (_75) {
                        return map_(Prelude.functorArray)(Data_Array.zip(_21.value0)(Data_Array[".."](0)(Data_Array.length(_21.value0))))(function (_20) {
                            var _77 = Prelude["=="](Prelude.eqInt)(_20.value1)(x);
                            if (_77) {
                                return newVal;
                            };
                            if (!_77) {
                                return _20.value0;
                            };
                            throw new Error("Failed pattern match: " + [ _77.constructor.name ]);
                        });
                    };
                    if (!_75) {
                        return _21.value0;
                    };
                    throw new Error("Failed pattern match at /Users/eugene/Dropbox/purescripts/pureGoL/src/Utils.purs line 19, column 1 - line 20, column 1: " + [ _75.constructor.name ]);
                });
            };
        };
    };
};
var getByIndex2 = function (arr) {
    return function (x) {
        return function (y) {
            return Prelude[">>="](Data_Maybe.bindMaybe)(Prelude[">>="](Data_Maybe.bindMaybe)(Prelude["return"](Data_Maybe.applicativeMaybe)(arr))(Prelude.flip(Data_Array["!!"])(x)))(Prelude.flip(Data_Array["!!"])(y));
        };
    };
};
var filter_ = Prelude.flip(Data_Array.filter);
module.exports = {
    getByIndex2: getByIndex2, 
    updateAt2: updateAt2, 
    filter_: filter_, 
    map_: map_, 
    toHex: $foreign.toHex, 
    which: $foreign.which, 
    displayBlock: $foreign.displayBlock, 
    getParameterByName: $foreign.getParameterByName, 
    getElementOffsetTop: $foreign.getElementOffsetTop, 
    getElementOffsetLeft: $foreign.getElementOffsetLeft, 
    scan: $foreign.scan, 
    pausable: $foreign.pausable, 
    onNext: $foreign.onNext, 
    getIntervalStream: $foreign.getIntervalStream, 
    fromEvent: $foreign.fromEvent, 
    newSubject: $foreign.newSubject, 
    hex: $foreign.hex, 
    toFixed: $foreign.toFixed, 
    timeDelta: $foreign.timeDelta
};

},{"./foreign":124,"Control.Monad.Eff":23,"DOM":40,"Data.Array":44,"Data.DOM.Simple.Types":53,"Data.Date":63,"Data.Function":70,"Data.Maybe":81,"Data.Tuple":95,"Prelude":107,"Rx.Observable":116,"Types":117}],126:[function(require,module,exports){
require('Main').main();

},{"Main":103}]},{},[126]);

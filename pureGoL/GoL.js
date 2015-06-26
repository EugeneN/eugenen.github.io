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
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the `Alt` type class.
 */
"use strict";
var Prelude = require("Prelude");

/**
 *  | The `Alt` type class identifies an associative operation on a type
 *  | constructor.  It is similar to `Semigroup`, except that it applies to
 *  | types of kind `* -> *`, like `Array` or `List`, rather than concrete types
 *  | `String` or `Number`.
 *  |
 *  | `Alt` instances are required to satisfy the following laws:
 *  |
 *  | - Associativity: `(x <|> y) <|> z == x <|> (y <|> z)`
 *  | - Distributivity: `f <$> (x <|> y) == (f <$> x) <|> (f <$> y)`
 *  |
 *  | For example, the `Array` (`[]`) type is an instance of `Alt`, where
 *  | `(<|>)` is defined to be concatenation.
 */
var Alt = function ($less$bar$greater, __superclass_Prelude$dotFunctor_0) {
    this["<|>"] = $less$bar$greater;
    this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
};

/**
 *  | The `Alt` type class identifies an associative operation on a type
 *  | constructor.  It is similar to `Semigroup`, except that it applies to
 *  | types of kind `* -> *`, like `Array` or `List`, rather than concrete types
 *  | `String` or `Number`.
 *  |
 *  | `Alt` instances are required to satisfy the following laws:
 *  |
 *  | - Associativity: `(x <|> y) <|> z == x <|> (y <|> z)`
 *  | - Distributivity: `f <$> (x <|> y) == (f <$> x) <|> (f <$> y)`
 *  |
 *  | For example, the `Array` (`[]`) type is an instance of `Alt`, where
 *  | `(<|>)` is defined to be concatenation.
 */
var $less$bar$greater = function (dict) {
    return dict["<|>"];
};
module.exports = {
    Alt: Alt, 
    "<|>": $less$bar$greater
};

},{"Prelude":63}],4:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the `Alternative` type class and associated
 *  | helper functions.
 */
"use strict";
var Prelude = require("Prelude");
var Control_Lazy = require("Control.Lazy");
var Control_Alt = require("Control.Alt");
var Control_Plus = require("Control.Plus");

/**
 *  | The `Alternative` type class has no members of its own; it just specifies
 *  | that the type constructor has both `Applicative` and `Plus` instances.
 *  |
 *  | Types which have `Alternative` instances should also satisfy the following
 *  | laws:
 *  |
 *  | - Distributivity: `(f <|> g) <*> x == (f <*> x) <|> (g <*> x)`
 *  | - Annihilation: `empty <*> f = empty`
 */
var Alternative = function (__superclass_Control$dotPlus$dotPlus_1, __superclass_Prelude$dotApplicative_0) {
    this["__superclass_Control.Plus.Plus_1"] = __superclass_Control$dotPlus$dotPlus_1;
    this["__superclass_Prelude.Applicative_0"] = __superclass_Prelude$dotApplicative_0;
};
var some = function (__dict_Alternative_0) {
    return function (__dict_Lazy1_1) {
        return function (v) {
            return Prelude["<*>"]((__dict_Alternative_0["__superclass_Prelude.Applicative_0"]())["__superclass_Prelude.Apply_0"]())(Prelude["<$>"](((__dict_Alternative_0["__superclass_Control.Plus.Plus_1"]())["__superclass_Control.Alt.Alt_0"]())["__superclass_Prelude.Functor_0"]())(Prelude[":"])(v))(Control_Lazy.defer1(__dict_Lazy1_1)(function (_73) {
                return many(__dict_Alternative_0)(__dict_Lazy1_1)(v);
            }));
        };
    };
};
var many = function (__dict_Alternative_2) {
    return function (__dict_Lazy1_3) {
        return function (v) {
            return Control_Alt["<|>"]((__dict_Alternative_2["__superclass_Control.Plus.Plus_1"]())["__superclass_Control.Alt.Alt_0"]())(some(__dict_Alternative_2)(__dict_Lazy1_3)(v))(Prelude.pure(__dict_Alternative_2["__superclass_Prelude.Applicative_0"]())([  ]));
        };
    };
};
module.exports = {
    Alternative: Alternative, 
    many: many, 
    some: some
};

},{"Control.Alt":3,"Control.Lazy":8,"Control.Plus":23,"Prelude":63}],5:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines helper functions for working with `Apply` instances.
 */
"use strict";
var Prelude = require("Prelude");

/**
 *  | Combine two effectful actions, keeping only the result of the first.
 */
var $less$times = function (__dict_Apply_0) {
    return function (a) {
        return function (b) {
            return Prelude["<*>"](__dict_Apply_0)(Prelude["<$>"](__dict_Apply_0["__superclass_Prelude.Functor_0"]())(Prelude["const"])(a))(b);
        };
    };
};

/**
 *  | Combine two effectful actions, keeping only the result of the second.
 */
var $times$greater = function (__dict_Apply_1) {
    return function (a) {
        return function (b) {
            return Prelude["<*>"](__dict_Apply_1)(Prelude["<$>"](__dict_Apply_1["__superclass_Prelude.Functor_0"]())(Prelude["const"](Prelude.id(Prelude.categoryArr)))(a))(b);
        };
    };
};

/**
 *  | Lift a function of five arguments to a function which accepts and returns
 *  | values wrapped with the type constructor `f`.
 */
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

/**
 *  | Lift a function of four arguments to a function which accepts and returns
 *  | values wrapped with the type constructor `f`.
 */
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

/**
 *  | Lift a function of three arguments to a function which accepts and returns
 *  | values wrapped with the type constructor `f`.
 */
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

/**
 *  | Lift a function of two arguments to a function which accepts and returns
 *  | values wrapped with the type constructor `f`.
 */
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

},{"Prelude":63}],6:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the `Comonad` type class.
 */
"use strict";
var Prelude = require("Prelude");
var Control_Extend = require("Control.Extend");

/**
 *  | `Comonad` extends the `Extend` class with the `extract` function
 *  | which extracts a value, discarding the comonadic context.
 *  |
 *  | `Comonad` is the dual of `Monad`, and `extract` is the dual of 
 *  | `pure` or `return`.
 *  | 
 *  | Laws:
 *  |
 *  | - Left Identity: `extract <<= xs = xs`
 *  | - Right Identity: `extract (f <<= xs) = f xs`
 */
var Comonad = function (__superclass_Control$dotExtend$dotExtend_0, extract) {
    this["__superclass_Control.Extend.Extend_0"] = __superclass_Control$dotExtend$dotExtend_0;
    this.extract = extract;
};

/**
 *  | `Comonad` extends the `Extend` class with the `extract` function
 *  | which extracts a value, discarding the comonadic context.
 *  |
 *  | `Comonad` is the dual of `Monad`, and `extract` is the dual of 
 *  | `pure` or `return`.
 *  | 
 *  | Laws:
 *  |
 *  | - Left Identity: `extract <<= xs = xs`
 *  | - Right Identity: `extract (f <<= xs) = f xs`
 */
var extract = function (dict) {
    return dict.extract;
};
module.exports = {
    Comonad: Comonad, 
    extract: extract
};

},{"Control.Extend":7,"Prelude":63}],7:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the `Extend` type class and associated helper functions.
 */
"use strict";
var Prelude = require("Prelude");

/**
 *  | The `Extend` class defines the extension operator `(<<=)`
 *  | which extends a local context-dependent computation to
 *  | a global computation.
 *  |
 *  | `Extend` is the dual of `Bind`, and `(<<=)` is the dual of 
 *  | `(>>=)`.
 *  |
 *  | Laws:
 *  |
 *  | - Associativity: `extend f <<< extend g = extend (f <<< extend g)`
 */
var Extend = function ($less$less$eq, __superclass_Prelude$dotFunctor_0) {
    this["<<="] = $less$less$eq;
    this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
};

/**
 *  | The `Extend` class defines the extension operator `(<<=)`
 *  | which extends a local context-dependent computation to
 *  | a global computation.
 *  |
 *  | `Extend` is the dual of `Bind`, and `(<<=)` is the dual of 
 *  | `(>>=)`.
 *  |
 *  | Laws:
 *  |
 *  | - Associativity: `extend f <<< extend g = extend (f <<< extend g)`
 */
var $less$less$eq = function (dict) {
    return dict["<<="];
};

/**
 *  | Backwards co-Kleisli composition.
 */
var $eq$less$eq = function (__dict_Extend_0) {
    return function (f) {
        return function (g) {
            return function (w) {
                return f($less$less$eq(__dict_Extend_0)(g)(w));
            };
        };
    };
};

/**
 *  | Forwards co-Kleisli composition.
 */
var $eq$greater$eq = function (__dict_Extend_1) {
    return function (f) {
        return function (g) {
            return function (w) {
                return g($less$less$eq(__dict_Extend_1)(f)(w));
            };
        };
    };
};

/**
 *  | A version of `(<<=)` with its arguments flipped.
 */
var $eq$greater$greater = function (__dict_Extend_2) {
    return function (w) {
        return function (f) {
            return $less$less$eq(__dict_Extend_2)(f)(w);
        };
    };
};
var extendArr = function (__dict_Semigroup_3) {
    return new Extend(function (f) {
        return function (g) {
            return function (w) {
                return f(function (w$prime) {
                    return g(Prelude["<>"](__dict_Semigroup_3)(w)(w$prime));
                });
            };
        };
    }, function () {
        return Prelude.functorArr;
    });
};

/**
 *  | An alias for `(<<=)`.
 */
var extend = function (__dict_Extend_4) {
    return $less$less$eq(__dict_Extend_4);
};

/**
 *  | Duplicate a comonadic context.
 *  |
 *  | `duplicate` is dual to `Control.Bind.join`.
 */
var duplicate = function (__dict_Extend_5) {
    return function (w) {
        return $less$less$eq(__dict_Extend_5)(Prelude.id(Prelude.categoryArr))(w);
    };
};
module.exports = {
    Extend: Extend, 
    duplicate: duplicate, 
    extend: extend, 
    "=<=": $eq$less$eq, 
    "=>=": $eq$greater$eq, 
    "=>>": $eq$greater$greater, 
    "<<=": $less$less$eq, 
    extendArr: extendArr
};

},{"Prelude":63}],8:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the `Lazy` type class and associated
 *  | helper functions.
 */
"use strict";
var Prelude = require("Prelude");

/**
 *  | The `Lazy` class represents types which allow evaluation of values
 *  | to be _deferred_.
 *  |
 *  | Usually, this means that a type contains a function arrow which can
 *  | be used to delay evaluation.
 */
var Lazy = function (defer) {
    this.defer = defer;
};

/**
 *  | A version of `Lazy` for type constructors of one type argument.
 */
var Lazy1 = function (defer1) {
    this.defer1 = defer1;
};

/**
 *  | A version of `Lazy` for type constructors of two type arguments.
 */
var Lazy2 = function (defer2) {
    this.defer2 = defer2;
};

/**
 *  | A version of `Lazy` for type constructors of two type arguments.
 */
var defer2 = function (dict) {
    return dict.defer2;
};

/**
 *  | A version of `fix` for type constructors of two type arguments.
 */
var fix2 = function (__dict_Lazy2_0) {
    return function (f) {
        return defer2(__dict_Lazy2_0)(function (_72) {
            return f(fix2(__dict_Lazy2_0)(f));
        });
    };
};

/**
 *  | A version of `Lazy` for type constructors of one type argument.
 */
var defer1 = function (dict) {
    return dict.defer1;
};

/**
 *  | A version of `fix` for type constructors of one type argument.
 */
var fix1 = function (__dict_Lazy1_1) {
    return function (f) {
        return defer1(__dict_Lazy1_1)(function (_71) {
            return f(fix1(__dict_Lazy1_1)(f));
        });
    };
};

/**
 *  | The `Lazy` class represents types which allow evaluation of values
 *  | to be _deferred_.
 *  |
 *  | Usually, this means that a type contains a function arrow which can
 *  | be used to delay evaluation.
 */
var defer = function (dict) {
    return dict.defer;
};

/**
 *  | `fix` defines a value as the fixed point of a function.
 *  |
 *  | The `Lazy` instance allows us to generate the result lazily.
 */
var fix = function (__dict_Lazy_2) {
    return function (f) {
        return defer(__dict_Lazy_2)(function (_70) {
            return f(fix(__dict_Lazy_2)(f));
        });
    };
};
module.exports = {
    Lazy2: Lazy2, 
    Lazy1: Lazy1, 
    Lazy: Lazy, 
    fix2: fix2, 
    fix1: fix1, 
    fix: fix, 
    defer2: defer2, 
    defer1: defer1, 
    defer: defer
};

},{"Prelude":63}],9:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines an effect, actions and handlers for working
 *  | with Javascript exceptions.
 */
"use strict";
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");

  function showErrorImpl(err) {
    return err.stack || err.toString();
  }
  ;

  function error(msg) {
    return new Error(msg);
  }
  ;

  function message(e) {
    return e.message;
  }
  ;

  function throwException(e) {
    return function() {
      throw e;
    };
  }
  ;

  function catchException(c) {
    return function(t) {
      return function() {
        try {
          return t();
        } catch(e) {
          if (e instanceof Error || Object.prototype.toString.call(e) === '[object Error]') {
            return c(e)();
          } else {
            return c(new Error(e.toString()))();
          }
        }
      };
    };
  }
  ;
var showError = new Prelude.Show(showErrorImpl);
module.exports = {
    catchException: catchException, 
    throwException: throwException, 
    message: message, 
    error: error, 
    showError: showError
};

},{"Control.Monad.Eff":10,"Prelude":63}],10:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");

    function returnE(a) {
      return function() {
        return a;
      };
    }
    ;

    function bindE(a) {
      return function(f) {
        return function() {
          return f(a())();
        };
      };
    }
    ;

    function runPure(f) {
      return f();
    }
    ;

    function untilE(f) {
      return function() {
        while (!f());
        return {};
      };
    }
    ;

    function whileE(f) {
      return function(a) {
        return function() {
          while (f()) {
            a();
          }
          return {};
        };
      };
    }
    ;

    function forE(lo) {
      return function(hi) {
        return function(f) {
          return function() {
            for (var i = lo; i < hi; i++) {
              f(i)();
            }
          };
        };
      };
    }
    ;

    function foreachE(as) {
      return function(f) {
        return function() {
          for (var i = 0; i < as.length; i++) {
            f(as[i])();
          }
        };
      };
    }
    ;
var monadEff = new Prelude.Monad(function () {
    return applicativeEff;
}, function () {
    return bindEff;
});
var bindEff = new Prelude.Bind(bindE, function () {
    return applyEff;
});
var applyEff = new Prelude.Apply(Prelude.ap(monadEff), function () {
    return functorEff;
});
var applicativeEff = new Prelude.Applicative(function () {
    return applyEff;
}, returnE);
var functorEff = new Prelude.Functor(Prelude.liftA1(applicativeEff));
module.exports = {
    foreachE: foreachE, 
    forE: forE, 
    whileE: whileE, 
    untilE: untilE, 
    runPure: runPure, 
    functorEff: functorEff, 
    applyEff: applyEff, 
    applicativeEff: applicativeEff, 
    bindEff: bindEff, 
    monadEff: monadEff
};

},{"Prelude":63}],11:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the `MonadError` type class and its instances.
 */
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

/**
 *  | The `MonadError` type class represents those monads which support errors via
 *  | `throwError` and `catchError`.
 *  |
 *  | - `throwError e` throws the error `e`
 *  | - `catchError x f` calls the error handler `f` if an error is thrown during the
 *  |   evaluation of `x`.
 *  |
 *  | An implementation is provided for `ErrorT`, and for other monad transformers
 *  | defined in this library.
 *  |
 *  | Laws:
 *  |
 *  | - Left zero: `throwError e >>= f = throwError e`
 *  | - Catch: `catchError (throwError e) f = f e`
 *  | - Pure: `catchError (pure a) f = pure a`
 *  | 
 */
var MonadError = function (catchError, throwError) {
    this.catchError = catchError;
    this.throwError = throwError;
};

/**
 *  | The `MonadError` type class represents those monads which support errors via
 *  | `throwError` and `catchError`.
 *  |
 *  | - `throwError e` throws the error `e`
 *  | - `catchError x f` calls the error handler `f` if an error is thrown during the
 *  |   evaluation of `x`.
 *  |
 *  | An implementation is provided for `ErrorT`, and for other monad transformers
 *  | defined in this library.
 *  |
 *  | Laws:
 *  |
 *  | - Left zero: `throwError e >>= f = throwError e`
 *  | - Catch: `catchError (throwError e) f = f e`
 *  | - Pure: `catchError (pure a) f = pure a`
 *  | 
 */
var throwError = function (dict) {
    return dict.throwError;
};
var monadErrorMaybe = new MonadError(function (_250) {
    return function (f) {
        if (_250 instanceof Data_Maybe.Nothing) {
            return f(Prelude.unit);
        };
        if (_250 instanceof Data_Maybe.Just) {
            return new Data_Maybe.Just(_250.value0);
        };
        throw new Error("Failed pattern match");
    };
}, Prelude["const"](Data_Maybe.Nothing.value));
var monadErrorExceptT = function (__dict_Monad_0) {
    return new MonadError(Control_Monad_Except_Trans.catchE(__dict_Monad_0), Control_Monad_Except_Trans.throwE(__dict_Monad_0["__superclass_Prelude.Applicative_0"]()));
};
var monadErrorErrorT = function (__dict_Monad_1) {
    return new MonadError(function (m) {
        return function (h) {
            return Control_Monad_Error_Trans.ErrorT(Prelude[">>="](__dict_Monad_1["__superclass_Prelude.Bind_1"]())(Control_Monad_Error_Trans.runErrorT(m))(function (_25) {
                if (_25 instanceof Data_Either.Left) {
                    return Control_Monad_Error_Trans.runErrorT(h(_25.value0));
                };
                if (_25 instanceof Data_Either.Right) {
                    return Prelude["return"](__dict_Monad_1)(new Data_Either.Right(_25.value0));
                };
                throw new Error("Failed pattern match");
            }));
        };
    }, function (e) {
        return Control_Monad_Error_Trans.ErrorT(Prelude["return"](__dict_Monad_1)(new Data_Either.Left(e)));
    });
};
var monadErrorEither = new MonadError(function (_249) {
    return function (h) {
        if (_249 instanceof Data_Either.Left) {
            return h(_249.value0);
        };
        if (_249 instanceof Data_Either.Right) {
            return new Data_Either.Right(_249.value0);
        };
        throw new Error("Failed pattern match");
    };
}, Data_Either.Left.create);

/**
 *  | The `MonadError` type class represents those monads which support errors via
 *  | `throwError` and `catchError`.
 *  |
 *  | - `throwError e` throws the error `e`
 *  | - `catchError x f` calls the error handler `f` if an error is thrown during the
 *  |   evaluation of `x`.
 *  |
 *  | An implementation is provided for `ErrorT`, and for other monad transformers
 *  | defined in this library.
 *  |
 *  | Laws:
 *  |
 *  | - Left zero: `throwError e >>= f = throwError e`
 *  | - Catch: `catchError (throwError e) f = f e`
 *  | - Pure: `catchError (pure a) f = pure a`
 *  | 
 */
var catchError = function (dict) {
    return dict.catchError;
};

/**
 *  | This function allows you to provide a predicate for selecting the
 *  | exceptions that you're interested in, and handle only those exceptons.
 *  | If the inner computation throws an exception, and the predicate returns
 *  | Nothing, then the whole computation will still fail with that exception.
 */
var catchJust = function (__dict_MonadError_2) {
    return function (p) {
        return function (act) {
            return function (handler) {
                var handle = function (e) {
                    var _948 = p(e);
                    if (_948 instanceof Data_Maybe.Nothing) {
                        return throwError(__dict_MonadError_2)(e);
                    };
                    if (_948 instanceof Data_Maybe.Just) {
                        return handler(_948.value0);
                    };
                    throw new Error("Failed pattern match");
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

},{"Control.Monad.Error":13,"Control.Monad.Error.Trans":12,"Control.Monad.Except.Trans":14,"Control.Monad.Maybe.Trans":15,"Control.Monad.Reader.Trans":16,"Control.Monad.State.Trans":18,"Control.Monad.Trans":19,"Control.Monad.Writer.Trans":20,"Data.Either":36,"Data.Maybe":42,"Data.Monoid":48,"Prelude":63}],12:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the error monad transformer, `ErrorT`.
 */
"use strict";
var Prelude = require("Prelude");
var Control_Apply = require("Control.Apply");
var Control_Monad_Error = require("Control.Monad.Error");
var Control_Alt = require("Control.Alt");
var Control_Alternative = require("Control.Alternative");
var Control_Plus = require("Control.Plus");
var Control_Monad_Trans = require("Control.Monad.Trans");
var Control_MonadPlus = require("Control.MonadPlus");
var Data_Either = require("Data.Either");
var Data_Monoid = require("Data.Monoid");
var Data_Tuple = require("Data.Tuple");

/**
 *  | The error monad transformer
 *  |
 *  | This monad transformer extends the base monad with the ability to throw and handle 
 *  | errors.
 *  |
 *  | The `MonadError` type class describes the operations supported by this monad.
 */
var ErrorT = function (x) {
    return x;
};

/**
 *  | Run a computation in the `ErrorT` monad.
 */
var runErrorT = function (_231) {
    return _231;
};
var monadTransErrorT = new Control_Monad_Trans.MonadTrans(function (__dict_Monad_2) {
    return function (m) {
        return ErrorT(Prelude[">>="](__dict_Monad_2["__superclass_Prelude.Bind_1"]())(m)(function (_11) {
            return Prelude["return"](__dict_Monad_2)(new Data_Either.Right(_11));
        }));
    };
});

/**
 *  | Change the error and result types in an `ErrorT` monad action.
 */
var mapErrorT = function (f) {
    return function (m) {
        return ErrorT(f(runErrorT(m)));
    };
};
var liftPassError = function (__dict_Monad_6) {
    return function (pass) {
        return mapErrorT(function (m) {
            return pass(Prelude[">>="](__dict_Monad_6["__superclass_Prelude.Bind_1"]())(m)(function (_13) {
                return Prelude["return"](__dict_Monad_6)((function () {
                    if (_13 instanceof Data_Either.Left) {
                        return new Data_Tuple.Tuple(new Data_Either.Left(_13.value0), Prelude.id(Prelude.categoryArr));
                    };
                    if (_13 instanceof Data_Either.Right) {
                        return new Data_Tuple.Tuple(new Data_Either.Right(_13.value0.value0), _13.value0.value1);
                    };
                    throw new Error("Failed pattern match");
                })());
            }));
        });
    };
};
var liftListenError = function (__dict_Monad_7) {
    return function (listen) {
        return mapErrorT(function (m) {
            return Prelude[">>="](__dict_Monad_7["__superclass_Prelude.Bind_1"]())(listen(m))(function (_12) {
                return Prelude["return"](__dict_Monad_7)(Prelude["<$>"](Data_Either.functorEither)(function (r) {
                    return new Data_Tuple.Tuple(r, _12.value1);
                })(_12.value0));
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
var functorErrorT = function (__dict_Functor_8) {
    return new Prelude.Functor(function (f) {
        return Prelude["<<<"](Prelude.semigroupoidArr)(ErrorT)(Prelude["<<<"](Prelude.semigroupoidArr)(Prelude["<$>"](__dict_Functor_8)(Prelude["<$>"](Data_Either.functorEither)(f)))(runErrorT));
    });
};
var applyErrorT = function (__dict_Apply_10) {
    return new Prelude.Apply(function (_232) {
        return function (_233) {
            return ErrorT(Prelude["<*>"](__dict_Apply_10)(Prelude["<$>"](__dict_Apply_10["__superclass_Prelude.Functor_0"]())(Control_Apply.lift2(Data_Either.applyEither)(Prelude["$"]))(_232))(_233));
        };
    }, function () {
        return functorErrorT(__dict_Apply_10["__superclass_Prelude.Functor_0"]());
    });
};
var bindErrorT = function (__dict_Monad_9) {
    return new Prelude.Bind(function (m) {
        return function (f) {
            return ErrorT(Prelude[">>="](__dict_Monad_9["__superclass_Prelude.Bind_1"]())(runErrorT(m))(function (_10) {
                if (_10 instanceof Data_Either.Left) {
                    return Prelude["return"](__dict_Monad_9)(new Data_Either.Left(_10.value0));
                };
                if (_10 instanceof Data_Either.Right) {
                    return runErrorT(f(_10.value0));
                };
                throw new Error("Failed pattern match");
            }));
        };
    }, function () {
        return applyErrorT((__dict_Monad_9["__superclass_Prelude.Applicative_0"]())["__superclass_Prelude.Apply_0"]());
    });
};
var applicativeErrorT = function (__dict_Applicative_11) {
    return new Prelude.Applicative(function () {
        return applyErrorT(__dict_Applicative_11["__superclass_Prelude.Apply_0"]());
    }, function (a) {
        return ErrorT(Prelude.pure(__dict_Applicative_11)(new Data_Either.Right(a)));
    });
};
var monadErrorT = function (__dict_Monad_5) {
    return new Prelude.Monad(function () {
        return applicativeErrorT(__dict_Monad_5["__superclass_Prelude.Applicative_0"]());
    }, function () {
        return bindErrorT(__dict_Monad_5);
    });
};
var altErrorT = function (__dict_Monad_14) {
    return new Control_Alt.Alt(function (x) {
        return function (y) {
            return ErrorT(Prelude[">>="](__dict_Monad_14["__superclass_Prelude.Bind_1"]())(runErrorT(x))(function (e) {
                if (e instanceof Data_Either.Left) {
                    return runErrorT(y);
                };
                return Prelude["return"](__dict_Monad_14)(e);
            }));
        };
    }, function () {
        return functorErrorT(((__dict_Monad_14["__superclass_Prelude.Applicative_0"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]());
    });
};
var plusErrorT = function (__dict_Monad_0) {
    return function (__dict_Error_1) {
        return new Control_Plus.Plus(function () {
            return altErrorT(__dict_Monad_0);
        }, Prelude["return"](__dict_Monad_0)(Data_Either.Left.create(Control_Monad_Error.strMsg(__dict_Error_1)("No alternative"))));
    };
};
var alternativeErrorT = function (__dict_Monad_12) {
    return function (__dict_Error_13) {
        return new Control_Alternative.Alternative(function () {
            return plusErrorT(__dict_Monad_12)(__dict_Error_13);
        }, function () {
            return applicativeErrorT(__dict_Monad_12["__superclass_Prelude.Applicative_0"]());
        });
    };
};
var monadPlusErrorT = function (__dict_Monad_3) {
    return function (__dict_Error_4) {
        return new Control_MonadPlus.MonadPlus(function () {
            return alternativeErrorT(__dict_Monad_3)(__dict_Error_4);
        }, function () {
            return monadErrorT(__dict_Monad_3);
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
    monadPlusErrorT: monadPlusErrorT, 
    monadTransErrorT: monadTransErrorT
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Apply":5,"Control.Monad.Error":13,"Control.Monad.Trans":19,"Control.MonadPlus":22,"Control.Plus":23,"Data.Either":36,"Data.Monoid":48,"Data.Tuple":53,"Prelude":63}],13:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the `Error` type class, which is used with the error monad
 *  | transformer, `ErrorT`.
 */
"use strict";
var Prelude = require("Prelude");

/**
 *  | The `Error` type class represents _error_ types, which can be 
 *  | constructed from error message strings.
 */
var $$Error = function (noMsg, strMsg) {
    this.noMsg = noMsg;
    this.strMsg = strMsg;
};

/**
 *  | The `Error` type class represents _error_ types, which can be 
 *  | constructed from error message strings.
 */
var strMsg = function (dict) {
    return dict.strMsg;
};

/**
 *  | The `Error` type class represents _error_ types, which can be 
 *  | constructed from error message strings.
 */
var noMsg = function (dict) {
    return dict.noMsg;
};
var errorString = new $$Error("", Prelude.id(Prelude.categoryArr));
module.exports = {
    "Error": $$Error, 
    strMsg: strMsg, 
    noMsg: noMsg, 
    errorString: errorString
};

},{"Prelude":63}],14:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Data_Either = require("Data.Either");
var Data_Monoid = require("Data.Monoid");
var Control_Alt = require("Control.Alt");
var Control_Plus = require("Control.Plus");
var Control_Alternative = require("Control.Alternative");
var Control_MonadPlus = require("Control.MonadPlus");

/**
 *  | A monad transformer which adds exceptions to other monads, in the same way
 *  | as `Except`. As before, `e` is the type of exceptions, and `a` is the type
 *  | of successful results. The new type parameter `m` is the inner monad that
 *  | computations run in.
 */
var ExceptT = function (x) {
    return x;
};

/**
 *  | Throw an exception in an `ExceptT` computation.
 */
var throwE = function (__dict_Applicative_0) {
    return Prelude["<<<"](Prelude.semigroupoidArr)(ExceptT)(Prelude["<<<"](Prelude.semigroupoidArr)(Prelude.pure(__dict_Applicative_0))(Data_Either.Left.create));
};

/**
 *  | The inverse of `ExceptT`. Run a computation in the `ExceptT` monad.
 */
var runExceptT = function (_118) {
    return _118;
};

/**
 *  | Transform any exceptions thrown by an `ExceptT` computation using the given function.
 */
var withExceptT = function (__dict_Functor_1) {
    return function (f) {
        var mapLeft = function (f_1) {
            return function (_119) {
                if (_119 instanceof Data_Either.Right) {
                    return new Data_Either.Right(_119.value0);
                };
                if (_119 instanceof Data_Either.Left) {
                    return new Data_Either.Left(f_1(_119.value0));
                };
                throw new Error("Failed pattern match");
            };
        };
        return Prelude["<<<"](Prelude.semigroupoidArr)(ExceptT)(Prelude["<<<"](Prelude.semigroupoidArr)(Prelude["<$>"](__dict_Functor_1)(mapLeft(f)))(runExceptT));
    };
};

/**
 *  | Transform the unwrapped computation using the given function.
 */
var mapExceptT = function (f) {
    return function (m) {
        return f(runExceptT(m));
    };
};
var functorExceptT = function (__dict_Functor_7) {
    return new Prelude.Functor(function (f) {
        return mapExceptT(Prelude["<$>"](__dict_Functor_7)(Prelude["<$>"](Data_Either.functorEither)(f)));
    });
};

/**
 *  | Catch an exception in an `ExceptT` computation.
 */
var catchE = function (__dict_Monad_8) {
    return function (m) {
        return function (handler) {
            return Prelude[">>="](__dict_Monad_8["__superclass_Prelude.Bind_1"]())(runExceptT(m))(Data_Either.either(Prelude["<<<"](Prelude.semigroupoidArr)(runExceptT)(handler))(Prelude["<<<"](Prelude.semigroupoidArr)(Prelude.pure(__dict_Monad_8["__superclass_Prelude.Applicative_0"]()))(Data_Either.Right.create)));
        };
    };
};
var applyExceptT = function (__dict_Apply_10) {
    return new Prelude.Apply(function (_120) {
        return function (_121) {
            var f$prime = Prelude["<$>"](__dict_Apply_10["__superclass_Prelude.Functor_0"]())(Prelude["<*>"](Data_Either.applyEither))(_120);
            var x$prime = Prelude["<*>"](__dict_Apply_10)(f$prime)(_121);
            return x$prime;
        };
    }, function () {
        return functorExceptT(__dict_Apply_10["__superclass_Prelude.Functor_0"]());
    });
};
var bindExceptT = function (__dict_Monad_9) {
    return new Prelude.Bind(function (m) {
        return function (k) {
            return Prelude[">>="](__dict_Monad_9["__superclass_Prelude.Bind_1"]())(runExceptT(m))(Data_Either.either(Prelude["<<<"](Prelude.semigroupoidArr)(Prelude["return"](__dict_Monad_9))(Data_Either.Left.create))(Prelude["<<<"](Prelude.semigroupoidArr)(runExceptT)(k)));
        };
    }, function () {
        return applyExceptT((__dict_Monad_9["__superclass_Prelude.Applicative_0"]())["__superclass_Prelude.Apply_0"]());
    });
};
var applicativeExceptT = function (__dict_Applicative_11) {
    return new Prelude.Applicative(function () {
        return applyExceptT(__dict_Applicative_11["__superclass_Prelude.Apply_0"]());
    }, Prelude["<<<"](Prelude.semigroupoidArr)(ExceptT)(Prelude["<<<"](Prelude.semigroupoidArr)(Prelude.pure(__dict_Applicative_11))(Data_Either.Right.create)));
};
var monadExceptT = function (__dict_Monad_6) {
    return new Prelude.Monad(function () {
        return applicativeExceptT(__dict_Monad_6["__superclass_Prelude.Applicative_0"]());
    }, function () {
        return bindExceptT(__dict_Monad_6);
    });
};
var altExceptT = function (__dict_Semigroup_14) {
    return function (__dict_Monad_15) {
        return new Control_Alt.Alt(function (m) {
            return function (n) {
                return ExceptT(Prelude[">>="](__dict_Monad_15["__superclass_Prelude.Bind_1"]())(runExceptT(m))(function (_9) {
                    if (_9 instanceof Data_Either.Right) {
                        return Prelude.pure(__dict_Monad_15["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(_9.value0));
                    };
                    if (_9 instanceof Data_Either.Left) {
                        return Prelude[">>="](__dict_Monad_15["__superclass_Prelude.Bind_1"]())(runExceptT(n))(function (_8) {
                            if (_8 instanceof Data_Either.Right) {
                                return Prelude.pure(__dict_Monad_15["__superclass_Prelude.Applicative_0"]())(new Data_Either.Right(_8.value0));
                            };
                            if (_8 instanceof Data_Either.Left) {
                                return Prelude.pure(__dict_Monad_15["__superclass_Prelude.Applicative_0"]())(new Data_Either.Left(Prelude["<>"](__dict_Semigroup_14)(_9.value0)(_8.value0)));
                            };
                            throw new Error("Failed pattern match");
                        });
                    };
                    throw new Error("Failed pattern match");
                }));
            };
        }, function () {
            return functorExceptT(((__dict_Monad_15["__superclass_Prelude.Applicative_0"]())["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]());
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
var alternativeExceptT = function (__dict_Monoid_12) {
    return function (__dict_Monad_13) {
        return new Control_Alternative.Alternative(function () {
            return plusExceptT(__dict_Monoid_12)(__dict_Monad_13);
        }, function () {
            return applicativeExceptT(__dict_Monad_13["__superclass_Prelude.Applicative_0"]());
        });
    };
};
var monadPlusExceptT = function (__dict_Monoid_4) {
    return function (__dict_Monad_5) {
        return new Control_MonadPlus.MonadPlus(function () {
            return alternativeExceptT(__dict_Monoid_4)(__dict_Monad_5);
        }, function () {
            return monadExceptT(__dict_Monad_5);
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
    altExceptT: altExceptT, 
    plusExceptT: plusExceptT, 
    alternativeExceptT: alternativeExceptT, 
    monadPlusExceptT: monadPlusExceptT
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.MonadPlus":22,"Control.Plus":23,"Data.Either":36,"Data.Monoid":48,"Prelude":63}],15:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the `MaybeT` monad transformer.
 */
"use strict";
var Prelude = require("Prelude");
var Control_Alt = require("Control.Alt");
var Control_Plus = require("Control.Plus");
var Control_Alternative = require("Control.Alternative");
var Control_Monad = require("Control.Monad");
var Control_Monad_Trans = require("Control.Monad.Trans");
var Control_MonadPlus = require("Control.MonadPlus");
var Data_Either = require("Data.Either");
var Data_Maybe = require("Data.Maybe");
var Data_Tuple = require("Data.Tuple");

/**
 *  | The `MaybeT` monad transformer.
 *  |
 *  | This monad transformer extends the base monad, supporting failure and alternation via
 *  | the `MonadPlus` type class.
 */
var MaybeT = function (x) {
    return x;
};

/**
 *  | Run a computation in the `MaybeT` monad.
 */
var runMaybeT = function (_234) {
    return _234;
};
var monadTransMaybeT = new Control_Monad_Trans.MonadTrans(function (__dict_Monad_1) {
    return Prelude["<<<"](Prelude.semigroupoidArr)(MaybeT)(Prelude.liftM1(__dict_Monad_1)(Data_Maybe.Just.create));
});

/**
 *  | Change the result type of a `MaybeT` monad action.
 */
var mapMaybeT = function (f) {
    return Prelude["<<<"](Prelude.semigroupoidArr)(MaybeT)(Prelude["<<<"](Prelude.semigroupoidArr)(f)(runMaybeT));
};
var liftPassMaybe = function (__dict_Monad_4) {
    return function (pass) {
        return mapMaybeT(function (m) {
            return pass(Prelude[">>="](__dict_Monad_4["__superclass_Prelude.Bind_1"]())(m)(function (_17) {
                return Prelude["return"](__dict_Monad_4)((function () {
                    if (_17 instanceof Data_Maybe.Nothing) {
                        return new Data_Tuple.Tuple(Data_Maybe.Nothing.value, Prelude.id(Prelude.categoryArr));
                    };
                    if (_17 instanceof Data_Maybe.Just) {
                        return new Data_Tuple.Tuple(new Data_Maybe.Just(_17.value0.value0), _17.value0.value1);
                    };
                    throw new Error("Failed pattern match");
                })());
            }));
        });
    };
};
var liftListenMaybe = function (__dict_Monad_5) {
    return function (listen) {
        return mapMaybeT(function (m) {
            return Prelude[">>="](__dict_Monad_5["__superclass_Prelude.Bind_1"]())(listen(m))(function (_16) {
                return Prelude["return"](__dict_Monad_5)(Prelude["<$>"](Data_Maybe.functorMaybe)(function (r) {
                    return new Data_Tuple.Tuple(r, _16.value1);
                })(_16.value0));
            });
        });
    };
};
var liftCatchMaybe = function ($$catch) {
    return function (m) {
        return function (h) {
            return MaybeT($$catch(runMaybeT(m))(Prelude["<<<"](Prelude.semigroupoidArr)(runMaybeT)(h)));
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
var monadMaybeT = function (__dict_Monad_3) {
    return new Prelude.Monad(function () {
        return applicativeMaybeT(__dict_Monad_3);
    }, function () {
        return bindMaybeT(__dict_Monad_3);
    });
};
var functorMaybeT = function (__dict_Monad_6) {
    return new Prelude.Functor(Prelude.liftA1(applicativeMaybeT(__dict_Monad_6)));
};
var bindMaybeT = function (__dict_Monad_7) {
    return new Prelude.Bind(function (x) {
        return function (f) {
            return MaybeT(Prelude[">>="](__dict_Monad_7["__superclass_Prelude.Bind_1"]())(runMaybeT(x))(function (_14) {
                if (_14 instanceof Data_Maybe.Nothing) {
                    return Prelude["return"](__dict_Monad_7)(Data_Maybe.Nothing.value);
                };
                if (_14 instanceof Data_Maybe.Just) {
                    return runMaybeT(f(_14.value0));
                };
                throw new Error("Failed pattern match");
            }));
        };
    }, function () {
        return applyMaybeT(__dict_Monad_7);
    });
};
var applyMaybeT = function (__dict_Monad_8) {
    return new Prelude.Apply(Prelude.ap(monadMaybeT(__dict_Monad_8)), function () {
        return functorMaybeT(__dict_Monad_8);
    });
};
var applicativeMaybeT = function (__dict_Monad_9) {
    return new Prelude.Applicative(function () {
        return applyMaybeT(__dict_Monad_9);
    }, Prelude["<<<"](Prelude.semigroupoidArr)(MaybeT)(Prelude["<<<"](Prelude.semigroupoidArr)(Prelude.pure(__dict_Monad_9["__superclass_Prelude.Applicative_0"]()))(Data_Maybe.Just.create)));
};
var altMaybeT = function (__dict_Monad_11) {
    return new Control_Alt.Alt(function (m1) {
        return function (m2) {
            return Prelude[">>="](__dict_Monad_11["__superclass_Prelude.Bind_1"]())(runMaybeT(m1))(function (_15) {
                if (_15 instanceof Data_Maybe.Nothing) {
                    return runMaybeT(m2);
                };
                return Prelude["return"](__dict_Monad_11)(_15);
            });
        };
    }, function () {
        return functorMaybeT(__dict_Monad_11);
    });
};
var plusMaybeT = function (__dict_Monad_0) {
    return new Control_Plus.Plus(function () {
        return altMaybeT(__dict_Monad_0);
    }, Prelude.pure(__dict_Monad_0["__superclass_Prelude.Applicative_0"]())(Data_Maybe.Nothing.value));
};
var alternativeMaybeT = function (__dict_Monad_10) {
    return new Control_Alternative.Alternative(function () {
        return plusMaybeT(__dict_Monad_10);
    }, function () {
        return applicativeMaybeT(__dict_Monad_10);
    });
};
var monadPlusMaybeT = function (__dict_Monad_2) {
    return new Control_MonadPlus.MonadPlus(function () {
        return alternativeMaybeT(__dict_Monad_2);
    }, function () {
        return monadMaybeT(__dict_Monad_2);
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
    monadPlusMaybeT: monadPlusMaybeT
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Monad":21,"Control.Monad.Trans":19,"Control.MonadPlus":22,"Control.Plus":23,"Data.Either":36,"Data.Maybe":42,"Data.Tuple":53,"Prelude":63}],16:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the reader monad transformer, `ReaderT`.
 */
"use strict";
var Prelude = require("Prelude");
var Control_Alt = require("Control.Alt");
var Control_Plus = require("Control.Plus");
var Control_Alternative = require("Control.Alternative");
var Control_Monad_Trans = require("Control.Monad.Trans");
var Control_MonadPlus = require("Control.MonadPlus");

/**
 *  | The reader monad transformer.
 *  | 
 *  | This monad transformer extends the base monad transformer with a _global context_ of
 *  | type `r`.
 *  |
 *  | The `MonadReader` type class describes the operations supported by this monad.
 */
var ReaderT = function (x) {
    return x;
};

/**
 *  | Run a computation in the `ReaderT` monad.
 */
var runReaderT = function (_75) {
    return _75;
};

/**
 *  | Change the type of the context in a `ReaderT` monad action.
 */
var withReaderT = function (f) {
    return function (m) {
        return ReaderT(Prelude["<<<"](Prelude.semigroupoidArr)(runReaderT(m))(f));
    };
};

/**
 *  | Change the type of the result in a `ReaderT` monad action.
 */
var mapReaderT = function (f) {
    return function (m) {
        return ReaderT(Prelude["<<<"](Prelude.semigroupoidArr)(f)(runReaderT(m)));
    };
};
var liftReaderT = function (m) {
    return Prelude["const"](m);
};
var monadTransReaderT = new Control_Monad_Trans.MonadTrans(function (__dict_Monad_2) {
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
var functorReaderT = function (__dict_Functor_4) {
    return new Prelude.Functor(function (f) {
        return mapReaderT(Prelude["<$>"](__dict_Functor_4)(f));
    });
};
var applyReaderT = function (__dict_Applicative_6) {
    return new Prelude.Apply(function (f) {
        return function (v) {
            return function (r) {
                return Prelude["<*>"](__dict_Applicative_6["__superclass_Prelude.Apply_0"]())(runReaderT(f)(r))(runReaderT(v)(r));
            };
        };
    }, function () {
        return functorReaderT((__dict_Applicative_6["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]());
    });
};
var bindReaderT = function (__dict_Monad_5) {
    return new Prelude.Bind(function (m) {
        return function (k) {
            return function (r) {
                return Prelude[">>="](__dict_Monad_5["__superclass_Prelude.Bind_1"]())(runReaderT(m)(r))(function (_7) {
                    return runReaderT(k(_7))(r);
                });
            };
        };
    }, function () {
        return applyReaderT(__dict_Monad_5["__superclass_Prelude.Applicative_0"]());
    });
};
var applicativeReaderT = function (__dict_Applicative_7) {
    return new Prelude.Applicative(function () {
        return applyReaderT(__dict_Applicative_7);
    }, Prelude["<<<"](Prelude.semigroupoidArr)(liftReaderT)(Prelude.pure(__dict_Applicative_7)));
};
var monadReaderT = function (__dict_Monad_0) {
    return new Prelude.Monad(function () {
        return applicativeReaderT(__dict_Monad_0["__superclass_Prelude.Applicative_0"]());
    }, function () {
        return bindReaderT(__dict_Monad_0);
    });
};
var altReaderT = function (__dict_Alt_9) {
    return new Control_Alt.Alt(function (m) {
        return function (n) {
            return function (r) {
                return Control_Alt["<|>"](__dict_Alt_9)(runReaderT(m)(r))(runReaderT(n)(r));
            };
        };
    }, function () {
        return functorReaderT(__dict_Alt_9["__superclass_Prelude.Functor_0"]());
    });
};
var plusReaderT = function (__dict_Plus_3) {
    return new Control_Plus.Plus(function () {
        return altReaderT(__dict_Plus_3["__superclass_Control.Alt.Alt_0"]());
    }, liftReaderT(Control_Plus.empty(__dict_Plus_3)));
};
var alternativeReaderT = function (__dict_Alternative_8) {
    return new Control_Alternative.Alternative(function () {
        return plusReaderT(__dict_Alternative_8["__superclass_Control.Plus.Plus_1"]());
    }, function () {
        return applicativeReaderT(__dict_Alternative_8["__superclass_Prelude.Applicative_0"]());
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
    monadTransReaderT: monadTransReaderT
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Monad.Trans":19,"Control.MonadPlus":22,"Control.Plus":23,"Prelude":63}],17:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Control_Monad_Eff = require("Control.Monad.Eff");
var Prelude = require("Prelude");

    function newSTRef(val) {
      return function() {
        return { value: val };
      };
    }
    ;

    function readSTRef(ref) {
      return function() {
        return ref.value;
      };
    }
    ;

    function modifySTRef(ref) {
      return function(f) {
        return function() {
          return ref.value = f(ref.value);
        };
      };
    }
    ;

    function writeSTRef(ref) {
      return function(a) {
        return function() {
          return ref.value = a;
        };
      };
    }
    ;

    function runST(f) {
      return f;
    }
    ;

/**
 *  | A convenience function which combines `runST` with `runPure`, which can be used when the only required effect is `ST`.
 *  |
 *  | Note: since this function has a rank-2 type, it may cause problems to apply this function using the `$` operator. The recommended approach
 *  | is to use parentheses instead.
 */
var pureST = function (st) {
    return Control_Monad_Eff.runPure(runST(st));
};
module.exports = {
    pureST: pureST, 
    runST: runST, 
    writeSTRef: writeSTRef, 
    modifySTRef: modifySTRef, 
    readSTRef: readSTRef, 
    newSTRef: newSTRef
};

},{"Control.Monad.Eff":10,"Prelude":63}],18:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the state monad transformer, `StateT`.
 */
"use strict";
var Prelude = require("Prelude");
var Data_Tuple = require("Data.Tuple");
var Control_Alt = require("Control.Alt");
var Control_Plus = require("Control.Plus");
var Control_Alternative = require("Control.Alternative");
var Control_Monad_Trans = require("Control.Monad.Trans");
var Control_MonadPlus = require("Control.MonadPlus");
var Control_Lazy = require("Control.Lazy");

/**
 *  | The state monad transformer.
 *  |
 *  | This monad transformer extends the base monad with the operations `get` 
 *  | and `put` which can be used to model a single piece of mutable state.
 *  |
 *  | The `MonadState` type class describes the operations supported by this monad.
 */
var StateT = function (x) {
    return x;
};

/**
 *  | Run a computation in the `StateT` monad.
 */
var runStateT = function (_243) {
    return _243;
};

/**
 *  | Modify the final state in a `StateT` monad action.
 */
var withStateT = function (f) {
    return function (s) {
        return StateT(Prelude["<<<"](Prelude.semigroupoidArr)(runStateT(s))(f));
    };
};
var monadTransStateT = new Control_Monad_Trans.MonadTrans(function (__dict_Monad_2) {
    return function (m) {
        return function (s) {
            return Prelude[">>="](__dict_Monad_2["__superclass_Prelude.Bind_1"]())(m)(function (_19) {
                return Prelude["return"](__dict_Monad_2)(new Data_Tuple.Tuple(_19, s));
            });
        };
    };
});

/**
 *  | Change the result type in a `StateT` monad action.
 */
var mapStateT = function (f) {
    return function (m) {
        return StateT(Prelude["<<<"](Prelude.semigroupoidArr)(f)(runStateT(m)));
    };
};
var liftPassState = function (__dict_Monad_5) {
    return function (pass) {
        return function (m) {
            return StateT(function (s) {
                return pass(Prelude[">>="](__dict_Monad_5["__superclass_Prelude.Bind_1"]())(runStateT(m)(s))(function (_21) {
                    return Prelude["return"](__dict_Monad_5)(new Data_Tuple.Tuple(new Data_Tuple.Tuple(_21.value0.value0, _21.value1), _21.value0.value1));
                }));
            });
        };
    };
};
var liftListenState = function (__dict_Monad_6) {
    return function (listen) {
        return function (m) {
            return StateT(function (s) {
                return Prelude[">>="](__dict_Monad_6["__superclass_Prelude.Bind_1"]())(listen(runStateT(m)(s)))(function (_20) {
                    return Prelude["return"](__dict_Monad_6)(new Data_Tuple.Tuple(new Data_Tuple.Tuple(_20.value0.value0, _20.value1), _20.value0.value1));
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
                    return StateT(function (_242) {
                        return c(new Data_Tuple.Tuple(a, s));
                    });
                }))(s);
            });
        });
    };
};
var lazy1StateT = new Control_Lazy.Lazy1(function (f) {
    return StateT(function (s) {
        return runStateT(f(Prelude.unit))(s);
    });
});

/**
 *  | Run a computation in the `StateT` monad discarding the result.
 */
var execStateT = function (__dict_Apply_8) {
    return function (m) {
        return function (s) {
            return Prelude["<$>"](__dict_Apply_8["__superclass_Prelude.Functor_0"]())(Data_Tuple.snd)(runStateT(m)(s));
        };
    };
};

/**
 *  | Run a computation in the `StateT` monad, discarding the final state.
 */
var evalStateT = function (__dict_Apply_9) {
    return function (m) {
        return function (s) {
            return Prelude["<$>"](__dict_Apply_9["__superclass_Prelude.Functor_0"]())(Data_Tuple.fst)(runStateT(m)(s));
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
var functorStateT = function (__dict_Monad_7) {
    return new Prelude.Functor(Prelude.liftM1(monadStateT(__dict_Monad_7)));
};
var bindStateT = function (__dict_Monad_10) {
    return new Prelude.Bind(function (_244) {
        return function (f) {
            return function (s) {
                return Prelude[">>="](__dict_Monad_10["__superclass_Prelude.Bind_1"]())(_244(s))(function (_18) {
                    return runStateT(f(_18.value0))(_18.value1);
                });
            };
        };
    }, function () {
        return applyStateT(__dict_Monad_10);
    });
};
var applyStateT = function (__dict_Monad_11) {
    return new Prelude.Apply(Prelude.ap(monadStateT(__dict_Monad_11)), function () {
        return functorStateT(__dict_Monad_11);
    });
};
var applicativeStateT = function (__dict_Monad_12) {
    return new Prelude.Applicative(function () {
        return applyStateT(__dict_Monad_12);
    }, function (a) {
        return StateT(function (s) {
            return Prelude["return"](__dict_Monad_12)(new Data_Tuple.Tuple(a, s));
        });
    });
};
var altStateT = function (__dict_Monad_15) {
    return function (__dict_Alt_16) {
        return new Control_Alt.Alt(function (x) {
            return function (y) {
                return StateT(function (s) {
                    return Control_Alt["<|>"](__dict_Alt_16)(runStateT(x)(s))(runStateT(y)(s));
                });
            };
        }, function () {
            return functorStateT(__dict_Monad_15);
        });
    };
};
var plusStateT = function (__dict_Monad_0) {
    return function (__dict_Plus_1) {
        return new Control_Plus.Plus(function () {
            return altStateT(__dict_Monad_0)(__dict_Plus_1["__superclass_Control.Alt.Alt_0"]());
        }, StateT(function (_241) {
            return Control_Plus.empty(__dict_Plus_1);
        }));
    };
};
var alternativeStateT = function (__dict_Monad_13) {
    return function (__dict_Alternative_14) {
        return new Control_Alternative.Alternative(function () {
            return plusStateT(__dict_Monad_13)(__dict_Alternative_14["__superclass_Control.Plus.Plus_1"]());
        }, function () {
            return applicativeStateT(__dict_Monad_13);
        });
    };
};
var monadPlusStateT = function (__dict_MonadPlus_4) {
    return new Control_MonadPlus.MonadPlus(function () {
        return alternativeStateT(__dict_MonadPlus_4["__superclass_Prelude.Monad_0"]())(__dict_MonadPlus_4["__superclass_Control.Alternative.Alternative_1"]());
    }, function () {
        return monadStateT(__dict_MonadPlus_4["__superclass_Prelude.Monad_0"]());
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
    monadPlusStateT: monadPlusStateT, 
    monadTransStateT: monadTransStateT, 
    lazy1StateT: lazy1StateT
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Lazy":8,"Control.Monad.Trans":19,"Control.MonadPlus":22,"Control.Plus":23,"Data.Tuple":53,"Prelude":63}],19:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the `MonadTrans` type class of _monad transformers_.
 */
"use strict";
var Prelude = require("Prelude");

/**
 *  | The `MonadTrans` type class represents _monad transformers_.
 *  |
 *  | A monad transformer is a type constructor of kind `(* -> *) -> * -> *`, which
 *  | takes a `Monad` as its first argument, and returns another `Monad`.
 *  |
 *  | This allows us to add additional effects to an existing monad. By iterating this
 *  | process, we create monad transformer _stacks_, which contain all of the effects
 *  | required for a particular computation.
 *  | 
 *  | The laws state that `lift` is a `Monad` morphism.
 *  |
 *  | Laws:
 *  |
 *  | - `lift (pure a) = pure a`
 *  | - `lift (do { x <- m ; y }) = do { x <- lift m ; lift y }`
 */
var MonadTrans = function (lift) {
    this.lift = lift;
};

/**
 *  | The `MonadTrans` type class represents _monad transformers_.
 *  |
 *  | A monad transformer is a type constructor of kind `(* -> *) -> * -> *`, which
 *  | takes a `Monad` as its first argument, and returns another `Monad`.
 *  |
 *  | This allows us to add additional effects to an existing monad. By iterating this
 *  | process, we create monad transformer _stacks_, which contain all of the effects
 *  | required for a particular computation.
 *  | 
 *  | The laws state that `lift` is a `Monad` morphism.
 *  |
 *  | Laws:
 *  |
 *  | - `lift (pure a) = pure a`
 *  | - `lift (do { x <- m ; y }) = do { x <- lift m ; lift y }`
 */
var lift = function (dict) {
    return dict.lift;
};
module.exports = {
    MonadTrans: MonadTrans, 
    lift: lift
};

},{"Prelude":63}],20:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the writer monad transformer, `WriterT`.
 */
"use strict";
var Prelude = require("Prelude");
var Data_Tuple = require("Data.Tuple");
var Data_Monoid = require("Data.Monoid");
var Control_Alt = require("Control.Alt");
var Control_Plus = require("Control.Plus");
var Control_Alternative = require("Control.Alternative");
var Control_Monad_Trans = require("Control.Monad.Trans");
var Control_MonadPlus = require("Control.MonadPlus");

/**
 *  | The writer monad transformer.
 *  |
 *  | This monad transformer extends the base monad with a monoidal accumulator of
 *  | type `w`.
 *  |
 *  | The `MonadWriter` type class describes the operations supported by this monad.
 */
var WriterT = function (x) {
    return x;
};

/**
 *  | Run a computation in the `WriterT` monad.
 */
var runWriterT = function (_246) {
    return _246;
};
var monadTransWriterT = function (__dict_Monoid_4) {
    return new Control_Monad_Trans.MonadTrans(function (__dict_Monad_5) {
        return function (m) {
            return WriterT(Prelude[">>="](__dict_Monad_5["__superclass_Prelude.Bind_1"]())(m)(function (_24) {
                return Prelude["return"](__dict_Monad_5)(new Data_Tuple.Tuple(_24, Data_Monoid.mempty(__dict_Monoid_4)));
            }));
        };
    });
};

/**
 *  | Change the accumulator and base monad types in a `WriterT` monad action.
 */
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
var liftCallCCWriter = function (__dict_Monoid_8) {
    return function (callCC) {
        return function (f) {
            return WriterT(callCC(function (c) {
                return runWriterT(f(function (a) {
                    return WriterT(c(new Data_Tuple.Tuple(a, Data_Monoid.mempty(__dict_Monoid_8))));
                }));
            }));
        };
    };
};
var functorWriterT = function (__dict_Functor_9) {
    return new Prelude.Functor(function (f) {
        return mapWriterT(Prelude["<$>"](__dict_Functor_9)(function (_245) {
            return new Data_Tuple.Tuple(f(_245.value0), _245.value1);
        }));
    });
};

/**
 *  | Run a computation in the `WriterT` monad, discarding the result.
 */
var execWriterT = function (__dict_Apply_10) {
    return function (m) {
        return Prelude["<$>"](__dict_Apply_10["__superclass_Prelude.Functor_0"]())(Data_Tuple.snd)(runWriterT(m));
    };
};
var applyWriterT = function (__dict_Monoid_13) {
    return function (__dict_Apply_14) {
        return new Prelude.Apply(function (f) {
            return function (v) {
                return WriterT((function () {
                    var k = function (_247) {
                        return function (_248) {
                            return new Data_Tuple.Tuple(_247.value0(_248.value0), Prelude["<>"](__dict_Monoid_13["__superclass_Prelude.Semigroup_0"]())(_247.value1)(_248.value1));
                        };
                    };
                    return Prelude["<*>"](__dict_Apply_14)(Prelude["<$>"](__dict_Apply_14["__superclass_Prelude.Functor_0"]())(k)(runWriterT(f)))(runWriterT(v));
                })());
            };
        }, function () {
            return functorWriterT(__dict_Apply_14["__superclass_Prelude.Functor_0"]());
        });
    };
};
var bindWriterT = function (__dict_Monoid_11) {
    return function (__dict_Monad_12) {
        return new Prelude.Bind(function (m) {
            return function (k) {
                return WriterT(Prelude[">>="](__dict_Monad_12["__superclass_Prelude.Bind_1"]())(runWriterT(m))(function (_23) {
                    return Prelude[">>="](__dict_Monad_12["__superclass_Prelude.Bind_1"]())(runWriterT(k(_23.value0)))(function (_22) {
                        return Prelude["return"](__dict_Monad_12)(new Data_Tuple.Tuple(_22.value0, Prelude["<>"](__dict_Monoid_11["__superclass_Prelude.Semigroup_0"]())(_23.value1)(_22.value1)));
                    });
                }));
            };
        }, function () {
            return applyWriterT(__dict_Monoid_11)((__dict_Monad_12["__superclass_Prelude.Applicative_0"]())["__superclass_Prelude.Apply_0"]());
        });
    };
};
var applicativeWriterT = function (__dict_Monoid_15) {
    return function (__dict_Applicative_16) {
        return new Prelude.Applicative(function () {
            return applyWriterT(__dict_Monoid_15)(__dict_Applicative_16["__superclass_Prelude.Apply_0"]());
        }, function (a) {
            return WriterT(Prelude.pure(__dict_Applicative_16)(new Data_Tuple.Tuple(a, Data_Monoid.mempty(__dict_Monoid_15))));
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
var altWriterT = function (__dict_Monoid_19) {
    return function (__dict_Alt_20) {
        return new Control_Alt.Alt(function (m) {
            return function (n) {
                return WriterT(Control_Alt["<|>"](__dict_Alt_20)(runWriterT(m))(runWriterT(n)));
            };
        }, function () {
            return functorWriterT(__dict_Alt_20["__superclass_Prelude.Functor_0"]());
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
var alternativeWriterT = function (__dict_Monoid_17) {
    return function (__dict_Alternative_18) {
        return new Control_Alternative.Alternative(function () {
            return plusWriterT(__dict_Monoid_17)(__dict_Alternative_18["__superclass_Control.Plus.Plus_1"]());
        }, function () {
            return applicativeWriterT(__dict_Monoid_17)(__dict_Alternative_18["__superclass_Prelude.Applicative_0"]());
        });
    };
};
var monadPlusWriterT = function (__dict_Monoid_6) {
    return function (__dict_MonadPlus_7) {
        return new Control_MonadPlus.MonadPlus(function () {
            return alternativeWriterT(__dict_Monoid_6)(__dict_MonadPlus_7["__superclass_Control.Alternative.Alternative_1"]());
        }, function () {
            return monadWriterT(__dict_Monoid_6)(__dict_MonadPlus_7["__superclass_Prelude.Monad_0"]());
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
    monadPlusWriterT: monadPlusWriterT, 
    monadTransWriterT: monadTransWriterT
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Monad.Trans":19,"Control.MonadPlus":22,"Control.Plus":23,"Data.Monoid":48,"Data.Tuple":53,"Prelude":63}],21:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines helper functions for working with `Monad` instances.
 */
"use strict";
var Prelude = require("Prelude");

/**
 *  | Perform a monadic action when a condition is true.
 */
var when = function (__dict_Monad_0) {
    return function (_67) {
        return function (m) {
            if (_67) {
                return m;
            };
            if (!_67) {
                return Prelude["return"](__dict_Monad_0)(Prelude.unit);
            };
            throw new Error("Failed pattern match");
        };
    };
};

/**
 *  | Perform a monadic action unless a condition is true.
 */
var unless = function (__dict_Monad_1) {
    return function (_68) {
        return function (m) {
            if (!_68) {
                return m;
            };
            if (_68) {
                return Prelude["return"](__dict_Monad_1)(Prelude.unit);
            };
            throw new Error("Failed pattern match");
        };
    };
};

/**
 *  | Perform a monadic action `n` times collecting all of the results.
 */
var replicateM = function (__dict_Monad_2) {
    return function (n) {
        return function (m) {
            if (n === 0) {
                return Prelude["return"](__dict_Monad_2)([  ]);
            };
            return Prelude[">>="](__dict_Monad_2["__superclass_Prelude.Bind_1"]())(m)(function (_4) {
                return Prelude[">>="](__dict_Monad_2["__superclass_Prelude.Bind_1"]())(replicateM(__dict_Monad_2)(n - 1)(m))(function (_3) {
                    return Prelude["return"](__dict_Monad_2)(Prelude[":"](_4)(_3));
                });
            });
        };
    };
};

/**
 *  | Perform a fold using a monadic step function.
 */
var foldM = function (__dict_Monad_3) {
    return function (f) {
        return function (a) {
            return function (_66) {
                if (_66.length === 0) {
                    return Prelude["return"](__dict_Monad_3)(a);
                };
                if (_66.length >= 1) {
                    var _454 = _66.slice(1);
                    return Prelude[">>="](__dict_Monad_3["__superclass_Prelude.Bind_1"]())(f(a)(_66[0]))(function (a$prime) {
                        return foldM(__dict_Monad_3)(f)(a$prime)(_454);
                    });
                };
                throw new Error("Failed pattern match");
            };
        };
    };
};

/**
 *  | Filter where the predicate returns a monadic `Boolean`.
 *  |
 *  | For example: 
 *  |
 *  | ```purescript
 *  | powerSet :: forall a. [a] -> [[a]]
 *  | powerSet = filterM (const [true, false])
 *  | ```
 */
var filterM = function (__dict_Monad_4) {
    return function (p) {
        return function (_69) {
            if (_69.length === 0) {
                return Prelude["return"](__dict_Monad_4)([  ]);
            };
            if (_69.length >= 1) {
                var _461 = _69.slice(1);
                return Prelude[">>="](__dict_Monad_4["__superclass_Prelude.Bind_1"]())(p(_69[0]))(function (_6) {
                    return Prelude[">>="](__dict_Monad_4["__superclass_Prelude.Bind_1"]())(filterM(__dict_Monad_4)(p)(_461))(function (_5) {
                        return Prelude["return"](__dict_Monad_4)((function () {
                            if (_6) {
                                return Prelude[":"](_69[0])(_5);
                            };
                            if (!_6) {
                                return _5;
                            };
                            throw new Error("Failed pattern match");
                        })());
                    });
                });
            };
            throw new Error("Failed pattern match");
        };
    };
};
module.exports = {
    filterM: filterM, 
    unless: unless, 
    when: when, 
    foldM: foldM, 
    replicateM: replicateM
};

},{"Prelude":63}],22:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the `MonadPlus` type class.
 */
"use strict";
var Prelude = require("Prelude");
var Control_Plus = require("Control.Plus");
var Control_Alternative = require("Control.Alternative");

/**
 *  | The `MonadPlus` type class has no members of its own; it just specifies
 *  | that the type has both `Monad` and `Alternative` instances.
 *  |
 *  | Types which have `MonadPlus` instances should also satisfy the following
 *  | laws:
 *  |
 *  | - Distributivity: `(x <|> y) >>= f == (x >>= f) <|> (y >>= f)`
 *  | - Annihilation: `empty >>= f = empty`
 */
var MonadPlus = function (__superclass_Control$dotAlternative$dotAlternative_1, __superclass_Prelude$dotMonad_0) {
    this["__superclass_Control.Alternative.Alternative_1"] = __superclass_Control$dotAlternative$dotAlternative_1;
    this["__superclass_Prelude.Monad_0"] = __superclass_Prelude$dotMonad_0;
};

/**
 *  | Fail using `Plus` if a condition does not hold, or
 *  | succeed using `Monad` if it does.
 *  |
 *  | For example:
 *  |
 *  | ```purescript
 *  | import Data.Array
 *  | 
 *  | factors :: Number -> [Number]
 *  | factors n = do
 *  |   a <- 1 .. n
 *  |   b <- 1 .. a
 *  |   guard $ a * b == n
 *  |   return a
 *  | ```
 */
var guard = function (__dict_MonadPlus_0) {
    return function (_74) {
        if (_74) {
            return Prelude["return"](__dict_MonadPlus_0["__superclass_Prelude.Monad_0"]())(Prelude.unit);
        };
        if (!_74) {
            return Control_Plus.empty((__dict_MonadPlus_0["__superclass_Control.Alternative.Alternative_1"]())["__superclass_Control.Plus.Plus_1"]());
        };
        throw new Error("Failed pattern match");
    };
};
module.exports = {
    MonadPlus: MonadPlus, 
    guard: guard
};

},{"Control.Alternative":4,"Control.Plus":23,"Prelude":63}],23:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines the `Plus` type class.
 */
"use strict";
var Prelude = require("Prelude");
var Control_Alt = require("Control.Alt");

/**
 *  | The `Plus` type class extends the `Alt` type class with a value that
 *  | should be the left and right identity for `(<|>)`.
 *  |
 *  | It is similar to `Monoid`, except that it applies to types of
 *  | kind `* -> *`, like `Array` or `List`, rather than concrete types like
 *  | `String` or `Number`.
 *  |
 *  | `Plus` instances should satisfy the following laws:
 *  |
 *  | - Left identity: `empty <|> x == x`
 *  | - Right identity: `x <|> empty == x`
 *  | - Annihilation: `f <$> empty == empty`
 */
var Plus = function (__superclass_Control$dotAlt$dotAlt_0, empty) {
    this["__superclass_Control.Alt.Alt_0"] = __superclass_Control$dotAlt$dotAlt_0;
    this.empty = empty;
};

/**
 *  | The `Plus` type class extends the `Alt` type class with a value that
 *  | should be the left and right identity for `(<|>)`.
 *  |
 *  | It is similar to `Monoid`, except that it applies to types of
 *  | kind `* -> *`, like `Array` or `List`, rather than concrete types like
 *  | `String` or `Number`.
 *  |
 *  | `Plus` instances should satisfy the following laws:
 *  |
 *  | - Left identity: `empty <|> x == x`
 *  | - Right identity: `x <|> empty == x`
 *  | - Annihilation: `f <$> empty == empty`
 */
var empty = function (dict) {
    return dict.empty;
};
module.exports = {
    Plus: Plus, 
    empty: empty
};

},{"Control.Alt":3,"Prelude":63}],24:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Prelude = require("Prelude");
var Data_Date = require("Data.Date");
var Data = require("Data");
var Data_Array = require("Data.Array");
var Data_Maybe = require("Data.Maybe");
var Utils = require("Utils");
var Data_Tuple = require("Data.Tuple");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Control_Apply = require("Control.Apply");
var Debug_Trace = require("Debug.Trace");
var Data_Function = require("Data.Function");
var Rx_Observable = require("Rx.Observable");
var Types = require("Types");
var updateTimer = function (_24) {
    return function __do() {
        var _1 = Data_Date.now();
        return (function () {
            var x = Utils.timeDelta(_24.value0.startTime)(_1);
            return Prelude.pure(Control_Monad_Eff.applicativeEff)(new Types.State((function () {
                var _63 = {};
                for (var _64 in _24.value0) {
                    if (_24.value0.hasOwnProperty(_64)) {
                        _63[_64] = _24.value0[_64];
                    };
                };
                _63.secondsElapsed = Utils.toFixed(x / 1000)(2);
                _63.genCounter = 0;
                _63.genRatio = _24.value0.genCounter;
                return _63;
            })()));
        })()();
    };
};
var toggleTicks = function (rs) {
    return function (playPauseStream) {
        return function (_22) {
            return Control_Monad_Eff.runPure(function __do() {
                Utils.onNext(playPauseStream)((function () {
                    if (rs instanceof Types.Running) {
                        return true;
                    };
                    if (rs instanceof Types.Paused) {
                        return false;
                    };
                    throw new Error("Failed pattern match");
                })())();
                return new Types.State((function () {
                    var _70 = {};
                    for (var _71 in _22.value0) {
                        if (_22.value0.hasOwnProperty(_71)) {
                            _70[_71] = _22.value0[_71];
                        };
                    };
                    _70.runningState = rs;
                    return _70;
                })());
            });
        };
    };
};
var saveNewGeneration = function (_19) {
    return function (ng) {
        return new Types.State((function () {
            var _75 = {};
            for (var _76 in _19.value0) {
                if (_19.value0.hasOwnProperty(_76)) {
                    _75[_76] = _19.value0[_76];
                };
            };
            _75.cells = Data_Array.snoc(_19.value0.cells)(ng);
            _75.genCounter = _19.value0.genCounter + 1;
            return _75;
        })());
    };
};
var rewind = function (n) {
    return function (_20) {
        var newCurrent = (function () {
            if (_20.value0.current instanceof Data_Maybe.Just) {
                return _20.value0.current.value0 - n;
            };
            if (_20.value0.current instanceof Data_Maybe.Nothing) {
                return Data_Array.length(_20.value0.cells) - n;
            };
            throw new Error("Failed pattern match");
        })();
        var boundedNewCurrent = (function () {
            var _82 = newCurrent < 0;
            if (_82) {
                return 0;
            };
            if (!_82) {
                return newCurrent;
            };
            throw new Error("Failed pattern match");
        })();
        return new Types.State((function () {
            var _83 = {};
            for (var _84 in _20.value0) {
                if (_20.value0.hasOwnProperty(_84)) {
                    _83[_84] = _20.value0[_84];
                };
            };
            _83.current = new Data_Maybe.Just(boundedNewCurrent);
            return _83;
        })());
    };
};
var play = toggleTicks(Types.Running.value);
var pause = toggleTicks(Types.Paused.value);
var toggle = function (playPauseStream) {
    return function (_23) {
        if (Prelude["=="](Types.eqRunStatus)(_23.value0.runningState)(Types.Running.value)) {
            return pause(playPauseStream)(_23);
        };
        if (Prelude["=="](Types.eqRunStatus)(_23.value0.runningState)(Types.Paused.value)) {
            return play(playPauseStream)(_23);
        };
        throw new Error("Failed pattern match");
    };
};
var initialSpeed = 50;
var getTotalGenerations = function (_17) {
    return Data_Array.length(_17.value0.cells);
};
var getInitialState = function __do() {
    var _0 = Data_Date.now();
    return new Types.State({
        cells: [ Data.initialCells ], 
        runningState: Types.Running.value, 
        current: Data_Maybe.Nothing.value, 
        startTime: _0, 
        secondsElapsed: 0, 
        genCounter: 0, 
        genRatio: 0
    });
};
var genNewGeneration = function (currentGeneration) {
    var lifeStep = function (liveCount) {
        return function (cell) {
            if (cell instanceof Types.Alive) {
                var _93 = liveCount < 2 || liveCount > 3;
                if (_93) {
                    return Types.Dead.value;
                };
                if (!_93) {
                    return Types.Alive.value;
                };
                throw new Error("Failed pattern match");
            };
            if (cell instanceof Types.Dead) {
                var _94 = liveCount === 3;
                if (_94) {
                    return Types.Alive.value;
                };
                if (!_94) {
                    return Types.Dead.value;
                };
                throw new Error("Failed pattern match");
            };
            throw new Error("Failed pattern match");
        };
    };
    var findNeighbours = function (y) {
        return function (x) {
            return function (cells) {
                var newCells = [ [ y - 1, x - 1 ], [ y - 1, x ], [ y - 1, x + 1 ], [ y, x - 1 ], [ y, x + 1 ], [ y + 1, x - 1 ], [ y + 1, x ], [ y + 1, x + 1 ] ];
                var maybeNeighbours = Data_Array.map(function (_16) {
                    if (_16.length === 2) {
                        return Utils.getByIndex2(cells)(_16[0])(_16[1]);
                    };
                    throw new Error("Failed pattern match");
                })(newCells);
                return Data_Array.catMaybes(maybeNeighbours);
            };
        };
    };
    var calcNewCells = function (cells) {
        return Utils.map_(Data_Tuple.zip(cells)(Data_Array[".."](0)(Data_Array.length(cells))))(function (_15) {
            return Utils.map_(Data_Tuple.zip(_15.value0)(Data_Array[".."](0)(Data_Array.length(_15.value0))))(function (_14) {
                var neighbours = findNeighbours(_15.value1)(_14.value1)(cells);
                var liveCount = Data_Array.length(Data_Array.filter(Prelude["=="](Types.eqCell)(Types.Alive.value))(neighbours));
                return lifeStep(liveCount)(_14.value0);
            });
        });
    };
    return calcNewCells(currentGeneration);
};
var emptyGeneration = [ [  ] ];
var getCurrentGeneration = function (_18) {
    if (_18.value0.current instanceof Data_Maybe.Nothing) {
        return Data_Maybe.maybe(emptyGeneration)(Prelude.id(Prelude.categoryArr))(Data_Array.last(_18.value0.cells));
    };
    if (_18.value0.current instanceof Data_Maybe.Just) {
        return Data_Maybe.maybe(emptyGeneration)(Prelude.id(Prelude.categoryArr))(Data_Array["!!"](_18.value0.cells)(_18.value0.current.value0));
    };
    throw new Error("Failed pattern match");
};
var fforward = function (n) {
    return function (_21) {
        if (_21.value0.current instanceof Data_Maybe.Just) {
            var maxIndex = Data_Array.length(_21.value0.cells) - 1;
            var newCurrent = (function () {
                var _111 = _21.value0.current.value0 + n > maxIndex;
                if (_111) {
                    return Data_Maybe.Nothing.value;
                };
                if (!_111) {
                    return new Data_Maybe.Just(_21.value0.current.value0 + n);
                };
                throw new Error("Failed pattern match");
            })();
            return new Types.State((function () {
                var _112 = {};
                for (var _113 in _21.value0) {
                    if (_21.value0.hasOwnProperty(_113)) {
                        _112[_113] = _21.value0[_113];
                    };
                };
                _112.current = newCurrent;
                return _112;
            })());
        };
        if (_21.value0.current instanceof Data_Maybe.Nothing) {
            return saveNewGeneration(_21)(Prelude[">>>"](Prelude.semigroupoidArr)(getCurrentGeneration)(genNewGeneration)(_21));
        };
        throw new Error("Failed pattern match");
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
    var newGeneration = Prelude[">>>"](Prelude.semigroupoidArr)(getCurrentGeneration)(genNewGeneration)(state);
    return saveNewGeneration(state)(newGeneration);
};
var addPoint = updatePoint(Types.Alive.value);
var togglePoint = function (state) {
    return function (y) {
        return function (x) {
            var _116 = Utils.getByIndex2(getCurrentGeneration(state))(y)(x);
            if (_116 instanceof Data_Maybe.Just && _116.value0 instanceof Types.Alive) {
                return removePoint(state)(y)(x);
            };
            if (_116 instanceof Data_Maybe.Just && _116.value0 instanceof Types.Dead) {
                return addPoint(state)(y)(x);
            };
            return state;
        };
    };
};
var updateStateFactory = function (playPauseStream) {
    var updateState = function (_25) {
        return function (state) {
            if (_25 instanceof Types.Tick) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(calculateNewGeneration(state));
            };
            if (_25 instanceof Types.Play) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(play(playPauseStream)(state));
            };
            if (_25 instanceof Types.Pause) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(pause(playPauseStream)(state));
            };
            if (_25 instanceof Types.Toggle) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(toggle(playPauseStream)(state));
            };
            if (_25 instanceof Types.Save) {
                return Control_Apply["*>"](Control_Monad_Eff.applyEff)(Prelude["<<<"](Prelude.semigroupoidArr)(Debug_Trace.trace)(Prelude.show(Types.showState))(state))(Prelude.pure(Control_Monad_Eff.applicativeEff)(state));
            };
            if (_25 instanceof Types.Point) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(addPoint(state)(_25.value0)(_25.value1));
            };
            if (_25 instanceof Types.NoPoint) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(removePoint(state)(_25.value0)(_25.value1));
            };
            if (_25 instanceof Types.TogglePoint) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(togglePoint(state)(_25.value0)(_25.value1));
            };
            if (_25 instanceof Types.NewCells) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(saveNewGeneration(state)(_25.value0));
            };
            if (_25 instanceof Types.Rewind) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude[">>>"](Prelude.semigroupoidArr)(pause(playPauseStream))(rewind(_25.value0))(state));
            };
            if (_25 instanceof Types.FForward) {
                return Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude[">>>"](Prelude.semigroupoidArr)(pause(playPauseStream))(fforward(_25.value0))(state));
            };
            if (_25 instanceof Types.Timer) {
                return updateTimer(state);
            };
            throw new Error("Failed pattern match");
        };
    };
    return updateState;
};
module.exports = {
    getInitialState: getInitialState, 
    initialSpeed: initialSpeed, 
    saveNewGeneration: saveNewGeneration, 
    getCurrentGeneration: getCurrentGeneration, 
    getTotalGenerations: getTotalGenerations, 
    updateStateFactory: updateStateFactory, 
    pause: pause, 
    play: play, 
    removePoint: removePoint, 
    addPoint: addPoint, 
    calculateNewGeneration: calculateNewGeneration
};

},{"Control.Apply":5,"Control.Monad.Eff":10,"Data":55,"Data.Array":27,"Data.Date":35,"Data.Function":39,"Data.Maybe":42,"Data.Tuple":53,"Debug.Trace":56,"Prelude":63,"Rx.Observable":68,"Types":69,"Utils":73}],25:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
module.exports = {};

},{"Prelude":63}],26:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | Helper functions for working with mutable arrays using the `ST` effect.
 *  |
 *  | This module can be used when performance is important and mutation is a local effect.
 */
"use strict";
var Data_Function = require("Data.Function");
var Prelude = require("Prelude");
var Data_Maybe = require("Data.Maybe");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Control_Monad_ST = require("Control.Monad.ST");

  function runSTArray(f) {
    return f;
  };

  function emptySTArray() {
    return [];
  };

  function peekSTArrayImpl(just, nothing, arr, i) {
    return function() {
      var index = i >>> 0;
      return index < arr.length? just(arr[index]) : nothing;
    };
  };

  function pokeSTArrayImpl(arr, i, a) {
    return function() {
      var index = i >>> 0;
      var ret = index < arr.length;
      if (ret)
        arr[index] = a;
      return ret;
    };
  };

  function pushAllSTArrayImpl(arr, as) {
    return function(){
      return arr.push.apply(arr, as);
    };
  };

  function spliceSTArrayImpl(arr, index, howMany, bs) {
    return function(){
      return arr.splice.apply(arr, [index, howMany].concat(bs));
    };
  };

  function copyImpl(arr) {
    return function(){
      return arr.slice();
    };
  };

  function toAssocArray(arr) {
    return function(){
      var n = arr.length;
      var as = new Array(n);
      for (var i = 0; i < n; i++)
        as[i] = {value: arr[i], index: i};
      return as;
    };
  };

/**
 *  | Create a mutable copy of an immutable array.
 */
var thaw = copyImpl;

/**
 *  | Remove and/or insert elements from/into a mutable array at the specified index.
 */
var spliceSTArray = Data_Function.runFn4(spliceSTArrayImpl);

/**
 *  | Append the values in an immutable array to the end of a mutable array.
 */
var pushAllSTArray = Data_Function.runFn2(pushAllSTArrayImpl);

/**
 *  | Append an element to the end of a mutable array.
 */
var pushSTArray = function (arr) {
    return function (a) {
        return pushAllSTArray(arr)([ a ]);
    };
};

/**
 *  | Change the value at the specified index in a mutable array.
 */
var pokeSTArray = Data_Function.runFn3(pokeSTArrayImpl);

/**
 *  | Read the value at the specified index in a mutable array.
 */
var peekSTArray = Data_Function.runFn4(peekSTArrayImpl)(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);

/**
 *  | Create an immutable copy of a mutable array.
 */
var freeze = copyImpl;
module.exports = {
    toAssocArray: toAssocArray, 
    thaw: thaw, 
    freeze: freeze, 
    spliceSTArray: spliceSTArray, 
    pushAllSTArray: pushAllSTArray, 
    pushSTArray: pushSTArray, 
    pokeSTArray: pokeSTArray, 
    peekSTArray: peekSTArray, 
    emptySTArray: emptySTArray, 
    runSTArray: runSTArray
};

},{"Control.Monad.Eff":10,"Control.Monad.ST":17,"Data.Function":39,"Data.Maybe":42,"Prelude":63}],27:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | Helper functions for working with immutable Javascript arrays.
 *  |
 *  | _Note_: Depending on your use-case, you may prefer to use `Data.List` or
 *  | `Data.Sequence` instead, which might give better performance for certain
 *  | use cases. This module is useful when integrating with JavaScript libraries
 *  | which use arrays, but immutable arrays are not a practical data structure
 *  | for many use cases due to their poor asymptotics.
 */
"use strict";
var Prelude = require("Prelude");
var Data_Maybe = require("Data.Maybe");
var Control_Alt = require("Control.Alt");
var Control_Plus = require("Control.Plus");
var Control_Alternative = require("Control.Alternative");
var Control_MonadPlus = require("Control.MonadPlus");
var Prelude_Unsafe = require("Prelude.Unsafe");
function snoc(l) {  return function (e) {    var l1 = l.slice();    l1.push(e);     return l1;  };};
function length (xs) {  return xs.length;};
function findIndex (f) {  return function (arr) {    for (var i = 0, l = arr.length; i < l; i++) {      if (f(arr[i])) {        return i;      }    }    return -1;  };};
function findLastIndex (f) {  return function (arr) {    for (var i = arr.length - 1; i >= 0; i--) {      if (f(arr[i])) {        return i;      }    }    return -1;  };};
function append (l1) {  return function (l2) {    return l1.concat(l2);  };};
function concat (xss) {  var result = [];  for (var i = 0, l = xss.length; i < l; i++) {    result.push.apply(result, xss[i]);  }  return result;};
function reverse (l) {  return l.slice().reverse();};
function drop (n) {  return function (l) {    return l.slice(n);  };};
function slice (s) {  return function (e) {    return function (l) {      return l.slice(s, e);    };  };};
function insertAt (index) {  return function (a) {    return function (l) {      var l1 = l.slice();      l1.splice(index, 0, a);      return l1;    };   };};
function deleteAt (index) {  return function (n) {    return function (l) {      var l1 = l.slice();      l1.splice(index, n);      return l1;    };   };};
function updateAt (index) {  return function (a) {    return function (l) {      var i = ~~index;      if (i < 0 || i >= l.length) return l;      var l1 = l.slice();      l1[i] = a;      return l1;    };   };};
function concatMap (f) {  return function (arr) {    var result = [];    for (var i = 0, l = arr.length; i < l; i++) {      Array.prototype.push.apply(result, f(arr[i]));    }    return result;  };};
function map (f) {  return function (arr) {    var l = arr.length;    var result = new Array(l);    for (var i = 0; i < l; i++) {      result[i] = f(arr[i]);    }    return result;  };};
function filter (f) {  return function (arr) {    var n = 0;    var result = [];    for (var i = 0, l = arr.length; i < l; i++) {      if (f(arr[i])) {        result[n++] = arr[i];      }    }    return result;  };};
function range (start) {  return function (end) {    var i = ~~start, e = ~~end;    var step = i > e ? -1 : 1;    var result = [i], n = 1;    while (i !== e) {      i += step;      result[n++] = i;    }    return result;  };};
function zipWith (f) {  return function (xs) {    return function (ys) {      var l = xs.length < ys.length ? xs.length : ys.length;      var result = new Array(l);      for (var i = 0; i < l; i++) {        result[i] = f(xs[i])(ys[i]);      }      return result;    };  };};
function sortJS (f) {  return function (l) {    return l.slice().sort(function (x, y) {      return f(x)(y);    });  };};

function replicate(nn) {
  return function(v) {
    var n = nn > 0? nn : 0;
    var r = new Array(n);
    for (var i = 0; i < n; i++)
      r[i] = v;
    return r;
   };
}
;

/**
 *  | An infix synonym for `range`.
 */
var $dot$dot = range;

/**
 *  | This operator provides a safe way to read a value at a particular index from an array.
 *  |
 *  | This function returns `Nothing` if the index is out-of-bounds.
 *  |
 *  | `Data.Array.Unsafe` provides the `unsafeIndex` function, which is an unsafe version of
 *  | this function without bounds checking.
 */
var $bang$bang = function (xs) {
    return function (n) {
        var isInt = function (n_1) {
            return n_1 !== ~~n_1;
        };
        var _542 = n < 0 || (n >= length(xs) || isInt(n));
        if (_542) {
            return Data_Maybe.Nothing.value;
        };
        if (!_542) {
            return new Data_Maybe.Just(xs[n]);
        };
        throw new Error("Failed pattern match");
    };
};

/**
 *  | Keep only a number of elements from the start of an array, creating a new array.
 */
var take = function (n) {
    return slice(0)(n);
};

/**
 *  | Get all but the first element of an array, creating a new array, or `Nothing` if the array is empty
 *  |
 *  | Running time: `O(n)` where `n` is the length of the array
 */
var tail = function (_96) {
    if (_96.length >= 1) {
        var _545 = _96.slice(1);
        return new Data_Maybe.Just(_545);
    };
    return Data_Maybe.Nothing.value;
};

/**
 *  | Split an array into two parts:
 *  |
 *  | 1. the longest initial subarray for which all element satisfy the specified predicate
 *  | 2. the remaining elements
 *  |
 *  | For example,
 *  |
 *  | ```purescript
 *  | span (\n -> n % 2 == 1) [1,3,2,4,5] == { init: [1,3], rest: [2,4,5] }
 *  | ```
 */
var span = (function () {
    var go = function (__copy_acc) {
        return function (__copy_p) {
            return function (__copy_xs) {
                var acc = __copy_acc;
                var p = __copy_p;
                var xs = __copy_xs;
                tco: while (true) {
                    if (xs.length >= 1) {
                        var _550 = xs.slice(1);
                        if (p(xs[0])) {
                            var __tco_acc = Prelude[":"](xs[0])(acc);
                            var __tco_p = p;
                            acc = __tco_acc;
                            p = __tco_p;
                            xs = _550;
                            continue tco;
                        };
                    };
                    return {
                        init: reverse(acc), 
                        rest: xs
                    };
                };
            };
        };
    };
    return go([  ]);
})();

/**
 *  | Calculate the longest initial subarray for which all element satisfy the specified predicate,
 *  | creating a new array.
 */
var takeWhile = function (p) {
    return function (xs) {
        return (span(p)(xs)).init;
    };
};

/**
 *  | Sort the elements of an array in increasing order, where elements are compared using
 *  | the specified partial ordering, creating a new array.
 */
var sortBy = function (comp) {
    return function (xs) {
        var comp$prime = function (x) {
            return function (y) {
                var _551 = comp(x)(y);
                if (_551 instanceof Prelude.GT) {
                    return 1;
                };
                if (_551 instanceof Prelude.EQ) {
                    return 0;
                };
                if (_551 instanceof Prelude.LT) {
                    return -1;
                };
                throw new Error("Failed pattern match");
            };
        };
        return sortJS(comp$prime)(xs);
    };
};

/**
 *  | Sort the elements of an array in increasing order, creating a new array.
 */
var sort = function (__dict_Ord_0) {
    return function (xs) {
        return sortBy(Prelude.compare(__dict_Ord_0))(xs);
    };
};

/**
 *  | Create an array of one element
 */
var singleton = function (a) {
    return [ a ];
};
var semigroupArray = new Prelude.Semigroup(append);

/**
 *  | Test whether an array is empty.
 */
var $$null = function (_97) {
    if (_97.length === 0) {
        return true;
    };
    return false;
};

/**
 *  | Remove the duplicates from an array, where element equality is determined by the
 *  | specified equivalence relation, creating a new array.
 */
var nubBy = function ($eq$eq) {
    return function (_98) {
        if (_98.length === 0) {
            return [  ];
        };
        if (_98.length >= 1) {
            var _556 = _98.slice(1);
            return Prelude[":"](_98[0])(nubBy($eq$eq)(filter(function (y) {
                return !$eq$eq(_98[0])(y);
            })(_556)));
        };
        throw new Error("Failed pattern match");
    };
};

/**
 *  | Remove the duplicates from an array, creating a new array.
 */
var nub = function (__dict_Eq_1) {
    return nubBy(Prelude["=="](__dict_Eq_1));
};

/**
 *  | Apply a function to the element at the specified index, creating a new array.
 */
var modifyAt = function (i) {
    return function (f) {
        return function (xs) {
            var _557 = $bang$bang(xs)(i);
            if (_557 instanceof Data_Maybe.Just) {
                return updateAt(i)(f(_557.value0))(xs);
            };
            if (_557 instanceof Data_Maybe.Nothing) {
                return xs;
            };
            throw new Error("Failed pattern match");
        };
    };
};

/**
 *  | Apply a function to each element in an array, keeping only the results which
 *  | contain a value, creating a new array.
 */
var mapMaybe = function (f) {
    return concatMap(Prelude["<<<"](Prelude.semigroupoidArr)(Data_Maybe.maybe([  ])(singleton))(f));
};

/**
 *  | Get the last element in an array, or `Nothing` if the array is empty
 *  |
 *  | Running time: `O(1)`.
 */
var last = function (xs) {
    return $bang$bang(xs)(length(xs) - 1);
};

/**
 *  | Calculate the intersection of two arrays, using the specified equivalence relation
 *  | to compare elements, creating a new array.
 */
var intersectBy = function (eq) {
    return function (xs) {
        return function (ys) {
            if (xs.length === 0) {
                return [  ];
            };
            if (ys.length === 0) {
                return [  ];
            };
            var el = function (x) {
                return findIndex(eq(x))(ys) >= 0;
            };
            return filter(el)(xs);
        };
    };
};

/**
 *  | Calculate the intersection of two arrays, creating a new array.
 */
var intersect = function (__dict_Eq_2) {
    return intersectBy(Prelude["=="](__dict_Eq_2));
};

/**
 *  | Get all but the last element of an array, creating a new array, or `Nothing` if the array is empty.
 *  |
 *  | Running time: `O(n)` where `n` is the length of the array
 */
var init = function (xs) {
    if (xs.length === 0) {
        return Data_Maybe.Nothing.value;
    };
    return new Data_Maybe.Just(slice(0)(length(xs) - 1)(xs));
};

/**
 *  | Get the first element in an array, or `Nothing` if the array is empty
 *  |
 *  | Running time: `O(1)`.
 */
var head = function (xs) {
    return $bang$bang(xs)(0);
};

/**
 *  | Group equal, consecutive elements of an array into arrays, using the specified
 *  | equivalence relation to detemine equality.
 */
var groupBy = (function () {
    var go = function (__copy_acc) {
        return function (__copy_op) {
            return function (__copy__100) {
                var acc = __copy_acc;
                var op = __copy_op;
                var _100 = __copy__100;
                tco: while (true) {
                    if (_100.length === 0) {
                        return reverse(acc);
                    };
                    if (_100.length >= 1) {
                        var _567 = _100.slice(1);
                        var sp = span(op(_100[0]))(_567);
                        var __tco_acc = Prelude[":"](Prelude[":"](_100[0])(sp.init))(acc);
                        var __tco_op = op;
                        acc = __tco_acc;
                        op = __tco_op;
                        _100 = sp.rest;
                        continue tco;
                    };
                    throw new Error("Failed pattern match");
                };
            };
        };
    };
    return go([  ]);
})();

/**
 *  | Group equal, consecutive elements of an array into arrays.
 *  |
 *  | For example,
 *  |
 *  | ```purescript
 *  | group [1,1,2,2,1] == [[1,1],[2,2],[1]]
 *  | ```
 */
var group = function (__dict_Eq_3) {
    return function (xs) {
        return groupBy(Prelude["=="](__dict_Eq_3))(xs);
    };
};

/**
 *  | Sort and group the elements of an array into arrays.
 *  |
 *  | For example,
 *  |
 *  | ```purescript
 *  | group [1,1,2,2,1] == [[1,1,1],[2,2]]
 *  | ```
 */
var group$prime = function (__dict_Ord_4) {
    return Prelude["<<<"](Prelude.semigroupoidArr)(group(__dict_Ord_4["__superclass_Prelude.Eq_0"]()))(sort(__dict_Ord_4));
};
var functorArray = new Prelude.Functor(map);

/**
 *  | Find the index of the last element equal to the specified element,
 *  | or `-1` if no such element exists
 */
var elemLastIndex = function (__dict_Eq_5) {
    return function (x) {
        return findLastIndex(Prelude["=="](__dict_Eq_5)(x));
    };
};

/**
 *  | Find the index of the first element equal to the specified element,
 *  | or `-1` if no such element exists
 */
var elemIndex = function (__dict_Eq_6) {
    return function (x) {
        return findIndex(Prelude["=="](__dict_Eq_6)(x));
    };
};

/**
 *  | Remove the longest initial subarray for which all element satisfy the specified predicate,
 *  | creating a new array.
 */
var dropWhile = function (p) {
    return function (xs) {
        return (span(p)(xs)).rest;
    };
};

/**
 *  | Delete the first element of an array which matches the specified value, under the
 *  | equivalence relation provided in the first argument, creating a new array.
 */
var deleteBy = function (eq) {
    return function (x) {
        return function (ys) {
            if (ys.length === 0) {
                return [  ];
            };
            var _571 = findIndex(eq(x))(ys);
            if (_571 < 0) {
                return ys;
            };
            return deleteAt(_571)(1)(ys);
        };
    };
};

/**
 *  | Delete the first element of an array which is equal to the specified value,
 *  | creating a new array.
 */
var $$delete = function (__dict_Eq_7) {
    return deleteBy(Prelude["=="](__dict_Eq_7));
};

/**
 *  | Delete the first occurrence of each element in the second array from the first array,
 *  | creating a new array.
 */
var $bslash$bslash = function (__dict_Eq_8) {
    return function (xs) {
        return function (ys) {
            var go = function (__copy_xs_1) {
                return function (__copy__99) {
                    var xs_1 = __copy_xs_1;
                    var _99 = __copy__99;
                    tco: while (true) {
                        if (_99.length === 0) {
                            return xs_1;
                        };
                        if (xs_1.length === 0) {
                            return [  ];
                        };
                        if (_99.length >= 1) {
                            var _575 = _99.slice(1);
                            var __tco_xs_1 = $$delete(__dict_Eq_8)(_99[0])(xs_1);
                            xs_1 = __tco_xs_1;
                            _99 = _575;
                            continue tco;
                        };
                        throw new Error("Failed pattern match");
                    };
                };
            };
            return go(xs)(ys);
        };
    };
};

/**
 *  | Filter an array of optional values, keeping only the elements which contain
 *  | a value, creating a new array.
 */
var catMaybes = concatMap(Data_Maybe.maybe([  ])(singleton));
var monadArray = new Prelude.Monad(function () {
    return applicativeArray;
}, function () {
    return bindArray;
});
var bindArray = new Prelude.Bind(Prelude.flip(concatMap), function () {
    return applyArray;
});
var applyArray = new Prelude.Apply(Prelude.ap(monadArray), function () {
    return functorArray;
});
var applicativeArray = new Prelude.Applicative(function () {
    return applyArray;
}, singleton);
var altArray = new Control_Alt.Alt(append, function () {
    return functorArray;
});
var plusArray = new Control_Plus.Plus(function () {
    return altArray;
}, [  ]);
var alternativeArray = new Control_Alternative.Alternative(function () {
    return plusArray;
}, function () {
    return applicativeArray;
});
var monadPlusArray = new Control_MonadPlus.MonadPlus(function () {
    return alternativeArray;
}, function () {
    return monadArray;
});
module.exports = {
    replicate: replicate, 
    takeWhile: takeWhile, 
    dropWhile: dropWhile, 
    span: span, 
    groupBy: groupBy, 
    "group'": group$prime, 
    group: group, 
    sortBy: sortBy, 
    sort: sort, 
    nubBy: nubBy, 
    nub: nub, 
    zipWith: zipWith, 
    range: range, 
    filter: filter, 
    concatMap: concatMap, 
    intersect: intersect, 
    intersectBy: intersectBy, 
    "\\\\": $bslash$bslash, 
    "delete": $$delete, 
    deleteBy: deleteBy, 
    modifyAt: modifyAt, 
    updateAt: updateAt, 
    deleteAt: deleteAt, 
    insertAt: insertAt, 
    take: take, 
    drop: drop, 
    reverse: reverse, 
    concat: concat, 
    append: append, 
    elemLastIndex: elemLastIndex, 
    elemIndex: elemIndex, 
    findLastIndex: findLastIndex, 
    findIndex: findIndex, 
    length: length, 
    catMaybes: catMaybes, 
    mapMaybe: mapMaybe, 
    map: map, 
    "null": $$null, 
    init: init, 
    tail: tail, 
    last: last, 
    head: head, 
    singleton: singleton, 
    snoc: snoc, 
    "..": $dot$dot, 
    "!!": $bang$bang, 
    functorArray: functorArray, 
    applyArray: applyArray, 
    applicativeArray: applicativeArray, 
    bindArray: bindArray, 
    monadArray: monadArray, 
    semigroupArray: semigroupArray, 
    altArray: altArray, 
    plusArray: plusArray, 
    alternativeArray: alternativeArray, 
    monadPlusArray: monadPlusArray
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.MonadPlus":22,"Control.Plus":23,"Data.Maybe":42,"Prelude":63,"Prelude.Unsafe":62}],28:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | A type and functions for single characters.
 */
"use strict";
var Prelude = require("Prelude");

    function toCharCode(c) {
      return c.charCodeAt(0);
    }
    ;

    function fromCharCode(c) {
      return String.fromCharCode(c);
    }
    ;

/**
 * | A unicode character.
 */
var Char = function (x) {
    return x;
};

/**
 *  | Characters can be rendered as a string with `show`.
 */
var showChar = new Prelude.Show(function (_143) {
    return "Char " + Prelude.show(Prelude.showString)(_143);
});

/**
 *  | Characters can be compared for equality with `==` and `/=`.
 */
var eqChar = new Prelude.Eq(function (a) {
    return function (b) {
        return !Prelude["=="](eqChar)(a)(b);
    };
}, function (_139) {
    return function (_140) {
        return _139 === _140;
    };
});

/**
 *  | Characters can be compared with `compare`, `>`, `>=`, `<` and `<=`.
 */
var ordChar = new Prelude.Ord(function () {
    return eqChar;
}, function (_141) {
    return function (_142) {
        return Prelude.compare(Prelude.ordString)(_141)(_142);
    };
});

/**
 *  | Returns the string of length `1` containing only the given character.
 */
var charString = function (_138) {
    return _138;
};
module.exports = {
    toCharCode: toCharCode, 
    fromCharCode: fromCharCode, 
    charString: charString, 
    eqChar: eqChar, 
    ordChar: ordChar, 
    showChar: showChar
};

},{"Prelude":63}],29:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
function makeXMLHttpRequest() {    return new XMLHttpRequest();   };
function open(method) {                  return function(url) {                   return function (obj) {                  return function () {                      obj.open(method, url);              };                                   };                                   };                                   };
function openAsync(method) {             return function(url) {                   return function (obj) {                  return function () {                      obj.open(method, url, true);        };                                   };                                   };                                   };
function setResponseType(typ) {          return function(obj) {                   return function() {                      return obj.responseType = typ;       };                                   };                                   };
function responseType(obj) {        return function() {                 return obj.responseType;        };                              };
function send(obj) {       return function () {       obj.send();            };                     };
function sendWithPayload(payload) {    return function (obj) {                return function () {                   obj.send(payload);                 };                                 };                                 };
function response(obj) {             return function () {               return obj.response;         };                             };
function responseText(obj) {             return function () {                   return obj.responseText;         };                                 };
function statusText(obj) {             return function () {                 return obj.statusText;         };                               };
function setRequestHeader(key) {              return function (value) {                    return function (obj) {                      return function () {                         obj.setRequestHeader(key, value);        }                                        }                                        }                                       };
function getAllResponseHeaders(obj) {       return function () {                        return obj.getAllResponseHeaders();     };                                      };
function getResponseHeader(key) {          return function (obj) {                    return function () {                       return obj.getResponseHeader(key);     };                                     };                                     };
function overrideMimeType(mime) {          return function (obj) {                    return function () {                       return obj.overrideMimeType(mime);     };                                     };                                     };
module.exports = {
    overrideMimeType: overrideMimeType, 
    getResponseHeader: getResponseHeader, 
    getAllResponseHeaders: getAllResponseHeaders, 
    setRequestHeader: setRequestHeader, 
    statusText: statusText, 
    responseText: responseText, 
    response: response, 
    sendWithPayload: sendWithPayload, 
    send: send, 
    responseType: responseType, 
    setResponseType: setResponseType, 
    openAsync: openAsync, 
    open: open, 
    makeXMLHttpRequest: makeXMLHttpRequest
};

},{"Control.Monad.Eff":10,"Data.DOM.Simple.Types":31,"Prelude":63}],30:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Data_DOM_Simple_Unsafe_Events = require("Data.DOM.Simple.Unsafe.Events");
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Control_Monad = require("Control.Monad");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
var Data_DOM_Simple_Window = require("Data.DOM.Simple.Window");
var Data_DOM_Simple_Ajax = require("Data.DOM.Simple.Ajax");
var UILoadEvent = (function () {
    function UILoadEvent() {

    };
    UILoadEvent.value = new UILoadEvent();
    return UILoadEvent;
})();
var UIUnloadEvent = (function () {
    function UIUnloadEvent() {

    };
    UIUnloadEvent.value = new UIUnloadEvent();
    return UIUnloadEvent;
})();
var UIAbortEvent = (function () {
    function UIAbortEvent() {

    };
    UIAbortEvent.value = new UIAbortEvent();
    return UIAbortEvent;
})();
var UIErrorEvent = (function () {
    function UIErrorEvent() {

    };
    UIErrorEvent.value = new UIErrorEvent();
    return UIErrorEvent;
})();
var UISelectEvent = (function () {
    function UISelectEvent() {

    };
    UISelectEvent.value = new UISelectEvent();
    return UISelectEvent;
})();
var UIResizeEvent = (function () {
    function UIResizeEvent() {

    };
    UIResizeEvent.value = new UIResizeEvent();
    return UIResizeEvent;
})();
var UIScrollEvent = (function () {
    function UIScrollEvent() {

    };
    UIScrollEvent.value = new UIScrollEvent();
    return UIScrollEvent;
})();
var ProgressAbortEvent = (function () {
    function ProgressAbortEvent() {

    };
    ProgressAbortEvent.value = new ProgressAbortEvent();
    return ProgressAbortEvent;
})();
var ProgressErrorEvent = (function () {
    function ProgressErrorEvent() {

    };
    ProgressErrorEvent.value = new ProgressErrorEvent();
    return ProgressErrorEvent;
})();
var ProgressLoadEvent = (function () {
    function ProgressLoadEvent() {

    };
    ProgressLoadEvent.value = new ProgressLoadEvent();
    return ProgressLoadEvent;
})();
var ProgressLoadEndEvent = (function () {
    function ProgressLoadEndEvent() {

    };
    ProgressLoadEndEvent.value = new ProgressLoadEndEvent();
    return ProgressLoadEndEvent;
})();
var ProgressLoadStartEvent = (function () {
    function ProgressLoadStartEvent() {

    };
    ProgressLoadStartEvent.value = new ProgressLoadStartEvent();
    return ProgressLoadStartEvent;
})();
var ProgressProgressEvent = (function () {
    function ProgressProgressEvent() {

    };
    ProgressProgressEvent.value = new ProgressProgressEvent();
    return ProgressProgressEvent;
})();
var ProgressTimeoutEvent = (function () {
    function ProgressTimeoutEvent() {

    };
    ProgressTimeoutEvent.value = new ProgressTimeoutEvent();
    return ProgressTimeoutEvent;
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
var UIEvent = function (__superclass_Data$dotDOM$dotSimple$dotEvents$dotEvent_0, detail, uiEventType, view) {
    this["__superclass_Data.DOM.Simple.Events.Event_0"] = __superclass_Data$dotDOM$dotSimple$dotEvents$dotEvent_0;
    this.detail = detail;
    this.uiEventType = uiEventType;
    this.view = view;
};
var UIEventTarget = function (addUIEventListener, removeUIEventListener) {
    this.addUIEventListener = addUIEventListener;
    this.removeUIEventListener = removeUIEventListener;
};
var ProgressEvent = function (__superclass_Data$dotDOM$dotSimple$dotEvents$dotEvent_0, lengthComputable, loaded, progressEventType, total) {
    this["__superclass_Data.DOM.Simple.Events.Event_0"] = __superclass_Data$dotDOM$dotSimple$dotEvents$dotEvent_0;
    this.lengthComputable = lengthComputable;
    this.loaded = loaded;
    this.progressEventType = progressEventType;
    this.total = total;
};
var ProgressEventTarget = function (addProgressEventListener, removeProgressEventListener) {
    this.addProgressEventListener = addProgressEventListener;
    this.removeProgressEventListener = removeProgressEventListener;
};
var view = function (dict) {
    return dict.view;
};
var uiEventTypeShow = new Prelude.Show(function (_24) {
    if (_24 instanceof UILoadEvent) {
        return "load";
    };
    if (_24 instanceof UIUnloadEvent) {
        return "unload";
    };
    if (_24 instanceof UIAbortEvent) {
        return "abort";
    };
    if (_24 instanceof UIErrorEvent) {
        return "error";
    };
    if (_24 instanceof UISelectEvent) {
        return "select";
    };
    if (_24 instanceof UIResizeEvent) {
        return "resize";
    };
    if (_24 instanceof UIScrollEvent) {
        return "scroll";
    };
    throw new Error("Failed pattern match");
});
var uiEventType = function (dict) {
    return dict.uiEventType;
};
var uiEventTargetHTMLWindow = new UIEventTarget(function (__dict_UIEvent_0) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(uiEventTypeShow)(typ));
    };
}, function (__dict_UIEvent_1) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(uiEventTypeShow)(typ));
    };
});
var total = function (dict) {
    return dict.total;
};
var toKeyLocation = function (_19) {
    if (_19 === 0) {
        return KeyLocationStandard.value;
    };
    if (_19 === 1) {
        return KeyLocationLeft.value;
    };
    if (_19 === 2) {
        return KeyLocationRight.value;
    };
    if (_19 === 3) {
        return KeyLocationNumpad.value;
    };
    throw new Error("Failed pattern match");
};
var stopPropagation = function (dict) {
    return dict.stopPropagation;
};
var showProgressEventType = new Prelude.Show(function (_25) {
    if (_25 instanceof ProgressAbortEvent) {
        return "abort";
    };
    if (_25 instanceof ProgressErrorEvent) {
        return "error";
    };
    if (_25 instanceof ProgressLoadEvent) {
        return "load";
    };
    if (_25 instanceof ProgressLoadEndEvent) {
        return "loadend";
    };
    if (_25 instanceof ProgressLoadStartEvent) {
        return "loadstart";
    };
    if (_25 instanceof ProgressProgressEvent) {
        return "progress";
    };
    if (_25 instanceof ProgressTimeoutEvent) {
        return "timeout";
    };
    throw new Error("Failed pattern match");
});
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
var removeProgressEventListener = function (dict) {
    return dict.removeProgressEventListener;
};
var removeMouseEventListener = function (dict) {
    return dict.removeMouseEventListener;
};
var removeKeyboardEventListener = function (dict) {
    return dict.removeKeyboardEventListener;
};
var readUIEventType = function (_20) {
    if (_20 === "load") {
        return UILoadEvent.value;
    };
    if (_20 === "unload") {
        return UIUnloadEvent.value;
    };
    if (_20 === "abort") {
        return UIAbortEvent.value;
    };
    if (_20 === "error") {
        return UIErrorEvent.value;
    };
    if (_20 === "select") {
        return UISelectEvent.value;
    };
    if (_20 === "resize") {
        return UIResizeEvent.value;
    };
    if (_20 === "scroll") {
        return UIScrollEvent.value;
    };
    throw new Error("Failed pattern match");
};
var readProgressEventType = function (_21) {
    if (_21 === "abort") {
        return ProgressAbortEvent.value;
    };
    if (_21 === "error") {
        return ProgressErrorEvent.value;
    };
    if (_21 === "load") {
        return ProgressLoadEvent.value;
    };
    if (_21 === "loadend") {
        return ProgressLoadEndEvent.value;
    };
    if (_21 === "loadstart") {
        return ProgressLoadStartEvent.value;
    };
    if (_21 === "progress") {
        return ProgressProgressEvent.value;
    };
    if (_21 === "timeout") {
        return ProgressTimeoutEvent.value;
    };
    throw new Error("Failed pattern match");
};
var readMouseEventType = function (_17) {
    if (_17 === "mousemove") {
        return MouseMoveEvent.value;
    };
    if (_17 === "mouseover") {
        return MouseOverEvent.value;
    };
    if (_17 === "mouseenter") {
        return MouseEnterEvent.value;
    };
    if (_17 === "mouseout") {
        return MouseOutEvent.value;
    };
    if (_17 === "mouseleave") {
        return MouseLeaveEvent.value;
    };
    throw new Error("Failed pattern match");
};
var readKeyboardEventType = function (_18) {
    if (_18 === "keydown") {
        return KeydownEvent.value;
    };
    if (_18 === "keypress") {
        return KeypressEvent.value;
    };
    if (_18 === "keyup") {
        return KeyupEvent.value;
    };
    throw new Error("Failed pattern match");
};
var progressEventType = function (dict) {
    return dict.progressEventType;
};
var progressEventTargetXMLHttpRequest = new ProgressEventTarget(function (__dict_ProgressEvent_2) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(showProgressEventType)(typ));
    };
}, function (__dict_ProgressEvent_3) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(showProgressEventType)(typ));
    };
});
var preventDefault = function (dict) {
    return dict.preventDefault;
};
var mouseEventTypeShow = new Prelude.Show(function (_22) {
    if (_22 instanceof MouseMoveEvent) {
        return "mousemove";
    };
    if (_22 instanceof MouseOverEvent) {
        return "mouseover";
    };
    if (_22 instanceof MouseEnterEvent) {
        return "mouseenter";
    };
    if (_22 instanceof MouseOutEvent) {
        return "mouseout";
    };
    if (_22 instanceof MouseLeaveEvent) {
        return "mouseleave";
    };
    throw new Error("Failed pattern match");
});
var mouseEventType = function (dict) {
    return dict.mouseEventType;
};
var mouseEventTargetHTMLWindow = new MouseEventTarget(function (__dict_MouseEvent_4) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(mouseEventTypeShow)(typ));
    };
}, function (__dict_MouseEvent_5) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(mouseEventTypeShow)(typ));
    };
});
var mouseEventTargetHTMLElement = new MouseEventTarget(function (__dict_MouseEvent_6) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(mouseEventTypeShow)(typ));
    };
}, function (__dict_MouseEvent_7) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(mouseEventTypeShow)(typ));
    };
});
var mouseEventTargetHTMLDocument = new MouseEventTarget(function (__dict_MouseEvent_8) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(mouseEventTypeShow)(typ));
    };
}, function (__dict_MouseEvent_9) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(mouseEventTypeShow)(typ));
    };
});
var metaKey = function (dict) {
    return dict.metaKey;
};
var loaded = function (dict) {
    return dict.loaded;
};
var lengthComputable = function (dict) {
    return dict.lengthComputable;
};
var keyboardEventTypeShow = new Prelude.Show(function (_23) {
    if (_23 instanceof KeydownEvent) {
        return "keydown";
    };
    if (_23 instanceof KeypressEvent) {
        return "keypress";
    };
    if (_23 instanceof KeyupEvent) {
        return "keyup";
    };
    throw new Error("Failed pattern match");
});
var keyboardEventType = function (dict) {
    return dict.keyboardEventType;
};
var keyboardEventTargetHTMLWindow = new KeyboardEventTarget(function (__dict_KeyboardEvent_10) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(keyboardEventTypeShow)(typ));
    };
}, function (__dict_KeyboardEvent_11) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(keyboardEventTypeShow)(typ));
    };
});
var keyboardEventTargetHTMLElement = new KeyboardEventTarget(function (__dict_KeyboardEvent_12) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(keyboardEventTypeShow)(typ));
    };
}, function (__dict_KeyboardEvent_13) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeRemoveEventListener(Prelude.show(keyboardEventTypeShow)(typ));
    };
});
var keyboardEventTargetHTMLDocument = new KeyboardEventTarget(function (__dict_KeyboardEvent_14) {
    return function (typ) {
        return Data_DOM_Simple_Unsafe_Events.unsafeAddEventListener(Prelude.show(keyboardEventTypeShow)(typ));
    };
}, function (__dict_KeyboardEvent_15) {
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
var eventDOMEvent = new Event(Data_DOM_Simple_Unsafe_Events.unsafeEventProp("target"), Data_DOM_Simple_Unsafe_Events.unsafePreventDefault, Data_DOM_Simple_Unsafe_Events.unsafeStopPropagation);
var keyboardEventDOMEvent = new KeyboardEvent(function () {
    return eventDOMEvent;
}, Data_DOM_Simple_Unsafe_Events.unsafeEventProp("altKey"), Data_DOM_Simple_Unsafe_Events.unsafeEventProp("ctrlKey"), Data_DOM_Simple_Unsafe_Events.unsafeEventKey, Data_DOM_Simple_Unsafe_Events.unsafeEventKeyCode, function (ev) {
    return Prelude["<$>"](Control_Monad_Eff.functorEff)(toKeyLocation)(Data_DOM_Simple_Unsafe_Events.unsafeEventProp("keyLocation")(ev));
}, function (ev) {
    return Prelude["<$>"](Control_Monad_Eff.functorEff)(readKeyboardEventType)(Data_DOM_Simple_Unsafe_Events.unsafeEventProp("type")(ev));
}, Data_DOM_Simple_Unsafe_Events.unsafeEventProp("metaKey"), Data_DOM_Simple_Unsafe_Events.unsafeEventProp("shiftKey"));
var mouseEventDOMEvent = new MouseEvent(function () {
    return eventDOMEvent;
}, function (ev) {
    return Prelude["<$>"](Control_Monad_Eff.functorEff)(readMouseEventType)(Data_DOM_Simple_Unsafe_Events.unsafeEventProp("type")(ev));
}, Data_DOM_Simple_Unsafe_Events.unsafeEventProp("screenX"), Data_DOM_Simple_Unsafe_Events.unsafeEventProp("screenY"));
var progressEventDOMEvent = new ProgressEvent(function () {
    return eventDOMEvent;
}, Data_DOM_Simple_Unsafe_Events.unsafeEventProp("lengthComputable"), Data_DOM_Simple_Unsafe_Events.unsafeEventProp("loaded"), function (ev) {
    return Prelude["<$>"](Control_Monad_Eff.functorEff)(readProgressEventType)(Data_DOM_Simple_Unsafe_Events.unsafeEventProp("type")(ev));
}, Data_DOM_Simple_Unsafe_Events.unsafeEventProp("total"));
var uiEventDOMEvent = new UIEvent(function () {
    return eventDOMEvent;
}, Data_DOM_Simple_Unsafe_Events.unsafeEventProp("detail"), function (ev) {
    return Prelude["<$>"](Control_Monad_Eff.functorEff)(readUIEventType)(Data_DOM_Simple_Unsafe_Events.unsafeEventProp("type")(ev));
}, Data_DOM_Simple_Unsafe_Events.unsafeEventProp("view"));
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
var addProgressEventListener = function (dict) {
    return dict.addProgressEventListener;
};
var addMouseEventListener = function (dict) {
    return dict.addMouseEventListener;
};
var addKeyboardEventListener = function (dict) {
    return dict.addKeyboardEventListener;
};
module.exports = {
    ProgressAbortEvent: ProgressAbortEvent, 
    ProgressErrorEvent: ProgressErrorEvent, 
    ProgressLoadEvent: ProgressLoadEvent, 
    ProgressLoadEndEvent: ProgressLoadEndEvent, 
    ProgressLoadStartEvent: ProgressLoadStartEvent, 
    ProgressProgressEvent: ProgressProgressEvent, 
    ProgressTimeoutEvent: ProgressTimeoutEvent, 
    UILoadEvent: UILoadEvent, 
    UIUnloadEvent: UIUnloadEvent, 
    UIAbortEvent: UIAbortEvent, 
    UIErrorEvent: UIErrorEvent, 
    UISelectEvent: UISelectEvent, 
    UIResizeEvent: UIResizeEvent, 
    UIScrollEvent: UIScrollEvent, 
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
    ProgressEventTarget: ProgressEventTarget, 
    ProgressEvent: ProgressEvent, 
    UIEventTarget: UIEventTarget, 
    UIEvent: UIEvent, 
    KeyboardEventTarget: KeyboardEventTarget, 
    KeyboardEvent: KeyboardEvent, 
    MouseEventTarget: MouseEventTarget, 
    MouseEvent: MouseEvent, 
    Event: Event, 
    removeProgressEventListener: removeProgressEventListener, 
    addProgressEventListener: addProgressEventListener, 
    total: total, 
    loaded: loaded, 
    lengthComputable: lengthComputable, 
    progressEventType: progressEventType, 
    readProgressEventType: readProgressEventType, 
    removeUIEventListener: removeUIEventListener, 
    addUIEventListener: addUIEventListener, 
    detail: detail, 
    view: view, 
    uiEventType: uiEventType, 
    readUIEventType: readUIEventType, 
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
    readKeyboardEventType: readKeyboardEventType, 
    removeMouseEventListener: removeMouseEventListener, 
    addMouseEventListener: addMouseEventListener, 
    screenY: screenY, 
    screenX: screenX, 
    mouseEventType: mouseEventType, 
    readMouseEventType: readMouseEventType, 
    preventDefault: preventDefault, 
    stopPropagation: stopPropagation, 
    eventTarget: eventTarget, 
    eventDOMEvent: eventDOMEvent, 
    mouseEventTypeShow: mouseEventTypeShow, 
    mouseEventDOMEvent: mouseEventDOMEvent, 
    mouseEventTargetHTMLWindow: mouseEventTargetHTMLWindow, 
    mouseEventTargetHTMLDocument: mouseEventTargetHTMLDocument, 
    mouseEventTargetHTMLElement: mouseEventTargetHTMLElement, 
    keyboardEventTypeShow: keyboardEventTypeShow, 
    keyboardEventDOMEvent: keyboardEventDOMEvent, 
    keyboardEventTargetHTMLWindow: keyboardEventTargetHTMLWindow, 
    keyboardEventTargetHTMLDocument: keyboardEventTargetHTMLDocument, 
    keyboardEventTargetHTMLElement: keyboardEventTargetHTMLElement, 
    uiEventTypeShow: uiEventTypeShow, 
    uiEventDOMEvent: uiEventDOMEvent, 
    uiEventTargetHTMLWindow: uiEventTargetHTMLWindow, 
    showProgressEventType: showProgressEventType, 
    progressEventDOMEvent: progressEventDOMEvent, 
    progressEventTargetXMLHttpRequest: progressEventTargetXMLHttpRequest
};

},{"Control.Monad":21,"Control.Monad.Eff":10,"Data.DOM.Simple.Ajax":29,"Data.DOM.Simple.Types":31,"Data.DOM.Simple.Unsafe.Events":32,"Data.DOM.Simple.Window":34,"Prelude":63}],31:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
module.exports = {};

},{"Control.Monad.Eff":10,"Prelude":63}],32:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
function unsafeAddEventListener(targ) {                return function (cb) {                                  return function (src) {                                return function () {                                   src.addEventListener(targ, function(evt) {             cb(evt)();                                         });                                                };                                                 };                                                };                                                 };
function unsafeRemoveEventListener(targ) {                 return function (cb) {                                      return function (src) {                                    return function () {                                       src.removeEventListener(targ, function (evt) {             cb(evt)();                                             });                                                    };                                                     };                                                    };                                                     };
function unsafeStopPropagation(event) {   return function () {               event.stopPropagation();        }                              };
function unsafePreventDefault(event) {   return function () {               event.preventDefault();        }                              };
function unsafeEventKey(event) {              return function() {                           return event.key === undefined                 ? String.fromCharCode(event.keyCode)        : event.key;                           };                                        };
function unsafeEventKeyCode(event) {   return function() {                    return event.keyCode               };                                 };
function unsafeEventProp(prop) {    return function (event) {                 return function() {                       return event[prop];                   };                                    };                                    };
module.exports = {
    unsafeEventProp: unsafeEventProp, 
    unsafeEventKeyCode: unsafeEventKeyCode, 
    unsafeEventKey: unsafeEventKey, 
    unsafePreventDefault: unsafePreventDefault, 
    unsafeStopPropagation: unsafeStopPropagation, 
    unsafeRemoveEventListener: unsafeRemoveEventListener, 
    unsafeAddEventListener: unsafeAddEventListener
};

},{"Control.Monad.Eff":10,"Data.DOM.Simple.Types":31,"Prelude":63}],33:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
function unsafeDocument(win) {      return function () {                return win.document;            };                              };
function unsafeLocation(win) {     return function () {               return win.location;           };                             };
function unsafeGetLocation(loc) {  return function () {               return loc;                    };                             };
function unsafeSetLocation(value) {    return function (loc) {                return function () {                   location = value;                  };                                 };                                 };
function unsafeGetSearchLocation(loc) {   return function () {                      return loc.search;                    };                                    };
function unsafeSetTimeout(win) {   return function(delay) {     return function(func) {       return function() {         return win.setTimeout(func, delay);       };     };   }; };
function unsafeSetInterval(win) {   return function(delay) {     return function(func) {       return function() {         return win.setInterval(func, delay);       };     };   }; };
function unsafeClearTimeout(win) {   return function(timeout) {     return function() {       win.clearTimeout(timeout);     };   }; };
function unsafeInnerWidth(win) {   return function() {     return win.innerWidth;   }; };
function unsafeInnerHeight(win) {   return function() {     return win.innerHeight;   }; };
module.exports = {
    unsafeInnerHeight: unsafeInnerHeight, 
    unsafeInnerWidth: unsafeInnerWidth, 
    unsafeClearTimeout: unsafeClearTimeout, 
    unsafeSetInterval: unsafeSetInterval, 
    unsafeSetTimeout: unsafeSetTimeout, 
    unsafeGetSearchLocation: unsafeGetSearchLocation, 
    unsafeSetLocation: unsafeSetLocation, 
    unsafeGetLocation: unsafeGetLocation, 
    unsafeLocation: unsafeLocation, 
    unsafeDocument: unsafeDocument
};

},{"Control.Monad.Eff":10,"Data.DOM.Simple.Types":31,"Prelude":63}],34:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Data_DOM_Simple_Unsafe_Window = require("Data.DOM.Simple.Unsafe.Window");
var Prelude = require("Prelude");
var Data_String = require("Data.String");
var Data_Array = require("Data.Array");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
var Data_Maybe = require("Data.Maybe");
var globalWindow = window;;
var Location = function (getLocation, search, setLocation) {
    this.getLocation = getLocation;
    this.search = search;
    this.setLocation = setLocation;
};
var Window = function (clearTimeout, document, innerHeight, innerWidth, location, setInterval, setTimeout) {
    this.clearTimeout = clearTimeout;
    this.document = document;
    this.innerHeight = innerHeight;
    this.innerWidth = innerWidth;
    this.location = location;
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
var location = function (dict) {
    return dict.location;
};
var innerWidth = function (dict) {
    return dict.innerWidth;
};
var innerHeight = function (dict) {
    return dict.innerHeight;
};
var htmlWindow = new Window(Data_DOM_Simple_Unsafe_Window.unsafeClearTimeout, Data_DOM_Simple_Unsafe_Window.unsafeDocument, Data_DOM_Simple_Unsafe_Window.unsafeInnerHeight, Data_DOM_Simple_Unsafe_Window.unsafeInnerWidth, Data_DOM_Simple_Unsafe_Window.unsafeLocation, Data_DOM_Simple_Unsafe_Window.unsafeSetInterval, Data_DOM_Simple_Unsafe_Window.unsafeSetTimeout);
var getLocationValue = function (input) {
    return function (key) {
        var kvParser = function (value) {
            if (value.length === 2 && value[0] === key) {
                return new Data_Maybe.Just(value[1]);
            };
            return Data_Maybe.Nothing.value;
        };
        var sanitizedInput = (function () {
            var _85 = Data_String.indexOf("?")(input) === 0;
            if (_85) {
                return Data_String.drop(1)(input);
            };
            if (!_85) {
                return input;
            };
            throw new Error("Failed pattern match");
        })();
        var kv = Data_Array.map(Data_String.split("="))(Data_String.split("&")(sanitizedInput));
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
    globalWindow: globalWindow, 
    innerHeight: innerHeight, 
    innerWidth: innerWidth, 
    clearTimeout: clearTimeout, 
    setInterval: setInterval, 
    setTimeout: setTimeout, 
    location: location, 
    document: document, 
    search: search, 
    setLocation: setLocation, 
    getLocation: getLocation, 
    htmlWindow: htmlWindow, 
    domLocation: domLocation
};

},{"Control.Monad.Eff":10,"Data.Array":27,"Data.DOM.Simple.Types":31,"Data.DOM.Simple.Unsafe.Window":33,"Data.Maybe":42,"Data.String":50,"Prelude":63}],35:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Global = require("Global");
var Data_Function = require("Data.Function");
var Data_Enum = require("Data.Enum");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Int = require("Data.Int");
var Data_Maybe = require("Data.Maybe");
var Data_Time = require("Data.Time");

  function nowEpochMilliseconds() {
    return Date.now();
  }
  ;

  function nowImpl(ctor) {
    return function(){
      return ctor(new Date());
    };
  }
  ;

  function jsDateConstructor(x) {
    return new Date(x);
  }
  ;

  function jsDateMethod(method, date) {
    return date[method]();
  }
  ;

  function strictJsDate(Just, Nothing, s) {
    var epoch = Date.parse(s);
    if (isNaN(epoch)) return Nothing;
    var date = new Date(epoch);
    var s2 = date.toISOString();
    var idx = s2.indexOf(s);
    if (idx < 0) return Nothing;
    else return Just(date);
  }
  ;

/**
 *  | A year date component value.
 */
var Year = function (x) {
    return x;
};

/**
 *  | A month date component value.
 */
var January = (function () {
    function January() {

    };
    January.value = new January();
    return January;
})();

/**
 *  | A month date component value.
 */
var February = (function () {
    function February() {

    };
    February.value = new February();
    return February;
})();

/**
 *  | A month date component value.
 */
var March = (function () {
    function March() {

    };
    March.value = new March();
    return March;
})();

/**
 *  | A month date component value.
 */
var April = (function () {
    function April() {

    };
    April.value = new April();
    return April;
})();

/**
 *  | A month date component value.
 */
var May = (function () {
    function May() {

    };
    May.value = new May();
    return May;
})();

/**
 *  | A month date component value.
 */
var June = (function () {
    function June() {

    };
    June.value = new June();
    return June;
})();

/**
 *  | A month date component value.
 */
var July = (function () {
    function July() {

    };
    July.value = new July();
    return July;
})();

/**
 *  | A month date component value.
 */
var August = (function () {
    function August() {

    };
    August.value = new August();
    return August;
})();

/**
 *  | A month date component value.
 */
var September = (function () {
    function September() {

    };
    September.value = new September();
    return September;
})();

/**
 *  | A month date component value.
 */
var October = (function () {
    function October() {

    };
    October.value = new October();
    return October;
})();

/**
 *  | A month date component value.
 */
var November = (function () {
    function November() {

    };
    November.value = new November();
    return November;
})();

/**
 *  | A month date component value.
 */
var December = (function () {
    function December() {

    };
    December.value = new December();
    return December;
})();

/**
 *  | A timezone locale offset, measured in minutes.
 */
var LocaleOffset = function (x) {
    return x;
};

/**
 *  | A day-of-week date component value.
 */
var Sunday = (function () {
    function Sunday() {

    };
    Sunday.value = new Sunday();
    return Sunday;
})();

/**
 *  | A day-of-week date component value.
 */
var Monday = (function () {
    function Monday() {

    };
    Monday.value = new Monday();
    return Monday;
})();

/**
 *  | A day-of-week date component value.
 */
var Tuesday = (function () {
    function Tuesday() {

    };
    Tuesday.value = new Tuesday();
    return Tuesday;
})();

/**
 *  | A day-of-week date component value.
 */
var Wednesday = (function () {
    function Wednesday() {

    };
    Wednesday.value = new Wednesday();
    return Wednesday;
})();

/**
 *  | A day-of-week date component value.
 */
var Thursday = (function () {
    function Thursday() {

    };
    Thursday.value = new Thursday();
    return Thursday;
})();

/**
 *  | A day-of-week date component value.
 */
var Friday = (function () {
    function Friday() {

    };
    Friday.value = new Friday();
    return Friday;
})();

/**
 *  | A day-of-week date component value.
 */
var Saturday = (function () {
    function Saturday() {

    };
    Saturday.value = new Saturday();
    return Saturday;
})();

/**
 *  | A day-of-month date component value.
 */
var DayOfMonth = function (x) {
    return x;
};

/**
 *  | A combined date/time value. `Date`s cannot be constructed directly to
 *  | ensure they are not the `Invalid Date` value, and instead must be created
 *  | via `fromJSDate`, `fromEpochMilliseconds`, `fromString`, etc. or the `date`
 *  | and `dateTime` functions in the `Data.Date.Locale` and `Data.Date.UTC`
 *  | modules.
 */
var DateTime = function (x) {
    return x;
};

/**
 *  | Extracts a `JSDate` from a `Date`.
 */
var toJSDate = function (_165) {
    return _165;
};

/**
 *  | Gets the number of milliseconds elapsed since 1st January 1970 00:00:00
 *  | UTC for a `Date`.
 */
var toEpochMilliseconds = function (_166) {
    return jsDateMethod("getTime", _166);
};

/**
 *  | Get the locale time offset for a `Date`.
 */
var timezoneOffset = function (_167) {
    return jsDateMethod("getTimezoneOffset", _167);
};
var showYear = new Prelude.Show(function (_184) {
    return "(Year " + (Prelude.show(Data_Int.showInt)(_184) + ")");
});
var showMonth = new Prelude.Show(function (_187) {
    if (_187 instanceof January) {
        return "January";
    };
    if (_187 instanceof February) {
        return "February";
    };
    if (_187 instanceof March) {
        return "March";
    };
    if (_187 instanceof April) {
        return "April";
    };
    if (_187 instanceof May) {
        return "May";
    };
    if (_187 instanceof June) {
        return "June";
    };
    if (_187 instanceof July) {
        return "July";
    };
    if (_187 instanceof August) {
        return "August";
    };
    if (_187 instanceof September) {
        return "September";
    };
    if (_187 instanceof October) {
        return "October";
    };
    if (_187 instanceof November) {
        return "November";
    };
    if (_187 instanceof December) {
        return "December";
    };
    throw new Error("Failed pattern match");
});
var showDayOfWeek = new Prelude.Show(function (_196) {
    if (_196 instanceof Sunday) {
        return "Sunday";
    };
    if (_196 instanceof Monday) {
        return "Monday";
    };
    if (_196 instanceof Tuesday) {
        return "Tuesday";
    };
    if (_196 instanceof Wednesday) {
        return "Wednesday";
    };
    if (_196 instanceof Thursday) {
        return "Thursday";
    };
    if (_196 instanceof Friday) {
        return "Friday";
    };
    if (_196 instanceof Saturday) {
        return "Saturday";
    };
    throw new Error("Failed pattern match");
});
var showDate = new Prelude.Show(function (d) {
    return "(fromEpochMilliseconds " + (Prelude.show(Data_Time.showMilliseconds)(toEpochMilliseconds(d)) + ")");
});
var semiringYear = new Prelude.Semiring(function (_180) {
    return function (_181) {
        return Prelude["*"](Data_Int.semiringInt)(_180)(_181);
    };
}, function (_178) {
    return function (_179) {
        return Prelude["+"](Data_Int.semiringInt)(_178)(_179);
    };
}, Prelude.one(Data_Int.semiringInt), Prelude.zero(Data_Int.semiringInt));
var ringYear = new Prelude.Ring(function (_182) {
    return function (_183) {
        return Prelude["-"](Data_Int.ringInt)(_182)(_183);
    };
}, function () {
    return semiringYear;
});

/**
 *  | Gets a `Date` value for the current date/time according to the current
 *  | machine’s local time.
 */
var now = nowImpl(DateTime);
var monthToEnum = function (_168) {
    if (_168 === 0) {
        return new Data_Maybe.Just(January.value);
    };
    if (_168 === 1) {
        return new Data_Maybe.Just(February.value);
    };
    if (_168 === 2) {
        return new Data_Maybe.Just(March.value);
    };
    if (_168 === 3) {
        return new Data_Maybe.Just(April.value);
    };
    if (_168 === 4) {
        return new Data_Maybe.Just(May.value);
    };
    if (_168 === 5) {
        return new Data_Maybe.Just(June.value);
    };
    if (_168 === 6) {
        return new Data_Maybe.Just(July.value);
    };
    if (_168 === 7) {
        return new Data_Maybe.Just(August.value);
    };
    if (_168 === 8) {
        return new Data_Maybe.Just(September.value);
    };
    if (_168 === 9) {
        return new Data_Maybe.Just(October.value);
    };
    if (_168 === 10) {
        return new Data_Maybe.Just(November.value);
    };
    if (_168 === 11) {
        return new Data_Maybe.Just(December.value);
    };
    return Data_Maybe.Nothing.value;
};
var monthFromEnum = function (_169) {
    if (_169 instanceof January) {
        return 0;
    };
    if (_169 instanceof February) {
        return 1;
    };
    if (_169 instanceof March) {
        return 2;
    };
    if (_169 instanceof April) {
        return 3;
    };
    if (_169 instanceof May) {
        return 4;
    };
    if (_169 instanceof June) {
        return 5;
    };
    if (_169 instanceof July) {
        return 6;
    };
    if (_169 instanceof August) {
        return 7;
    };
    if (_169 instanceof September) {
        return 8;
    };
    if (_169 instanceof October) {
        return 9;
    };
    if (_169 instanceof November) {
        return 10;
    };
    if (_169 instanceof December) {
        return 11;
    };
    throw new Error("Failed pattern match");
};

/**
 *  | Attempts to create a `Date` from a `JSDate`. If the `JSDate` is an invalid
 *  | date `Nothing` is returned.
 */
var fromJSDate = function (d) {
    var _455 = Global.isNaN(jsDateMethod("getTime", d));
    if (_455) {
        return Data_Maybe.Nothing.value;
    };
    if (!_455) {
        return new Data_Maybe.Just(d);
    };
    throw new Error("Failed pattern match");
};

/**
 *  | Attempts to construct a date from a string value using JavaScript’s
 *  | [Date.parse() method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse).
 *  | `Nothing` is returned if the parse fails or the resulting date is invalid.
 */
var fromString = Prelude["<<<"](Prelude.semigroupoidArr)(fromJSDate)(jsDateConstructor);

/**
 *  | Attempts to construct a date from a simplified extended ISO 8601 format
 *  | (`YYYY-MM-DDTHH:mm:ss.sssZ`). `Nothing` is returned if the format is not
 *  | an exact match or the resulting date is invalid.
 */
var fromStringStrict = function (s) {
    return Prelude[">>="](Data_Maybe.bindMaybe)(strictJsDate(Data_Maybe.Just.create, Data_Maybe.Nothing.value, s))(fromJSDate);
};

/**
 *  | Creates a `Date` value from a number of milliseconds elapsed since 1st
 *  | January 1970 00:00:00 UTC.
 */
var fromEpochMilliseconds = Prelude["<<<"](Prelude.semigroupoidArr)(fromJSDate)(jsDateConstructor);
var eqYear = new Prelude.Eq(function (_174) {
    return function (_175) {
        return Prelude["/="](Data_Int.eqInt)(_174)(_175);
    };
}, function (_172) {
    return function (_173) {
        return Prelude["=="](Data_Int.eqInt)(_172)(_173);
    };
});
var ordYear = new Prelude.Ord(function () {
    return eqYear;
}, function (_176) {
    return function (_177) {
        return Prelude.compare(Data_Int.ordInt)(_176)(_177);
    };
});
var eqMonth = new Prelude.Eq(function (a) {
    return function (b) {
        return !Prelude["=="](eqMonth)(a)(b);
    };
}, function (_185) {
    return function (_186) {
        if (_185 instanceof January && _186 instanceof January) {
            return true;
        };
        if (_185 instanceof February && _186 instanceof February) {
            return true;
        };
        if (_185 instanceof March && _186 instanceof March) {
            return true;
        };
        if (_185 instanceof April && _186 instanceof April) {
            return true;
        };
        if (_185 instanceof May && _186 instanceof May) {
            return true;
        };
        if (_185 instanceof June && _186 instanceof June) {
            return true;
        };
        if (_185 instanceof July && _186 instanceof July) {
            return true;
        };
        if (_185 instanceof August && _186 instanceof August) {
            return true;
        };
        if (_185 instanceof September && _186 instanceof September) {
            return true;
        };
        if (_185 instanceof October && _186 instanceof October) {
            return true;
        };
        if (_185 instanceof November && _186 instanceof November) {
            return true;
        };
        if (_185 instanceof December && _186 instanceof December) {
            return true;
        };
        return false;
    };
});
var eqDayOfWeek = new Prelude.Eq(function (a) {
    return function (b) {
        return !Prelude["=="](eqDayOfWeek)(a)(b);
    };
}, function (_194) {
    return function (_195) {
        if (_194 instanceof Sunday && _195 instanceof Sunday) {
            return true;
        };
        if (_194 instanceof Monday && _195 instanceof Monday) {
            return true;
        };
        if (_194 instanceof Tuesday && _195 instanceof Tuesday) {
            return true;
        };
        if (_194 instanceof Wednesday && _195 instanceof Wednesday) {
            return true;
        };
        if (_194 instanceof Thursday && _195 instanceof Thursday) {
            return true;
        };
        if (_194 instanceof Friday && _195 instanceof Friday) {
            return true;
        };
        if (_194 instanceof Saturday && _195 instanceof Saturday) {
            return true;
        };
        return false;
    };
});
var eqDayOfMonth = new Prelude.Eq(function (_190) {
    return function (_191) {
        return Prelude["/="](Data_Int.eqInt)(_190)(_191);
    };
}, function (_188) {
    return function (_189) {
        return Prelude["=="](Data_Int.eqInt)(_188)(_189);
    };
});
var ordDayOfMonth = new Prelude.Ord(function () {
    return eqDayOfMonth;
}, function (_192) {
    return function (_193) {
        return Prelude.compare(Data_Int.ordInt)(_192)(_193);
    };
});
var eqDate = new Prelude.Eq(Data_Function.on(Prelude["/="](Data_Time.eqMilliseconds))(toEpochMilliseconds), Data_Function.on(Prelude["=="](Data_Time.eqMilliseconds))(toEpochMilliseconds));
var ordDate = new Prelude.Ord(function () {
    return eqDate;
}, Data_Function.on(Prelude.compare(Data_Time.ordMilliseconds))(toEpochMilliseconds));
var enumMonth = new Data_Enum.Enum(function () {
    return ordMonth;
}, 12, January.value, monthFromEnum, December.value, Data_Enum.defaultPred(monthToEnum)(monthFromEnum), Data_Enum.defaultSucc(monthToEnum)(monthFromEnum), monthToEnum);
var ordMonth = new Prelude.Ord(function () {
    return eqMonth;
}, Data_Function.on(Prelude.compare(Prelude.ordNumber))(Data_Enum.fromEnum(enumMonth)));
var dayOfWeekToEnum = function (_170) {
    if (_170 === 0) {
        return new Data_Maybe.Just(Sunday.value);
    };
    if (_170 === 1) {
        return new Data_Maybe.Just(Monday.value);
    };
    if (_170 === 2) {
        return new Data_Maybe.Just(Tuesday.value);
    };
    if (_170 === 3) {
        return new Data_Maybe.Just(Wednesday.value);
    };
    if (_170 === 4) {
        return new Data_Maybe.Just(Thursday.value);
    };
    if (_170 === 5) {
        return new Data_Maybe.Just(Friday.value);
    };
    if (_170 === 6) {
        return new Data_Maybe.Just(Saturday.value);
    };
    return Data_Maybe.Nothing.value;
};
var dayOfWeekFromEnum = function (_171) {
    if (_171 instanceof Sunday) {
        return 0;
    };
    if (_171 instanceof Monday) {
        return 1;
    };
    if (_171 instanceof Tuesday) {
        return 2;
    };
    if (_171 instanceof Wednesday) {
        return 3;
    };
    if (_171 instanceof Thursday) {
        return 4;
    };
    if (_171 instanceof Friday) {
        return 5;
    };
    if (_171 instanceof Saturday) {
        return 6;
    };
    throw new Error("Failed pattern match");
};
var enumDayOfWeek = new Data_Enum.Enum(function () {
    return ordDayOfWeek;
}, 7, Sunday.value, dayOfWeekFromEnum, Saturday.value, Data_Enum.defaultPred(dayOfWeekToEnum)(dayOfWeekFromEnum), Data_Enum.defaultSucc(dayOfWeekToEnum)(dayOfWeekFromEnum), dayOfWeekToEnum);
var ordDayOfWeek = new Prelude.Ord(function () {
    return eqDayOfWeek;
}, Data_Function.on(Prelude.compare(Prelude.ordNumber))(Data_Enum.fromEnum(enumDayOfWeek)));
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
    nowEpochMilliseconds: nowEpochMilliseconds, 
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
    showMonth: showMonth, 
    enumMonth: enumMonth, 
    eqDayOfMonth: eqDayOfMonth, 
    ordDayOfMonth: ordDayOfMonth, 
    eqDayOfWeek: eqDayOfWeek, 
    ordDayOfWeek: ordDayOfWeek, 
    showDayOfWeek: showDayOfWeek, 
    enumDayOfWeek: enumDayOfWeek
};

},{"Control.Monad.Eff":10,"Data.Enum":37,"Data.Function":39,"Data.Int":40,"Data.Maybe":42,"Data.Time":51,"Global":57,"Prelude":63}],36:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Control_Alt = require("Control.Alt");
var Control_Extend = require("Control.Extend");

/**
 *  | The `Either` type is used to represent a choice between two types of value.
 *  |
 *  | A common use case for `Either` is error handling, where `Left` is used to
 *  | carry an error value and `Right` is used to carry a success value.
 */
var Left = (function () {
    function Left(value0) {
        this.value0 = value0;
    };
    Left.create = function (value0) {
        return new Left(value0);
    };
    return Left;
})();

/**
 *  | The `Either` type is used to represent a choice between two types of value.
 *  |
 *  | A common use case for `Either` is error handling, where `Left` is used to
 *  | carry an error value and `Right` is used to carry a success value.
 */
var Right = (function () {
    function Right(value0) {
        this.value0 = value0;
    };
    Right.create = function (value0) {
        return new Right(value0);
    };
    return Right;
})();

/**
 *  | The `Show` instance allows `Either` values to be rendered as a string with
 *  | `show` whenever there is an `Show` instance for both type the `Either` can
 *  | contain.
 */
var showEither = function (__dict_Show_0) {
    return function (__dict_Show_1) {
        return new Prelude.Show(function (_80) {
            if (_80 instanceof Left) {
                return "Left (" + (Prelude.show(__dict_Show_0)(_80.value0) + ")");
            };
            if (_80 instanceof Right) {
                return "Right (" + (Prelude.show(__dict_Show_1)(_80.value0) + ")");
            };
            throw new Error("Failed pattern match");
        });
    };
};

/**
 *  | The `Functor` instance allows functions to transform the contents of a
 *  | `Right` with the `<$>` operator:
 *  |
 *  | ``` purescript
 *  | f <$> Right x == Right (f x)
 *  | ```
 *  |
 *  | `Left` values are untouched:
 *  |
 *  | ``` purescript
 *  | f <$> Left y == Left y
 *  | ```
 */
var functorEither = new Prelude.Functor(function (f) {
    return function (_78) {
        if (_78 instanceof Left) {
            return new Left(_78.value0);
        };
        if (_78 instanceof Right) {
            return new Right(f(_78.value0));
        };
        throw new Error("Failed pattern match");
    };
});

/**
 *  | The `Extend` instance allows sequencing of `Either` values and functions
 *  | that accept an `Either` and return a non-`Either` result using the
 *  | `<<=` operator.
 *  |
 *  | ``` purescript
 *  | f <<= Left x = Left x
 *  | f <<= Right x = Right (f x)
 *  | ```
 */
var extendEither = new Control_Extend.Extend(function (f) {
    return function (x) {
        if (x instanceof Left) {
            return new Left(x.value0);
        };
        return new Right(f(x));
    };
}, function () {
    return functorEither;
});

/**
 *  | The `Eq` instance allows `Either` values to be checked for equality with
 *  | `==` and inequality with `/=` whenever there is an `Eq` instance for both
 *  | types the `Either` can contain.
 */
var eqEither = function (__dict_Eq_4) {
    return function (__dict_Eq_5) {
        return new Prelude.Eq(function (a) {
            return function (b) {
                return !Prelude["=="](eqEither(__dict_Eq_4)(__dict_Eq_5))(a)(b);
            };
        }, function (_81) {
            return function (_82) {
                if (_81 instanceof Left && _82 instanceof Left) {
                    return Prelude["=="](__dict_Eq_4)(_81.value0)(_82.value0);
                };
                if (_81 instanceof Right && _82 instanceof Right) {
                    return Prelude["=="](__dict_Eq_5)(_81.value0)(_82.value0);
                };
                return false;
            };
        });
    };
};

/**
 *  | The `Ord` instance allows `Either` values to be compared with
 *  | `compare`, `>`, `>=`, `<` and `<=` whenever there is an `Ord` instance for
 *  | both types the `Either` can contain.
 *  |
 *  | Any `Left` value is considered to be less than a `Right` value.
 */
var ordEither = function (__dict_Ord_2) {
    return function (__dict_Ord_3) {
        return new Prelude.Ord(function () {
            return eqEither(__dict_Ord_2["__superclass_Prelude.Eq_0"]())(__dict_Ord_3["__superclass_Prelude.Eq_0"]());
        }, function (_83) {
            return function (_84) {
                if (_83 instanceof Left && _84 instanceof Left) {
                    return Prelude.compare(__dict_Ord_2)(_83.value0)(_84.value0);
                };
                if (_83 instanceof Right && _84 instanceof Right) {
                    return Prelude.compare(__dict_Ord_3)(_83.value0)(_84.value0);
                };
                if (_83 instanceof Left) {
                    return Prelude.LT.value;
                };
                if (_84 instanceof Left) {
                    return Prelude.GT.value;
                };
                throw new Error("Failed pattern match");
            };
        });
    };
};

/**
 *  | Takes two functions and an `Either` value, if the value is a `Left` the
 *  | inner value is applied to the first function, if the value is a `Right`
 *  | the inner value is applied to the second function.
 *  |
 *  | ``` purescript
 *  | either f g (Left x) == f x
 *  | either f g (Right y) == g y
 *  | ```
 */
var either = function (f) {
    return function (g) {
        return function (_77) {
            if (_77 instanceof Left) {
                return f(_77.value0);
            };
            if (_77 instanceof Right) {
                return g(_77.value0);
            };
            throw new Error("Failed pattern match");
        };
    };
};

/**
 *  | Returns `true` when the `Either` value was constructed with `Left`.
 */
var isLeft = either(Prelude["const"](true))(Prelude["const"](false));

/**
 *  | Returns `true` when the `Either` value was constructed with `Right`.
 */
var isRight = either(Prelude["const"](false))(Prelude["const"](true));

/**
 *  | The `Apply` instance allows functions contained within a `Right` to
 *  | transform a value contained within a `Right` using the `(<*>)` operator:
 *  |
 *  | ``` purescript
 *  | Right f <*> Right x == Right (f x)
 *  | ```
 *  |
 *  | `Left` values are left untouched:
 *  |
 *  | ``` purescript
 *  | Left f <*> Right x == Left x
 *  | Right f <*> Left y == Left y
 *  | ```
 *  |
 *  | Combining `Functor`'s `<$>` with `Apply`'s `<*>` can be used transform a
 *  | pure function to take `Either`-typed arguments so `f :: a -> b -> c`
 *  | becomes `f :: Either l a -> Either l b -> Either l c`:
 *  |
 *  | ``` purescript
 *  | f <$> Right x <*> Right y == Right (f x y)
 *  | ```
 *  |
 *  | The `Left`-preserving behaviour of both operators means the result of
 *  | an expression like the above but where any one of the values is `Left`
 *  | means the whole result becomes `Left` also, taking the first `Left` value
 *  | found:
 *  |
 *  | ``` purescript
 *  | f <$> Left x <*> Right y == Left x
 *  | f <$> Right x <*> Left y == Left y
 *  | f <$> Left x <*> Left y == Left x
 *  | ```
 */
var applyEither = new Prelude.Apply(function (_79) {
    return function (r) {
        if (_79 instanceof Left) {
            return new Left(_79.value0);
        };
        if (_79 instanceof Right) {
            return Prelude["<$>"](functorEither)(_79.value0)(r);
        };
        throw new Error("Failed pattern match");
    };
}, function () {
    return functorEither;
});

/**
 *  | The `Bind` instance allows sequencing of `Either` values and functions that
 *  | return an `Either` by using the `>>=` operator:
 *  |
 *  | ``` purescript
 *  | Left x >>= f = Left x
 *  | Right x >>= f = f x
 *  | ```
 */
var bindEither = new Prelude.Bind(either(function (e) {
    return function (_76) {
        return new Left(e);
    };
})(function (a) {
    return function (f) {
        return f(a);
    };
}), function () {
    return applyEither;
});

/**
 *  | The `Applicative` instance enables lifting of values into `Either` with the
 *  | `pure` or `return` function (`return` is an alias for `pure`):
 *  |
 *  | ``` purescript
 *  | pure x :: Either _ _ == Right x
 *  | return x :: Either _ _ == Right x
 *  | ```
 *  |
 *  | Combining `Functor`'s `<$>` with `Apply`'s `<*>` and `Applicative`'s
 *  | `pure` can be used to pass a mixture of `Either` and non-`Either` typed
 *  | values to a function that does not usually expect them, by using `pure`
 *  | for any value that is not already `Either` typed:
 *  |
 *  | ``` purescript
 *  | f <$> Right x <*> pure y == Right (f x y)
 *  | ```
 *  |
 *  | Even though `pure = Right` it is recommended to use `pure` in situations
 *  | like this as it allows the choice of `Applicative` to be changed later
 *  | without having to go through and replace `Right` with a new constructor.
 */
var applicativeEither = new Prelude.Applicative(function () {
    return applyEither;
}, Right.create);

/**
 *  | The `Monad` instance guarantees that there are both `Applicative` and
 *  | `Bind` instances for `Either`. This also enables the `do` syntactic sugar:
 *  |
 *  | ``` purescript
 *  | do
 *  |   x' <- x
 *  |   y' <- y
 *  |   pure (f x' y')
 *  | ```
 *  |
 *  | Which is equivalent to:
 *  |
 *  | ``` purescript
 *  | x >>= (\x' -> y >>= (\y' -> pure (f x' y')))
 *  | ```
 */
var monadEither = new Prelude.Monad(function () {
    return applicativeEither;
}, function () {
    return bindEither;
});

/**
 *  | The `Alt` instance allows for a choice to be made between two `Either`
 *  | values with the `<|>` operator, where the first `Right` encountered
 *  | is taken.
 *  |
 *  | ``` purescript
 *  | Right x <|> Right y == Right x
 *  | Left x <|> Right y == Right y
 *  | Left x <|> Left y == Left y
 *  | ```
 */
var altEither = new Control_Alt.Alt(function (l) {
    return function (r) {
        if (l instanceof Left) {
            return r;
        };
        return l;
    };
}, function () {
    return functorEither;
});
module.exports = {
    Left: Left, 
    Right: Right, 
    isRight: isRight, 
    isLeft: isLeft, 
    either: either, 
    functorEither: functorEither, 
    applyEither: applyEither, 
    applicativeEither: applicativeEither, 
    altEither: altEither, 
    bindEither: bindEither, 
    monadEither: monadEither, 
    extendEither: extendEither, 
    showEither: showEither, 
    eqEither: eqEither, 
    ordEither: ordEither
};

},{"Control.Alt":3,"Control.Extend":7,"Prelude":63}],37:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Data_Maybe = require("Data.Maybe");
var Data_Maybe_Unsafe = require("Data.Maybe.Unsafe");
var Data_Unfoldable = require("Data.Unfoldable");
var Data_Char = require("Data.Char");
var Data_Either = require("Data.Either");
var Data_Tuple = require("Data.Tuple");
var Data_Array = require("Data.Array");
function floor(n){ return Math.floor(n); };
var Cardinality = function (x) {
    return x;
};

/**
 *  | Type class for enumerations. This should not be considered a part of a
 *  | numeric hierarchy, ala Haskell. Rather, this is a type class for small,
 *  | ordered sum types with statically-determined cardinality and the ability 
 *  | to easily compute successor and predecessor elements. e.g. `DayOfWeek`, etc.
 *  |
 *  | Laws:
 *  |
 *  | - ```succ firstEnum >>= succ >>= succ ... succ [cardinality - 1 times] == lastEnum```
 *  | - ```pred lastEnum  >>= pred >>= pred ... pred [cardinality - 1 times] == firstEnum```
 *  | - ```e1 `compare` e2 == fromEnum e1 `compare` fromEnum e2```
 *  | - ```forall a > firstEnum: pred a >>= succ == Just a```
 *  | - ```forall a < lastEnum:  succ a >>= pred == Just a```
 *  | - ```pred >=> succ >=> pred = pred```
 *  | - ```succ >=> pred >=> succ = succ```
 *  | - ```toEnum (fromEnum a) = Just a```
 *  | - ```forall a > firstEnum: fromEnum <$> pred a = Just (fromEnum a - 1)```
 *  | - ```forall a < lastEnum:  fromEnum <$> succ a = Just (fromEnum a + 1)```
 */
var Enum = function (__superclass_Prelude$dotOrd_0, cardinality, firstEnum, fromEnum, lastEnum, pred, succ, toEnum) {
    this["__superclass_Prelude.Ord_0"] = __superclass_Prelude$dotOrd_0;
    this.cardinality = cardinality;
    this.firstEnum = firstEnum;
    this.fromEnum = fromEnum;
    this.lastEnum = lastEnum;
    this.pred = pred;
    this.succ = succ;
    this.toEnum = toEnum;
};

/**
 *  | Type class for enumerations. This should not be considered a part of a
 *  | numeric hierarchy, ala Haskell. Rather, this is a type class for small,
 *  | ordered sum types with statically-determined cardinality and the ability 
 *  | to easily compute successor and predecessor elements. e.g. `DayOfWeek`, etc.
 *  |
 *  | Laws:
 *  |
 *  | - ```succ firstEnum >>= succ >>= succ ... succ [cardinality - 1 times] == lastEnum```
 *  | - ```pred lastEnum  >>= pred >>= pred ... pred [cardinality - 1 times] == firstEnum```
 *  | - ```e1 `compare` e2 == fromEnum e1 `compare` fromEnum e2```
 *  | - ```forall a > firstEnum: pred a >>= succ == Just a```
 *  | - ```forall a < lastEnum:  succ a >>= pred == Just a```
 *  | - ```pred >=> succ >=> pred = pred```
 *  | - ```succ >=> pred >=> succ = succ```
 *  | - ```toEnum (fromEnum a) = Just a```
 *  | - ```forall a > firstEnum: fromEnum <$> pred a = Just (fromEnum a - 1)```
 *  | - ```forall a < lastEnum:  fromEnum <$> succ a = Just (fromEnum a + 1)```
 */
var toEnum = function (dict) {
    return dict.toEnum;
};

/**
 *  | Type class for enumerations. This should not be considered a part of a
 *  | numeric hierarchy, ala Haskell. Rather, this is a type class for small,
 *  | ordered sum types with statically-determined cardinality and the ability 
 *  | to easily compute successor and predecessor elements. e.g. `DayOfWeek`, etc.
 *  |
 *  | Laws:
 *  |
 *  | - ```succ firstEnum >>= succ >>= succ ... succ [cardinality - 1 times] == lastEnum```
 *  | - ```pred lastEnum  >>= pred >>= pred ... pred [cardinality - 1 times] == firstEnum```
 *  | - ```e1 `compare` e2 == fromEnum e1 `compare` fromEnum e2```
 *  | - ```forall a > firstEnum: pred a >>= succ == Just a```
 *  | - ```forall a < lastEnum:  succ a >>= pred == Just a```
 *  | - ```pred >=> succ >=> pred = pred```
 *  | - ```succ >=> pred >=> succ = succ```
 *  | - ```toEnum (fromEnum a) = Just a```
 *  | - ```forall a > firstEnum: fromEnum <$> pred a = Just (fromEnum a - 1)```
 *  | - ```forall a < lastEnum:  fromEnum <$> succ a = Just (fromEnum a + 1)```
 */
var succ = function (dict) {
    return dict.succ;
};
var runCardinality = function (_153) {
    return _153;
};
var tupleCardinality = function (__dict_Enum_0) {
    return function (__dict_Enum_1) {
        return function (l) {
            return function (r) {
                return Cardinality(runCardinality(l) * runCardinality(r));
            };
        };
    };
};

/**
 *  | Type class for enumerations. This should not be considered a part of a
 *  | numeric hierarchy, ala Haskell. Rather, this is a type class for small,
 *  | ordered sum types with statically-determined cardinality and the ability 
 *  | to easily compute successor and predecessor elements. e.g. `DayOfWeek`, etc.
 *  |
 *  | Laws:
 *  |
 *  | - ```succ firstEnum >>= succ >>= succ ... succ [cardinality - 1 times] == lastEnum```
 *  | - ```pred lastEnum  >>= pred >>= pred ... pred [cardinality - 1 times] == firstEnum```
 *  | - ```e1 `compare` e2 == fromEnum e1 `compare` fromEnum e2```
 *  | - ```forall a > firstEnum: pred a >>= succ == Just a```
 *  | - ```forall a < lastEnum:  succ a >>= pred == Just a```
 *  | - ```pred >=> succ >=> pred = pred```
 *  | - ```succ >=> pred >=> succ = succ```
 *  | - ```toEnum (fromEnum a) = Just a```
 *  | - ```forall a > firstEnum: fromEnum <$> pred a = Just (fromEnum a - 1)```
 *  | - ```forall a < lastEnum:  fromEnum <$> succ a = Just (fromEnum a + 1)```
 */
var pred = function (dict) {
    return dict.pred;
};
var maybeCardinality = function (__dict_Enum_2) {
    return function (c) {
        return Cardinality(1 + runCardinality(c));
    };
};
var maybeToEnum = function (__dict_Enum_3) {
    return function (carda) {
        return function (n) {
            if (n <= runCardinality(maybeCardinality(__dict_Enum_3)(carda))) {
                var _405 = n === 0;
                if (_405) {
                    return Data_Maybe.Just.create(Data_Maybe.Nothing.value);
                };
                if (!_405) {
                    return Data_Maybe.Just.create(toEnum(__dict_Enum_3)(n - 1));
                };
                throw new Error("Failed pattern match");
            };
            return Data_Maybe.Nothing.value;
        };
    };
};

/**
 *  | Type class for enumerations. This should not be considered a part of a
 *  | numeric hierarchy, ala Haskell. Rather, this is a type class for small,
 *  | ordered sum types with statically-determined cardinality and the ability 
 *  | to easily compute successor and predecessor elements. e.g. `DayOfWeek`, etc.
 *  |
 *  | Laws:
 *  |
 *  | - ```succ firstEnum >>= succ >>= succ ... succ [cardinality - 1 times] == lastEnum```
 *  | - ```pred lastEnum  >>= pred >>= pred ... pred [cardinality - 1 times] == firstEnum```
 *  | - ```e1 `compare` e2 == fromEnum e1 `compare` fromEnum e2```
 *  | - ```forall a > firstEnum: pred a >>= succ == Just a```
 *  | - ```forall a < lastEnum:  succ a >>= pred == Just a```
 *  | - ```pred >=> succ >=> pred = pred```
 *  | - ```succ >=> pred >=> succ = succ```
 *  | - ```toEnum (fromEnum a) = Just a```
 *  | - ```forall a > firstEnum: fromEnum <$> pred a = Just (fromEnum a - 1)```
 *  | - ```forall a < lastEnum:  fromEnum <$> succ a = Just (fromEnum a + 1)```
 */
var lastEnum = function (dict) {
    return dict.lastEnum;
};

/**
 *  | Property: ```forall e in intStepFromTo step a b: a <= e <= b```
 */
var intStepFromTo = function (step) {
    return function (from) {
        return function (to) {
            return Data_Unfoldable.unfoldr(Data_Unfoldable.unfoldableArray)(function (e) {
                var _406 = e <= to;
                if (_406) {
                    return Data_Maybe.Just.create(new Data_Tuple.Tuple(e, e + step));
                };
                if (!_406) {
                    return Data_Maybe.Nothing.value;
                };
                throw new Error("Failed pattern match");
            })(from);
        };
    };
};

/**
 *  | Property: ```forall e in intFromTo a b: a <= e <= b```
 */
var intFromTo = intStepFromTo(1);

/**
 *  | Type class for enumerations. This should not be considered a part of a
 *  | numeric hierarchy, ala Haskell. Rather, this is a type class for small,
 *  | ordered sum types with statically-determined cardinality and the ability 
 *  | to easily compute successor and predecessor elements. e.g. `DayOfWeek`, etc.
 *  |
 *  | Laws:
 *  |
 *  | - ```succ firstEnum >>= succ >>= succ ... succ [cardinality - 1 times] == lastEnum```
 *  | - ```pred lastEnum  >>= pred >>= pred ... pred [cardinality - 1 times] == firstEnum```
 *  | - ```e1 `compare` e2 == fromEnum e1 `compare` fromEnum e2```
 *  | - ```forall a > firstEnum: pred a >>= succ == Just a```
 *  | - ```forall a < lastEnum:  succ a >>= pred == Just a```
 *  | - ```pred >=> succ >=> pred = pred```
 *  | - ```succ >=> pred >=> succ = succ```
 *  | - ```toEnum (fromEnum a) = Just a```
 *  | - ```forall a > firstEnum: fromEnum <$> pred a = Just (fromEnum a - 1)```
 *  | - ```forall a < lastEnum:  fromEnum <$> succ a = Just (fromEnum a + 1)```
 */
var fromEnum = function (dict) {
    return dict.fromEnum;
};
var tupleFromEnum = function (__dict_Enum_4) {
    return function (__dict_Enum_5) {
        return function (cardb) {
            return function (_156) {
                return fromEnum(__dict_Enum_4)(_156.value0) * runCardinality(cardb) + fromEnum(__dict_Enum_5)(_156.value1);
            };
        };
    };
};

/**
 *  | Type class for enumerations. This should not be considered a part of a
 *  | numeric hierarchy, ala Haskell. Rather, this is a type class for small,
 *  | ordered sum types with statically-determined cardinality and the ability 
 *  | to easily compute successor and predecessor elements. e.g. `DayOfWeek`, etc.
 *  |
 *  | Laws:
 *  |
 *  | - ```succ firstEnum >>= succ >>= succ ... succ [cardinality - 1 times] == lastEnum```
 *  | - ```pred lastEnum  >>= pred >>= pred ... pred [cardinality - 1 times] == firstEnum```
 *  | - ```e1 `compare` e2 == fromEnum e1 `compare` fromEnum e2```
 *  | - ```forall a > firstEnum: pred a >>= succ == Just a```
 *  | - ```forall a < lastEnum:  succ a >>= pred == Just a```
 *  | - ```pred >=> succ >=> pred = pred```
 *  | - ```succ >=> pred >=> succ = succ```
 *  | - ```toEnum (fromEnum a) = Just a```
 *  | - ```forall a > firstEnum: fromEnum <$> pred a = Just (fromEnum a - 1)```
 *  | - ```forall a < lastEnum:  fromEnum <$> succ a = Just (fromEnum a + 1)```
 */
var firstEnum = function (dict) {
    return dict.firstEnum;
};

/**
 *  | Property: ```fromEnum a = a', fromEnum b = b' => forall e', a' <= e' <= b': Exists e: toEnum e' = Just e```
 *  |
 *  | Following from the propery of `intFromTo`, we are sure all elements in `intFromTo (fromEnum a) (fromEnum b)` are `Just`s.
 */
var enumFromTo = function (__dict_Enum_6) {
    return function (a) {
        return function (b) {
            var b$prime = fromEnum(__dict_Enum_6)(b);
            var a$prime = fromEnum(__dict_Enum_6)(a);
            return Prelude["<$>"](Data_Array.functorArray)(Prelude[">>>"](Prelude.semigroupoidArr)(toEnum(__dict_Enum_6))(Data_Maybe_Unsafe.fromJust))(intFromTo(a$prime)(b$prime));
        };
    };
};

/**
 *  | `[a,b..c]`
 *  | 
 *  | Correctness for using `fromJust` is the same as for `enumFromTo`.
 */
var enumFromThenTo = function (__dict_Enum_7) {
    return function (a) {
        return function (b) {
            return function (c) {
                var c$prime = fromEnum(__dict_Enum_7)(c);
                var b$prime = fromEnum(__dict_Enum_7)(b);
                var a$prime = fromEnum(__dict_Enum_7)(a);
                return Prelude["<$>"](Data_Array.functorArray)(Prelude[">>>"](Prelude.semigroupoidArr)(toEnum(__dict_Enum_7))(Data_Maybe_Unsafe.fromJust))(intStepFromTo(b$prime - a$prime)(a$prime)(c$prime));
            };
        };
    };
};
var eitherFromEnum = function (__dict_Enum_8) {
    return function (__dict_Enum_9) {
        return function (carda) {
            return function (_157) {
                if (_157 instanceof Data_Either.Left) {
                    return fromEnum(__dict_Enum_8)(_157.value0);
                };
                if (_157 instanceof Data_Either.Right) {
                    return fromEnum(__dict_Enum_9)(_157.value0) + runCardinality(carda);
                };
                throw new Error("Failed pattern match");
            };
        };
    };
};
var eitherCardinality = function (__dict_Enum_10) {
    return function (__dict_Enum_11) {
        return function (l) {
            return function (r) {
                return Cardinality(runCardinality(l) + runCardinality(r));
            };
        };
    };
};
var eitherToEnum = function (__dict_Enum_12) {
    return function (__dict_Enum_13) {
        return function (carda) {
            return function (cardb) {
                return function (n) {
                    var _415 = n >= 0 && n < runCardinality(carda);
                    if (_415) {
                        return Prelude["<$>"](Data_Maybe.functorMaybe)(Data_Either.Left.create)(toEnum(__dict_Enum_12)(n));
                    };
                    if (!_415) {
                        var _416 = n >= runCardinality(carda) && n < runCardinality(eitherCardinality(__dict_Enum_12)(__dict_Enum_13)(carda)(cardb));
                        if (_416) {
                            return Prelude["<$>"](Data_Maybe.functorMaybe)(Data_Either.Right.create)(toEnum(__dict_Enum_13)(n - runCardinality(carda)));
                        };
                        if (!_416) {
                            return Data_Maybe.Nothing.value;
                        };
                        throw new Error("Failed pattern match");
                    };
                    throw new Error("Failed pattern match");
                };
            };
        };
    };
};
var div = function (a) {
    return function (b) {
        return floor(a / b);
    };
};

/**
 *  | All of these are as a workaround for `ScopedTypeVariables`. (not yet supported in Purescript)
 */
var tupleToEnum = function (__dict_Enum_14) {
    return function (__dict_Enum_15) {
        return function (cardb) {
            return function (n) {
                return Prelude["<*>"](Data_Maybe.applyMaybe)(Prelude["<$>"](Data_Maybe.functorMaybe)(Data_Tuple.Tuple.create)(toEnum(__dict_Enum_14)(div(n)(runCardinality(cardb)))))(toEnum(__dict_Enum_15)(n % runCardinality(cardb)));
            };
        };
    };
};

/**
 *  | Runs in `O(n)` where `n` is `fromEnum a`
 *  |
 *  | ```defaultToEnum succ firstEnum = toEnum```
 */
var defaultToEnum = function (succ$prime) {
    return function (firstEnum$prime) {
        return function (n) {
            if (n < 0) {
                return Data_Maybe.Nothing.value;
            };
            if (n === 0) {
                return new Data_Maybe.Just(firstEnum$prime);
            };
            return Prelude[">>="](Data_Maybe.bindMaybe)(defaultToEnum(succ$prime)(firstEnum$prime)(n - 1))(succ$prime);
        };
    };
};

/**
 *  | ```defaultSucc toEnum fromEnum = succ```
 */
var defaultSucc = function (toEnum$prime) {
    return function (fromEnum$prime) {
        return function (a) {
            return toEnum$prime(fromEnum$prime(a) + 1);
        };
    };
};

/**
 *  | ```defaultPred toEnum fromEnum = pred```
 */
var defaultPred = function (toEnum$prime) {
    return function (fromEnum$prime) {
        return function (a) {
            return toEnum$prime(fromEnum$prime(a) - 1);
        };
    };
};

/**
 *  | Runs in `O(n)` where `n` is `fromEnum a`
 *  |
 *  | ```defaultFromEnum pred = fromEnum```
 */
var defaultFromEnum = function (pred$prime) {
    return function (e) {
        return Data_Maybe.maybe(0)(function (prd) {
            return defaultFromEnum(pred$prime)(prd) + 1;
        })(pred$prime(e));
    };
};

/**
 *  | To avoid a compiler bug - can't pass self-class functions, workaround: need to make a concrete function.
 */
var charToEnum = function (n) {
    if (n >= 0 && n <= 65535) {
        return Data_Maybe.Just.create(Data_Char.fromCharCode(n));
    };
    return Data_Maybe.Nothing.value;
};
var charFromEnum = Data_Char.toCharCode;

/**
 *  | ## Instances
 */
var enumChar = new Enum(function () {
    return Data_Char.ordChar;
}, 65535 + 1, Data_Char.fromCharCode(0), charFromEnum, Data_Char.fromCharCode(65535), defaultPred(charToEnum)(charFromEnum), defaultSucc(charToEnum)(charFromEnum), charToEnum);

/**
 *  | Type class for enumerations. This should not be considered a part of a
 *  | numeric hierarchy, ala Haskell. Rather, this is a type class for small,
 *  | ordered sum types with statically-determined cardinality and the ability 
 *  | to easily compute successor and predecessor elements. e.g. `DayOfWeek`, etc.
 *  |
 *  | Laws:
 *  |
 *  | - ```succ firstEnum >>= succ >>= succ ... succ [cardinality - 1 times] == lastEnum```
 *  | - ```pred lastEnum  >>= pred >>= pred ... pred [cardinality - 1 times] == firstEnum```
 *  | - ```e1 `compare` e2 == fromEnum e1 `compare` fromEnum e2```
 *  | - ```forall a > firstEnum: pred a >>= succ == Just a```
 *  | - ```forall a < lastEnum:  succ a >>= pred == Just a```
 *  | - ```pred >=> succ >=> pred = pred```
 *  | - ```succ >=> pred >=> succ = succ```
 *  | - ```toEnum (fromEnum a) = Just a```
 *  | - ```forall a > firstEnum: fromEnum <$> pred a = Just (fromEnum a - 1)```
 *  | - ```forall a < lastEnum:  fromEnum <$> succ a = Just (fromEnum a + 1)```
 */
var cardinality = function (dict) {
    return dict.cardinality;
};
var enumEither = function (__dict_Enum_16) {
    return function (__dict_Enum_17) {
        return new Enum(function () {
            return Data_Either.ordEither(__dict_Enum_16["__superclass_Prelude.Ord_0"]())(__dict_Enum_17["__superclass_Prelude.Ord_0"]());
        }, eitherCardinality(__dict_Enum_16)(__dict_Enum_17)(cardinality(__dict_Enum_16))(cardinality(__dict_Enum_17)), new Data_Either.Left(firstEnum(__dict_Enum_16)), eitherFromEnum(__dict_Enum_16)(__dict_Enum_17)(cardinality(__dict_Enum_16)), new Data_Either.Right(lastEnum(__dict_Enum_17)), function (_164) {
            if (_164 instanceof Data_Either.Left) {
                return Data_Maybe.maybe(Data_Maybe.Nothing.value)(Prelude["<<<"](Prelude.semigroupoidArr)(Data_Maybe.Just.create)(Data_Either.Left.create))(pred(__dict_Enum_16)(_164.value0));
            };
            if (_164 instanceof Data_Either.Right) {
                return Data_Maybe.maybe(Data_Maybe.Just.create(new Data_Either.Left(lastEnum(__dict_Enum_16))))(Prelude["<<<"](Prelude.semigroupoidArr)(Data_Maybe.Just.create)(Data_Either.Right.create))(pred(__dict_Enum_17)(_164.value0));
            };
            throw new Error("Failed pattern match");
        }, function (_163) {
            if (_163 instanceof Data_Either.Left) {
                return Data_Maybe.maybe(Data_Maybe.Just.create(new Data_Either.Right(firstEnum(__dict_Enum_17))))(Prelude["<<<"](Prelude.semigroupoidArr)(Data_Maybe.Just.create)(Data_Either.Left.create))(succ(__dict_Enum_16)(_163.value0));
            };
            if (_163 instanceof Data_Either.Right) {
                return Data_Maybe.maybe(Data_Maybe.Nothing.value)(Prelude["<<<"](Prelude.semigroupoidArr)(Data_Maybe.Just.create)(Data_Either.Right.create))(succ(__dict_Enum_17)(_163.value0));
            };
            throw new Error("Failed pattern match");
        }, eitherToEnum(__dict_Enum_16)(__dict_Enum_17)(cardinality(__dict_Enum_16))(cardinality(__dict_Enum_17)));
    };
};
var enumMaybe = function (__dict_Enum_18) {
    return new Enum(function () {
        return Data_Maybe.ordMaybe(__dict_Enum_18["__superclass_Prelude.Ord_0"]());
    }, maybeCardinality(__dict_Enum_18)(cardinality(__dict_Enum_18)), Data_Maybe.Nothing.value, function (_160) {
        if (_160 instanceof Data_Maybe.Nothing) {
            return 0;
        };
        if (_160 instanceof Data_Maybe.Just) {
            return fromEnum(__dict_Enum_18)(_160.value0) + 1;
        };
        throw new Error("Failed pattern match");
    }, Data_Maybe.Just.create(lastEnum(__dict_Enum_18)), function (_159) {
        if (_159 instanceof Data_Maybe.Nothing) {
            return Data_Maybe.Nothing.value;
        };
        if (_159 instanceof Data_Maybe.Just) {
            return Prelude["<$>"](Data_Maybe.functorMaybe)(Data_Maybe.Just.create)(pred(__dict_Enum_18)(_159.value0));
        };
        throw new Error("Failed pattern match");
    }, function (_158) {
        if (_158 instanceof Data_Maybe.Nothing) {
            return Data_Maybe.Just.create(firstEnum(enumMaybe(__dict_Enum_18)));
        };
        if (_158 instanceof Data_Maybe.Just) {
            return Prelude["<$>"](Data_Maybe.functorMaybe)(Data_Maybe.Just.create)(succ(__dict_Enum_18)(_158.value0));
        };
        throw new Error("Failed pattern match");
    }, maybeToEnum(__dict_Enum_18)(cardinality(__dict_Enum_18)));
};
var enumTuple = function (__dict_Enum_19) {
    return function (__dict_Enum_20) {
        return new Enum(function () {
            return Data_Tuple.ordTuple(__dict_Enum_19["__superclass_Prelude.Ord_0"]())(__dict_Enum_20["__superclass_Prelude.Ord_0"]());
        }, tupleCardinality(__dict_Enum_19)(__dict_Enum_20)(cardinality(__dict_Enum_19))(cardinality(__dict_Enum_20)), new Data_Tuple.Tuple(firstEnum(__dict_Enum_19), firstEnum(__dict_Enum_20)), tupleFromEnum(__dict_Enum_19)(__dict_Enum_20)(cardinality(__dict_Enum_20)), new Data_Tuple.Tuple(lastEnum(__dict_Enum_19), lastEnum(__dict_Enum_20)), function (_162) {
            return Data_Maybe.maybe(Prelude["<$>"](Data_Maybe.functorMaybe)(Prelude.flip(Data_Tuple.Tuple.create)(firstEnum(__dict_Enum_20)))(pred(__dict_Enum_19)(_162.value0)))(Prelude["<<<"](Prelude.semigroupoidArr)(Data_Maybe.Just.create)(Data_Tuple.Tuple.create(_162.value0)))(pred(__dict_Enum_20)(_162.value1));
        }, function (_161) {
            return Data_Maybe.maybe(Prelude["<$>"](Data_Maybe.functorMaybe)(Prelude.flip(Data_Tuple.Tuple.create)(firstEnum(__dict_Enum_20)))(succ(__dict_Enum_19)(_161.value0)))(Prelude["<<<"](Prelude.semigroupoidArr)(Data_Maybe.Just.create)(Data_Tuple.Tuple.create(_161.value0)))(succ(__dict_Enum_20)(_161.value1));
        }, tupleToEnum(__dict_Enum_19)(__dict_Enum_20)(cardinality(__dict_Enum_20)));
    };
};
var booleanSucc = function (_154) {
    if (!_154) {
        return new Data_Maybe.Just(true);
    };
    return Data_Maybe.Nothing.value;
};
var booleanPred = function (_155) {
    if (_155) {
        return new Data_Maybe.Just(false);
    };
    return Data_Maybe.Nothing.value;
};
var booleanFirstEnum = false;
var enumBoolean = new Enum(function () {
    return Prelude.ordBoolean;
}, 2, booleanFirstEnum, defaultFromEnum(booleanPred), true, booleanPred, booleanSucc, defaultToEnum(booleanSucc)(booleanFirstEnum));
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
    lastEnum: lastEnum, 
    fromEnum: fromEnum, 
    firstEnum: firstEnum, 
    cardinality: cardinality, 
    enumChar: enumChar, 
    enumMaybe: enumMaybe, 
    enumBoolean: enumBoolean, 
    enumTuple: enumTuple, 
    enumEither: enumEither
};

},{"Data.Array":27,"Data.Char":28,"Data.Either":36,"Data.Maybe":42,"Data.Maybe.Unsafe":41,"Data.Tuple":53,"Data.Unfoldable":54,"Prelude":63}],38:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Data_Monoid = require("Data.Monoid");
var Control_Apply = require("Control.Apply");
var Data_Monoid_First = require("Data.Monoid.First");
var Data_Either = require("Data.Either");
var Data_Maybe = require("Data.Maybe");
var Data_Monoid_Additive = require("Data.Monoid.Additive");
var Data_Monoid_Dual = require("Data.Monoid.Dual");
var Data_Monoid_Last = require("Data.Monoid.Last");
var Data_Monoid_Multiplicative = require("Data.Monoid.Multiplicative");
var Data_Tuple = require("Data.Tuple");

  function foldrArray(f) {
    return function(z) {
      return function(xs) {
        var acc = z;
        for (var i = xs.length - 1; i >= 0; --i) {
          acc = f(xs[i])(acc);
        }
        return acc;
      };
    };
  }
  ;

  function foldlArray(f) {
    return function(z) {
      return function(xs) {
        var acc = z;
        for (var i = 0, len = xs.length; i < len; ++i) {
          acc = f(acc)(xs[i]);
        }
        return acc;
      };
    };
  }
  ;

/**
 *  | `Foldable` represents data structures which can be _folded_.
 *  |
 *  | - `foldr` folds a structure from the right
 *  | - `foldl` folds a structure from the left
 *  | - `foldMap` folds a structure by accumulating values in a `Monoid`
 */
var Foldable = function (foldMap, foldl, foldr) {
    this.foldMap = foldMap;
    this.foldl = foldl;
    this.foldr = foldr;
};

/**
 *  | `Foldable` represents data structures which can be _folded_.
 *  |
 *  | - `foldr` folds a structure from the right
 *  | - `foldl` folds a structure from the left
 *  | - `foldMap` folds a structure by accumulating values in a `Monoid`
 */
var foldr = function (dict) {
    return dict.foldr;
};

/**
 *  | Traverse a data structure, performing some effects encoded by an
 *  | `Applicative` functor at each value, ignoring the final result.
 *  |
 *  | For example:
 *  |
 *  | ```purescript
 *  | traverse_ print [1, 2, 3]
 *  | ```
 */
var traverse_ = function (__dict_Applicative_0) {
    return function (__dict_Foldable_1) {
        return function (f) {
            return foldr(__dict_Foldable_1)(Prelude["<<<"](Prelude.semigroupoidArr)(Control_Apply["*>"](__dict_Applicative_0["__superclass_Prelude.Apply_0"]()))(f))(Prelude.pure(__dict_Applicative_0)(Prelude.unit));
        };
    };
};

/**
 *  | A version of `traverse_` with its arguments flipped.
 *  |
 *  | This can be useful when running an action written using do notation
 *  | for every element in a data structure:
 *  |
 *  | For example:
 *  |
 *  | ```purescript
 *  | for_ [1, 2, 3] \n -> do
 *  |   print n
 *  |   trace "squared is"
 *  |   print (n * n)
 *  | ```
 */
var for_ = function (__dict_Applicative_2) {
    return function (__dict_Foldable_3) {
        return Prelude.flip(traverse_(__dict_Applicative_2)(__dict_Foldable_3));
    };
};

/**
 *  | Perform all of the effects in some data structure in the order
 *  | given by the `Foldable` instance, ignoring the final result.
 *  |
 *  | For example:
 *  |
 *  | ```purescript
 *  | sequence_ [ trace "Hello, ", trace " world!" ]
 *  | ```
 */
var sequence_ = function (__dict_Applicative_4) {
    return function (__dict_Foldable_5) {
        return traverse_(__dict_Applicative_4)(__dict_Foldable_5)(Prelude.id(Prelude.categoryArr));
    };
};

/**
 *  | `Foldable` represents data structures which can be _folded_.
 *  |
 *  | - `foldr` folds a structure from the right
 *  | - `foldl` folds a structure from the left
 *  | - `foldMap` folds a structure by accumulating values in a `Monoid`
 */
var foldl = function (dict) {
    return dict.foldl;
};

/**
 *  | Fold a data structure, accumulating values in some `Monoid`,
 *  | combining adjacent elements using the specified separator. 
 */
var intercalate = function (__dict_Foldable_6) {
    return function (__dict_Monoid_7) {
        return function (sep) {
            return function (xs) {
                var go = function (_320) {
                    return function (x) {
                        if (_320.init) {
                            return {
                                init: false, 
                                acc: x
                            };
                        };
                        return {
                            init: false, 
                            acc: Prelude["<>"](__dict_Monoid_7["__superclass_Prelude.Semigroup_0"]())(_320.acc)(Prelude["<>"](__dict_Monoid_7["__superclass_Prelude.Semigroup_0"]())(sep)(x))
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

/**
 *  | Fold a data structure, accumulating values in some `Monoid`.
 */
var mconcat = function (__dict_Foldable_8) {
    return function (__dict_Monoid_9) {
        return foldl(__dict_Foldable_8)(Prelude["<>"](__dict_Monoid_9["__superclass_Prelude.Semigroup_0"]()))(Data_Monoid.mempty(__dict_Monoid_9));
    };
};

/**
 *  | Test whether any `Boolean` value in a data structure is `true`.
 */
var or = function (__dict_Foldable_10) {
    return foldl(__dict_Foldable_10)(Prelude["||"](Prelude.boolLikeBoolean))(false);
};

/**
 *  | Find the product of the numeric values in a data structure.
 */
var product = function (__dict_Foldable_11) {
    return foldl(__dict_Foldable_11)(Prelude["*"](Prelude.semiringNumber))(1);
};

/**
 *  | Find the sum of the numeric values in a data structure.
 */
var sum = function (__dict_Foldable_12) {
    return foldl(__dict_Foldable_12)(Prelude["+"](Prelude.semiringNumber))(0);
};
var foldableTuple = new Foldable(function (__dict_Monoid_13) {
    return function (f) {
        return function (_304) {
            return f(_304.value1);
        };
    };
}, function (f) {
    return function (z) {
        return function (_303) {
            return f(z)(_303.value1);
        };
    };
}, function (f) {
    return function (z) {
        return function (_302) {
            return f(_302.value1)(z);
        };
    };
});
var foldableMultiplicative = new Foldable(function (__dict_Monoid_14) {
    return function (f) {
        return function (_319) {
            return f(_319);
        };
    };
}, function (f) {
    return function (z) {
        return function (_318) {
            return f(z)(_318);
        };
    };
}, function (f) {
    return function (z) {
        return function (_317) {
            return f(_317)(z);
        };
    };
});
var foldableMaybe = new Foldable(function (__dict_Monoid_15) {
    return function (f) {
        return function (_301) {
            if (_301 instanceof Data_Maybe.Nothing) {
                return Data_Monoid.mempty(__dict_Monoid_15);
            };
            if (_301 instanceof Data_Maybe.Just) {
                return f(_301.value0);
            };
            throw new Error("Failed pattern match");
        };
    };
}, function (f) {
    return function (z) {
        return function (_300) {
            if (_300 instanceof Data_Maybe.Nothing) {
                return z;
            };
            if (_300 instanceof Data_Maybe.Just) {
                return f(z)(_300.value0);
            };
            throw new Error("Failed pattern match");
        };
    };
}, function (f) {
    return function (z) {
        return function (_299) {
            if (_299 instanceof Data_Maybe.Nothing) {
                return z;
            };
            if (_299 instanceof Data_Maybe.Just) {
                return f(_299.value0)(z);
            };
            throw new Error("Failed pattern match");
        };
    };
});
var foldableEither = new Foldable(function (__dict_Monoid_16) {
    return function (f) {
        return function (_298) {
            if (_298 instanceof Data_Either.Left) {
                return Data_Monoid.mempty(__dict_Monoid_16);
            };
            if (_298 instanceof Data_Either.Right) {
                return f(_298.value0);
            };
            throw new Error("Failed pattern match");
        };
    };
}, function (f) {
    return function (z) {
        return function (_297) {
            if (_297 instanceof Data_Either.Left) {
                return z;
            };
            if (_297 instanceof Data_Either.Right) {
                return f(z)(_297.value0);
            };
            throw new Error("Failed pattern match");
        };
    };
}, function (f) {
    return function (z) {
        return function (_296) {
            if (_296 instanceof Data_Either.Left) {
                return z;
            };
            if (_296 instanceof Data_Either.Right) {
                return f(_296.value0)(z);
            };
            throw new Error("Failed pattern match");
        };
    };
});
var foldableDual = new Foldable(function (__dict_Monoid_17) {
    return function (f) {
        return function (_310) {
            return f(_310);
        };
    };
}, function (f) {
    return function (z) {
        return function (_309) {
            return f(z)(_309);
        };
    };
}, function (f) {
    return function (z) {
        return function (_308) {
            return f(_308)(z);
        };
    };
});
var foldableArray = new Foldable(function (__dict_Monoid_18) {
    return function (f) {
        return function (xs) {
            return foldr(foldableArray)(function (x) {
                return function (acc) {
                    return Prelude["<>"](__dict_Monoid_18["__superclass_Prelude.Semigroup_0"]())(f(x))(acc);
                };
            })(Data_Monoid.mempty(__dict_Monoid_18))(xs);
        };
    };
}, function (f) {
    return function (z) {
        return function (xs) {
            return foldlArray(f)(z)(xs);
        };
    };
}, function (f) {
    return function (z) {
        return function (xs) {
            return foldrArray(f)(z)(xs);
        };
    };
});
var foldableAdditive = new Foldable(function (__dict_Monoid_19) {
    return function (f) {
        return function (_307) {
            return f(_307);
        };
    };
}, function (f) {
    return function (z) {
        return function (_306) {
            return f(z)(_306);
        };
    };
}, function (f) {
    return function (z) {
        return function (_305) {
            return f(_305)(z);
        };
    };
});

/**
 *  | `Foldable` represents data structures which can be _folded_.
 *  |
 *  | - `foldr` folds a structure from the right
 *  | - `foldl` folds a structure from the left
 *  | - `foldMap` folds a structure by accumulating values in a `Monoid`
 */
var foldMap = function (dict) {
    return dict.foldMap;
};
var foldableFirst = new Foldable(function (__dict_Monoid_20) {
    return function (f) {
        return function (_313) {
            return foldMap(foldableMaybe)(__dict_Monoid_20)(f)(_313);
        };
    };
}, function (f) {
    return function (z) {
        return function (_312) {
            return foldl(foldableMaybe)(f)(z)(_312);
        };
    };
}, function (f) {
    return function (z) {
        return function (_311) {
            return foldr(foldableMaybe)(f)(z)(_311);
        };
    };
});
var foldableLast = new Foldable(function (__dict_Monoid_21) {
    return function (f) {
        return function (_316) {
            return foldMap(foldableMaybe)(__dict_Monoid_21)(f)(_316);
        };
    };
}, function (f) {
    return function (z) {
        return function (_315) {
            return foldl(foldableMaybe)(f)(z)(_315);
        };
    };
}, function (f) {
    return function (z) {
        return function (_314) {
            return foldr(foldableMaybe)(f)(z)(_314);
        };
    };
});

/**
 *  | Lookup a value in a data structure of `Tuple`s, generalizing association lists.
 */
var lookup = function (__dict_Eq_22) {
    return function (__dict_Foldable_23) {
        return function (a) {
            return function (f) {
                return Data_Monoid_First.runFirst(foldMap(__dict_Foldable_23)(Data_Monoid_First.monoidFirst)(function (_295) {
                    var _1188 = Prelude["=="](__dict_Eq_22)(a)(_295.value0);
                    if (_1188) {
                        return new Data_Maybe.Just(_295.value1);
                    };
                    if (!_1188) {
                        return Data_Maybe.Nothing.value;
                    };
                    throw new Error("Failed pattern match");
                })(f));
            };
        };
    };
};

/**
 *  | Fold a data structure, accumulating values in some `Monoid`.
 */
var fold = function (__dict_Foldable_24) {
    return function (__dict_Monoid_25) {
        return foldMap(__dict_Foldable_24)(__dict_Monoid_25)(Prelude.id(Prelude.categoryArr));
    };
};

/**
 *  | Try to find an element in a data structure which satisfies a predicate.
 */
var find = function (__dict_Foldable_26) {
    return function (p) {
        return function (f) {
            var _1192 = foldMap(__dict_Foldable_26)(Data_Monoid.monoidArray)(function (x) {
                var _1191 = p(x);
                if (_1191) {
                    return [ x ];
                };
                if (!_1191) {
                    return [  ];
                };
                throw new Error("Failed pattern match");
            })(f);
            if (_1192.length >= 1) {
                var _1194 = _1192.slice(1);
                return new Data_Maybe.Just(_1192[0]);
            };
            if (_1192.length === 0) {
                return Data_Maybe.Nothing.value;
            };
            throw new Error("Failed pattern match");
        };
    };
};

/**
 *  | Test whether a predicate holds for any element in a data structure.
 */
var any = function (__dict_Foldable_27) {
    return function (p) {
        return Prelude["<<<"](Prelude.semigroupoidArr)(or(foldableArray))(foldMap(__dict_Foldable_27)(Data_Monoid.monoidArray)(function (x) {
            return [ p(x) ];
        }));
    };
};

/**
 *  | Test whether a value is an element of a data structure.
 */
var elem = function (__dict_Eq_28) {
    return function (__dict_Foldable_29) {
        return Prelude["<<<"](Prelude.semigroupoidArr)(any(__dict_Foldable_29))(Prelude["=="](__dict_Eq_28));
    };
};

/**
 *  | Test whether a value is not an element of a data structure.
 */
var notElem = function (__dict_Eq_30) {
    return function (__dict_Foldable_31) {
        return function (x) {
            return Prelude["<<<"](Prelude.semigroupoidArr)(Prelude.not(Prelude.boolLikeBoolean))(elem(__dict_Eq_30)(__dict_Foldable_31)(x));
        };
    };
};

/**
 *  | Test whether all `Boolean` values in a data structure are `true`.
 */
var and = function (__dict_Foldable_32) {
    return foldl(__dict_Foldable_32)(Prelude["&&"](Prelude.boolLikeBoolean))(true);
};

/**
 *  | Test whether a predicate holds for all elements in a data structure.
 */
var all = function (__dict_Foldable_33) {
    return function (p) {
        return Prelude["<<<"](Prelude.semigroupoidArr)(and(foldableArray))(foldMap(__dict_Foldable_33)(Data_Monoid.monoidArray)(function (x) {
            return [ p(x) ];
        }));
    };
};
module.exports = {
    Foldable: Foldable, 
    foldlArray: foldlArray, 
    foldrArray: foldrArray, 
    lookup: lookup, 
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
    foldableEither: foldableEither, 
    foldableMaybe: foldableMaybe, 
    foldableTuple: foldableTuple, 
    foldableAdditive: foldableAdditive, 
    foldableDual: foldableDual, 
    foldableFirst: foldableFirst, 
    foldableLast: foldableLast, 
    foldableMultiplicative: foldableMultiplicative
};

},{"Control.Apply":5,"Data.Either":36,"Data.Maybe":42,"Data.Monoid":48,"Data.Monoid.Additive":43,"Data.Monoid.Dual":44,"Data.Monoid.First":45,"Data.Monoid.Last":46,"Data.Monoid.Multiplicative":47,"Data.Tuple":53,"Prelude":63}],39:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");

    function mkFn0(fn) {
      return function() {
        return fn({});
      };
    }
    ;

    function mkFn1(fn) {
      return function(a) {
        return fn(a);
      };
    }
    ;

    function mkFn2(fn) {
      return function(a, b) {
        return fn(a)(b);
      };
    }
    ;

    function mkFn3(fn) {
      return function(a, b, c) {
        return fn(a)(b)(c);
      };
    }
    ;

    function mkFn4(fn) {
      return function(a, b, c, d) {
        return fn(a)(b)(c)(d);
      };
    }
    ;

    function mkFn5(fn) {
      return function(a, b, c, d, e) {
        return fn(a)(b)(c)(d)(e);
      };
    }
    ;

    function mkFn6(fn) {
      return function(a, b, c, d, e, f) {
        return fn(a)(b)(c)(d)(e)(f);
      };
    }
    ;

    function mkFn7(fn) {
      return function(a, b, c, d, e, f, g) {
        return fn(a)(b)(c)(d)(e)(f)(g);
      };
    }
    ;

    function mkFn8(fn) {
      return function(a, b, c, d, e, f, g, h) {
        return fn(a)(b)(c)(d)(e)(f)(g)(h);
      };
    }
    ;

    function mkFn9(fn) {
      return function(a, b, c, d, e, f, g, h, i) {
        return fn(a)(b)(c)(d)(e)(f)(g)(h)(i);
      };
    }
    ;

    function mkFn10(fn) {
      return function(a, b, c, d, e, f, g, h, i, j) {
        return fn(a)(b)(c)(d)(e)(f)(g)(h)(i)(j);
      };
    }
    ;

    function runFn0(fn) {
      return fn();
    }
    ;

    function runFn1(fn) {
      return function(a) {
        return fn(a);
      };
    }
    ;

    function runFn2(fn) {
      return function(a) {
        return function(b) {
          return fn(a, b);
        };
      };
    }
    ;

    function runFn3(fn) {
      return function(a) {
        return function(b) {
          return function(c) {
            return fn(a, b, c);
          };
        };
      };
    }
    ;

    function runFn4(fn) {
      return function(a) {
        return function(b) {
          return function(c) {
            return function(d) {
              return fn(a, b, c, d);
            };
          };
        };
      };
    }
    ;

    function runFn5(fn) {
      return function(a) {
        return function(b) {
          return function(c) {
            return function(d) {
              return function(e) {
                return fn(a, b, c, d, e);
              };
            };
          };
        };
      };
    }
    ;

    function runFn6(fn) {
      return function(a) {
        return function(b) {
          return function(c) {
            return function(d) {
              return function(e) {
                return function(f) {
                  return fn(a, b, c, d, e, f);
                };
              };
            };
          };
        };
      };
    }
    ;

    function runFn7(fn) {
      return function(a) {
        return function(b) {
          return function(c) {
            return function(d) {
              return function(e) {
                return function(f) {
                  return function(g) {
                    return fn(a, b, c, d, e, f, g);
                  };
                };
              };
            };
          };
        };
      };
    }
    ;

    function runFn8(fn) {
      return function(a) {
        return function(b) {
          return function(c) {
            return function(d) {
              return function(e) {
                return function(f) {
                  return function(g) {
                    return function(h) {
                      return fn(a, b, c, d, e, f, g, h);
                    };
                  };
                };
              };
            };
          };
        };
      };
    }
    ;

    function runFn9(fn) {
      return function(a) {
        return function(b) {
          return function(c) {
            return function(d) {
              return function(e) {
                return function(f) {
                  return function(g) {
                    return function(h) {
                      return function(i) {
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
    }
    ;

    function runFn10(fn) {
      return function(a) {
        return function(b) {
          return function(c) {
            return function(d) {
              return function(e) {
                return function(f) {
                  return function(g) {
                    return function(h) {
                      return function(i) {
                        return function(j) {
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
    }
    ;

/**
 *  | The `on` function is used to change the domain of a binary operator.
 *  |
 *  | For example, we can create a function which compares two records based on the values of their `x` properties:
 *  |
 *  | ```purescript
 *  | compareX :: forall r. { x :: Number | r } -> { x :: Number | r } -> Ordering
 *  | compareX = compare `on` _.x
 *  | ```
 */
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
    runFn10: runFn10, 
    runFn9: runFn9, 
    runFn8: runFn8, 
    runFn7: runFn7, 
    runFn6: runFn6, 
    runFn5: runFn5, 
    runFn4: runFn4, 
    runFn3: runFn3, 
    runFn2: runFn2, 
    runFn1: runFn1, 
    runFn0: runFn0, 
    mkFn10: mkFn10, 
    mkFn9: mkFn9, 
    mkFn8: mkFn8, 
    mkFn7: mkFn7, 
    mkFn6: mkFn6, 
    mkFn5: mkFn5, 
    mkFn4: mkFn4, 
    mkFn3: mkFn3, 
    mkFn2: mkFn2, 
    mkFn1: mkFn1, 
    mkFn0: mkFn0, 
    on: on
};

},{"Prelude":63}],40:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");

  function fromNumber(n) {
    return n|0;
  }
  ;

  function intAdd(x) {
    return function(y) {
      return (x + y)|0;
    };
  }
  ;

  function intMul(x) {
    return function(y) {
      return (x * y)|0;
    };
  }
  ;

  function intDiv(x) {
    return function(y) {
      return (x / y)|0;
    };
  }
  ;

  function intMod(x) {
    return function(y) {
      return x % y;
    };
  }
  ;

  function intSub(x) {
    return function(y) {
      return (x - y)|0;
    };
  }
  ;
var Int = function (x) {
    return x;
};
var toNumber = function (_14) {
    return _14;
};
var showInt = new Prelude.Show(function (_15) {
    return "fromNumber " + Prelude.show(Prelude.showNumber)(_15);
});
var semiringInt = new Prelude.Semiring(intMul, intAdd, 1, 0);
var ringInt = new Prelude.Ring(intSub, function () {
    return semiringInt;
});
var moduloSemiringInt = new Prelude.ModuloSemiring(intDiv, function () {
    return semiringInt;
}, intMod);
var eqInt = new Prelude.Eq(function (_18) {
    return function (_19) {
        return _18 !== _19;
    };
}, function (_16) {
    return function (_17) {
        return _16 === _17;
    };
});
var ordInt = new Prelude.Ord(function () {
    return eqInt;
}, function (_20) {
    return function (_21) {
        return Prelude.compare(Prelude.ordNumber)(_20)(_21);
    };
});
module.exports = {
    toNumber: toNumber, 
    fromNumber: fromNumber, 
    showInt: showInt, 
    eqInt: eqInt, 
    ordInt: ordInt, 
    semiringInt: semiringInt, 
    moduloSemiringInt: moduloSemiringInt, 
    ringInt: ringInt
};

},{"Prelude":63}],41:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Data_Maybe = require("Data.Maybe");

/**
 *  | A partial function that extracts the value from the `Just` data
 *  | constructor. Passing `Nothing` to `fromJust` will throw an error at
 *  | runtime.
 */
var fromJust = function (_116) {
    if (_116 instanceof Data_Maybe.Just) {
        return _116.value0;
    };
    throw new Error("Failed pattern match");
};
module.exports = {
    fromJust: fromJust
};

},{"Data.Maybe":42,"Prelude":63}],42:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Control_Alt = require("Control.Alt");
var Control_Alternative = require("Control.Alternative");
var Control_Extend = require("Control.Extend");
var Control_MonadPlus = require("Control.MonadPlus");
var Control_Plus = require("Control.Plus");

/**
 *  | The `Maybe` type is used to represent optional values and can be seen as
 *  | something like a type-safe `null`, where `Nothing` is `null` and `Just x`
 *  | is the non-null value `x`.
 */
var Nothing = (function () {
    function Nothing() {

    };
    Nothing.value = new Nothing();
    return Nothing;
})();

/**
 *  | The `Maybe` type is used to represent optional values and can be seen as
 *  | something like a type-safe `null`, where `Nothing` is `null` and `Just x`
 *  | is the non-null value `x`.
 */
var Just = (function () {
    function Just(value0) {
        this.value0 = value0;
    };
    Just.create = function (value0) {
        return new Just(value0);
    };
    return Just;
})();

/**
 *  | The `Show` instance allows `Maybe` values to be rendered as a string with
 *  | `show` whenever there is an `Show` instance for the type the `Maybe`
 *  | contains.
 */
var showMaybe = function (__dict_Show_0) {
    return new Prelude.Show(function (_91) {
        if (_91 instanceof Just) {
            return "Just (" + (Prelude.show(__dict_Show_0)(_91.value0) + ")");
        };
        if (_91 instanceof Nothing) {
            return "Nothing";
        };
        throw new Error("Failed pattern match");
    });
};

/**
 *  | The `Semigroup` instance enables use of the operator `<>` on `Maybe` values
 *  | whenever there is a `Semigroup` instance for the type the `Maybe` contains.
 *  | The exact behaviour of `<>` depends on the "inner" `Semigroup` instance,
 *  | but generally captures the notion of appending or combining things.
 *  |
 *  | ``` purescript
 *  | Just x <> Just y = Just (x <> y)
 *  | Just x <> Nothing = Just x
 *  | Nothing <> Just y = Just y
 *  | Nothing <> Nothing = Nothing
 *  | ```
 */
var semigroupMaybe = function (__dict_Semigroup_1) {
    return new Prelude.Semigroup(function (x) {
        return function (x_1) {
            if (x_1 instanceof Nothing) {
                return x_1;
            };
            if (x_1 instanceof Nothing) {
                return x_1;
            };
            if (x_1 instanceof Just && x_1 instanceof Just) {
                return new Just(Prelude["<>"](__dict_Semigroup_1)(x_1.value0)(x_1.value0));
            };
            throw new Error("Failed pattern match");
        };
    });
};

/**
 *  | Takes a default value, a function, and a `Maybe` value. If the `Maybe`
 *  | value is `Nothing` the default value is returned, otherwise the function
 *  | is applied to the value inside the `Just` and the result is returned.
 *  |
 *  | ``` purescript
 *  | maybe x f Nothing == x
 *  | maybe x f (Just y) == f y
 *  | ```
 */
var maybe = function (b) {
    return function (f) {
        return function (_87) {
            if (_87 instanceof Nothing) {
                return b;
            };
            if (_87 instanceof Just) {
                return f(_87.value0);
            };
            throw new Error("Failed pattern match");
        };
    };
};

/**
 *  | Returns `true` when the `Maybe` value is `Nothing`.
 */
var isNothing = maybe(true)(Prelude["const"](false));

/**
 *  | Returns `true` when the `Maybe` value was constructed with `Just`.
 */
var isJust = maybe(false)(Prelude["const"](true));

/**
 *  | The `Functor` instance allows functions to transform the contents of a
 *  | `Just` with the `<$>` operator:
 *  |
 *  | ``` purescript
 *  | f <$> Just x == Just (f x)
 *  | ```
 *  |
 *  | `Nothing` values are left untouched:
 *  |
 *  | ``` purescript
 *  | f <$> Nothing == Nothing
 *  | ```
 */
var functorMaybe = new Prelude.Functor(function (fn) {
    return function (_88) {
        if (_88 instanceof Just) {
            return new Just(fn(_88.value0));
        };
        return Nothing.value;
    };
});

/**
 *  | Takes a default value, and a `Maybe` value. If the `Maybe` value is
 *  | `Nothing` the default value is returned, otherwise the value inside the
 *  | `Just` is returned.
 *  |
 *  | ``` purescript
 *  | fromMaybe x Nothing == x
 *  | fromMaybe x (Just y) == y
 *  | ```
 */
var fromMaybe = function (a) {
    return maybe(a)(Prelude.id(Prelude.categoryArr));
};

/**
 *  | The `Extend` instance allows sequencing of `Maybe` values and functions
 *  | that accept a `Maybe a` and return a non-`Maybe` result using the
 *  | `<<=` operator.
 *  |
 *  | ``` purescript
 *  | f <<= Nothing = Nothing
 *  | f <<= Just x = Just (f x)
 *  | ```
 */
var extendMaybe = new Control_Extend.Extend(function (f) {
    return function (x) {
        if (x instanceof Nothing) {
            return Nothing.value;
        };
        return new Just(f(x));
    };
}, function () {
    return functorMaybe;
});

/**
 *  | The `Eq` instance allows `Maybe` values to be checked for equality with
 *  | `==` and inequality with `/=` whenever there is an `Eq` instance for the
 *  | type the `Maybe` contains.
 */
var eqMaybe = function (__dict_Eq_3) {
    return new Prelude.Eq(function (a) {
        return function (b) {
            return !Prelude["=="](eqMaybe(__dict_Eq_3))(a)(b);
        };
    }, function (_92) {
        return function (_93) {
            if (_92 instanceof Nothing && _93 instanceof Nothing) {
                return true;
            };
            if (_92 instanceof Just && _93 instanceof Just) {
                return Prelude["=="](__dict_Eq_3)(_92.value0)(_93.value0);
            };
            return false;
        };
    });
};

/**
 *  | The `Ord` instance allows `Maybe` values to be compared with
 *  | `compare`, `>`, `>=`, `<` and `<=` whenever there is an `Ord` instance for
 *  | the type the `Maybe` contains.
 *  |
 *  | `Nothing` is considered to be less than any `Just` value.
 */
var ordMaybe = function (__dict_Ord_2) {
    return new Prelude.Ord(function () {
        return eqMaybe(__dict_Ord_2["__superclass_Prelude.Eq_0"]());
    }, function (_94) {
        return function (_95) {
            if (_94 instanceof Just && _95 instanceof Just) {
                return Prelude.compare(__dict_Ord_2)(_94.value0)(_95.value0);
            };
            if (_94 instanceof Nothing && _95 instanceof Nothing) {
                return Prelude.EQ.value;
            };
            if (_94 instanceof Nothing) {
                return Prelude.LT.value;
            };
            if (_95 instanceof Nothing) {
                return Prelude.GT.value;
            };
            throw new Error("Failed pattern match");
        };
    });
};

/**
 *  | The `Apply` instance allows functions contained within a `Just` to
 *  | transform a value contained within a `Just` using the `(<*>)` operator:
 *  |
 *  | ``` purescript
 *  | Just f <*> Just x == Just (f x)
 *  | ```
 *  |
 *  | `Nothing` values are left untouched:
 *  |
 *  | ``` purescript
 *  | Just f <*> Nothing == Nothing
 *  | Nothing <*> Just x == Nothing
 *  | ```
 *  |
 *  | Combining `Functor`'s `<$>` with `Apply`'s `<*>` can be used transform a
 *  | pure function to take `Maybe`-typed arguments so `f :: a -> b -> c`
 *  | becomes `f :: Maybe a -> Maybe b -> Maybe c`:
 *  |
 *  | ``` purescript
 *  | f <$> Just x <*> Just y == Just (f x y)
 *  | ```
 *  |
 *  | The `Nothing`-preserving behaviour of both operators means the result of
 *  | an expression like the above but where any one of the values is `Nothing`
 *  | means the whole result becomes `Nothing` also:
 *  |
 *  | ``` purescript
 *  | f <$> Nothing <*> Just y == Nothing
 *  | f <$> Just x <*> Nothing == Nothing
 *  | f <$> Nothing <*> Nothing == Nothing
 *  | ```
 */
var applyMaybe = new Prelude.Apply(function (_89) {
    return function (x) {
        if (_89 instanceof Just) {
            return Prelude["<$>"](functorMaybe)(_89.value0)(x);
        };
        if (_89 instanceof Nothing) {
            return Nothing.value;
        };
        throw new Error("Failed pattern match");
    };
}, function () {
    return functorMaybe;
});

/**
 *  | The `Bind` instance allows sequencing of `Maybe` values and functions that
 *  | return a `Maybe` by using the `>>=` operator:
 *  |
 *  | ``` purescript
 *  | Just x >>= f = f x
 *  | Nothing >>= f = Nothing
 *  | ```
 */
var bindMaybe = new Prelude.Bind(function (_90) {
    return function (k) {
        if (_90 instanceof Just) {
            return k(_90.value0);
        };
        if (_90 instanceof Nothing) {
            return Nothing.value;
        };
        throw new Error("Failed pattern match");
    };
}, function () {
    return applyMaybe;
});

/**
 *  | The `Applicative` instance enables lifting of values into `Maybe` with the
 *  | `pure` or `return` function (`return` is an alias for `pure`):
 *  |
 *  | ``` purescript
 *  | pure x :: Maybe _ == Just x
 *  | return x :: Maybe _ == Just x
 *  | ```
 *  |
 *  | Combining `Functor`'s `<$>` with `Apply`'s `<*>` and `Applicative`'s
 *  | `pure` can be used to pass a mixture of `Maybe` and non-`Maybe` typed
 *  | values to a function that does not usually expect them, by using `pure`
 *  | for any value that is not already `Maybe` typed:
 *  |
 *  | ``` purescript
 *  | f <$> Just x <*> pure y == Just (f x y)
 *  | ```
 *  |
 *  | Even though `pure = Just` it is recommended to use `pure` in situations
 *  | like this as it allows the choice of `Applicative` to be changed later
 *  | without having to go through and replace `Just` with a new constructor.
 */
var applicativeMaybe = new Prelude.Applicative(function () {
    return applyMaybe;
}, Just.create);

/**
 *  | The `Monad` instance guarantees that there are both `Applicative` and
 *  | `Bind` instances for `Maybe`. This also enables the `do` syntactic sugar:
 *  |
 *  | ``` purescript
 *  | do
 *  |   x' <- x
 *  |   y' <- y
 *  |   pure (f x' y')
 *  | ```
 *  |
 *  | Which is equivalent to:
 *  |
 *  | ``` purescript
 *  | x >>= (\x' -> y >>= (\y' -> pure (f x' y')))
 *  | ```
 */
var monadMaybe = new Prelude.Monad(function () {
    return applicativeMaybe;
}, function () {
    return bindMaybe;
});

/**
 *  | The `Alt` instance allows for a choice to be made between two `Maybe`
 *  | values with the `<|>` operator, where the first `Just` encountered
 *  | is taken.
 *  |
 *  | ``` purescript
 *  | Just x <|> Just y == Just x
 *  | Nothing <|> Just y == Just y
 *  | Nothing <|> Nothing == Nothing
 *  | ```
 */
var altMaybe = new Control_Alt.Alt(function (l) {
    return function (r) {
        if (l instanceof Nothing) {
            return r;
        };
        return l;
    };
}, function () {
    return functorMaybe;
});

/**
 *  | The `Plus` instance provides a default `Maybe` value:
 *  |
 *  | ``` purescript
 *  | empty :: Maybe _ == Nothing
 *  | ```
 */
var plusMaybe = new Control_Plus.Plus(function () {
    return altMaybe;
}, Nothing.value);

/**
 *  | The `Alternative` instance guarantees that there are both `Applicative` and
 *  | `Plus` instances for `Maybe`.
 */
var alternativeMaybe = new Control_Alternative.Alternative(function () {
    return plusMaybe;
}, function () {
    return applicativeMaybe;
});

/**
 *  | The `MonadPlus` instance guarantees that there are both `Monad` and
 *  | `Alternative` instances for `Maybe`.
 */
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
    semigroupMaybe: semigroupMaybe, 
    showMaybe: showMaybe, 
    eqMaybe: eqMaybe, 
    ordMaybe: ordMaybe
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Extend":7,"Control.MonadPlus":22,"Control.Plus":23,"Prelude":63}],43:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Control_Comonad = require("Control.Comonad");
var Control_Extend = require("Control.Extend");
var Data_Monoid = require("Data.Monoid");

/**
 *  | Monoid and semigroup for semirings under addition.
 *  |
 *  | ``` purescript
 *  | Additive x <> Additive y == Additive (x + y)
 *  | mempty :: Additive _ == Additive zero
 *  | ```
 */
var Additive = function (x) {
    return x;
};
var showAdditive = function (__dict_Show_0) {
    return new Prelude.Show(function (_133) {
        return "Additive (" + (Prelude.show(__dict_Show_0)(_133) + ")");
    });
};
var semigroupAdditive = function (__dict_Semiring_1) {
    return new Prelude.Semigroup(function (_134) {
        return function (_135) {
            return Prelude["+"](__dict_Semiring_1)(_134)(_135);
        };
    });
};
var runAdditive = function (_122) {
    return _122;
};
var monoidAdditive = function (__dict_Semiring_3) {
    return new Data_Monoid.Monoid(function () {
        return semigroupAdditive(__dict_Semiring_3);
    }, Prelude.zero(__dict_Semiring_3));
};
var functorAdditive = new Prelude.Functor(function (f) {
    return function (_129) {
        return f(_129);
    };
});
var extendAdditive = new Control_Extend.Extend(function (f) {
    return function (x) {
        return f(x);
    };
}, function () {
    return functorAdditive;
});
var eqAdditive = function (__dict_Eq_4) {
    return new Prelude.Eq(function (_125) {
        return function (_126) {
            return Prelude["/="](__dict_Eq_4)(_125)(_126);
        };
    }, function (_123) {
        return function (_124) {
            return Prelude["=="](__dict_Eq_4)(_123)(_124);
        };
    });
};
var ordAdditive = function (__dict_Ord_2) {
    return new Prelude.Ord(function () {
        return eqAdditive(__dict_Ord_2["__superclass_Prelude.Eq_0"]());
    }, function (_127) {
        return function (_128) {
            return Prelude.compare(__dict_Ord_2)(_127)(_128);
        };
    });
};
var comonadAdditive = new Control_Comonad.Comonad(function () {
    return extendAdditive;
}, runAdditive);
var applyAdditive = new Prelude.Apply(function (_130) {
    return function (_131) {
        return _130(_131);
    };
}, function () {
    return functorAdditive;
});
var bindAdditive = new Prelude.Bind(function (_132) {
    return function (f) {
        return f(_132);
    };
}, function () {
    return applyAdditive;
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
    showAdditive: showAdditive, 
    semigroupAdditive: semigroupAdditive, 
    monoidAdditive: monoidAdditive
};

},{"Control.Comonad":6,"Control.Extend":7,"Data.Monoid":48,"Prelude":63}],44:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Data_Monoid = require("Data.Monoid");
var Control_Comonad = require("Control.Comonad");
var Control_Extend = require("Control.Extend");

/**
 *  | The dual of a monoid.
 *  |
 *  | ``` purescript
 *  | Dual x <> Dual y == Dual (y <> x)
 *  | mempty :: Dual _ == Dual mempty
 *  | ```
 */
var Dual = function (x) {
    return x;
};
var showDual = function (__dict_Show_0) {
    return new Prelude.Show(function (_167) {
        return "Dual (" + (Prelude.show(__dict_Show_0)(_167) + ")");
    });
};
var semigroupDual = function (__dict_Semigroup_1) {
    return new Prelude.Semigroup(function (_168) {
        return function (_169) {
            return Prelude["<>"](__dict_Semigroup_1)(_169)(_168);
        };
    });
};
var runDual = function (_156) {
    return _156;
};
var monoidDual = function (__dict_Monoid_3) {
    return new Data_Monoid.Monoid(function () {
        return semigroupDual(__dict_Monoid_3["__superclass_Prelude.Semigroup_0"]());
    }, Data_Monoid.mempty(__dict_Monoid_3));
};
var functorDual = new Prelude.Functor(function (f) {
    return function (_163) {
        return f(_163);
    };
});
var extendDual = new Control_Extend.Extend(function (f) {
    return function (x) {
        return f(x);
    };
}, function () {
    return functorDual;
});
var eqDual = function (__dict_Eq_4) {
    return new Prelude.Eq(function (_159) {
        return function (_160) {
            return Prelude["/="](__dict_Eq_4)(_159)(_160);
        };
    }, function (_157) {
        return function (_158) {
            return Prelude["=="](__dict_Eq_4)(_157)(_158);
        };
    });
};
var ordDual = function (__dict_Ord_2) {
    return new Prelude.Ord(function () {
        return eqDual(__dict_Ord_2["__superclass_Prelude.Eq_0"]());
    }, function (_161) {
        return function (_162) {
            return Prelude.compare(__dict_Ord_2)(_161)(_162);
        };
    });
};
var comonadDual = new Control_Comonad.Comonad(function () {
    return extendDual;
}, runDual);
var applyDual = new Prelude.Apply(function (_164) {
    return function (_165) {
        return _164(_165);
    };
}, function () {
    return functorDual;
});
var bindDual = new Prelude.Bind(function (_166) {
    return function (f) {
        return f(_166);
    };
}, function () {
    return applyDual;
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
    showDual: showDual, 
    semigroupDual: semigroupDual, 
    monoidDual: monoidDual
};

},{"Control.Comonad":6,"Control.Extend":7,"Data.Monoid":48,"Prelude":63}],45:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Control_Extend = require("Control.Extend");
var Control_Comonad = require("Control.Comonad");
var Data_Maybe = require("Data.Maybe");
var Data_Monoid = require("Data.Monoid");

/**
 *  | Monoid returning the first (left-most) non-Nothing value.
 *  |
 *  | ``` purescript
 *  | First (Just x) <> First (Just y) == First (Just x)
 *  | First Nothing <> First (Just y) == First (Just x)
 *  | First Nothing <> Nothing == First Nothing
 *  | mempty :: First _ == First Nothing
 *  | ```
 */
var First = function (x) {
    return x;
};
var showFirst = function (__dict_Show_0) {
    return new Prelude.Show(function (_280) {
        return "First (" + (Prelude.show(Data_Maybe.showMaybe(__dict_Show_0))(_280) + ")");
    });
};
var semigroupFirst = new Prelude.Semigroup(function (_281) {
    return function (second) {
        if (_281 instanceof Data_Maybe.Just) {
            return _281;
        };
        return second;
    };
});
var runFirst = function (_269) {
    return _269;
};
var monoidFirst = new Data_Monoid.Monoid(function () {
    return semigroupFirst;
}, Data_Maybe.Nothing.value);
var functorFirst = new Prelude.Functor(function (f) {
    return function (_276) {
        return Prelude["<$>"](Data_Maybe.functorMaybe)(f)(_276);
    };
});
var extendFirst = new Control_Extend.Extend(function (f) {
    return function (x) {
        return Control_Extend["<<="](extendFirst)(f)(x);
    };
}, function () {
    return functorFirst;
});
var eqFirst = function (__dict_Eq_2) {
    return new Prelude.Eq(function (_272) {
        return function (_273) {
            return Prelude["/="](Data_Maybe.eqMaybe(__dict_Eq_2))(_272)(_273);
        };
    }, function (_270) {
        return function (_271) {
            return Prelude["=="](Data_Maybe.eqMaybe(__dict_Eq_2))(_270)(_271);
        };
    });
};
var ordFirst = function (__dict_Ord_1) {
    return new Prelude.Ord(function () {
        return eqFirst(__dict_Ord_1["__superclass_Prelude.Eq_0"]());
    }, function (_274) {
        return function (_275) {
            return Prelude.compare(Data_Maybe.ordMaybe(__dict_Ord_1))(_274)(_275);
        };
    });
};
var applyFirst = new Prelude.Apply(function (_277) {
    return function (_278) {
        return Prelude["<*>"](Data_Maybe.applyMaybe)(_277)(_278);
    };
}, function () {
    return functorFirst;
});
var bindFirst = new Prelude.Bind(function (_279) {
    return function (f) {
        return Prelude[">>="](Data_Maybe.bindMaybe)(_279)(Prelude["<<<"](Prelude.semigroupoidArr)(runFirst)(f));
    };
}, function () {
    return applyFirst;
});
var applicativeFirst = new Prelude.Applicative(function () {
    return applyFirst;
}, Prelude["<<<"](Prelude.semigroupoidArr)(First)(Prelude.pure(Data_Maybe.applicativeMaybe)));
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
    functorFirst: functorFirst, 
    applyFirst: applyFirst, 
    applicativeFirst: applicativeFirst, 
    bindFirst: bindFirst, 
    monadFirst: monadFirst, 
    extendFirst: extendFirst, 
    showFirst: showFirst, 
    semigroupFirst: semigroupFirst, 
    monoidFirst: monoidFirst
};

},{"Control.Comonad":6,"Control.Extend":7,"Data.Maybe":42,"Data.Monoid":48,"Prelude":63}],46:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Control_Extend = require("Control.Extend");
var Control_Comonad = require("Control.Comonad");
var Data_Maybe = require("Data.Maybe");
var Data_Monoid = require("Data.Monoid");

/**
 *  | Monoid returning the last (right-most) non-Nothing value.
 *  |
 *  | ``` purescript
 *  | Last (Just x) <> Last (Just y) == Last (Just y)
 *  | Last (Just x) <> Nothing == Last (Just x)
 *  | Last Nothing <> Nothing == Last Nothing
 *  | mempty :: Last _ == Last Nothing
 *  | ```
 */
var Last = function (x) {
    return x;
};
var showLast = function (__dict_Show_0) {
    return new Prelude.Show(function (_293) {
        return "Last (" + (Prelude.show(Data_Maybe.showMaybe(__dict_Show_0))(_293) + ")");
    });
};
var semigroupLast = new Prelude.Semigroup(function (last) {
    return function (_294) {
        if (_294 instanceof Data_Maybe.Just) {
            return _294;
        };
        if (_294 instanceof Data_Maybe.Nothing) {
            return last;
        };
        throw new Error("Failed pattern match");
    };
});
var runLast = function (_282) {
    return _282;
};
var monoidLast = new Data_Monoid.Monoid(function () {
    return semigroupLast;
}, Data_Maybe.Nothing.value);
var functorLast = new Prelude.Functor(function (f) {
    return function (_289) {
        return Prelude["<$>"](Data_Maybe.functorMaybe)(f)(_289);
    };
});
var extendLast = new Control_Extend.Extend(function (f) {
    return function (x) {
        return Control_Extend["<<="](extendLast)(f)(x);
    };
}, function () {
    return functorLast;
});
var eqLast = function (__dict_Eq_2) {
    return new Prelude.Eq(function (_285) {
        return function (_286) {
            return Prelude["/="](Data_Maybe.eqMaybe(__dict_Eq_2))(_285)(_286);
        };
    }, function (_283) {
        return function (_284) {
            return Prelude["=="](Data_Maybe.eqMaybe(__dict_Eq_2))(_283)(_284);
        };
    });
};
var ordLast = function (__dict_Ord_1) {
    return new Prelude.Ord(function () {
        return eqLast(__dict_Ord_1["__superclass_Prelude.Eq_0"]());
    }, function (_287) {
        return function (_288) {
            return Prelude.compare(Data_Maybe.ordMaybe(__dict_Ord_1))(_287)(_288);
        };
    });
};
var applyLast = new Prelude.Apply(function (_290) {
    return function (_291) {
        return Prelude["<*>"](Data_Maybe.applyMaybe)(_290)(_291);
    };
}, function () {
    return functorLast;
});
var bindLast = new Prelude.Bind(function (_292) {
    return function (f) {
        return Prelude[">>="](Data_Maybe.bindMaybe)(_292)(Prelude["<<<"](Prelude.semigroupoidArr)(runLast)(f));
    };
}, function () {
    return applyLast;
});
var applicativeLast = new Prelude.Applicative(function () {
    return applyLast;
}, Prelude["<<<"](Prelude.semigroupoidArr)(Last)(Prelude.pure(Data_Maybe.applicativeMaybe)));
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
    functorLast: functorLast, 
    applyLast: applyLast, 
    applicativeLast: applicativeLast, 
    bindLast: bindLast, 
    monadLast: monadLast, 
    extendLast: extendLast, 
    showLast: showLast, 
    semigroupLast: semigroupLast, 
    monoidLast: monoidLast
};

},{"Control.Comonad":6,"Control.Extend":7,"Data.Maybe":42,"Data.Monoid":48,"Prelude":63}],47:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Control_Comonad = require("Control.Comonad");
var Control_Extend = require("Control.Extend");
var Data_Monoid = require("Data.Monoid");

/**
 *  | Monoid and semigroup for semirings under multiplication.
 *  |
 *  | ``` purescript
 *  | Multiplicative x <> Multiplicative y == Multiplicative (x * y)
 *  | mempty :: Multiplicative _ == Multiplicative one
 *  | ```
 */
var Multiplicative = function (x) {
    return x;
};
var showMultiplicative = function (__dict_Show_0) {
    return new Prelude.Show(function (_184) {
        return "Multiplicative (" + (Prelude.show(__dict_Show_0)(_184) + ")");
    });
};
var semigroupMultiplicative = function (__dict_Semiring_1) {
    return new Prelude.Semigroup(function (_185) {
        return function (_186) {
            return Prelude["*"](__dict_Semiring_1)(_185)(_186);
        };
    });
};
var runMultiplicative = function (_173) {
    return _173;
};
var monoidMultiplicative = function (__dict_Semiring_3) {
    return new Data_Monoid.Monoid(function () {
        return semigroupMultiplicative(__dict_Semiring_3);
    }, Prelude.one(__dict_Semiring_3));
};
var functorMultiplicative = new Prelude.Functor(function (f) {
    return function (_180) {
        return f(_180);
    };
});
var extendAdditive = new Control_Extend.Extend(function (f) {
    return function (x) {
        return f(x);
    };
}, function () {
    return functorMultiplicative;
});
var eqMultiplicative = function (__dict_Eq_4) {
    return new Prelude.Eq(function (_176) {
        return function (_177) {
            return Prelude["/="](__dict_Eq_4)(_176)(_177);
        };
    }, function (_174) {
        return function (_175) {
            return Prelude["=="](__dict_Eq_4)(_174)(_175);
        };
    });
};
var ordMultiplicative = function (__dict_Ord_2) {
    return new Prelude.Ord(function () {
        return eqMultiplicative(__dict_Ord_2["__superclass_Prelude.Eq_0"]());
    }, function (_178) {
        return function (_179) {
            return Prelude.compare(__dict_Ord_2)(_178)(_179);
        };
    });
};
var comonadAdditive = new Control_Comonad.Comonad(function () {
    return extendAdditive;
}, runMultiplicative);
var applyMultiplicative = new Prelude.Apply(function (_181) {
    return function (_182) {
        return _181(_182);
    };
}, function () {
    return functorMultiplicative;
});
var bindMultiplicative = new Prelude.Bind(function (_183) {
    return function (f) {
        return f(_183);
    };
}, function () {
    return applyMultiplicative;
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
    extendAdditive: extendAdditive, 
    comonadAdditive: comonadAdditive, 
    showMultiplicative: showMultiplicative, 
    semigroupMultiplicative: semigroupMultiplicative, 
    monoidMultiplicative: monoidMultiplicative
};

},{"Control.Comonad":6,"Control.Extend":7,"Data.Monoid":48,"Prelude":63}],48:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Data_Array = require("Data.Array");
var Data_Maybe = require("Data.Maybe");
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
var monoidMaybe = function (__dict_Semigroup_0) {
    return new Monoid(function () {
        return Data_Maybe.semigroupMaybe(__dict_Semigroup_0);
    }, Data_Maybe.Nothing.value);
};
var monoidArray = new Monoid(function () {
    return Data_Array.semigroupArray;
}, [  ]);
var mempty = function (dict) {
    return dict.mempty;
};
var monoidArr = function (__dict_Monoid_1) {
    return new Monoid(function () {
        return Prelude.semigroupArr(__dict_Monoid_1["__superclass_Prelude.Semigroup_0"]());
    }, Prelude["const"](mempty(__dict_Monoid_1)));
};
module.exports = {
    Monoid: Monoid, 
    mempty: mempty, 
    monoidString: monoidString, 
    monoidArray: monoidArray, 
    monoidUnit: monoidUnit, 
    monoidArr: monoidArr, 
    monoidMaybe: monoidMaybe
};

},{"Data.Array":27,"Data.Maybe":42,"Prelude":63}],49:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | Unsafe string and character functions.
 */
"use strict";
var Prelude = require("Prelude");
var Data_Char = require("Data.Char");

    function charCodeAt(i) {
      return function(s) {
        if (s.length <= i) {
          throw new Error("Data.String.Unsafe.charCodeAt: Invalid index.");
        };
        return s.charCodeAt(i);
      };
    }
    ;

    function charAt(i) {
      return function(s) {
        if (s.length <= i) {
          throw new Error("Data.String.Unsafe.charAt: Invalid index.");
        };
        return s.charAt(i);
      };
    }
    ;

    function $$char(s) {
      if (s.length != 1) {
        throw new Error("Data.String.Unsafe.char: Expected string of length 1.");
      };
      return s.charAt(0);
    }
    ;
module.exports = {
    charCodeAt: charCodeAt, 
    charAt: charAt, 
    "char": $$char
};

},{"Data.Char":28,"Prelude":63}],50:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | Wraps the functions of Javascript's `String` object.
 *  | A String represents a sequence of characters.
 *  | For details of the underlying implementation, see [String Reference at MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String).
 */
"use strict";
var Data_Function = require("Data.Function");
var Data_Char = require("Data.Char");
var Prelude = require("Prelude");
var Data_String_Unsafe = require("Data.String.Unsafe");
var Data_Maybe = require("Data.Maybe");

    function _charAt(i, s, Just, Nothing) {
      return i >= 0 && i < s.length ? Just(s.charAt(i)) : Nothing;
    }
    ;

    function _charCodeAt(i, s, Just, Nothing) {
      return i >= 0 && i < s.length ? Just(s.charCodeAt(i)) : Nothing;
    }
    ;

    function fromCharArray(a) {
      return a.join('');
    }
    ;

    function indexOf(x) {
      return function(s) {
        return s.indexOf(x);
      };
    }
    ;

    function indexOf$prime(x) {
      return function(startAt) {
        return function(s) {
          return s.indexOf(x, startAt);
        };
      };
    }
    ;

    function lastIndexOf(x) {
      return function(s) {
        return s.lastIndexOf(x);
      };
    }
    ;

    function lastIndexOf$prime(x) {
      return function(startAt) {
        return function(s) {
          return s.lastIndexOf(x, startAt);
        };
      };
    }
    ;

    function length(s) {
      return s.length;
    }
    ;

    function localeCompare(s1) {
      return function(s2) {
        return s1.localeCompare(s2);
      };
    }
    ;

    function replace(s1) {
      return function(s2) {
        return function(s3) {
          return s3.replace(s1, s2);
        };
      };
    }
    ;

    function take(n) {
      return function(s) {
        return s.substr(0, n);
      };
    }
    ;

    function drop(n) {
      return function(s) {
        return s.substr(n);
      };
    }
    ;

    function count(p){
      return function(s){
        var i;
        for(i = 0; i < s.length && p(s.charAt(i)); i++){};
        return i;
      };
    }
    ;

    function split(sep) {
      return function(s) {
        return s.split(sep);
      };
    }
    ;

    function toCharArray(s) {
      return s.split('');
    }
    ;

    function toLower(s) {
      return s.toLowerCase();
    }
    ;

    function toUpper(s) {
      return s.toUpperCase();
    }
    ;

    function trim(s) {
      return s.trim();
    }
    ;

    function joinWith(s) {
      return function(xs) {
        return xs.join(s);
      };
    }
    ;

/**
 *  | Returns the longest prefix (possibly empty) of characters that satisfy
 *  | the predicate:
 */
var takeWhile = function (p) {
    return function (s) {
        return take(count(p)(s))(s);
    };
};

/**
 *  | Returns `true` if the given string is empty.
 */
var $$null = function (s) {
    return length(s) === 0;
};

/**
 *  | Returns the first character and the rest of the string,
 *  | if the string is not empty.
 */
var uncons = function (s) {
    if ($$null(s)) {
        return Data_Maybe.Nothing.value;
    };
    return new Data_Maybe.Just({
        head: Data_String_Unsafe.charAt(0)(s), 
        tail: drop(1)(s)
    });
};

/**
 *  | Returns a string of length `1` containing the given character.
 */
var fromChar = Data_Char.charString;

/**
 *  | Returns a string of length `1` containing the given character.
 *  | Same as `fromChar`.
 */
var singleton = fromChar;

/**
 *  | Returns the suffix remaining after `takeWhile`.
 */
var dropWhile = function (p) {
    return function (s) {
        return drop(count(p)(s))(s);
    };
};

/**
 *  | Returns the numeric Unicode value of the character at the given index,
 *  | if the index is within bounds.
 */
var charCodeAt = function (n) {
    return function (s) {
        return _charCodeAt(n, s, Data_Maybe.Just.create, Data_Maybe.Nothing.value);
    };
};

/**
 *  | Returns the character at the given index, if the index is within bounds.
 */
var charAt = function (n) {
    return function (s) {
        return _charAt(n, s, Data_Maybe.Just.create, Data_Maybe.Nothing.value);
    };
};
module.exports = {
    joinWith: joinWith, 
    trim: trim, 
    toUpper: toUpper, 
    toLower: toLower, 
    toCharArray: toCharArray, 
    split: split, 
    dropWhile: dropWhile, 
    drop: drop, 
    takeWhile: takeWhile, 
    take: take, 
    count: count, 
    replace: replace, 
    localeCompare: localeCompare, 
    singleton: singleton, 
    length: length, 
    uncons: uncons, 
    "null": $$null, 
    "lastIndexOf'": lastIndexOf$prime, 
    lastIndexOf: lastIndexOf, 
    "indexOf'": indexOf$prime, 
    indexOf: indexOf, 
    fromChar: fromChar, 
    fromCharArray: fromCharArray, 
    charCodeAt: charCodeAt, 
    charAt: charAt
};

},{"Data.Char":28,"Data.Function":39,"Data.Maybe":42,"Data.String.Unsafe":49,"Prelude":63}],51:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Data_Int = require("Data.Int");

/**
 *  | A quantity of seconds (not necessarily a value between 0 and 60).
 */
var Seconds = function (x) {
    return x;
};

/**
 *  | A second component from a time value. Should fall between 0 and 59
 *  | inclusive.
 */
var SecondOfMinute = function (x) {
    return x;
};

/**
 *  | A quantity of minutes (not necessarily a value between 0 and 60).
 */
var Minutes = function (x) {
    return x;
};

/**
 *  | A minute component from a time value. Should fall between 0 and 59
 *  | inclusive.
 */
var MinuteOfHour = function (x) {
    return x;
};

/**
 *  | A quantity of milliseconds (not necessarily a value between 0 and 1000).
 */
var Milliseconds = function (x) {
    return x;
};

/**
 *  | A millisecond component from a time value. Should fall between 0 and 999
 *  | inclusive.
 */
var MillisecondOfSecond = function (x) {
    return x;
};

/**
 *  | A quantity of hours (not necessarily a value between 0 and 23).
 */
var Hours = function (x) {
    return x;
};

/**
 *  | An hour component from a time value. Should fall between 0 and 23
 *  | inclusive.
 */
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
var timeValueSeconds = new TimeValue(function (_129) {
    return _129 * 3600;
}, function (_131) {
    return _131 / 1000;
}, function (_130) {
    return _130 * 60;
}, function (n) {
    return n;
}, function (_126) {
    return _126 / 3600;
}, function (_128) {
    return _128 * 1000;
}, function (_127) {
    return _127 / 60;
}, function (n) {
    return n;
});
var timeValueMinutes = new TimeValue(function (_123) {
    return _123 * 60;
}, function (_125) {
    return _125 / 60000;
}, function (n) {
    return n;
}, function (_124) {
    return _124 / 60;
}, function (_120) {
    return _120 / 60;
}, function (_122) {
    return _122 * 60000;
}, function (n) {
    return n;
}, function (_121) {
    return _121 * 60;
});
var timeValueMilliseconds = new TimeValue(function (_135) {
    return _135 * 3600000;
}, function (n) {
    return n;
}, function (_136) {
    return _136 * 60000;
}, function (_137) {
    return _137 * 1000;
}, function (_132) {
    return _132 / 3600000;
}, function (n) {
    return n;
}, function (_133) {
    return _133 / 60000;
}, function (_134) {
    return _134 / 1000;
});
var timeValueHours = new TimeValue(function (n) {
    return n;
}, function (_119) {
    return _119 / 3600000;
}, function (_117) {
    return _117 / 60;
}, function (_118) {
    return _118 / 3600;
}, function (n) {
    return n;
}, function (_116) {
    return _116 * 3600000;
}, function (_114) {
    return _114 * 60;
}, function (_115) {
    return _115 * 3600;
});
var showSeconds = new Prelude.Show(function (_90) {
    return "(Seconds " + (Prelude.show(Prelude.showNumber)(_90) + ")");
});
var showMinutes = new Prelude.Show(function (_67) {
    return "(Minutes " + (Prelude.show(Prelude.showNumber)(_67) + ")");
});
var showMilliseconds = new Prelude.Show(function (_113) {
    return "(Milliseconds " + (Prelude.show(Prelude.showNumber)(_113) + ")");
});
var showHours = new Prelude.Show(function (_44) {
    return "(Hours " + (Prelude.show(Prelude.showNumber)(_44) + ")");
});
var semiringSeconds = new Prelude.Semiring(function (_82) {
    return function (_83) {
        return _82 * _83;
    };
}, function (_80) {
    return function (_81) {
        return _80 + _81;
    };
}, 1, 0);
var semiringMinutes = new Prelude.Semiring(function (_59) {
    return function (_60) {
        return _59 * _60;
    };
}, function (_57) {
    return function (_58) {
        return _57 + _58;
    };
}, 1, 0);
var semiringMilliseconds = new Prelude.Semiring(function (_105) {
    return function (_106) {
        return _105 * _106;
    };
}, function (_103) {
    return function (_104) {
        return _103 + _104;
    };
}, 1, 0);
var semiringHours = new Prelude.Semiring(function (_36) {
    return function (_37) {
        return _36 * _37;
    };
}, function (_34) {
    return function (_35) {
        return _34 + _35;
    };
}, 1, 0);
var ringSeconds = new Prelude.Ring(function (_84) {
    return function (_85) {
        return _84 - _85;
    };
}, function () {
    return semiringSeconds;
});
var ringMinutes = new Prelude.Ring(function (_61) {
    return function (_62) {
        return _61 - _62;
    };
}, function () {
    return semiringMinutes;
});
var ringMilliseconds = new Prelude.Ring(function (_107) {
    return function (_108) {
        return _107 - _108;
    };
}, function () {
    return semiringMilliseconds;
});
var ringHours = new Prelude.Ring(function (_38) {
    return function (_39) {
        return _38 - _39;
    };
}, function () {
    return semiringHours;
});
var moduloSemiringSeconds = new Prelude.ModuloSemiring(function (_86) {
    return function (_87) {
        return _86 / _87;
    };
}, function () {
    return semiringSeconds;
}, function (_88) {
    return function (_89) {
        return 0;
    };
});
var moduloSemiringMinutes = new Prelude.ModuloSemiring(function (_63) {
    return function (_64) {
        return _63 / _64;
    };
}, function () {
    return semiringMinutes;
}, function (_65) {
    return function (_66) {
        return 0;
    };
});
var moduloSemiringMilliseconds = new Prelude.ModuloSemiring(function (_109) {
    return function (_110) {
        return _109 / _110;
    };
}, function () {
    return semiringMilliseconds;
}, function (_111) {
    return function (_112) {
        return 0;
    };
});
var moduloSemiringHours = new Prelude.ModuloSemiring(function (_40) {
    return function (_41) {
        return _40 / _41;
    };
}, function () {
    return semiringHours;
}, function (_42) {
    return function (_43) {
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
var eqSeconds = new Prelude.Eq(function (_76) {
    return function (_77) {
        return _76 !== _77;
    };
}, function (_74) {
    return function (_75) {
        return _74 === _75;
    };
});
var ordSeconds = new Prelude.Ord(function () {
    return eqSeconds;
}, function (_78) {
    return function (_79) {
        return Prelude.compare(Prelude.ordNumber)(_78)(_79);
    };
});
var eqSecondOfMinute = new Prelude.Eq(function (_70) {
    return function (_71) {
        return Prelude["/="](Data_Int.eqInt)(_70)(_71);
    };
}, function (_68) {
    return function (_69) {
        return Prelude["=="](Data_Int.eqInt)(_68)(_69);
    };
});
var ordSecondOfMinute = new Prelude.Ord(function () {
    return eqSecondOfMinute;
}, function (_72) {
    return function (_73) {
        return Prelude.compare(Data_Int.ordInt)(_72)(_73);
    };
});
var eqMinutes = new Prelude.Eq(function (_53) {
    return function (_54) {
        return _53 !== _54;
    };
}, function (_51) {
    return function (_52) {
        return _51 === _52;
    };
});
var ordMinutes = new Prelude.Ord(function () {
    return eqMinutes;
}, function (_55) {
    return function (_56) {
        return Prelude.compare(Prelude.ordNumber)(_55)(_56);
    };
});
var eqMinuteOfHour = new Prelude.Eq(function (_47) {
    return function (_48) {
        return Prelude["/="](Data_Int.eqInt)(_47)(_48);
    };
}, function (_45) {
    return function (_46) {
        return Prelude["=="](Data_Int.eqInt)(_45)(_46);
    };
});
var ordMinuteOfHour = new Prelude.Ord(function () {
    return eqMinuteOfHour;
}, function (_49) {
    return function (_50) {
        return Prelude.compare(Data_Int.ordInt)(_49)(_50);
    };
});
var eqMilliseconds = new Prelude.Eq(function (_99) {
    return function (_100) {
        return _99 !== _100;
    };
}, function (_97) {
    return function (_98) {
        return _97 === _98;
    };
});
var ordMilliseconds = new Prelude.Ord(function () {
    return eqMilliseconds;
}, function (_101) {
    return function (_102) {
        return Prelude.compare(Prelude.ordNumber)(_101)(_102);
    };
});
var eqMillisecondOfSecond = new Prelude.Eq(function (_93) {
    return function (_94) {
        return Prelude["/="](Data_Int.eqInt)(_93)(_94);
    };
}, function (_91) {
    return function (_92) {
        return Prelude["=="](Data_Int.eqInt)(_91)(_92);
    };
});
var ordMillisecondOfSecond = new Prelude.Ord(function () {
    return eqMillisecondOfSecond;
}, function (_95) {
    return function (_96) {
        return Prelude.compare(Data_Int.ordInt)(_95)(_96);
    };
});
var eqHours = new Prelude.Eq(function (_30) {
    return function (_31) {
        return _30 !== _31;
    };
}, function (_28) {
    return function (_29) {
        return _28 === _29;
    };
});
var ordHours = new Prelude.Ord(function () {
    return eqHours;
}, function (_32) {
    return function (_33) {
        return Prelude.compare(Prelude.ordNumber)(_32)(_33);
    };
});
var eqHourOfDay = new Prelude.Eq(function (_24) {
    return function (_25) {
        return Prelude["/="](Data_Int.eqInt)(_24)(_25);
    };
}, function (_22) {
    return function (_23) {
        return Prelude["=="](Data_Int.eqInt)(_22)(_23);
    };
});
var ordHourOfDay = new Prelude.Ord(function () {
    return eqHourOfDay;
}, function (_26) {
    return function (_27) {
        return Prelude.compare(Data_Int.ordInt)(_26)(_27);
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

},{"Data.Int":40,"Prelude":63}],52:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Data_Array = require("Data.Array");
var Data_Tuple = require("Data.Tuple");
var Data_Either = require("Data.Either");
var Data_Foldable = require("Data.Foldable");
var Data_Maybe = require("Data.Maybe");
var Data_Monoid_Additive = require("Data.Monoid.Additive");
var Data_Monoid_Dual = require("Data.Monoid.Dual");
var Data_Monoid_First = require("Data.Monoid.First");
var Data_Monoid_Last = require("Data.Monoid.Last");
var Data_Monoid_Multiplicative = require("Data.Monoid.Multiplicative");
var StateR = function (x) {
    return x;
};
var StateL = function (x) {
    return x;
};

/**
 *  | `Traversable` represents data structures which can be _traversed_,
 *  | accumulating results and effects in some `Applicative` functor.
 *  |
 *  | - `traverse` runs an action for every element in a data structure,
 *  |   and accumulates the results.
 *  | - `sequence` runs the actions _contained_ in a data structure,
 *  |   and accumulates the results.
 *  |
 *  | The `traverse` and `sequence` functions should be compatible in the
 *  | following sense:
 *  |
 *  | - `traverse f xs = sequence (f <$> xs)`
 *  | - `sequence = traverse id` 
 *  | 
 *  | `Traversable` instances should also be compatible with the corresponding
 *  | `Foldable` instances, in the following sense:
 *  |
 *  | - `foldMap f = runConst <<< traverse (Const <<< f)`
 */
var Traversable = function (__superclass_Data$dotFoldable$dotFoldable_1, __superclass_Prelude$dotFunctor_0, sequence, traverse) {
    this["__superclass_Data.Foldable.Foldable_1"] = __superclass_Data$dotFoldable$dotFoldable_1;
    this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
    this.sequence = sequence;
    this.traverse = traverse;
};

/**
 *  | `Traversable` represents data structures which can be _traversed_,
 *  | accumulating results and effects in some `Applicative` functor.
 *  |
 *  | - `traverse` runs an action for every element in a data structure,
 *  |   and accumulates the results.
 *  | - `sequence` runs the actions _contained_ in a data structure,
 *  |   and accumulates the results.
 *  |
 *  | The `traverse` and `sequence` functions should be compatible in the
 *  | following sense:
 *  |
 *  | - `traverse f xs = sequence (f <$> xs)`
 *  | - `sequence = traverse id` 
 *  | 
 *  | `Traversable` instances should also be compatible with the corresponding
 *  | `Foldable` instances, in the following sense:
 *  |
 *  | - `foldMap f = runConst <<< traverse (Const <<< f)`
 */
var traverse = function (dict) {
    return dict.traverse;
};
var traversableTuple = new Traversable(function () {
    return Data_Foldable.foldableTuple;
}, function () {
    return Data_Tuple.functorTuple;
}, function (__dict_Applicative_1) {
    return function (_335) {
        return Prelude["<$>"]((__dict_Applicative_1["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Tuple.Tuple.create(_335.value0))(_335.value1);
    };
}, function (__dict_Applicative_0) {
    return function (f) {
        return function (_334) {
            return Prelude["<$>"]((__dict_Applicative_0["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Tuple.Tuple.create(_334.value0))(f(_334.value1));
        };
    };
});
var traversableMultiplicative = new Traversable(function () {
    return Data_Foldable.foldableMultiplicative;
}, function () {
    return Data_Monoid_Multiplicative.functorMultiplicative;
}, function (__dict_Applicative_3) {
    return function (_345) {
        return Prelude["<$>"]((__dict_Applicative_3["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Multiplicative.Multiplicative)(_345);
    };
}, function (__dict_Applicative_2) {
    return function (f) {
        return function (_344) {
            return Prelude["<$>"]((__dict_Applicative_2["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Multiplicative.Multiplicative)(f(_344));
        };
    };
});
var traversableMaybe = new Traversable(function () {
    return Data_Foldable.foldableMaybe;
}, function () {
    return Data_Maybe.functorMaybe;
}, function (__dict_Applicative_5) {
    return function (_333) {
        if (_333 instanceof Data_Maybe.Nothing) {
            return Prelude.pure(__dict_Applicative_5)(Data_Maybe.Nothing.value);
        };
        if (_333 instanceof Data_Maybe.Just) {
            return Prelude["<$>"]((__dict_Applicative_5["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Maybe.Just.create)(_333.value0);
        };
        throw new Error("Failed pattern match");
    };
}, function (__dict_Applicative_4) {
    return function (f) {
        return function (_332) {
            if (_332 instanceof Data_Maybe.Nothing) {
                return Prelude.pure(__dict_Applicative_4)(Data_Maybe.Nothing.value);
            };
            if (_332 instanceof Data_Maybe.Just) {
                return Prelude["<$>"]((__dict_Applicative_4["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Maybe.Just.create)(f(_332.value0));
            };
            throw new Error("Failed pattern match");
        };
    };
});
var traversableEither = new Traversable(function () {
    return Data_Foldable.foldableEither;
}, function () {
    return Data_Either.functorEither;
}, function (__dict_Applicative_7) {
    return function (_331) {
        if (_331 instanceof Data_Either.Left) {
            return Prelude.pure(__dict_Applicative_7)(new Data_Either.Left(_331.value0));
        };
        if (_331 instanceof Data_Either.Right) {
            return Prelude["<$>"]((__dict_Applicative_7["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Right.create)(_331.value0);
        };
        throw new Error("Failed pattern match");
    };
}, function (__dict_Applicative_6) {
    return function (f) {
        return function (_330) {
            if (_330 instanceof Data_Either.Left) {
                return Prelude.pure(__dict_Applicative_6)(new Data_Either.Left(_330.value0));
            };
            if (_330 instanceof Data_Either.Right) {
                return Prelude["<$>"]((__dict_Applicative_6["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Either.Right.create)(f(_330.value0));
            };
            throw new Error("Failed pattern match");
        };
    };
});
var traversableDual = new Traversable(function () {
    return Data_Foldable.foldableDual;
}, function () {
    return Data_Monoid_Dual.functorDual;
}, function (__dict_Applicative_9) {
    return function (_339) {
        return Prelude["<$>"]((__dict_Applicative_9["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Dual.Dual)(_339);
    };
}, function (__dict_Applicative_8) {
    return function (f) {
        return function (_338) {
            return Prelude["<$>"]((__dict_Applicative_8["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Dual.Dual)(f(_338));
        };
    };
});
var traversableAdditive = new Traversable(function () {
    return Data_Foldable.foldableAdditive;
}, function () {
    return Data_Monoid_Additive.functorAdditive;
}, function (__dict_Applicative_11) {
    return function (_337) {
        return Prelude["<$>"]((__dict_Applicative_11["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Additive.Additive)(_337);
    };
}, function (__dict_Applicative_10) {
    return function (f) {
        return function (_336) {
            return Prelude["<$>"]((__dict_Applicative_10["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Additive.Additive)(f(_336));
        };
    };
});
var stateR = function (_327) {
    return _327;
};
var stateL = function (_326) {
    return _326;
};

/**
 *  | `Traversable` represents data structures which can be _traversed_,
 *  | accumulating results and effects in some `Applicative` functor.
 *  |
 *  | - `traverse` runs an action for every element in a data structure,
 *  |   and accumulates the results.
 *  | - `sequence` runs the actions _contained_ in a data structure,
 *  |   and accumulates the results.
 *  |
 *  | The `traverse` and `sequence` functions should be compatible in the
 *  | following sense:
 *  |
 *  | - `traverse f xs = sequence (f <$> xs)`
 *  | - `sequence = traverse id` 
 *  | 
 *  | `Traversable` instances should also be compatible with the corresponding
 *  | `Foldable` instances, in the following sense:
 *  |
 *  | - `foldMap f = runConst <<< traverse (Const <<< f)`
 */
var sequence = function (dict) {
    return dict.sequence;
};
var traversableArray = new Traversable(function () {
    return Data_Foldable.foldableArray;
}, function () {
    return Data_Array.functorArray;
}, function (__dict_Applicative_13) {
    return function (_329) {
        if (_329.length === 0) {
            return Prelude.pure(__dict_Applicative_13)([  ]);
        };
        if (_329.length >= 1) {
            var _1242 = _329.slice(1);
            return Prelude["<*>"](__dict_Applicative_13["__superclass_Prelude.Apply_0"]())(Prelude["<$>"]((__dict_Applicative_13["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Prelude[":"])(_329[0]))(sequence(traversableArray)(__dict_Applicative_13)(_1242));
        };
        throw new Error("Failed pattern match");
    };
}, function (__dict_Applicative_12) {
    return function (f) {
        return function (_328) {
            if (_328.length === 0) {
                return Prelude.pure(__dict_Applicative_12)([  ]);
            };
            if (_328.length >= 1) {
                var _1246 = _328.slice(1);
                return Prelude["<*>"](__dict_Applicative_12["__superclass_Prelude.Apply_0"]())(Prelude["<$>"]((__dict_Applicative_12["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Prelude[":"])(f(_328[0])))(traverse(traversableArray)(__dict_Applicative_12)(f)(_1246));
            };
            throw new Error("Failed pattern match");
        };
    };
});
var traversableFirst = new Traversable(function () {
    return Data_Foldable.foldableFirst;
}, function () {
    return Data_Monoid_First.functorFirst;
}, function (__dict_Applicative_15) {
    return function (_341) {
        return Prelude["<$>"]((__dict_Applicative_15["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_First.First)(sequence(traversableMaybe)(__dict_Applicative_15)(_341));
    };
}, function (__dict_Applicative_14) {
    return function (f) {
        return function (_340) {
            return Prelude["<$>"]((__dict_Applicative_14["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_First.First)(traverse(traversableMaybe)(__dict_Applicative_14)(f)(_340));
        };
    };
});
var traversableLast = new Traversable(function () {
    return Data_Foldable.foldableLast;
}, function () {
    return Data_Monoid_Last.functorLast;
}, function (__dict_Applicative_17) {
    return function (_343) {
        return Prelude["<$>"]((__dict_Applicative_17["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Last.Last)(sequence(traversableMaybe)(__dict_Applicative_17)(_343));
    };
}, function (__dict_Applicative_16) {
    return function (f) {
        return function (_342) {
            return Prelude["<$>"]((__dict_Applicative_16["__superclass_Prelude.Apply_0"]())["__superclass_Prelude.Functor_0"]())(Data_Monoid_Last.Last)(traverse(traversableMaybe)(__dict_Applicative_16)(f)(_342));
        };
    };
});

/**
 *  | A generalization of `zipWith` which accumulates results in some `Applicative`
 *  | functor.
 */
var zipWithA = function (__dict_Applicative_18) {
    return function (f) {
        return function (xs) {
            return function (ys) {
                return sequence(traversableArray)(__dict_Applicative_18)(Data_Array.zipWith(f)(xs)(ys));
            };
        };
    };
};
var functorStateR = new Prelude.Functor(function (f) {
    return function (k) {
        return StateR(function (s) {
            var _1253 = stateR(k)(s);
            return new Data_Tuple.Tuple(_1253.value0, f(_1253.value1));
        });
    };
});
var functorStateL = new Prelude.Functor(function (f) {
    return function (k) {
        return StateL(function (s) {
            var _1256 = stateL(k)(s);
            return new Data_Tuple.Tuple(_1256.value0, f(_1256.value1));
        });
    };
});

/**
 *  | A version of `traverse` with its arguments flipped.
 *  |
 *  | 
 *  | This can be useful when running an action written using do notation
 *  | for every element in a data structure:
 *  |
 *  | For example:
 *  |
 *  | ```purescript
 *  | for [1, 2, 3] \n -> do
 *  |   print n
 *  |   return (n * n)
 *  | ```
 */
var $$for = function (__dict_Applicative_23) {
    return function (__dict_Traversable_24) {
        return function (x) {
            return function (f) {
                return traverse(__dict_Traversable_24)(__dict_Applicative_23)(f)(x);
            };
        };
    };
};
var applyStateR = new Prelude.Apply(function (f) {
    return function (x) {
        return StateR(function (s) {
            var _1259 = stateR(x)(s);
            var _1260 = stateR(f)(_1259.value0);
            return new Data_Tuple.Tuple(_1260.value0, _1260.value1(_1259.value1));
        });
    };
}, function () {
    return functorStateR;
});
var applyStateL = new Prelude.Apply(function (f) {
    return function (x) {
        return StateL(function (s) {
            var _1265 = stateL(f)(s);
            var _1266 = stateL(x)(_1265.value0);
            return new Data_Tuple.Tuple(_1266.value0, _1265.value1(_1266.value1));
        });
    };
}, function () {
    return functorStateL;
});
var applicativeStateR = new Prelude.Applicative(function () {
    return applyStateR;
}, function (a) {
    return StateR(function (s) {
        return new Data_Tuple.Tuple(s, a);
    });
});

/**
 *  | Fold a data structure from the right, keeping all intermediate results
 *  | instead of only the final result.
 *  |
 *  | Unlike `scanr`, `mapAccumR` allows the type of accumulator to differ
 *  | from the element type of the final data structure.
 */
var mapAccumR = function (__dict_Traversable_19) {
    return function (f) {
        return function (s0) {
            return function (xs) {
                return stateR(traverse(__dict_Traversable_19)(applicativeStateR)(function (a) {
                    return StateR(function (s) {
                        return f(s)(a);
                    });
                })(xs))(s0);
            };
        };
    };
};

/**
 *  | Fold a data structure from the right, keeping all intermediate results
 *  | instead of only the final result.
 */
var scanr = function (__dict_Traversable_20) {
    return function (f) {
        return function (b0) {
            return function (xs) {
                return Data_Tuple.snd(mapAccumR(__dict_Traversable_20)(function (b) {
                    return function (a) {
                        var b$prime = f(a)(b);
                        return new Data_Tuple.Tuple(b$prime, b$prime);
                    };
                })(b0)(xs));
            };
        };
    };
};
var applicativeStateL = new Prelude.Applicative(function () {
    return applyStateL;
}, function (a) {
    return StateL(function (s) {
        return new Data_Tuple.Tuple(s, a);
    });
});

/**
 *  | Fold a data structure from the left, keeping all intermediate results
 *  | instead of only the final result.
 *  |
 *  | Unlike `scanl`, `mapAccumL` allows the type of accumulator to differ
 *  | from the element type of the final data structure.
 */
var mapAccumL = function (__dict_Traversable_21) {
    return function (f) {
        return function (s0) {
            return function (xs) {
                return stateL(traverse(__dict_Traversable_21)(applicativeStateL)(function (a) {
                    return StateL(function (s) {
                        return f(s)(a);
                    });
                })(xs))(s0);
            };
        };
    };
};

/**
 *  | Fold a data structure from the left, keeping all intermediate results
 *  | instead of only the final result.
 */
var scanl = function (__dict_Traversable_22) {
    return function (f) {
        return function (b0) {
            return function (xs) {
                return Data_Tuple.snd(mapAccumL(__dict_Traversable_22)(function (b) {
                    return function (a) {
                        var b$prime = f(b)(a);
                        return new Data_Tuple.Tuple(b$prime, b$prime);
                    };
                })(b0)(xs));
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
    zipWithA: zipWithA, 
    "for": $$for, 
    sequence: sequence, 
    traverse: traverse, 
    traversableArray: traversableArray, 
    traversableEither: traversableEither, 
    traversableMaybe: traversableMaybe, 
    traversableTuple: traversableTuple, 
    traversableAdditive: traversableAdditive, 
    traversableDual: traversableDual, 
    traversableFirst: traversableFirst, 
    traversableLast: traversableLast, 
    traversableMultiplicative: traversableMultiplicative
};

},{"Data.Array":27,"Data.Either":36,"Data.Foldable":38,"Data.Maybe":42,"Data.Monoid.Additive":43,"Data.Monoid.Dual":44,"Data.Monoid.First":45,"Data.Monoid.Last":46,"Data.Monoid.Multiplicative":47,"Data.Tuple":53,"Prelude":63}],53:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | A data type and functions for working with ordered pairs and sequences of values.
 */
"use strict";
var Prelude = require("Prelude");
var Data_Monoid = require("Data.Monoid");
var Control_Lazy = require("Control.Lazy");
var Data_Array = require("Data.Array");
var Control_Comonad = require("Control.Comonad");
var Control_Extend = require("Control.Extend");

/**
 *  | A simple product type for wrapping a pair of component values.
 */
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

/**
 *  | Rakes two lists and returns a list of corresponding pairs.
 *  | If one input list is short, excess elements of the longer list are discarded.
 */
var zip = Data_Array.zipWith(Tuple.create);

/**
 *  | Transforms a list of pairs into a list of first components and a list of
 *  | second components.
 */
var unzip = function (_196) {
    if (_196.length >= 1) {
        var _728 = _196.slice(1);
        var _722 = unzip(_728);
        return new Tuple(Prelude[":"]((_196[0]).value0)(_722.value0), Prelude[":"]((_196[0]).value1)(_722.value1));
    };
    if (_196.length === 0) {
        return new Tuple([  ], [  ]);
    };
    throw new Error("Failed pattern match");
};

/**
 *  | Turn a function of two arguments into a function that expects a tuple.
 */
var uncurry = function (f) {
    return function (_195) {
        return f(_195.value0)(_195.value1);
    };
};

/**
 *  | Exchange the first and second components of a tuple.
 */
var swap = function (_197) {
    return new Tuple(_197.value1, _197.value0);
};

/**
 *  | Returns the second component of a tuple.
 */
var snd = function (_194) {
    return _194.value1;
};

/**
 *  | Allows `Tuple`s to be rendered as a string with `show` whenever there are
 *  | `Show` instances for both component types.
 */
var showTuple = function (__dict_Show_0) {
    return function (__dict_Show_1) {
        return new Prelude.Show(function (_198) {
            return "Tuple (" + (Prelude.show(__dict_Show_0)(_198.value0) + (") (" + (Prelude.show(__dict_Show_1)(_198.value1) + ")")));
        });
    };
};
var semigroupoidTuple = new Prelude.Semigroupoid(function (_203) {
    return function (_204) {
        return new Tuple(_204.value0, _203.value1);
    };
});

/**
 *  | The `Semigroup` instance enables use of the associative operator `<>` on
 *  | `Tuple`s whenever there are `Semigroup` instances for the component
 *  | types. The `<>` operator is applied pairwise, so:
 *  | ```purescript
 *  | (Tuple a1 b1) <> (Tuple a2 b2) = Tuple (a1 <> a2) (b1 <> b2)
 *  | ```
 */
var semigroupTuple = function (__dict_Semigroup_2) {
    return function (__dict_Semigroup_3) {
        return new Prelude.Semigroup(function (_205) {
            return function (_206) {
                return new Tuple(Prelude["<>"](__dict_Semigroup_2)(_205.value0)(_206.value0), Prelude["<>"](__dict_Semigroup_3)(_205.value1)(_206.value1));
            };
        });
    };
};
var monoidTuple = function (__dict_Monoid_6) {
    return function (__dict_Monoid_7) {
        return new Data_Monoid.Monoid(function () {
            return semigroupTuple(__dict_Monoid_6["__superclass_Prelude.Semigroup_0"]())(__dict_Monoid_7["__superclass_Prelude.Semigroup_0"]());
        }, new Tuple(Data_Monoid.mempty(__dict_Monoid_6), Data_Monoid.mempty(__dict_Monoid_7)));
    };
};

/**
 *  | The `Functor` instance allows functions to transform the contents of a
 *  | `Tuple` with the `<$>` operator, applying the function to the second
 *  | component, so:
 *  | ```purescript
 *  | f <$> (Tuple x y) = Tuple x (f y)
 *  | ````
 */
var functorTuple = new Prelude.Functor(function (f) {
    return function (_207) {
        return new Tuple(_207.value0, f(_207.value1));
    };
});

/**
 *  | Returns the first component of a tuple.
 */
var fst = function (_193) {
    return _193.value0;
};
var lazyLazy1Tuple = function (__dict_Lazy1_9) {
    return function (__dict_Lazy1_10) {
        return new Control_Lazy.Lazy(function (f) {
            return new Tuple(Control_Lazy.defer1(__dict_Lazy1_9)(function (_189) {
                return fst(f(Prelude.unit));
            }), Control_Lazy.defer1(__dict_Lazy1_10)(function (_190) {
                return snd(f(Prelude.unit));
            }));
        });
    };
};
var lazyLazy2Tuple = function (__dict_Lazy2_11) {
    return function (__dict_Lazy2_12) {
        return new Control_Lazy.Lazy(function (f) {
            return new Tuple(Control_Lazy.defer2(__dict_Lazy2_11)(function (_191) {
                return fst(f(Prelude.unit));
            }), Control_Lazy.defer2(__dict_Lazy2_12)(function (_192) {
                return snd(f(Prelude.unit));
            }));
        });
    };
};
var lazyTuple = function (__dict_Lazy_13) {
    return function (__dict_Lazy_14) {
        return new Control_Lazy.Lazy(function (f) {
            return new Tuple(Control_Lazy.defer(__dict_Lazy_13)(function (_187) {
                return fst(f(Prelude.unit));
            }), Control_Lazy.defer(__dict_Lazy_14)(function (_188) {
                return snd(f(Prelude.unit));
            }));
        });
    };
};
var extendTuple = new Control_Extend.Extend(function (f) {
    return function (_211) {
        return new Tuple(_211.value0, f(_211));
    };
}, function () {
    return functorTuple;
});

/**
 *  | Allows `Tuple`s to be checked for equality with `==` and `/=` whenever
 *  | there are `Eq` instances for both component types.
 */
var eqTuple = function (__dict_Eq_15) {
    return function (__dict_Eq_16) {
        return new Prelude.Eq(function (t1) {
            return function (t2) {
                return !Prelude["=="](eqTuple(__dict_Eq_15)(__dict_Eq_16))(t1)(t2);
            };
        }, function (_199) {
            return function (_200) {
                return Prelude["=="](__dict_Eq_15)(_199.value0)(_200.value0) && Prelude["=="](__dict_Eq_16)(_199.value1)(_200.value1);
            };
        });
    };
};

/**
 *  | Allows `Tuple`s to be compared with `compare`, `>`, `>=`, `<` and `<=`
 *  | whenever there are `Ord` instances for both component types. To obtain
 *  | the result, the `fst`s are `compare`d, and if they are `EQ`ual, the
 *  | `snd`s are `compare`d.
 */
var ordTuple = function (__dict_Ord_4) {
    return function (__dict_Ord_5) {
        return new Prelude.Ord(function () {
            return eqTuple(__dict_Ord_4["__superclass_Prelude.Eq_0"]())(__dict_Ord_5["__superclass_Prelude.Eq_0"]());
        }, function (_201) {
            return function (_202) {
                var _779 = Prelude.compare(__dict_Ord_4)(_201.value0)(_202.value0);
                if (_779 instanceof Prelude.EQ) {
                    return Prelude.compare(__dict_Ord_5)(_201.value1)(_202.value1);
                };
                return _779;
            };
        });
    };
};

/**
 *  | Turn a function that expects a tuple into a function of two arguments.
 */
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

/**
 *  | The `Functor` instance allows functions to transform the contents of a
 *  | `Tuple` with the `<*>` operator whenever there is a `Semigroup` instance
 *  | for the `fst` component, so:
 *  | ```purescript
 *  | (Tuple a1 f) <*> (Tuple a2 x) == Tuple (a1 <> a2) (f x)
 *  | ```
 */
var applyTuple = function (__dict_Semigroup_18) {
    return new Prelude.Apply(function (_208) {
        return function (_209) {
            return new Tuple(Prelude["<>"](__dict_Semigroup_18)(_208.value0)(_209.value0), _208.value1(_209.value1));
        };
    }, function () {
        return functorTuple;
    });
};
var bindTuple = function (__dict_Semigroup_17) {
    return new Prelude.Bind(function (_210) {
        return function (f) {
            var _792 = f(_210.value1);
            return new Tuple(Prelude["<>"](__dict_Semigroup_17)(_210.value0)(_792.value0), _792.value1);
        };
    }, function () {
        return applyTuple(__dict_Semigroup_17);
    });
};
var applicativeTuple = function (__dict_Monoid_19) {
    return new Prelude.Applicative(function () {
        return applyTuple(__dict_Monoid_19["__superclass_Prelude.Semigroup_0"]());
    }, Tuple.create(Data_Monoid.mempty(__dict_Monoid_19)));
};
var monadTuple = function (__dict_Monoid_8) {
    return new Prelude.Monad(function () {
        return applicativeTuple(__dict_Monoid_8);
    }, function () {
        return bindTuple(__dict_Monoid_8["__superclass_Prelude.Semigroup_0"]());
    });
};
module.exports = {
    Tuple: Tuple, 
    swap: swap, 
    unzip: unzip, 
    zip: zip, 
    uncurry: uncurry, 
    curry: curry, 
    snd: snd, 
    fst: fst, 
    showTuple: showTuple, 
    eqTuple: eqTuple, 
    ordTuple: ordTuple, 
    semigroupoidTuple: semigroupoidTuple, 
    semigroupTuple: semigroupTuple, 
    monoidTuple: monoidTuple, 
    functorTuple: functorTuple, 
    applyTuple: applyTuple, 
    applicativeTuple: applicativeTuple, 
    bindTuple: bindTuple, 
    monadTuple: monadTuple, 
    extendTuple: extendTuple, 
    comonadTuple: comonadTuple, 
    lazyTuple: lazyTuple, 
    lazyLazy1Tuple: lazyLazy1Tuple, 
    lazyLazy2Tuple: lazyLazy2Tuple
};

},{"Control.Comonad":6,"Control.Extend":7,"Control.Lazy":8,"Data.Array":27,"Data.Monoid":48,"Prelude":63}],54:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module provides a type class for _unfoldable functors_, i.e.
 *  | functors which support an `unfoldr` operation.
 *  |
 *  | This allows us to unify various operations on arrays, lists,
 *  | sequences, etc.
 */
"use strict";
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Array_ST = require("Data.Array.ST");
var Prelude = require("Prelude");
var Control_Monad_ST = require("Control.Monad.ST");
var Data_Maybe = require("Data.Maybe");
var Data_Tuple = require("Data.Tuple");

/**
 *  | This class identifies data structures which can be _unfolded_,
 *  | generalizing `unfoldr` on arrays.
 *  |
 *  | The generating function `f` in `unfoldr f` in understood as follows:
 *  |
 *  | - If `f b` is `Nothing`, then `unfoldr f b` should be empty.
 *  | - If `f b` is `Just (Tuple a b1)`, then `unfoldr f b` should consist of `a`
 *  |   appended to the result of `unfoldr f b1`.
 */
var Unfoldable = function (unfoldr) {
    this.unfoldr = unfoldr;
};

/**
 *  | This class identifies data structures which can be _unfolded_,
 *  | generalizing `unfoldr` on arrays.
 *  |
 *  | The generating function `f` in `unfoldr f` in understood as follows:
 *  |
 *  | - If `f b` is `Nothing`, then `unfoldr f b` should be empty.
 *  | - If `f b` is `Just (Tuple a b1)`, then `unfoldr f b` should consist of `a`
 *  |   appended to the result of `unfoldr f b1`.
 */
var unfoldr = function (dict) {
    return dict.unfoldr;
};
var unfoldableArray = new Unfoldable(function (f) {
    return function (b) {
        return Control_Monad_Eff.runPure(Data_Array_ST.runSTArray(function __do() {
            var _2 = Data_Array_ST.emptySTArray();
            var _1 = Control_Monad_ST.newSTRef(b)();
            (function () {
                while (!(function __do() {
                    var _0 = Control_Monad_ST.readSTRef(_1)();
                    return (function () {
                        var _398 = f(_0);
                        if (_398 instanceof Data_Maybe.Nothing) {
                            return Prelude["return"](Control_Monad_Eff.monadEff)(true);
                        };
                        if (_398 instanceof Data_Maybe.Just) {
                            return function __do() {
                                Data_Array_ST.pushSTArray(_2)(_398.value0.value0)();
                                Control_Monad_ST.writeSTRef(_1)(_398.value0.value1)();
                                return false;
                            };
                        };
                        throw new Error("Failed pattern match");
                    })()();
                })()) {

                };
                return {};
            })();
            return _2;
        }));
    };
});
module.exports = {
    Unfoldable: Unfoldable, 
    unfoldr: unfoldr, 
    unfoldableArray: unfoldableArray
};

},{"Control.Monad.Eff":10,"Control.Monad.ST":17,"Data.Array.ST":26,"Data.Maybe":42,"Data.Tuple":53,"Prelude":63}],55:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Types = require("Types");
var initialCells2 = [ [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Alive.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ] ];
var initialCells = [ [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Alive.value, Types.Alive.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ], [ Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value, Types.Dead.value ] ];
module.exports = {
    initialCells2: initialCells2, 
    initialCells: initialCells
};

},{"Prelude":63,"Types":69}],56:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");

    function trace(s) {
      return function() {
        console.log(s);
        return {};
      };
    }
    ;

/**
 *  | Write a value to the console, using its `Show` instance to produce a `String`.
 */
var print = function (__dict_Show_0) {
    return function (o) {
        return trace(Prelude.show(__dict_Show_0)(o));
    };
};
module.exports = {
    print: print, 
    trace: trace
};

},{"Control.Monad.Eff":10,"Prelude":63}],57:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | This module defines types for some global Javascript functions
 *  | and values.
 */
"use strict";
var Prelude = require("Prelude");
var nan = NaN;;
var infinity = Infinity;;

  function readInt(radix) {
    return function(n) {
      return parseInt(n, radix);
    };
  }
  ;
var readFloat = parseFloat;;
module.exports = {
    readFloat: readFloat, 
    readInt: readInt, 
    isFinite: isFinite, 
    infinity: infinity, 
    isNaN: isNaN, 
    nan: nan
};

},{"Prelude":63}],58:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Data_Function = require("Data.Function");
var Prelude = require("Prelude");
var Data_Maybe = require("Data.Maybe");
var Control_Monad_Eff = require("Control.Monad.Eff");
function getCanvasElementByIdImpl(id, Just, Nothing) {
    return function() {
      var el = document.getElementById(id);
      if (el && el instanceof HTMLCanvasElement) {
        return Just(el);
      } else {
        return Nothing;
      }
    };
  };
function getContext2D(c) {  return function() {    return c.getContext('2d');  };};
function getCanvasWidth(canvas){  return function(){    return canvas.width;  };};;
function getCanvasHeight(canvas){  return function(){    return canvas.height;  };};;
function setCanvasWidth(width){   return function(canvas){      return function(){        canvas.width = width;        return canvas;      };    };};;
function setCanvasHeight(height){   return function(canvas){      return function(){         canvas.height = height;         return canvas;       };    };};;
function canvasToDataURL(canvas) {   return function(){     return canvas.toDataURL();   };};;
function setLineWidth(width) {  return function(ctx) {    return function() {      ctx.lineWidth = width;      return ctx;    };  };};
function setFillStyle(style) {  return function(ctx) {    return function() {      ctx.fillStyle = style;      return ctx;    };  };};
function setStrokeStyle(style) {  return function(ctx) {    return function() {      ctx.strokeStyle = style;      return ctx;    };  };};
function setShadowColor(color) {  return function(ctx) {    return function() {      ctx.shadowColor = color;      return ctx;    };  };};
function setShadowBlur(blur) {  return function(ctx) {    return function() {      ctx.shadowBlur = blur;      return ctx;    };  };};
function setShadowOffsetX(offsetX) {  return function(ctx) {    return function() {      ctx.shadowOffsetX = offsetX;      return ctx;    };  };};
function setShadowOffsetY(offsetY) {  return function(ctx) {    return function() {      ctx.shadowOffsetY = offsetY;      return ctx;    };  };};
function setLineCapImpl(cap){  return function(ctx) {    return function() {      ctx.lineCap = cap;      return ctx;    };  };};
function setGlobalCompositeOperationImpl(ctx) {  return function(op) {    return function() {      ctx.globalCompositeOperation = op;      return ctx;    };  };};
function setGlobalAlpha(ctx) {  return function(alpha) {    return function() {      ctx.setGlobalAlpha = alpha;      return ctx;    };  };};
function beginPath(ctx) {  return function() {    ctx.beginPath();    return ctx;  };};
function stroke(ctx) {  return function() {    ctx.stroke();    return ctx;  };};
function fill(ctx) {  return function() {    ctx.fill();    return ctx;  };};
function clip(ctx) {  return function() {    ctx.clip();    return ctx;  };};
function lineTo(ctx) {  return function(x) {    return function(y) {      return function() {        ctx.lineTo(x, y);        return ctx;      };    };  };};
function moveTo(ctx) {  return function(x) {    return function(y) {      return function() {        ctx.moveTo(x, y);        return ctx;      };    };  };};
function closePath(ctx) {  return function() {    ctx.closePath();    return ctx;  };};
function arc(ctx) {  return function(a) {    return function() {      ctx.arc(a.x, a.y, a.r, a.start, a.end);      return ctx;    };  };};
function rect(ctx) {  return function(r) {    return function() {      ctx.rect(r.x, r.y, r.w, r.h);      return ctx;    };  };};
function fillRect(ctx) {  return function(r) {    return function() {      ctx.fillRect(r.x, r.y, r.w, r.h);      return ctx;    };  };};
function strokeRect(ctx) {  return function(r) {    return function() {      ctx.strokeRect(r.x, r.y, r.w, r.h);      return ctx;    };  };};
function clearRect(ctx) {  return function(r) {    return function() {      ctx.clearRect(r.x, r.y, r.w, r.h);      return ctx;    };  };};
function scale(t) {  return function(ctx) {    return function() {      ctx.scale(t.scaleX, t.scaleY);      return ctx;    };  };};
function rotate(angle) {  return function(ctx) {    return function() {      ctx.rotate(angle);      return ctx;    };  };};
function translate(t) {  return function(ctx) {    return function() {      ctx.translate(t.translateX, t.translateY);      return ctx;    };  };};
function transform(t) {  return function(ctx) {    return function() {      ctx.transform(t.m11, t.m12, t.m21, t.m22, t.m31, t.m32);      return ctx;    };  };};
function textAlign(ctx) {
      return function() {
        return unsafeParseTextAlign(ctx.textAlign);
      }
  };
function setTextAlignImpl(ctx) {
    return function(textAlign) {
      return function() {
        ctx.textAlign = textAlign;
        return ctx;
      }
    }
  };
function font(ctx) {  return function() {    return ctx.font;  };};
function setFont(fontspec) {  return function(ctx) {    return function() {      ctx.font = fontspec;      return ctx;    };  };};
function fillText(ctx) {  return function(text) {    return function(x) {      return function(y) {        return function() {          ctx.fillText(text, x, y);          return ctx;        };      };    };  };};
function strokeText(ctx) {  return function(text) {    return function(x) {      return function(y) {        return function() {          ctx.strokeText(text, x, y);          return ctx;        };      };    };  };};
function measureText(ctx) {  return function(text) {    return function() {      return ctx.measureText(text);    };  };};
function save(ctx) {  return function() {    ctx.save();    return ctx;  };};
function restore(ctx) {  return function() {    ctx.restore();    return ctx;  };};
function getImageData(ctx) {  return function(x) {    return function(y) {      return function(w) {        return function(h) {          return function() { return ctx.getImageData(x, y, w, h); };        };      };    };  };};
function putImageDataFull(ctx) {  return function(image_data) {    return function(x) {      return function(y) {        return function(dx) {          return function(dy) {            return function(dw) {              return function(dh) {                return function() {                  ctx.putImageData(image_data, x, y, dx, dy, dw, dh);                  return ctx;                };              };            };          };        };      };    };  };};
function putImageData(ctx) {  return function(image_data) {    return function(x) {      return function(y) {        return function() {          ctx.putImageData(image_data, x, y);          return ctx;        };      };    };  };};
function createImageData(ctx) {  return function(sw) {    return function(sh) {      return function() {        return ctx.createImageData(sw, sh);      };    };  };};
function createImageDataCopy(ctx) {  return function(image_data) {    return function() {      return ctx.createImageData(image_data);    };  };};
function getImageDataWidth(image_data) {  return function() {    return image_data.width;  };};
function getImageDataHeight(image_data) {  return function() {    return image_data.height;  };};
function getImageDataPixelArray(image_data) {  return function() {    return image_data.data;  };};

/**
 *  |
 *  Text
 * 
 */
var AlignLeft = (function () {
    function AlignLeft() {

    };
    AlignLeft.value = new AlignLeft();
    return AlignLeft;
})();

/**
 *  |
 *  Text
 * 
 */
var AlignRight = (function () {
    function AlignRight() {

    };
    AlignRight.value = new AlignRight();
    return AlignRight;
})();

/**
 *  |
 *  Text
 * 
 */
var AlignCenter = (function () {
    function AlignCenter() {

    };
    AlignCenter.value = new AlignCenter();
    return AlignCenter;
})();

/**
 *  |
 *  Text
 * 
 */
var AlignStart = (function () {
    function AlignStart() {

    };
    AlignStart.value = new AlignStart();
    return AlignStart;
})();

/**
 *  |
 *  Text
 * 
 */
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
            save(ctx)();
            var _4 = action();
            restore(ctx)();
            return _4;
        };
    };
};
var unsafeParseTextAlign = function (_9) {
    if (_9 === "left") {
        return AlignLeft.value;
    };
    if (_9 === "right") {
        return AlignRight.value;
    };
    if (_9 === "center") {
        return AlignCenter.value;
    };
    if (_9 === "start") {
        return AlignStart.value;
    };
    if (_9 === "end") {
        return AlignEnd.value;
    };
    throw new Error("Failed pattern match");
};
var strokePath = function (ctx) {
    return function (path) {
        return function __do() {
            beginPath(ctx)();
            var _2 = path();
            stroke(ctx)();
            return _2;
        };
    };
};
var showTextAlign = new Prelude.Show(function (_11) {
    if (_11 instanceof AlignLeft) {
        return "left";
    };
    if (_11 instanceof AlignRight) {
        return "right";
    };
    if (_11 instanceof AlignCenter) {
        return "center";
    };
    if (_11 instanceof AlignStart) {
        return "start";
    };
    if (_11 instanceof AlignEnd) {
        return "end";
    };
    throw new Error("Failed pattern match");
});
var showComposite = new Prelude.Show(function (_10) {
    if (_10 instanceof SourceOver) {
        return "source-over";
    };
    if (_10 instanceof SourceIn) {
        return "source-in";
    };
    if (_10 instanceof SourceOut) {
        return "source-out";
    };
    if (_10 instanceof SourceAtop) {
        return "source-atop";
    };
    if (_10 instanceof DestinationOver) {
        return "destination-over";
    };
    if (_10 instanceof DestinationIn) {
        return "destination-in";
    };
    if (_10 instanceof DestinationOut) {
        return "destination-out";
    };
    if (_10 instanceof DestinationAtop) {
        return "destination-atop";
    };
    if (_10 instanceof Lighter) {
        return "lighter";
    };
    if (_10 instanceof Copy) {
        return "copy";
    };
    if (_10 instanceof Xor) {
        return "xor";
    };
    throw new Error("Failed pattern match");
});
var setTextAlign = function (ctx) {
    return function (textAlign) {
        return setTextAlignImpl(ctx)(Prelude.show(showTextAlign)(textAlign));
    };
};
var setLineCap = function (_8) {
    if (_8 instanceof Round) {
        return setLineCapImpl("round");
    };
    if (_8 instanceof Square) {
        return setLineCapImpl("square");
    };
    if (_8 instanceof Butt) {
        return setLineCapImpl("butt");
    };
    throw new Error("Failed pattern match");
};
var setGlobalCompositeOperation = function (ctx) {
    return function (composite) {
        return setGlobalCompositeOperationImpl(ctx)(Prelude.show(showComposite)(composite));
    };
};
var setCanvasDimensions = function (d) {
    return function (ce) {
        return Prelude[">>="](Control_Monad_Eff.bindEff)(setCanvasHeight(d.height)(ce))(setCanvasWidth(d.width));
    };
};
var getCanvasElementById = function (elId) {
    return getCanvasElementByIdImpl(elId, Data_Maybe.Just.create, Data_Maybe.Nothing.value);
};
var getCanvasDimensions = function (ce) {
    return function __do() {
        var _1 = getCanvasWidth(ce)();
        var _0 = getCanvasHeight(ce)();
        return {
            width: _1, 
            height: _0
        };
    };
};
var fillPath = function (ctx) {
    return function (path) {
        return function __do() {
            beginPath(ctx)();
            var _3 = path();
            fill(ctx)();
            return _3;
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
    createImageDataCopy: createImageDataCopy, 
    createImageData: createImageData, 
    putImageDataFull: putImageDataFull, 
    putImageData: putImageData, 
    getImageDataPixelArray: getImageDataPixelArray, 
    getImageDataHeight: getImageDataHeight, 
    getImageDataWidth: getImageDataWidth, 
    getImageData: getImageData, 
    withContext: withContext, 
    restore: restore, 
    save: save, 
    measureText: measureText, 
    strokeText: strokeText, 
    fillText: fillText, 
    setFont: setFont, 
    font: font, 
    setTextAlign: setTextAlign, 
    textAlign: textAlign, 
    transform: transform, 
    translate: translate, 
    rotate: rotate, 
    scale: scale, 
    clearRect: clearRect, 
    strokeRect: strokeRect, 
    fillRect: fillRect, 
    rect: rect, 
    arc: arc, 
    fillPath: fillPath, 
    strokePath: strokePath, 
    closePath: closePath, 
    moveTo: moveTo, 
    lineTo: lineTo, 
    clip: clip, 
    fill: fill, 
    stroke: stroke, 
    beginPath: beginPath, 
    setGlobalAlpha: setGlobalAlpha, 
    setGlobalCompositeOperation: setGlobalCompositeOperation, 
    setLineCap: setLineCap, 
    setShadowColor: setShadowColor, 
    setShadowOffsetY: setShadowOffsetY, 
    setShadowOffsetX: setShadowOffsetX, 
    setShadowBlur: setShadowBlur, 
    setStrokeStyle: setStrokeStyle, 
    setFillStyle: setFillStyle, 
    setLineWidth: setLineWidth, 
    canvasToDataURL: canvasToDataURL, 
    setCanvasDimensions: setCanvasDimensions, 
    getCanvasDimensions: getCanvasDimensions, 
    setCanvasHeight: setCanvasHeight, 
    getCanvasHeight: getCanvasHeight, 
    setCanvasWidth: setCanvasWidth, 
    getCanvasWidth: getCanvasWidth, 
    getContext2D: getContext2D, 
    getCanvasElementById: getCanvasElementById, 
    showComposite: showComposite, 
    showTextAlign: showTextAlign
};

},{"Control.Monad.Eff":10,"Data.Function":39,"Data.Maybe":42,"Prelude":63}],59:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Prelude = require("Prelude");
function which(ev) { return ev.which; };
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
    if (which(x) === 13) {
        return Enter.value;
    };
    if (which(x) === 27) {
        return Escape.value;
    };
    if (which(x) === 45) {
        return Insert.value;
    };
    if (which(x) === 46) {
        return Delete.value;
    };
    if (which(x) === 112) {
        return F1.value;
    };
    if (which(x) === 113) {
        return F2.value;
    };
    if (which(x) === 114) {
        return F3.value;
    };
    if (which(x) === 115) {
        return F4.value;
    };
    if (which(x) === 116) {
        return F5.value;
    };
    if (which(x) === 32) {
        return Space.value;
    };
    if (which(x) === 37) {
        return LeftArrow.value;
    };
    if (which(x) === 39) {
        return RightArrow.value;
    };
    return UnknownKey.create(which(x));
};
var eqKeyCode = new Prelude.Eq(function (a) {
    return function (b) {
        return !Prelude["=="](eqKeyCode)(a)(b);
    };
}, function (_2) {
    return function (_3) {
        if (_2 instanceof Insert && _3 instanceof Insert) {
            return true;
        };
        if (_2 instanceof Escape && _3 instanceof Escape) {
            return true;
        };
        if (_2 instanceof Enter && _3 instanceof Enter) {
            return true;
        };
        if (_2 instanceof Delete && _3 instanceof Delete) {
            return true;
        };
        if (_2 instanceof F1 && _3 instanceof F1) {
            return true;
        };
        if (_2 instanceof F2 && _3 instanceof F2) {
            return true;
        };
        if (_2 instanceof F3 && _3 instanceof F3) {
            return true;
        };
        if (_2 instanceof F4 && _3 instanceof F4) {
            return true;
        };
        if (_2 instanceof F5 && _3 instanceof F5) {
            return true;
        };
        if (_2 instanceof Space && _3 instanceof Space) {
            return true;
        };
        if (_2 instanceof LeftArrow && _3 instanceof LeftArrow) {
            return true;
        };
        if (_2 instanceof RightArrow && _3 instanceof RightArrow) {
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
    UnknownKey: UnknownKey, 
    which: which, 
    keyEventToKeyCode: keyEventToKeyCode, 
    eqKeyCode: eqKeyCode
};

},{"Prelude":63}],60:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
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
var Debug_Trace = require("Debug.Trace");
var Rx_Observable = require("Rx.Observable");
var Types = require("Types");
var main = (function () {
    var timerStream = Prelude["<$>"](Rx_Observable.functorObservable)(function (_50) {
        return Types.Timer.value;
    })(Utils.getIntervalStream(1000));
    var ticksStream = Prelude["<$>"](Rx_Observable.functorObservable)(function (_51) {
        return Types.Tick.value;
    })(Utils.getIntervalStream(Core.initialSpeed));
    var ticksPlayPauseStream = Utils.newSubject();
    var pausableTicksStream = Utils.pausable(ticksStream)(ticksPlayPauseStream);
    var keyToAction = function (_52) {
        if (_52 instanceof KeyCodes.Space) {
            return new Data_Maybe.Just(Types.Toggle.value);
        };
        if (_52 instanceof KeyCodes.LeftArrow) {
            return Data_Maybe.Just.create(new Types.Rewind(1));
        };
        if (_52 instanceof KeyCodes.RightArrow) {
            return Data_Maybe.Just.create(new Types.FForward(1));
        };
        return Data_Maybe.Nothing.value;
    };
    var actionsStream = Utils.newSubject();
    var jointActionsStream = Control_Alt["<|>"](Rx_Observable.altObservable)(Control_Alt["<|>"](Rx_Observable.altObservable)(pausableTicksStream)(actionsStream))(timerStream);
    var keyCommand = function (key) {
        var _200 = keyToAction(key);
        if (_200 instanceof Data_Maybe.Just) {
            return Utils.onNext(actionsStream)(_200.value0);
        };
        if (_200 instanceof Data_Maybe.Nothing) {
            return Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude.unit);
        };
        throw new Error("Failed pattern match");
    };
    var setupUI = function (ui) {
        return function (placeholderId) {
            return function (initialState) {
                return function (stateStream) {
                    return Prelude["void"](Control_Monad_Eff.functorEff)(function __do() {
                        var _7 = ui(initialState)(actionsStream)(placeholderId)();
                        return Rx_Observable.subscribe(stateStream)(Utils.onNext(_7))();
                    });
                };
            };
        };
    };
    var setupCanvas = setupUI(UI_Canvas.setupUI)("canvas");
    var setupConsole = setupUI(UI_Console.setupUI)("");
    var setupReact = setupUI(UI_React.setupUI)("root_layout");
    return function __do() {
        var _11 = Utils.getParameterByName("ui")();
        var _10 = Core.getInitialState();
        var _9 = Utils.scan(Core.updateStateFactory(ticksPlayPauseStream))(_10)(jointActionsStream)();
        (function () {
            if (_11 === "react") {
                return setupReact(_10)(_9);
            };
            if (_11 === "canvas") {
                return setupCanvas(_10)(_9);
            };
            if (_11 === "console") {
                return setupConsole(_10)(_9);
            };
            if (_11 === "react_canvas") {
                return Control_Apply["*>"](Control_Monad_Eff.applyEff)(setupReact(_10)(_9))(setupCanvas(_10)(_9));
            };
            return setupCanvas(_10)(_9);
        })()();
        var _8 = Utils.fromEvent("keyup")();
        Rx_Observable.subscribe(Prelude["<$>"](Rx_Observable.functorObservable)(KeyCodes.keyEventToKeyCode)(_8))(keyCommand)();
        return Utils.onNext(ticksPlayPauseStream)(true)();
    };
})();
module.exports = {
    main: main
};

},{"Control.Alt":3,"Control.Apply":5,"Control.Monad.Eff":10,"Core":24,"Data.Function":39,"Data.Maybe":42,"Debug.Trace":56,"KeyCodes":59,"Prelude":63,"Rx.Observable":68,"Types":69,"UI.Canvas":70,"UI.Console":71,"UI.React":72,"Utils":73}],61:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3

/**
 *  | Wraps the math functions and constants from Javascript's built-in `Math` object.
 *  | See [Math Reference at MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math).
 */
"use strict";
var Prelude = require("Prelude");
var abs = Math.abs;;
var acos = Math.acos;;
var asin = Math.asin;;
var atan = Math.atan;;
function atan2(y){  return function (x) {    return Math.atan2(y, x);  };};
var ceil = Math.ceil;;
var cos = Math.cos;;
var exp = Math.exp;;
var floor = Math.floor;;
var log = Math.log;;
function max(n1){  return function(n2) {    return Math.max(n1, n2);  }};
function min(n1){  return function(n2) {    return Math.min(n1, n2);  }};
function pow(n){  return function(p) {    return Math.pow(n, p);  }};
var round = Math.round;;
var sin = Math.sin;;
var sqrt = Math.sqrt;;
var tan = Math.tan;;
var e       = Math.E;;
var ln2     = Math.LN2;;
var ln10    = Math.LN10;;
var log2e   = Math.LOG2E;;
var log10e  = Math.LOG10E;;
var pi      = Math.PI;;
var sqrt1_2 = Math.SQRT1_2;;
var sqrt2   = Math.SQRT2;;
module.exports = {
    sqrt2: sqrt2, 
    sqrt1_2: sqrt1_2, 
    pi: pi, 
    log10e: log10e, 
    log2e: log2e, 
    ln10: ln10, 
    ln2: ln2, 
    e: e, 
    tan: tan, 
    sqrt: sqrt, 
    sin: sin, 
    round: round, 
    pow: pow, 
    min: min, 
    max: max, 
    log: log, 
    floor: floor, 
    exp: exp, 
    cos: cos, 
    ceil: ceil, 
    atan2: atan2, 
    atan: atan, 
    asin: asin, 
    acos: acos, 
    abs: abs
};

},{"Prelude":63}],62:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");

    function unsafeIndex(xs) {
      return function(n) {
        return xs[n];
      };
    }
    ;
module.exports = {
    unsafeIndex: unsafeIndex
};

},{"Prelude":63}],63:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";

    function cons(e) {
      return function(l) {
        return [e].concat(l);
      };
    }
    ;

    function showStringImpl(s) {
      return JSON.stringify(s);
    }
    ;

    function showNumberImpl(n) {
      return n.toString();
    }
    ;

    function showArrayImpl(f) {
      return function(xs) {
        var ss = [];
        for (var i = 0, l = xs.length; i < l; i++) {
          ss[i] = f(xs[i]);
        }
        return '[' + ss.join(',') + ']';
      };
    }
    ;

    function numAdd(n1) {
      return function(n2) {
        return n1 + n2;
      };
    }
    ;

    function numSub(n1) {
      return function(n2) {
        return n1 - n2;
      };
    }
    ;

    function numMul(n1) {
      return function(n2) {
        return n1 * n2;
      };
    }
    ;

    function numDiv(n1) {
      return function(n2) {
        return n1 / n2;
      };
    }
    ;

    function numMod(n1) {
      return function(n2) {
        return n1 % n2;
      };
    }
    ;

    function refEq(r1) {
      return function(r2) {
        return r1 === r2;
      };
    }
    ;

    function refIneq(r1) {
      return function(r2) {
        return r1 !== r2;
      };
    }
    ;

    function eqArrayImpl(f) {
      return function(xs) {
        return function(ys) {
          if (xs.length !== ys.length) return false;
          for (var i = 0; i < xs.length; i++) {
            if (!f(xs[i])(ys[i])) return false;
          }
          return true;
        };
      };
    }
    ;

    function unsafeCompareImpl(lt) {
      return function(eq) {
        return function(gt) {
          return function(x) {
            return function(y) {
              return x < y ? lt : x > y ? gt : eq;
            };
          };
        };
      };
    }
    ;

    function numShl(n1) {
      return function(n2) {
        return n1 << n2;
      };
    }
    ;

    function numShr(n1) {
      return function(n2) {
        return n1 >> n2;
      };
    }
    ;

    function numZshr(n1) {
      return function(n2) {
        return n1 >>> n2;
      };
    }
    ;

    function numAnd(n1) {
      return function(n2) {
        return n1 & n2;
      };
    }
    ;

    function numOr(n1) {
      return function(n2) {
        return n1 | n2;
      };
    }
    ;

    function numXor(n1) {
      return function(n2) {
        return n1 ^ n2;
      };
    }
    ;

    function numComplement(n) {
      return ~n;
    }
    ;

    function boolAnd(b1) {
      return function(b2) {
        return b1 && b2;
      };
    }
    ;

    function boolOr(b1) {
      return function(b2) {
        return b1 || b2;
      };
    }
    ;

    function boolNot(b) {
      return !b;
    }
    ;

    function concatString(s1) {
      return function(s2) {
        return s1 + s2;
      };
    }
    ;

/**
 *  | The `Unit` type has a single inhabitant, called `unit`. It represents values with no computational content.
 *  |
 *  | `Unit` is often used, wrapped in a monadic type constructor, as the return type of a computation where only
 *  | the _effects_ are important.
 */
var Unit = function (x) {
    return x;
};

/**
 *  | The `Ordering` data type represents the three possible outcomes of comparing two values:
 *  |
 *  | `LT` - The first value is _less than_ the second.
 *  | `GT` - The first value is _greater than_ the second.
 *  | `EQ` - The first value is _equal to_ or _incomparable to_ the second.
 */
var LT = (function () {
    function LT() {

    };
    LT.value = new LT();
    return LT;
})();

/**
 *  | The `Ordering` data type represents the three possible outcomes of comparing two values:
 *  |
 *  | `LT` - The first value is _less than_ the second.
 *  | `GT` - The first value is _greater than_ the second.
 *  | `EQ` - The first value is _equal to_ or _incomparable to_ the second.
 */
var GT = (function () {
    function GT() {

    };
    GT.value = new GT();
    return GT;
})();

/**
 *  | The `Ordering` data type represents the three possible outcomes of comparing two values:
 *  |
 *  | `LT` - The first value is _less than_ the second.
 *  | `GT` - The first value is _greater than_ the second.
 *  | `EQ` - The first value is _equal to_ or _incomparable to_ the second.
 */
var EQ = (function () {
    function EQ() {

    };
    EQ.value = new EQ();
    return EQ;
})();

/**
 *  | A `Semigroupoid` is similar to a [`Category`](#category) but does not require an identity
 *  | element `id`, just composable morphisms.
 *  |
 *  | `Semigroupoid`s should obey the following rule:
 *  |
 *  | - Associativity: `p <<< (q <<< r) = (p <<< q) <<< r`
 *  |
 *  | One example of a `Semigroupoid` is the function type constructor `(->)`, with `(<<<)` defined
 *  | as function composition.
 */
var Semigroupoid = function ($less$less$less) {
    this["<<<"] = $less$less$less;
};

/**
 *  | `Category`s consist of objects and composable morphisms between them, and as such are
 *  | [`Semigroupoids`](#semigroupoid), but unlike `semigroupoids` must have an identity element.
 *  |
 *  | `Category`s should obey the following rules.
 *  |
 *  | - Left Identity: `id <<< p = p`
 *  | - Right Identity: `p <<< id = p`
 *  |
 */
var Category = function (__superclass_Prelude$dotSemigroupoid_0, id) {
    this["__superclass_Prelude.Semigroupoid_0"] = __superclass_Prelude$dotSemigroupoid_0;
    this.id = id;
};

/**
 *  | The `Show` type class represents those types which can be converted into a human-readable `String` representation.
 *  |
 *  | While not required, it is recommended that for any expression `x`, the string `show x` be executable PureScript code
 *  | which evaluates to the same value as the expression `x`.
 */
var Show = function (show) {
    this.show = show;
};

/**
 *  | A `Functor` is a type constructor which supports a mapping operation `(<$>)`.
 *  |
 *  | `(<$>)` can be used to turn functions `a -> b` into functions `f a -> f b` whose argument and return
 *  | types use the type constructor `f` to represent some computational context.
 *  |
 *  | `Functor` instances should satisfy the following laws:
 *  |
 *  | - Identity: `(<$>) id = id`
 *  | - Composition: `(<$>) (f <<< g) = (f <$>) <<< (g <$>)`
 *  |
 */
var Functor = function ($less$dollar$greater) {
    this["<$>"] = $less$dollar$greater;
};

/**
 *  | The `Apply` class provides the `(<*>)` which is used to apply a function to an argument under a type constructor.
 *  |
 *  | `Apply` can be used to lift functions of two or more arguments to work on values wrapped with the type constructor `f`.
 *  | It might also be understood in terms of the `lift2` function:
 *  |
 *  | ```purescript
 *  | lift2 :: forall f a b c. (Apply f) => (a -> b -> c) -> f a -> f b -> f c
 *  | lift2 f a b = f <$> a <*> b
 *  | ```
 *  |
 *  | `(<*>)` is recovered from `lift2` as `lift2 ($)`. That is, `(<*>)` lifts the function application operator `($)` to arguments
 *  | wrapped with the type constructor `f`.
 *  |
 *  | `Apply` instances should satisfy the following law:
 *  |
 *  | - Associative Composition: `(<<<) <$> f <*> g <*> h = f <*> (g <*> h)`
 *  |
 *  | Formally, `Apply` represents a strong lax semi-monoidal endofunctor.
 */
var Apply = function ($less$times$greater, __superclass_Prelude$dotFunctor_0) {
    this["<*>"] = $less$times$greater;
    this["__superclass_Prelude.Functor_0"] = __superclass_Prelude$dotFunctor_0;
};

/**
 *  | The `Applicative` type class extends the [`Apply`](#apply) type class with a `pure` function, which can be used to
 *  | create values of type `f a` from values of type `a`.
 *  |
 *  | Where [`Apply`](#apply) provides the ability to lift functions of two or more arguments to functions whose arguments are wrapped using `f`,
 *  | and [`Functor`](#functor) provides the ability to lift functions of one argument, `pure` can be seen as the function which lifts functions of
 *  | _zero_ arguments. That is, `Applicative` functors support a lifting operation for any number of function arguments.
 *  |
 *  | `Applicative` instances should satisfy the following laws:
 *  |
 *  | - Identity: `(pure id) <*> v = v`
 *  | - Composition: `(pure <<<) <*> f <*> g <*> h = f <*> (g <*> h)`
 *  | - Homomorphism: `(pure f) <*> (pure x) = pure (f x)`
 *  | - Interchange: `u <*> (pure y) = (pure ($ y)) <*> u`
 *  |
 */
var Applicative = function (__superclass_Prelude$dotApply_0, pure) {
    this["__superclass_Prelude.Apply_0"] = __superclass_Prelude$dotApply_0;
    this.pure = pure;
};

/**
 *  | The `Bind` type class extends the [`Apply`](#apply) type class with a "bind" operation `(>>=)` which composes computations
 *  | in sequence, using the return value of one computation to determine the next computation.
 *  |
 *  | The `>>=` operator can also be expressed using `do` notation, as follows:
 *  |
 *  | ```purescript
 *  | x >>= f = do y <- x
 *  |              f y
 *  | ```
 *  |
 *  | where the function argument of `f` is given the name `y`.
 *  |
 *  | `Bind` instances should satisfy the following law:
 *  |
 *  | - Associativity: `(x >>= f) >>= g = x >>= (\k => f k >>= g)`
 *  |
 *  | Or, expressed using `do` notation:
 *  |
 *  | - Associativity: `do { z <- do { y <- x ; f y } ; g z } = do { k <- x ; do { y <- f k ; g y } }`
 *  |
 *  | Associativity tells us that we can regroup operations which use do-notation, so that we can unambiguously write, for example:
 *  |
 *  | ```purescript
 *  | do x <- m1
 *  |    y <- m2 x
 *  |    m3 x y
 *  | ```
 */
var Bind = function ($greater$greater$eq, __superclass_Prelude$dotApply_0) {
    this[">>="] = $greater$greater$eq;
    this["__superclass_Prelude.Apply_0"] = __superclass_Prelude$dotApply_0;
};

/**
 *  | The `Monad` type class combines the operations of the `Bind` and `Applicative` type classes. Therefore, `Monad` instances
 *  | represent type constructors which support sequential composition, and also lifting of functions of arbitrary arity.
 *  |
 *  | `Monad` instances should satisfy the following laws:
 *  |
 *  | - Left Identity: `pure x >>= f = f x`
 *  | - Right Identity: `x >>= pure = x`
 *  |
 *  | Or, expressed using `do` notation:
 *  |
 *  | - Left Identity: `do { y <- pure x ; f y } = f x`
 *  | - Right Identity: `do { y <- x ; pure y } = x`
 *  |
 */
var Monad = function (__superclass_Prelude$dotApplicative_0, __superclass_Prelude$dotBind_1) {
    this["__superclass_Prelude.Applicative_0"] = __superclass_Prelude$dotApplicative_0;
    this["__superclass_Prelude.Bind_1"] = __superclass_Prelude$dotBind_1;
};

/**
 *  | Addition and multiplication, satisfying the following laws:
 *  |
 *  | - `a` is a commutative monoid under addition
 *  | - `a` is a monoid under multiplication
 *  | - multiplication distributes over addition
 *  | - multiplication by `zero` annihilates `a`
 *  |
 */
var Semiring = function ($times, $plus, one, zero) {
    this["*"] = $times;
    this["+"] = $plus;
    this.one = one;
    this.zero = zero;
};

/**
 *  | Addition, multiplication, modulo operation and division, satisfying:
 *  |
 *  | - ```a / b * b + (a `mod` b) = a```
 *  |
 */
var ModuloSemiring = function ($div, __superclass_Prelude$dotSemiring_0, mod) {
    this["/"] = $div;
    this["__superclass_Prelude.Semiring_0"] = __superclass_Prelude$dotSemiring_0;
    this.mod = mod;
};

/**
 *  | Addition, multiplication, and subtraction.
 *  |
 *  | Has the same laws as `Semiring` but additionally satisfying:
 *  |
 *  | - `a` is an abelian group under addition
 *  |
 */
var Ring = function ($minus, __superclass_Prelude$dotSemiring_0) {
    this["-"] = $minus;
    this["__superclass_Prelude.Semiring_0"] = __superclass_Prelude$dotSemiring_0;
};

/**
 *  | Ring where every nonzero element has a multiplicative inverse so that:
 *  |
 *  | - ```a `mod` b = zero```
 *  |
 */
var DivisionRing = function (__superclass_Prelude$dotModuloSemiring_1, __superclass_Prelude$dotRing_0) {
    this["__superclass_Prelude.ModuloSemiring_1"] = __superclass_Prelude$dotModuloSemiring_1;
    this["__superclass_Prelude.Ring_0"] = __superclass_Prelude$dotRing_0;
};

/**
 *  | A commutative field
 */
var Num = function (__superclass_Prelude$dotDivisionRing_0) {
    this["__superclass_Prelude.DivisionRing_0"] = __superclass_Prelude$dotDivisionRing_0;
};

/**
 *  | The `Eq` type class represents types which support decidable equality.
 *  |
 *  | `Eq` instances should satisfy the following laws:
 *  |
 *  | - Reflexivity: `x == x = true`
 *  | - Symmetry: `x == y = y == x`
 *  | - Transitivity: if `x == y` and `y == z` then `x == z`
 *  | - Negation: `x /= y = not (x == y)`
 *  |
 *  | `(/=)` may be implemented in terms of `(==)`, but it might give a performance improvement to implement it separately.
 */
var Eq = function ($div$eq, $eq$eq) {
    this["/="] = $div$eq;
    this["=="] = $eq$eq;
};

/**
 *  | The `Ord` type class represents types which support comparisons.
 *  |
 *  | `Ord` instances should satisfy the laws of _partially orderings_:
 *  |
 *  | - Reflexivity: `a <= a`
 *  | - Antisymmetry: if `a <= b` and `b <= a` then `a = b`
 *  | - Transitivity: if `a <= b` and `b <= c` then `a <= c`
 *  |
 */
var Ord = function (__superclass_Prelude$dotEq_0, compare) {
    this["__superclass_Prelude.Eq_0"] = __superclass_Prelude$dotEq_0;
    this.compare = compare;
};

/**
 *  | The `Bits` type class identifies types which support bitwise operations.
 */
var Bits = function ($dot$amp$dot, $dot$up$dot, $dot$bar$dot, complement, shl, shr, zshr) {
    this[".&."] = $dot$amp$dot;
    this[".^."] = $dot$up$dot;
    this[".|."] = $dot$bar$dot;
    this.complement = complement;
    this.shl = shl;
    this.shr = shr;
    this.zshr = zshr;
};

/**
 *  | The `BoolLike` type class identifies types which support Boolean operations.
 *  |
 *  | `BoolLike` instances are required to satisfy the laws of a _Boolean algebra_.
 *  |
 */
var BoolLike = function ($amp$amp, not, $bar$bar) {
    this["&&"] = $amp$amp;
    this.not = not;
    this["||"] = $bar$bar;
};

/**
 *  | The `Semigroup` type class identifies an associative operation on a type.
 *  |
 *  | `Semigroup` instances are required to satisfy the following law:
 *  |
 *  | - Associativity: `(x <> y) <> z = x <> (y <> z)`
 *  |
 *  | For example, the `String` type is an instance of `Semigroup`, where `(<>)` is defined to be string concatenation.
 */
var Semigroup = function ($less$greater) {
    this["<>"] = $less$greater;
};

/**
 *  | The `BoolLike` type class identifies types which support Boolean operations.
 *  |
 *  | `BoolLike` instances are required to satisfy the laws of a _Boolean algebra_.
 *  |
 */
var $bar$bar = function (dict) {
    return dict["||"];
};

/**
 *  | The `Bind` type class extends the [`Apply`](#apply) type class with a "bind" operation `(>>=)` which composes computations
 *  | in sequence, using the return value of one computation to determine the next computation.
 *  |
 *  | The `>>=` operator can also be expressed using `do` notation, as follows:
 *  |
 *  | ```purescript
 *  | x >>= f = do y <- x
 *  |              f y
 *  | ```
 *  |
 *  | where the function argument of `f` is given the name `y`.
 *  |
 *  | `Bind` instances should satisfy the following law:
 *  |
 *  | - Associativity: `(x >>= f) >>= g = x >>= (\k => f k >>= g)`
 *  |
 *  | Or, expressed using `do` notation:
 *  |
 *  | - Associativity: `do { z <- do { y <- x ; f y } ; g z } = do { k <- x ; do { y <- f k ; g y } }`
 *  |
 *  | Associativity tells us that we can regroup operations which use do-notation, so that we can unambiguously write, for example:
 *  |
 *  | ```purescript
 *  | do x <- m1
 *  |    y <- m2 x
 *  |    m3 x y
 *  | ```
 */
var $greater$greater$eq = function (dict) {
    return dict[">>="];
};

/**
 *  | The `Eq` type class represents types which support decidable equality.
 *  |
 *  | `Eq` instances should satisfy the following laws:
 *  |
 *  | - Reflexivity: `x == x = true`
 *  | - Symmetry: `x == y = y == x`
 *  | - Transitivity: if `x == y` and `y == z` then `x == z`
 *  | - Negation: `x /= y = not (x == y)`
 *  |
 *  | `(/=)` may be implemented in terms of `(==)`, but it might give a performance improvement to implement it separately.
 */
var $eq$eq = function (dict) {
    return dict["=="];
};

/**
 *  | The `Semigroup` type class identifies an associative operation on a type.
 *  |
 *  | `Semigroup` instances are required to satisfy the following law:
 *  |
 *  | - Associativity: `(x <> y) <> z = x <> (y <> z)`
 *  |
 *  | For example, the `String` type is an instance of `Semigroup`, where `(<>)` is defined to be string concatenation.
 */
var $less$greater = function (dict) {
    return dict["<>"];
};

/**
 *  | A `Semigroupoid` is similar to a [`Category`](#category) but does not require an identity
 *  | element `id`, just composable morphisms.
 *  |
 *  | `Semigroupoid`s should obey the following rule:
 *  |
 *  | - Associativity: `p <<< (q <<< r) = (p <<< q) <<< r`
 *  |
 *  | One example of a `Semigroupoid` is the function type constructor `(->)`, with `(<<<)` defined
 *  | as function composition.
 */
var $less$less$less = function (dict) {
    return dict["<<<"];
};

/**
 *  | Forwards composition, or `(<<<)` with its arguments reversed.
 */
var $greater$greater$greater = function (__dict_Semigroupoid_0) {
    return function (f) {
        return function (g) {
            return $less$less$less(__dict_Semigroupoid_0)(g)(f);
        };
    };
};

/**
 *  | The `Apply` class provides the `(<*>)` which is used to apply a function to an argument under a type constructor.
 *  |
 *  | `Apply` can be used to lift functions of two or more arguments to work on values wrapped with the type constructor `f`.
 *  | It might also be understood in terms of the `lift2` function:
 *  |
 *  | ```purescript
 *  | lift2 :: forall f a b c. (Apply f) => (a -> b -> c) -> f a -> f b -> f c
 *  | lift2 f a b = f <$> a <*> b
 *  | ```
 *  |
 *  | `(<*>)` is recovered from `lift2` as `lift2 ($)`. That is, `(<*>)` lifts the function application operator `($)` to arguments
 *  | wrapped with the type constructor `f`.
 *  |
 *  | `Apply` instances should satisfy the following law:
 *  |
 *  | - Associative Composition: `(<<<) <$> f <*> g <*> h = f <*> (g <*> h)`
 *  |
 *  | Formally, `Apply` represents a strong lax semi-monoidal endofunctor.
 */
var $less$times$greater = function (dict) {
    return dict["<*>"];
};

/**
 *  | A `Functor` is a type constructor which supports a mapping operation `(<$>)`.
 *  |
 *  | `(<$>)` can be used to turn functions `a -> b` into functions `f a -> f b` whose argument and return
 *  | types use the type constructor `f` to represent some computational context.
 *  |
 *  | `Functor` instances should satisfy the following laws:
 *  |
 *  | - Identity: `(<$>) id = id`
 *  | - Composition: `(<$>) (f <<< g) = (f <$>) <<< (g <$>)`
 *  |
 */
var $less$dollar$greater = function (dict) {
    return dict["<$>"];
};

/**
 *  | `(<#>)` is `(<$>)` with its arguments reversed. For example:
 *  |
 *  | ```purescript
 *  | [1, 2, 3] <#> \n -> n * n
 *  | ```
 */
var $less$hash$greater = function (__dict_Functor_1) {
    return function (fa) {
        return function (f) {
            return $less$dollar$greater(__dict_Functor_1)(f)(fa);
        };
    };
};

/**
 *  | An infix alias for `cons`.
 *  |
 *  | Note, the running time of this function is `O(n)`.
 */
var $colon = cons;

/**
 *  | The `Eq` type class represents types which support decidable equality.
 *  |
 *  | `Eq` instances should satisfy the following laws:
 *  |
 *  | - Reflexivity: `x == x = true`
 *  | - Symmetry: `x == y = y == x`
 *  | - Transitivity: if `x == y` and `y == z` then `x == z`
 *  | - Negation: `x /= y = not (x == y)`
 *  |
 *  | `(/=)` may be implemented in terms of `(==)`, but it might give a performance improvement to implement it separately.
 */
var $div$eq = function (dict) {
    return dict["/="];
};

/**
 *  | Addition, multiplication, modulo operation and division, satisfying:
 *  |
 *  | - ```a / b * b + (a `mod` b) = a```
 *  |
 */
var $div = function (dict) {
    return dict["/"];
};

/**
 *  | The `Bits` type class identifies types which support bitwise operations.
 */
var $dot$bar$dot = function (dict) {
    return dict[".|."];
};

/**
 *  | The `Bits` type class identifies types which support bitwise operations.
 */
var $dot$up$dot = function (dict) {
    return dict[".^."];
};

/**
 *  | The `Bits` type class identifies types which support bitwise operations.
 */
var $dot$amp$dot = function (dict) {
    return dict[".&."];
};

/**
 *  | Addition, multiplication, and subtraction.
 *  |
 *  | Has the same laws as `Semiring` but additionally satisfying:
 *  |
 *  | - `a` is an abelian group under addition
 *  |
 */
var $minus = function (dict) {
    return dict["-"];
};

/**
 *  | `(++)` is an alias for `(<>)`.
 */
var $plus$plus = function (__dict_Semigroup_2) {
    return $less$greater(__dict_Semigroup_2);
};

/**
 *  | Addition and multiplication, satisfying the following laws:
 *  |
 *  | - `a` is a commutative monoid under addition
 *  | - `a` is a monoid under multiplication
 *  | - multiplication distributes over addition
 *  | - multiplication by `zero` annihilates `a`
 *  |
 */
var $plus = function (dict) {
    return dict["+"];
};

/**
 *  | Addition and multiplication, satisfying the following laws:
 *  |
 *  | - `a` is a commutative monoid under addition
 *  | - `a` is a monoid under multiplication
 *  | - multiplication distributes over addition
 *  | - multiplication by `zero` annihilates `a`
 *  |
 */
var $times = function (dict) {
    return dict["*"];
};

/**
 *  | The `BoolLike` type class identifies types which support Boolean operations.
 *  |
 *  | `BoolLike` instances are required to satisfy the laws of a _Boolean algebra_.
 *  |
 */
var $amp$amp = function (dict) {
    return dict["&&"];
};
var $percent = numMod;

/**
 *  | Applies a function to its argument
 *  |
 *  | ```purescript
 *  | length $ groupBy productCategory $ filter isInStock products
 *  | ```
 *  |
 *  | is equivalent to
 *  |
 *  | ```purescript
 *  | length (groupBy productCategory (filter isInStock (products)))
 *  | ```
 *  |
 *  | `($)` is different from [`(#)`](#-2) because it is right-infix instead of left, so
 *  | `a $ b $ c $ d x` = `a $ (b $ (c $ (d $ x)))` = `a (b (c (d x)))`
 *  |
 */
var $dollar = function (f) {
    return function (x) {
        return f(x);
    };
};

/**
 *  | Applies a function to its argument
 *  |
 *  | ```purescript
 *  | products # groupBy productCategory # filter isInStock # length
 *  | ```
 *  |
 *  | is equivalent to
 *  |
 *  | ```purescript
 *  | length (groupBy productCategory (filter isInStock (products)))
 *  | ```
 *  |
 *  | `(#)` is different from [`($)`](#-1) because it is left-infix instead of right, so
 *  | `x # a # b # c # d` = `(((x # a) # b) # c) # d` = `d (c (b (a x)))`
 *  |
 */
var $hash = function (x) {
    return function (f) {
        return f(x);
    };
};

/**
 *  | The `Bits` type class identifies types which support bitwise operations.
 */
var zshr = function (dict) {
    return dict.zshr;
};

/**
 *  | Addition and multiplication, satisfying the following laws:
 *  |
 *  | - `a` is a commutative monoid under addition
 *  | - `a` is a monoid under multiplication
 *  | - multiplication distributes over addition
 *  | - multiplication by `zero` annihilates `a`
 *  |
 */
var zero = function (dict) {
    return dict.zero;
};
var unsafeCompare = unsafeCompareImpl(LT.value)(EQ.value)(GT.value);

/**
 *  | `unit` is the sole inhabitant of the `Unit` type.
 */
var unit = {};

/**
 *  | The `Bits` type class identifies types which support bitwise operations.
 */
var shr = function (dict) {
    return dict.shr;
};
var showUnit = new Show(function (_43) {
    return "Unit {}";
});
var showString = new Show(showStringImpl);
var showOrdering = new Show(function (_53) {
    if (_53 instanceof LT) {
        return "LT";
    };
    if (_53 instanceof GT) {
        return "GT";
    };
    if (_53 instanceof EQ) {
        return "EQ";
    };
    throw new Error("Failed pattern match");
});
var showNumber = new Show(showNumberImpl);
var showBoolean = new Show(function (_44) {
    if (_44) {
        return "true";
    };
    if (!_44) {
        return "false";
    };
    throw new Error("Failed pattern match");
});

/**
 *  | The `Show` type class represents those types which can be converted into a human-readable `String` representation.
 *  |
 *  | While not required, it is recommended that for any expression `x`, the string `show x` be executable PureScript code
 *  | which evaluates to the same value as the expression `x`.
 */
var show = function (dict) {
    return dict.show;
};
var showArray = function (__dict_Show_3) {
    return new Show(showArrayImpl(show(__dict_Show_3)));
};

/**
 *  | The `Bits` type class identifies types which support bitwise operations.
 */
var shl = function (dict) {
    return dict.shl;
};
var semiringNumber = new Semiring(numMul, numAdd, 1, 0);
var semigroupoidArr = new Semigroupoid(function (f) {
    return function (g) {
        return function (x) {
            return f(g(x));
        };
    };
});
var semigroupUnit = new Semigroup(function (_61) {
    return function (_62) {
        return {};
    };
});
var semigroupString = new Semigroup(concatString);
var semigroupOrdering = new Semigroup(function (_54) {
    return function (y) {
        if (_54 instanceof LT) {
            return LT.value;
        };
        if (_54 instanceof GT) {
            return GT.value;
        };
        if (_54 instanceof EQ) {
            return y;
        };
        throw new Error("Failed pattern match");
    };
});
var semigroupArr = function (__dict_Semigroup_4) {
    return new Semigroup(function (f) {
        return function (g) {
            return function (x) {
                return $less$greater(__dict_Semigroup_4)(f(x))(g(x));
            };
        };
    });
};
var ringNumber = new Ring(numSub, function () {
    return semiringNumber;
});

/**
 *  | The `Applicative` type class extends the [`Apply`](#apply) type class with a `pure` function, which can be used to
 *  | create values of type `f a` from values of type `a`.
 *  |
 *  | Where [`Apply`](#apply) provides the ability to lift functions of two or more arguments to functions whose arguments are wrapped using `f`,
 *  | and [`Functor`](#functor) provides the ability to lift functions of one argument, `pure` can be seen as the function which lifts functions of
 *  | _zero_ arguments. That is, `Applicative` functors support a lifting operation for any number of function arguments.
 *  |
 *  | `Applicative` instances should satisfy the following laws:
 *  |
 *  | - Identity: `(pure id) <*> v = v`
 *  | - Composition: `(pure <<<) <*> f <*> g <*> h = f <*> (g <*> h)`
 *  | - Homomorphism: `(pure f) <*> (pure x) = pure (f x)`
 *  | - Interchange: `u <*> (pure y) = (pure ($ y)) <*> u`
 *  |
 */
var pure = function (dict) {
    return dict.pure;
};

/**
 *  | `return` is an alias for `pure`.
 */
var $$return = function (__dict_Monad_5) {
    return pure(__dict_Monad_5["__superclass_Prelude.Applicative_0"]());
};

/**
 *  | An alias for `true`, which can be useful in guard clauses:
 *  |
 *  | ```purescript
 *  | max x y | x >= y = x
 *  |         | otherwise = y
 *  | ```
 *  |
 */
var otherwise = true;

/**
 *  | Addition and multiplication, satisfying the following laws:
 *  |
 *  | - `a` is a commutative monoid under addition
 *  | - `a` is a monoid under multiplication
 *  | - multiplication distributes over addition
 *  | - multiplication by `zero` annihilates `a`
 *  |
 */
var one = function (dict) {
    return dict.one;
};

/**
 *  | The `BoolLike` type class identifies types which support Boolean operations.
 *  |
 *  | `BoolLike` instances are required to satisfy the laws of a _Boolean algebra_.
 *  |
 */
var not = function (dict) {
    return dict.not;
};
var negate = function (__dict_Ring_6) {
    return function (a) {
        return $minus(__dict_Ring_6)(zero(__dict_Ring_6["__superclass_Prelude.Semiring_0"]()))(a);
    };
};
var moduloSemiringNumber = new ModuloSemiring(numDiv, function () {
    return semiringNumber;
}, function (_45) {
    return function (_46) {
        return 0;
    };
});

/**
 *  | Addition, multiplication, modulo operation and division, satisfying:
 *  |
 *  | - ```a / b * b + (a `mod` b) = a```
 *  |
 */
var mod = function (dict) {
    return dict.mod;
};

/**
 *  | `liftM1` provides a default implementation of `(<$>)` for any [`Monad`](#monad),
 *  | without using `(<$>)` as provided by the [`Functor`](#functor)-[`Monad`](#monad) superclass relationship.
 *  |
 *  | `liftM1` can therefore be used to write [`Functor`](#functor) instances as follows:
 *  |
 *  | ```purescript
 *  | instance functorF :: Functor F where
 *  |   (<$>) = liftM1
 *  | ```
 */
var liftM1 = function (__dict_Monad_7) {
    return function (f) {
        return function (a) {
            return $greater$greater$eq(__dict_Monad_7["__superclass_Prelude.Bind_1"]())(a)(function (_0) {
                return $$return(__dict_Monad_7)(f(_0));
            });
        };
    };
};

/**
 *  | `liftA1` provides a default implementation of `(<$>)` for any [`Applicative`](#applicative) functor,
 *  | without using `(<$>)` as provided by the [`Functor`](#functor)-[`Applicative`](#applicative) superclass relationship.
 *  |
 *  | `liftA1` can therefore be used to write [`Functor`](#functor) instances as follows:
 *  |
 *  | ```purescript
 *  | instance functorF :: Functor F where
 *  |   (<$>) = liftA1
 *  | ```
 */
var liftA1 = function (__dict_Applicative_8) {
    return function (f) {
        return function (a) {
            return $less$times$greater(__dict_Applicative_8["__superclass_Prelude.Apply_0"]())(pure(__dict_Applicative_8)(f))(a);
        };
    };
};

/**
 *  | `Category`s consist of objects and composable morphisms between them, and as such are
 *  | [`Semigroupoids`](#semigroupoid), but unlike `semigroupoids` must have an identity element.
 *  |
 *  | `Category`s should obey the following rules.
 *  |
 *  | - Left Identity: `id <<< p = p`
 *  | - Right Identity: `p <<< id = p`
 *  |
 */
var id = function (dict) {
    return dict.id;
};
var functorArr = new Functor($less$less$less(semigroupoidArr));

/**
 *  | Flips the order of the arguments to a function of two arguments.
 *  |
 *  | ```purescript
 *  | flip const 1 2 = const 2 1 = 2
 *  | ```
 *  |
 */
var flip = function (f) {
    return function (b) {
        return function (a) {
            return f(a)(b);
        };
    };
};
var eqUnit = new Eq(function (_49) {
    return function (_50) {
        return false;
    };
}, function (_47) {
    return function (_48) {
        return true;
    };
});
var ordUnit = new Ord(function () {
    return eqUnit;
}, function (_55) {
    return function (_56) {
        return EQ.value;
    };
});
var eqString = new Eq(refIneq, refEq);
var ordString = new Ord(function () {
    return eqString;
}, unsafeCompare);
var eqNumber = new Eq(refIneq, refEq);
var ordNumber = new Ord(function () {
    return eqNumber;
}, unsafeCompare);
var eqBoolean = new Eq(refIneq, refEq);
var ordBoolean = new Ord(function () {
    return eqBoolean;
}, function (_57) {
    return function (_58) {
        if (!_57 && !_58) {
            return EQ.value;
        };
        if (!_57 && _58) {
            return LT.value;
        };
        if (_57 && _58) {
            return EQ.value;
        };
        if (_57 && !_58) {
            return GT.value;
        };
        throw new Error("Failed pattern match");
    };
});
var divisionRingNumber = new DivisionRing(function () {
    return moduloSemiringNumber;
}, function () {
    return ringNumber;
});
var numNumber = new Num(function () {
    return divisionRingNumber;
});

/**
 *  | Returns its first argument and ignores its second.
 *  |
 *  | ```purescript
 *  | const 1 "hello" = 1
 *  | ```
 *  |
 */
var $$const = function (a) {
    return function (_41) {
        return a;
    };
};

/**
 *  | The `void` function is used to ignore the type wrapped by a [`Functor`](#functor), replacing it with `Unit` and
 *  | keeping only the type information provided by the type constructor itself.
 *  |
 *  | `void` is often useful when using `do` notation to change the return type of a monadic computation:
 *  |
 *  | ```purescript
 *  | main = forE 1 10 \n -> void do
 *  |   print n
 *  |   print (n * n)
 *  | ```
 */
var $$void = function (__dict_Functor_10) {
    return function (fa) {
        return $less$dollar$greater(__dict_Functor_10)($$const(unit))(fa);
    };
};

/**
 *  | The `Bits` type class identifies types which support bitwise operations.
 */
var complement = function (dict) {
    return dict.complement;
};

/**
 *  | The `Ord` type class represents types which support comparisons.
 *  |
 *  | `Ord` instances should satisfy the laws of _partially orderings_:
 *  |
 *  | - Reflexivity: `a <= a`
 *  | - Antisymmetry: if `a <= b` and `b <= a` then `a = b`
 *  | - Transitivity: if `a <= b` and `b <= c` then `a <= c`
 *  |
 */
var compare = function (dict) {
    return dict.compare;
};

/**
 *  | Test whether one value is _strictly less than_ another.
 */
var $less = function (__dict_Ord_12) {
    return function (a1) {
        return function (a2) {
            var _414 = compare(__dict_Ord_12)(a1)(a2);
            if (_414 instanceof LT) {
                return true;
            };
            return false;
        };
    };
};

/**
 *  | Test whether one value is _non-strictly less than_ another.
 */
var $less$eq = function (__dict_Ord_13) {
    return function (a1) {
        return function (a2) {
            var _415 = compare(__dict_Ord_13)(a1)(a2);
            if (_415 instanceof GT) {
                return false;
            };
            return true;
        };
    };
};

/**
 *  | Test whether one value is _strictly greater than_ another.
 */
var $greater = function (__dict_Ord_14) {
    return function (a1) {
        return function (a2) {
            var _416 = compare(__dict_Ord_14)(a1)(a2);
            if (_416 instanceof GT) {
                return true;
            };
            return false;
        };
    };
};

/**
 *  | Test whether one value is _non-strictly greater than_ another.
 */
var $greater$eq = function (__dict_Ord_15) {
    return function (a1) {
        return function (a2) {
            var _417 = compare(__dict_Ord_15)(a1)(a2);
            if (_417 instanceof LT) {
                return false;
            };
            return true;
        };
    };
};
var categoryArr = new Category(function () {
    return semigroupoidArr;
}, function (x) {
    return x;
});
var boolLikeBoolean = new BoolLike(boolAnd, boolNot, boolOr);
var eqArray = function (__dict_Eq_9) {
    return new Eq(function (xs) {
        return function (ys) {
            return not(boolLikeBoolean)($eq$eq(eqArray(__dict_Eq_9))(xs)(ys));
        };
    }, function (xs) {
        return function (ys) {
            return eqArrayImpl($eq$eq(__dict_Eq_9))(xs)(ys);
        };
    });
};
var ordArray = function (__dict_Ord_11) {
    return new Ord(function () {
        return eqArray(__dict_Ord_11["__superclass_Prelude.Eq_0"]());
    }, function (_59) {
        return function (_60) {
            if (_59.length === 0 && _60.length === 0) {
                return EQ.value;
            };
            if (_59.length === 0) {
                return LT.value;
            };
            if (_60.length === 0) {
                return GT.value;
            };
            if (_59.length >= 1) {
                var _424 = _59.slice(1);
                if (_60.length >= 1) {
                    var _422 = _60.slice(1);
                    var _420 = compare(__dict_Ord_11)(_59[0])(_60[0]);
                    if (_420 instanceof EQ) {
                        return compare(ordArray(__dict_Ord_11))(_424)(_422);
                    };
                    return _420;
                };
            };
            throw new Error("Failed pattern match");
        };
    });
};
var eqOrdering = new Eq(function (x) {
    return function (y) {
        return not(boolLikeBoolean)($eq$eq(eqOrdering)(x)(y));
    };
}, function (_51) {
    return function (_52) {
        if (_51 instanceof LT && _52 instanceof LT) {
            return true;
        };
        if (_51 instanceof GT && _52 instanceof GT) {
            return true;
        };
        if (_51 instanceof EQ && _52 instanceof EQ) {
            return true;
        };
        return false;
    };
});
var bitsNumber = new Bits(numAnd, numXor, numOr, numComplement, numShl, numShr, numZshr);

/**
 *  | This function returns its first argument, and can be used to assert type equalities.
 *  | This can be useful when types are otherwise ambiguous.
 *  |
 *  | ```purescript
 *  | main = print $ [] `asTypeOf` [0]
 *  | ```
 *  |
 *  | If instead, we had written `main = print []`, the type of the argument `[]` would have
 *  | been ambiguous, resulting in a compile-time error.
 */
var asTypeOf = function (x) {
    return function (_42) {
        return x;
    };
};
var applyArr = new Apply(function (f) {
    return function (g) {
        return function (x) {
            return f(x)(g(x));
        };
    };
}, function () {
    return functorArr;
});
var bindArr = new Bind(function (m) {
    return function (f) {
        return function (x) {
            return f(m(x))(x);
        };
    };
}, function () {
    return applyArr;
});
var applicativeArr = new Applicative(function () {
    return applyArr;
}, $$const);
var monadArr = new Monad(function () {
    return applicativeArr;
}, function () {
    return bindArr;
});

/**
 *  | `ap` provides a default implementation of `(<*>)` for any [`Monad`](#monad),
 *  | without using `(<*>)` as provided by the [`Apply`](#apply)-[`Monad`](#monad) superclass relationship.
 *  |
 *  | `ap` can therefore be used to write [`Apply`](#apply) instances as follows:
 *  |
 *  | ```purescript
 *  | instance applyF :: Apply F where
 *  |   (<*>) = ap
 *  | ```
 */
var ap = function (__dict_Monad_16) {
    return function (f) {
        return function (a) {
            return $greater$greater$eq(__dict_Monad_16["__superclass_Prelude.Bind_1"]())(f)(function (_2) {
                return $greater$greater$eq(__dict_Monad_16["__superclass_Prelude.Bind_1"]())(a)(function (_1) {
                    return $$return(__dict_Monad_16)(_2(_1));
                });
            });
        };
    };
};
module.exports = {
    Unit: Unit, 
    LT: LT, 
    GT: GT, 
    EQ: EQ, 
    Semigroup: Semigroup, 
    BoolLike: BoolLike, 
    Bits: Bits, 
    Ord: Ord, 
    Eq: Eq, 
    Num: Num, 
    DivisionRing: DivisionRing, 
    Ring: Ring, 
    ModuloSemiring: ModuloSemiring, 
    Semiring: Semiring, 
    Monad: Monad, 
    Bind: Bind, 
    Applicative: Applicative, 
    Apply: Apply, 
    Functor: Functor, 
    Show: Show, 
    Category: Category, 
    Semigroupoid: Semigroupoid, 
    unit: unit, 
    "++": $plus$plus, 
    "<>": $less$greater, 
    not: not, 
    "||": $bar$bar, 
    "&&": $amp$amp, 
    complement: complement, 
    zshr: zshr, 
    shr: shr, 
    shl: shl, 
    ".^.": $dot$up$dot, 
    ".|.": $dot$bar$dot, 
    ".&.": $dot$amp$dot, 
    ">=": $greater$eq, 
    "<=": $less$eq, 
    ">": $greater, 
    "<": $less, 
    compare: compare, 
    "/=": $div$eq, 
    "==": $eq$eq, 
    negate: negate, 
    "%": $percent, 
    "-": $minus, 
    mod: mod, 
    "/": $div, 
    one: one, 
    "*": $times, 
    zero: zero, 
    "+": $plus, 
    ap: ap, 
    liftM1: liftM1, 
    "return": $$return, 
    ">>=": $greater$greater$eq, 
    liftA1: liftA1, 
    pure: pure, 
    "<*>": $less$times$greater, 
    "void": $$void, 
    "<#>": $less$hash$greater, 
    "<$>": $less$dollar$greater, 
    show: show, 
    cons: cons, 
    ":": $colon, 
    "#": $hash, 
    "$": $dollar, 
    id: id, 
    ">>>": $greater$greater$greater, 
    "<<<": $less$less$less, 
    asTypeOf: asTypeOf, 
    "const": $$const, 
    flip: flip, 
    otherwise: otherwise, 
    semigroupoidArr: semigroupoidArr, 
    categoryArr: categoryArr, 
    showUnit: showUnit, 
    showString: showString, 
    showBoolean: showBoolean, 
    showNumber: showNumber, 
    showArray: showArray, 
    functorArr: functorArr, 
    applyArr: applyArr, 
    applicativeArr: applicativeArr, 
    bindArr: bindArr, 
    monadArr: monadArr, 
    semiringNumber: semiringNumber, 
    ringNumber: ringNumber, 
    moduloSemiringNumber: moduloSemiringNumber, 
    divisionRingNumber: divisionRingNumber, 
    numNumber: numNumber, 
    eqUnit: eqUnit, 
    eqString: eqString, 
    eqNumber: eqNumber, 
    eqBoolean: eqBoolean, 
    eqArray: eqArray, 
    eqOrdering: eqOrdering, 
    showOrdering: showOrdering, 
    semigroupOrdering: semigroupOrdering, 
    ordUnit: ordUnit, 
    ordBoolean: ordBoolean, 
    ordNumber: ordNumber, 
    ordString: ordString, 
    ordArray: ordArray, 
    bitsNumber: bitsNumber, 
    boolLikeBoolean: boolLikeBoolean, 
    semigroupUnit: semigroupUnit, 
    semigroupString: semigroupString, 
    semigroupArr: semigroupArr
};

},{}],64:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Prelude = require("Prelude");
var Data_Function = require("Data.Function");
var React_Types = require("React.Types");
function dom(el) {  return function(props) {    return function(children) {      return React.DOM[el].apply(this, [props].concat(children));    }  }};
function rawText(text) {  return text;};
var wbr = dom("wbr");
var video = dom("video");
var $$var = dom("var");
var ul = dom("ul");
var u = dom("u");
var tspan = dom("tspan");
var track = dom("track");
var tr = dom("tr");
var title = dom("title");
var time = dom("time");
var thead = dom("thead");
var th = dom("th");
var tfoot = dom("tfoot");
var textarea = dom("textarea");
var text = dom("text");
var td = dom("td");
var tbody = dom("tbody");
var table = dom("table");
var svg = dom("svg");
var sup = dom("sup");
var summary = dom("summary");
var sub = dom("sub");
var style = dom("style");
var strong = dom("strong");
var stop = dom("stop");
var span = dom("span");
var source = dom("source");
var small = dom("small");
var select = dom("select");
var section = dom("section");
var script = dom("script");
var samp = dom("samp");
var s = dom("s");
var ruby = dom("ruby");
var rt = dom("rt");
var rp = dom("rp");
var rect = dom("rect");
var radialGradient = dom("radialGradient");
var q = dom("q");
var progress = dom("progress");
var pre = dom("pre");
var polyline = dom("polyline");
var polygon = dom("polygon");
var pattern = dom("pattern");
var path = dom("path");
var param = dom("param");
var p = dom("p");
var output = dom("output");
var option = dom("option");
var optgroup = dom("optgroup");
var ol = dom("ol");
var object = dom("object");
var noscript = dom("noscript");
var nav = dom("nav");
var meter = dom("meter");
var meta = dom("meta");
var menuitem = dom("menuitem");
var menu = dom("menu");
var mask = dom("mask");
var mark = dom("mark");
var map = dom("map");
var main = dom("main");
var link = dom("link");
var linearGradient = dom("linearGradient");
var line = dom("line");
var li = dom("li");
var legend = dom("legend");
var label = dom("label");
var keygen = dom("keygen");
var kbd = dom("kbd");
var ins = dom("ins");
var input = dom("input");
var img = dom("img");
var iframe = dom("iframe");
var i = dom("i");
var html = dom("html");
var hr = dom("hr");
var header = dom("header");
var head = dom("head");
var h6 = dom("h6");
var h5 = dom("h5");
var h4 = dom("h4");
var h3 = dom("h3");
var h2 = dom("h2");
var h1 = dom("h1");
var g = dom("g");
var form = dom("form");
var footer = dom("footer");
var figure = dom("figure");
var figcaption = dom("figcaption");
var fieldset = dom("fieldset");
var embed = dom("embed");
var em = dom("em");
var ellipse = dom("ellipse");
var dt = dom("dt");
var dl = dom("dl");
var div = dom("div");
var dfn = dom("dfn");
var details = dom("details");
var del = dom("del");
var defs = dom("defs");
var dd = dom("dd");
var datalist = dom("datalist");
var dataDom = dom("data");
var colgroup = dom("colgroup");
var col = dom("col");
var code = dom("code");
var cite = dom("cite");
var circle = dom("circle");
var caption = dom("caption");
var canvas = dom("canvas");
var button = dom("button");
var br = dom("br");
var body = dom("body");
var blockquote = dom("blockquote");
var big = dom("big");
var bdo = dom("bdo");
var bdi = dom("bdi");
var base = dom("base");
var b = dom("b");
var audio = dom("audio");
var aside = dom("aside");
var article = dom("article");
var area = dom("area");
var address = dom("address");
var abbr = dom("abbr");
var a = dom("a");
module.exports = {
    wbr: wbr, 
    video: video, 
    "var": $$var, 
    ul: ul, 
    u: u, 
    tspan: tspan, 
    track: track, 
    tr: tr, 
    title: title, 
    time: time, 
    thead: thead, 
    th: th, 
    tfoot: tfoot, 
    textarea: textarea, 
    text: text, 
    td: td, 
    tbody: tbody, 
    table: table, 
    svg: svg, 
    sup: sup, 
    summary: summary, 
    sub: sub, 
    style: style, 
    strong: strong, 
    stop: stop, 
    span: span, 
    source: source, 
    small: small, 
    select: select, 
    section: section, 
    script: script, 
    samp: samp, 
    s: s, 
    ruby: ruby, 
    rt: rt, 
    rp: rp, 
    rect: rect, 
    radialGradient: radialGradient, 
    q: q, 
    progress: progress, 
    pre: pre, 
    polyline: polyline, 
    polygon: polygon, 
    pattern: pattern, 
    path: path, 
    param: param, 
    p: p, 
    output: output, 
    option: option, 
    optgroup: optgroup, 
    ol: ol, 
    object: object, 
    noscript: noscript, 
    nav: nav, 
    meter: meter, 
    meta: meta, 
    menuitem: menuitem, 
    menu: menu, 
    mask: mask, 
    mark: mark, 
    map: map, 
    main: main, 
    link: link, 
    linearGradient: linearGradient, 
    line: line, 
    li: li, 
    legend: legend, 
    label: label, 
    keygen: keygen, 
    kbd: kbd, 
    ins: ins, 
    input: input, 
    img: img, 
    iframe: iframe, 
    i: i, 
    html: html, 
    hr: hr, 
    header: header, 
    head: head, 
    h6: h6, 
    h5: h5, 
    h4: h4, 
    h3: h3, 
    h2: h2, 
    h1: h1, 
    g: g, 
    form: form, 
    footer: footer, 
    figure: figure, 
    figcaption: figcaption, 
    fieldset: fieldset, 
    embed: embed, 
    em: em, 
    ellipse: ellipse, 
    dt: dt, 
    dl: dl, 
    div: div, 
    dfn: dfn, 
    details: details, 
    del: del, 
    defs: defs, 
    dd: dd, 
    datalist: datalist, 
    dataDom: dataDom, 
    colgroup: colgroup, 
    col: col, 
    code: code, 
    cite: cite, 
    circle: circle, 
    caption: caption, 
    canvas: canvas, 
    button: button, 
    br: br, 
    body: body, 
    blockquote: blockquote, 
    big: big, 
    bdo: bdo, 
    bdi: bdi, 
    base: base, 
    b: b, 
    audio: audio, 
    aside: aside, 
    article: article, 
    area: area, 
    address: address, 
    abbr: abbr, 
    a: a, 
    rawText: rawText, 
    dom: dom
};

},{"Data.Function":39,"Prelude":63,"React.Types":65}],65:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Function = require("Data.Function");
var DOM = require("DOM");
module.exports = {};

},{"Control.Monad.Eff":10,"DOM":25,"Data.Function":39,"Prelude":63}],66:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Prelude = require("Prelude");
var Control_Monad_Eff = require("Control.Monad.Eff");
var DOM = require("DOM");
var React_Types = require("React.Types");
var spec = {};;
function coerceThis(that) {  return that;};
function createClass(psSpec) {  var spec = {};  for (var fun in psSpec) {    if (psSpec.hasOwnProperty(fun)) {      (function(f) {        if (typeof psSpec[f] === 'function') {          spec[f] = function() {            return psSpec[f].apply(this, [this].concat([].slice.call(arguments)))() ;          }        } else {          spec[f] = psSpec[f];        }      })(fun);    }  }  var Class = React.createClass(spec);  return function(props) {    return function(children) {      return Class(props, children);    }  }};
function renderComponent(component) {  return function(element) {    return function() {      return React.renderComponent(component, element);    }  }};
function eventHandler(that) {  return function(f) {    return function(e) {      return f(that)(e)();    }  }};
var renderComponentById = function (component) {
    return function (id) {
        return renderComponent(component)(document.getElementById(id));
    };
};
module.exports = {
    renderComponentById: renderComponentById, 
    eventHandler: eventHandler, 
    renderComponent: renderComponent, 
    createClass: createClass, 
    coerceThis: coerceThis, 
    spec: spec, 
    document: document
};

},{"Control.Monad.Eff":10,"DOM":25,"Prelude":63,"React.Types":65}],67:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
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
    return new Prelude.Show(function (_63) {
        if (_63 instanceof OnNext) {
            return "(OnNext " + (Prelude.show(__dict_Show_0)(_63.value0) + ")");
        };
        if (_63 instanceof OnError) {
            return "(OnError " + (Control_Monad_Eff_Exception.message(_63.value0) + ")");
        };
        if (_63 instanceof OnCompleted) {
            return "(OnCompleted)";
        };
        throw new Error("Failed pattern match");
    });
};
module.exports = {
    OnError: OnError, 
    OnNext: OnNext, 
    OnCompleted: OnCompleted, 
    showNotification: showNotification
};

},{"Control.Monad.Eff.Exception":9,"Prelude":63}],68:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
"use strict";
var Prelude = require("Prelude");
var Data_Function = require("Data.Function");
var Control_Alt = require("Control.Alt");
var Control_Plus = require("Control.Plus");
var Control_MonadPlus = require("Control.MonadPlus");
var Control_Monad_Eff_Exception = require("Control.Monad.Eff.Exception");
var Control_Monad_Error_Class = require("Control.Monad.Error.Class");
var Control_Alternative = require("Control.Alternative");
var Control_Monad_Eff = require("Control.Monad.Eff");
var DOM = require("DOM");
var Rx_Notification = require("Rx.Notification");

  function just(x) {
    var Rx = require('rx');
    return Rx.Observable.just(x);
  }
  ;

  function fromArray(xs) {
    var Rx = require('rx');
    return Rx.Observable.fromArray(xs);
  }
  ;

  var Rx = require('rx');
  var _empty = Rx.Observable.empty();
  ;

  function generate(initial) {
    return function (condition) {
      return function (step) {
        return function (selector) {
          var Rx = require('rx');
          return Rx.Observable.generate(initial, condition, step, selector);
        };
      };
    };
  }
  ;

  function subscribe$prime(ob) {
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
        }
      }
    }
  }
  ;

  function subscribe(ob) {
    return function(f) {
      return function() {
        return ob.subscribe(function(value) {
          f(value)();
        });
      };
    };
  }
  ;

  function subscribeOnCompleted(ob) {
    return function(f) {
      return function() {
        return ob.subscribeOnCompleted(function(value) {
          f(value)();
        });
      };
    };
  }
  ;

  function subscribeOnError(ob) {
    return function(f) {
      return function() {
        return ob.subscribeOnError(function(err) {
          f(err)();
        });
      };
    };
  }
  ;

  function merge(ob) {
    return function(other) {
      return ob.merge(other);
    };
  }
  ;

  function combineLatest(f) {
    return function(ob1) {
      return function(ob2) {
        return ob1.combineLatest(ob2, function (x, y) {
          return f(x)(y);
        });
      };
    };
  }
  ;

  function concat(x) {
    return function(y) {
      return x.concat(y);
    };
  };
  ;

  function take(n) {
    return function(ob) {
      return ob.take(n);
    };
  }
  ;

  function takeUntil(other) {
    return function(ob) {
      return ob.takeUntil(other);
    };
  }
  ;

  function map(f) {
    return function(ob) {
      return ob.map(f);
    };
  }
  ;

  function flatMap(ob) {
    return function(f) {
      return ob.flatMap(f);
    };
  }
  ;

  function flatMapLatest(ob) {
    return function(f) {
      return ob.flatMapLatest(f);
    };
  }
  ;

  function scan(f) {
    return function(seed) {
      return function(ob) {
        return ob.scan(seed, function(acc, value) {
          return f(value)(acc);
        });
      };
    };
  }
  ;

  function unwrap(ob) {
    return function() {
      return ob.map(function(eff) {
        return eff();
      });
    };
  }
  ;

  function runObservable(ob) {
    return function() {
      ob.subscribe(function(eff) {
        eff();
      });
    };
  }
  ;

  function switchLatest(ob) {
    return ob.switchLatest();
  }
  ;

  function debounce(ms) {
    return function(ob) {
      return ob.debounce(ms);
    };
  }
  ;

  function zip(f){
    return function(ob1){
      return function(ob2){
        return ob1.zip(ob2, function (x, y) {
          return f(x)(y);
        });
      };
    };
  }
  ;

  function range(begin) {
    return function (end) {
      var Rx = require('rx');
      return Rx.Observable.range(begin, end);
    };
  }
  ;

  function reduce(f){
    return function(seed){
      return function(ob){
        return ob.reduce(function (x, y) {
          return f(x)(y);
        }, seed);
      };
    };
  }
  ;

  function delay(ms){
    return function(ob){
      return ob.delay(ms);
    };
  }
  ;

  function _materialize(ob, onNext, onError, onCompleted) {
    return ob.materialize().map(function(x) {
      switch (x.kind) {
        case 'N': return onNext(x.value);
        case 'E': return onError(x.exception);
        case 'C': return onCompleted;
      }
    });
  }
  ;

  function dematerialize(ob) {
    return ob.map(function(a) {
      switch (a.constructor.name) {
        case "OnNext": return Rx.Notification.createOnNext(a.value0);
        case "OnError": return Rx.Notification.createOnError(a.value0);
        case "OnCompleted": return Rx.Notification.createOnCompleted();
      }
    }).dematerialize();
  }
  ;

  function distinct(ob){
    return ob.distinct();
  }
  ;

  function distinctUntilChanged(ob){
    return ob.distinctUntilChanged();
  }
  ;

  function filter(p){
    return function(ob){
      return ob.filter(p);
    };
  }
  ;

  function withLatestFrom(f) {
    return function (ob1) {
      return function (ob2) {
        return ob1.withLatestFrom(ob2, function(x, y) {
          return f(x)(y);
        })
      };
    };
  }
  ;

  function _throwError(e) {
    var Rx = require('rx');
    return Rx.Observable.throw(e)
  }
  ;

  function _catchError(ob, f) {
    return ob.catch(f);
  }
  ;
var semigroupObservable = new Prelude.Semigroup(concat);
var monadErrorObservable = new Control_Monad_Error_Class.MonadError(Data_Function.runFn2(_catchError), _throwError);
var materialize = function (ob) {
    return _materialize(ob, Rx_Notification.OnNext.create, Rx_Notification.OnError.create, Rx_Notification.OnCompleted.value);
};
var functorObservable = new Prelude.Functor(map);
var applyObservable = new Prelude.Apply(combineLatest(Prelude.id(Prelude.categoryArr)), function () {
    return functorObservable;
});
var observableBind = new Prelude.Bind(flatMap, function () {
    return applyObservable;
});
var applicativeObservable = new Prelude.Applicative(function () {
    return applyObservable;
}, just);
var monadObservable = new Prelude.Monad(function () {
    return applicativeObservable;
}, function () {
    return observableBind;
});
var altObservable = new Control_Alt.Alt(merge, function () {
    return functorObservable;
});
var plusObservable = new Control_Plus.Plus(function () {
    return altObservable;
}, _empty);
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
    withLatestFrom: withLatestFrom, 
    zip: zip, 
    unwrap: unwrap, 
    takeUntil: takeUntil, 
    take: take, 
    switchLatest: switchLatest, 
    subscribeOnError: subscribeOnError, 
    subscribeOnCompleted: subscribeOnCompleted, 
    subscribe: subscribe, 
    "subscribe'": subscribe$prime, 
    scan: scan, 
    runObservable: runObservable, 
    range: range, 
    reduce: reduce, 
    merge: merge, 
    materialize: materialize, 
    generate: generate, 
    fromArray: fromArray, 
    flatMapLatest: flatMapLatest, 
    flatMap: flatMap, 
    filter: filter, 
    distinctUntilChanged: distinctUntilChanged, 
    distinct: distinct, 
    dematerialize: dematerialize, 
    delay: delay, 
    debounce: debounce, 
    concat: concat, 
    combineLatest: combineLatest, 
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
    monadErrorObservable: monadErrorObservable
};

},{"Control.Alt":3,"Control.Alternative":4,"Control.Monad.Eff":10,"Control.Monad.Eff.Exception":9,"Control.Monad.Error.Class":11,"Control.MonadPlus":22,"Control.Plus":23,"DOM":25,"Data.Function":39,"Prelude":63,"Rx.Notification":67,"rx":2}],69:[function(require,module,exports){
// Generated by psc-make version 0.6.9.3
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
var showRunStatus = new Prelude.Show(function (_19) {
    if (_19 instanceof Running) {
        return "Running";
    };
    if (_19 instanceof Paused) {
        return "Paused";
    };
    throw new Error("Failed pattern match");
});
var showCell = new Prelude.Show(function (_18) {
    if (_18 instanceof Alive) {
        return "Alive";
    };
    if (_18 instanceof Dead) {
        return "Dead";
    };
    throw new Error("Failed pattern match");
});
var showState = new Prelude.Show(function (_14) {
    return "State { cells: " + (Prelude.show(Prelude.showArray(Prelude.showArray(Prelude.showArray(showCell))))(_14.value0.cells) + (", runningState: " + (Prelude.show(showRunStatus)(_14.value0.runningState) + (", current: " + (Prelude.show(Data_Maybe.showMaybe(Prelude.showNumber))(_14.value0.current) + (", startTime: " + (Prelude.show(Data_Date.showDate)(_14.value0.startTime) + (", genRatio:" + (Prelude.show(Prelude.showNumber)(_14.value0.genRatio) + (", genCounter: " + (Prelude.show(Prelude.showNumber)(_14.value0.genCounter) + (", secondsElapsed: " + (Prelude.show(Prelude.showNumber)(_14.value0.secondsElapsed) + "}")))))))))))));
});
var showAction = new Prelude.Show(function (_15) {
    if (_15 instanceof Point) {
        return "Point(" + (Prelude.show(Prelude.showNumber)(_15.value0) + (", " + (Prelude.show(Prelude.showNumber)(_15.value1) + ")")));
    };
    if (_15 instanceof NoPoint) {
        return "NoPoint(" + (Prelude.show(Prelude.showNumber)(_15.value0) + (", " + (Prelude.show(Prelude.showNumber)(_15.value1) + ")")));
    };
    if (_15 instanceof TogglePoint) {
        return "TogglePoint(" + (Prelude.show(Prelude.showNumber)(_15.value0) + (", " + (Prelude.show(Prelude.showNumber)(_15.value1) + ")")));
    };
    if (_15 instanceof Tick) {
        return "Tick";
    };
    if (_15 instanceof Play) {
        return "Play";
    };
    if (_15 instanceof Pause) {
        return "Pause";
    };
    if (_15 instanceof Toggle) {
        return "Toggle";
    };
    if (_15 instanceof Save) {
        return "Save";
    };
    if (_15 instanceof NewCells) {
        return "NewCells " + Prelude.show(Prelude.showArray(Prelude.showArray(showCell)))(_15.value0);
    };
    if (_15 instanceof Rewind) {
        return "Rewind " + Prelude.show(Prelude.showNumber)(_15.value0);
    };
    if (_15 instanceof FForward) {
        return "FForward " + Prelude.show(Prelude.showNumber)(_15.value0);
    };
    if (_15 instanceof Timer) {
        return "Timer";
    };
    throw new Error("Failed pattern match");
});
var eqRunStatus = new Prelude.Eq(function (a) {
    return function (b) {
        return !Prelude["=="](eqRunStatus)(a)(b);
    };
}, function (_20) {
    return function (_21) {
        if (_20 instanceof Running && _21 instanceof Running) {
            return true;
        };
        if (_20 instanceof Paused && _21 instanceof Paused) {
            return true;
        };
        return false;
    };
});
var eqCell = new Prelude.Eq(function (a) {
    return function (b) {
        return !Prelude["=="](eqCell)(a)(b);
    };
}, function (_16) {
    return function (_17) {
        if (_16 instanceof Alive && _17 instanceof Alive) {
            return true;
        };
        if (_16 instanceof Dead && _17 instanceof Dead) {
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
    State: State, 
    showState: showState, 
    showAction: showAction, 
    eqCell: eqCell, 
    showCell: showCell, 
    showRunStatus: showRunStatus, 
    eqRunStatus: eqRunStatus
};

},{"Data.Date":35,"Data.Maybe":42,"Prelude":63}],70:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Prelude = require("Prelude");
var Utils = require("Utils");
var Core = require("Core");
var $$Math = require("Math");
var Graphics_Canvas = require("Graphics.Canvas");
var Data_Function = require("Data.Function");
var Data_Traversable = require("Data.Traversable");
var Data_Array = require("Data.Array");
var Data_Tuple = require("Data.Tuple");
var Data = require("Data");
var Types = require("Types");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Control_Monad = require("Control.Monad");
var Control_Apply = require("Control.Apply");
var Data_Maybe = require("Data.Maybe");
var Debug_Trace = require("Debug.Trace");
var DOM = require("DOM");
var Rx_Observable = require("Rx.Observable");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
var Data_DOM_Simple_Window = require("Data.DOM.Simple.Window");
var Data_DOM_Simple_Events = require("Data.DOM.Simple.Events");
function fromUiEvent(el) {return function(ev) {return Rx.Observable.fromEvent(el, ev) } }
  ;
var white = "#ffffff";
var topOffset = 90;
var leftOffset = 0;
var gridColor = "#F8F8F8";
var getWidth = function (_30) {
    if (_30.length >= 1) {
        var _132 = _30.slice(1);
        return Data_Array.length(_30[0]);
    };
    throw new Error("Failed pattern match");
};
var getHeight = function (xs) {
    return Data_Array.length(xs);
};
var cellSize = 10;
var drawCell = function (color) {
    return function (ctx) {
        return function (x) {
            return function (y) {
                return function __do() {
                    Graphics_Canvas.save(ctx)();
                    Graphics_Canvas.setFillStyle(color)(ctx)();
                    Graphics_Canvas.fillPath(ctx)(Graphics_Canvas.rect(ctx)({
                        x: x * cellSize + 1 + leftOffset, 
                        y: y * cellSize + 1 + topOffset, 
                        w: cellSize - 1, 
                        h: cellSize - 1
                    }))();
                    Graphics_Canvas.restore(ctx)();
                    return Prelude.unit;
                };
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
                                Graphics_Canvas.setLineWidth(1)(ctx)();
                                Graphics_Canvas.setStrokeStyle(gridColor)(ctx)();
                                Graphics_Canvas.beginPath(ctx)();
                                Data_Traversable.sequence(Data_Traversable.traversableArray)(Control_Monad_Eff.applicativeEff)(Utils.map_(Data_Array[".."](0)(y))(function (y$prime) {
                                    return function __do() {
                                        Graphics_Canvas.moveTo(ctx)(minX)(y$prime * cellSize + topOffset)();
                                        return Graphics_Canvas.lineTo(ctx)(maxX)(y$prime * cellSize + topOffset)();
                                    };
                                }))();
                                Data_Traversable.sequence(Data_Traversable.traversableArray)(Control_Monad_Eff.applicativeEff)(Utils.map_(Data_Array[".."](0)(x))(function (x$prime) {
                                    return function __do() {
                                        Graphics_Canvas.moveTo(ctx)(x$prime * cellSize + leftOffset)(minY)();
                                        return Graphics_Canvas.lineTo(ctx)(x$prime * cellSize + leftOffset)(maxY)();
                                    };
                                }))();
                                Graphics_Canvas.stroke(ctx)();
                                Graphics_Canvas.restore(ctx)();
                                return Prelude.unit;
                            };
                        };
                    };
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
                        Graphics_Canvas.setLineWidth(1)(ctx)();
                        Graphics_Canvas.setStrokeStyle(borderColor)(ctx)();
                        Graphics_Canvas.beginPath(ctx)();
                        Graphics_Canvas.moveTo(ctx)(minX)(minY)();
                        Graphics_Canvas.lineTo(ctx)(maxX + cellSize)(minY)();
                        Graphics_Canvas.lineTo(ctx)(maxX + cellSize)(maxY)();
                        Graphics_Canvas.lineTo(ctx)(minX)(maxY)();
                        Graphics_Canvas.lineTo(ctx)(minX)(minY)();
                        Graphics_Canvas.stroke(ctx)();
                        Graphics_Canvas.restore(ctx)();
                        return Prelude.unit;
                    };
                };
            };
        };
    };
};
var cellColor = black;
var drawCells = function (ctx) {
    return function (cells) {
        return function __do() {
            Graphics_Canvas.save(ctx)();
            Data_Traversable["for"](Control_Monad_Eff.applicativeEff)(Data_Traversable.traversableArray)(Data_Tuple.zip(cells)(Data_Array[".."](0)(Data_Array.length(cells))))(function (_27) {
                return Data_Traversable["for"](Control_Monad_Eff.applicativeEff)(Data_Traversable.traversableArray)(Data_Tuple.zip(_27.value0)(Data_Array[".."](0)(Data_Array.length(_27.value0))))(function (_26) {
                    if (_26.value0 instanceof Types.Alive) {
                        return drawCell(cellColor)(ctx)(_26.value1)(_27.value1);
                    };
                    if (_26.value0 instanceof Types.Dead) {
                        return Prelude.pure(Control_Monad_Eff.applicativeEff)(Prelude.unit);
                    };
                    throw new Error("Failed pattern match");
                });
            })();
            Graphics_Canvas.restore(ctx)();
            return Prelude.unit;
        };
    };
};
var labelColor = black;
var drawLabels = function (ctx) {
    return function (_29) {
        var getCurrentGenerationLabel = function (x) {
            if (x instanceof Data_Maybe.Nothing) {
                return "Latest";
            };
            if (x instanceof Data_Maybe.Just) {
                return Prelude.show(Prelude.showNumber)(x.value0);
            };
            throw new Error("Failed pattern match");
        };
        return function __do() {
            Graphics_Canvas.save(ctx)();
            Graphics_Canvas.setFillStyle(labelColor)(ctx)();
            Graphics_Canvas.setFont("16px Source Code Pro")(ctx)();
            Graphics_Canvas.fillText(ctx)(Prelude.show(Types.showRunStatus)(_29.value0.runningState))(5)(20)();
            Graphics_Canvas.fillText(ctx)("Time elapsed, s: " + Prelude.show(Prelude.showNumber)(_29.value0.secondsElapsed))(5)(40)();
            Graphics_Canvas.fillText(ctx)("Gen/sec: " + Prelude.show(Prelude.showNumber)(_29.value0.genRatio))(350)(40)();
            Graphics_Canvas.fillText(ctx)("Current generation: " + getCurrentGenerationLabel(_29.value0.current))(5)(60)();
            Graphics_Canvas.fillText(ctx)("Total generations: " + Prelude.show(Prelude.showNumber)(Core.getTotalGenerations(_29)))(350)(60)();
            Graphics_Canvas.setFont("12px Source Code Pro")(ctx)();
            Graphics_Canvas.fillText(ctx)("Space - toggle play/pause, \u27f5\u27f6 - navigate generations.")(5)(80)();
            Graphics_Canvas.restore(ctx)();
            return Prelude.unit;
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
                            x: minX, 
                            y: minY, 
                            w: maxX, 
                            h: maxY
                        }))();
                        Graphics_Canvas.restore(ctx)();
                        return Prelude.unit;
                    };
                };
            };
        };
    };
};
var renderCanvas = function (canvas) {
    return function (_28) {
        var totalGenerations = Core.getTotalGenerations(_28);
        var currentGeneration = Core.getCurrentGeneration(_28);
        var height = getHeight(currentGeneration);
        var heightPx = height * cellSize;
        var maxY = heightPx + topOffset;
        var width = getWidth(currentGeneration);
        var widthPx = width * cellSize;
        var maxX = widthPx + leftOffset;
        return function __do() {
            var _5 = Graphics_Canvas.getContext2D(canvas)();
            drawBackground(_5)(0)(0)(maxX)(maxY)();
            drawGrid(_5)(width)(height)(leftOffset)(topOffset)(maxX)(maxY)();
            drawBorders(_5)(leftOffset)(topOffset)(maxX)(maxY)();
            drawCells(_5)(currentGeneration)();
            drawLabels(_5)(_28)();
            return Prelude.unit;
        };
    };
};
var setupUI = function (state) {
    return function (outputActionsStream) {
        return function (canvasId) {
            var pxToCell = function (fieldOffsetLeft) {
                return function (fieldOffsetTop) {
                    return function (_33) {
                        return new Data_Tuple.Tuple($$Math.floor((_33.value0 - fieldOffsetLeft) / cellSize), $$Math.floor((_33.value1 - fieldOffsetTop) / cellSize));
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
            var fieldHeight = height * cellSize;
            var width = getWidth(currentGeneration);
            var fieldWidth = width * cellSize;
            var coordsInField = function (fieldOffsetLeft) {
                return function (fieldOffsetTop) {
                    return function (_32) {
                        return _32.value0 > fieldOffsetLeft && (_32.value0 < fieldOffsetLeft + fieldWidth && (_32.value1 > fieldOffsetTop && _32.value1 < fieldOffsetTop + fieldHeight));
                    };
                };
            };
            return function __do() {
                Utils.displayBlock(canvasId)();
                var _4 = Graphics_Canvas.getCanvasElementById(canvasId)();
                if (_4 instanceof Data_Maybe.Just) {
                    var _3 = Utils.getElementOffsetTop("canvas")();
                    var _2 = Utils.getElementOffsetLeft("canvas")();
                    return (function () {
                        var rawClicksStream = fromUiEvent(_4.value0)("click");
                        var pxStream = Prelude["<$>"](Rx_Observable.functorObservable)(eventToCoords)(rawClicksStream);
                        var inputStateStream = Utils.newSubject();
                        var fieldOffsetTop = topOffset + _3;
                        var fieldOffsetLeft = leftOffset + _2;
                        var fieldStream = Rx_Observable.filter(coordsInField(fieldOffsetLeft)(fieldOffsetTop))(pxStream);
                        var cellsClicksStream = Prelude["<$>"](Rx_Observable.functorObservable)(pxToCell(fieldOffsetLeft)(fieldOffsetTop))(fieldStream);
                        return function __do() {
                            Rx_Observable.subscribe(cellsClicksStream)(postUpstream)();
                            Rx_Observable.subscribe(inputStateStream)(renderCanvas(_4.value0))();
                            return inputStateStream;
                        };
                    })()();
                };
                throw new Error("Failed pattern match");
            };
        };
    };
};
module.exports = {
    getHeight: getHeight, 
    getWidth: getWidth, 
    drawCell: drawCell, 
    drawCells: drawCells, 
    drawGrid: drawGrid, 
    drawBorders: drawBorders, 
    drawLabels: drawLabels, 
    drawBackground: drawBackground, 
    renderCanvas: renderCanvas, 
    setupUI: setupUI, 
    fromUiEvent: fromUiEvent, 
    labelColor: labelColor, 
    cellColor: cellColor, 
    gridColor: gridColor, 
    borderColor: borderColor, 
    bgColor: bgColor, 
    black: black, 
    white: white, 
    leftOffset: leftOffset, 
    topOffset: topOffset, 
    cellSize: cellSize
};

},{"Control.Apply":5,"Control.Monad":21,"Control.Monad.Eff":10,"Core":24,"DOM":25,"Data":55,"Data.Array":27,"Data.DOM.Simple.Events":30,"Data.DOM.Simple.Types":31,"Data.DOM.Simple.Window":34,"Data.Function":39,"Data.Maybe":42,"Data.Traversable":52,"Data.Tuple":53,"Debug.Trace":56,"Graphics.Canvas":58,"Math":61,"Prelude":63,"Rx.Observable":68,"Types":69,"Utils":73}],71:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Core = require("Core");
var Data_Foldable = require("Data.Foldable");
var Prelude = require("Prelude");
var Debug_Trace = require("Debug.Trace");
var Data_Function = require("Data.Function");
var Utils = require("Utils");
var Types = require("Types");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Array = require("Data.Array");
var Data_Tuple = require("Data.Tuple");
var Rx_Observable = require("Rx.Observable");
function exportGlobal(fname) {return function(f) {return function() {window[fname] = f; return {}; } } }
  ;
var setupUI = function (state) {
    return function (actionsStream) {
        return function (_38) {
            var printCells = function (state_2) {
                var toChar = function (_39) {
                    if (_39 instanceof Types.Alive) {
                        return "x";
                    };
                    if (_39 instanceof Types.Dead) {
                        return ".";
                    };
                    throw new Error("Failed pattern match");
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
                var currentGeneration = Core.getCurrentGeneration(state_2);
                var charCells = foldRows(currentGeneration);
                return Debug_Trace.trace(charCells);
            };
            var vStream = Utils.newSubject();
            return function __do() {
                exportGlobal("point")(function (x) {
                    return function (y) {
                        return Utils.onNext(actionsStream)(new Types.Point(x, y));
                    };
                })();
                exportGlobal("noPoint")(function (x) {
                    return function (y) {
                        return Utils.onNext(actionsStream)(new Types.NoPoint(x, y));
                    };
                })();
                exportGlobal("play")(function (_35) {
                    return function (_34) {
                        return Utils.onNext(actionsStream)(Types.Play.value);
                    };
                })();
                exportGlobal("pause")(function (_37) {
                    return function (_36) {
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
    exportGlobal: exportGlobal
};

},{"Control.Monad.Eff":10,"Core":24,"Data.Array":27,"Data.Foldable":38,"Data.Function":39,"Data.Tuple":53,"Debug.Trace":56,"Prelude":63,"Rx.Observable":68,"Types":69,"Utils":73}],72:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Prelude = require("Prelude");
var Utils = require("Utils");
var Data_Function = require("Data.Function");
var Core = require("Core");
var React_DOM = require("React.DOM");
var Data_Tuple = require("Data.Tuple");
var Data_Array = require("Data.Array");
var React = require("React");
var Data = require("Data");
var Types = require("Types");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Maybe = require("Data.Maybe");
var Debug_Trace = require("Debug.Trace");
var DOM = require("DOM");
var React_Types = require("React.Types");
var Rx_Observable = require("Rx.Observable");
var mainView = (function () {
    var render = function (actionsStream) {
        return function (_49) {
            var totalGenerations = Core.getTotalGenerations(_49);
            var currentGeneration = Core.getCurrentGeneration(_49);
            return Prelude.pure(Control_Monad_Eff.applicativeEff)(React_DOM.div({
                className: "map"
            })([ React_DOM.div({
                className: "toolbar"
            })([ (function () {
                if (_49.value0.runningState instanceof Types.Running) {
                    return React_DOM.button({
                        className: "icon-button", 
                        onClick: function (_40) {
                            return Utils.onNext(actionsStream)(Types.Pause.value);
                        }
                    })([ React_DOM.rawText("\u25ae\u25ae") ]);
                };
                if (_49.value0.runningState instanceof Types.Paused) {
                    return React_DOM.button({
                        className: "icon-button", 
                        onClick: function (_41) {
                            return Utils.onNext(actionsStream)(Types.Play.value);
                        }
                    })([ React_DOM.rawText("\u25b6") ]);
                };
                throw new Error("Failed pattern match");
            })(), React_DOM.button({
                onClick: function (_42) {
                    return Utils.onNext(actionsStream)(Types.Save.value);
                }
            })([ React_DOM.rawText("Save") ]), React_DOM.span({
                className: "label"
            })([ React_DOM.rawText("Time elapsed, s: " + Prelude.show(Prelude.showNumber)(_49.value0.secondsElapsed)) ]), React_DOM.span({
                className: "label"
            })([ React_DOM.rawText("Gen/sec: " + Prelude.show(Prelude.showNumber)(_49.value0.genRatio)) ]) ]), React_DOM.div({
                className: "toolbar"
            })([ React_DOM.button({
                className: "icon-button", 
                onClick: function (_43) {
                    return Utils.onNext(actionsStream)(new Types.Rewind(1));
                }
            })([ React_DOM.rawText("\u25c0\u25c0") ]), React_DOM.button({
                className: "icon-button", 
                onClick: function (_44) {
                    return Utils.onNext(actionsStream)(new Types.FForward(1));
                }
            })([ React_DOM.rawText("\u25b6\u25b6") ]), React_DOM.span({
                className: "label"
            })([ React_DOM.rawText("Current generation: " + (function () {
                if (_49.value0.current instanceof Data_Maybe.Nothing) {
                    return "Latest";
                };
                if (_49.value0.current instanceof Data_Maybe.Just) {
                    return Prelude.show(Prelude.showNumber)(_49.value0.current.value0);
                };
                throw new Error("Failed pattern match");
            })()) ]), React_DOM.span({
                className: "label"
            })([ React_DOM.rawText("Total generations: " + Prelude.show(Prelude.showNumber)(totalGenerations)) ]) ]), React_DOM.div({
                className: "toolbar"
            })([ React_DOM.span({
                style: {
                    fontSize: "80%"
                }
            })([ React_DOM.span({
                className: "button-like"
            })([ React_DOM.rawText("Space") ]), React_DOM.rawText(" - toggle play/pause, "), React_DOM.span({
                className: "button-like"
            })([ React_DOM.rawText("\u27f5") ]), React_DOM.span({
                className: "button-like"
            })([ React_DOM.rawText("\u27f6") ]), React_DOM.rawText(" - navigate generations. Or use buttons above.") ]) ]), React_DOM.table({
                style: {
                    border: "1px solid gray", 
                    "margin-top": "10px"
                }
            })([ React_DOM.tbody({})(Utils.map_(Data_Tuple.zip(currentGeneration)(Data_Array[".."](0)(Data_Array.length(currentGeneration))))(function (_48) {
                return React_DOM.tr({})(Utils.map_(Data_Tuple.zip(_48.value0)(Data_Array[".."](0)(Data_Array.length(_48.value0))))(function (_47) {
                    if (_47.value0 instanceof Types.Alive) {
                        return React_DOM.td({
                            className: "live", 
                            onClick: function (_45) {
                                return Utils.onNext(actionsStream)(new Types.NoPoint(_48.value1, _47.value1));
                            }
                        })([  ]);
                    };
                    if (_47.value0 instanceof Types.Dead) {
                        return React_DOM.td({
                            className: "dead", 
                            onClick: function (_46) {
                                return Utils.onNext(actionsStream)(new Types.Point(_48.value1, _47.value1));
                            }
                        })([  ]);
                    };
                    throw new Error("Failed pattern match");
                }));
            })) ]) ]));
        };
    };
    var renderFun = function ($$this) {
        return render($$this.props.actionsStream)($$this.props.state);
    };
    return React.createClass((function () {
        var _194 = {};
        for (var _195 in React.spec) {
            if (React.spec.hasOwnProperty(_195)) {
                _194[_195] = React.spec[_195];
            };
        };
        _194.displayName = "MainView";
        _194.render = renderFun;
        return _194;
    })());
})();
var renderMainView = function (targetId) {
    return function (state) {
        return function (actionsStream) {
            return React.renderComponentById(mainView({
                actionsStream: actionsStream, 
                state: state
            })([  ]))(targetId);
        };
    };
};
var setupUI = function (initialState) {
    return function (actionsStream) {
        return function (targetId) {
            return function __do() {
                Utils.displayBlock(targetId)();
                var _6 = renderMainView(targetId)(initialState)(actionsStream)();
                return (function () {
                    var vStream = Utils.newSubject();
                    return function __do() {
                        Rx_Observable.subscribe(vStream)(function (s) {
                            return Utils.setProps(_6)({
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
    renderMainView: renderMainView, 
    mainView: mainView, 
    setupUI: setupUI
};

},{"Control.Monad.Eff":10,"Core":24,"DOM":25,"Data":55,"Data.Array":27,"Data.Function":39,"Data.Maybe":42,"Data.Tuple":53,"Debug.Trace":56,"Prelude":63,"React":66,"React.DOM":64,"React.Types":65,"Rx.Observable":68,"Types":69,"Utils":73}],73:[function(require,module,exports){
// Generated by psc-make version 0.6.9.5
"use strict";
var Prelude = require("Prelude");
var Data_Array = require("Data.Array");
var Data_Tuple = require("Data.Tuple");
var Control_Monad_Eff = require("Control.Monad.Eff");
var Data_Function = require("Data.Function");
var Data_Maybe = require("Data.Maybe");
var DOM = require("DOM");
var React_Types = require("React.Types");
var Rx_Observable = require("Rx.Observable");
var Data_DOM_Simple_Types = require("Data.DOM.Simple.Types");
var Data_Date = require("Data.Date");
var Types = require("Types");
function timeDelta(a) { return function(b) { return b - a } }
    ;
function toFixed(x) { return function(n) { return +x.toFixed(n) } }
    ;
 var newSubject = function () { return new Rx.Subject() }
    ;
 function getIntervalStream(interval) { return Rx.Observable.interval(interval) }
    ;
 function onNext(obs){ return function(val) { return function () { return obs.onNext(val); } } }
    ;
 function pausable(obs){ return function (pauser) { return obs.pausable(pauser); } }
    ;
 function setProps(view) { return function(props) { return function(){ return view.setProps(props); } } }
    ;
function fromEvent(ev) { return function() {return Rx.Observable.fromEvent(document.body, ev)} }
  ;
function getElementOffsetLeft(el){ return function() { return document.getElementById(el).offsetLeft } }
    ;
function getElementOffsetTop(el){ return function() { return document.getElementById(el).offsetTop } }
    ;
function getParameterByName(name) {
         return function() {
           name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
           var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
               results = regex.exec(location.search);
           return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
         }
       }
    ;
function displayBlock(elid) {return function() {document.getElementById(elid).style.display = "block"} }
    ;

  function scan(f) {
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
  ;
var map_ = Prelude.flip(Data_Array.map);
var updateAt2 = function (y) {
    return function (x) {
        return function (newVal) {
            return function (arr) {
                return map_(Data_Tuple.zip(arr)(Data_Array[".."](0)(Data_Array.length(arr))))(function (_13) {
                    var _54 = _13.value1 === y;
                    if (_54) {
                        return map_(Data_Tuple.zip(_13.value0)(Data_Array[".."](0)(Data_Array.length(_13.value0))))(function (_12) {
                            var _56 = _12.value1 === x;
                            if (_56) {
                                return newVal;
                            };
                            if (!_56) {
                                return _12.value0;
                            };
                            throw new Error("Failed pattern match");
                        });
                    };
                    if (!_54) {
                        return _13.value0;
                    };
                    throw new Error("Failed pattern match");
                });
            };
        };
    };
};
var getByIndex2 = function (arr) {
    return function (x) {
        return function (y) {
            return Prelude[">>="](Data_Maybe.bindMaybe)(Prelude[">>="](Data_Maybe.bindMaybe)(Prelude["return"](Data_Maybe.monadMaybe)(arr))(Prelude.flip(Data_Array["!!"])(x)))(Prelude.flip(Data_Array["!!"])(y));
        };
    };
};
var filter_ = Prelude.flip(Data_Array.filter);
module.exports = {
    scan: scan, 
    displayBlock: displayBlock, 
    getParameterByName: getParameterByName, 
    getElementOffsetTop: getElementOffsetTop, 
    getElementOffsetLeft: getElementOffsetLeft, 
    fromEvent: fromEvent, 
    setProps: setProps, 
    pausable: pausable, 
    onNext: onNext, 
    getIntervalStream: getIntervalStream, 
    newSubject: newSubject, 
    toFixed: toFixed, 
    timeDelta: timeDelta, 
    getByIndex2: getByIndex2, 
    updateAt2: updateAt2, 
    filter_: filter_, 
    map_: map_
};

},{"Control.Monad.Eff":10,"DOM":25,"Data.Array":27,"Data.DOM.Simple.Types":31,"Data.Date":35,"Data.Function":39,"Data.Maybe":42,"Data.Tuple":53,"Prelude":63,"React.Types":65,"Rx.Observable":68,"Types":69}],74:[function(require,module,exports){
require('Main').main();

},{"Main":60}]},{},[74]);

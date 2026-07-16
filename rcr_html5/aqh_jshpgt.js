/// @description Ensures that get_timer uses a monotonic, high-resolution clock.
/// @returns 0 on failure, 1 when patched, or 2 when no patch is needed.
function jscallback_jshpgt(_marker, _get_timer_value) {
	if (jscallback_jshpgt._status !== undefined) {
		return jscallback_jshpgt._status;
	}

	var _global = (typeof globalThis !== "undefined") ? globalThis : window;

	function _report(_message, _is_error) {
		var _text = "[js_hiprec_get_timer] " + _message;

		if (typeof GMS_API !== "undefined" &&
			typeof GMS_API.debug_msg === "function") {
			GMS_API.debug_msg(_text);
			return;
		}

		if (!_global.console) {
			return;
		}

		var _logger = _is_error ? _global.console.error : _global.console.log;
		if (typeof _logger === "function") {
			_logger.call(_global.console, _text);
		}
	}

	var _performance = _global.performance;
	if (!_performance || typeof _performance.now !== "function") {
		_report("performance.now is unavailable; keeping the Runner timer.", true);
		return 0;
	}

	var _callback = _global.gml_Script_gmcallback_jshpgt;
	if (typeof _callback !== "function") {
		_report("The compiled initialization callback was not found.", true);
		return 0;
	}

	var _marker_number = Number(_marker);
	if (!isFinite(_marker_number) || Math.floor(_marker_number) !== _marker_number) {
		_report("The timer lookup marker is invalid.", true);
		return 0;
	}

	var _source;
	try {
		_source = Function.prototype.toString.call(_callback);
	} catch (_error) {
		_report("The compiled initialization callback could not be inspected.", true);
		return 0;
	}

	// Match the zero-argument timer call following the marker. This also handles
	// compiler-inserted wrappers such as yyGetReal(get_timer()).
	var _pattern = new RegExp(
		"(?:^|[^0-9])" + String(_marker_number) +
		"(?:\\.0+)?\\s*,\\s*" +
		"(?:(?:[A-Za-z_$][\\w$]*)\\s*\\(\\s*)*" +
		"([A-Za-z_$][\\w$]*)\\s*\\(\\s*\\)"
	);
	var _match = _pattern.exec(_source);

	if (!_match) {
		_report("The compiled get_timer symbol could not be located.", true);
		return 0;
	}

	var _timer_name = _match[1];
	var _timer = _global[_timer_name];
	if (typeof _timer !== "function") {
		_report("The located get_timer symbol is not callable.", true);
		return 0;
	}

	var _timer_source = Function.prototype.toString.call(_timer);
	var _already_high_resolution = /(?:^|[^\w$])(?:window\s*\.\s*)?performance\s*(?:\.\s*now|\[\s*["']now["']\s*\])/.test(_timer_source);

	jscallback_jshpgt._timer_name = _timer_name;

	if (_already_high_resolution) {
		jscallback_jshpgt._status = 2;
		_report("Runner get_timer already uses performance.now (" + _timer_name + ").", false);
		return 2;
	}

	jscallback_jshpgt._original = _timer;
	_global[_timer_name] = function() {
		return _performance.now.call(_performance) * 1000;
	};

	var _test_value = _global[_timer_name]();
	if (typeof _test_value !== "number" || !isFinite(_test_value)) {
		_global[_timer_name] = _timer;
		delete jscallback_jshpgt._original;
		delete jscallback_jshpgt._timer_name;
		_report("The high-resolution timer failed validation; the Runner timer was restored.", true);
		return 0;
	}

	jscallback_jshpgt._status = 1;
	_report("Installed the performance.now timer (" + _timer_name + ").", false);
	return 1;
}

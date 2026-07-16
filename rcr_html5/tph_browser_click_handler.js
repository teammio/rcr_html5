/// @description Installs the synchronous browser click bridge once.
function browser_click_handler_init_js() {
	if (browser_click_handler_init_js._installed) {
		return 0;
	}

	var _global = (typeof globalThis !== "undefined") ? globalThis : window;

	function _report_once(_property, _message) {
		if (browser_click_handler_init_js[_property]) return;
		browser_click_handler_init_js[_property] = true;

		var _text = "[browser_click_handler] " + _message;
		if (typeof GMS_API !== "undefined" &&
			typeof GMS_API.debug_msg === "function") {
			GMS_API.debug_msg(_text);
		} else if (_global.console && typeof _global.console.error === "function") {
			_global.console.error(_text);
		}
	}

	if (typeof _global.addEventListener !== "function") {
		_report_once("_listener_error", "window.addEventListener is unavailable.");
		return 0;
	}

	function _number_or(_value, _default) {
		return typeof _value === "number" && isFinite(_value) ? _value : _default;
	}

	var _listener = function(_event) {
		// Synthetic clicks do not carry browser user activation.
		if (_event && _event.isTrusted === false) return;

		var _callback = _global.gml_Script_gmcallback_browser_click_handler;
		if (typeof _callback !== "function") {
			_report_once("_callback_missing", "The compiled GML callback was not found.");
			return;
		}

		try {
			_callback(
				_event || _global,
				null,
				_number_or(_event && _event.clientX, 0),
				_number_or(_event && _event.clientY, 0),
				_number_or(_event && _event.button, 0),
				_number_or(_event && _event.buttons, 0),
				!!(_event && _event.ctrlKey),
				!!(_event && _event.altKey),
				!!(_event && _event.shiftKey),
				!!(_event && _event.metaKey),
				_number_or(_event && _event.detail, 0),
				_number_or(_event && _event.timeStamp, 0)
			);
		} catch (_error) {
			_report_once(
				"_callback_error",
				"The GML click handler failed. " +
				(_error && _error.message ? _error.message : "")
			);
		}
	};

	try {
		// Capture phase keeps the bridge working when page elements stop bubbling.
		_global.addEventListener("click", _listener, true);
	} catch (_error) {
		_report_once(
			"_listener_error",
			"The click listener could not be installed. " +
			(_error && _error.message ? _error.message : "")
		);
		return 0;
	}

	browser_click_handler_init_js._listener = _listener;
	browser_click_handler_init_js._installed = true;
	return 0;
}

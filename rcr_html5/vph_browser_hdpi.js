/// @description Returns the current CSS-pixel to device-pixel ratio.
function browser_get_device_pixel_ratio() {
	var _global = (typeof globalThis !== "undefined") ? globalThis : window;
	var _ratio = Number(_global.devicePixelRatio);
	return isFinite(_ratio) && _ratio > 0 ? _ratio : 1;
}

/// @description Sets the canvas CSS size without changing its backing resolution.
/// @returns 1 on success, otherwise 0.
function browser_stretch_canvas_ext(_canvas_id, _width, _height) {
	var _global = (typeof globalThis !== "undefined") ? globalThis : window;
	var _document = _global.document;

	function _report_once(_message) {
		if (browser_stretch_canvas_ext._error_reported) return;
		browser_stretch_canvas_ext._error_reported = true;

		var _text = "[browser_hdpi] " + _message;
		if (typeof GMS_API !== "undefined" &&
			typeof GMS_API.debug_msg === "function") {
			GMS_API.debug_msg(_text);
		} else if (_global.console && typeof _global.console.error === "function") {
			_global.console.error(_text);
		}
	}

	var _css_width = Number(_width);
	var _css_height = Number(_height);
	if (!isFinite(_css_width) || !isFinite(_css_height) ||
		_css_width < 0 || _css_height < 0) {
		_report_once("Canvas CSS dimensions must be finite, non-negative numbers.");
		return 0;
	}

	if (!_document) {
		_report_once("document is unavailable.");
		return 0;
	}

	var _canvas = null;
	if (_canvas_id && typeof _canvas_id === "object" && _canvas_id.style) {
		_canvas = _canvas_id;
	} else if (typeof _document.getElementById === "function") {
		_canvas = _document.getElementById(String(_canvas_id));
	}

	if (!_canvas && typeof _document.querySelector === "function") {
		_canvas = _document.querySelector("canvas");
	}

	if (!_canvas || !_canvas.style) {
		_report_once("The GameMaker canvas could not be found.");
		return 0;
	}

	var _width_css = _css_width + "px";
	var _height_css = _css_height + "px";
	if (_canvas.style.width !== _width_css) _canvas.style.width = _width_css;
	if (_canvas.style.height !== _height_css) _canvas.style.height = _height_css;
	return 1;
}

/// @description Enables or disables page scrollbars and restores prior styles.
/// Omitting the argument preserves the extension's original disable behavior.
/// @returns 1 on success, otherwise 0.
function browser_scrollbars_enable(_enabled) {
	var _global = (typeof globalThis !== "undefined") ? globalThis : window;
	var _document = _global.document;
	if (!_document) return 0;

	var _root = _document.documentElement;
	var _body = _document.body;
	if (!_root && !_body) return 0;

	if (browser_scrollbars_enable._state === undefined) {
		browser_scrollbars_enable._state = {
			root: _root && _root.style ? _root.style.overflow : "",
			body: _body && _body.style ? _body.style.overflow : ""
		};
	}

	var _state = browser_scrollbars_enable._state;
	var _overflow = _enabled ? null : "hidden";

	if (_root && _root.style) {
		_root.style.overflow = _overflow === null ? _state.root : _overflow;
	}
	if (_body && _body.style) {
		_body.style.overflow = _overflow === null ? _state.body : _overflow;
	}

	return 1;
}

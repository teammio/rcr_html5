/// @description Draws the HTML5 splash image and a configurable loading bar.
/// @returns The normalized loading progress in the range 0..1.
function ImageLoadBar_hook(_ctx, _width, _height, _total, _current, _image) {
	var _global = (typeof globalThis !== "undefined") ? globalThis : window;

	function _is_finite_number(_value) {
		return typeof _value === "number" && isFinite(_value);
	}

	function _clamp(_value, _minimum, _maximum) {
		return Math.max(_minimum, Math.min(_maximum, _value));
	}

	function _report_once(_property, _message) {
		if (ImageLoadBar_hook[_property]) return;
		ImageLoadBar_hook[_property] = true;

		var _text = "[ImageLoadBar] " + _message;
		if (typeof GMS_API !== "undefined" &&
			typeof GMS_API.debug_msg === "function") {
			GMS_API.debug_msg(_text);
		} else if (_global.console && typeof _global.console.error === "function") {
			_global.console.error(_text);
		}
	}

	if (!_ctx || typeof _ctx.fillRect !== "function") {
		_report_once("_context_error", "A valid 2D canvas context was not supplied.");
		return 0;
	}

	var _canvas_width = _is_finite_number(_width) ? Math.max(0, _width) : 0;
	var _canvas_height = _is_finite_number(_height) ? Math.max(0, _height) : 0;
	var _total_value = _is_finite_number(_total) ? _total : 0;
	var _current_value = _is_finite_number(_current) ? _current : 0;
	var _progress = (_total_value > 0) ? _current_value / _total_value : 0;
	_progress = _is_finite_number(_progress) ? _clamp(_progress, 0, 1) : 0;

	var _image_width = 0;
	var _image_height = 0;
	if (_image) {
		_image_width = Number(_image.naturalWidth || _image.videoWidth || _image.width || 0);
		_image_height = Number(_image.naturalHeight || _image.videoHeight || _image.height || 0);
		if (!_is_finite_number(_image_width) || _image_width <= 0) _image_width = 0;
		if (!_is_finite_number(_image_height) || _image_height <= 0) _image_height = 0;
	}

	var _callback = _global.gml_Script_gmcallback_imgloadbar;
	var _callback_enabled = typeof _callback === "function";
	if (ImageLoadBar_hook._instance === undefined) {
		ImageLoadBar_hook._instance = {};
	}

	function _get_value(_name) {
		if (!_callback_enabled) return undefined;

		try {
			return _callback(
				ImageLoadBar_hook._instance,
				null,
				_name,
				_current_value,
				_total_value,
				_canvas_width,
				_canvas_height,
				_image_width,
				_image_height
			);
		} catch (_error) {
			_callback_enabled = false;
			_report_once(
				"_callback_error",
				"gmcallback_imgloadbar failed; defaults will be used. " +
				(_error && _error.message ? _error.message : "")
			);
			return undefined;
		}
	}

	function _get_number(_name, _default) {
		var _value = _get_value(_name);
		return _is_finite_number(_value) ? _value : _default;
	}

	function _get_array(_name) {
		var _value = _get_value(_name);
		return Array.isArray(_value) ? _value : null;
	}

	function _get_color(_name, _default) {
		var _value = _get_value(_name);

		if (_is_finite_number(_value)) {
			var _hex = (Math.floor(_value) & 0xFFFFFF).toString(16);
			while (_hex.length < 6) _hex = "0" + _hex;
			return "#" + _hex;
		}

		if (typeof _value === "string" && _value.length > 0) return _value;
		return _default;
	}

	var _background_color = _get_color("background_color", "#FFFFFF");
	var _bar_background_color = _get_color("bar_background_color", "#FFFFFF");
	var _bar_foreground_color = _get_color("bar_foreground_color", "#242238");
	var _bar_border_color = _get_color("bar_border_color", "#242238");
	var _bar_width = _clamp(
		_get_number("bar_width", Math.round(_canvas_width * 0.6)),
		0,
		_canvas_width
	);
	var _bar_height = _clamp(_get_number("bar_height", 20), 0, _canvas_height);
	var _bar_border_width = _clamp(
		_get_number("bar_border_width", 2),
		0,
		Math.min(_bar_width, _bar_height) * 0.5
	);
	var _bar_offset = _clamp(
		_get_number("bar_offset", 10),
		-_canvas_height,
		_canvas_height
	);

	var _saved = false;
	if (typeof _ctx.save === "function") {
		_ctx.save();
		_saved = true;
	}

	try {
		_ctx.fillStyle = _background_color;
		_ctx.fillRect(0, 0, _canvas_width, _canvas_height);

		var _bar_top = Math.round((_canvas_height - _bar_height) * 0.5);
		var _can_draw_image = _image_width > 0 && _image_height > 0 &&
			typeof _ctx.drawImage === "function";

		if (_can_draw_image) {
			var _rect = _get_array("image_rect");
			var _source_x = 0;
			var _source_y = 0;
			var _source_width = _image_width;
			var _source_height = _image_height;

			if (_rect && _rect.length >= 4 &&
				_is_finite_number(_rect[0]) && _is_finite_number(_rect[1]) &&
				_is_finite_number(_rect[2]) && _is_finite_number(_rect[3]) &&
				_rect[2] > 0 && _rect[3] > 0) {
				_source_x = _clamp(_rect[0], 0, _image_width);
				_source_y = _clamp(_rect[1], 0, _image_height);
				_source_width = _clamp(_rect[2], 0, _image_width - _source_x);
				_source_height = _clamp(_rect[3], 0, _image_height - _source_y);
			}

			var _available_image_height = Math.max(
				0,
				_canvas_height - _bar_height - Math.max(0, _bar_offset)
			);
			var _image_scale = Math.min(
				1,
				_source_width > 0 ? _canvas_width / _source_width : 0,
				_source_height > 0 ? _available_image_height / _source_height : 0
			);
			var _draw_width = _source_width * _image_scale;
			var _draw_height = _source_height * _image_scale;

			if (_draw_width > 0 && _draw_height > 0) {
				var _total_height = _draw_height + _bar_offset + _bar_height;
				var _image_x = Math.round((_canvas_width - _draw_width) * 0.5);
				var _image_y = Math.round((_canvas_height - _total_height) * 0.5);

				try {
					_ctx.drawImage(
						_image,
						_source_x,
						_source_y,
						_source_width,
						_source_height,
						_image_x,
						_image_y,
						_draw_width,
						_draw_height
					);
					_bar_top = Math.round(_image_y + _draw_height + _bar_offset);
				} catch (_image_error) {
					_report_once(
						"_image_error",
						"The splash image could not be drawn; the loading bar will continue. " +
						(_image_error && _image_error.message ? _image_error.message : "")
					);
				}
			}
		}

		_bar_top = _clamp(_bar_top, 0, Math.max(0, _canvas_height - _bar_height));
		var _bar_left = Math.round((_canvas_width - _bar_width) * 0.5);

		_ctx.fillStyle = _bar_border_color;
		_ctx.fillRect(_bar_left, _bar_top, _bar_width, _bar_height);

		var _inner_left = _bar_left + _bar_border_width;
		var _inner_top = _bar_top + _bar_border_width;
		var _inner_width = Math.max(0, _bar_width - _bar_border_width * 2);
		var _inner_height = Math.max(0, _bar_height - _bar_border_width * 2);

		_ctx.fillStyle = _bar_background_color;
		_ctx.fillRect(_inner_left, _inner_top, _inner_width, _inner_height);

		_ctx.fillStyle = _bar_foreground_color;
		_ctx.fillRect(
			_inner_left,
			_inner_top,
			Math.round(_inner_width * _progress),
			_inner_height
		);
	} catch (_error) {
		_report_once(
			"_draw_error",
			"The loading screen could not be drawn. " +
			(_error && _error.message ? _error.message : "")
		);
	} finally {
		if (_saved && typeof _ctx.restore === "function") _ctx.restore();
	}

	return _progress;
}

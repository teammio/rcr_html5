/* began */

/// @description 占位符函数
function window_enable_borderless_fullscreen(_flag) {};

/// @description 异步测量显示刷新率；结果发送到 Social Async Event
function display_get_frequency() {
	if (display_get_frequency._state !== undefined) {
		return display_get_frequency._state.frequency;
	}

	var _state = {
		frequency: Infinity
	};
	display_get_frequency._state = _state;

	function _send(_status, _frequency, _sample_count) {
		if (typeof GMS_API === "undefined" ||
			typeof GMS_API.send_async_event_social !== "function") {
			return;
		}

		GMS_API.send_async_event_social({
			"type": "display_get_frequency",
			"status": _status,
			"frequency": _frequency,
			"sample_count": _sample_count
		});
	}

	function _finish(_status, _frequency, _sample_count) {
		_state.frequency = _frequency;
		_send(_status, _frequency, _sample_count);
	}

	function _median(_values) {
		var _middle = Math.floor(_values.length / 2);

		if ((_values.length & 1) !== 0) {
			return _values[_middle];
		}

		return (_values[_middle - 1] + _values[_middle]) * 0.5;
	}

	function _estimate(_samples) {
		_samples.sort(function(_a, _b) { return _a - _b; });

		// Long intervals are normally dropped frames. Use the faster, stable part
		// of the sample set so an occasional missed frame does not halve the result.
		var _seed = _samples[Math.floor((_samples.length - 1) * 0.2)];
		var _minimum = _seed * 0.8;
		var _maximum = _seed * 1.2;
		var _stable = [];
		var _i;

		for (_i = 0; _i < _samples.length; ++_i) {
			if (_samples[_i] >= _minimum && _samples[_i] <= _maximum) {
				_stable.push(_samples[_i]);
			}
		}

		if (_stable.length < 5) {
			_stable = _samples;
		}

		return Math.round(1000 / _median(_stable));
	}

	var _screen_frequency = 0;
	var _request_frame = window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.msRequestAnimationFrame;

	// Some browser shells expose this non-standard property directly.
	if (window.screen && window.screen.refreshRate !== undefined) {
		_screen_frequency = Number(window.screen.refreshRate);
	}

	if (isFinite(_screen_frequency) && _screen_frequency >= 20 && _screen_frequency <= 500) {
		window.setTimeout(function() {
			_finish("success", Math.round(_screen_frequency), 0);
		}, 0);
		return _state.frequency;
	}

	if (typeof _request_frame !== "function") {
		window.setTimeout(function() {
			_finish("fallback", Infinity, 0);
		}, 0);
		return _state.frequency;
	}

	var _samples = [];
	var _previous_time = null;
	var _attempts = 0;

	function _sample(_timestamp) {
		if (typeof document !== "undefined" && document.hidden) {
			_previous_time = null;
			_request_frame.call(window, _sample);
			return;
		}

		if (typeof _timestamp !== "number") {
			_timestamp = (window.performance && typeof window.performance.now === "function")
				? window.performance.now()
				: Date.now();
		}

		if (_previous_time !== null) {
			var _delta = _timestamp - _previous_time;

			// 20-500 Hz covers practical displays and rejects pauses or stalls.
			if (_delta >= 2 && _delta <= 50) {
				_samples.push(_delta);
			}
		}

		_previous_time = _timestamp;
		++_attempts;

		if (_samples.length >= 60 || _attempts >= 180) {
			if (_samples.length >= 5) {
				_finish("success", _estimate(_samples), _samples.length);
			} else {
				_finish("fallback", Infinity, _samples.length);
			}
			return;
		}

		_request_frame.call(window, _sample);
	}

	_request_frame.call(window, _sample);
	return _state.frequency;
};

/* ended */

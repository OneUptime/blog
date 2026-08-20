# Validation Summary: Use a Monotonic Clock for Reliable Backoff Timing

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Python `time` module
- Python `datetime` module
- Python `asyncio`
- Monotonic and wall clocks
- Network Time Protocol (NTP) clock adjustment
- HTTP `Retry-After`
- Durable retry and backoff scheduling

## Sources Consulted

- [Python `time` module documentation](https://docs.python.org/3/library/time.html), including `time.time()`, `time.monotonic()`, `time.sleep()`, and `time.get_clock_info()`
- [Python `asyncio` event-loop documentation](https://docs.python.org/3/library/asyncio-eventloop.html), including `get_running_loop()`, `loop.time()`, and `loop.call_at()`
- [Python `asyncio.sleep()` documentation](https://docs.python.org/3/library/asyncio-task.html#asyncio.sleep)
- [Python aware and naive `datetime` documentation](https://docs.python.org/3/library/datetime.html#aware-and-naive-objects)
- [PEP 418: Add monotonic time, performance counter, and process time functions](https://peps.python.org/pep-0418/)
- [RFC 9110 Section 10.2.3: `Retry-After`](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)
- [RFC 9110 Section 5.6.7: Date/Time Formats](https://www.rfc-editor.org/rfc/rfc9110.html#section-5.6.7)

## Issues Found

- The description said wall-clock corrections could make the demonstrated one-shot retry fire twice. The examples support early or late execution, but duplicate execution would require additional scheduler behavior, so "or twice" was removed.
- The introduction included daylight-saving changes among causes that can distort the `time.time()` deadline. DST changes local civil-time representation, not the Unix timestamp returned by `time.time()`, so that reference was removed.
- The synchronous example claimed its loop handled an interrupted or short `time.sleep()`. Current Python restarts a sleep interrupted by a non-raising signal handler and sleeps for at least the requested duration; if the handler raises, the shown loop does not catch the exception. The explanation now accurately says that the loop checks the same deadline after the sleep returns.
- The HTTP-date helper accepted any `datetime`, even though subtracting a naive value from the aware UTC value returned by `datetime.now(timezone.utc)` raises `TypeError`. It now rejects naive inputs with a clear `ValueError`. It also rejects a negative `max_delay`, which would otherwise create a deadline in the past.
- The post described monotonic readings as process-local and prohibited comparisons across all process boundaries. Current Python documents that `time.monotonic()` uses the same clock for processes on a host. The portability guidance now correctly warns against durable persistence and comparisons across hosts or reboots.

## Review Notes

- All Python examples were executed successfully with Python 3.13.1, including the new validation paths in the HTTP-date helper.
- The APIs used are current and non-deprecated in the Python 3.14 documentation.
- Event-loop and operating-system scheduling can still make a callback or resumed coroutine slightly early within clock resolution or late under load. The post correctly limits its guarantee to avoiding distortion from wall-clock corrections.
- Whether monotonic time includes time spent in system suspend is platform-dependent; PEP 418 explicitly leaves suspend behavior undefined. This does not affect the post's wall-clock-correction guidance but matters for backoff that spans suspension.
- All external links resolve to the intended official documentation or RFC sections.

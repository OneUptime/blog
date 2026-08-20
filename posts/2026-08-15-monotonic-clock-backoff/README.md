# Use a Monotonic Clock for Reliable Backoff Timing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Backoff, Python, Monotonic Clock, NTP, Asyncio, Retry

Description: Schedule in-process backoff against elapsed time so wall-clock corrections cannot make retries fire early, late, or twice.

---

Wall clocks answer "what time is it?" Backoff needs to answer "how much time has elapsed?" Those are different questions.

NTP corrections, administrator changes, and virtual-machine clock adjustments can move wall time. An in-process retry deadline should use a monotonic clock that cannot move backward.

## The Fragile Wall-Clock Pattern

This deadline can be distorted if the system clock changes between the two calls:

```python
import time

deadline = time.time() + delay_seconds
remaining = deadline - time.time()
```

A backward wall-clock step lengthens the apparent delay. A forward step can make the retry fire immediately.

Python documents `time.monotonic()` as a clock that cannot go backwards and is not affected by system clock updates. Its reference point is intentionally undefined, so only differences between readings are meaningful.

## Use a Monotonic Deadline

For synchronous code:

```python
import time

def wait_until(deadline: float) -> None:
    while True:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return
        time.sleep(remaining)

delay_seconds = 2.5
deadline = time.monotonic() + delay_seconds
wait_until(deadline)
```

After the sleep returns, the loop checks the same monotonic deadline again.

For `asyncio`, use the event loop's clock. `loop.time()` is documented as monotonic, and scheduling methods such as `call_at` use that same time reference:

```python
import asyncio

async def retry_with_deadline(operation, delay: float):
    loop = asyncio.get_running_loop()
    retry_at = loop.time() + delay

    remaining = max(0.0, retry_at - loop.time())
    await asyncio.sleep(remaining)
    return await operation()
```

Plain `await asyncio.sleep(delay)` is already appropriate for a relative backoff. An explicit deadline becomes useful when other work, cancellation checks, or several shorter waits occur before the attempt.

## Convert External Wall Times Once

An HTTP `Retry-After` field can be either delay-seconds or an HTTP date. A date is necessarily a wall-clock value. Convert it to a bounded relative duration when received, then schedule from the monotonic clock:

```python
from datetime import datetime, timezone
import time

def monotonic_deadline_from_http_date(retry_at: datetime, max_delay: float) -> float:
    if retry_at.utcoffset() is None:
        raise ValueError("retry_at must be timezone-aware")
    if max_delay < 0:
        raise ValueError("max_delay must be non-negative")

    now_wall = datetime.now(timezone.utc)
    relative = max(0.0, (retry_at - now_wall).total_seconds())
    bounded = min(relative, max_delay)
    return time.monotonic() + bounded
```

This limits wall-clock uncertainty to the conversion instant. Validate and cap server-provided values before using them.

## Know Where Monotonic Time Stops Working

Monotonic readings have an arbitrary origin and are not durable timestamps. Python uses the same monotonic clock for processes on the same host, but readings are not portable across hosts or reboots. Do not:

- store a monotonic timestamp as durable retry state;
- compare readings from different hosts;
- expect a reading to remain meaningful across a reboot;
- put it in logs as a human timestamp.

For durable retry state, persist an absolute UTC `next_attempt_at` or a remaining duration plus enough metadata to reconstruct policy after restart. On process startup, translate due work into new monotonic deadlines and release it through a rate or concurrency limit. Durable scheduling must tolerate wall-clock corrections because a monotonic reference point is not guaranteed to remain meaningful across a reboot.

Use wall time for audit fields such as `created_at` and `last_failed_at`. Use monotonic time for timeouts, elapsed durations, and in-process backoff.

## Inspect the Clock When Portability Matters

Python exposes clock properties:

```python
info = time.get_clock_info("monotonic")
assert info.monotonic
print(info.adjustable, info.resolution, info.implementation)
```

The `adjustable` flag describes whether the clock can be set to jump, not whether its rate can be gradually adjusted. A monotonic clock can still run slightly faster or slower while preserving nondecreasing elapsed-time behavior.

## Official Documentation

- [Python `time.monotonic`](https://docs.python.org/3/library/time.html#time.monotonic)
- [Python `time.get_clock_info`](https://docs.python.org/3/library/time.html#time.get_clock_info)
- [Python asyncio event-loop clock](https://docs.python.org/3/library/asyncio-eventloop.html#asyncio.loop.time)
- [Python `asyncio.sleep`](https://docs.python.org/3/library/asyncio-task.html#asyncio.sleep)
- [RFC 9110 `Retry-After`](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)

## Conclusion

Calculate in-process retry deadlines from a monotonic clock and use wall time only where a civil timestamp is required. Convert external dates to bounded relative delays once, and never persist monotonic readings as durable retry timestamps or compare them across hosts or reboots.

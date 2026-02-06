# How to Trace Deadlocks and Thread Contention Issues Using OpenTelemetry Span Timing Gaps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Deadlocks, Thread Contention, Concurrency, Debugging

Description: Use OpenTelemetry span timing gaps to detect deadlocks and thread contention issues in concurrent applications.

Deadlocks and thread contention are among the hardest bugs to reproduce and diagnose. A thread waiting on a lock does not throw an error or write a log line. It just sits there, silently, while your request hangs. OpenTelemetry spans, however, record precise timing information. By analyzing the gaps between spans, you can detect when threads are blocked waiting for resources.

## Understanding Span Timing Gaps

A span records when work starts and when it finishes. Between a parent span's start and its first child span, or between consecutive child spans, there should be minimal idle time in a healthy system. If you see a parent span that lasts 10 seconds but its child spans only account for 2 seconds of actual work, the remaining 8 seconds are unaccounted for. That gap is where your thread was blocked.

## Instrumenting Lock Acquisition

The first step is to make lock acquisition visible in your traces. Here is a Java example that wraps a `ReentrantLock` with span instrumentation:

```java
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.trace.Span;
import java.util.concurrent.locks.ReentrantLock;
import java.util.concurrent.TimeUnit;

public class InstrumentedLock {
    private final ReentrantLock lock;
    private final Tracer tracer;
    private final String lockName;

    public InstrumentedLock(String lockName, Tracer tracer) {
        this.lock = new ReentrantLock();
        this.tracer = tracer;
        this.lockName = lockName;
    }

    public boolean tryLockInstrumented(long timeout, TimeUnit unit)
            throws InterruptedException {

        Span span = tracer.spanBuilder("lock.acquire")
            .setAttribute("lock.name", lockName)
            .setAttribute("lock.queue_length", lock.getQueueLength())
            .setAttribute("lock.is_held", lock.isLocked())
            .startSpan();

        try {
            boolean acquired = lock.tryLock(timeout, unit);
            span.setAttribute("lock.acquired", acquired);

            if (!acquired) {
                span.setAttribute("lock.timeout", true);
                span.addEvent("Lock acquisition timed out", io.opentelemetry.api.common.Attributes.of(
                    io.opentelemetry.api.common.AttributeKey.stringKey("lock.holder_thread"),
                    getHolderThreadName()
                ));
            }

            return acquired;
        } finally {
            span.end();
        }
    }

    private String getHolderThreadName() {
        // ReentrantLock exposes this through a protected method
        // In production, you would subclass to access it
        return "unknown";
    }
}
```

## Detecting Contention Through Timing Analysis

You can analyze collected traces to find contention patterns. The key metric is the ratio of child span duration to parent span duration:

```python
def analyze_contention(trace_data):
    """
    Find spans where child work accounts for a small fraction
    of the parent duration, suggesting the thread was blocked.
    """
    spans_by_id = {s["spanId"]: s for s in trace_data["spans"]}
    children_by_parent = {}

    for span in trace_data["spans"]:
        parent_id = span.get("parentSpanId")
        if parent_id:
            children_by_parent.setdefault(parent_id, []).append(span)

    contention_suspects = []

    for parent_id, children in children_by_parent.items():
        parent = spans_by_id.get(parent_id)
        if not parent:
            continue

        parent_duration = parent["endTime"] - parent["startTime"]
        if parent_duration == 0:
            continue

        # Sum up all child span durations
        child_duration_total = sum(
            c["endTime"] - c["startTime"] for c in children
        )

        # Calculate the gap (time not accounted for by children)
        gap = parent_duration - child_duration_total
        gap_ratio = gap / parent_duration

        # If more than 60% of the parent duration is unaccounted for,
        # there is likely contention or blocking
        if gap_ratio > 0.6 and parent_duration > 1_000_000:  # > 1ms
            contention_suspects.append({
                "span_name": parent["name"],
                "parent_duration_ms": parent_duration / 1_000_000,
                "child_duration_ms": child_duration_total / 1_000_000,
                "gap_ms": gap / 1_000_000,
                "gap_ratio": round(gap_ratio, 2),
            })

    # Sort by gap duration, largest first
    contention_suspects.sort(key=lambda x: x["gap_ms"], reverse=True)
    return contention_suspects
```

## Detecting Deadlock Patterns

A deadlock shows up as a span that never ends (or times out after a very long period). You can detect potential deadlocks by looking for spans with durations near your configured timeout thresholds:

```python
def detect_potential_deadlocks(spans, lock_timeout_ms=30000):
    """
    Find lock acquisition spans whose duration is suspiciously
    close to the configured lock timeout.
    """
    suspects = []

    for span in spans:
        if span["name"] != "lock.acquire":
            continue

        duration_ms = (span["endTime"] - span["startTime"]) / 1_000_000
        acquired = span.get("attributes", {}).get("lock.acquired", True)

        # If the lock was not acquired and duration is near timeout,
        # this looks like a deadlock
        if not acquired and duration_ms > (lock_timeout_ms * 0.9):
            suspects.append({
                "trace_id": span["traceId"],
                "lock_name": span["attributes"].get("lock.name"),
                "wait_duration_ms": round(duration_ms, 2),
                "queue_length": span["attributes"].get("lock.queue_length"),
            })

    return suspects
```

## Visualizing the Timeline

When you pull up a trace in your tracing UI, look for these visual patterns:

1. **Long gaps between child spans**: The parent span timeline shows large empty sections where no child spans are running. This is contention.
2. **Overlapping lock spans on different traces**: If two traces show lock acquisition spans for the same lock overlapping in time, one is waiting for the other.
3. **Circular wait patterns**: Trace A holds lock X and waits for lock Y. Trace B holds lock Y and waits for lock X. Both lock.acquire spans start at similar times and both time out.

## Prevention With Span Events

Add span events when locks are acquired and released to build a timeline of lock ownership:

```java
Span.current().addEvent("lock.acquired", Attributes.of(
    AttributeKey.stringKey("lock.name"), lockName,
    AttributeKey.stringKey("thread.name"), Thread.currentThread().getName()
));
```

## Summary

Thread contention and deadlocks hide in the gaps between spans. By instrumenting lock acquisition as explicit spans and analyzing the ratio of child work to parent duration, you can systematically find where your threads are spending time waiting instead of working. The investment in lock instrumentation pays for itself the first time you diagnose a production deadlock without needing to reproduce it locally.

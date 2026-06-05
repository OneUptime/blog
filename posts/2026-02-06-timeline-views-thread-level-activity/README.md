# How to Use Timeline Views Beyond Flame Graphs for Thread-Level Activity Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Profiling, Timeline, Thread Analysis

Description: Go beyond flame graphs with timeline views to analyze thread-level activity using OpenTelemetry profiling data.

Flame graphs are the default visualization for profiling data, and for good reason. They condense thousands of stack samples into a single, readable chart. But they have a limitation: they aggregate everything into one view. You lose the time dimension. A flame graph cannot tell you that Thread-1 was busy for the first 500 milliseconds while Thread-2 was idle, and then they swapped. Timeline views fill this gap by showing per-thread activity over time.

## What a Timeline View Shows

A timeline view plots threads on the y-axis and time on the x-axis. Each thread's row shows what that thread was doing at each moment: executing application code, waiting on I/O, blocked on a lock, or idle.

This is especially useful for diagnosing:

- **Thread pool starvation**: Are all threads busy while new requests queue up?
- **Lock contention**: Are multiple threads repeatedly blocking on the same lock?
- **Uneven work distribution**: Is one thread doing most of the work while others sit idle?
- **I/O wait patterns**: Are threads spending more time waiting for I/O than doing computation?

## Capturing Thread-Level Profile Data

The eBPF profiler captures thread IDs (TIDs) and thread names as sample attributes alongside stack samples. This is the raw data needed for timeline views. Configure the OpenTelemetry Collector eBPF Profiling Distribution with the profiling receiver and a profiles pipeline:

```bash
cat > otelcol-ebpf-profiler.yaml <<'YAML'
receivers:
  profiling:
    samples_per_second: 49

exporters:
  otlp:
    endpoint: http://collector:4317
    tls:
      insecure: true

service:
  pipelines:
    profiles:
      receivers: [profiling]
      exporters: [otlp]
YAML

docker run --rm -d \
  --name otel-ebpf-profiler \
  --privileged \
  --pid=host \
  -v /sys:/sys:ro \
  -v /proc:/proc:ro \
  -v "$(pwd)/otelcol-ebpf-profiler.yaml:/etc/otelcol/config.yaml:ro" \
  otel/opentelemetry-collector-ebpf-profiler:0.152.0 \
  --config=/etc/otelcol/config.yaml \
  --feature-gates=+service.profilesSupport
```

A higher sampling frequency (49 Hz instead of the default 20 Hz) gives better temporal resolution for timeline analysis, though it does increase overhead slightly.

## Generating Timeline Data from Profiles

If your profiling backend does not natively render timeline views, you can generate them from decoded profile data. OpenTelemetry profiles are exported through OTLP and are compatible with pprof-style profile data; samples can include attributes such as `thread.id`.

Here is a Python script that converts decoded profile samples into a timeline-compatible format:

```python
from collections import defaultdict

def parse_profile_to_timeline(profile_data):
    """
    Convert decoded profile samples into timeline events grouped by thread.
    Each sample has timestamps, attributes, and a stack trace.
    """
    timeline = defaultdict(list)

    for sample in profile_data["samples"]:
        attrs = sample.get("attributes", {})
        thread_id = attrs.get("thread.id", "unknown")
        timestamps = sample.get("timestamps_unix_nano", [])
        stack = sample["stack_trace"]

        # Classify the activity based on the top frame
        top_frame = stack[0] if stack else "idle"
        activity = classify_frame(top_frame)

        for timestamp in timestamps:
            timeline[thread_id].append({
                "timestamp": timestamp,
                "activity": activity,
                "top_frame": top_frame,
                "stack_depth": len(stack)
            })

    return dict(timeline)


def classify_frame(frame_name):
    """Classify a frame into activity categories for coloring."""
    if "epoll_wait" in frame_name or "io_uring" in frame_name:
        return "io_wait"
    elif "futex" in frame_name or "mutex" in frame_name:
        return "lock_contention"
    elif "schedule" in frame_name or "nanosleep" in frame_name:
        return "sleeping"
    else:
        return "cpu_executing"
```

## Visualizing Timelines in Grafana

Grafana's native State timeline panel can display this data. You need to transform the profile data into a table format the panel understands:

```yaml
# In Grafana, use the State timeline visualization

# The query should return data in this format:
# | timestamp | thread_id | state        |
# |-----------|-----------|--------------|
# | 1706000000| thread-1  | cpu_executing|
# | 1706000050| thread-1  | io_wait      |
# | 1706000000| thread-2  | lock_contention |
# | 1706000050| thread-2  | cpu_executing|
```

Color-code the states:
- Green for CPU execution
- Blue for I/O wait
- Red for lock contention
- Gray for idle/sleeping

## Interpreting Common Patterns

### Thread Pool Starvation

```text
Thread-1: [CCCCCCCCCCCCCCCCCCCCCCCC]  (100% CPU)
Thread-2: [CCCCCCCCCCCCCCCCCCCCCCCC]  (100% CPU)
Thread-3: [CCCCCCCCCCCCCCCCCCCCCCCC]  (100% CPU)
Thread-4: [CCCCCCCCCCCCCCCCCCCCCCCC]  (100% CPU)
Queue:    [QQQQQQQQQQQQQQQQQQQQQQQQ]  (growing)

C = CPU work, Q = queued requests
```

All threads are maxed out. You either need more threads, or you need to make the work faster.

### Lock Contention

```text
Thread-1: [CC-LLLL-CCC-LLLL-CC-LLLL]
Thread-2: [LLLL-CC-LLLL-CCC-LLLL-CC]
Thread-3: [C-LLLL-CC-LLLL-CC-LLLL-C]

C = CPU work, L = lock wait, - = transition
```

Threads are taking turns. Only one can hold the lock at a time. The fix is usually to reduce lock scope, use finer-grained locks, or switch to lock-free data structures.

### I/O Wait Dominance

```text
Thread-1: [C-IIIIIIIIIIII-C-IIIIIII]
Thread-2: [C-IIIIIIIIII-CC-IIIIIIIII]

C = CPU work, I = I/O wait
```

Threads spend most of their time waiting for I/O. The CPU work is minimal. This suggests the bottleneck is in the database, network, or disk, not in your application code. A CPU flame graph would look mostly empty for these threads; the timeline tells the real story.

## Combining Timeline with Flame Graph

The most effective workflow uses both views together:

1. Open the timeline view for your service during the problematic period.
2. Identify which threads are in an unexpected state (e.g., blocked when they should be executing).
3. Select the time range where the issue occurs.
4. Switch to the flame graph view filtered to just those threads and that time range.
5. The flame graph now shows exactly what those specific threads were doing.

This two-step approach narrows your investigation from "something is slow" to "these three threads are contending on this specific lock during this 2-second window." Timeline views add the dimension that flame graphs lack: time. Together, they give you a complete picture of your application's runtime behavior.

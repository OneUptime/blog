# Basics of profiling: Turning CPU & Memory Hotspots into Action

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Profiling, Observability, Performance, NodeJS, TypeScript, Tracing

Description: A practical guide to continuous profiling. What it is, why you need it beyond logs/metrics/traces, core concepts (CPU, wall time, memory, locks), how it complements tracing, and how to instrument and use profiles effectively without drowning in data or cost.

---

> Traces tell you *where* a request spent time. **Profiles tell you *why* the code was slow or resource hungry.**
>
> Tracing answers: "Request latency is high- inside `checkout.calculateTotals`." Profiling answers: "Because 63% of CPU time was doing JSON parsing and 18% was waiting on a mutex." Together they cut MTTR dramatically.

Traditional observability = **Logs + Metrics + Traces**. That’s great, until you ask questions like:

- Why is p95 latency creeping up even though DB time is flat?
- Which code path allocates the most memory over 5 minutes under production traffic?
- What function is holding the event loop hostage in Node.js?
- Why did CPU spike without a matching increase in request volume?

**Continuous Profiling** (aka always‑on or low‑overhead sampling of runtime internals) fills this gap. OpenTelemetry is standardizing how profiles are represented and exported (via the evolving Profiles signal). Whether fully adopted yet or not, *thinking in OpenTelemetry terms now future‑proofs your instrumentation*.

---

## 1. What Is Continuous Profiling?
Continuous profiling is **periodically sampling the runtime** (stack traces, heap state, object allocations, thread states, etc.) while your application runs under real production traffic. Instead of a one‑off local `profiler.start()` during an incident, you:

- Collect lightweight samples every X ms (CPU) or on every allocation (sampled).
- Aggregate across time windows (e.g., last 10m) to produce a *profile*.
- Visualize as a **flame graph** / **icicle chart** / **top lists**.
- Correlate back to deployments, traces, feature flags, load patterns.

Key value: You stop guessing. You *see* what code actually burns CPU, allocates memory, or stalls.

---

## 2. How Profiling Complements Tracing & Metrics

| Question | Metric | Trace | Profile |
|----------|--------|-------|---------|
| Is latency high? | ✅ p95 latency | ✅ Which span | ❌ (not directly) |
| Where inside a request? | ❌ | ✅ Span tree | ⚠️ (indirect) |
| Why function X is slow (code path)? | ❌ | ⚠️ Narrow guess | ✅ Flame graph shows exact stack cost |
| What allocates most memory overall? | ❌ | ❌ | ✅ Allocation profile |
| Which code caused CPU spike system‑wide? | ❌ | ⚠️ Aggregate traces maybe | ✅ CPU profile top stacks |
| Are we blocking the event loop? | ❌ | ⚠️ long spans maybe | ✅ Wall vs CPU delta + event loop profile |

**Mental Model:** Traces are *request scoped*. Profiles are *process scoped*. Use traces to isolate a problematic endpoint, then use profiles to zoom inside the code executed across *all* requests.

---

## 3. Core Profile Types (What They Mean)

Profiling captures different aspects of your application's runtime behavior. Think of each profile type as a specialized lens that reveals specific performance issues. Below is a breakdown of the main types you'll encounter, what they measure, when to use them, and common warning signs that indicate problems.

### Understanding Each Profile Type

**CPU (Time) Profile**: This is your go-to for finding where your code spends the most processing time. It samples the call stack at regular intervals (like every 10ms) to show which functions are actively running. If a single function takes up more than 50% of CPU time, or you see excessive JSON parsing/string manipulation, it's a clear sign of inefficiency.

**Wall Time Profile**: Unlike CPU time, wall time includes everything- processing, waiting for I/O, locks, etc. It's perfect for spotting bottlenecks where your code isn't actually doing work but waiting. A big difference between wall time and CPU time often points to I/O issues or lock contention.

**Allocations Profile**: This tracks where memory is being allocated in your code. It helps identify memory churn (creating and discarding many objects quickly), which can cause frequent garbage collection pauses. Look for patterns like allocating many small objects in tight loops.

**Heap Profile**: A snapshot of all live objects in memory at a point in time. Use this to detect memory leaks (objects that should be garbage collected but aren't) or to understand your application's memory footprint. If heap size grows steadily over time, you might have a leak.

**Lock / Contention Profile**: Shows where threads or goroutines are blocked waiting for locks. Essential for concurrent applications. If one lock is causing many threads to wait, it creates a bottleneck that can severely impact performance.

**Threads / Goroutines Profile**: Monitors the number and state of concurrent execution units. Helps detect thread leaks (threads that don't terminate) or oversubscription (too many threads competing for CPU). Unbounded growth in thread count is often a sign of poor resource management.

**Event Loop Lag (Node.js)**: Specific to Node.js, this measures delays in processing asynchronous operations. High lag indicates the event loop is blocked, preventing timely handling of new requests. Combine with CPU profiles to find the blocking code.

| Profile Type | What It Samples | Use It For | Red Flag Patterns |
|--------------|-----------------|------------|-------------------|
| CPU (Time) | Active stacks at intervals (e.g., every 10ms) | Hot functions, wasted cycles, inlining/algorithm choices | One function dominating >50%; deep recursion; JSON/string churn |
| Wall Time | Total elapsed including waits | I/O stalls, lock contention, blocking calls | Large gap between wall time heavy frames & low CPU frames |
| Allocations | Allocation sites (sampled) | GC pressure, memory churn | Many short‑lived allocations in tight loops |
| Heap | Live objects at snapshot | Leak detection, footprint sizing | Retained objects growing each snapshot |
| Lock / Contention | Stacks blocked on mutex/semaphore | Concurrency tuning | One lock bottlenecking many stacks |
| Threads / Goroutines | Active concurrency units | Oversubscription, leaks, runaway tasks | Unbounded goroutine/thread growth |
| Event Loop Lag (Node) | Delay in processing timers/ticks | Finding CPU hogs & sync blocking | High lag + CPU plateau |

You don't need them all day one. Start with CPU + Alloc + Event Loop (for Node.js) + optional Heap Snapshot weekly. As you become more comfortable, add wall time and lock profiles for deeper insights.

---

## 4. When to Reach for a Profile (Cheat Sheet)

Not sure which profile to start with? Use this guide based on the symptoms you're seeing. Each entry suggests a primary profile type to investigate first, then follow-up profiles if needed. Remember, profiles work best when correlated with your metrics and traces.

| Symptom | Start With | Then Maybe | Why This Profile? |
|---------|------------|------------|-------------------|
| Latency up, DB fine | CPU profile | Wall time, allocations | If database performance is normal but overall latency is high, the issue is likely in your application code consuming CPU or allocating memory inefficiently. |
| RSS climbing slowly | Heap snapshots (interval) | Allocation profile | Resident Set Size (RSS) growth indicates memory usage increasing over time. Heap snapshots show what's being retained; allocation profiles reveal where new objects are created. |
| High GC pauses | Allocation profile | Heap + CPU | Garbage collection pauses are often caused by excessive allocations. Check allocation patterns first, then see what's in memory and if CPU is spent on GC. |
| CPU spike @ normal RPS | CPU profile | Lock + wall time | Sudden CPU increase without traffic changes suggests inefficient code or concurrency issues. CPU profile shows hotspots; lock profile reveals if threads are contending. |
| P99 latency has long tail | Wall time | CPU + lock | The 99th percentile latency being high indicates occasional slow requests. Wall time shows total time including waits; CPU and lock profiles pinpoint the causes. |
| Event loop delay warnings | CPU + event loop | Allocation | In Node.js, event loop delays mean the single thread is blocked. CPU profile finds the blocker; allocation profile checks for memory-related stalls. |
| Memory OOM after hours | Heap diff | Allocation profile | Out-of-memory errors after running for hours suggest a memory leak. Compare heap snapshots over time, then trace allocation sources. |

**Pro Tip**: Always capture profiles during both normal operation and when issues occur. Compare them to isolate the problem. Start with shorter sampling periods (10-30 seconds) for quick diagnosis, then longer periods for trend analysis.

---

## 5. OpenTelemetry Profiling Spec (Current State)
OpenTelemetry today (Sept 2025) has matured Logs, Metrics, Traces. **Profiling is emerging**, there are drafts and early implementations aligning with ideas like:

- A new signal (Profiles) exported via OTLP (likely `otlp/v1/profiles`).
- Data model referencing: *period*, *sample type* (cpu, wall, alloc), *sample unit* (nanoseconds, bytes), *stack frames* list, *locations*, *functions*, *mapping*.
- Conceptual overlap with the pprof format (Go, now widely reused).

Practical reality: Many runtimes still produce native formats (pprof, JFR, async-profiler output) which collectors transform. *Design your pipeline so you can swap exporters later.*

---

## 6. Data Model Basics (Profiles vs Spans)

| Aspect | Span | Profile Sample |
|--------|------|----------------|
| Scope | One operation/request | Process-wide aggregated interval |
| Cardinality Pressure | Attributes | Stack locations/functions |
| Timing | Start + end | Sample timestamps & counts |
| Identity | trace_id / span_id | profile_id / period start-end |
| Correlation | span links, attributes | trace/span IDs optionally embedded as labels (future) |
| Storage | Time-series of trees (trace) | Periodic merged call trees (flame graph) |

Skim rule: A profile is a **statistical view** of where time/bytes went across *many spans*.

---

## Summary
Continuous profiling closes the *why* gap left after traces point you to *where*. Start small (periodic CPU + heap), correlate with traces, and focus on high-impact hotspots rather than premature micro‑tuning. Structure your pipeline now so adopting OpenTelemetry’s profile signal later is a drop-in upgrade- not a migration.

> Optimize what users experience: latency, reliability, cost. Profiles give you the factual heat map of where engineering effort pays off.

**Related Reading:**
- [Traces vs Metrics in Software Observability](https://oneuptime.com/blog/post/2025-08-21-traces-vs-metrics-in-opentelemetry/view)
- [What are Traces and Spans in OpenTelemetry: A Practical Guide](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
- [How to Structure Logs Properly in OpenTelemetry: A Complete Guide](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
- [What are metrics in OpenTelemetry: A Complete Guide](https://oneuptime.com/blog/post/2025-08-26-what-are-metrics-in-opentelemetry/view)

---

*Want unified traces + metrics + logs today, and an on-ramp for profiles tomorrow? Send your OpenTelemetry data to OneUptime and be ready for the next signal without re‑instrumenting.*

# Continuous Profiling with OpenTelemetry: Turning CPU & Memory Hotspots into Action

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Profiling, Observability, Performance, NodeJS, TypeScript, Tracing

Description: A practical guide to continuous profiling with OpenTelemetry. What it is, why you need it beyond logs/metrics/traces, core concepts (CPU, wall time, memory, locks), how it complements tracing, and how to instrument and use profiles effectively without drowning in data or cost.

---

> Traces tell you *where* a request spent time. **Profiles tell you *why* the code was slow or resource hungry.**
>
> Tracing answers: "Request latency is high—inside `checkout.calculateTotals`." Profiling answers: "Because 63% of CPU time was doing JSON parsing and 18% was waiting on a mutex." Together they cut MTTR dramatically.

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

| Profile Type | What It Samples | Use It For | Red Flag Patterns |
|--------------|-----------------|------------|-------------------|
| CPU (Time) | Active stacks at intervals (e.g., every 10ms) | Hot functions, wasted cycles, inlining/algorithm choices | One function dominating >50%; deep recursion; JSON/string churn |
| Wall Time | Total elapsed including waits | I/O stalls, lock contention, blocking calls | Large gap between wall time heavy frames & low CPU frames |
| Allocations | Allocation sites (sampled) | GC pressure, memory churn | Many short‑lived allocations in tight loops |
| Heap | Live objects at snapshot | Leak detection, footprint sizing | Retained objects growing each snapshot |
| Lock / Contention | Stacks blocked on mutex/semaphore | Concurrency tuning | One lock bottlenecking many stacks |
| Threads / Goroutines | Active concurrency units | Oversubscription, leaks, runaway tasks | Unbounded goroutine/thread growth |
| Event Loop Lag (Node) | Delay in processing timers/ticks | Finding CPU hogs & sync blocking | High lag + CPU plateau |

You don't need them all day one. Start with CPU + Alloc + Event Loop (for Node.js) + optional Heap Snapshot weekly.

---

## 4. When to Reach for a Profile (Cheat Sheet)

| Symptom | Start With | Then Maybe |
|---------|------------|------------|
| Latency up, DB fine | CPU profile | Wall time, allocations |
| RSS climbing slowly | Heap snapshots (interval) | Allocation profile |
| High GC pauses | Allocation profile | Heap + CPU |
| CPU spike @ normal RPS | CPU profile | Lock + wall time |
| P99 latency has long tail | Wall time | CPU + lock |
| Event loop delay warnings | CPU + event loop | Allocation |
| Memory OOM after hours | Heap diff | Allocation profile |

---

## 5. OpenTelemetry Profiling Spec (Current State)
OpenTelemetry today (Sept 2025) has matured Logs, Metrics, Traces. **Profiling is emerging**—there are drafts and early implementations aligning with ideas like:

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

## 7. Integrating Profiling in Node.js / TypeScript
There is no single official OTel JS profiler yet, but you can combine existing tools + future‑proof conventions.

### 7.1 Minimal Always‑On CPU + Heap with `@clinic/doctor` / `0x` (Dev Only)
Good for local performance debugging, not production.

### 7.2 Production‑Friendly Sampling (Example Using `pprof` Package)
Use Google’s `pprof` port for Node.js (samples CPU & heap) and emit profiles periodically.

Install:
```bash
npm install pprof @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/exporter-otlp-http
```

Setup (profiling.ts):
```typescript
// profiling.ts
import * as pprof from 'pprof';
import fs from 'node:fs';
import path from 'node:path';

interface ProfileOptions { intervalMillis?: number; durationMillis?: number; outDir?: string; enabled?: boolean; }

const DEFAULT_INTERVAL = 5 * 60 * 1000; // every 5 min
const DEFAULT_DURATION = 15 * 1000; // 15s sample window

export function startContinuousCPUProfiling(opts: ProfileOptions = {}) {
  if (!opts.enabled) return;
  const interval = opts.intervalMillis ?? DEFAULT_INTERVAL;
  const duration = opts.durationMillis ?? DEFAULT_DURATION;
  const outDir = opts.outDir ?? path.join(process.cwd(), 'profiles');
  fs.mkdirSync(outDir, { recursive: true });

  async function runOnce() {
    try {
      const profile = await pprof.time.profile({
        durationMillis: duration,
        lineNumbers: true,
        sourceMapper: undefined,
      });
      const buf = await pprof.encode(profile);
      const file = path.join(outDir, `cpu-${Date.now()}.pb.gz`);
      fs.writeFileSync(file, buf);
      // TODO: Ship via OTLP when profile signal finalizes; for now, send to object storage / sidecar.
      // Optionally attach commit hash, service name, environment in filename or sidecar manifest.
    } catch (err) {
      console.error('CPU profiling failed', err);
    }
  }

  setInterval(runOnce, interval).unref();
  runOnce(); // immediate first capture
}

export function startHeapSampling(opts: ProfileOptions = {}) {
  if (!opts.enabled) return;
  const interval = opts.intervalMillis ?? (10 * 60 * 1000); // 10 min
  const outDir = opts.outDir ?? path.join(process.cwd(), 'profiles');
  fs.mkdirSync(outDir, { recursive: true });

  async function runOnce() {
    try {
      const profile = await pprof.heap.profile();
      const buf = await pprof.encode(profile);
      const file = path.join(outDir, `heap-${Date.now()}.pb.gz`);
      fs.writeFileSync(file, buf);
    } catch (err) {
      console.error('Heap profiling failed', err);
    }
  }

  setInterval(runOnce, interval).unref();
}
```

Usage:
```typescript
// index.ts
import { startContinuousCPUProfiling, startHeapSampling } from './profiling';
import './telemetry';

startContinuousCPUProfiling({ enabled: process.env.ENABLE_PROFILING === '1' });
startHeapSampling({ enabled: process.env.ENABLE_PROFILING === '1' });

// start server etc...
```

### 7.3 Annotating Profiles with Build / Env Metadata
When exporting, attach (in filename or side metadata JSON):
- service.name, service.version
- git.commit, git.branch
- deployment.environment
- runtime.version

Later these become profile attributes when OTLP Profiles is stable.

### 7.4 Shipping Profiles Today
Until OTLP Profile ingestion is mainstream you can:
- Upload `.pb.gz` pprof blobs to object storage + index metadata in a DB
- Sidecar convert to flame graphs (using `go tool pprof -svg` or Speedscope JSON)
- Link from trace view in your observability UI by time window overlap

---

## 8. Correlating Profiles with Traces
This is where power compounds.

Workflow example:
1. Alert: `checkout` p95 latency ↑ 40%.
2. Trace sample: span `pricing.applyDiscounts` now 120ms (was 30ms).
3. Time window: last 10m CPU profile → `pricing.applyDiscounts` call tree = 38% total CPU.
4. Drill flame graph: dominated by `JSON.parse` inside a loop reading discount rules from Redis (string). Root cause: Re-parsing static config each request.
5. Fix: Cache parsed rules in memory + background refresh.
6. Post‑deploy: CPU share drops, latency normalizes.

To enable this:
- Align profile capture intervals (e.g., every 5m) with your trace retention window.
- Tag profile metadata with `deployment_id` so you can compare pre vs post.
- (Future) Include `trace_id` frequency counts where stack samples contained active spans (requires integration glue).

---

## 9. Reading a CPU Flame Graph (First Principles)
A flame graph is an **upside-down call tree**:

- X‑axis: Aggregated time proportion (NOT chronological order).
- Each rectangle: A function. Width = fraction of sampled time.
- Vertical stack: Call stack (parent below, child above).
- Very wide box high in the stack = expensive leaf; wide low box = broad cost across many descendants.

Quick triage:
1. Scan for the widest *topmost* boxes (leaf hotspots) — optimize those first.
2. Look for repeated patterns (same function under multiple parents) → candidate for memoization or cache.
3. Flat wide base but narrow leaves → framework overhead vs your code.
4. Many small shards with no dominant cost → maybe not a CPU issue; look at wall time or alloc profile.

Red flags:
- `JSON.parse`, `Buffer.concat`, large regex functions dominating.
- Deep promise chains causing overhead (optimize async layering).
- Synchronous crypto or compression in request path.

---

## 10. Memory Leak & Allocation Hotspot Workflow

Leak suspicion playbook:
1. Capture heap snapshots (e.g., every 30m) → compare retained size growth by type.
2. Identify growing class/string arrays (e.g., cached responses never evicted).
3. Use allocation profile to find where those objects originate.
4. Correlate with traffic patterns (RPS constant but memory rising). If growth per request stable → leak.
5. Fix retention (LRU, TTL, weak refs, batching).
6. Validate with post-fix heap diff flattening.

Allocation churn playbook (GC pressure):
1. Allocation profile: many short-lived objects in hot loop.
2. CPU profile shows time in GC or runtime internals.
3. Optimize: object pooling, pre-sizing arrays, avoid string concatenation inside loops, reuse buffers.

---

## 11. Overhead & Cost Management

Guidelines:
- CPU sample duration 10–20s every 5–15m is usually <1% overhead.
- Heap snapshots are expensive → sparse (hourly/daily) unless investigating.
- Allocation profiling: sample (1 in N allocations) not full capture.
- Gate all profiling with feature flags / env vars.
- Backoff automatically if process CPU > threshold.

Avoid streaming raw samples continuously unless you *must* (cost & noise). Aggregate at edge, export compressed.

---

## 12. Security & Responsible Usage
Profiles may include function names, file paths, even literals in stack frames. Avoid:
- Embedding secrets in code (they might surface indirectly).
- Shipping raw heap dumps containing sensitive in‑memory data blindly.
- Retaining historical profiles indefinitely (rotate & purge).
- Mixing multi-tenant code in one process if sharing profiles externally.

Mask or strip paths if they leak proprietary structure you can’t disclose.

---

## 13. Common Anti‑Patterns
1. Always-on full heap snapshots → high pause + storage cost.
2. Chasing micro-optimizations before eliminating algorithmic hotspots.
3. Profiling only in staging (different traffic shape = misleading).
4. Ignoring event loop lag while chasing CPU (root is sync blocking).
5. Overreacting to one short noisy profile run (average over intervals).
6. Treating profiles as one-off firefighting, not a continuous feedback loop.
7. Tight coupling to vendor‑specific profile format without abstraction.

---

## 14. Quick Wins Playbook
| Problem | Typical Root Cause | Fix Pattern |
|---------|--------------------|-------------|
| High CPU in JSON | Repeated parse/stringify | Cache parsed objects, stream parsing |
| Many small allocations | Array push in loop building strings | Pre-size buffers, join at end |
| Event loop lag spikes | Synchronous crypto/compression | Offload to worker threads, pre-compute |
| Memory climbing slowly | Unbounded cache / map | Add LRU / TTL eviction |
| GC time high | Short-lived churn | Reuse objects, pooling, batch operations |
| Lock contention | Single threaded queue drain | Shard locks, use non-blocking structures |

---

## 15. Next Steps with OneUptime & OpenTelemetry
While the unified OpenTelemetry profile protocol finalizes, you can still build a future‑proof model:

1. Capture pprof profiles (CPU, heap) at controlled intervals.
2. Store with standardized metadata (service.name, version, env, commit, window_start, window_end).
3. Visualize flame graphs (Speedscope, pprof) alongside trace latency charts.
4. Correlate: For a slow span group, list overlapping profiles + top functions.
5. Prepare for OTLP Profiles: keep a translation layer so when collector supports `profiles` you just swap exporter.

Tie this into SLOs: If `checkout` latency SLO error budget burn > threshold, automatically trigger a high-frequency CPU profile window for 10m.

---

## Summary
Continuous profiling closes the *why* gap left after traces point you to *where*. Start small (periodic CPU + heap), correlate with traces, and focus on high-impact hotspots rather than premature micro‑tuning. Structure your pipeline now so adopting OpenTelemetry’s profile signal later is a drop-in upgrade—not a migration.

> Optimize what users experience: latency, reliability, cost. Profiles give you the factual heat map of where engineering effort pays off.

**Related Reading:**
- [Traces vs Metrics in Software Observability](https://oneuptime.com/blog/post/2025-08-21-traces-vs-metrics-in-opentelemetry/view)
- [What are Traces and Spans in OpenTelemetry: A Practical Guide](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
- [How to Structure Logs Properly in OpenTelemetry: A Complete Guide](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
- [What are metrics in OpenTelemetry: A Complete Guide](https://oneuptime.com/blog/post/2025-08-26-what-are-metrics-in-opentelemetry/view)

---

*Want unified traces + metrics + logs today, and an on-ramp for profiles tomorrow? Send your OpenTelemetry data to OneUptime and be ready for the next signal without re‑instrumenting.*

# How to Measure the Latency Cost of PII Redaction in Streaming LLM Gateways

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, PII, Monitoring, Python

Description: Separate PII detection, replacement, queueing, and stream-release delays to measure the real latency cost of redaction in LLM gateways.

A redaction benchmark that reports ten milliseconds per request can still hide a large increase in user-visible streaming latency. Queueing, model initialization, prompt size, and output buffering all matter. Measure the redactor as a stage inside the gateway, then measure when the client receives its first useful content.

Keep the privacy policy fixed while comparing implementations. Skipping detection on real requests changes the protection, so use synthetic or already approved data for any no-redaction baseline.

## Define the timing boundaries

For inbound text, record request admission, detector start, detector end, replacement completion, and provider dispatch. For output, record the first provider content event and the first content released to the client.

| Measurement | Calculation |
|---|---|
| Redaction queue delay | Detector start minus request admission |
| Detection time | Detector end minus detector start |
| Replacement time | Replacement completion minus detector end |
| Pre-provider elapsed time | Provider dispatch minus request admission |
| Gateway output hold time | First released content minus first provider content |
| Client time to first content | First client content minus client request start |

A response header, heartbeat, or empty streaming delta is not useful answer content. Define the event that counts and use it consistently across runs.

Use a monotonic performance clock for durations within one process. Python's `perf_counter_ns()` avoids floating-point precision loss for these measurements. Do not subtract raw monotonic timestamps from different machines; correlate their spans and measure each duration locally. [Python performance-counter documentation](https://docs.python.org/3/library/time.html#time.perf_counter_ns).

## Instrument the redaction stage

This runnable fixture separates queue, detection, and replacement timing. Its detector handles one synthetic marker only:

```python
from time import perf_counter_ns

MARKER = "SYNTHETIC_PRIVATE_VALUE"

def redact_fixture(text, admitted_ns):
    started = perf_counter_ns()
    matches = []
    position = 0
    while (position := text.find(MARKER, position)) >= 0:
        matches.append((position, position + len(MARKER)))
        position += len(MARKER)
    detected = perf_counter_ns()
    cleaned = text
    for start, end in reversed(matches):
        cleaned = cleaned[:start] + "[REMOVED]" + cleaned[end:]
    finished = perf_counter_ns()
    timings = {
        "queue_ms": (started - admitted_ns) / 1_000_000,
        "detect_ms": (detected - started) / 1_000_000,
        "replace_ms": (finished - detected) / 1_000_000,
        "input_chars": len(text),
        "match_count": len(matches),
    }
    return cleaned, timings

admitted = perf_counter_ns()
cleaned, timings = redact_fixture("Send " + MARKER, admitted)
assert MARKER not in cleaned
assert all(timings[key] >= 0 for key in ("queue_ms", "detect_ms", "replace_ms"))
print(timings)
```

In an asynchronous gateway, capture admission before placing work on the redaction worker queue. Time the actual worker execution separately. Measuring only the function body misses queue saturation, while measuring only the whole request makes provider delays look like redaction delays.

Initialize the real detector outside the steady-state request loop. Presidio's analyzer loads an NLP engine and combines recognizers, so model selection and configured recognizers belong in the benchmark metadata. Report cold-start results separately from warmed-worker results. [Presidio Analyzer architecture](https://presidio.dataprivacystack.org/analyzer/).

## Compare distributions under representative load

Create synthetic workloads grouped by input length, language, entity density, and payload shape. Include tool results and long conversation histories, not only short user messages. Record detector version, model version, worker count, CPU limits, and concurrency.

Measure p50, p95, and p99 at several arrival rates. A low median with rising queue delay usually calls for capacity or concurrency investigation before detector optimization. Include timeout and rejection counts so the fastest requests are not the only ones that survive into your latency chart.

Compare paired requests or randomized interleaved runs. Do not subtract one run's p95 from another run's p95 and call the result the per-request overhead: those quantiles can represent different requests. Report stage latency directly and use end-to-end comparisons to assess user impact.

## Account for streaming output checks

Input redaction delays provider dispatch. Output redaction can delay release repeatedly. If an email address is split across chunks, a detector that scans each chunk independently may miss it. A rolling buffer requires an explicit release rule; a fixed overlap is not a universal guarantee for arbitrary sensitive values.

For a policy requiring complete inspection before release, buffer the complete answer or use a detector with a documented safe streaming contract. Record time spent waiting for additional text separately from detector execution. Include the final stream segment and cancellation path in the tests.

Provider content filtering is another stage with different semantics. Azure documents asynchronous filtering that can return content before filtering annotations arrive; it is not equivalent to a gateway PII redaction guarantee. Its default streaming behavior also needs final-segment evaluation for applications with strict release requirements. [Azure OpenAI content streaming](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/content-streaming?view=foundry-classic).

## Set a useful latency budget

Define budgets for redaction queueing, detector execution, and client time to first content. Keep bounded labels such as payload-size bucket, language, policy version, and outcome; never use detected values as metric dimensions.

When the budget regresses, inspect stage timings first. More queue time suggests saturation; more detection time suggests input or model changes; more release time suggests buffering. Optimize the responsible stage, then rerun the detector-quality corpus alongside the latency workload. Faster processing is useful only when the tested privacy behavior still holds.

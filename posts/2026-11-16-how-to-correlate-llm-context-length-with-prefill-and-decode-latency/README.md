# How to Compare LLM Prefill and Decode Latency by Context Length

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM, Observability, Performance, Monitoring

Description: Separate prompt processing, queueing, and token decoding to explain how context length changes LLM latency.

A longer conversation often takes longer to answer, but its length alone does not identify the bottleneck. The request might wait for a worker, process a large uncached prompt, contend for memory during decoding, or spend more time producing a longer answer. Each explanation suggests a different fix.

Build the investigation around request-level measurements, then run a controlled experiment. A dashboard containing separate prompt-length and latency histograms cannot tell you which long prompt produced which slow response.

## Define the phases you can actually observe

For a self-hosted server, record queue time, prefill time, decode time, prompt tokens, generated tokens, cache reuse, and deployment identity. The [vLLM metrics documentation](https://docs.vllm.ai/en/latest/design/metrics/) lists request prefill, decode, queue, and time-to-first-token histograms. Check the metrics exposed by your deployed version before constructing queries.

For a hosted API, you generally see request start, first output, and completion. Those boundaries include network and scheduling effects. Call the resulting metric client-observed time to first text; do not rename it prefill latency without a server measurement.

Use token counts for the exact rendered request, including instructions, tool schemas, conversation history, and tool results. A configured context-window maximum is a capacity limit, not the number of tokens processed in a particular request.

## Collect one row per attempt

A useful experiment record looks like this. The field names are an application schema rather than provider API fields:

```json
{
  "experiment": "context-sweep-v1",
  "attempt_id": "a-0081",
  "model_revision": "deployment-pinned-revision",
  "prompt_tokens": 8192,
  "cached_input_tokens": 0,
  "generated_tokens": 256,
  "concurrency": 1,
  "queue_ms": 4.1,
  "prefill_ms": 214.7,
  "decode_ms": 2310.0,
  "first_text_ms": 235.4,
  "outcome": "completed"
}
```

Store null for unavailable timing fields. A fabricated zero queue time makes hosted and self-hosted results appear more comparable than they are. Keep retries as separate rows and associate them with one logical request ID.

Record warmup status, cache policy, hardware, quantization, scheduler settings, and output settings in an experiment manifest. Avoid treating these as unbounded metric labels. They belong in the trace or analysis dataset.

## Change one factor at a time

Choose several prompt sizes within the model's supported limit. Construct representative prompts with the same task and varied supporting material. Record actual token counts after serialization; a repeated character string is a poor substitute for realistic documents.

Keep the output target stable and record actual output length. An output cap alone does not force the model to generate that many tokens. Analyze a narrow output-length band or use a serving benchmark that controls generation length when available.

Run each size repeatedly in randomized order. First use one in-flight request, then repeat at realistic concurrency. This separates an individual request's context cost from system saturation. Mark initial warmup requests rather than quietly mixing them with steady-state samples.

Run cache-cold and cache-warm groups separately. [OpenAI's prompt caching guide](https://developers.openai.com/api/docs/guides/prompt-caching) explains that reuse depends on a matching prefix and compatible settings. Record reported cached input rather than assuming that repeating a prompt guarantees a hit.

## Compare conditional distributions

The following standalone Python helper creates simple latency summaries from JSON Lines experiment records. It excludes unsuccessful requests and retains sample counts:

```python
import json
from collections import defaultdict
from statistics import median

buckets = defaultdict(list)
with open("context-experiment.jsonl") as stream:
    for line in stream:
        row = json.loads(line)
        if row["outcome"] != "completed":
            continue
        key = (
            row["concurrency"],
            row["prompt_tokens"] // 2048,
            row["cached_input_tokens"] > 0,
        )
        buckets[key].append(row)

for key, rows in sorted(buckets.items()):
    summary = {"group": key, "requests": len(rows)}
    for field in ("queue_ms", "prefill_ms", "decode_ms"):
        values = [r[field] for r in rows if r.get(field) is not None]
        summary[field] = median(values) if values else None
    print(summary)
```

For production analysis, add percentile intervals and output-length stratification. Do not subtract a queue p95 from a first-token p95: the two percentile values may describe different requests. Subtract durations within each request before aggregating.

## Interpret the shape before changing the system

If prefill increases with uncached prompt length while queue time stays flat, reduce redundant input or improve prefix reuse. If queue time grows only under concurrency, investigate admission control and serving capacity. If decode duration grows, first check generated-token count; then compare similar output sizes and inspect memory pressure and scheduling.

Long contexts can affect both prefill and decode. Avoid asserting a universal linear or quadratic latency formula from architecture alone: kernels, batching, caching, and workload shape change measured behavior.

Finally, repeat the same experiment after an optimization and check answer quality. Trimming context may produce a faster answer by removing the evidence needed to answer correctly. A successful change reduces the relevant phase at comparable workload and quality, with enough samples to distinguish the effect from noise.

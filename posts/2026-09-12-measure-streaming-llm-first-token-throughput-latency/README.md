# Measure Streaming LLM First Token, Throughput, and Total Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LLM Observability, Observability, OpenTelemetry, Python, Monitoring

Description: Measure streaming LLM responsiveness without confusing chunks with tokens, metadata with output, or provider timing with browser delivery.

A streaming model can have a fast first response and still feel slow. It can also produce a slow first visible word while emitting metadata immediately. One latency measurement cannot describe both experiences.

Define the measurement boundaries before building a dashboard. For a user-facing assistant, time to first visible text, time to last visible text, completion time, and delivery time each answer a different question.

## Name Each Clock Boundary

Use a monotonic clock for durations inside one process. Wall clocks are useful for timestamps, but clock adjustments make them unsuitable for measuring elapsed time. Python provides `time.perf_counter()` for high-resolution duration measurements. [Python time functions](https://docs.python.org/3/library/time.html#time.perf_counter).

Record these moments:

| Moment | Meaning |
|---|---|
| Request start | Application begins the model attempt |
| First content | First non-empty text accepted for display |
| Last content | Last displayable text received |
| Stream completion | Provider stream terminates normally |
| Client delivery | Application finishes forwarding the response |

Call the first-content duration `time_to_first_text` if that is what you actually measure. A content chunk can contain several tokens. A provider's first-token timestamp, an HTTP first byte, and your first text chunk are not interchangeable.

Reasoning blocks, tool argument deltas, keepalives, and role metadata require separate handling. Some responses correctly contain no visible text because they request a tool. Record the output kind rather than assigning a zero first-text latency.

## Separate Timing from Provider Parsing

Normalize provider events in an adapter, then feed timing observations into a small accumulator. The code below is original application logic; it does not assume a particular provider SDK.

```python
from dataclasses import dataclass


@dataclass
class StreamTiming:
    start: float
    first_text: float | None = None
    last_text: float | None = None
    text_chunks: int = 0

    def observe_text(self, text, now):
        if not text:
            return
        if self.first_text is None:
            self.first_text = now
        self.last_text = now
        self.text_chunks += 1

    def finish(self, now, output_tokens=None):
        total = now - self.start
        return {
            "time_to_first_text_seconds": (
                None if self.first_text is None
                else self.first_text - self.start
            ),
            "total_seconds": total,
            "text_chunk_count": self.text_chunks,
            "output_tokens_per_total_second": (
                output_tokens / total
                if output_tokens is not None and total > 0 else None
            ),
        }
```

Observe events immediately when your application receives them, before a slow rendering or forwarding function runs. Otherwise consumer backpressure becomes part of the interarrival measurement. Keep provider reception and client delivery timing separate when buffering or queueing sits between them.

Do not collect one span event for every token at scale. Keep a few milestones and aggregate gap statistics. A bounded maximum gap or count of long gaps often reveals a stalled stream without producing enormous traces.

## Count Tokens from Usage, Not Chunks

A chunk is a transport or framework event, not a tokenizer unit. Counting chunks underestimates or overestimates tokens depending on batching, buffering, model output, and SDK behavior. Character-based estimates have a different limitation: tokenization depends on the model and content.

Prefer the provider's final usage when available. Preserve an estimate separately when the stream ends before usage arrives. In Anthropic streams, usage values in `message_delta` events are cumulative, so adding every value would overcount. Other adapters must follow their provider's documented semantics. [Anthropic streaming messages](https://platform.claude.com/docs/en/build-with-claude/streaming).

LangGraph's messages stream carries message chunks and metadata. It is useful for observing displayable output, but the number of emitted tuples is not a reliable token count. [LangGraph streaming](https://docs.langchain.com/oss/python/langgraph/streaming).

## Make Throughput Formulas Honest

`output_tokens / total_seconds` measures output tokens per full request second. It includes initial waiting time and is useful for comparing the total cost of serving a response. Label it accordingly.

A generation-phase throughput measure uses the interval after output begins. That measure requires knowing which tokens belong to the interval. Dividing all billed output tokens by `last_text - first_text` can inflate results: the first chunk may already contain several tokens, and billed output may include reasoning or tool arguments that are absent from the text stream.

When exact per-token timing is unavailable, publish an explicitly approximate generation rate or retain the full-request rate. Do not report infinity for one-chunk responses. A missing or unsuitable interval should produce no throughput value, with a count explaining the excluded responses.

## Preserve Aborts and Partial Responses

Record terminal outcomes such as completed, provider error, client disconnect, deadline, and cancelled. Keep first-text latency for partial responses if it was observed, but do not mix their total durations into the successful completion distribution without a label.

Use low-cardinality dimensions such as model, feature, output kind, and outcome. Group latency histograms by request class or response-size bucket where that improves comparisons. A longer requested answer should not automatically be interpreted as a serving regression.

Test a delayed first text, empty metadata chunks, a single text chunk, multiple chunks, a tool-only response, and a stream that raises an exception. Assert that empty chunks do not start the clock and missing usage stays missing. Then test through the actual proxy and browser path, because buffering outside the model client can dominate user-visible responsiveness.

## Conclusion

Measure visible text, stream completion, and client delivery separately. Use provider usage for tokens and explicit formulas for throughput so your dashboard reflects what the application can actually observe.

## Official Documentation

- [Python monotonic performance counter](https://docs.python.org/3/library/time.html#time.perf_counter)
- [LangGraph streaming](https://docs.langchain.com/oss/python/langgraph/streaming)
- [Anthropic streaming event and usage semantics](https://platform.claude.com/docs/en/build-with-claude/streaming)

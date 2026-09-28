# Validation Summary: Instrument Queueing and Processing Time Separately in Asynchronous Traces

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python: `queue.SimpleQueue`, wall-clock and monotonic nanosecond timestamps.
- OpenTelemetry Python API and SDK, span context, explicit timestamps, and console export.
- Asynchronous messaging, queue residence, retries, acknowledgments, and distributed tracing.
- W3C Trace Context and histogram metrics.

## Sources Consulted
- Python time reference: https://docs.python.org/3/library/time.html
- Python queue reference: https://docs.python.org/3/library/queue.html
- OpenTelemetry Python trace API: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry Python span export API: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry tracing specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry messaging span conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Python propagation: https://opentelemetry.io/docs/languages/python/propagation/
- W3C Trace Context header specification: https://www.w3.org/TR/trace-context/#traceparent-header
- OpenTelemetry histogram API: https://opentelemetry.io/docs/specs/otel/metrics/api/#histogram
- OpenTelemetry metric cardinality limits: https://opentelemetry.io/docs/specs/otel/metrics/sdk/#cardinality-limits
- Amazon SQS visibility timeout and redelivery behavior: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Amazon SQS queue age, backlog, and operation count metrics: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The test guidance claimed that only a backlog can increase queue wait without increasing handler duration. That is too broad: retries can add waiting, and slow handlers can cause subsequent jobs to wait. Replaced the exclusive claim with the expected behavior of an isolated backlog test and clarified those additional effects. No code changes were necessary.

## Review Notes
- Executed the exact Python snippet successfully in an isolated environment using Python 3.13.1 and OpenTelemetry API/SDK 1.45.0. Parsed console output and verified three spans, a shared trace ID, both child spans referencing the submission span, explicit historical waiting timestamps, and a queue wait of approximately 21.1 ms for the deliberate 20 ms delay. The example requires no backend.
- The code uses documented, non-deprecated APIs. Ending the parent span does not invalidate its context for later children. Custom span names and the application attribute are correctly distinguished from standardized messaging instrumentation.
- Monotonic elapsed time and Unix timeline timestamps serve different purposes. The waiting attribute is resistant to wall-clock adjustments; the explicitly wall-clock-based span duration can still differ from it if the system clock changes. This is a limitation of the displayed timeline, not of the monotonic measurement.
- The local example measures residence through dequeue, with small timestamp and instrumentation overhead. Synchronous console export also affects the demonstration's scheduling, so the sleeps are not exact expected durations. Exporting the retrospective waiting span happens before processing begins.
- Confirmed that SimpleQueue has no capacity wait, bounded Queue.put can block, propagators carry tracing identity separately from application timestamps, and links can correlate separate traces. Cross-host monotonic subtraction is inappropriate.
- Histograms and bounded metric dimensions are appropriate. Broker metrics remain necessary for messages that never reach a consumer. Retry, age, and count semantics depend on the broker; operation counts need not equal unique job counts.
- All links in the post resolved to the intended resources, including the author profile redirect. There are no terminal commands, configuration snippets, or explicit version claims to correct. Distributed broker scenarios were reviewed against documentation rather than executed; the runnable example is intentionally local.

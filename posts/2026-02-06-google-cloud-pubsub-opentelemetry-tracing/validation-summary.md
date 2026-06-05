# Validation Summary: How to Use Google Cloud Pub/Sub with OpenTelemetry Tracing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- OpenTelemetry tracing
- OpenTelemetry Python SDK and propagation APIs
- Python
- OTLP trace export
- W3C Trace Context

## Sources Consulted
- Google Cloud Pub/Sub Python client library documentation: https://docs.cloud.google.com/python/docs/reference/pubsub/latest
- Google Cloud Pub/Sub publishing documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub dead-letter topic documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Python propagation API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry Python propagation guide: https://opentelemetry.io/docs/languages/python/propagation/

## Issues Found
- The prerequisites listed Python 3.9+, but the current Google Cloud Pub/Sub Python client documentation marks Python <= 3.9 as unsupported and lists Python >= 3.10 as supported. Updated the prerequisite to Python 3.10+.
- The tracing resource included `messaging.system`, which is a messaging span attribute rather than a resource attribute. Removed it from the shared resource configuration.
- The examples used older or non-current messaging attributes such as `messaging.operation` and `messaging.message.payload_size_bytes`. Updated them to current OpenTelemetry messaging attributes: `messaging.operation.name`, `messaging.operation.type`, and `messaging.message.body.size`.
- The batch publishing example set `messaging.batch.message_count` on spans that each described a single message. Removed that attribute because the OpenTelemetry messaging semantic conventions say it should not be set for single-message operations.
- The subscriber example described and implemented the consumed span as a child of the publisher span. Current OpenTelemetry messaging semantic conventions recommend linking consumer processing spans to the message creation context across asynchronous messaging boundaries. Updated the subscriber and dead-letter examples to create span links from the extracted context.
- The subscriber exception handler set span status and recorded exceptions after the `with` block had already ended the span. Moved the error handling inside the span context manager so `set_status` and `record_exception` run while the span is still recording.

## Review Notes
- The Pub/Sub publisher and subscriber client usage is consistent with official Python client examples: `PublisherClient.publish()` accepts bytes data plus string attributes, and `SubscriberClient.subscribe()` accepts a callback.
- Pub/Sub message attributes are suitable for W3C trace context keys because Pub/Sub attributes are string key-value metadata.
- Dead-letter routing is correctly described as approximate and handled by Pub/Sub after repeated failed delivery attempts, though production code should also account for required dead-letter IAM permissions.

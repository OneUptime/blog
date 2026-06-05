# Validation Summary: How to Instrument Google Cloud Pub/Sub with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Google Cloud Pub/Sub
- OpenTelemetry Python SDK
- OpenTelemetry context propagation
- OpenTelemetry messaging semantic conventions
- OpenTelemetry metrics
- OpenTelemetry Collector
- OTLP exporter
- W3C Trace Context

## Sources Consulted
- Google Cloud Pub/Sub Python publisher client reference: https://docs.cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.publisher.client.Client
- Google Cloud Pub/Sub Python subscriber message reference: https://docs.cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.subscriber.message.Message
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry semantic conventions for messaging systems: https://opentelemetry.io/docs/specs/semconv/messaging/
- OpenTelemetry semantic conventions for messaging spans: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry semantic conventions for Google Cloud Pub/Sub: https://opentelemetry.io/docs/specs/semconv/messaging/gcp-pubsub/
- OpenTelemetry semantic conventions for messaging client metrics: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-metrics/
- OpenTelemetry metric unit guidance: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- Google Cloud OpenTelemetry Collector configuration examples: https://docs.cloud.google.com/stackdriver/docs/instrumentation/opentelemetry-collector-cos

## Issues Found
- The span examples used the old `messaging.operation` attribute. Current OpenTelemetry messaging semantic conventions use `messaging.operation.name` and `messaging.operation.type`, so the publisher, subscriber, and dead-letter examples were updated to use those attributes.
- The publisher example used `publish` as the messaging operation value. Google Cloud Pub/Sub semantic conventions define `send` for publishing operations, so the publisher span now uses `messaging.operation.name: send` and `messaging.operation.type: send`.
- The subscriber examples did not include the Pub/Sub subscription attribute. The current Pub/Sub conventions recommend `messaging.destination.subscription.name`, so the normal and dead-letter subscriber spans now set it.
- The dead-letter example used `messaging.delivery_attempt`. Pub/Sub-specific delivery attempts are represented by `messaging.gcp_pubsub.message.delivery_attempt`, so the attribute was corrected and normalized to `0` when Pub/Sub does not provide a delivery attempt value.
- The error path set the span status and exception event but did not set `error.type`, which is conditionally required by current messaging semantic conventions when the operation fails. The subscriber example now records `error.type` from the exception class name.
- The message counter metric used `messages` as its unit. OpenTelemetry unit guidance recommends UCUM units and curly-brace annotations for counts of things, so the counter now uses `{message}`.
- The Collector configuration used the `resourcedetection` processor without noting that this processor is not present in every Collector distribution. The wording now says the example requires a Collector distribution that includes `resourcedetection`.

## Review Notes
All Python code fences were parsed successfully with Python 3 after the corrections. The code remains tutorial-style and assumes the placeholder functions such as `init_telemetry`, `handle_order_event`, and `store_failed_message` are supplied by the surrounding application.

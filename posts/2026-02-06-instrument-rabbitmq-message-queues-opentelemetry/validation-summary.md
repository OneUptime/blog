# Validation Summary: How to Instrument RabbitMQ Message Queues with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- RabbitMQ
- AMQP
- Node.js
- amqplib
- @opentelemetry/instrumentation-amqplib
- Python
- pika
- opentelemetry-instrumentation-pika
- OpenTelemetry Collector Contrib
- OTLP

## Sources Consulted
- OpenTelemetry JS amqplib instrumentation README: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-amqplib
- OpenTelemetry JS API package definitions for `SpanStatusCode`: https://github.com/open-telemetry/opentelemetry-js/tree/main/api
- OpenTelemetry JS resources package definitions for `resourceFromAttributes`: https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-resources
- OpenTelemetry Python Pika instrumentation source and docs: https://github.com/open-telemetry/opentelemetry-python-contrib/tree/main/instrumentation/opentelemetry-instrumentation-pika
- OpenTelemetry Python manual instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Collector Contrib RabbitMQ receiver docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/rabbitmqreceiver
- OpenTelemetry Collector Contrib RabbitMQ receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/rabbitmqreceiver/metadata.yaml
- RabbitMQ Management Plugin docs: https://www.rabbitmq.com/docs/management
- amqplib channel API docs: https://amqp-node.github.io/amqplib/channel_api.html
- Pika API docs: https://pika.readthedocs.io/

## Issues Found
- The Node.js tracing setup used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JS resources exports `resourceFromAttributes()` for constructing resources, so the example was updated to use that function.
- The Node.js examples used numeric status codes directly. They were changed to import and use `SpanStatusCode.OK` and `SpanStatusCode.ERROR` from `@opentelemetry/api`.
- The Node.js consumer created the application processing span with `tracer.startSpan()`, which does not make the new span active. It was updated to `tracer.startActiveSpan()` so it is parented to the active consume span established by the amqplib instrumentation.
- The text described amqplib consumer spans as always linked to the producer span. The current instrumentation continues the trace by default and uses links only when `useLinksForConsume` is enabled, so the explanation was corrected.
- The trace timeline and related wording called the consumer instrumentation span a `deliver` span. The amqplib instrumentation creates a consumer `process` span, so the wording and diagram label were updated.
- The Python consumer imported `trace` only to access `StatusCode`. It was updated to import `StatusCode` from `opentelemetry.trace` directly and use that API explicitly.
- The metrics section described the RabbitMQ receiver as scraping queue metrics only. The current Collector Contrib docs describe the receiver as reading RabbitMQ management API metrics, with queue message counters included in receiver metadata, so the wording was broadened.
- A misleading Node.js hook comment said it captured message payloads. The hook only added routing and destination attributes, so the comment was corrected.

## Review Notes
The RabbitMQ receiver is part of the OpenTelemetry Collector Contrib distribution, not necessarily the core Collector binary. The amqplib instrumentation documents older and stable semantic-convention behavior, so future post updates may need to revisit attribute names as OpenTelemetry JS changes defaults.

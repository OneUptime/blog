# Validation Summary: How to Compare OpenTelemetry vs Elastic APM for Application Tracing

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- OpenTelemetry Django instrumentation
- OpenTelemetry Collector
- Elastic APM
- Elastic APM Python agent
- APM Server
- Elasticsearch
- Kibana
- Distributed tracing
- Tail-based and head-based sampling

## Sources Consulted
- Elastic APM Python agent configuration: https://www.elastic.co/docs/reference/apm/agents/python/configuration
- Elastic APM Python Django support: https://www.elastic.co/docs/reference/apm/agents/python/django-support
- Elastic APM Python agent API reference: https://www.elastic.co/guide/en/apm/agent/python/current/api.html
- Elastic OpenTelemetry intake API: https://www.elastic.co/docs/solutions/observability/apm/opentelemetry-intake-api
- Elastic transaction sampling documentation: https://www.elastic.co/docs/solutions/observability/apm/transaction-sampling
- Elastic APM Server tail-based sampling documentation: https://www.elastic.co/docs/solutions/observability/apm/apm-server/tail-based-sampling
- Elastic APM transaction model documentation: https://www.elastic.co/guide/en/apm/server/current/transaction-indices.html
- Elastic APM data streams documentation: https://www.elastic.co/guide/en/apm/guide/current/apm-data-streams.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Django instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/django/django.html
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md

## Issues Found
- The post said APM Server handles sampling decisions generally. Elastic agents make head-based sampling decisions, while APM Server can apply tail-based sampling when configured. Updated the architecture section to distinguish those responsibilities.
- The post described Elastic APM as a strict two-tier data model and said transactions and spans are stored in separate indices. Current Elastic documentation describes transactions as a special kind of span, and current APM storage uses trace data streams with transaction and span documents/fields. Updated the data model and storage wording.
- The Elasticsearch example was fenced as JSON but included a JavaScript-style comment, which is invalid JSON. Moved the comment into prose and left the query as valid JSON.
- The OTel Collector-to-Elastic snippet referenced an OTLP receiver and batch processor without defining them. Added minimal `receivers` and `processors` blocks.
- The EDOT description oversimplified EDOT as just an OTel SDK preconfigured for Elastic. Updated it to cover Elastic-supported SDK and Collector distributions.
- The post said Elastic APM's built-in sampling is head-based only. Current Elastic documentation includes APM Server tail-based sampling support. Updated the sampling section accordingly.

## Review Notes
The examples remain intentionally illustrative and omit application imports such as `JsonResponse` and business functions like `validate_cart_items`; that is acceptable for the article's comparison-focused scope. Elastic's current documentation notes that direct OTLP intake on APM Server is not recommended for new users compared with EDOT Collector or managed OTLP, so future revisions could call that out if the post becomes a deployment guide.

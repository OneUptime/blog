# Validation Summary: How to Instrument Webhook Delivery and Retry Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python tracing
- OpenTelemetry Python metrics
- OpenTelemetry semantic conventions
- HTTPX async client
- Python HMAC signing
- Webhook retry pipelines

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python trace span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- HTTPX async support documentation: https://www.python-httpx.org/async/
- HTTPX timeout documentation: https://www.python-httpx.org/advanced/timeouts/
- HTTPX exception documentation: https://www.python-httpx.org/exceptions/
- Python hmac standard library documentation: https://docs.python.org/3/library/hmac.html

## Issues Found
- The webhook sender used the deprecated `http.status_code` OpenTelemetry semantic attribute. Changed it to `http.response.status_code` on both the span and metric attributes.
- The `webhooks.delivery.response_size` histogram was created but never recorded. Added a `delivery_response_size.record(...)` call using `len(response.content)`.
- The response size histogram used `bytes` as the unit. Changed it to `By`, which follows OpenTelemetry's UCUM unit recommendation for bytes.
- The retry example referenced `meter` and `WebhookSender` without defining or importing them. Added `metrics.get_meter("webhooks.retry")` and imported `WebhookSender` from the sender module.
- The retry example called `_move_to_dead_letter()` but did not define it. Added a minimal method that delegates to `queue.dead_letter(webhook)`.
- The section described exponential backoff, but the retry delays were not exponential. Updated the example delays to double each attempt.
- The endpoint health example referenced `_get_endpoint_stats()` and `_disable_endpoint()` without defining them. Added minimal in-memory implementations so the snippet is internally complete.
- The final paragraph claimed traces link each delivery attempt together, but the code does not propagate or link trace context across queued retry attempts. Reworded the claim to say spans record each delivery attempt.

## Review Notes
- The examples are now syntactically consistent as illustrative snippets. A production webhook system should persist endpoint health and dead-letter state instead of using the in-memory placeholders shown here.
- Endpoint URLs can be high-cardinality and may contain sensitive data. In production telemetry, consider recording a stable endpoint ID or sanitized URL instead of the full endpoint URL.

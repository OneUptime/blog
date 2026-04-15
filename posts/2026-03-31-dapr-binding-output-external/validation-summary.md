# Validation Summary: How to Use Dapr Output Bindings to Interface with External Systems

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Output Bindings API
- AWS S3 binding (`bindings.aws.s3`)
- Apache Kafka binding (`bindings.kafka`)
- Redis binding (`bindings.redis`)
- PostgreSQL binding (`bindings.postgresql`)
- HTTP binding (`bindings.http`)
- SMTP binding (`bindings.smtp`)
- Twilio SMS binding
- Python (requests library)
- TypeScript (fetch API)

## Sources Consulted
- Dapr Bindings API Reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr AWS S3 Binding Spec: https://docs.dapr.io/reference/components-reference/supported-bindings/s3/
- Dapr Kafka Binding Spec: https://docs.dapr.io/reference/components-reference/supported-bindings/kafka/
- Dapr Redis Binding Spec: https://docs.dapr.io/reference/components-reference/supported-bindings/redis/
- Dapr PostgreSQL Binding Spec: https://docs.dapr.io/reference/components-reference/supported-bindings/postgres/
- Dapr HTTP Binding Spec: https://docs.dapr.io/reference/components-reference/supported-bindings/http/
- Dapr SMTP Binding Spec: https://docs.dapr.io/reference/components-reference/supported-bindings/smtp/
- Dapr Twilio SMS Binding Spec: https://docs.dapr.io/reference/components-reference/supported-bindings/twilio/

## Issues Found
1. **PostgreSQL binding invocation passed `sql` and `params` in the `data` field instead of `metadata`**: In the TypeScript example under "Sending to Multiple External Systems", the PostgreSQL `exec` call passed `{sql: "...", params: [...]}` as the `data` argument. According to the Dapr PostgreSQL binding documentation, `sql` and `params` must be provided in the `metadata` field of the binding invocation request, not in `data`. Fixed by moving `sql` and `params` to the metadata argument and serializing `params` as a JSON string, which is the format Dapr expects.

## Review Notes
- The HTTP binding actually supports more operations than just `create` (it also supports `get`, `head`, `post`, `put`, `patch`, `delete`, `options`, `trace`). The post's claim that it supports `create` mapped to HTTP POST is not wrong, but is a simplification. This is acceptable for a tutorial focused on output bindings basics.
- The Twilio SMS binding field names (`toNumber`, `body`) are correct. A real component would also need `fromNumber`, `accountSid`, and `authToken` in its component YAML, but since only the invocation is shown, this is fine.
- All component YAML structures, API endpoints, request body schemas, and binding operation lists are accurate.

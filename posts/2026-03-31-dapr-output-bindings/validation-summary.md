# Validation Summary: How to Use Dapr Output Bindings to Call External Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (output bindings building block)
- AWS S3 (via `bindings.aws.s3`)
- Twilio SendGrid (via `bindings.twilio.sendgrid`)
- Apache Kafka (via `bindings.kafka`)
- PostgreSQL (via `bindings.postgresql`)
- Python (`requests` library)
- Go (standard library `net/http`, `encoding/json`)

## Sources Consulted
- Dapr Bindings Overview: https://docs.dapr.io/developing-applications/building-blocks/bindings/bindings-overview/
- Dapr Bindings How-To: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-bindings/
- Dapr S3 Binding Reference: https://docs.dapr.io/reference/components-reference/supported-bindings/s3/
- Dapr PostgreSQL Binding Reference: https://docs.dapr.io/reference/components-reference/supported-bindings/postgresql/
- Dapr Kafka Binding Reference: https://docs.dapr.io/reference/components-reference/supported-bindings/kafka/
- Dapr SendGrid Binding Reference: https://docs.dapr.io/reference/components-reference/supported-bindings/sendgrid/
- Dapr Bindings API Reference: https://docs.dapr.io/reference/api/bindings_api/

## Issues Found

1. **Unused `import base64` in Python example** — The `base64` module was imported but never used anywhere in the Python code. Removed the unused import.

2. **Kafka binding used `topics` instead of `publishTopic`** — The Kafka output binding component YAML used `topics` as the metadata key for specifying the target topic. Per the Dapr Kafka binding docs, `topics` is the metadata key for input (consumer) bindings. For output (producer) bindings, the correct key is `publishTopic`. Changed `topics` to `publishTopic` in the Kafka component YAML.

3. **PostgreSQL binding used `url` instead of `connectionString`** — The PostgreSQL binding component YAML used `url` as the metadata key for the database connection string. Per the Dapr PostgreSQL binding docs, the correct metadata key is `connectionString`. Changed `url` to `connectionString`.

4. **PostgreSQL `exec` operation passed SQL in `data` instead of `metadata`** — The PostgreSQL example passed a dict with `sql` and `params` keys in the `data` field. Per the Dapr PostgreSQL binding docs, the `exec` operation expects `sql` and `params` in the request `metadata`, not in `data`. Additionally, `params` should be a JSON-encoded string of an array, not a native array. Fixed the call to use `metadata` with the correct format.

5. **Go example missing `defer resp.Body.Close()`** — The Go `invokeBinding` function did not close the HTTP response body, causing a resource leak. Added `defer resp.Body.Close()` after the error check.

## Review Notes
- The `direction` metadata field in binding component YAML is valid and recommended per current Dapr docs. It helps the sidecar avoid waiting for the app to become ready when only output bindings are configured.
- The Go example ignores the error return from `json.Marshal`. This is acceptable for simple structs that are guaranteed to be serializable, but production code should handle this error.
- The Kafka Python example passes a dict as the `data` value to `publish_to_kafka`. Since `requests.post(url, json=payload)` serializes the entire payload, this works — Dapr will receive the JSON-encoded dict. However, a note that Dapr will receive the data as a JSON object (not a string) could be helpful for readers.

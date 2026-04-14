# Validation Summary: How to Use Dapr Pub/Sub with CloudEvents Metadata

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block
- CloudEvents specification (v1.0)
- Dapr HTTP API for publishing
- Dapr Python SDK (`dapr-client`)
- Node.js / Express (subscriber example)
- Go (subscriber example)
- Apache Kafka (as pub/sub component)

## Sources Consulted
- Dapr CloudEvents documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Pub/Sub How-To guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- CloudEvents specification: https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
- Dapr Python SDK source and documentation

## Issues Found

### 1. Wrong prefix for CloudEvents metadata headers: `ce-` changed to `ce_`
**What was wrong:** The post used `ce-` (dash) as the prefix for custom CloudEvents extension attributes in HTTP headers (e.g., `ce-correlationid`). Dapr uses `ce_` (underscore) as the prefix, consistent with the CloudEvents HTTP protocol binding specification.
**What was changed:** Replaced all instances of `ce-` prefix with `ce_` in curl commands, text references, and the summary section.

### 2. Missing `traceparent` and `tracestate` fields in the standard fields table
**What was wrong:** The table of standard CloudEvents fields included `traceid` but omitted `traceparent` and `tracestate`, which Dapr also includes in every CloudEvent envelope. Both `traceparent` and `traceid` contain the same W3C Trace Context value.
**What was changed:** Added `traceparent` (W3C Trace Context parent ID) and `tracestate` (W3C Trace Context state) to the fields table.

### 3. Binary data example missing required CloudEvents headers
**What was wrong:** The binary data publishing example only included `Content-Type: application/octet-stream` and a custom `ce-imageid` header. When publishing in CloudEvents binary content mode, the required CloudEvents attributes (`ce_specversion`, `ce_type`, `ce_source`, `ce_id`) must be provided as transport metadata headers since there is no JSON envelope to carry them.
**What was changed:** Added the four required CloudEvents headers (`ce_specversion`, `ce_type`, `ce_source`, `ce_id`) to the binary data curl example, along with fixing the `ce-` to `ce_` prefix.

## Review Notes
- The Python SDK example uses `cloudevent.correlationid` and `cloudevent.environment` as `publish_metadata` keys to add custom extension attributes. The Dapr documentation explicitly lists only six `cloudevent.*` keys for overriding existing fields (id, source, type, traceid, tracestate, traceparent). Whether arbitrary `cloudevent.*` keys are supported for adding new extension attributes is not explicitly documented, though it is a commonly used pattern. This may warrant further testing.
- The fields table does not distinguish between standard CloudEvents 1.0 fields (`id`, `source`, `type`, `specversion`, `datacontenttype`, `time`) and Dapr-specific extension fields (`traceid`, `traceparent`, `tracestate`, `topic`, `pubsubname`). A future improvement could clarify this distinction.
- The subscriber code examples (Node.js and Go) access `event.correlationid` directly from the CloudEvents envelope body, which is correct when custom extensions are included as top-level fields in the JSON envelope.

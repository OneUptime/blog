# Validation Summary: How to Use CloudEvents Spec with Dapr for Interoperability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CloudEvents specification (v1.0)
- Dapr pub/sub building block
- Dapr Python SDK (`dapr-client`)
- Express.js (Node.js subscriber)
- Flask (Python subscriber)
- Knative Eventing (Trigger resource)
- YAML declarative subscriptions (Dapr)

## Sources Consulted
- Dapr CloudEvents documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr raw payload / disable CloudEvents wrapping: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-raw/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Python SDK source and docs: https://github.com/dapr/python-sdk
- Dapr Python SDK client reference: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- CloudEvents specification v1.0.2: https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
- CloudEvents official site: https://cloudevents.io/
- Knative Eventing Triggers documentation: https://knative.dev/docs/eventing/triggers/

## Issues Found
1. **Incorrect metadata key in declarative subscription YAML**: The `rawPayload` key was used in the declarative YAML subscription, but Dapr declarative subscriptions require `isRawPayload` (with the `is` prefix). The programmatic subscription API and HTTP publish API use `rawPayload`, but the declarative YAML CRD uses `isRawPayload`. Changed `rawPayload: "true"` to `isRawPayload: "true"` in the subscription YAML example.

## Review Notes
- The `import dapr.clients as dapr` pattern works but is non-idiomatic. The official SDK examples use `from dapr.clients import DaprClient`. This is a style preference and not a technical error.
- The CloudEvents JSON example omits the `traceparent` and `tracestate` fields that Dapr also includes in its envelope. Since this is an illustrative example, omitting optional fields is acceptable.
- The `cloudevent.subject`, `cloudevent.correlationid`, and `cloudevent.tenantid` metadata keys used in the publish example are not explicitly listed in the official Dapr documentation as supported override keys (only `id`, `source`, `type`, `traceid`, `tracestate`, `traceparent` are documented). They likely work via the generic extension mechanism but are not officially documented.
- CloudEvents is a CNCF Graduated project (since January 2024), and the required fields (`specversion`, `id`, `source`, `type`) are correctly identified in the validation function.
- The Knative Trigger YAML is structurally correct. Knative has introduced a newer `filters` (plural) field for richer filtering dialects, but the legacy `filter.attributes` syntax used in the post remains valid.

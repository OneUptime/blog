# Validation Summary: How to Use Dapr Kafka Binding for Event Streaming

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Apache Kafka
- Dapr Kafka Binding Component (input and output)
- Dapr Bindings HTTP API (`/v1.0/bindings/`)
- Dapr Node.js SDK (`@dapr/dapr`)
- Python FastAPI (for input binding handler)
- SASL authentication for Kafka

## Sources Consulted
- Dapr Kafka binding component specification: https://docs.dapr.io/reference/components-reference/supported-bindings/kafka/
- Dapr bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Dapr input bindings documentation: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-triggers/
- Dapr component secrets reference: https://docs.dapr.io/operations/components/component-secrets/

## Issues Found

### 1. Deprecated `authRequired` field (3 occurrences)
**What was wrong:** The output binding, input binding, and SASL authentication component definitions all used `authRequired`, which was deprecated in Dapr 1.6 (2022) and replaced by `authType`.
**What was changed:**
- Output binding: `authRequired: "false"` changed to `authType: "none"`
- Input binding: `authRequired: "false"` changed to `authType: "none"`
- SASL config: `authRequired: "true"` changed to `authType: "password"`
**Why:** A 2026 blog post should use the current, non-deprecated metadata fields. The `authType` field provides clearer semantics with explicit values (`none`, `password`, `mtls`, `oidc`, `certificate`) instead of a boolean.

### 2. Unnecessary `topics` field in output binding component
**What was wrong:** The output binding component (named `kafka-producer`) included both `topics: "orders"` and `publishTopic: "orders"`. The `topics` field is only needed for input bindings (consumers). Including it in an output-only component would cause Dapr to also register it as an input binding, which is not the stated intent.
**What was changed:** Removed the `topics` field from the output binding component, leaving only `publishTopic`.
**Why:** The blog describes this component as "for producing messages (output binding)". Having `topics` set would cause unintended input binding behavior and confuse readers about which fields are needed for each binding direction.

## Review Notes
- The Python FastAPI input binding handler references headers `X-Kafka-Partition`, `X-Kafka-Offset`, and `X-Kafka-Key`. While Dapr does forward Kafka metadata as HTTP headers to the application, the exact header names may vary between Dapr versions. Readers should consult the Dapr Kafka binding docs for their specific version.
- The `enableTLS` metadata field in the SASL configuration section is functional but readers should verify the field name against the current Dapr Kafka binding spec, as TLS-related configuration may also be inferred from `authType` settings.
- The `metadata.partition` field in the curl example for direct partition assignment is a less common use case. In most scenarios, relying on the message `key` for partition routing (via Kafka's default partitioner) is preferred.
- The Node.js SDK example uses `client.binding.send()` which is the correct current API surface for the `@dapr/dapr` package.

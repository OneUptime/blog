# Validation Summary: How to Migrate Between Pub/Sub Brokers in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (pub/sub building block, component model, subscription API)
- Apache Kafka (pub/sub broker, CLI tools)
- Azure Service Bus Topics (pub/sub broker)
- Azure CLI (`az servicebus`)
- Python (requests library for HTTP-based publishing)
- Kubernetes (kubectl for Dapr component management)

## Sources Consulted
- Dapr Pub/Sub API Reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Apache Kafka Component Reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Azure Service Bus Topics Component Reference — https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr Subscription Schema Reference — https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Azure Service Bus CLI Documentation — https://learn.microsoft.com/en-us/cli/azure/servicebus
- Confluent Kafka CLI Tools Documentation — https://docs.confluent.io/kafka/operations-tools/kafka-tools.html

## Issues Found

### 1. Incorrect publish payload wrapping in Python example (Line ~106)
- **What was wrong:** The Python code wrapped the order data in `{"data": order}` before publishing. The Dapr publish API expects the message content directly as the request body — Dapr automatically wraps it as a CloudEvent v1.0 envelope. The extra `{"data": ...}` wrapper would cause the published message to have an unnecessary nesting level.
- **What was changed:** Removed the `payload = {"data": order}` variable and passed `order` directly as the `json` parameter in both `requests.post()` calls.
- **Why:** The Dapr publish endpoint (`/v1.0/publish/{pubsubname}/{topic}`) treats the entire request body as the event data. The curl example later in the same post correctly sends data without a wrapper, confirming this was an error in the Python code.

### 2. Missing required `authType` field in Kafka component YAML (Line ~78)
- **What was wrong:** The Kafka pub/sub component configuration omitted the `authType` metadata field, which is required in current Dapr versions (1.10+). Without it, the component would fail to initialize.
- **What was changed:** Added `- name: authType` with `value: "none"` to the Kafka component metadata, between `brokers` and `consumerGroup`.
- **Why:** The `authType` field is listed as required in the Dapr Kafka component reference. Using `"none"` is appropriate for the local development scenario shown in the example.

## Review Notes
- The subscription YAML uses the v1alpha1 format with `route` (singular). The newer v2alpha1 format uses `routes` with a `default` key. Both are supported by Dapr, so the v1alpha1 format shown is not incorrect, but readers working with newer Dapr versions may see the v2alpha1 format in current documentation.
- The post's summary claims "zero application code changes" for migration, but the guide itself demonstrates dual publishing which does require temporary code changes. The summary could be more precise, but this is a framing/editorial choice rather than a technical error.
- The `kubectl delete component kafka-pubsub` command assumes Dapr CRDs are installed in the cluster, which is standard for any Dapr-enabled Kubernetes environment.

# Validation Summary: How to Implement Event Storming Results with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub building block, state management, subscriptions)
- Event Storming (Domain-Driven Design workshop technique)
- Python (Flask, Dapr Python SDK)
- JavaScript (Express.js)
- Apache Kafka (topic creation commands)
- YAML (Dapr subscription configuration)

## Sources Consulted
- Dapr Subscription spec documentation: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr pub/sub subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr pub/sub how-to guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr CloudEvents documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr Python SDK source (GitHub): https://github.com/dapr/python-sdk
- Dapr Python SDK pub/sub publisher example: https://github.com/dapr/python-sdk/blob/main/examples/pubsub-simple/publisher.py
- Alberto Brandolini's Event Storming methodology (color conventions)

## Issues Found

1. **Subscription YAML used deprecated apiVersion and incorrect structure**: The post used `dapr.io/v1alpha1` with `route` (singular) and `scopes` nested inside `spec`. Updated to `dapr.io/v2alpha1` with `routes.default` and moved `scopes` to the top level (outside `spec`), matching current Dapr documentation. Also added YAML document separator (`---`) between the two subscription definitions.

2. **Python SDK `publish_event` received dict instead of string**: The `publish_event` method accepts `Union[bytes, str]` for the `data` parameter, not a dict. Wrapped the dict arguments in `json.dumps()` and added `data_content_type='application/json'` to both `publish_event` calls.

3. **Non-idiomatic Python SDK import**: Changed `import dapr.clients as dapr` (which aliased the submodule confusingly) to `from dapr.clients import DaprClient`, and updated all `dapr.DaprClient()` calls to `DaprClient()` to match official SDK examples.

4. **CloudEvents `type` field misused in read model**: The JavaScript read model checked `event.type` to identify event kinds, but Dapr sets the CloudEvents `type` field to `com.dapr.event.sent` by default (not the topic name). Changed to `event.topic` which contains the actual topic name (e.g., `OrderPlaced`, `PaymentProcessed`).

5. **Incorrect code fence language**: The event flow diagram was marked as ` ```json ` but contained plain text, not JSON. Changed to ` ```text `.

## Review Notes
- The Event Storming color conventions (orange, blue, yellow, lilac, green, pink) are all correct per Brandolini's methodology.
- The overall mapping from Event Storming artifacts to Dapr concepts is sound and well-explained.
- The Kafka topic creation commands are correct syntactically, though the post doesn't mention that Dapr can auto-create topics with some brokers, which could simplify setup.
- The Python code mixes the Order aggregate and the Inventory policy handler in the same Flask app for brevity. In a real implementation these would be separate services, which the post implicitly acknowledges through the subscription scoping.

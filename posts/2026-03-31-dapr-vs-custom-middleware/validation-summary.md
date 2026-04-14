# Validation Summary: How to Decide Between Dapr and Custom Middleware

## Status
validated

## Post Type
Guide / Decision Framework

## Technologies Covered
- Dapr (building blocks: state management, pub/sub, service invocation, bindings, actors, workflows, secrets, configuration)
- Python (redis-py library, Dapr Python SDK)
- Redis
- PostgreSQL
- AWS DynamoDB
- Kubernetes

## Sources Consulted
- Dapr Python SDK source code — `save_state` method signature: https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/client.py
- Dapr Python SDK `StateOptions` class: https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/_state.py
- Dapr State Store TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr State Management building block docs: https://docs.dapr.io/developing-applications/building-blocks/state-management/
- Dapr Pub/Sub building block docs: https://docs.dapr.io/developing-applications/building-blocks/publish-subscribe/
- Dapr component specs for state stores: https://docs.dapr.io/reference/components-reference/supported-state-stores/

## Issues Found

### Issue 1: Incorrect Dapr Python SDK `save_state` call for TTL (line 74-75)

**What was wrong:** The code used `state_options=StateOptions(ttl=3600)` to set TTL on a state save operation. This is incorrect in two ways:
1. `StateOptions` only accepts `consistency` and `concurrency` parameters — it does not have a `ttl` parameter. Using `StateOptions(ttl=3600)` would raise a `TypeError`.
2. The parameter name `state_options` is not the correct keyword argument name (it is `options`), and regardless, TTL is not set through `StateOptions`.

**What was changed:** Replaced `state_options=StateOptions(ttl=3600)` with `state_metadata={"ttlInSeconds": "3600"}`, which is the correct way to set TTL via the Dapr Python SDK. Also wrapped the `session` value with `json.dumps()` for consistency with the custom Redis example above it and to match the `save_state` expected value type (`Union[bytes, str]`).

**Why:** The Dapr Python SDK sets TTL through the `state_metadata` dictionary with the key `"ttlInSeconds"` (as a string), as documented in the official Dapr State Store TTL documentation.

## Review Notes
- The custom Redis example uses `json.dumps()` without showing `import json` at the top. This is a common blog post convention (omitting obvious imports) and not an error.
- The redis-py `setex()` method is still functional but newer versions of redis-py (4.0+) recommend using `set()` with the `ex` parameter instead. This is not a breaking issue since `setex` still works.
- The YAML configuration snippets correctly use `state.redis` and `state.postgresql` as Dapr component type names.
- The claim of "10+ brokers" for pub/sub is accurate — Dapr supports Kafka, RabbitMQ, Redis Streams, Azure Service Bus, AWS SNS/SQS, GCP Pub/Sub, NATS, Apache Pulsar, MQTT, and more.
- The architectural guidance (when to use Dapr vs custom middleware, hybrid approach) is sound and aligns with Dapr's official recommendations.

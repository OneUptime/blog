# Validation Summary: How to Build IoT Event Processing with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Pub/Sub (content-based routing, declarative subscriptions)
- Dapr State Management (rolling averages, TTL)
- Dapr Output Bindings (InfluxDB)
- Dapr Python SDK (`dapr-client`)
- Python / Flask
- CEL (Common Expression Language) for subscription routing rules
- CloudEvents envelope format

## Sources Consulted
- Dapr Python SDK source code on GitHub (dapr/python-sdk) — `DaprClient.publish_event`, `get_state`, `save_state`, `invoke_binding` method signatures
- Dapr docs: Pub/Sub message routing — https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr docs: Subscription schema reference — https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr docs: Pub/Sub CloudEvents — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/

## Issues Found

### 1. Subscription apiVersion incorrect (YAML)
- **What was wrong:** The declarative subscription used `apiVersion: dapr.io/v1alpha1`, which only supports a single `route` field. Content-based routing with `routes.rules` requires `dapr.io/v2alpha1`.
- **What was changed:** Updated `apiVersion` from `dapr.io/v1alpha1` to `dapr.io/v2alpha1`.
- **Why:** The v1alpha1 subscription schema does not support the `routes` block with CEL-based `rules`. Using v1alpha1 with this structure would result in the routing rules being ignored.

### 2. CEL match expressions missing `event.data.` prefix (YAML)
- **What was wrong:** Match expressions used `event.sensorType` to access the message payload field, but `sensorType` is inside the CloudEvent `data` envelope, not a top-level CloudEvent attribute.
- **What was changed:** Updated all three match expressions from `event.sensorType` to `event.data.sensorType`.
- **Why:** In Dapr's CEL routing expressions, top-level CloudEvent attributes (e.g., `type`, `source`) are accessed directly via `event.<attr>`, but application data fields must be accessed via `event.data.<field>`. Without the `event.data.` prefix, the expressions would never match and all events would fall through to the default route.

### 3. `publish_event` passed a raw dict instead of serialized JSON string (Python)
- **What was wrong:** In the anomaly detection handler, `client.publish_event()` was called with a Python `dict` as the `data` argument. The Dapr Python SDK's `publish_event` only accepts `Union[bytes, str]` and raises `ValueError` for other types.
- **What was changed:** Wrapped the dict argument with `json.dumps()`.
- **Why:** Passing a dict directly would raise `ValueError: invalid type for data <class 'dict'>` at runtime. The first `publish_event` call in the ingestion handler correctly used `json.dumps()`, but the second call in the anomaly detection handler did not.

## Review Notes
- The `get_state().data` returns `bytes`. The code uses `json.loads(history_data or '{"default": ...}')` which works because empty bytes `b''` is falsy and `json.loads()` accepts both `bytes` and `str` in Python 3. This is functional but slightly fragile due to mixed types in the `or` expression.
- The anomaly detection uses a simplified standard deviation check (`2 * 5` as a hardcoded threshold). The comment acknowledges this simplification, which is appropriate for a tutorial.
- The aggregation handler has no concurrency protection (e.g., ETags) for the read-modify-write cycle on state. In a production IoT system with high event rates, this could lead to lost updates. This is acceptable for a tutorial but worth noting.
- The InfluxDB output binding data format is illustrative. The actual payload format depends on the specific Dapr InfluxDB component configuration.

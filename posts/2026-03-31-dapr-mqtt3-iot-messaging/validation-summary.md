# Validation Summary: How to Configure MQTT3 for IoT Messaging with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr pub/sub (MQTT3 component)
- Eclipse Mosquitto MQTT broker
- Kubernetes (Deployment, Service, ConfigMap)
- Python with paho-mqtt client library
- Node.js with Express (Dapr programmatic subscription)
- Dapr declarative Subscriptions (CRD)

## Sources Consulted
- Dapr MQTT3 pub/sub component documentation (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-mqtt3/)
- Dapr declarative subscription specification (https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/)
- Eclipse Mosquitto documentation (https://mosquitto.org/man/mosquitto-conf-5.html)
- paho-mqtt v2.x migration guide and changelog (https://github.com/eclipse/paho.mqtt.python/blob/master/ChangeLog.txt)
- Dapr pub/sub API reference (https://docs.dapr.io/reference/api/pubsub_api/)

## Issues Found

### 1. Incorrect metadata field name `clientId` in Dapr MQTT3 component
- **What was wrong:** The Dapr MQTT3 component YAML used `clientId` as the metadata field name for the client identifier.
- **What was changed:** Renamed to `consumerID`, which is the correct metadata field name per official Dapr MQTT3 documentation.
- **Why:** The Dapr MQTT3 component uses `consumerID` (not `clientId` or `clientID`) as the metadata key to set the MQTT client identifier.

### 2. Deprecated paho-mqtt Client constructor
- **What was wrong:** `mqtt.Client(client_id="dapr-gateway-bridge")` uses the deprecated v1 API. In paho-mqtt 2.x (current release), omitting `callback_api_version` triggers a DeprecationWarning and will be removed in a future version.
- **What was changed:** Updated to `mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="dapr-gateway-bridge")`.
- **Why:** paho-mqtt 2.0+ requires an explicit `CallbackAPIVersion` parameter. Readers installing paho-mqtt today will get v2.x and would see deprecation warnings with the old constructor.

### 3. Outdated Subscription CRD apiVersion
- **What was wrong:** The declarative Subscription used `apiVersion: dapr.io/v1alpha1` with the v1alpha1 schema.
- **What was changed:** Updated to `apiVersion: dapr.io/v2alpha1` with the v2alpha1 schema (`routes.default` instead of `route`).
- **Why:** `dapr.io/v2alpha1` is the current recommended apiVersion for declarative subscriptions. While v1alpha1 still works, v2alpha1 is the version shown in current Dapr documentation and supports additional routing features.

## Review Notes
- The Mosquitto deployment uses `allow_anonymous true`, which is fine for a tutorial but should not be used in production. The post is focused on getting started, so this is acceptable.
- The `on_message` callback signature `(client, userdata, msg)` is the same across both paho-mqtt v1 and v2 callback API versions, so it did not need updating.
- The Mosquitto ConfigMap correctly mounts to `/mosquitto/config`, which is the default config directory for the eclipse-mosquitto Docker image.
- The programmatic subscription pattern in the Express app (GET `/dapr/subscribe`) is correct for Dapr's programmatic subscription model.
- The claim that QoS 1 provides at-least-once delivery is accurate per the MQTT specification.
- The claim that MQTT wildcard subscriptions (`#`, `+`) are supported in the Dapr MQTT3 component is correct.

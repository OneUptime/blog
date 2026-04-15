# Validation Summary: How to Use Dapr Bindings for IoT Data Ingestion

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (input/output bindings)
- MQTT v3.1.1 (via `bindings.mqtt3` component)
- AWS IoT Core (via `bindings.aws.sqs` component)
- Node.js / Express
- Dapr JavaScript SDK (`@dapr/dapr`)

## Sources Consulted
- Dapr MQTT3 binding component spec: https://docs.dapr.io/reference/components-reference/supported-bindings/mqtt3/
- Dapr AWS SQS binding component spec: https://docs.dapr.io/reference/components-reference/supported-bindings/sqs/
- Dapr supported bindings reference: https://docs.dapr.io/reference/components-reference/supported-bindings/
- Dapr JavaScript SDK source code: https://github.com/dapr/js-sdk
- Dapr JS SDK binding interface (`IClientBinding`) and implementation

## Issues Found

### 1. MQTT binding `clientID` metadata field name was incorrect
- **What was wrong:** The MQTT3 binding component YAML used `clientID` as a metadata field name.
- **What was changed:** Renamed to `consumerID`, which is the correct metadata key as defined by the Go struct's `mapstructure:"consumerID"` tag in the `components-contrib` source.
- **Why:** The internal Go struct field is named `ClientID`, but the YAML-facing metadata key is `consumerID`. Using `clientID` would be silently ignored by Dapr.

### 2. MQTT binding `qos` metadata field is not supported
- **What was wrong:** The MQTT3 binding component YAML included a `qos` metadata field with value `"1"`.
- **What was changed:** Removed the `qos` field entirely from the component YAML.
- **Why:** The `qos` field has `mapstructure:"-"` in the binding component source, meaning it is explicitly excluded from YAML metadata parsing. The `qos` setting is valid for the `pubsub.mqtt3` component but not for `bindings.mqtt3`. Including it would have no effect.

### 3. AWS SQS binding `waitTimeSeconds` metadata field is not supported
- **What was wrong:** The SQS binding component YAML included `waitTimeSeconds` with value `"20"`.
- **What was changed:** Removed the `waitTimeSeconds` field from the component YAML.
- **Why:** This is not an exposed metadata field for the `bindings.aws.sqs` component. The wait time is hardcoded to 20 seconds in the Dapr SQS binding source code. Including it in metadata has no effect and misleads readers into thinking it's configurable.

## Review Notes
- The `x-mqtt-topic` HTTP header referenced in the JavaScript handler (`req.headers["x-mqtt-topic"]`) is not officially documented by Dapr. The MQTT3 binding returns topic information in response metadata under the key `mqttTopic`. When Dapr invokes the app endpoint, binding metadata is passed as HTTP headers, so the actual header name may differ from `x-mqtt-topic`. This could cause the device ID parsing logic to fail silently. Readers should verify the actual header name in their Dapr version.
- MQTT wildcard topic subscriptions (e.g., `sensors/+/telemetry`) are used in the example. While this likely works because the underlying Paho MQTT library supports wildcards, it is not explicitly documented as a supported feature in the Dapr MQTT3 binding docs.
- The in-memory aggregation buffer pattern shown will lose data if the service restarts. This is acknowledged as a simplification for the tutorial context.
- The Dapr JS SDK `DaprClient()` constructor with no arguments is valid and uses defaults (host: `127.0.0.1`, port: `3500`), which works correctly when running alongside the Dapr sidecar.

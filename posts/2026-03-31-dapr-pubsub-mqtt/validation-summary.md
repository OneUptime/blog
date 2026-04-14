# Validation Summary: How to Set Up Dapr Pub/Sub with MQTT

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, component configuration, declarative subscriptions)
- MQTT protocol (QoS levels, topic hierarchies)
- Eclipse Mosquitto (MQTT broker, Docker and Kubernetes deployment)
- Python (Dapr SDK publisher, Flask subscriber)
- Kubernetes (Deployments, ConfigMaps, Services, Secrets)
- Docker

## Sources Consulted
- Dapr MQTT3 pub/sub component specification: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-mqtt3/
- Eclipse Paho MQTT Go client (underlying library for Dapr MQTT3): https://github.com/eclipse/paho.mqtt.golang
- Eclipse Mosquitto documentation: https://mosquitto.org/man/mosquitto-8.html
- Mosquitto password utility: https://mosquitto.org/man/mosquitto_passwd-1.html
- Dapr Python SDK publish_event API: https://docs.dapr.io/developing-applications/sdks/python/
- Dapr declarative subscription spec (v1alpha1): https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- MQTT v3.1.1 specification (QoS levels): https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html

## Issues Found

### Issue 1: Incorrect MQTT URL scheme (`mqtt://` and `mqtts://`)
- **What was wrong:** The Dapr component configuration used `mqtt://mosquitto:1883` and `mqtts://mosquitto-tls:8883` as broker URLs. The Dapr `pubsub.mqtt3` component uses the Eclipse Paho MQTT Go v3 client library, which only recognizes `tcp://`, `ssl://`, `ws://`, and `wss://` URI schemes. The `mqtt://` and `mqtts://` schemes are not supported and would cause a connection error.
- **What was changed:** Replaced `mqtt://mosquitto:1883` with `tcp://mosquitto:1883` (two occurrences: main config and authenticated config) and `mqtts://mosquitto-tls:8883` with `ssl://mosquitto-tls:8883` (TLS config).
- **Why:** The Paho MQTT Go client's `AddBroker()` method parses the URL scheme and routes connections based on it. Unrecognized schemes like `mqtt://` fall to the default error case and the connection fails.

### Issue 2: Missing `-it` flag on `docker run` for `mosquitto_passwd`
- **What was wrong:** The command `docker run --rm -v ... eclipse-mosquitto:2 mosquitto_passwd -c /mosquitto/config/passwords dapr` runs `mosquitto_passwd` in create mode, which prompts interactively for the password. Without the `-it` flags, Docker does not allocate a pseudo-TTY or attach stdin, so the password prompt would fail.
- **What was changed:** Added `-it` flag to make it `docker run --rm -it -v ...`.
- **Why:** The `-i` (interactive) flag keeps stdin open and `-t` allocates a pseudo-TTY, both required for `mosquitto_passwd` to accept password input from the user.

## Review Notes
- The `clientID` metadata field in the Dapr component configuration may be more accurately named `consumerID` in the official Dapr MQTT3 component spec. Both may work depending on Dapr version, but readers should consult the current Dapr docs if they encounter issues.
- The QoS levels table correctly describes MQTT protocol QoS semantics. QoS 2 ("exactly once") is described as a "4-way handshake" which accurately reflects the PUBLISH/PUBREC/PUBREL/PUBCOMP exchange.
- The Dapr Subscription YAML correctly places `scopes` at the top level (same level as `spec`), which is the correct structure for the `v1alpha1` Subscription CRD.
- The Python publisher and subscriber code are syntactically correct and use current Dapr Python SDK APIs.
- The Kubernetes manifests (Deployment, ConfigMap, Service) are well-formed and correctly structured.

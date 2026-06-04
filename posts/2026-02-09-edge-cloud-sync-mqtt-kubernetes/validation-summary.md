# Validation Summary: How to Use Edge-Cloud Data Synchronization Patterns with MQTT and Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- K3s
- MQTT
- Eclipse Mosquitto
- EMQX
- Python
- Eclipse Paho MQTT Python client
- Prometheus exporter deployment pattern

## Sources Consulted
- Eclipse Paho MQTT Python client API documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/client.html
- Eclipse Mosquitto 2.0 migration documentation: https://mosquitto.org/documentation/migrating-to-2-0/
- Eclipse Mosquitto configuration man page: https://mosquitto.org/man/mosquitto-conf-5.html
- EMQX cluster creation and DNS discovery documentation: https://docs.emqx.com/en/emqx/latest/deploy/cluster/create-cluster.html
- EMQX clustering overview: https://docs.emqx.com/en/emqx/latest/deploy/cluster/introduction.html
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes dependent environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- MQTT specifications page: https://mqtt.org/mqtt-specification/
- OASIS MQTT 3.1.1 specification: https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html
- OASIS MQTT 5.0 specification: https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html

## Issues Found
- The Mosquitto edge manifest mounted a `mosquitto-data` PersistentVolumeClaim but did not define it. Added a PVC to make the manifest appliable.
- The Mosquitto manifest exposed port 9001 for WebSockets but did not configure a WebSocket listener. Added a `listener 9001` with `protocol websockets`.
- The EMQX StatefulSet referenced DNS clustering but did not define the required headless Service, used a non-unique node name setting, and omitted cluster communication ports. Added a headless Service, corrected `serviceName`, used Kubernetes pod-name environment expansion for unique `EMQX_NODE_NAME` values, changed DNS discovery to documented A-record mode, and exposed EMQX cluster ports.
- The cloud EMQX manifest used the `mqtt-cloud` namespace but did not show creating it. Added the namespace creation command before applying the manifest.
- The Python Paho examples used `mqtt.Client("client-id")`, which is not correct with the current 2.x constructor because the first positional argument is the callback API version. Updated all examples to use `mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="...")`.
- The edge publisher sent QoS 1 messages without running the Paho network loop. Added `client.loop_start()` after connecting.
- The one-shot command publisher could exit before completing the QoS 2 publish. Added `loop_start()`, `wait_for_publish()`, `loop_stop()`, and `disconnect()`.
- The command publisher's retained message comment could imply all commands are persisted for offline consumers. Clarified that MQTT retained messages persist the latest command for the topic.
- The publisher Deployment referenced a `publisher-script` ConfigMap but the post did not show creating it, and the prose called the workload a Job even though the YAML is a Deployment. Added the ConfigMap creation command and corrected the prose.
- The aggregation loop used `int(time.time()) % 300 == 0`, which can trigger more than once during the same second. Replaced it with a `next_publish` timestamp.
- The offline Mosquitto queue example used `bridge_queue_size` and `bridge_max_queued_bytes`, which are not current Mosquitto configuration options. Replaced them with `max_queued_messages` and `max_queued_bytes`.

## Review Notes
The examples are suitable for a tutorial, but they still intentionally use anonymous MQTT access and no TLS. For production deployments, Mosquitto bridge authentication/TLS, EMQX credentials, Kubernetes Secrets, NetworkPolicies, resource requests/limits, readiness probes, and pinned image versions should be added.

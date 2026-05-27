# Validation Summary: How to Monitor IoT Device Fleets with Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes StatefulSet, Service, and HorizontalPodAutoscaler
- EMQX MQTT broker
- MQTT
- Telegraf mqtt_consumer input and prometheus_client output
- Prometheus and Prometheus Operator PrometheusRule
- Python
- Eclipse Paho MQTT Python client
- Prometheus Python client
- Grafana and Alertmanager
- OneUptime

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Service and headless Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes HorizontalPodAutoscaler documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- EMQX cluster creation and discovery documentation: https://docs.emqx.com/en/emqx/latest/deploy/cluster/create-cluster.html
- EMQX Docker image configuration documentation: https://hub.docker.com/_/emqx
- Telegraf MQTT consumer documentation: https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/
- Eclipse Paho MQTT Python client documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/3.0/configuration/alerting_rules/
- Prometheus Operator PrometheusRule API reference: https://doc.crds.dev/github.com/prometheus-operator/prometheus-operator/monitoring.coreos.com/PrometheusRule/v1

## Issues Found
- The EMQX StatefulSet referenced `emqx-headless` but did not define the required headless Service. Added a headless Service with named MQTT, WebSocket, and dashboard ports because Kubernetes StatefulSets require a headless Service for stable network identity.
- The EMQX manifest did not set a stable node name even though it used persistent storage. Added `POD_NAME`, `POD_NAMESPACE`, and `EMQX_NODE__NAME` so EMQX nodes use stable StatefulSet DNS names.
- The EMQX DNS discovery example set `record_type` to `srv` while using a plain Service DNS name. Changed it to `a`, matching EMQX DNS discovery support for A records and the headless Service DNS name used in the manifest.
- The Telegraf configuration comment said `topic_tag` extracts `device_id`, but Telegraf stores the whole topic in that tag. Updated the comment and added `topic_parsing` to extract `device_id` and `message_type`.
- The initial Telegraf `topic_parsing` placement would have moved later keys into the nested TOML table. Kept `json_string_fields` in the `mqtt_consumer` table before opening the nested `topic_parsing` table.
- The Python heartbeat monitor used `datetime.utcnow()`, which is deprecated in modern Python. Replaced it with `datetime.now(timezone.utc)`.
- The Python heartbeat monitor used the default Paho callback API version. Updated it to `mqtt.CallbackAPIVersion.VERSION2`, which is the current recommended callback API.
- The HPA section described scaling on MQTT backlog, but the manifest used CPU utilization. Updated the text and comment to say CPU utilization and noted that CPU requests are required for HPA utilization calculations.

## Review Notes
- The snippets are illustrative and still assume surrounding resources such as the namespace, Telegraf Deployment, Prometheus scrape configuration, RBAC where applicable, and device telemetry schemas.
- `emqx/emqx:5.4.0` is version-specific and older than current EMQX documentation examples, but the reviewed configuration fields are valid for the documented EMQX 5 configuration model.
- Verified the edited YAML snippets parse as YAML, the embedded Telegraf configuration parses as TOML, and the Python snippet parses successfully with `python3`.

# Validation Summary: ArgoCD for Manufacturing: IoT Platform Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications and ApplicationSets
- Argo CD AppProjects and sync windows
- Kubernetes Deployments and StatefulSets
- Helm values through Argo CD
- K3s edge clusters
- Eclipse Mosquitto MQTT broker configuration
- OPC-UA, Modbus, SCADA integration patterns
- TimescaleDB, Kafka, Grafana, and ML model serving concepts

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD ApplicationSet cluster generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD sync windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes dependent environment variables documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Eclipse Mosquitto configuration manual: https://mosquitto.org/man/mosquitto-conf-5.html

## Issues Found
- The MQTT section said to deploy Mosquitto with high availability, but the manifest correctly used a single replica per edge node. Changed the wording to "persistent storage and TLS" to match the actual deployment.
- The Mosquitto 2.x configuration defined network listeners but did not configure authentication. Mosquitto defaults to denying anonymous clients when listeners are configured, so the example would not accept normal username/password clients as written. Added a `mosquitto-auth` secret mount and `password_file /mosquitto/auth/passwords`.
- The stream processor used `$(DB_PASSWORD)` in `TIMESCALEDB_URL` while only importing the secret through `envFrom`. Kubernetes variable expansion is defined for previously declared environment variables, so this was made explicit by adding `DB_PASSWORD` with `valueFrom.secretKeyRef` before `TIMESCALEDB_URL`.

## Review Notes
- All YAML code blocks parse successfully after the edits.
- Several Helm values, image names, repository URLs, Modbus register maps, and SQL feature queries are necessarily application-specific examples. They are syntactically plausible but depend on the custom charts and application images implementing those exact values.
- The ApplicationSet example uses the default ApplicationSet template syntax rather than enabling Go templates. That remains valid for the shown placeholders.

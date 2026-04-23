# Validation Summary: How to Set Up Rancher for Manufacturing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Fleet
- K3s
- Kubernetes
- Grafana
- TimescaleDB
- MQTT
- OPC UA
- Prometheus Alertmanager

## Sources Consulted
- K3s private registry configuration: https://docs.k3s.io/installation/private-registry
- K3s air-gap installation: https://docs.k3s.io/installation/airgap
- Rancher Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Kubernetes NetworkPolicy concepts: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes disruptions: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget task guide: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- TimescaleDB on Kubernetes: https://docs.timescale.com/self-hosted/latest/install/installation-kubernetes/
- Timescale Helm charts repository: https://github.com/timescale/helm-charts
- Grafana provisioning: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana dashboard JSON model: https://grafana.com/docs/grafana/latest/reference/dashboard/
- Grafana alert list visualization: https://grafana.com/docs/grafana-cloud/visualizations/panels-visualizations/visualizations/alert-list/
- Prometheus alerting clients: https://next.prometheus.io/docs/alerting/latest/clients/
- Eclipse Mosquitto MQTT reference: https://mosquitto.org/man/mqtt-7.html

## Issues Found
- The air-gapped K3s install example used `curl -sfL https://get.k3s.io | sh -`, which depends on internet access and does not match the documented air-gap flow. I changed it to a local `install.sh` flow with `INSTALL_K3S_SKIP_DOWNLOAD=true`, added `mkdir -p /etc/rancher/k3s`, and set `--disable-default-registry-endpoint` so the registry mirror example aligns with current K3s air-gap guidance.
- The Step 2 manifests were not deployable as written. The `iiot` namespace was never created, the MQTT broker had no Service even though the adapter referenced a Service DNS name, and the broker Deployment mounted a `config` volume that did not exist. I added the namespace, added a Service for `mosquitto-broker`, and removed the invalid volume mount.
- The custom image references used `myregistry/...`, which K3s/containerd does not treat as a registry name unless the first component contains a period or colon. I changed those references to `registry.plant.internal:5000/...` so they resolve as private-registry images.
- The TimescaleDB example used the `timescale/timescaledb-single` Helm chart, but the official Timescale Helm charts repository is marked as no longer maintained. The original snippet also mixed a Helm command into a `yaml` code block. I replaced that section with a current Kubernetes StatefulSet/Service/Secret example based on the official TimescaleDB on Kubernetes documentation.
- The Grafana dashboard JSON was not valid as written. It contained placeholder `[...]` content and used `alert` as a panel type, which is not the current alert list visualization type. I replaced it with valid dashboard JSON using `stat`, `timeseries`, and `alertlist`, and clarified that the ConfigMap pattern is for Grafana Helm sidecar provisioning.
- The predictive maintenance snippet pointed `ALERT_WEBHOOK` at the Alertmanager root URL instead of the documented alerts API endpoint. I changed it to `/api/v2/alerts`.
- The NetworkPolicy example did not do what its comments claimed. It allowed egress to selected pods in-cluster, not to an external OT subnet. I updated it to target OT connector pods and to allow egress only to an example OT CIDR plus DNS, which matches the policy description.
- The resilience note claimed MQTT retained messages prevent data loss during outages. Retained messages are for last-known-value delivery, not general lossless buffering. I rewrote that note to recommend local broker persistence plus local TimescaleDB buffering instead.
- The manufacturing considerations section said PodDisruptionBudgets prevent disruption during maintenance windows. PDBs limit voluntary disruptions only, so I corrected that wording.

## Review Notes
- The Grafana `grafana_dashboard: "1"` label assumes Helm sidecar-based dashboard discovery rather than Grafana core file provisioning by itself.
- Kubernetes NetworkPolicies require a CNI plugin that implements NetworkPolicy enforcement.
- The official TimescaleDB Kubernetes page presents the basic StatefulSet approach as suitable for development and testing; for plant production environments, an operator-based PostgreSQL deployment may be more appropriate.

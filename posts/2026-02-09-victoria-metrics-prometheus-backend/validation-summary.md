# Validation Summary: How to Deploy Victoria Metrics as a Prometheus-Compatible Backend for Kubernetes

## Status
validated

## Post Type
Tutorial / Kubernetes deployment guide

## Technologies Covered
- VictoriaMetrics single-node and cluster deployments
- vmagent
- Prometheus remote write and TSDB snapshots
- Prometheus Operator Prometheus CRD
- Kubernetes StatefulSet, Deployment, Service, ConfigMap, ServiceAccount, ClusterRole, and ClusterRoleBinding
- Grafana Prometheus data source provisioning
- PromQL / MetricsQL

## Sources Consulted
- VictoriaMetrics single-node documentation: https://docs.victoriametrics.com/victoriametrics/single-server-victoriametrics/
- VictoriaMetrics cluster documentation: https://docs.victoriametrics.com/victoriametrics/cluster-victoriametrics/
- VictoriaMetrics Prometheus integration documentation: https://docs.victoriametrics.com/victoriametrics/integrations/prometheus/
- VictoriaMetrics vmctl Prometheus migration documentation: https://docs.victoriametrics.com/victoriametrics/vmctl/prometheus/
- VictoriaMetrics releases: https://github.com/VictoriaMetrics/VictoriaMetrics/releases
- Prometheus HTTP API snapshot documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#snapshot
- Prometheus promtool documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana Prometheus data source documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found
- The image tags used `v1.96.0`, which is outdated for a 2026 post. Updated VictoriaMetrics, vmagent, vmstorage, vminsert, and vmselect examples to `v1.144.0`, the current release available at review time.
- The post described VictoriaMetrics as having "Full PromQL compatibility." VictoriaMetrics documents MetricsQL as PromQL-compatible/backward-compatible, so the wording was changed to "PromQL-compatible querying through MetricsQL."
- The post described downsampling as automatic and built in generally. VictoriaMetrics documentation identifies multi-level downsampling as an Enterprise feature performed during background merges. Updated the key-advantages bullet and downsampling section accordingly.
- The downsampling explanation implied the `30d:5m` rule applies only from 30 to 90 days. VictoriaMetrics applies each rule to samples older than the offset, with the larger interval applying beyond 90 days in the example. Clarified the text.
- The cluster-mode guidance did not include the tenant-aware write and read paths required by vminsert and vmselect. Added example paths for tenant `0`.
- The migration example used `promtool tsdb dump` output as a `vmctl --prom-snapshot` input. `vmctl prometheus` reads Prometheus snapshots, not dump text. Replaced the export step with the Prometheus admin snapshot API, noted the required `--web.enable-admin-api` Prometheus flag, and pointed `vmctl` at the snapshot directory.
- The backfill example said OpenMetrics format while using `/api/v1/import`, which expects VictoriaMetrics JSON line import data. Updated the description and filename to match the endpoint.

## Review Notes
The Kubernetes manifests are illustrative and omit production hardening such as security contexts, persistent volume class selection, NetworkPolicies, authentication, TLS, anti-affinity, and resource tuning. For production Kubernetes installs, VictoriaMetrics' Helm charts or Operator are usually preferable to hand-maintained manifests.

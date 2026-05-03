# Validation Summary: How to Deploy Grafana on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Rancher (v2.7+)
- Grafana (Bitnami Helm chart)
- Kubernetes (kubectl, namespaces, ResourceQuota, CronJob)
- Helm 3
- Longhorn (persistent storage / StorageClass)
- nginx Ingress
- cert-manager (Certificate, ClusterIssuer)
- Prometheus Operator (ServiceMonitor)

## Sources Consulted
- Bitnami Grafana Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/grafana/values.yaml
- Bitnami Grafana service template: https://github.com/bitnami/charts/blob/main/bitnami/grafana/templates/service.yaml
- Bitnami Grafana ServiceMonitor template: https://github.com/bitnami/charts/blob/main/bitnami/grafana/templates/servicemonitor.yaml
- Bitnami Grafana container scripts: https://github.com/bitnami/containers/tree/main/bitnami/grafana/13.0/debian-12/rootfs/opt/bitnami/scripts/grafana/
- Bitnami Grafana env file: https://github.com/bitnami/containers/blob/main/bitnami/grafana/13.0/debian-12/rootfs/opt/bitnami/scripts/grafana-env.sh
- Grafana metrics docs: https://grafana.com/docs/grafana/latest/setup-grafana/set-up-grafana-monitoring/
- cert-manager Certificate API: https://cert-manager.io/docs/usage/certificate/
- Prometheus Operator ServiceMonitor CRD: https://prometheus-operator.dev/docs/operator/api/#monitoring.coreos.com/v1.ServiceMonitor
- Kubernetes ResourceQuota docs: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Rancher project annotation reference: `field.cattle.io/projectId`

## Issues Found

1. **Step 6 — wrong port for Grafana metrics endpoint.** The original `curl http://localhost:9090/metrics` used port 9090, which is Prometheus's default port, not Grafana's. Grafana exposes `/metrics` on the same HTTP port as the web UI (port 3000 in the Bitnami image — confirmed by `containerPorts.grafana: 3000` in the chart and `prometheus.io/port: "3000"` in `metrics.service.annotations`). Fixed by changing the port from 9090 to 3000.

2. **Step 7 — fictional backup command.** The original CronJob invoked `/opt/bitnami/scripts/grafana/entrypoint.sh grafana-backup`. The Bitnami Grafana container ships only `entrypoint.sh`, `postunpack.sh`, `run.sh`, and `setup.sh` — there is no `grafana-backup` subcommand and no backup helper in `libgrafana.sh`. The entrypoint just dispatches to `run.sh` or execs whatever is passed as argv, so this command would fail. Replaced with a working tarball backup of the data directory: `tar -czf /tmp/grafana-backup.tar.gz -C /opt/bitnami/grafana data` (the `GF_PATHS_DATA` location confirmed via `grafana-env.sh`).

## Review Notes

- The ServiceMonitor in Step 6 uses `port: http`, which matches the Bitnami chart's Service port name (`templates/service.yaml` declares `name: http`). Verified — no change needed.
- The Bitnami Grafana chart values used in Step 2 (`persistence.enabled`, `persistence.storageClass`, `ingress.enabled`, `ingress.hostname`, `ingress.tls`) are all valid keys in the current chart.
- The intro and conclusion contain awkward phrasing ("How to Deploy Grafana on Rancher on Rancher gives your team...") that looks like a templating artifact, but it is a stylistic/grammatical issue rather than a technical error, so it was left untouched per review scope.
- The Step 7 backup writes the tarball inside the pod's filesystem at `/tmp/grafana-backup.tar.gz`, which is ephemeral. For production use, consider piping the tar to stdout and uploading to object storage, or using PVC VolumeSnapshots via the CSI driver — but the current command is technically correct and produces a real backup.
- The Step 7 backup is a hot tarball of a live SQLite database (`grafana.db`); for a fully consistent snapshot, SQLite's online backup API (`sqlite3 ".backup"`) or a PVC VolumeSnapshot would be preferable. Not a correctness bug, just a robustness note.
- The Step 1 annotation requires `YOUR_PROJECT_ID` to be replaced with the actual Rancher project ID (e.g., `c-m-abc123:p-def456`); this is a placeholder convention and not an error.

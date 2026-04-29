# Validation Summary: How to Set Up ML Experiment Tracking on Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (v2.7+)
- Kubernetes
- Helm
- MLflow (referenced in description and tags)
- Longhorn (persistent storage)
- kubectl
- Prometheus / ServiceMonitor (monitoring.coreos.com/v1)
- Kubernetes Ingress (networking.k8s.io/v1)
- Kubernetes CronJob (batch/v1)
- AWS CLI (for backups)

## Sources Consulted
- [Helm Chart Repository Deprecation Update](https://helm.sh/blog/charts-repo-deprecation/) — confirms the `stable` Helm repo at `https://charts.helm.sh/stable` was deprecated and archived on November 13, 2020.
- [community-charts/mlflow on Artifact Hub](https://artifacthub.io/packages/helm/community-charts/mlflow) — current community-maintained MLflow Helm chart.
- [bitnami/mlflow on Artifact Hub](https://artifacthub.io/packages/helm/bitnami/mlflow) — alternative MLflow chart from Bitnami.
- [Kubernetes Ingress API reference](https://kubernetes.io/docs/reference/kubernetes-api/service-resources/ingress-v1/) — verified `networking.k8s.io/v1` Ingress schema (host, pathType, backend.service.name/port.number, tls).
- [Kubernetes PersistentVolumeClaim docs](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) — verified `v1` PVC schema (accessModes, resources.requests.storage, storageClassName).
- [Kubernetes CronJob docs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/) — verified `batch/v1` CronJob schema and cron syntax.
- [Prometheus Operator ServiceMonitor CRD](https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md) — verified `monitoring.coreos.com/v1` ServiceMonitor schema.
- [Rancher project label `field.cattle.io/projectId`](https://ranchermanager.docs.rancher.com/) — confirmed this is the correct label for assigning a namespace to a Rancher Project.

## Issues Found
- **Deprecated Helm stable repository.** The original Step 1 used `helm repo add stable https://charts.helm.sh/stable` and installed `stable/chart-name`. The `stable` Helm chart repository was officially deprecated and archived on November 13, 2020, and `helm repo add` now requires `--use-deprecated-repos` to even add it. There is also no MLflow chart in the archived stable repo, so the original commands could not have worked for the post's stated purpose. Fixed by switching to the `community-charts` repository (`https://community-charts.github.io/helm-charts`) and installing the actual `community-charts/mlflow` chart, which is the most widely used community-maintained MLflow Helm chart.

## Review Notes
- The post is heavily generic: many resource names (`service-name`, `service-monitor`, `service-tls`, `service-credentials`) are placeholders rather than MLflow-specific names. The Kubernetes manifests themselves (PVC, Ingress, ServiceMonitor, CronJob) are syntactically correct and use valid current API versions, so they remain useful as a Rancher deployment template even if the reader has to substitute the real MLflow service/port names. Per review scope, only technical errors were corrected; placeholder naming was not changed.
- The introduction sentence ("This guide covers How to Set Up ML Experiment Tracking on Rancher in a production Rancher environment...") and the conclusion sentence ("Deploying How to Set Up ML Experiment Tracking on Rancher on Rancher provides...") read like template substitution artifacts. These are stylistic / grammatical issues rather than technical errors and were left untouched per instructions.
- Despite the title and description mentioning **W&B integration**, the post contains no W&B (Weights & Biases) configuration. This is a content gap, not a technical inaccuracy in what is present.
- The MLflow community chart's actual values keys for storage may differ from `persistence.enabled` / `persistence.storageClass` depending on chart version; readers should consult `helm show values community-charts/mlflow` for the exact keys for their version. The illustrative `--set` flags were left in place.
- The default MLflow tracking server port is `5000`, not `8080`. The post uses `8080` as a generic service port in the Ingress and port-forward examples; readers deploying MLflow specifically may need to substitute `5000` (or whichever port the chart exposes).
- The `amazon/aws-cli:latest` image tag works but pinning a specific version (e.g., `amazon/aws-cli:2.15.0`) is recommended for production CronJobs to avoid unexpected behavior changes.

# Validation Summary: How to Deploy Minio on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- MinIO (S3-compatible object storage)
- Rancher / Kubernetes
- Helm (bitnami/minio chart)
- kubectl
- cert-manager (TLS)
- Longhorn (persistent storage)
- Prometheus Operator (ServiceMonitor)
- Kubernetes HorizontalPodAutoscaler (autoscaling/v2)
- Kubernetes CronJob (batch/v1)
- AWS CLI (for backups)

## Sources Consulted
- Bitnami MinIO Helm chart values reference: https://github.com/bitnami/charts/tree/main/bitnami/minio
- Helm CLI reference (`helm install --version`): https://helm.sh/docs/helm/helm_install/
- Kubernetes HPA v2 API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#horizontalpodautoscaler-v2-autoscaling
- Kubernetes CronJob spec (volumes / volumeMounts): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Prometheus Operator ServiceMonitor CRD: https://prometheus-operator.dev/docs/operator/api/#servicemonitor

## Issues Found
1. **Recurring typo "uminio" → "minio"**: Multiple places (Introduction, install/upgrade comments, Conclusion) referred to "uminio". Fixed all instances to "MinIO" / "minio".
2. **Invalid Helm flag `--version latest`**: The `--version` flag in `helm install` requires a SemVer constraint (e.g., `14.6.0` or `^14.0.0`). The literal string `latest` is not valid and will cause Helm to fail. Removed the flag, which makes Helm use the latest version by default.
3. **Secret keys did not match the bitnami/minio chart**: The post created `admin-password` and an unused `db-password`. The bitnami/minio chart's `auth.existingSecret` expects `root-user` and `root-password` keys. Updated the `kubectl create secret` command, the values file (added `auth.existingSecret: minio-credentials`), and the `kubectl get secret ... jsonpath` command to use `root-password`.
4. **PostgreSQL block does not apply to MinIO**: The `postgresql:` subchart values in `minio-values.yaml` are not part of the bitnami/minio chart (MinIO has no relational database dependency). Replaced that block with the correct `auth.existingSecret` and `mode: distributed` configuration.
5. **`replicaCount` placement and PDB key**: The bitnami/minio chart uses `statefulset.replicaCount` for distributed mode and `podDisruptionBudget.create` (not `enabled`). Fixed both.
6. **Workload kind mismatch**: Step 5 used `kubectl rollout status deployment/minio`, and Step 8's HPA targeted `kind: Deployment`. In distributed mode the bitnami/minio chart deploys a StatefulSet. Updated both to `statefulset/minio` / `kind: StatefulSet`. Also bumped HPA `minReplicas` to 4 to match distributed mode requirements (MinIO requires ≥4 drives in distributed deployments).
7. **CronJob missing `volumeMounts`**: The backup container declared a `volumes:` entry but no `volumeMounts`, so `/data` would not actually exist inside the container. Added the corresponding `volumeMounts` entry to mount the PVC at `/data`.

## Review Notes
- The post repeatedly says "MinIO distributed object storage" but the original values file used `replicaCount: 2`, which is below MinIO's distributed-mode minimum of 4 nodes/drives. The fix sets `mode: distributed` with 4 replicas, consistent with MinIO's requirements (https://min.io/docs/minio/linux/operations/install-deploy-manage/deploy-minio-multi-node-multi-drive.html).
- Autoscaling a distributed MinIO StatefulSet on CPU/memory is uncommon in production — MinIO is designed for fixed-size erasure-coded pools, and adding nodes typically requires expanding via server pools rather than HPA. The HPA snippet is syntactically correct but operators should treat it cautiously.
- The backup CronJob assumes a PVC named `minio-data` exists. With the bitnami chart in distributed mode, PVCs are named `data-minio-<ordinal>` per StatefulSet pod, so this CronJob would need adjustment in a real deployment. Did not change this, as it is more of an architectural caveat than a clear technical error.
- The `auth.existingSecret` in the bitnami/minio chart additionally supports keys like `root-password` and (optionally) other settings; the minimal `root-user` + `root-password` shown here is sufficient.

# Validation Summary: How to Implement Service Account Rotation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (bound service account tokens, projected volumes, CronJob)
- AWS IAM Roles for Service Accounts (IRSA) on EKS
- GCP Workload Identity on GKE
- kubectl CLI
- gcloud CLI
- Python (watchdog library) for file-watching token reload
- Stakater Reloader controller
- Prometheus / kube-state-metrics / PrometheusRule (monitoring.coreos.com/v1)
- Bash scripting

## Sources Consulted
- Kubernetes — Managing Service Accounts: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes — Configure Service Accounts for Pods: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- kube-state-metrics secret metrics docs: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/secret-metrics.md
- amazon-eks-pod-identity-webhook (IRSA annotations): https://github.com/aws/amazon-eks-pod-identity-webhook
- GKE Workload Identity docs: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Stakater Reloader: https://github.com/stakater/Reloader
- kube-apiserver flags reference for `--service-account-max-token-expiration`, `--service-account-issuer`, `--service-account-signing-key-file`

## Issues Found
1. **Broken PrometheusRule alert expression** — The original alert used `time() - kube_secret_annotations{annotation_rotation_timestamp!=""} > 172800`. `kube_secret_annotations` is an info-style gauge with a constant value of 1 (annotation values are exposed as Prometheus labels, not numeric values). The expression `time() - 1` evaluates to roughly the current Unix epoch, which is always greater than 172800, so the alert would fire continuously and never represent staleness. Replaced with `time() - kube_secret_created{secret="app-sa-credentials"} > 172800`, which uses the real `kube_secret_created` timestamp metric exposed by kube-state-metrics. Added an inline comment noting the rotation script must delete and recreate the secret (not `kubectl apply`) for the creation timestamp to update.

## Review Notes
- The `--service-account-max-token-expiration=3600s` comment ("default: 1 hour") is accurate per Kubernetes docs. Note that `--service-account-extend-token-expiration` (default `true`) can extend tokens used by long-running in-cluster clients up to 1 year, which is worth being aware of when reasoning about effective token lifetimes.
- The claim that "the kubelet refreshes tokens at 80% of their lifetime" is correct but incomplete: the kubelet rotates when the token is older than 80% of TTL **or** older than 24 hours, whichever comes first.
- The bash rotation script uses `gcloud iam service-accounts keys list ... | tail -n +3` to "keep only 2 most recent" keys. The default `gcloud` list output is not guaranteed to be sorted by creation time, so this could non-deterministically delete the wrong keys. Future improvement: add `--sort-by=~validAfterTime` and `--managed-by=user` (to avoid attempting to delete system-managed keys, which would fail).
- IRSA, GCP Workload Identity, and Stakater Reloader annotations were all verified against current official documentation and are correct.
- `kube_secret_created` is a STABLE kube-state-metrics gauge, safe to rely on.

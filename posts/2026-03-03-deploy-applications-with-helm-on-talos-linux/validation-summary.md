# Validation Summary: How to Deploy Applications with Helm on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm 3 (package manager for Kubernetes)
- Talos Linux
- Kubernetes (kubectl)
- Bitnami Helm charts (nginx, postgresql)
- YAML values configuration
- Artifact Hub

## Sources Consulted
- Helm 3 official documentation: https://helm.sh/docs/
- Helm CLI reference: https://helm.sh/docs/helm/
- Helm install/upgrade/rollback command docs: https://helm.sh/docs/helm/helm_install/, https://helm.sh/docs/helm/helm_upgrade/, https://helm.sh/docs/helm/helm_rollback/
- Bitnami PostgreSQL chart values: https://github.com/bitnami/charts/tree/main/bitnami/postgresql
- Bitnami NGINX chart values: https://github.com/bitnami/charts/tree/main/bitnami/nginx
- Talos Linux documentation: https://www.talos.dev/latest/
- Kubernetes pod affinity/anti-affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
No technical issues found.

All Helm CLI commands and flags are correct for Helm 3:
- `helm search repo/hub`, `helm show chart/values`, `helm install`, `helm upgrade`, `helm rollback`, `helm history`, `helm status`, `helm list --all-namespaces`, `helm get manifest/values`, `helm uninstall`, `helm template` — all valid.
- `--create-namespace` (Helm 3.2+), `--atomic`, `--timeout`, `--dry-run`, `--set`, `-f`, `--version` — all valid flags.
- `helm rollback RELEASE` without an explicit revision rolling back to the previous revision is correct behavior.
- Multiple `-f` files with later files overriding earlier ones is documented Helm behavior.

Bitnami chart values structures are accurate:
- PostgreSQL: `auth.postgresPassword`, `auth.username`, `auth.password`, `auth.database`, `primary.persistence.*`, `readReplicas.replicaCount`, `metrics.enabled`, `metrics.serviceMonitor.enabled` — all match the documented chart schema.
- NGINX: `replicaCount`, `service.type`, `resources.*`, `autoscaling.*`, `nodeSelector`, `tolerations`, `affinity` — standard chart parameters.

Kubernetes manifest snippets (pod anti-affinity, nodeSelector, etc.) are syntactically valid.

Talos-specific claims are correct:
- No default storage class — Talos ships without one; users must install a CSI driver or storage class.
- No direct shell/runtime access — Talos has no SSH and uses containerd via talosctl/kubectl, not host-level docker commands.
- Network policies depending on CNI — accurate, depends on installed CNI (Cilium, Calico, etc.).

PVCs not being removed by `helm uninstall` is correctly documented.

## Review Notes
- The post uses Bitnami charts (`bitnami/nginx`, `bitnami/postgresql`) as examples. Note that as of mid-2025, Bitnami restructured its public chart/image catalog — many container images moved to a "bitnamilegacy" repository or require Bitnami Premium. The Helm commands and chart value schemas demonstrated remain valid, but readers deploying these charts today may encounter image-pull issues with the public defaults and should consult current Bitnami documentation about the catalog changes. This is not a correctness issue with the post itself (commands and value structures are accurate), but a forward-looking caveat that could be worth noting in a future revision.
- The example `--version 15.0.0` for `helm upgrade` is illustrative; readers should check current chart versions with `helm search repo bitnami/nginx --versions`.
- The PostgreSQL values file uses `storageClass: "local-path"` which assumes the Rancher local-path-provisioner is installed; the post correctly notes earlier that a storage class must be configured for Talos.

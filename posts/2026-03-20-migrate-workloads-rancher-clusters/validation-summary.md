# Validation Summary: How to Migrate Workloads Between Rancher Clusters - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Rancher (multi-cluster Kubernetes management)
- Kubernetes (kubectl, Pods, PVCs, Jobs, Services, Namespaces)
- Velero (backup/restore for Kubernetes)
- Velero Plugin for AWS
- Helm (chart installation)
- Fleet (Rancher's GitOps tool, `fleet.cattle.io/v1alpha1` GitRepo CRD)
- ArgoCD (referenced)
- ingress-nginx
- DNS / external traffic shifting

## Sources Consulted
- Velero Helm chart values.yaml: https://raw.githubusercontent.com/vmware-tanzu/helm-charts/main/charts/velero/values.yaml
- Velero Plugin for AWS releases: https://github.com/vmware-tanzu/velero-plugin-for-aws/releases
- Velero CLI documentation: https://velero.io/docs/main/
- Fleet CRD reference (Rancher Fleet): https://fleet.rancher.io/ref-gitrepo
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found

### 1. Outdated/incorrect Velero Helm chart `--set` syntax
The original `helm install velero` command used:
- `configuration.provider=aws` — this top-level field has been removed from the Velero Helm chart; `provider` now lives per-location inside `backupStorageLocation[i]`.
- `configuration.backupStorageLocation.bucket=...` and `configuration.backupStorageLocation.config.region=...` — `backupStorageLocation` is a YAML array (slice) in the current chart, not a single object, so `--set` must use array index syntax (`[0]`).
- `velero/velero-plugin-for-aws:v1.7.0` — significantly outdated (October 2023). Current stable is v1.14.1 (aligned with Velero 1.18 / chart v12.0.1).
- The init container also requires a `volumeMounts` entry pointing at `/target` for the plugin binaries to be installed correctly.

Fixed by replacing the install block with the current chart syntax: `configuration.backupStorageLocation[0].name=default`, `configuration.backupStorageLocation[0].provider=aws`, `configuration.backupStorageLocation[0].bucket=...`, `configuration.backupStorageLocation[0].config.region=...`, plugin image bumped to `v1.14.1`, and `initContainers[0].volumeMounts[0]` mountPath/name added.

## Review Notes
- AWS plugin credentials (e.g. `--set credentials.useSecret=true --set credentials.secretContents.cloud=...`) are intentionally not shown in the post — readers will need to wire those up themselves; this is acceptable for a high-level migration guide.
- The Fleet GitRepo example uses `fleet.cattle.io/v1alpha1`, which is still the served/storage version as of recent Fleet releases.
- The `kubectl run health-check --image=curlimages/curl --rm -it -- curl ...` form works on modern kubectl (creates a Pod since `--restart` defaults; `--rm` cleans it up). No change needed.
- The PVC export Job uses a single `tar` command; readers should be aware they'd typically need a complementary import Job on the target cluster — the post stops short of showing that, but it is framed as an "Export" step which is fine.
- `velero-plugin-for-aws:v1.14.1` should be re-checked periodically; it tends to bump every few months alongside Velero core.

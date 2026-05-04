# Validation Summary: How to Set Up Continuous Delivery with Rancher Fleet

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Rancher Fleet (GitOps engine)
- Rancher
- Kubernetes (kubectl, CRDs)
- Helm
- Kustomize
- GitOps / Continuous Delivery

## Sources Consulted
- Rancher Fleet docs: https://fleet.rancher.io/
- GitRepo reference: https://fleet.rancher.io/reference/ref-gitrepo
- fleet.yaml reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- GitRepo targets / customization docs: https://fleet.rancher.io/gitrepo-targets
- Adding Git repos / auth secrets: https://fleet.rancher.io/how-tos-for-users/gitrepo-add
- Namespaces explanation: https://fleet.rancher.io/explanations/namespaces
- rancher/fleet source: `pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go` (GitRepoSpec, GitTarget structs)
- rancher/fleet source: `pkg/apis/fleet.cattle.io/v1alpha1/bundle_types.go` (BundleTarget / targetCustomizations)
- rancher/fleet source: `pkg/apis/fleet.cattle.io/v1alpha1/bundledeployment_types.go` (HelmOptions, GitOpsHelmOptions)

## Issues Found

1. **Per-target Helm values in `GitRepo.spec.targets[]` (Step 4) — fixed.** The post placed a `helm.values` block inside a GitRepo target. The `GitTarget` struct in `gitrepo_types.go` only has cluster-selection fields (`name`, `clusterName`, `clusterSelector`, `clusterGroup`, `clusterGroupSelector`) — there is no `helm` field. Per-target Helm value overrides belong in `fleet.yaml` under `targetCustomizations:`, which uses `BundleTarget` (embeds `BundleDeploymentOptions` with `HelmOptions`). Split the example into a clean `GitRepo` target plus a `targetCustomizations` block in `fleet.yaml`.

2. **Auth secret type (Step 6) — fixed.** The post created the Git credentials secret with `kubectl create secret generic` without setting a type. The `ClientSecretName` field comment in `gitrepo_types.go` explicitly states the secret is expected to be of type `kubernetes.io/basic-auth` (or `kubernetes.io/ssh-auth`), and the official `gitrepo-add` docs use `--type=kubernetes.io/basic-auth`. Added the `--type=kubernetes.io/basic-auth` flag.

## Review Notes

- `apiVersion: fleet.cattle.io/v1alpha1` is current and correct for `GitRepo`.
- `clientSecretName` is the correct field name for the GitRepo HTTPS auth secret reference.
- The `kubectl label cluster.fleet.cattle.io/production env=production -n fleet-default` syntax is mechanically correct kubectl `TYPE/NAME` form. In real Rancher-managed environments, downstream cluster CR names are typically auto-generated (e.g., `c-xxxxx`) rather than friendly strings like `production`; the human-readable name is in the `management.cattle.io/cluster-display-name` label. The example reads fine as illustrative pseudocode, but readers may need to look up their actual cluster CR name.
- Bundle naming convention `<gitrepo-name>-<sanitized-path>` is correct, so `my-app` + path `k8s/` → `my-app-k8s`.
- `fleet-local` (Fleet manager / local cluster) vs `fleet-default` (downstream Rancher-registered clusters) is described correctly.
- `fleet.yaml` Helm fields (`defaultNamespace`, `helm.chart`, `helm.releaseName`, `helm.valuesFiles`) are all valid per the fleet.yaml reference.
- "Drift correction" in best practices maps to Fleet's `correctDrift` option (configurable per-bundle in `fleet.yaml` or per-GitRepo); the wording in the post is accurate.

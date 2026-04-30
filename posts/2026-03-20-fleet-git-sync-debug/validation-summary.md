# Validation Summary: How to Debug Fleet Git Repository Sync Issues - Part 3

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Fleet
- SUSE Rancher Continuous Delivery
- Kubernetes
- Git and GitHub
- Helm
- Kustomize

## Sources Consulted
- Fleet GitRepo Resource: https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Fleet Create a GitRepo Resource: https://fleet.rancher.io/0.13/how-tos-for-users/gitrepo-add
- Fleet Status Fields: https://fleet.rancher.io/reference/ref-status-fields
- Fleet Troubleshooting: https://fleet.rancher.io/troubleshooting
- Fleet Mapping to Downstream Clusters: https://fleet.rancher.io/0.10/how-tos-for-users/gitrepo-targets
- Fleet Namespaces: https://fleet.rancher.io/0.14/namespaces
- Fleet Generating Diffs to Ignore Modified GitRepos: https://fleet.rancher.io/how-tos-for-users/bundle-diffs
- Fleet fleet.yaml reference: https://fleet.rancher.io/0.14/reference/ref-fleet-yaml
- Fleet source for `GitRepoSpec` and `GitRepoStatus`: https://raw.githubusercontent.com/rancher/fleet/main/pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go
- Fleet source for shared status fields: https://raw.githubusercontent.com/rancher/fleet/main/pkg/apis/fleet.cattle.io/v1alpha1/status.go

## Issues Found
- The secret inspection command tried to base64-decode the entire `.data` map from a Kubernetes Secret, which does not work. It was replaced with `kubectl describe secret ...` so the type and key names can be checked correctly.
- The HTTPS and SSH secret recreation examples omitted the secret types Fleet expects for `clientSecretName`. They were corrected to use `kubernetes.io/basic-auth` and `kubernetes.io/ssh-auth`.
- The cluster-targeting section checked `BundleDeployment` objects in `fleet-default`, but Fleet stores `BundleDeployment` resources in per-cluster namespaces. The command was corrected to query them across namespaces.
- The modified-state and manual-sync sections used annotation-based force-sync examples that do not match Fleet’s documented API. They were corrected to patch `spec.forceSyncGeneration`, which is the supported field for forcing a re-scan/redeployment.
- The branch/tag section treated tags like branches. A tag lookup example was added, and the tag or pinned-commit update example was corrected to use `spec.revision` instead of `spec.branch`.

## Review Notes
- The post assumes Rancher’s multi-cluster workspace layout and therefore uses `fleet-default`. In single-cluster Fleet setups, equivalent examples usually use `fleet-local`.
- Fleet v0.13 and later enforce stricter SSH host key checks by default. For self-hosted SSH remotes, operators may also need `known_hosts` data in the referenced secret or Fleet’s `known-hosts` config map.
- No remaining technical issues were found after the fixes above.

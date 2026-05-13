# Validation Summary: How to Use Standalone Clusters for Production with Flux

## Status
validated

## Post Type
Tutorial / Production guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Kustomize
- SOPS with age
- Flux notifications
- Flux HelmRelease
- Prometheus, Thanos, and Grafana Mimir

## Sources Consulted
- Flux bootstrap GitHub command documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The `flux bootstrap github` examples used `--personal` with `--owner=your-org`. Flux documents `--personal` for repositories owned by a GitHub user account, while organization-owned repositories should omit it. Removed `--personal` from the bootstrap and disaster recovery examples.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1` for `Provider` and `Alert`. Current Flux documentation exposes `Provider` and `Alert` under `notification.toolkit.fluxcd.io/v1beta3`; `notification.toolkit.fluxcd.io/v1` is for `Receiver`. Updated both notification resources to `v1beta3`.
- The Slack provider example referenced a webhook-style secret without the current Slack API address. Updated the Provider to use `address: https://slack.com/api/chat.postMessage` with a token secret reference, matching the current Flux Slack provider example pattern.
- The rollback section described "Flux's built-in rollback capabilities" and said the GitRepository used a specific commit or tag, but the snippet tracked only `branch: main`. Reworded this as Git-based rollback control and added `ref.commit` to demonstrate pinning to a specific commit.
- The GitRepository SSH URL omitted the `.git` suffix. Updated it to `ssh://git@github.com/your-org/fleet-repo.git`, which matches the URL form shown in Flux documentation more closely.

## Review Notes
- The Flux and kubectl CLIs were not installed in the local environment, so command verification was performed against official Flux and Kubernetes documentation.
- The `kube-prometheus-stack` chart version range `55.x` is syntactically valid as a Helm chart semver range, but it may not be the newest chart line by the time readers use the guide. Future updates could refresh the example chart version.

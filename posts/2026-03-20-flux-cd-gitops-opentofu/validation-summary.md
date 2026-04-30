# Validation Summary: How to Use Flux CD with OpenTofu for GitOps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Flux CD
- Kubernetes
- Helm
- GitOps
- Terraform Kubernetes provider

## Sources Consulted
- Flux installation docs: https://fluxcd.io/flux/installation/
- Flux GitRepository docs: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRelease docs: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization docs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Alerts docs: https://fluxcd.io/flux/components/notification/alerts/
- Flux Providers docs: https://fluxcd.io/flux/components/notification/providers/
- Flux webhook receivers guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Terraform Kubernetes provider tutorial for `kubernetes_manifest`: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider
- Terraform Registry docs for `kubernetes_manifest`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Flux community Helm chart index: https://fluxcd-community.github.io/helm-charts/index.yaml
- Flux community Helm chart values: https://raw.githubusercontent.com/fluxcd-community/helm-charts/main/charts/flux2/values.yaml

## Issues Found
- The post said OpenTofu "bootstraps" Flux while the example only installs Flux via the community Helm chart. I changed the wording to "installs Flux" to match Flux's documented bootstrap terminology.
- The post implied the Flux custom resources could be planned immediately after the Helm install. I added a note that `kubernetes_manifest` validates CRD schemas during planning, so the Flux CRDs must already exist and the custom resources should be applied in a second OpenTofu run.
- The Flux Helm chart version was pinned to `2.12.4`, which is an outdated 2024 chart release. I updated it to the current chart version `2.18.3` from the official chart index.
- The `HelmRelease` example referenced a `GitRepository` source but used `chart = var.app_name` and a semver `version`. For GitRepository sources, Flux expects the chart field to be a repository path, and the version field is ignored. I changed the chart to `./charts/${var.app_name}` and removed the version field.
- The `HelmRelease` example claimed the `rollback` block enabled rollback on failure. In Flux, rollback behavior on failed upgrades is configured through `.spec.upgrade.remediation`, while `.spec.rollback` only configures rollback actions. I added `upgrade.remediation` with rollback strategy and kept the rollback action settings.
- The Slack provider example mixed a webhook-style secret name with Slack bot API fields and omitted the required Slack API address for that pattern. I changed it to a Slack bot token example using `address = "https://slack.com/api/chat.postMessage"` and `secretRef = { name = "slack-token" }`.
- The alert example selected all `HelmRelease` objects without specifying a namespace. Flux defaults the selector namespace to the Alert namespace, which would miss HelmReleases created in `var.app_namespace`. I added `namespace = var.app_namespace` to that event source.
- The first best-practices bullet incorrectly said to use `interval: 1m` for both non-production and production "to balance" rate limits. I corrected it to describe `1m` as a baseline and to pair it with webhook receivers when lower-latency reconciliation is needed.
- The rollback best-practice bullet overstated what the original HelmRelease snippet actually did. I updated it to refer specifically to HelmRelease upgrade remediation with rollback.

## Review Notes
- The Flux notification APIs for `Alert` and `Provider` are still documented as `notification.toolkit.fluxcd.io/v1beta3` as of April 30, 2026, so those API versions remain current in this post.
- The tutorial installs Flux with the community-maintained Helm chart rather than using Flux's documented bootstrap flow with the Flux CLI or the `flux_bootstrap_git` Terraform resource. That is valid, but it is a different installation path with different tradeoffs.

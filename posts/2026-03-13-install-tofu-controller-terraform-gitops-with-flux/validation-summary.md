# Validation Summary: How to Install Tofu Controller for Terraform GitOps with Flux

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Flux CD
- Tofu Controller
- Terraform and OpenTofu
- Kubernetes custom resources
- HelmRepository, HelmRelease, GitRepository, and Kustomization manifests

## Sources Consulted
- Tofu Controller Getting Started documentation: https://flux-iac.github.io/tofu-controller/getting_started/
- Tofu Controller Helm chart README and values: https://github.com/flux-iac/tofu-controller/tree/main/charts/tofu-controller
- Tofu Controller official release HelmRelease manifest: https://raw.githubusercontent.com/flux-iac/tofu-controller/main/docs/release.yaml
- Tofu Controller Terraform CRD schema: https://raw.githubusercontent.com/flux-iac/tofu-controller/main/charts/tofu-controller/crds/crds.yaml
- Flux HelmRelease specification, including CRD lifecycle policies: https://github.com/fluxcd/helm-controller/blob/main/docs/spec/v2/helmreleases.md
- Flux HelmRepository specification: https://github.com/fluxcd/source-controller/blob/main/docs/spec/v1/helmrepositories.md

## Issues Found
- The HelmRepository URL pointed to the old Weaveworks `tf-controller` chart location, which no longer serves the current Tofu Controller chart. Updated it to `https://flux-iac.github.io/tofu-controller/`.
- The HelmRelease did not specify CRD install/upgrade behavior. Added `install.crds: Create` and `upgrade.crds: CreateReplace`, matching Flux's CRD lifecycle controls and the official Tofu Controller release manifest.
- The runner image repository was set to `ghcr.io/flux-iac/tofu-controller`, but the current chart uses `ghcr.io/flux-iac/tf-runner` for runner pods. Updated the value.
- The example configured `runner.resources`, which is not a current chart value. Replaced it with the supported `runner.serviceAccount.allowedNamespaces` setting.
- The test Terraform resource was labeled as plan-only while setting `approvePlan: "auto"`, which auto-applies. Updated the description to auto-apply.
- The post described `approvePlan: manual`, but the CRD and official docs use an omitted or empty `approvePlan` for manual review, then a generated plan value for approval. Updated the inline comment and best-practice guidance.
- The log-level comment implied numeric log levels, while the chart exposes a string `logLevel` value. Simplified the comment.

## Review Notes
The post is now accurate for the current Tofu Controller 0.16.x chart line. Cross-namespace source references are disabled by default starting in 0.16.0; the examples keep the `GitRepository` and `Terraform` resource in `flux-system`, so they do not require `allowCrossNamespaceRefs: true`.

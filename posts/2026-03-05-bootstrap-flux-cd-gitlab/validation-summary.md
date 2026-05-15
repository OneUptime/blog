# Validation Summary: How to Bootstrap Flux CD with GitLab

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- GitOps Toolkit controllers
- Kubernetes
- GitLab and GitLab self-managed instances
- GitLab personal access tokens and deploy keys
- GitLab CI/CD
- Flux notification-controller

## Sources Consulted
- Flux bootstrap GitLab documentation: https://fluxcd.io/flux/installation/bootstrap/gitlab/
- Flux `bootstrap gitlab` CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_gitlab/
- Flux CLI installation and container image documentation: https://fluxcd.io/flux/cmd/
- Flux release documentation: https://fluxcd.io/flux/releases/
- Flux GitHub releases: https://github.com/fluxcd/flux2/releases
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/
- Flux events CLI reference: https://fluxcd.io/flux/cmd/flux_events/
- GitLab personal access token documentation: https://docs.gitlab.com/user/profile/personal_access_tokens/

## Issues Found
- The GitLab CI example used `ghcr.io/fluxcd/flux-cli:v2.2.0`, which is an old Flux release. Updated it to `v2.8.7`, the latest Flux release available during validation.
- The GitLab CI reconciliation example omitted the requirement for Kubernetes credentials in the runner environment. Added a short note that the runner must have access through `KUBECONFIG` or in-cluster configuration.
- The notification example used `notification.toolkit.fluxcd.io/v1` for `Provider` and `Alert`. Current Flux documentation lists `Provider` and `Alert` under `notification.toolkit.fluxcd.io/v1beta3`, while `v1` is used for `Receiver`. Updated both resources to `v1beta3`.
- The `--token-auth` explanation tied HTTPS token authentication to custom certificate configurations. Clarified that `--token-auth` selects HTTPS token authentication instead of SSH deploy keys; custom CA handling is covered separately by `--ca-file`.

## Review Notes
The bootstrap commands, GitLab group/subgroup usage, deploy key rotation guidance, Kustomization examples, verification commands, and GitLab commit status provider address format were consistent with current Flux and GitLab documentation. The GitLab CI example still assumes the pipeline is allowed to contact the cluster API.

# Validation Summary: How to Deploy Flux CD on Edge Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- K3s and edge Kubernetes
- GitOps
- Flux source-controller, kustomize-controller, helm-controller, and notification-controller
- Flux GitRepository, OCIRepository, Kustomization, Provider, and Alert APIs
- OCI artifacts

## Sources Consulted
- Flux bootstrap GitHub CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux source-controller API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux kustomize-controller API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux push artifact CLI documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/

## Issues Found
- The bootstrap command used `--token-env=GITHUB_TOKEN`, but the current official `flux bootstrap github` documentation does not list a `--token-env` flag. I changed the example to export `GITHUB_TOKEN` before running the command, matching the documented workflow.
- The bootstrap command installed only `source-controller` and `kustomize-controller`, but the post later uses Flux `Provider` and `Alert` resources, which require `notification-controller`. I added `notification-controller` to the `--components` list and clarified that notifications require that component.
- The post claimed that selecting components could save "hundreds of megabytes of RAM." The official docs support installing only required components, but that exact saving is workload- and version-dependent. I changed the statement to the more accurate "saving memory on constrained nodes."

## Review Notes
The Flux API versions and fields used in the GitRepository, OCIRepository, Kustomization, Provider, and Alert snippets are current according to the Flux v1 API documentation. The `flux push artifact` command and its `--path`, `--source`, and `--revision` flags match the official CLI documentation. The resource patch examples are technically valid as patch fragments, but a future improvement would be to show the corresponding `kustomization.yaml` `patches` entry so readers know exactly how to apply them during bootstrap customization.

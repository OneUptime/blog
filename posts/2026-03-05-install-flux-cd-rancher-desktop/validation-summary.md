# Validation Summary: How to Install Flux CD on Rancher Desktop

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Flux CD
- Flux CLI and bootstrap workflow
- Kubernetes and K3s
- Rancher Desktop
- GitHub bootstrap authentication
- Kustomize and Flux `Kustomization`
- Flux `GitRepository`
- podinfo sample application
- `kubectl`, `nerdctl`, and Docker CLI

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux `bootstrap github` CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux `bootstrap` options documentation: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux `install` options documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux `Kustomization` documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `GitRepository` documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux image automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux `ImageRepository` documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux `ImageUpdateAutomation` documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Rancher Desktop introduction: https://docs.rancherdesktop.io/
- Rancher Desktop architecture reference: https://docs.rancherdesktop.io/references/architecture
- Rancher Desktop installation requirements: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop working with images guide: https://docs.rancherdesktop.io/tutorials/working-with-images/
- Rancher Desktop troubleshooting / reset documentation: https://docs.rancherdesktop.io/ui/troubleshooting/
- podinfo upstream repository and service manifest: https://github.com/stefanprodan/podinfo

## Issues Found
- The Rancher Desktop Kubernetes version recommendation said K3s `1.27 or later`. Flux's current official installation documentation lists Kubernetes `v1.33` or later as the supported baseline. Updated the recommendation to use a K3s version that meets the current Flux Kubernetes support matrix, with `1.33 or later` recommended.
- The Rancher Desktop path mapping tip said macOS and Windows use a VM. Rancher Desktop's architecture documentation states that macOS and Linux use a VM, while Windows uses WSL2. Updated the platform wording.
- The local image tip implied either `nerdctl` or Docker could be used directly for Flux image automation policies. Rancher Desktop documents that `nerdctl` images must be built in the `k8s.io` namespace for Kubernetes to use them, and Flux image automation scans container registries and commits manifest updates. Updated the tip to distinguish local Kubernetes image testing from Flux image automation and to mention the required image automation controllers.

## Review Notes
- The Flux CLI installation commands, `flux check --pre`, `flux bootstrap github` flags, default controller list, and verification commands match current Flux documentation.
- The `GitRepository` and `Kustomization` manifests use current `v1` Flux APIs and match the documented podinfo example pattern.
- The podinfo repository still has a `master` branch, and its service exposes port `9898`, so the port-forward command is consistent with the upstream manifest.

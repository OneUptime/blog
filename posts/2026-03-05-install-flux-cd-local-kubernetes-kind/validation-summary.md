# Validation Summary: How to Install Flux CD on a Local Kubernetes Cluster with Kind

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- Kind
- kubectl
- Kustomize
- GitHub personal access tokens

## Sources Consulted
- Flux Get Started guide: https://fluxcd.io/flux/get-started/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux CLI bootstrap command reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI logs command reference: https://fluxcd.io/flux/cmd/flux_logs/
- Flux CLI reconcile kustomization command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI get kustomizations command reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kind configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Kind releases and node image examples: https://github.com/kubernetes-sigs/kind/releases

## Issues Found
- The pre-flight check example listed a fixed Kubernetes minimum of `>= 1.26.0`, which is outdated for current Flux releases. Updated the text to say the Kubernetes version must be supported by the installed Flux release.
- The Kind version example used `kindest/node:v1.30.0`, which is no longer a currently supported Kubernetes version for latest Flux releases. Updated the example to `kindest/node:v1.35.0`.
- The sample app section added manifests under `clusters/kind-flux-demo/podinfo/` but did not include Kustomize `kustomization.yaml` files. Flux's bootstrap Kustomization builds the configured path with Kustomize, so the new subdirectory would not be applied unless referenced. Added root and `podinfo` Kustomize files that include the Flux system manifests and the sample app resources.

## Review Notes
- The main Flux bootstrap command, GitHub PAT guidance for classic tokens, Kind port mapping configuration, Kubernetes Deployment and Namespace manifests, verification commands, troubleshooting commands, and cleanup commands are technically valid.
- The post uses the default Flux bootstrap authentication behavior. Current Flux documentation also documents `--token-auth` and fine-grained PAT options for specific workflows; adding those options could be useful in a future enhancement but was not required to correct the tutorial.

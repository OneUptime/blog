# Validation Summary: How to Set Up Hybrid Mode Multi-Cluster with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- GitOps
- Flux image automation
- Multi-cluster Kubernetes management

## Sources Consulted
- Flux `flux bootstrap github` command documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux Kustomization documentation, including remote-cluster kubeconfig references: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/

## Issues Found
- The `flux bootstrap github` examples used `--owner=your-org` together with `--personal`. Flux documents `--personal` for GitHub user-owned repositories; organization-owned repository examples omit it. Removed `--personal` from the organization-owned bootstrap commands.
- The remote kubeconfig Secret example used `--from-literal=value="$(cat dev-cluster-kubeconfig.yaml)"`. Flux documents kubeconfig Secrets with the default `value` or `value.yaml` data key, and its examples use `--from-file=value.yaml=./kubeconfig`. Updated the command to `--from-file=value.yaml=./dev-cluster-kubeconfig.yaml`.
- The production ImagePolicy description said a semver policy pins to specific tags. Flux semver policies select the highest matching tag in the configured range; they do not pin to one exact tag unless the range is constrained accordingly. Reworded the sentence to say it selects release tags using a semver policy.

## Review Notes
- The ServiceAccount token Secret pattern shown is valid Kubernetes syntax for creating a long-lived ServiceAccount token, but Kubernetes recommends TokenRequest-based short-lived tokens where practical. The post's example is acceptable for a simple Flux remote-kubeconfig tutorial, but production setups should consider token rotation and least-privilege RBAC instead of a broad `cluster-admin` binding.
- The local environment did not have the `flux` CLI installed, so CLI verification was performed against the official Flux command documentation rather than local `--help` output.

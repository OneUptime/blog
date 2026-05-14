# Validation Summary: How to Set Up Flux CD on Gardener Managed Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Gardener managed Kubernetes
- Kubernetes Shoot clusters
- gardenctl-v2 and gardenlogin
- GitOps with GitHub
- Kustomize
- Flux HelmRelease, Kustomization, GitRepository, Provider, and Alert APIs
- Gardener DNS and certificate extensions
- AWS load balancer annotations

## Sources Consulted
- Flux bootstrap command reference: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux Kustomization API v1 reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux notification Provider and Alert documentation: https://fluxcd.io/flux/components/notification/providers/ and https://fluxcd.io/flux/components/notification/alerts/
- Flux HelmRelease API documentation: https://fluxcd.io/flux/components/helm/api/
- Gardener gardenctl-v2 documentation: https://gardener.cloud/docs/gardenctl-v2/
- Gardener gardenctl kubeconfig help: https://gardener.cloud/docs/gardenctl-v2/help/gardenctl_kubeconfig/
- Gardener targeting documentation: https://gardener.cloud/docs/gardenctl-v2/targeting/
- Gardener AWS provider extension usage: https://gardener.cloud/docs/extensions/infrastructure-extensions/gardener-extension-provider-aws/usage/
- Gardener SecretBinding to CredentialsBinding migration: https://gardener.cloud/docs/gardener/shoot-operations/secretbinding-to-credentialsbinding-migration/
- Gardener Shoot Kubernetes version notes: https://gardener.cloud/docs/gardener/shoot/shoot_kubernetes_versions/
- Gardener DNS extension guide: https://gardener.cloud/docs/guides/networking/dns-extension/
- Gardener certificate extension guide: https://gardener.cloud/docs/guides/networking/certificate-extension/
- Gardener gardenlogin installation notes: https://github.com/gardener/gardenlogin
- Kubernetes release lifecycle documentation: https://kubernetes.io/releases

## Issues Found
- The CLI installation commands wrote directly to `/usr/local/bin` without elevated permissions and did not install the `kubectl-gardenlogin` plugin name expected by kubectl plugin discovery. Updated the commands to download locally, install with `sudo install`, and add the `kubectl-gardenlogin` symlink.
- The Shoot manifest used legacy `spec.cloudProfileName` and `spec.secretBindingName` fields. Updated them to `spec.cloudProfile.name` and `spec.credentialsBindingName`, which are required for Kubernetes 1.34+ shoots.
- The Shoot manifest included `enableStaticTokenKubeconfig: false`, which is not present in current Gardener API documentation and relates to discontinued static shoot credentials. Removed it.
- The example Kubernetes version `1.30.2` is end-of-life. Updated the example to `1.35.0`, while leaving the post's auto-update settings intact.
- The post used `gardenctl get shoot`, but gardenctl-v2 does not provide a `get` command. Replaced these examples with `kubectl get shoot ...` against the garden cluster kubeconfig.
- The post used `gardenctl kubeconfig --output ~/.kube/gardener-flux-config`, but `--output` selects an output format, not a destination file. Updated the examples to use `gardenctl kubeconfig --raw > ~/.kube/gardener-flux-config`.
- The hibernation-aware Flux Kustomization was presented as a separate file with the same `metadata.name` as the earlier `web-service` Kustomization, which would conflict if both were applied. Updated the file comment to show it as the same `web-service.yaml` resource and preserved the existing `dependsOn` dependency.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1`, while the current Flux notification Provider and Alert docs use `notification.toolkit.fluxcd.io/v1beta3`. Updated both resources to `v1beta3`.

## Review Notes
- Gardener-supported Kubernetes and machine image versions are landscape-specific and come from the configured CloudProfile. The manifest is now aligned with the current API shape, but readers should still choose versions available in their own Gardener landscape.
- The ingress-nginx chart repository and AWS NLB annotations are syntactically valid, but teams should verify ingress-nginx project support status and cloud-controller behavior for their target Kubernetes and AWS environments.

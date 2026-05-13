# Validation Summary: How to Set Up Hub-and-Spoke Mode Multi-Cluster with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Multi-cluster deployment
- Kustomize Controller Kustomization resources
- Helm Controller HelmRelease resources
- Notification Controller Alert resources
- Kubernetes ServiceAccounts, RBAC, and Secrets
- SOPS secret decryption

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/v1/
- Flux `bootstrap github` CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes ServiceAccount concepts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/

## Issues Found
- The service account token Secret manifest was shown but not applied before later commands attempted to read it. Added a `kubectl apply -f flux-reconciler-token.yaml` command so the Secret exists before `kubectl get secret flux-reconciler-token` is used.
- The notification `Alert` example used `notification.toolkit.fluxcd.io/v1`, but the current Flux Alert documentation uses `notification.toolkit.fluxcd.io/v1beta3`, while the `v1` notification API reference only documents `Receiver`. Updated the Alert manifest to `notification.toolkit.fluxcd.io/v1beta3`.

## Review Notes
The Flux remote-cluster `kubeConfig.secretRef` usage, default kubeconfig Secret key behavior, Kustomization health checks against remote clusters, HelmRelease remote-cluster targeting, and `flux bootstrap github` flags were consistent with the official Flux documentation. Kubernetes still supports manually created `kubernetes.io/service-account-token` Secrets, but the Kubernetes documentation recommends short-lived TokenRequest tokens where practical because long-lived bearer tokens carry higher security risk.

# Validation Summary: How to Set Up Flux CD on Platform9 Managed Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Platform9 Managed Kubernetes
- Kubernetes
- kubectl
- Flux CD
- Flux GitHub bootstrap
- Flux Kustomization, GitRepository, HelmRepository, HelmRelease, Provider, and Alert resources
- Kustomize
- Helm
- ingress-nginx
- cert-manager
- kube-prometheus-stack
- Slack notifications

## Sources Consulted
- Flux CLI documentation for `flux bootstrap github`: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification API reference v1 and v1beta3: https://fluxcd.io/flux/components/notification/api/v1/ and https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux `get kustomizations` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Platform9 PMK kubeconfig documentation: https://platform9.com/docs/kubernetes/kubeconfig-and-clients-download-kubeconfig-from-ui
- Platform9 `pf9ctl` command reference: https://platform9.com/docs/kubernetes/pmk-cli-commands and https://github.com/platform9/pf9ctl
- cert-manager HTTP-01 issuer documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager annotated Ingress documentation: https://cert-manager.io/docs/usage/ingress/
- Flux monitoring documentation: https://fluxcd.io/flux/guides/monitoring/

## Issues Found
- The Platform9 kubeconfig section included an unsupported `pf9ctl cluster credentials` command and a `pip install pf9ctl` installation path that does not match the public Platform9 CLI reference. I removed the invalid CLI flow and corrected the UI path to the PMK kubeconfig download workflow.
- The Flux repository layout created new infrastructure and app manifests but did not include them from the bootstrap root `clusters/platform9/kustomization.yaml`, so Flux would not apply them. I added the root kustomization entries for infrastructure and apps.
- The production app Flux Kustomization was created under `clusters/platform9/apps` but that directory had no `kustomization.yaml`. I added the required Kustomize file so the app Kustomization is applied.
- The Ingress referenced `cert-manager.io/cluster-issuer: letsencrypt-prod`, but the guide never created that ClusterIssuer. I added a cert-manager `ClusterIssuer` using the current `cert-manager.io/v1` API and HTTP-01 `ingressClassName` solver, and placed it in a separate Flux Kustomization that depends on cert-manager being installed first.
- The monitoring HelmRelease was shown but not added to the infrastructure kustomization, so it would not be reconciled. I added it to the infrastructure resource list.
- The notification examples used `notification.toolkit.fluxcd.io/v1` for `Provider` and `Alert`, but current Flux docs expose those resource types under `v1beta3`; `v1` is for `Receiver`. I changed the notification manifests to `v1beta3`.
- The Slack notification Provider referenced a `slack-webhook` secret but did not create it. I added a `kubectl create secret generic` command using the `address` key expected by Flux's legacy Slack webhook provider.
- The monitoring section used direct static scrape targets for Flux metrics. This can work, but the official Flux monitoring guide recommends PodMonitor resources with kube-prometheus-stack. I added a note to prefer PodMonitor objects in production while preserving the example.

## Review Notes
The remaining examples are technically plausible but assume infrastructure-specific prerequisites, especially a working LoadBalancer implementation for ingress-nginx and public HTTP reachability for Let's Encrypt HTTP-01 validation. The cert-manager email placeholder must be replaced before real use.

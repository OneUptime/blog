# Validation Summary: How to Set Up a Complete GitOps Platform with Flux CD from Scratch

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm and Flux Helm Controller
- Kustomize
- cert-manager
- ingress-nginx
- External Secrets Operator
- kube-prometheus-stack
- Flux notification-controller
- Kubernetes RBAC, ResourceQuota, and NetworkPolicy

## Sources Consulted
- Flux bootstrap GitHub CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux Kustomization documentation and API reference: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux notification Provider and Alert documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux image automation marker documentation: https://fluxcd.io/flux/guides/image-update/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager Jetstack Helm repository index: https://charts.jetstack.io/index.yaml
- ingress-nginx Helm chart repository and values: https://github.com/kubernetes/ingress-nginx/tree/main/charts/ingress-nginx
- External Secrets Operator ClusterSecretStore documentation: https://external-secrets.io/latest/api/clustersecretstore/
- External Secrets Operator Helm chart values: https://github.com/external-secrets/external-secrets/tree/main/deploy/charts/external-secrets
- prometheus-community Helm chart repository: https://prometheus-community.github.io/helm-charts
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- HelmRelease objects were placed in target namespaces that would not exist before reconciliation. Moved the HelmRelease resources to `flux-system` and added explicit `releaseName` and `targetNamespace` fields for cert-manager, ingress-nginx, External Secrets, and kube-prometheus-stack.
- Helm chart versions used wildcard ranges and some older chart lines. Replaced them with current exact chart versions available from the official repositories.
- cert-manager used the outdated `installCRDs` value for the pinned chart. Changed it to `crds.enabled`.
- External Secrets used `certController.enabled`, but the chart value is `certController.create`. Corrected the value.
- External Secrets `ClusterSecretStore` used `external-secrets.io/v1beta1`; current docs use `external-secrets.io/v1`. Updated the API version and aligned the service account reference with the chart's default release service account name.
- Kustomize directory references would require missing nested `kustomization.yaml` files. Changed the infrastructure Kustomization to reference concrete `helmrelease.yaml` files and added a minimal platform Kustomization.
- Tenant base manifests used empty resource names and namespaces, which are invalid Kubernetes metadata values and unreliable Kustomize patch targets. Replaced them with a placeholder name and patched that placeholder.
- The tenant NetworkPolicy claimed to allow DNS but allowed UDP/53 to all namespaces. Narrowed it to the common CoreDNS labels in `kube-system` and included TCP/53 as well as UDP/53.
- The sample Deployment used `"${ENV:=dev}"`, which Kubernetes would treat as a literal value without Flux post-build substitution. Changed it to a literal `dev` value.
- The app overlay used a JSON patch `replace` operation for `/spec/replicas` even though the base Deployment did not define that field. Changed it to `add`.
- The production cluster entry point had an `apps` Kustomization depending on `platform` without defining the production `platform` Kustomization. Added the missing production infrastructure-configs and platform Kustomizations.

## Review Notes
The Slack webhook Provider example is technically valid for Flux's legacy incoming webhook mode when the referenced Secret contains an `address` key. The DNS NetworkPolicy labels are correct for standard CoreDNS installs, but clusters with customized DNS labels should adjust that selector.

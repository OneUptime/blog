# Validation Summary: How to Configure Cross-Tenant Resource Sharing in Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux HelmRepository, HelmRelease, and Kustomization APIs
- Kubernetes namespaces, ConfigMaps, Services, and NetworkPolicy
- External Secrets Operator
- Helm chart repositories and semantic version constraints
- kubectl and Flux CLI commands

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux security best practices: https://fluxcd.io/flux/security/best-practices/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI documentation for `flux get sources helm`: https://fluxcd.io/flux/cmd/flux_get_sources_helm/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes `kubectl run` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator ClusterSecretStore documentation: https://external-secrets.io/latest/api/clustersecretstore/
- Helm chart documentation on semantic version constraints: https://helm.sh/docs/topics/charts/
- Bitnami Helm chart repository index: https://charts.bitnami.com/bitnami/index.yaml
- ingress-nginx Helm chart repository index: https://kubernetes.github.io/ingress-nginx/index.yaml

## Issues Found
- The post implied cross-namespace references were simply enabled by default in Flux controllers. Flux does allow cross-namespace references by default, but Flux's official multi-tenancy lockdown guidance disables them with `--no-cross-namespace-refs=true`. Updated the wording to say the shared HelmRepository pattern requires helm-controller cross-namespace references to be enabled and should be used only for platform-approved shared sources.
- The security guidance did not explicitly account for the authorization risk introduced by enabling cross-namespace Flux references. Added guidance to enforce tenant RBAC or admission policies so tenants cannot reference unauthorized Flux objects.
- The summary claimed platform admins control all sharing configurations without naming the controls required to make that true. Updated it to mention RBAC, admission policies, and reviews.

## Review Notes
The Flux API versions, External Secrets Operator `external-secrets.io/v1` example, Kubernetes NetworkPolicy selectors, Flux CLI commands, and `kubectl run` command form are current and valid. The Bitnami chart repository currently contains `nginx` 24.x and `redis` 25.x versions, and Helm supports wildcard chart version constraints such as `24.x` and `25.x`.

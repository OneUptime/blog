# Validation Summary: How to Configure Project Cluster Resource Whitelists in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD AppProject configuration
- Kubernetes cluster-scoped and namespaced resources
- kubectl
- Argo CD CLI
- cert-manager
- Gateway API
- Kyverno
- OPA Gatekeeper

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-options/
- Argo CD `argocd proj get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_proj_get/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Kubernetes `kubectl api-resources` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes PodSecurityPolicy documentation: https://kubernetes.io/docs/concepts/policy/pod-security-policy/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Gateway API GatewayClass documentation: https://gateway-api.sigs.k8s.io/api-types/gatewayclass/
- Istio upstream CRD manifests for `PeerAuthentication` and `EnvoyFilter`: https://github.com/istio/istio
- Prometheus Operator upstream CRD manifests for `Prometheus` and `Alertmanager`: https://github.com/prometheus-operator/prometheus-operator

## Issues Found
- The post described PodSecurityPolicy only as deprecated. I updated it to state that it was deprecated in Kubernetes v1.21 and removed in Kubernetes v1.25.
- The default behavior section did not mention the built-in `default` AppProject exception. I clarified that dedicated projects deny cluster-scoped resources unless whitelisted, while the built-in `default` project is created with wildcard cluster-resource access.
- The Istio examples listed `PeerAuthentication` and `EnvoyFilter` under `clusterResourceWhitelist`, but Istio's CRDs define both as namespaced resources. I replaced that example with cert-manager `ClusterIssuer`, which is cluster-scoped.
- The Prometheus Operator examples listed `Prometheus` and `Alertmanager` under `clusterResourceWhitelist`, but the Prometheus Operator CRDs define both as namespaced resources. I replaced that example with Gateway API `GatewayClass`, which is cluster-scoped.

## Review Notes
The Argo CD and kubectl CLI commands use current documented flags. The AppProject field names and blacklist/whitelist behavior match the current Argo CD project specification. Future improvements could mention Argo CD's optional `name` matcher for cluster resource whitelist and blacklist entries, but the existing guide is technically correct without it.

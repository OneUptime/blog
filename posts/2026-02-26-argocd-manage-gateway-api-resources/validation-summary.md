# Validation Summary: How to Manage Gateway API Resources with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and AppProjects
- Kubernetes Gateway API
- Envoy Gateway
- HTTPRoute routing, traffic splitting, and header filters
- Gateway API TLS certificate references and ReferenceGrant
- Argo CD custom resource health checks

## Sources Consulted
- Kubernetes Gateway API introduction: https://gateway-api.sigs.k8s.io/docs/introduction/
- Kubernetes Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/
- Kubernetes Gateway API HTTP header modifier guide: https://gateway-api.sigs.k8s.io/guides/http-header-modifier/
- Kubernetes Gateway API TLS guide: https://gateway-api.sigs.k8s.io/guides/user-guides/tls/
- Kubernetes Gateway API v1.5 specification: https://gateway-api.sigs.k8s.io/reference/1.5/spec/
- Kubernetes Gateway API security model: https://gateway-api.sigs.k8s.io/docs/concepts/security/
- Envoy Gateway Helm installation documentation: https://gateway.envoyproxy.io/docs/install/install-helm/
- Envoy Gateway HTTP routing documentation: https://gateway.envoyproxy.io/docs/tasks/traffic/http-routing/
- Argo CD AppProject specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Helm source options: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD custom resource health checks: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/

## Issues Found
- The Gateway API CRD example used `targetRevision: v1.1.0`, which is outdated for a current 2026 guide. Updated it to `v1.5.0`, matching the current Gateway API standard release referenced by the official Gateway API docs.
- The Envoy Gateway Helm chart example used `targetRevision: v1.0.0`, which the official Envoy Gateway docs mark as EOL. Updated it to `v1.8.0`.
- The Argo CD Applications referenced a project named `infrastructure`, but the AppProject example defined `gateway-infra`. Updated the Application snippets to use `gateway-infra`.
- The Gateway referenced a TLS Secret in the `cert-manager` namespace from a Gateway in `gateway-system` without a `ReferenceGrant`. Added the required `ReferenceGrant` in `cert-manager`, because Gateway API requires it for cross-namespace Secret references.
- The `gateway-infra` AppProject allowed only the placeholder platform repository, which would block the Gateway API CRD and Envoy Gateway Application sources shown earlier. Added the official Gateway API Git repo and Envoy Gateway OCI repo to `sourceRepos`.
- The `gateway-infra` AppProject was too narrow for installing the controller and CRDs it was assigned to manage. Updated its resource and destination permissions so the example Applications can sync under that project.

## Review Notes
The remaining Gateway API examples use valid `gateway.networking.k8s.io/v1` resources and current field names. `ResponseHeaderModifier` is an extended Gateway API feature, so support depends on the selected Gateway API implementation; Envoy Gateway documents support for response header modification.

# Validation Summary: How to Configure Istio Authorization Policies with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio AuthorizationPolicy
- Istio RequestAuthentication
- Flux CD v2
- Kubernetes
- Kustomize
- GitOps
- JWT authorization
- Service mesh mTLS

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio security concepts and authorization value matching: https://istio.io/latest/docs/concepts/security/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux reconcile kustomization CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The JWT authorization example used `requestPrincipals` and JWT claims without defining a `RequestAuthentication` resource. Istio requires request authentication to validate JWTs and populate request principal and claim attributes. Added a `RequestAuthentication` resource to the existing JWT manifest.
- The service-to-service policy example showed `allow-frontend-to-api.yaml` and `allow-api-to-db.yaml` in one multi-document YAML block, while the Kustomize file referenced them as separate resources. Split the code block so each snippet matches the filename used by Kustomize.

## Review Notes
- The deny-all `spec: {}` pattern, ALLOW policies, principal format, `request.auth.claims[...]` condition, Flux `Kustomization` API version, `dependsOn`, `path`, `prune`, `sourceRef`, and `flux reconcile kustomization` command are consistent with current official documentation.
- The examples assume matching workload labels, ServiceAccount names, an Istio ingress gateway ServiceAccount name, and a Flux `Kustomization` named `istio` already exist in the target environment.

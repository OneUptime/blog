# Validation Summary: Flux CD vs ArgoCD: Multi-Tenancy Comparison

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Argo CD
- Kubernetes RBAC
- Kubernetes namespaces and service accounts
- Kubernetes ResourceQuota and LimitRange
- Kubernetes NetworkPolicy
- GitOps multi-tenancy

## Sources Consulted
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Argo CD Project specification reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/project-specification/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The Flux Kustomization examples placed tenant Kustomization resources in `flux-system` while the impersonated service account was defined in the tenant namespace. Flux's `serviceAccountName` is a local name used for impersonation during reconciliation, so the examples were changed to place tenant Kustomizations and tenant GitRepository resources in the tenant namespace.
- The Flux Kustomization example used `validation: client`, which is not part of the current `kustomize.toolkit.fluxcd.io/v1` Kustomization API. The field was removed and replaced with a note to enforce cross-namespace reference blocking via the controller's `--no-cross-namespace-refs=true` option.
- The Flux health check example used a wildcard name in `healthChecks`. Current Flux documentation describes `healthChecks` as explicit object references, so the example was changed to use `wait: true` for health assessment of reconciled resources.
- The monorepo Flux example implied Flux itself grants a team access only to a directory. The comment was corrected to state that Flux reconciles only the configured path and Git write access must enforce tenant boundaries.
- A later Flux comparison snippet referenced a source named `flux-system` from a tenant namespace. It was corrected to use a tenant source name.

## Review Notes
The Argo CD AppProject, RBAC, sync window, and ApplicationSet examples are consistent with the documented API shapes. The post intentionally uses illustrative repository URLs and team names; these are plausible placeholders rather than live resources.

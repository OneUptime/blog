# Validation Summary: How to Structure a Flux CD Repository for Platform Engineering Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- GitOps Toolkit Kustomization and GitRepository resources
- Kubernetes namespaces, RBAC, ResourceQuota, NetworkPolicy, Deployments, and Pod Security Admission labels
- Kustomize
- Kyverno ClusterPolicy validation
- kubectl and flux CLI commands

## Sources Consulted
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization guide: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI documentation for `flux get kustomizations`: https://v2-6.docs.fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/

## Issues Found
- The Kyverno examples used the older top-level `validationFailureAction` field. I changed them to use `validate.failureAction: Enforce`, matching current Kyverno policy examples.
- The image registry Kyverno policy used a single container pattern with a pipe-separated string. I changed it to use `foreach` with `anyPattern` for init containers and regular containers so each image is checked against the approved registry patterns.
- The ingress NetworkPolicy selected a namespace using `app.kubernetes.io/name: ingress-nginx`, which is normally a workload label rather than a Namespace label. I changed it to select the ingress-nginx namespace using Kubernetes' built-in `kubernetes.io/metadata.name` Namespace label and added a pod selector for ingress-nginx pods.

## Review Notes
- The Flux Kustomization fields, `dependsOn`, `serviceAccountName`, `targetNamespace`, and GitRepository fields are consistent with current Flux documentation.
- The Kubernetes ResourceQuota, RBAC, NetworkPolicy, Deployment, and Pod Security Admission label examples are syntactically valid.
- The `git-credentials` Secret referenced by the tenant GitRepository must exist in the same namespace as the GitRepository for private repositories.

# Validation Summary: How to Configure Flux with Namespace-Scoped Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomize Controller
- Kubernetes RBAC
- Kubernetes ServiceAccounts
- Kustomize
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux multi-tenancy configuration: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux security documentation: https://fluxcd.io/flux/security/
- Flux security best practices: https://fluxcd.io/flux/security/best-practices/
- Flux CLI `flux get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes user impersonation documentation: https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The original examples created impersonated service accounts in the target workload namespaces while the Flux Kustomization objects were in `flux-system`. Flux resolves `spec.serviceAccountName` in the Kustomization object's namespace, so the service accounts must exist in `flux-system` for these examples. Updated the service account manifests and RoleBinding subjects accordingly.
- The verification commands impersonated `system:serviceaccount:webapp:webapp-deployer`, which no longer matched the corrected service account location. Updated them to impersonate `system:serviceaccount:flux-system:webapp-deployer`.
- The Kustomize overlay example included `service-account.yaml` under `namespace: webapp`, which would place the service account in the workload namespace and conflict with the Flux impersonation behavior. Removed that resource from the namespace-local overlay.
- The controller RBAC section said to reduce the kustomize-controller role to "impersonation only". Flux controllers still need their controller RBAC for Flux CRDs and controller-runtime resources. Updated the wording to describe replacing the broad reconciliation binding while keeping the Flux `crd-controller` binding.
- The conclusion described namespace-scoped permissions as the "strongest isolation model". Adjusted this to "a strong isolation model" because separate clusters or harder multi-tenancy controls can provide stronger boundaries.

## Review Notes
The YAML API versions and fields used in the examples are current for Flux Kustomization `kustomize.toolkit.fluxcd.io/v1` and Kubernetes RBAC `rbac.authorization.k8s.io/v1`. The `kubectl auth can-i --as` and `flux get kustomizations -A` commands are valid according to current official CLI references. The custom controller RBAC remains an advanced setup and should be tested against the exact installed Flux version and enabled controller flags before production use.

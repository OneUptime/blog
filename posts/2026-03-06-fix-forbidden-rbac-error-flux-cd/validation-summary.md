# Validation Summary: How to Fix 'forbidden' RBAC Error in Flux CD

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes RBAC
- Kubernetes ServiceAccounts
- Flux Kustomizations
- Flux HelmReleases
- kubectl
- flux CLI

## Sources Consulted
- Flux Security Documentation: https://fluxcd.io/flux/security/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux reconcile kustomization CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes user impersonation documentation: https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/
- kubectl auth can-i documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post said Flux controllers run with broad permissions in the `flux-system` namespace. Flux's default RBAC binds the `kustomize-controller` and `helm-controller` service accounts to the `cluster-admin` ClusterRole through the `cluster-reconciler` ClusterRoleBinding. Updated the wording to describe the default binding and the restricted-service-account case accurately.
- The diagnostic command described `crd-controller-flux-system`, which covers Flux CRD access rather than the workload reconciliation cluster-admin binding. Updated it to describe `cluster-reconciler-flux-system`.
- The tenant Kustomization example placed the Kustomization in `flux-system` while creating the tenant service account in `team-alpha`. Flux impersonates the service account from the Kustomization's namespace, so the example would not use the intended service account. Moved the Kustomization to `team-alpha` and added `sourceRef.namespace: flux-system`.
- The Helm RBAC section commented that the `policy` API rule was for PodSecurityPolicies, but the resource listed was `poddisruptionbudgets`. Updated the comment to PodDisruptionBudgets.
- The audit troubleshooting command implied API server audit events can generally be read from `kubectl logs` with a fixed pod name and grep pattern. Replaced it with a note to check the configured Kubernetes audit log backend.
- The quick command for checking a Kustomization's service account hard-coded `flux-system`. Changed it to `<namespace>` so it applies to tenant Kustomizations as well.

## Review Notes
The remaining RBAC examples are intentionally broad and appropriate only as troubleshooting examples or for development/single-team clusters. Future improvements could show stricter, application-specific roles and mention that cross-namespace source references may be blocked when Flux is run with `--no-cross-namespace-refs=true`.

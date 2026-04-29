# Validation Summary: How to Set Up Kubernetes RBAC Alongside Portainer RBAC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Business Edition
- Kubernetes RBAC
- Kubernetes ServiceAccounts and RoleBindings
- `kubectl`
- YAML manifests

## Sources Consulted
- Portainer Documentation: Kubernetes roles and bindings — https://docs.portainer.io/advanced/kubernetes-roles-and-bindings
- Portainer Documentation: Roles — https://docs.portainer.io/admin/user/roles
- Portainer Documentation: Import an existing Kubernetes environment — https://docs.portainer.io/admin/environments/add/kubernetes/import
- Portainer Documentation: Create a Kubernetes RBAC policy — https://docs.portainer.io/admin/environments/policies/kubernetes-policies/kubernetes-rbac-policy
- Portainer Documentation: Environments / Manage access — https://docs.portainer.io/admin/environments/environments
- Portainer Documentation: Kubeconfig — https://docs.portainer.io/user/kubernetes/kubeconfig
- Kubernetes Documentation: Using RBAC Authorization — https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Documentation: `kubectl auth can-i` — https://v1-35.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes API Reference v1.35 — https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/

## Issues Found

1. **The Portainer environment setup guidance was inaccurate.** The post said to create a separate Portainer Kubernetes environment for each team using a team service account kubeconfig. Current Portainer documentation says kubeconfig import is a legacy option, requires cluster-admin credentials to deploy the agent, and does not represent the recommended way to enforce team namespace access. I changed Step 4 to describe adding the cluster once and assigning team access inside Portainer with environment access and Kubernetes RBAC policies.

2. **The Portainer-to-Kubernetes role mapping table was incorrect.** `cluster-admin` was described as "Admin namespace only", which is wrong for the documented Portainer Environment Administrator mapping. The Standard User and Read-Only User rows also did not match Portainer's documented Kubernetes role bindings. I replaced the table with the current documented mappings and corrected the access path to Portainer's current UI.

3. **The namespace Role example was broader and less precise than necessary.** The original manifest grouped `pods`, `pods/log`, and `pods/exec` under the same verb set. I split these into separate rules so pod reads use `get/list/watch`, log access uses `get`, and exec uses `create`, which better matches the underlying Kubernetes API actions and least-privilege intent.

4. **The service account example implied Portainer would use that account directly for environment onboarding.** That is misleading in the context of current Portainer Kubernetes onboarding. I reworded Step 3 to position the service account as direct namespace-scoped cluster access paired alongside Portainer, renamed the service account to remove the Portainer-specific implication, and updated the audit command accordingly.

## Review Notes
- Portainer RBAC and the Kubernetes role mappings referenced in this post are Business Edition features.
- The legacy kubeconfig import path in Portainer does not support policy management; readers should prefer the standard managed environment flow when they need namespace-scoped Portainer RBAC policies.

# Validation Summary: How to Implement Namespace-Based Multi-Tenancy in Portainer for Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes namespaces
- Kubernetes RBAC
- ResourceQuota
- LimitRange
- ServiceAccount
- `kubectl`

## Sources Consulted
- Portainer docs: Install Portainer Agent on your Kubernetes environment - https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer docs: Manage access to a namespace - https://docs.portainer.io/user/kubernetes/namespaces/access
- Portainer docs: Create a Kubernetes RBAC policy - https://docs.portainer.io/admin/environments/policies/kubernetes-policies/kubernetes-rbac-policy
- Portainer docs: Kubernetes roles and bindings - https://docs.portainer.io/advanced/kubernetes-roles-and-bindings
- Portainer docs: API documentation - https://docs.portainer.io/sts/api/docs
- Kubernetes docs: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes docs: Using RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes docs: `kubectl create token` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes docs: `kubectl auth can-i` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes docs: `kubectl top` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/

## Issues Found
- The introduction implied Portainer namespace-level RBAC was a generic Portainer capability. I clarified that Portainer's RBAC-based namespace access controls are available in Business Edition, matching Portainer's official RBAC documentation.
- The Portainer agent install example used an old hard-coded manifest path (`ce2-19`) and showed the environment URL with an `https://` prefix. I updated the manifest example to a current LTS path and corrected the environment URL format to `AGENT_LB_IP:9001`, which matches Portainer's agent connection guidance.
- The namespace labels were described as being for "Portainer management", but Portainer does not document special namespace labels for that purpose. I changed the wording to make them clearly optional tenant metadata and replaced the label keys with generic labels.
- The `ResourceQuota` example used `deployments.apps`, which is not the documented object-count syntax for non-core API groups. I corrected it to `count/deployments.apps`.
- The RBAC example mixed core and non-core resources in one rule, used the deprecated `extensions` API group for deployments, and granted incorrect verbs for `pods/exec`. I split the rules by API group, removed `extensions`, kept `pods/log` as `get`, and changed `pods/exec` to use exec-appropriate permissions.
- The service account token example relied on reading an auto-generated secret from `.secrets[0]`, which is outdated for modern Kubernetes. I replaced it with `kubectl create token`, which is the current documented approach.
- The Portainer namespace-access step used an unverified API endpoint and request body. I replaced it with the documented Portainer UI workflow for creating a Kubernetes RBAC policy with a namespace-scoped role.
- The verification step described `kubectl get pods --as=...` as if it were being run directly "as a team-alpha user". I changed this to an explicit impersonation check using `kubectl auth can-i`, which matches the documented authorization-testing workflow.
- The `kubectl top pods` examples assumed metrics were available without noting the prerequisite. I changed them to the documented `kubectl top pod` form and added that Metrics Server is required.

## Review Notes
- Portainer's docs describe agent-only installation on Kubernetes as a legacy option and recommend the Edge Agent for most new use cases. The post still remains technically valid with the corrected agent example.
- Namespace access and namespace-scoped RBAC in Portainer depend on Kubernetes RBAC being enabled and, for Portainer's RBAC-based access controls, on Portainer Business Edition.

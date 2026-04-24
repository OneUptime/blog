# Validation Summary: How to Configure Namespace-Level Access in Portainer for Kubernetes (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Business Edition
- Portainer HTTP API
- Portainer Terraform provider
- Kubernetes namespaces
- Kubernetes RBAC
- Kubernetes ResourceQuota
- `kubectl`

## Sources Consulted
- Portainer docs: Manage access to a namespace — https://docs.portainer.io/user/kubernetes/namespaces/access.md
- Portainer docs: Add a new namespace — https://docs.portainer.io/user/kubernetes/namespaces/add.md
- Portainer docs: Manage a namespace — https://docs.portainer.io/user/kubernetes/namespaces/manage.md
- Portainer docs: Kubernetes roles and bindings — https://docs.portainer.io/advanced/kubernetes-roles-and-bindings.md
- Portainer docs: Roles — https://docs.portainer.io/admin/user/roles.md
- Portainer docs: Create a Kubernetes RBAC policy — https://docs.portainer.io/admin/environments/policies/kubernetes-policies/kubernetes-rbac-policy.md
- Portainer docs: Accessing the Portainer API — https://docs.portainer.io/api/access.md
- Portainer API OpenAPI spec 2.39.1 BE — https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer Terraform provider docs: `kubernetes_namespace_access` — https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/docs/resources/kubernetes_namespace_access.md
- Portainer Terraform provider source: `resource_kubernetes_namespace_access.go` — https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/internal/resource_kubernetes_namespace_access.go
- Portainer Terraform provider source: `resource_kubernetes_namespace.go` — https://raw.githubusercontent.com/portainer/terraform-provider-portainer/main/internal/resource_kubernetes_namespace.go
- Kubernetes docs: Resource Quotas — https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes docs: Using RBAC Authorization — https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes docs: `kubectl create namespace` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/

## Issues Found
- The post stated that Kubernetes namespace access management is enabled through a Portainer settings toggle. Portainer's current docs do not document a separate toggle; I corrected Step 1 to the actual prerequisite flow: Portainer Business Edition plus working Kubernetes RBAC, then namespace access from **Namespaces** → **Manage access**.
- The prerequisites omitted two technical requirements: Portainer Business Edition and Kubernetes RBAC enabled in the cluster. I added both, and also clarified that teams must already be added to the environment before namespace access can be granted.
- The namespace creation API example used the wrong path (`/api/endpoints/{id}/kubernetes/namespaces`) and outdated quota fields (`cpu`, `memory`). I corrected it to `/api/kubernetes/{id}/namespaces` with current Business Edition quota fields (`cpuLimit`, `memoryLimit`).
- The namespace access API example used an incorrect endpoint and unsupported `TeamAccessPolicies` / hard-coded `RoleId` payload. I replaced it with the current namespace access endpoint (`/api/endpoints/{id}/pools/{namespace}/access`) and the add/remove user/team payload actually used by Portainer's maintained provider.
- The namespace isolation test used the wrong API path and claimed `kube-system` would typically be visible read-only. I corrected the API path and updated the expected result to match Portainer's documented role scope: assigned namespaces plus `default` for Standard User and Read-only roles.
- The RBAC section showed non-Portainer role names (`portainer-standard-user`) and an unverifiable generated RoleBinding example. I replaced that with Portainer's documented namespace-scoped roles: `portainer-edit` and `portainer-view`.
- Minor UI wording was outdated in two places. I updated `Add namespace` to `Add with form` and `Resource Quota` to `Resource assignment` to match current Portainer documentation.

## Review Notes
The review used current Portainer 2.39.1 LTS documentation as of 2026-04-24. Portainer's end-user docs document the UI flow and RBAC model well, but they do not currently provide a complete raw HTTP example for namespace-scoped access assignment, so that correction was cross-checked against Portainer's current OpenAPI spec and the official Portainer Terraform provider implementation.

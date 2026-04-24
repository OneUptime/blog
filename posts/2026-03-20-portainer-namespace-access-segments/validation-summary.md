# Validation Summary: How to Segment Environments with Namespace Access in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer API
- Kubernetes namespaces
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- `kubectl`
- `curl`
- `jq`
- Bash

## Sources Consulted
- Portainer docs: Manage access to a namespace — https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/access
- Portainer docs: Kubernetes cluster setup — https://docs.portainer.io/user/kubernetes/cluster/setup
- Portainer docs: Roles — https://docs.portainer.io/sts/admin/user/roles
- Portainer docs: Kubernetes roles and bindings — https://docs.portainer.io/2.21/advanced/kubernetes-roles-and-bindings
- Portainer docs: API documentation — https://docs.portainer.io/api/docs
- Portainer OpenAPI spec (BE 2.39.1) — https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Kubernetes docs: Using RBAC Authorization — https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes docs: `kubectl auth can-i` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes docs: `kubectl describe` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes docs: Network Policies — https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes docs: Namespaces — https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes docs: Debugging DNS Resolution — https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution

## Issues Found
- The Portainer UI flow was partly outdated. I corrected the namespace creation path to `Namespaces -> Add with form`, changed namespace access management to the documented `Manage access` flow, and removed the nonexistent `Namespace-based access control` toggle.
- The article implied namespace access assignment also sets the Portainer role. I corrected this by noting that teams must already have environment access with an appropriate Portainer role, and that namespace access only scopes that existing role.
- The Portainer API examples used the wrong namespace-access endpoint and payload. I updated them to use the current namespace listing endpoint (`/api/kubernetes/{id}/namespaces?...`) and the current namespace access update endpoint (`/api/endpoints/{id}/pools/{resourcePoolId}/access`) with the correct payload shape.
- The API examples referred to a generic admin token while using a Bearer header. I normalized the examples to Portainer API-key usage with `X-API-Key`, which matches the access-token documentation and the OpenAPI security definitions.
- The namespace visibility step referenced the wrong UI location and a nonexistent toggle. I corrected it to `Cluster -> Setup -> Restrict access to the default namespace`, which is the documented control that prevents standard users from also seeing the `default` namespace.
- The NetworkPolicy example claimed hard isolation without the required platform caveat and only allowed DNS over UDP. I added the CNI enforcement requirement and allowed both UDP and TCP on port 53 for DNS.
- The Kubernetes Role example mixed resources from different API groups in the same rule, used invalid verbs for subresources, and tried to express denial of cluster-scoped resources with an empty-verb rule. I split the rules by API group, fixed `pods/log` and `pods/exec` verbs, and clarified that a namespaced `Role` does not grant cluster-scoped access.
- The provisioning script assumed the Portainer team name and Kubernetes namespace name were identical and reused the outdated Portainer API calls. I updated it to accept an optional namespace name, use the current Portainer API endpoints, and fail fast if the team or namespace cannot be found in Portainer.
- The conclusion referenced “namespace isolation in Portainer settings” in a way that implied a dedicated feature toggle. I updated it to reflect the actual controls used in the corrected guide.

## Review Notes
- Portainer currently supports both JWT-based auth and API-key auth in the API; this review standardized the post on API keys because the post examples were written as reusable admin-token examples rather than `/api/auth` session-JWT examples.
- The `kubernetes.io/metadata.name` label used in the NetworkPolicy example is automatically added to namespaces by Kubernetes and is suitable for targeting the `kube-system` namespace.
- NetworkPolicies only take effect when the cluster network plugin enforces them, and policy behavior is defined at layer 3/4 for supported protocols.

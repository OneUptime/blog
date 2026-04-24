# Validation Summary: How to Implement Namespace-Based Multi-Tenancy in Portainer for Kubernetes (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Business Edition
- Kubernetes namespaces
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota
- `kubectl`

## Sources Consulted
- Portainer namespace access documentation: https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/access
- Portainer roles documentation: https://docs.portainer.io/sts/admin/user/roles
- Portainer installation requirements for Kubernetes RBAC: https://docs.portainer.io/start/install/server/kubernetes/baremetal
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- `kubectl create namespace` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/
- `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The post implied the Portainer namespace access workflow was generally available in Portainer. I corrected this to Portainer Business Edition and noted that Kubernetes RBAC must already be enabled, matching current Portainer documentation.
- The Portainer UI instructions were outdated. I changed them to the current documented flow: open the Kubernetes environment, go to **Namespaces**, click **Manage access** on the namespace row, then add the team and create access.
- The RBAC example used the deprecated `extensions` API group for Ingress resources. I replaced it with `networking.k8s.io` and split the rule by API group so the example reflects current Kubernetes APIs more accurately.
- The `pods/log` and `pods/exec` subresource permissions were too loose and mixed together. I separated them and aligned the verbs with the relevant subresource access patterns.
- The namespace labeling comment incorrectly suggested Portainer depended on those labels. I changed that wording so the labels are described as tenancy metadata and policy-tool inputs instead.
- The NetworkPolicy example used a misleading namespace selector comment and an invalid `to: {}` egress stanza while claiming it allowed “internet” access. I replaced it with a valid strict same-namespace policy using `podSelector: {}` for ingress and egress, and added the required caveat that DNS or external egress needs separate rules.

## Review Notes
- NetworkPolicy enforcement depends on the cluster's CNI plugin supporting NetworkPolicy objects.
- Portainer documentation is versioned; UI labels and navigation can shift between LTS and STS releases, so these instructions should be checked again if the post is revised for a different Portainer version.
- The ResourceQuota example is technically valid as written. Enforcement still depends on standard Kubernetes quota admission being enabled on the cluster.

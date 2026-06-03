# Validation Summary: How to Restrict Secret Access to Specific ServiceAccounts with RBAC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes RBAC
- Kubernetes Secrets
- Kubernetes ServiceAccounts
- kubectl
- OPA Gatekeeper

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ServiceAccount API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-account-v1/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i
- OPA Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- OPA Gatekeeper data replication documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/v3.6.x/sync/

## Issues Found
- The post originally stated that any pod in a namespace can access any Secret in that namespace by default. Kubernetes documentation is more precise: containers only receive Secrets that are explicitly referenced, but anyone authorized to create Pods in a namespace can use that permission to expose any Secret in that namespace. Updated the introduction to reflect that distinction.
- The post conflated RBAC `get secrets` API permissions with Pod-mounted or environment-variable Secret access. RBAC controls direct Kubernetes API reads by a ServiceAccount, but it does not by itself restrict which Secrets a Pod can reference. Updated the wording throughout to clarify "API access" and added a note that Pod creation permissions and admission policies control the Pod-reference path.
- The Deployment example was missing the required `spec.selector` and matching `template.metadata.labels` fields for an `apps/v1` Deployment. Added a selector and labels so the manifest is valid.
- The "Multiple Secrets" Role used `verbs: ["get", "list"]` together with `resourceNames`. Kubernetes RBAC only authorizes list/watch with `resourceNames` when the request includes a matching `metadata.name` field selector, so this was misleading for listing multiple named Secrets. Removed `list` and kept `get`.
- The pattern-based section implied RBAC could grant access by label selector. RBAC does not support label selectors in PolicyRules. Updated the example and wording to describe broad API access versus admission policy enforcement.
- The Gatekeeper example used `data.inventory` without noting the required Secret sync configuration or the need for a matching Constraint. Added a caveat explaining those requirements and clarified that Gatekeeper admission does not replace RBAC for direct Secret API reads.
- The cross-namespace example used a ClusterRoleBinding, which would grant the named Secret permission cluster-wide for any namespace containing a Secret with that name. Replaced it with a Role and RoleBinding in the namespace that contains the Secret, with ServiceAccount subjects from the production namespace.

## Review Notes
The corrected post is accurate as a guide to restricting direct Kubernetes API reads of Secrets by ServiceAccount. For future improvement, the title and description could be made more explicit that RBAC is not a complete control for Pod-mounted Secret use; namespace isolation and admission control remain necessary for that path.

# Validation Summary: How to Configure Development Namespaces in Rancher - Dev

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Kubernetes Namespaces
- ResourceQuota
- LimitRange
- RBAC
- NetworkPolicy
- Kustomize
- Rancher management API

## Sources Consulted
- Rancher Namespaces guide: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/manage-namespaces
- Rancher Projects workflow guide: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher API reference: https://ranchermanager.docs.rancher.com/api/api-reference
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes object quota task: https://kubernetes.io/docs/tasks/administer-cluster/quota-api-object/
- Kubernetes LimitRange: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Kustomize task: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
- The original `rancher namespace move dev-team-alpha project-id` example was not supported by the current Rancher documentation, and Rancher documents that creating a namespace with `kubectl` without scoping it to a project can leave project-scoped users unable to use it. I replaced that example with the documented `field.cattle.io/projectId` namespace annotation workflow.
- The prerequisites omitted a requirement that matters for the NetworkPolicy example: Kubernetes only enforces `NetworkPolicy` objects when the cluster uses a compatible network plugin. I added that prerequisite.
- The RBAC example included the deprecated `extensions` API group even though the post already manages Ingress separately through `networking.k8s.io`. I removed the deprecated API group.
- The Kustomize example said it was overriding the namespace name, but the patch actually modified `metadata.namespace` on a `ResourceQuota`. I corrected it to patch `metadata.name` on the `Namespace` object, which matches the intended behavior.
- The Rancher project membership `curl` example used outdated fields and endpoint assumptions (`projectId`, `roleTemplateId`, `groupName`, and the old `/v3/projectroletemplatebindings` path). I replaced it with the current Rancher management API shape for `ProjectRoleTemplateBinding`, using `projectName`, `roleTemplateName`, `groupPrincipalName`, and the namespaced `management.cattle.io/v3` endpoint.

## Review Notes
- Rancher v2.11 namespace UI documentation is archived, but the namespace/project behavior in the post was cross-checked against the current Rancher API reference before validating the corrected examples.

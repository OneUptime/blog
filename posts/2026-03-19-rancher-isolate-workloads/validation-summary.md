# Validation Summary: How to Isolate Workloads Between Projects in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- Rancher Projects
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes node affinity
- Kubernetes taints and tolerations
- Kubernetes StorageClass
- Pod Security Admission / Pod Security Standards

## Sources Consulted
- Rancher Projects API workflow: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher project resource quotas: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher cluster and project roles: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher projects and namespaces: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/manage-clusters/projects-and-namespaces
- Rancher cluster registration and Project Network Isolation: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes namespace labels for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes node affinity: https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity/
- Kubernetes taints and tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
- The post treated Rancher Project Network Isolation as a per-project setting in **Projects/Namespaces**. I corrected it to the documented cluster-level **Edit Config** flow and updated the explanation to match Rancher's current behavior.
- The `ProjectRoleTemplateBinding` query and `Project` quota manifests used Rancher management-cluster CRDs without saying so. I added the required management-cluster context and added the required `spec.clusterName` field to the `Project` manifests.
- The NetworkPolicy section described policies as if one object could isolate an entire project. I clarified that `NetworkPolicy` is namespace-scoped and tightened the DNS egress rule to target `kube-system` via the built-in namespace label.
- The node affinity `Deployment` example was incomplete and would not apply as shown because it lacked a selector, template labels, and a container spec. I added the minimum required fields.
- The storage example used the removed in-tree AWS EBS provisioner `kubernetes.io/aws-ebs` and used `allowedTopologies` with a custom `project` label, which is not how `allowedTopologies` works. I switched the example to the current EBS CSI provisioner and removed the invalid topology constraint.
- The verification script could report false positives because the network test only printed PASS on failure and the RBAC test relied on shell chaining around `kubectl auth can-i`. I replaced the fixed sleep with `kubectl wait` and rewrote both checks to produce explicit pass/fail output.

## Review Notes
- For imported clusters, Rancher requires Kubernetes `NetworkPolicy` support to already be enabled before Project Network Isolation can be used.
- The Pod Security Admission labels in the post are valid. Pinning `pod-security.kubernetes.io/*-version` labels can make behavior more predictable across Kubernetes upgrades, but the existing labels are still technically correct.
- The storage section is now technically correct for provisioning and quota control. StorageClass separation affects how volumes are provisioned; namespace scoping and RBAC remain the primary access boundaries for PVC-backed storage.

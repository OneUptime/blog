# Validation Summary: How to Set Resource Limits on Namespaces in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- `kubectl`
- `ResourceQuota`
- `LimitRange`
- `jq`
- Bash

## Sources Consulted
- Rancher docs: How Resource Quotas Work in Rancher Projects - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher docs: Project Resource Quotas - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas
- Rancher docs: Overriding the Default Limit for a Namespace - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/override-default-limit-in-namespaces
- Rancher docs: Resource Quota Type Reference - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/resource-quota-types
- Rancher docs: Setting Container Default Resource Limits - https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/set-container-default-resource-limits
- Rancher API workflow docs: Projects - https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Kubernetes docs: Limit Ranges - https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes docs: Configure Quotas for API Objects - https://kubernetes.io/docs/tasks/administer-cluster/quota-api-object/

## Issues Found
- The post treated Rancher namespace limits as if they should be managed by creating or patching a native namespace `ResourceQuota`. I changed the `kubectl` examples to use Rancher's documented `field.cattle.io/projectId` and `field.cattle.io/resourceQuota` namespace annotations, which is the Rancher-specific mechanism for project-backed namespace quota propagation and overrides.
- The Rancher UI step said to use `Edit`, but the documented action is `Edit Config`. I corrected that label.
- The container default resource limit section implied project-level defaults automatically apply to every namespace. I corrected it to note that new namespaces inherit the default automatically, while existing namespaces need to be updated separately.
- The namespace override section used a project lookup and direct `ResourceQuota` patch that did not match Rancher's documented project and namespace workflow. I replaced it with a management-cluster project lookup and a namespace annotation-based override example.
- The workload-type examples used native `ResourceQuota` objects, which did not match the rest of the Rancher project-quota guidance. I updated them to Rancher namespace manifests with quota override annotations.
- The "Percentage usage" `jq` command was invalid and would return no useful output. I replaced it with a working quantity-aware `jq` example that computes percentages for count, CPU, and memory quota values.
- The troubleshooting step suggested re-annotating a namespace into a quota-enabled project. Rancher documentation says a namespace cannot be moved into a project that already has a resource quota configured, so I replaced that advice with the correct recreate-with-annotation guidance.
- The automation script created native `ResourceQuota` objects instead of Rancher namespace overrides. I rewrote it to apply namespace annotations in Rancher's `<cluster-id>:<project-id>` format.

## Review Notes
- The post's `kubectl top` examples assume Metrics Server or another compatible metrics pipeline is installed in the cluster.
- Rancher project resource quotas and container default resource limits propagate differently to existing versus newly created namespaces, so operators should be careful when retrofitting quotas onto older projects.

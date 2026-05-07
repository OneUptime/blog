# Validation Summary: How to Configure Default Resource Limits per Namespace in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- LimitRange
- ResourceQuota
- Terraform
- `kubectl`
- `jq`

## Sources Consulted
- Rancher: Setting Container Default Resource Limits: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/set-container-default-resource-limits
- Rancher: Project Resource Quotas: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas
- Rancher: How Resource Quotas Work in Rancher Projects: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Terraform provider docs: `rancher2_project`: https://github.com/rancher/terraform-provider-rancher2/blob/master/docs/resources/project.md
- Kubernetes: Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes: Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes: Limit Storage Consumption: https://kubernetes.io/docs/tasks/administer-cluster/limit-storage-consumption/
- Kubernetes: Assign Memory Resources to Containers and Pods: https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Kubernetes: `kubectl rollout restart`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes: `kubectl top`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/

## Issues Found
- The post overstated Rancher project-level container defaults. It originally said the defaults applied to all namespaces and that Rancher created `LimitRange` objects automatically. I corrected this to match Rancher documentation: project-level defaults are propagated to namespaces created after the setting is enabled, existing namespaces need separate configuration, and Kubernetes `LimitRange` is the mechanism that performs admission-time defaulting.
- The resource quota explanation was too absolute. It said resource quotas could not be enforced without defaults. I changed this to the Kubernetes-documented behavior: CPU and memory quotas require Pods to specify requests or limits, or admission may reject them.
- The Terraform section needed the same behavior clarification as the UI section. I added a note that Rancher project-level container defaults are propagated to newly created namespaces rather than injected into every Pod.
- The PVC example was incorrect. It used `default` and `defaultRequest` for a `PersistentVolumeClaim` `LimitRange`. I removed those fields and renamed the step to PVC size limits, aligning it with the official Kubernetes storage guidance that documents `min` and `max` for PVC request sizes.
- The monitoring section mixed up resource usage and throttling, and it used an inaccurate OOMKilled event query. I changed the `kubectl top` comments to describe current CPU and memory usage, added the Metrics Server requirement, and replaced the OOMKilled check with a Pod status query based on container termination reasons.
- The rollout text implied the restart example applied generically to all workloads. I clarified that the shown `kubectl rollout restart deployment -n api-production` example applies to workloads managed by Deployments.

## Review Notes
- The Terraform `rancher2_project` block structure and field names were validated against the provider documentation and did not require code changes.
- Rancher 2.7 is an archived release line. The post's UI flow and behavior were validated against current Rancher Manager documentation, and the core behavior described here remains consistent, but minor UI wording can differ across archived versions.

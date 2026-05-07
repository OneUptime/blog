# Validation Summary: How to Set Resource Requests and Limits in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Deployments
- Resource requests and limits
- LimitRange
- ResourceQuota
- kubectl
- Grafana

## Sources Consulted
- Kubernetes: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes: Pod Quality of Service Classes - https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes: Configure Default CPU Requests and Limits for a Namespace - https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/cpu-default-namespace/
- Kubernetes: Configure Default Memory Requests and Limits for a Namespace - https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/memory-default-namespace/
- Kubernetes: Configure Minimum and Maximum CPU Constraints for a Namespace - https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/cpu-constraint-namespace/
- Kubernetes: Configure Minimum and Maximum Memory Constraints for a Namespace - https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/memory-constraint-namespace/
- Kubernetes: kubectl top pod reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes: JSONPath Support - https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Rancher: Deploying Workloads - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/workloads-and-pods/deploy-workloads
- Rancher: Project Resource Quotas - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas
- Rancher: Role-based Access Control for Grafana - https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/monitoring-and-alerting/rbac-for-monitoring

## Issues Found
- The requests description was too absolute. It said requests were "guaranteed" resources and referred to "unrequested resources"; this was revised to match Kubernetes documentation more closely by describing requests as the values used for scheduling against allocatable resources.
- The Rancher workload navigation path was outdated. It was updated to the current documented flow of `☰ > Cluster Management` -> cluster `Explore` -> `Workload` -> workload type.
- The Rancher project quota navigation path was incomplete. It was updated to the documented `Cluster > Projects/Namespaces` flow, including `Group by Project` and `Edit Config`.
- The monitoring instructions were too brittle for current Rancher docs. They were updated to use the documented path to Grafana and to refer to the pod compute dashboard as an example rather than an absolute UI requirement.
- The `kubectl top` examples used plural resource forms. They were changed to the official command-reference forms `kubectl top pod` and `kubectl top node`.
- The LimitRange explanation was imprecise. It was updated to reflect both default request/limit values and enforced per-container minimum and maximum values from the manifest.

## Review Notes
- Validated against current Rancher and Kubernetes documentation as of 2026-05-07. Rancher UI labels and navigation can differ slightly on older 2.7.x releases even though the feature set remains the same.
- The example image tags use `:latest`, which is technically valid for the examples but not ideal for production reproducibility.
- `kubectl` was not installed in the local review environment, so command verification was done against official Kubernetes reference documentation rather than local `--help` output.

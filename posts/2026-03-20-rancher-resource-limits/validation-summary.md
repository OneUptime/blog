# Validation Summary: How to Configure Rancher Resource Limits - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Deployments
- LimitRange
- ResourceQuota
- Vertical Pod Autoscaler (VPA)
- `kubectl`
- `jq`

## Sources Consulted
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes LimitRange: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes ResourceQuota: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Rancher project resource quotas overview: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher projects workflow API examples: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher previous v3 API guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher API reference: https://ranchermanager.docs.rancher.com/api/api-reference

## Issues Found
- The Deployment example was invalid for `apps/v1` because it omitted the required `.spec.selector` and matching pod-template labels. I added both so the manifest would be accepted by the Kubernetes API.
- The prerequisites were incomplete for Steps 5 and 6. I added Metrics Server and VPA installation requirements because `kubectl top` depends on Metrics Server and VPA is a separately installed CRD/controller.
- The LimitRange ratio comment was inaccurate because the snippet configured CPU at `10x` but memory at `4x`. I corrected the comment to match the manifest.
- The ResourceQuota snippet labeled `count/deployments.apps` and `count/statefulsets.apps` as extended resources, which is incorrect. I changed the comment to reflect that these are object count quotas.
- The VPA example used `updateMode: "Auto"`, which is deprecated in current VPA documentation. I changed it to `Recreate` and updated the inline note to list the current explicit modes.
- The audit `jq` command could emit duplicate pod names and ignored `initContainers`. I replaced it with an `any(...)`-based filter that reports each pod once while checking both regular and init containers.
- The QoS section incorrectly described QoS classes as scheduling priority and oversimplified the criteria. I corrected the wording to match Kubernetes eviction behavior and the actual Guaranteed/Burstable rules.

## Review Notes
- The Rancher API example in Step 4 uses Rancher's previous `/v3` API. Rancher documents that API as still available as of April 23, 2026, so the example remains valid, although RK-API (`management.cattle.io/v3`) is the newer interface.
- The post is technically sound after the corrections above and remains suitable for publication.

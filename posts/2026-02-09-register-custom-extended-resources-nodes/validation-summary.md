# Validation Summary: How to Register Custom Extended Resources on Kubernetes Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes extended resources
- Kubernetes node status and allocatable resources
- kubectl JSON patch
- Kubernetes Python client
- Kubernetes Device Plugins
- Kubernetes ResourceQuota
- systemd

## Sources Consulted
- Kubernetes documentation: Advertise Extended Resources for a Node - https://kubernetes.io/docs/tasks/administer-cluster/extended-resource-node/
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: Assign Extended Resources to a Container - https://kubernetes.io/docs/tasks/configure-pod-container/extended-resource/
- Kubernetes documentation: Device Plugins - https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- Kubernetes documentation: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes documentation: kubectl patch reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes documentation: Tools for Monitoring Resources - https://kubernetes.io/docs/tasks/debug-application-cluster/resource-usage-monitoring/

## Issues Found
- The post incorrectly said extended resources can use the `kubernetes.io/` prefix. Kubernetes documents extended resources as fully-qualified names outside the `kubernetes.io` domain, so the wording was corrected.
- The post said administrators patch both node capacity and allocatable. Official documentation says node-level extended resources are advertised by patching `status.capacity`; `status.allocatable` is updated asynchronously by the kubelet. The explanation was corrected.
- The workflow said the scheduler decrements available capacity. This was clarified to say the scheduler accounts for requested capacity when scheduling.
- The `kubectl patch node` examples patched status fields without specifying the `status` subresource. The examples were updated to use `--subresource='status'`.
- The Python client example passed a JSON Patch body without setting the JSON Patch content type. `_content_type="application/json-patch+json"` was added, and the unused `watch` import was removed.
- The software license example implied a single cluster-wide limit across all nodes advertising the same resource. Because these resources are node-level, the explanation was changed to clarify that capacity is treated separately per node.
- The monitoring section suggested querying the resource metrics API for detailed extended-resource monitoring. Kubernetes resource metrics cover CPU and memory usage, not arbitrary extended resource allocation, so that guidance was replaced with a note to expose custom metrics for runtime usage.
- The database connection pool example implied a global database capacity could be modeled directly as a node resource. It was narrowed to a node-local database or proxy and clarified as scheduler-level protection for workloads placed on that node.

## Review Notes
`kubectl` was not installed in the local workspace, so the command syntax was checked against the official Kubernetes generated kubectl reference rather than local `kubectl --help`. The post remains a valid tutorial after the corrections. Future improvements could include an RBAC example for a DaemonSet-based advertiser and a stronger caveat that global resources such as shared license pools are often better enforced with quotas, admission control, or an external controller in addition to node-level extended resources.

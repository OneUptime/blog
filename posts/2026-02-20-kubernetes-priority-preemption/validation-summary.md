# Validation Summary: How to Use Kubernetes Priority Classes and Pod Preemption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PriorityClass
- Kubernetes pod priority and preemption
- Kubernetes scheduler
- Kubernetes PodDisruptionBudget
- kubectl
- Kubernetes Deployments and DaemonSets

## Sources Consulted
- Kubernetes documentation: Pod Priority and Preemption, https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes API reference: PriorityClass v1, https://kubernetes.io/docs/reference/kubernetes-api/scheduling/priority-class-v1/
- Kubernetes API reference: Pod v1 priority fields, https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Guaranteed Scheduling For Critical Add-On Pods, https://kubernetes.io/docs/tasks/administer-cluster/guaranteed-scheduling-critical-addon-pods/
- Kubernetes documentation: Disruptions, https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes documentation: Field Selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl reference: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post described default scheduling as "first-come, first-served." This was too simplistic for Kubernetes scheduling. I changed it to explain that pods use the cluster default priority, or zero if no default PriorityClass exists.
- The post stated that PriorityClasses should be created from lowest to highest priority. PriorityClasses are independent cluster-scoped resources and do not require creation order, so I changed this to say they can be created in any order.
- The post used absolute language such as "ensure critical workloads always have resources" and "critical workloads are never starved." Priority and preemption improve scheduling preference but do not guarantee capacity, so I changed those claims to more accurate wording.
- A deployment comment said the critical payment service "will preempt" lower-priority pods. Preemption only happens when a pending higher-priority pod cannot otherwise be scheduled and eligible victims can make a node feasible, so I changed this to "can preempt."
- The PDB section said PodDisruptionBudgets protect pods during preemption and limit disruptions including preemption. Kubernetes considers PDBs during scheduler preemption only on a best-effort basis, so I changed the section heading and text to explain that PDBs reduce preemption risk but can still be violated.
- A PDB inline comment said `minAvailable: 2` would always keep two replicas running. I changed it to say it applies to voluntary disruptions.
- The debugging section said `kubectl describe pod ...` shows scheduling queue order. It shows pod events and scheduling diagnostics, not queue order, so I corrected the comment.
- The non-preempting PriorityClass explanation omitted scheduler back-off. I added that non-preempting high-priority pods are still subject to normal scheduler back-off.

## Review Notes
The YAML examples use current stable Kubernetes APIs (`scheduling.k8s.io/v1`, `apps/v1`, and `policy/v1`) and valid fields. The `kubectl` commands use documented flags, including `--field-selector` and `-o custom-columns`. The local environment did not have `kubectl` installed, so CLI verification was performed against official Kubernetes command documentation rather than local `kubectl --help` output.

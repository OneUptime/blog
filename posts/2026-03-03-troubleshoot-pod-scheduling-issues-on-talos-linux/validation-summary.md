# Validation Summary: How to Troubleshoot Pod Scheduling Issues on Talos Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Talos Linux
- Kubernetes scheduler
- kubectl
- talosctl
- Kubernetes taints and tolerations
- Kubernetes node selectors and affinity
- PersistentVolumes and PersistentVolumeClaims
- PodDisruptionBudgets
- ResourceQuotas
- PriorityClasses and preemption

## Sources Consulted
- Kubernetes Scheduler: https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/
- Kubernetes Scheduling, Preemption and Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/
- Kubernetes Scheduler Configuration: https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Reserve Compute Resources for System Daemons: https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Disruptions and PodDisruptionBudgets: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Configure PodDisruptionBudget: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Guaranteed Scheduling for Critical Add-On Pods: https://kubernetes.io/docs/tasks/administer-cluster/guaranteed-scheduling-critical-addon-pods/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Talos Control Plane documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/control-plane/
- Talos workers on control plane documentation: https://docs.siderolabs.com/talos/v1.10/deploy-and-manage-workloads/workers-on-controlplane
- Talos static pods documentation: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/images-container-runtime/static-pods
- Talos troubleshooting documentation: https://docs.siderolabs.com/talos/v1.9/troubleshooting/troubleshooting
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.10/reference/cli
- Talos machine configuration reference: https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/

## Issues Found
- The resource section stated that kubelet reserves resources for system daemons as an unconditional behavior. Updated the wording to say kubelet can reserve resources and that scheduling uses node allocatable capacity.
- The PVC section stated that PVC-using pods can only be scheduled where the volume is available. Updated the wording to clarify that this depends on volume topology or PersistentVolume node affinity, which is especially relevant for local storage.
- The local storage wording implied Kubernetes storage classes generally provision local volumes. Updated it to cover local storage and node-local provisioners without implying built-in dynamic provisioning for local PersistentVolumes.
- The PodDisruptionBudget section incorrectly described PDBs as blocking initial pod scheduling or rescheduling after node failure. Updated it to explain that PDBs affect voluntary evictions such as drains, while node failures are involuntary disruptions.
- The system priority section described CoreDNS and kube-proxy as Talos system pods that run with higher priority. Updated it to the Kubernetes-accurate framing: system components and critical add-ons may use `system-cluster-critical` or `system-node-critical`, and higher-priority pending pods can preempt lower-priority pods.

## Review Notes
The kubectl and talosctl commands are consistent with the official command references, but local CLI binaries were not installed in the review environment, so command verification used official documentation rather than local `--help` output.

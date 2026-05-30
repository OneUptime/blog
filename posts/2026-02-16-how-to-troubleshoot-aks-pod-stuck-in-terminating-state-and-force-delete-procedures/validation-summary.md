# Validation Summary: How to Troubleshoot AKS Pod Stuck in Terminating State

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Pods
- kubectl
- Kubernetes finalizers
- Kubernetes lifecycle hooks
- Persistent volumes and Azure Disk
- Node.js signal handling

## Sources Consulted
- Kubernetes Pod Lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Container Lifecycle Hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes Finalizers: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes Force Delete StatefulSet Pods: https://kubernetes.io/docs/tasks/run-application/force-delete-stateful-set-pod/
- Kubernetes kubectl Reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Microsoft Learn AKS Azure Disk attach/detach troubleshooting: https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/storage/slow-attach-detach-operations-azure-disk

## Issues Found
- The termination lifecycle said the API server removes the pod from etcd. Changed this to say the API server removes the pod API object, matching Kubernetes documentation and avoiding an implementation-detail shortcut.
- The finalizers section described finalizers as the number one cause and listed `kubernetes.io/pv-protection` as a pod finalizer example. Changed the claim to "a common reason" and removed the PV-specific finalizer example because Kubernetes documents `kubernetes.io/pv-protection` as a PersistentVolume finalizer.
- The finalizer removal command comment called the patch a JSON patch while using `--type=merge`. Changed the wording to "merge patch."
- The process cleanup section implied a process can ignore SIGKILL. Reworded it to explain that the runtime may be unable to complete cleanup after SIGKILL, which is more accurate for stuck D-state or runtime cleanup issues.
- The force delete explanation said `--force` removes the pod from etcd. Changed it to say the pod is removed from the API immediately, matching the kubectl and Kubernetes pod lifecycle documentation.
- The namespace bulk deletion command filtered on `status.phase=Running`, which can miss terminating pods because `Terminating` is a kubectl display status, not a pod phase. Replaced it with JSON output filtered by `.metadata.deletionTimestamp`.
- The all-namespaces bulk deletion command parsed human-readable `kubectl get pods` output with `grep Terminating`. Replaced it with JSON output filtered by `.metadata.deletionTimestamp` and namespace/name fields.
- The `preStop` YAML comment did not mention that hook runtime counts against `terminationGracePeriodSeconds`. Updated the comment to reflect Kubernetes lifecycle hook behavior.

## Review Notes
The post is technically relevant and generally accurate after the fixes. `kubectl` was not installed in the review environment, so CLI behavior was verified against the official Kubernetes kubectl reference instead of local `kubectl --help` output.

# Validation Summary: Diagnose Kubernetes Pod Stuck in Terminating State Due to Finalizer Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes finalizers
- Kubernetes Pods
- PersistentVolumeClaims
- kubectl
- Kubernetes operators/controller-runtime patterns
- kube-state-metrics and Prometheus alerting
- Kubernetes CronJob
- jq

## Sources Consulted
- Kubernetes Finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes Persistent Volumes documentation, Storage Object in Use Protection: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#storage-object-in-use-protection
- kubectl patch generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- kubectl delete generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/README.md

## Issues Found
- The first terminating-pod lookup filtered only `status.phase=Running`, which could miss terminating pods in other phases. Changed it to list all pods and grep for `Terminating`.
- The pod finalizer example included `kubernetes.io/pvc-protection`, but Kubernetes applies that finalizer to PVCs, not pods. Removed it from the pod finalizer example.
- The PVC section said pods can get stuck because the PVC is deleted first and showed removing `kubernetes.io/pvc-protection` from the pod. Updated the text and commands to treat PVC protection as a PVC finalizer and to verify pod references before patching the PVC.
- The operator code comment said it would remove a finalizer after max retries, but the sample returned an error and requeued. Updated the comment to match the code behavior.
- The Prometheus custom-resource alert used `kube_customresource_status_deletion_timestamp`, which is not a standard kube-state-metrics metric. Replaced it with an example custom metric name, `myresource_deletion_timestamp`.
- The force-delete section said force deletion bypasses finalizers and immediately removes the pod from etcd. Updated it to clarify that force deletion bypasses graceful pod termination, while finalizers still need to be removed before deletion can complete.

## Review Notes
`kubectl` was not installed in the local workspace, so CLI validation was done against the official generated kubectl documentation rather than local `--help` output. The CronJob example is structurally valid, but a real deployment should also include RBAC for the `finalizer-checker` service account and use an image that contains every command the script needs, including `jq`.

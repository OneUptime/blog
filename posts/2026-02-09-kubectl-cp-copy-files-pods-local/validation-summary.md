# Validation Summary: How to Use kubectl cp to Copy Files Between Pods and Local Machine Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- kubectl cp
- kubectl exec
- Kubernetes Pods
- Kubernetes Volumes and PersistentVolumeClaims
- tar-based file transfer

## Sources Consulted
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl set reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes task: Configure a Pod to Use a PersistentVolume for Storage: https://kubernetes.io/docs/tasks/configure-pod-container/configure-persistent-volume-storage/
- Kubernetes task: Configure a Pod to Use a Volume for Storage: https://kubernetes.io/docs/tasks/configure-pod-container/configure-volume-storage/
- Kubernetes kubectl cp source implementation: https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/kubectl/pkg/cmd/cp/cp.go

## Issues Found
- The introduction said kubectl cp did not require additional tools inside containers. Updated it to state that `tar` must be present in the container, matching the official kubectl cp reference.
- The multi-container section said kubectl uses the first container when `-c` is omitted. Updated it to mention the `kubectl.kubernetes.io/default-container` annotation before falling back to the first container.
- The permissions section overstated preservation behavior. Updated it to distinguish copying into containers with default preservation from copying out of containers, where file mode preservation is not guaranteed, and added the `--no-preserve` option.
- The symbolic link section claimed symlinks are copied as links. Updated it to explain that symlinks copied from a pod are skipped with a warning and that manual tar streams should be used for symlink/link-target behavior.
- The large-file section discussed timeouts but did not use a current kubectl cp option for retries. Updated the wording and added `--retries=3` for interrupted copies from a container.
- The PVC transfer example used `kubectl set volume`, which is not a current upstream kubectl set subcommand. Replaced it with Pod manifests that mount a PVC using `persistentVolumeClaim.claimName`.
- The PVC example used `ReadWriteOnce` while mounting the claim into two pods concurrently. Updated it to `ReadWriteMany` and noted that the storage class must support concurrent read-write mounts.
- The pod-to-pod tar pipeline archived `/data/file.txt` with an absolute path, which would extract under `/data/data/file.txt` when combined with `-C /data`. Updated it to archive from `-C /data file.txt`.

## Review Notes
The post is technically relevant and now aligns with current Kubernetes kubectl behavior. kubectl was not installed in the local environment, so CLI behavior was verified through official Kubernetes generated references and source code rather than local `kubectl --help`.

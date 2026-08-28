# Validation Summary: How to Rescue Files from an emptyDir Before a Failing Pod Is Deleted

## Status
validated

## Post Type
Incident recovery guide / Kubernetes troubleshooting runbook

## Technologies Covered
- Kubernetes Pods and Pod lifecycle
- `emptyDir` volumes and local ephemeral storage
- `kubectl get`, `describe`, `exec`, `cp`, and `debug`
- Kubernetes ephemeral containers and custom debug profiles
- Kubernetes RBAC, Pod Security admission, security contexts, and SELinux
- YAML container specifications and kubectl JSONPath output
- `tar` archive streaming and SHA-256 checksums
- Generic ephemeral volumes and PersistentVolumeClaims

## Sources Consulted
- [Kubernetes Volumes: `emptyDir` lifecycle and mount behavior](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)
- [Kubernetes Pod lifecycle: associated lifetimes, termination flow, force deletion, and kubelet restarts](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Debug Running Pods: ephemeral containers and custom profiles](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Ephemeral Containers concepts and limitations](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [Kubernetes Pod API: EphemeralContainer fields, `volumeMounts`, subresource operations, and exec operations](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/#ephemeralcontainer)
- [`kubectl debug` command reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- [`kubectl cp` command reference and `tar` requirement](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/)
- [`kubectl exec` command reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes version skew policy](https://kubernetes.io/releases/version-skew-policy/)
- [KEP-1441: `kubectl debug` profile behavior and default-profile version change](https://github.com/kubernetes/enhancements/blob/master/keps/sig-cli/1441-kubectl-debug/README.md#debugging-profiles)
- [KEP-4292: custom `kubectl debug` profiles and volume-mount customization](https://github.com/kubernetes/enhancements/blob/master/keps/sig-cli/4292-kubectl-debug-custom-profile/README.md)
- [Kubernetes RBAC: referring to subresources](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#referring-to-resources)
- [Debugging Kubernetes nodes with `kubectl`](https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/)
- [`kubectl drain` command reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/)
- [Generic ephemeral volume lifecycle and PVC cleanup](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#lifecycle-and-persistentvolumeclaim)
- [Container lifecycle hooks and `preStop` timing](https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/)
- [Static Pod limitations](https://kubernetes.io/docs/concepts/workloads/pods/static-pods/#limitations)
- [Automatic cleanup for finished Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/) and [CronJob history limits](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#jobs-history-limits)

## Issues Found
1. **The ephemeral-container workflow exited the container too early.** The post told the reader to exit the debug shell and then use `kubectl exec` in that same ephemeral container. Exiting terminates its main process, and ephemeral containers are not restarted. Changed the procedure to keep the shell running while a second terminal streams and validates the archive, and to exit only after validation succeeds.
2. **The image placeholder was unsafe shell syntax.** `--image=<approved-debug-image>` is parsed by POSIX-style shells as redirection rather than as the intended image argument. Replaced it with the quoted `--image="$debug_image"` form and instructed the reader to set that variable to an approved full image reference.
3. **The debug profile was version-dependent and could request an unnecessary capability.** Custom profiles are stable from `kubectl` 1.32, while the default `kubectl debug` profile changes to `general` from 1.36 and adds `SYS_PTRACE` to an ephemeral container. Added the precise 1.32 requirement and selected `--profile=baseline`, which does not request that capability and is sufficient for copying files.
4. **The RBAC requirement did not match the shown commands.** Current `kubectl debug` patches the `pods/ephemeralcontainers` subresource; the interactive flow also gets, lists, watches, and attaches to the Pod, and the archive command uses exec. Replaced the generic statement with the corresponding RBAC verbs and subresources.
5. **The inspection command ignored the recorded mount path.** It hard-coded `/work`, so changing the `mount` variable would inspect the wrong location. Passed `"$mount"` to the remote shell as a positional argument and used it for both `du` and `find`.
6. **A live archive was described as crash-consistent.** Archiving files while they are changing is not a point-in-time snapshot and can combine states from different moments. Changed the description to a best-effort live copy that may be inconsistent.
7. **The node-forensics warning overstated the effects of some actions.** Draining a node or deleting the Pod can unmount or remove `emptyDir` data, but restarting kubelet does not inherently stop local Pods, and a read-only copy does not inherently remove data. Split the warning so destructive lifecycle actions are distinguished from implementation-specific forensic access that should follow the distribution's supported procedure.
8. **Validation assumed the archive-streaming path was used.** `kubectl cp` creates a local directory, not `rescue-$pod.tar`, so the original validation commands would fail for that documented branch. Added a step to package the copied directory before applying the same archive inspection and checksum commands.
9. **The generic ephemeral storage term was imprecise.** Replaced “generic ephemeral PVC” with the official term “generic ephemeral volume” and clarified that Kubernetes deletes its generated claim with the Pod.

## Review Notes
- The core recovery claim is correct: an `emptyDir` is tied to one Pod, survives container crashes, and is permanently deleted when Kubernetes removes the Pod from its node. A copied or replacement Pod has a different UID and receives a new `emptyDir`, even on the same node.
- The custom profile's top-level `volumeMounts` list is a valid partial Container specification, and `volumeMounts` is allowed for ephemeral containers. The volume name must refer to an existing volume in the Pod.
- The `kubectl cp`, non-TTY `kubectl exec` archive streams, JSONPath expression, YAML field names, `tar`, and GNU/Linux `sha256sum` syntax were checked against current documentation and local `kubectl` v1.34.1 help.
- All external documentation links in the post resolved to the intended official Kubernetes pages.
- Node-level residual data after force deletion is implementation-specific forensic material, not a Kubernetes-supported recreation or attachment path for the former `emptyDir`.

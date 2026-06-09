# Validation Summary: How to Debug Kubernetes Applications

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Kubernetes (kubectl)
- CoreDNS
- Container runtimes (crictl)
- Ephemeral debug containers / `kubectl debug`
- ConfigMaps and Secrets
- PersistentVolumes / PersistentVolumeClaims
- Network Policies, Services, Endpoints / EndpointSlices
- Linux cgroups
- stern (multi-pod log tailing)
- nicolaka/netshoot, busybox debug images

## Sources Consulted
- kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Debugging Running Pods: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Debugging Services: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- EndpointSlices deprecation of Endpoints (v1.33): https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- EndpointSlices concept: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Ephemeral Containers concept: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- DNS Debugging Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- kubectl source for `--share-processes` flag: https://github.com/kubernetes/kubectl

## Issues Found

1. **Misused `--share-processes` flag with `--target`** (line 322, ephemeral container section).

   The original command was:
   ```bash
   kubectl debug -it <pod-name> --image=busybox --target=<container-name> --share-processes
   ```
   Per official `kubectl debug` docs, `--share-processes` is **only effective when combined with `--copy-to`**, not with `--target`. When using `--target`, the ephemeral container already shares the target container's process namespace via the CRI `targetContainerName` field, so `--share-processes` is a no-op there and the example was misleading.

   Fixed to demonstrate the correct usage with `--copy-to`:
   ```bash
   kubectl debug <pod-name> -it --image=busybox --share-processes --copy-to=debug-copy
   ```

2. **`kubectl get endpoints` is on the deprecated Endpoints API** (Service and Endpoint Verification section).

   The v1 Endpoints API has been deprecated since Kubernetes v1.33 (April 2025) in favor of EndpointSlices (`discovery.k8s.io/v1`). The command still works on conformant clusters (the Endpoints controller is preserved for backward compatibility) but emits deprecation warnings. For a post dated 2026, the modern equivalent is more appropriate.

   Updated to:
   ```bash
   kubectl get endpointslices -n <namespace> -l kubernetes.io/service-name=<service-name>
   ```

## Review Notes

- **cgroup v1 paths**: The post uses `/sys/fs/cgroup/memory/memory.usage_in_bytes` and `/sys/fs/cgroup/memory/memory.limit_in_bytes`, which are cgroup v1 paths. By 2026, most modern Kubernetes nodes (kernel 5.8+, recent distros) default to cgroup v2, where the equivalent paths are `/sys/fs/cgroup/memory.current` and `/sys/fs/cgroup/memory.max`. The cgroup v1 paths still work on clusters using cgroup v1, so the commands are not strictly wrong, but readers on cgroup v2 systems will get "No such file or directory". Left as-is since both modes still exist in the field, but noting for future revisions.

- **Pod state diagram simplification**: The state diagram mixes pod phases (`Pending`, `Running`, `Completed`) with container waiting reasons (`ImagePullBackOff`, `CrashLoopBackOff`) and observed conditions (`Error`). This is a common practical simplification used in real-world debugging (matches what users see in `kubectl get pods`), but technically the formal pod phases are `Pending`, `Running`, `Succeeded`, `Failed`, `Unknown`. Acceptable as a debugging-oriented mental model.

- **`busybox:1.28` pin for DNS testing**: The pin to 1.28 is correct and intentional — newer busybox versions (1.29+) have known DNS resolution bugs with musl, making 1.28 the de facto standard in K8s DNS troubleshooting docs.

- **"Resource Debugging" missing `##` heading marker** (line 248): The "Resource Debugging" heading appears as plain text rather than a `## Resource Debugging` markdown header, which breaks the document's structural hierarchy. Left as-is per the "only fix technical errors, no stylistic changes" instruction, but worth flagging for a future markdown formatting pass.

- **`kubectl logs -l app=myapp -f`**: Works, but is subject to `--max-log-requests` (default 5 pods). For larger fleets, `stern` (which the post recommends) is the right tool.

# Validation Summary: How to Use Ephemeral Containers to Debug Running Pods Without Restart

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl
- Ephemeral containers
- Pod debugging and troubleshooting
- Linux process and network debugging tools

## Sources Consulted
- Kubernetes documentation: Ephemeral Containers, https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes documentation: Debug Running Pods, https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes kubectl reference: kubectl debug, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl reference: kubectl version, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes feature gates reference: removed feature gates, https://v1-32.docs.kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/

## Issues Found
- The introduction said ephemeral containers do not modify the pod spec. Kubernetes adds them through the `ephemeralcontainers` API subresource and records them under `spec.ephemeralContainers`, so the wording was changed to say they do not change the original application containers or restart existing containers.
- The post claimed ephemeral containers can optionally share filesystem namespaces. Official Kubernetes docs describe process namespace targeting and pod network sharing, not filesystem namespace sharing, so this was corrected.
- The support-check command used `kubectl version --short`, which is not present in the current `kubectl version` reference. It was replaced with `kubectl version -o yaml`.
- The support-check command used `/metrics | grep ephemeral`, which is not a reliable API support check. It was replaced with `kubectl explain pod.spec.ephemeralContainers`.
- The basic example used `gcr.io/distroless/static:nonroot` without a command, which would not reliably create a running pod for debugging. It was replaced with the official-style `registry.k8s.io/pause:3.10` example image.
- Several examples used `--target` as though it took a pod name. Official docs define `--target` as the target container name, so those examples now use container-name placeholders.
- The `--share-processes` flag was shown with an ephemeral container. Official `kubectl debug` docs say this flag applies when used with `--copy-to`, so the ephemeral-container example was changed to use `--target` process namespace targeting instead.
- The copied-pod debugging example ran process inspection commands without enabling process namespace sharing in the copy. The command now includes `--share-processes`, matching the official copied-pod debug pattern.
- The CrashLoopBackOff copied-pod example passed `--image` while changing an existing container's command. The official pattern changes the command with `--copy-to` and `--container`, so the unnecessary image flag was removed.
- The BusyBox example used commands and flags that are not consistently available in BusyBox. The process-debugging example now uses Ubuntu and installs `procps` and `strace`; the simple networking example uses a safer `netstat -tuln`.
- The Python debugging example referenced `/app/main.py` directly from the Python debug image. Because the debug image does not contain the application filesystem by default, the command now accesses the target process root through `/proc/<pid>/root/app/main.py`.

## Review Notes
The post is technically valid after correction. Runtime support for `--target` process namespace targeting can vary, and debug profiles such as `netadmin` may be constrained by pod security policy or non-root pod settings.

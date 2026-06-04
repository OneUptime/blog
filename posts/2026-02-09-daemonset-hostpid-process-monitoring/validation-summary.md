# Validation Summary: How to implement DaemonSet with hostPID for node process monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- DaemonSet
- Pod `hostPID` and `hostNetwork`
- Kubernetes `hostPath` volumes
- Kubernetes security contexts and capabilities
- Prometheus process-exporter
- Falco runtime security
- Python and psutil
- kubectl

## Sources Consulted
- Kubernetes Pod API reference for `spec.hostPID`, pod OS restrictions, and security context fields: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Pod Security Standards for host namespace, privileged container, capabilities, and hostPath restrictions: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Volumes documentation for `hostPath` behavior and valid `hostPath.type` values: https://kubernetes.io/docs/concepts/storage/volumes/#hostpath
- Kubernetes kubectl exec reference for command syntax: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- process-exporter official README for `-procfs`, `-config.path`, matcher format, and first-match behavior: https://github.com/ncabatoff/process-exporter
- Falco Kubernetes deployment documentation: https://falco.org/docs/setup/kubernetes/
- Falco container deployment documentation for current image tags, modern eBPF, host mounts, and container runtime configuration: https://falco.org/docs/setup/container/
- Falco 0.40.0 release notes for removal of deprecated `--cri` CLI options and replacement configuration keys: https://falco.org/blog/falco-0-40-0/
- psutil documentation for `process_iter()` and `PROCFS_PATH`: https://psutil.readthedocs.io/stable/

## Issues Found
- The process-exporter ConfigMap placed the catch-all `cmdline: '.+'` matcher before the specific `kubelet`, `containerd`, and `dockerd` matchers. process-exporter assigns a process to the first matching group, so the specific process groups would not be used. Moved the catch-all matcher after the specific matchers.
- The Falco example used the deprecated `falcosecurity/falco-no-driver:0.36.2` image and the removed `--cri` command-line flags. Updated the image to `falcosecurity/falco:0.44.0` and replaced `--cri` with the current `container_engines.cri` configuration passed through `-o`.
- The Falco example referenced a CRI-O socket without mounting it and referenced a ServiceAccount that the snippet did not define. Simplified the example to containerd only and removed the unnecessary Kubernetes API metadata flags and ServiceAccount dependency.
- The Falco example did not mount tracefs, which Falco documents as recommended for modern eBPF. Added a read-only `/sys/kernel/tracing` hostPath mount.
- The Falco section implied that hostPID itself is what Falco uses to detect anomalous process behavior. Adjusted the wording to say Falco can be deployed with hostPID while Falco performs the runtime detection.
- The Python example used `psutil` with the `python:3.12-slim` image but did not install the package. Updated the command to install `psutil` before running the inline monitor.
- The Python example mounted host `/proc` over the container's `/proc`. Changed the mount to `/host/proc` and set `psutil.PROCFS_PATH = "/host/proc"` so psutil reads the host procfs explicitly.

## Review Notes
The Kubernetes YAML code blocks were parsed locally with PyYAML after edits. A server-side Kubernetes dry-run was not performed because `kubectl` is not installed in the local environment. The Falco project currently recommends the Falco Operator for Kubernetes deployments, with the Helm chart still supported; this post keeps the manual DaemonSet style because the article is specifically about DaemonSet and `hostPID` usage.

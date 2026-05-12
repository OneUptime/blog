# Validation Summary: How to Prevent Calico Node CrashLoopBackOff

## Status
validated

## Post Type
Guide / Operational best-practices post focused on prevention of a specific Kubernetes networking failure mode.

## Technologies Covered
- Calico (calico-node DaemonSet, CNI plugin)
- Kubernetes (DaemonSet, initContainers, hostPID, securityContext, resource requests/limits)
- Linux kernel modules (ipip, xt_set, nf_conntrack, ip_tables)
- Bash scripting (lsmod, modprobe, /etc/modules)
- GitOps (version-controlled manifests)
- Mermaid (flowchart diagram)

## Sources Consulted
- Calico system requirements / kernel module requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Pod security context / privileged containers: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Linux kernel netfilter / nf_conntrack documentation
- iptables xt_set module / ipset documentation
- Kubernetes pause container registry location (registry.k8s.io / gcr.io)
- Calico CNI configuration (`/etc/cni/net.d/`) reference

## Issues Found
No technical issues found. All kernel module names, command flags, YAML field names, and the DaemonSet pattern (hostPID + privileged init container + hostPath mount of `/lib/modules`) are correct and align with the canonical approach for loading host kernel modules from a pod.

## Review Notes
- The pause image `gcr.io/google-containers/pause:3.2` still pulls via redirect, but the current recommended path is `registry.k8s.io/pause:3.9` or newer. Not incorrect as written, just older.
- The `/etc/modules` persistence approach in the bash script is Debian/Ubuntu-specific. RHEL/CentOS/Rocky-based hosts persist modules via `/etc/modules-load.d/*.conf`. The post does not call out this distinction; future revisions could note it.
- The init container pattern only loads modules once at pod start. If modules were ever unloaded on the host afterward, this DaemonSet would not re-load them until the pod restarted. For most production environments this is sufficient since modules are rarely unloaded, but worth noting.
- `nf_conntrack` is correct for modern kernels (4.19+); older kernels used split `nf_conntrack_ipv4` / `nf_conntrack_ipv6` modules. The post correctly uses the unified name.
- The resource values shown (250m / 256Mi requests, 1000m / 512Mi limits) match Tigera's general guidance for small-to-medium clusters; very large or high-density clusters may need higher memory limits.

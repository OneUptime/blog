# Validation Summary: Which Linux Capabilities, `hostPID`, and AppArmor Settings Does Beyla Need Without Privileged Mode?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Beyla 3.33 and Grafana Alloy `beyla.ebpf`
- Linux eBPF, capabilities, Traffic Control, perf events, and `RLIMIT_MEMLOCK`
- Kubernetes DaemonSets, host PID and network namespaces, and container security contexts
- AppArmor, seccomp, and Pod Security Admission
- `kubectl` JSONPath, logs, and ephemeral debug containers

## Sources Consulted
- [Grafana Beyla security, permissions, and capabilities](https://grafana.com/docs/beyla/latest/security/)
- [Deploy Beyla in Kubernetes](https://grafana.com/docs/beyla/latest/setup/kubernetes/)
- [Beyla network metrics quickstart](https://grafana.com/docs/beyla/latest/network/quickstart/)
- [Beyla network metrics configuration](https://grafana.com/docs/beyla/latest/network/config/)
- [Distributed traces with Beyla](https://grafana.com/docs/beyla/latest/distributed-traces/)
- [Grafana Alloy `beyla.ebpf` permissions](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/#permissions)
- [Beyla 3.33.0 capability checker](https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/obi/os.go)
- [Beyla 3.33.0 container image Dockerfile](https://github.com/grafana/beyla/blob/v3.33.0/Dockerfile)
- [Beyla 3.33.0 Helm DaemonSet template](https://github.com/grafana/beyla/blob/v3.33.0/charts/beyla/templates/daemon-set.yaml)
- [OpenTelemetry eBPF Instrumentation socket-filter `PERFMON` fix](https://github.com/open-telemetry/opentelemetry-ebpf-instrumentation/commit/a360c5efd93e8a8c3d4075e3381594e7a5d46a6c)
- [Kubernetes AppArmor documentation](https://kubernetes.io/docs/tutorials/security/apparmor/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes `kubectl debug` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- [Kubernetes guide to debugging running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes ephemeral containers documentation](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [Linux capabilities manual](https://man7.org/linux/man-pages/man7/capabilities.7.html)
- [Linux perf-events security documentation](https://docs.kernel.org/admin-guide/perf-security.html)
- [Linux seccomp filter documentation](https://docs.kernel.org/userspace-api/seccomp_filter.html)
- [Linux AppArmor documentation](https://docs.kernel.org/admin-guide/LSM/apparmor.html)
- [cilium/ebpf `RemoveMemlock` implementation](https://github.com/cilium/ebpf/blob/main/rlimit/rlimit_linux.go)

## Issues Found
- The post said socket-filter network metrics needed only `BPF` and `NET_RAW`. Beyla 3.33's capability checker also requires `PERFMON`, following a July 2026 upstream fix for socket-filter programs that use `bpf_dbg_printk`. The capability matrix now lists `BPF`, `PERFMON`, and `NET_RAW` for socket-filter collection, and `BPF`, `PERFMON`, and `NET_ADMIN` for Traffic Control collection.
- The network guidance omitted the network-namespace requirement. Node-wide Kubernetes network collection needs `hostNetwork: true`, and network-level context propagation additionally needs `NET_ADMIN` plus the host `/sys/fs/cgroup` and `/sys/kernel/tracing` mounts. The post now states those requirements and notes the usual `ClusterFirstWithHostNet` DNS policy.
- The pre-5.11 instructions made `SYS_RESOURCE` and externally configured memlock limits sound like cumulative requirements. Beyla calls `RemoveMemlock` itself; with `SYS_RESOURCE`, it can raise `RLIMIT_MEMLOCK`. The text now describes external limit configuration as an alternative.
- The post described `/var/run/beyla` as a current writable-runtime requirement. That mount remains in a manual example but is absent from the current Helm DaemonSet and is not generally required by current Beyla. The unnecessary mount and claim were removed.
- The AppArmor statement was too broad. Grafana's Alloy `beyla.ebpf` guidance explicitly calls for `Unconfined`, while standalone Beyla's current Kubernetes guide does not impose that setting universally. The wording now distinguishes those cases and says `Unconfined` is needed when an otherwise-applied profile blocks Beyla. The conclusion now correctly says this prevents AppArmor, rather than every Linux Security Module, from blocking operations.
- The Pod Security Admission paragraph mentioned only Restricted. Baseline also rejects host PID access and the required added capabilities. The text now covers both policies and recommends a dedicated namespace whose admission policy explicitly permits the DaemonSet.
- The capability-inspection command could not work: the official Beyla image is built from `scratch` and has no `sh`, `cat`, or `grep`. In addition, with `hostPID: true`, `/proc/1/status` belongs to the node's init process rather than Beyla. The command now selects a Beyla Pod, starts a BusyBox ephemeral debug container, finds Beyla's actual node PID, and reads that process's capability fields. The post also documents the ephemeral-container lifecycle caveat.
- The security snippet referenced a separately created ServiceAccount and omitted discovery and export configuration. The surrounding text now explicitly identifies it as a security-focused fragment and states those prerequisites.

## Review Notes
- Grafana's current security page still shows only `BPF` and `NET_RAW` for the socket-filter scenario, but the released Beyla 3.33.0 implementation and its upstream fix require `PERFMON`. The post follows the released implementation so that `BEYLA_ENFORCE_SYS_CAPS=1` succeeds.
- The structured `appArmorProfile` field and `type: Unconfined` are valid. The field replaced the deprecated annotation starting in Kubernetes 1.30 and AppArmor support through this field is stable from Kubernetes 1.31.
- The edited DaemonSet YAML was parsed and validated against the Kubernetes 1.31 schema, the selector matches the Pod-template labels, the shell block passes syntax validation, and the referenced BusyBox tag provides the required shell and `grep` implementation.
- The broad application-observability capability list, `hostPID` placement, seccomp explanation, kernel 5.11 memory-accounting boundary, and remaining `kubectl` commands were verified as technically correct.

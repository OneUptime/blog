# Validation Summary: Why Does Beyla Report "MEMLOCK May Be Too Low"? Fixing eBPF Map Creation Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Grafana Beyla
- Linux eBPF maps and BPF Type Format (BTF)
- `RLIMIT_MEMLOCK` and memory-cgroup accounting
- Linux capabilities and perf events
- Seccomp, AppArmor, and Linux Security Modules
- Docker
- systemd
- Kubernetes and `kubectl`

## Sources Consulted

- [Grafana Beyla requirements](https://grafana.com/docs/beyla/latest/#requirements)
- [Grafana Beyla security, permissions, and capabilities](https://grafana.com/docs/beyla/latest/security/)
- [Beyla global configuration and `BEYLA_ENFORCE_SYS_CAPS`](https://grafana.com/docs/beyla/latest/configure/options/)
- [Run Beyla as a Docker container](https://grafana.com/docs/beyla/latest/setup/docker/)
- [Deploy Beyla unprivileged in Kubernetes](https://grafana.com/docs/beyla/latest/setup/kubernetes/#deploy-beyla-unprivileged)
- [Current Beyla source: application observability requires an exporter or trace printer](https://github.com/grafana/beyla/blob/5d15f437f27d22c69cb3948686659a268045e61d/pkg/beyla/config.go#L362-L367)
- [Current Beyla source: calculated Linux capability checks](https://github.com/grafana/beyla/blob/5d15f437f27d22c69cb3948686659a268045e61d/vendor/go.opentelemetry.io/obi/pkg/obi/os.go#L174-L240)
- [Cilium/ebpf v0.22.0 map-create error handling](https://github.com/cilium/ebpf/blob/v0.22.0/map.go#L665-L680)
- [Cilium/ebpf v0.22.0 memcg feature probe and `RemoveMemlock`](https://github.com/cilium/ebpf/blob/v0.22.0/rlimit/rlimit_linux.go)
- [Upstream Linux commit switching BPF memory accounting from rlimit to memcg](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/commit/?id=97306be45fbe35b43c3a4edc3b9ef4e751928b2c)
- [Linux `bpf(2)` manual](https://man7.org/linux/man-pages/man2/bpf.2.html)
- [Linux `getrlimit(2)` and `prlimit(2)` manual](https://man7.org/linux/man-pages/man2/getrlimit.2.html)
- [Linux capabilities manual](https://man7.org/linux/man-pages/man7/capabilities.7.html)
- [Linux perf-events security documentation](https://docs.kernel.org/admin-guide/perf-security.html)
- [Linux `perf_event_open(2)` manual](https://man7.org/linux/man-pages/man2/perf_event_open.2.html)
- [Linux seccomp filter documentation](https://docs.kernel.org/userspace-api/seccomp_filter.html)
- [Linux `/proc/<pid>/status` manual](https://man7.org/linux/man-pages/man5/proc_pid_status.5.html)
- [Linux `/proc/<pid>/limits` manual](https://man7.org/linux/man-pages/man5/proc_pid_limits.5.html)
- [Docker `run` reference, including capabilities, PID modes, and `--ulimit`](https://docs.docker.com/reference/cli/docker/container/run/)
- [systemd execution settings](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)
- [Kubernetes Pod API](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [OCI runtime process and rlimit configuration](https://github.com/opencontainers/runtime-spec/blob/main/config.md)
- [AppArmor troubleshooting and audit behavior](https://apparmor-documentation-c38b15.gitlab.io/documentation/getting-started/troubleshooting/)

## Issues Found

- The post associated an unavailable BPF feature with the exact map-create `EPERM` and MEMLOCK suffix. Cilium/ebpf adds that suffix only for `EPERM`, while unsupported map types or attributes normally return `EINVAL` or another feature-specific error. Removed that association and made feature support a follow-up check for a different error code.
- The Linux 5.11 boundary was presented as universal. Qualified it as the upstream boundary, described the dependency on kernel memory-cgroup accounting, and noted that vendor backports can make a version string an incomplete test.
- The diagnostic snippet read `ulimit -l` for the invoking shell and `/proc/1/status`, which inspects host init when Beyla uses the host PID namespace. Replaced those checks with `/proc/<actual-Beyla-PID>/limits` and `/proc/<actual-Beyla-PID>/status`, with guidance for failures that exit before a PID can be inspected.
- The post implied that `CAP_SYS_RESOURCE` was needed whenever a memlock limit was raised. Corrected this to the hard-limit rule: the capability is needed when Beyla must raise its hard limit, while Docker `--ulimit memlock=-1:-1` and systemd `LimitMEMLOCK=infinity` establish both limits before Beyla executes.
- The old-kernel Docker command requested `CHECKPOINT_RESTORE`, which did not exist on Linux 5.8, and requested other fine-grained BPF capability IDs that older supported enterprise kernels may not expose. Because the example already needs the broader `SYS_ADMIN` fallback, removed those incompatible/redundant capability requests and retained the capabilities required independently of that fallback.
- The Docker example selected port 8080 but configured no exporter or trace printer. Current Beyla rejects that configuration before loading eBPF objects, so it could not validate the proposed fix. Added `BEYLA_TRACE_PRINTER=text`.
- The Kubernetes guidance implied that a privileged init container could influence the main container's rlimit. Clarified that rlimits are process attributes and a separate Beyla container is not a child of the init-container process, so the init container cannot raise Beyla's limit.
- The current-kernel checklist conflated `BPF_MAP_CREATE` failures with later `perf_event_open()` failures. Clarified that `perf_event_paranoid` and a seccomp denial of `perf_event_open` affect the attachment stage, while a seccomp denial of `bpf` can produce the shown map-create `EPERM`.
- The LSM guidance stated that denials appear in kernel or audit logs. Changed this to a conditional because seccomp errno actions need not log, and AppArmor audit configuration, quiet rules, or rate limiting can suppress records.
- `kubectl logs daemonset/beyla` normally reads one selected DaemonSet Pod. Added `--all-pods=true` so node-specific failures are not missed and identified `journalctl -k` as a command to run on the affected Kubernetes node.

## Review Notes

- The current Beyla requirements, BTF check, capability names, Docker flags, systemd directive, Kubernetes rlimit limitation, `BEYLA_ENFORCE_SYS_CAPS`, and `beyla -config` syntax were verified.
- `BEYLA_ENFORCE_SYS_CAPS=1` validates Beyla's calculated capability set only; it does not prove that seccomp, an LSM, perf-event policy, or every required kernel feature permits startup.
- The old-kernel Docker example intentionally uses broad `SYS_ADMIN` compatibility. On a kernel that exposes the fine-grained capabilities, use Beyla's current security matrix to grant only the capabilities required by the enabled features.
- `grafana/beyla:latest` remains the documented image name. The post correctly recommends pinning a tested image tag in production.
- All external links in the post resolved to the intended current documentation during review.

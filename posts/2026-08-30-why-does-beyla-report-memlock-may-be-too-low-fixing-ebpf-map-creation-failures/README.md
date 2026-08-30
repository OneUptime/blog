# Why Does Beyla Report "MEMLOCK May Be Too Low"? Fixing eBPF Map Creation Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, eBPF, Linux, Troubleshooting, Memory

Description: Diagnose Beyla eBPF map creation failures without assuming that the generic MEMLOCK hint identifies the real permission, seccomp, or kernel problem.

---

A Beyla startup failure can end with an error resembling this:

```text
map create: operation not permitted
(MEMLOCK may be too low, consider rlimit.RemoveMemlock)
```

The parenthetical text is a diagnostic hint produced for an `EPERM` map-creation failure. It is not proof that the locked-memory limit is the cause. On an older kernel it often is relevant; on a current kernel, a missing capability, seccomp rule, AppArmor denial, or unavailable eBPF feature is frequently the real problem.

## Why kernel version changes the diagnosis

Historically, BPF map memory was charged against the process's `RLIMIT_MEMLOCK`. A process needed a sufficiently high limit and, when raising that limit, `CAP_SYS_RESOURCE`. Linux 5.11 changed BPF memory accounting to use cgroups, which is why Beyla documents `CAP_SYS_RESOURCE` specifically for kernels earlier than 5.11.

Start by recording the actual environment rather than changing every security setting:

```bash
uname -r
ulimit -l
grep -E 'Cap(Eff|Prm|Bnd)|Seccomp|NoNewPrivs' /proc/1/status
test -r /sys/kernel/btf/vmlinux && echo "BTF present"
cat /proc/sys/kernel/perf_event_paranoid
```

Beyla normally requires Linux 5.8 or later with BPF Type Format data, although supported enterprise kernels can backport the necessary eBPF work. The file `/sys/kernel/btf/vmlinux` is a useful initial BTF check, not a complete compatibility test.

## Fix kernels earlier than 5.11

For an old kernel, raise the memlock soft and hard limits for the Beyla process and grant `SYS_RESOURCE` if the process must raise its own limit. With Docker, make the change explicit:

```bash
docker run --rm \
  --pid=host \
  --cap-add BPF \
  --cap-add PERFMON \
  --cap-add DAC_READ_SEARCH \
  --cap-add CHECKPOINT_RESTORE \
  --cap-add SYS_PTRACE \
  --cap-add NET_RAW \
  --cap-add SYS_ADMIN \
  --cap-add SYS_RESOURCE \
  --ulimit memlock=-1:-1 \
  -e BEYLA_OPEN_PORT=8080 \
  grafana/beyla:latest
```

Pin a tested image tag in production. For a systemd service, use a drop-in rather than an interactive shell setting:

```ini
[Service]
LimitMEMLOCK=infinity
```

Ensure the unit's existing `AmbientCapabilities` and `CapabilityBoundingSet` lists also include `CAP_SYS_RESOURCE`; do not replace their other Beyla capabilities with a one-item list. Run `systemctl daemon-reload` and restart the service after changing the drop-in.

Kubernetes has no portable Pod field for arbitrary Unix rlimits. Configure the limit through the container runtime or node service that launches the container, or upgrade the node kernel. Do not add a privileged init container whose only job is to hide the underlying runtime policy.

## On kernel 5.11 and later, inspect `EPERM`

If the kernel is current, do not lead with memlock. Check these causes in order:

1. **Capabilities.** Application instrumentation commonly needs `BPF`, `PERFMON`, `DAC_READ_SEARCH`, `CHECKPOINT_RESTORE`, `SYS_PTRACE`, and `NET_RAW`; library-level uprobes can require `SYS_ADMIN`. Traffic Control features require `NET_ADMIN`.
2. **Performance-event policy.** Some distributions set `kernel.perf_event_paranoid` high enough that `PERFMON` is insufficient. Grafana documents lowering the setting to an acceptable value or using the broader `SYS_ADMIN` fallback.
3. **Seccomp.** A profile can deny the `bpf` or `perf_event_open` syscall and return the same `EPERM`. Inspect container runtime and kernel audit logs.
4. **AppArmor or another LSM.** An LSM denial also appears in `dmesg`, `journalctl -k`, or the platform's audit log.
5. **BPF support.** Verify that the host kernel, not merely the container image, exposes the required program and map types.

Make Beyla fail early with its calculated capability list:

```bash
export BEYLA_ENFORCE_SYS_CAPS=1
beyla -config /etc/beyla/config.yml
```

In Kubernetes, add the same setting to the container environment and inspect node logs as well as Pod logs:

```bash
kubectl -n observability logs daemonset/beyla --tail=200
journalctl -k --since "10 minutes ago" | grep -Ei 'bpf|apparmor|seccomp|audit|denied'
```

## Confirm the fix instead of trusting startup

After changing one control, restart Beyla and generate traffic through an explicitly selected service. Confirm that:

- the map-creation error has disappeared;
- Beyla reports the intended process as instrumented;
- request metrics or spans arrive at the configured destination;
- no new audit denials appear on the node.

Change one variable at a time. Granting `privileged: true` may make the error disappear, but it does not tell you whether memlock, capabilities, seccomp, or AppArmor caused it. It also leaves the deployment with far more authority than necessary.

## Conclusion

The MEMLOCK message is an `EPERM` hint, not a root-cause verdict. On pre-5.11 kernels, raise the process memlock limit and provide `SYS_RESOURCE`. On current kernels, investigate capabilities, performance-event policy, seccomp, AppArmor, and kernel support first. A controlled, one-change-at-a-time test produces both a working Beyla deployment and a defensible security posture.

## Official Documentation

- [Grafana Beyla security, permissions, and capabilities](https://grafana.com/docs/beyla/latest/security/)
- [Grafana Beyla requirements](https://grafana.com/docs/beyla/latest/#requirements)
- [Deploy Beyla unprivileged in Kubernetes](https://grafana.com/docs/beyla/latest/setup/kubernetes/#deploy-beyla-unprivileged)
- [Linux `getrlimit(2)` manual](https://man7.org/linux/man-pages/man2/getrlimit.2.html)
- [Linux BPF documentation](https://docs.kernel.org/bpf/)

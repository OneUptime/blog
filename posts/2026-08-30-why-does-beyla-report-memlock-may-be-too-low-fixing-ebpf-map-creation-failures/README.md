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

The parenthetical text is a diagnostic hint produced for an `EPERM` map-creation failure. It is not proof that the locked-memory limit is the cause. On a kernel that still uses rlimit-based BPF accounting it often is relevant; on a kernel with memcg-based BPF accounting, a missing capability, seccomp rule, or LSM policy is frequently the real problem. Unsupported map types or attributes normally return a different error and do not get this hint.

## Why kernel version changes the diagnosis

Historically, BPF map memory was charged against the process's `RLIMIT_MEMLOCK`. A process needed a sufficiently high limit and needed `CAP_SYS_RESOURCE` to raise its hard limit. Upstream Linux 5.11 removed rlimit-based BPF memory accounting and uses memory cgroups when kernel memory cgroup accounting is enabled, which is why Beyla documents `CAP_SYS_RESOURCE` specifically for kernels earlier than 5.11. Vendor kernels can backport that change, so 5.11 is the upstream boundary rather than a complete feature test.

Start by recording the actual environment rather than changing every security setting. If Beyla remains alive, inspect its actual process; if it exits too quickly, inspect the service or container launch configuration instead of substituting PID 1:

```bash
uname -r
test -r /sys/kernel/btf/vmlinux && echo "BTF present"
cat /proc/sys/kernel/perf_event_paranoid
if beyla_pid="$(pgrep -n -x beyla)"; then
  grep 'Max locked memory' "/proc/${beyla_pid}/limits"
  grep -E 'Cap(Inh|Prm|Eff|Bnd|Amb)|Seccomp|NoNewPrivs' "/proc/${beyla_pid}/status"
fi
```

Beyla normally requires Linux 5.8 or later with BPF Type Format data, although supported enterprise kernels can backport the necessary eBPF work. The file `/sys/kernel/btf/vmlinux` is a useful initial BTF check, not a complete compatibility test.

## Fix kernels earlier than 5.11

For a kernel that still uses rlimit-based BPF accounting, raise the memlock soft and hard limits for the Beyla process and grant `SYS_RESOURCE` only if the process must raise its own hard limit. With Docker, make the limit explicit. This old-kernel example uses the broader `SYS_ADMIN` fallback instead of requesting fine-grained capability IDs that older supported kernels may not expose:

```bash
docker run --rm \
  --pid=host \
  --cap-add DAC_READ_SEARCH \
  --cap-add SYS_PTRACE \
  --cap-add NET_RAW \
  --cap-add SYS_ADMIN \
  --ulimit memlock=-1:-1 \
  -e BEYLA_OPEN_PORT=8080 \
  -e BEYLA_TRACE_PRINTER=text \
  grafana/beyla:latest
```

Pin a tested image tag in production. For a systemd service, use a drop-in rather than an interactive shell setting:

```ini
[Service]
LimitMEMLOCK=infinity
```

`LimitMEMLOCK=infinity` sets both limits before Beyla starts. If you instead leave a lower hard limit and rely on Beyla to raise it, ensure the unit's existing `AmbientCapabilities` and `CapabilityBoundingSet` lists also include `CAP_SYS_RESOURCE`; do not replace their other Beyla capabilities with a one-item list. Run `systemctl daemon-reload` and restart the service after changing the drop-in.

Kubernetes has no portable Pod field for arbitrary Unix rlimits. Configure the limit through the container runtime or node service that launches the container, or upgrade the node kernel. A privileged init container cannot raise the rlimit of the separate Beyla container, because the Beyla process is not its child.

## On kernel 5.11 and later, inspect `EPERM`

If the kernel uses memcg-based BPF accounting, do not lead with memlock. Check these controls while keeping the failing syscall and errno distinct:

1. **Capabilities.** Application instrumentation commonly needs `BPF`, `PERFMON`, `DAC_READ_SEARCH`, `CHECKPOINT_RESTORE`, `SYS_PTRACE`, and `NET_RAW`; library-level uprobes can require `SYS_ADMIN`. Traffic Control features require `NET_ADMIN`.
2. **Performance-event policy.** This does not cause `BPF_MAP_CREATE` itself to fail, but it can cause a later `perf_event_open()` failure after map creation succeeds. Some distributions set `kernel.perf_event_paranoid` high enough that `PERFMON` is insufficient. Grafana documents lowering the setting to an acceptable value or using the broader `SYS_ADMIN` fallback.
3. **Seccomp.** A profile that denies `bpf` can return the shown map-creation `EPERM`; a denial of `perf_event_open` affects the later attachment step instead. An errno-returning seccomp rule need not produce an audit record, so inspect the active runtime profile as well as available audit logs.
4. **AppArmor or another LSM.** A policy can mask a required capability or deny a BPF operation. A denial may be recorded in `dmesg`, `journalctl -k`, or the platform's audit log, but quiet auditing or rate limiting can suppress it.
5. **BPF support.** Unsupported map types or attributes normally return `EINVAL`, not the shown `EPERM` hint. If the surrounding error differs, verify that the host kernel, not merely the container image, exposes the required program and map types.

Make Beyla fail early with its calculated capability list:

```bash
export BEYLA_ENFORCE_SYS_CAPS=1
beyla -config /etc/beyla/config.yml
```

In Kubernetes, add the same setting to the container environment and inspect node logs as well as Pod logs:

```bash
kubectl -n observability logs daemonset/beyla --all-pods=true --tail=200
# Run this on the affected Kubernetes node:
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

The MEMLOCK message is an `EPERM` hint, not a root-cause verdict. On kernels that still use rlimit-based BPF accounting, raise the process memlock limit and provide `SYS_RESOURCE` only if Beyla must raise its own hard limit. On memcg-based kernels, investigate BPF capabilities, seccomp, and LSM policy first; treat later performance-event failures and different error codes as separate diagnoses. A controlled, one-change-at-a-time test produces both a working Beyla deployment and a defensible security posture.

## Official Documentation

- [Grafana Beyla security, permissions, and capabilities](https://grafana.com/docs/beyla/latest/security/)
- [Grafana Beyla requirements](https://grafana.com/docs/beyla/latest/#requirements)
- [Deploy Beyla unprivileged in Kubernetes](https://grafana.com/docs/beyla/latest/setup/kubernetes/#deploy-beyla-unprivileged)
- [Linux `getrlimit(2)` manual](https://man7.org/linux/man-pages/man2/getrlimit.2.html)
- [Linux BPF documentation](https://docs.kernel.org/bpf/)

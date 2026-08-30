# How to Fix Beyla's "Operation Not Permitted" eBPF Error in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, eBPF, Kubernetes, Linux Capabilities, Kubernetes Security, AppArmor, Container Security

Description: Diagnose Grafana Beyla eBPF permission failures across Linux capabilities, host PID access, performance-event policy, AppArmor, seccomp, and Pod admission.

---

An `operation not permitted` error means the kernel or a container security layer rejected a specific Beyla action. It does not identify one universal missing permission. Beyla may be opening `/proc` entries, loading a BPF program, attaching a probe, opening a raw socket, using performance events, or configuring traffic control. Each feature requires a different subset of privileges.

Start by making the missing-capability check fail fast:

```yaml
env:
  - name: BEYLA_ENFORCE_SYS_CAPS
    value: "1"
```

Standalone Beyla otherwise logs a warning and attempts to continue, which can turn one startup problem into confusing partial telemetry. In Grafana Alloy, the equivalent component argument is `enforce_sys_caps = true`.

## Capture the exact denial

Collect Beyla's complete startup log, the Pod security context, node kernel version, and node security logs:

```bash
kubectl -n observability logs pod/beyla-example --previous
kubectl -n observability get pod beyla-example -o yaml
kubectl get node worker-1 -o wide
```

On the affected node, inspect `journalctl`, `dmesg`, AppArmor audit output, or SELinux audit records through your approved node-debugging process. A log naming `perf_event_open`, `bpf`, `/proc/<pid>/exe`, a raw socket, or an AppArmor profile points to different fixes.

Do not immediately grant `SYS_ADMIN`. It is broad and can hide the actual feature requirement. First prove which control denied which operation.

## Verify process visibility

A DaemonSet that instruments other Pods on the node requires the host process namespace:

```yaml
spec:
  hostPID: true
```

Without it, Beyla cannot discover the host's workload processes even if it can load eBPF programs. A sidecar in the same Pod uses `shareProcessNamespace: true` instead. These settings solve visibility; they do not grant kernel capabilities.

Confirm the Beyla Pod is scheduled on the same node as the target service and that discovery selectors match. A permission fix cannot instrument a process that is outside the visible namespace or excluded by configuration.

## Use the documented capability model

Current Beyla security documentation maps capabilities to operations:

| Capability | Why Beyla may need it |
| --- | --- |
| `BPF` | General BPF operations and program loading |
| `PERFMON` | Performance monitoring and eBPF probe access |
| `SYS_PTRACE` | Inspect `/proc/<pid>/exe` and executable modules |
| `DAC_READ_SEARCH` | Read protected process/kernel information |
| `CHECKPOINT_RESTORE` | Access process information through `/proc` symlinks |
| `NET_RAW` | Raw sockets and socket-filter based capture |
| `NET_ADMIN` | Traffic-control programs and trace-context propagation |
| `SYS_RESOURCE` | Raise locked-memory limits on kernels earlier than 5.11 |
| `SYS_ADMIN` | Library-level uprobes; also needed on some hosts with restrictive performance-event policy |

The exact set depends on application versus network observability, enabled instrumentation, kernel, and distribution. Kubernetes capability names omit the `CAP_` prefix.

A capability-based root container based on Grafana's documented examples has this shape:

```yaml
spec:
  hostPID: true
  containers:
    - name: beyla
      image: grafana/beyla:latest
      securityContext:
        runAsUser: 0
        privileged: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
          add:
            - BPF
            - PERFMON
            - SYS_PTRACE
            - DAC_READ_SEARCH
            - CHECKPOINT_RESTORE
            - NET_RAW
            - NET_ADMIN
```

This is a diagnostic starting shape, not a claim that every feature works with exactly that list. Add `SYS_RESOURCE` only for the documented pre-5.11 locked-memory case. Add `SYS_ADMIN` only when library-level instrumentation or the actual host policy requires it. Pin the image version before finalizing the policy.

Grafana's unprivileged Kubernetes example also mounts `/sys/fs/cgroup`, `/sys/kernel/tracing`, and a writable `/var/run/beyla` volume for the features it demonstrates. If the denial names one of those paths, compare your mounts with the deployment guide rather than making the root filesystem writable.

## Check `perf_event_paranoid`

Loading probe-based instrumentation requires access to `perf_event_open()`. `CAP_PERFMON` is the least-privilege capability intended for that access, but the node's `kernel.perf_event_paranoid` setting also governs it:

```bash
sysctl kernel.perf_event_paranoid
```

Grafana notes that some distributions use a value higher than `2`, and AKS/EKS node configurations may require `SYS_ADMIN` unless the node policy is adjusted. Changing a node-wide sysctl affects every workload and may be overwritten by managed-node upgrades. Choose between an approved node-pool setting and the broader capability through security review; do not mutate one node by hand and call the DaemonSet fixed.

Test every node image and pool. A DaemonSet can work on one kernel and fail on another with the same Pod manifest.

## Check AppArmor, seccomp, and SELinux separately

Capabilities can allow an operation while a Linux security module still denies it. The current Alloy `beyla.ebpf` component documentation specifically requires an Unconfined AppArmor profile in Kubernetes. On Kubernetes 1.30 and later, the native field is:

```yaml
securityContext:
  appArmorProfile:
    type: Unconfined
```

Place it at Pod or container level according to the policy; a container-level profile overrides the Pod default. Older Kubernetes versions used annotations, so follow the documentation matching the cluster version rather than mixing both APIs.

For standalone Beyla, inspect AppArmor audit messages and prefer a reviewed custom profile where possible. Likewise, check seccomp denials for `bpf`, `perf_event_open`, or related syscalls and SELinux AVC records for denied `/proc`, tracefs, or cgroup access. Do not disable every security layer permanently because one diagnostic privileged Pod worked.

Privileged mode is a useful **temporary isolation test** in a non-production namespace: Kubernetes privileged containers ignore or override several kernel confinement mechanisms. If the same pinned image works privileged but fails with capabilities, the remaining difference is in capability bounding/ambient sets, AppArmor, seccomp, SELinux, mounts, or admission policy. Remove the privileged test immediately after collecting evidence.

## Check Pod admission and capability delivery

Pod Security Standards, Gatekeeper/Kyverno rules, or a managed platform may reject `hostPID`, privileged mode, added capabilities, or Unconfined profiles. Read Kubernetes Events and the admission response:

```bash
kubectl -n observability describe pod beyla-example
kubectl -n observability get events --sort-by=.lastTimestamp
```

A manifest accepted after a mutating admission webhook may not equal the manifest you submitted. Inspect the running Pod and, when the image has suitable tools, its process capability sets under `/proc/1/status`. For Alloy running non-root, follow its component documentation for inheritable and ambient capabilities; `no_new_privs`/`allowPrivilegeEscalation` affects whether capabilities can be raised for the Beyla child.

Create a tightly scoped policy exception for the dedicated observability namespace and service account if required. Do not weaken the cluster-wide restricted baseline for application namespaces.

## Verify the fix with real instrumentation

After every change:

1. Restart the Beyla Pod so capability and profile changes take effect.
2. Confirm the enforced capability check passes without warnings.
3. Generate supported traffic against a selected service on the same node.
4. Temporarily enable trace printing to prove eBPF instrumentation generates records.
5. Verify metrics and traces reach their respective destinations.
6. Roll the same test across every kernel/node-pool combination.

Then remove capabilities not needed by the enabled features one at a time and repeat the test. Document the final kernel, runtime, Beyla version, feature set, mounts, sysctls, and security context together. That record prevents a future image or node upgrade from turning least privilege into unexplained partial failure.

## Official Documentation

- [Beyla security, permissions, and capability mapping](https://grafana.com/docs/beyla/latest/security/)
- [Beyla Kubernetes deployment and unprivileged example](https://grafana.com/docs/beyla/latest/setup/kubernetes/#deploy-beyla-unprivileged)
- [Grafana Alloy `beyla.ebpf` permissions](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/#permissions)
- [Grafana Alloy Kubernetes access and permissions](https://grafana.com/docs/alloy/latest/access_permissions/kubernetes/)
- [Kubernetes AppArmor profiles](https://kubernetes.io/docs/tutorials/security/apparmor/)
- [Kubernetes Linux kernel security constraints](https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/)
- [Linux capabilities manual](https://man7.org/linux/man-pages/man7/capabilities.7.html)
- [Linux perf security](https://docs.kernel.org/admin-guide/perf-security.html)

## Conclusion

Fix `operation not permitted` by identifying the rejected kernel operation, not by guessing at one capability. Verify PID visibility, enforce Beyla's capability check, account for `perf_event_paranoid`, and inspect AppArmor, seccomp, SELinux, mounts, and admission policy independently. Prove the fix on every node pool, then retain only the capabilities and profile exceptions required by the pinned Beyla version and enabled features.

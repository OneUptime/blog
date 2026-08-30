# Which Linux Capabilities, `hostPID`, and AppArmor Settings Does Beyla Need Without Privileged Mode?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, eBPF, Kubernetes, Linux Capabilities, AppArmor, Security

Description: Run Grafana Beyla as a Kubernetes DaemonSet without privileged mode by granting only the host visibility and Linux capabilities its enabled features require.

---

`privileged: true` makes an eBPF agent easy to start, but it also gives the container every capability and disables several runtime security controls. Beyla can run without privileged mode. The important part is to treat permissions as a feature matrix: application instrumentation, network flow collection, and trace-context propagation do not require exactly the same privileges.

This guide assumes Beyla runs once per node as a DaemonSet. A sidecar has different PID-namespace requirements.

## Separate the three permission layers

Three settings solve different problems:

- `hostPID: true` is a Pod-level setting. It lets a DaemonSet instance see application processes in the host PID namespace. Without it, discovery is limited to processes visible inside the Beyla Pod.
- Linux capabilities authorize operations such as loading BPF programs, reading process metadata, attaching probes, and installing Traffic Control programs.
- AppArmor controls which kernel and filesystem operations the process may perform even after capabilities have been granted. Grafana's Kubernetes guidance requires an unconfined AppArmor profile for the Beyla/Alloy container.

None of these substitutes for another. Adding `BPF` does not make host processes visible, and `hostPID` does not authorize loading an eBPF program.

## Choose capabilities by feature

For broad application observability across supported languages, Grafana documents this capability set:

- `BPF` for general BPF operations.
- `PERFMON` for performance-monitoring and probe operations.
- `DAC_READ_SEARCH` and `CHECKPOINT_RESTORE` for process and `/proc` inspection.
- `SYS_PTRACE` for executable and module inspection.
- `NET_RAW` for the socket filter used by application HTTP instrumentation.
- `SYS_ADMIN` for library-level uprobes. It is also the fallback on distributions whose `kernel.perf_event_paranoid` setting prevents `PERFMON` from being sufficient.

Add `NET_ADMIN` only when a feature uses Linux Traffic Control, notably network collection with `source: tc` or network-level trace-context propagation. Socket-filter network metrics need only `BPF` and `NET_RAW`. Add `SYS_RESOURCE` for raising locked-memory limits on kernels earlier than 5.11; current kernels account BPF memory differently.

This means there is no honest universal "minimal" list. Start from the use case, enable Beyla's capability enforcement, and remove capabilities only after testing every enabled protocol and propagation path.

## A non-privileged DaemonSet security context

The following fragment is a practical baseline for application observability. It deliberately keeps `privileged` false while allowing library-level instrumentation:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: beyla
  namespace: observability
spec:
  selector:
    matchLabels:
      app: beyla
  template:
    metadata:
      labels:
        app: beyla
    spec:
      hostPID: true
      serviceAccountName: beyla
      containers:
        - name: beyla
          image: grafana/beyla:latest # pin an approved release in production
          securityContext:
            privileged: false
            runAsUser: 0
            readOnlyRootFilesystem: true
            appArmorProfile:
              type: Unconfined
            capabilities:
              drop: ["ALL"]
              add:
                - BPF
                - PERFMON
                - DAC_READ_SEARCH
                - CHECKPOINT_RESTORE
                - SYS_PTRACE
                - NET_RAW
                - SYS_ADMIN
          volumeMounts:
            - name: var-run-beyla
              mountPath: /var/run/beyla
          env:
            - name: BEYLA_ENFORCE_SYS_CAPS
              value: "1"
      volumes:
        - name: var-run-beyla
          emptyDir: {}
```

The writable `emptyDir` at `/var/run/beyla` follows Grafana's hardened manifest and lets Beyla create runtime files while the image filesystem remains read-only. The structured `appArmorProfile` field is the current Kubernetes API and is stable from Kubernetes 1.31; releases before 1.30 used the now-deprecated annotation form. If an older cluster rejects the field, use the documentation for that exact Kubernetes version rather than copying a modern manifest unchanged.

If you enable network-level context propagation, add `NET_ADMIN` and the host mounts documented by Beyla for `/sys/fs/cgroup` and `/sys/kernel/tracing`. If the node kernel is older than 5.11, add `SYS_RESOURCE` and configure an adequate memlock rlimit at the runtime or service-manager layer.

## Do not confuse AppArmor with seccomp

AppArmor and seccomp are independent. An AppArmor profile can be unconfined while a seccomp profile still blocks `bpf`, `perf_event_open`, or another required syscall. Start with the container runtime's current seccomp behavior, examine node audit logs when a load fails, and relax only the operation shown to be blocked. A generic `operation not permitted` message does not prove which control rejected the call.

Pod Security Admission is another separate concern. The Restricted policy will reject host PID access and added capabilities, so run Beyla in a deliberately governed namespace with a narrowly scoped exception. That is preferable to silently granting privileged mode cluster-wide.

## Verify the effective posture

After deployment, confirm both configuration and behavior:

```bash
kubectl -n observability get pod -l app=beyla \
  -o jsonpath='{range .items[*]}{.metadata.name}{" hostPID="}{.spec.hostPID}{" privileged="}{.spec.containers[0].securityContext.privileged}{"\n"}{end}'

kubectl -n observability logs -l app=beyla --tail=200 | \
  grep -E 'capabilit|permission|BPF|instrument'

kubectl -n observability exec daemonset/beyla -- \
  sh -c 'cat /proc/1/status | grep -E "Cap(Eff|Prm|Bnd)|NoNewPrivs"'
```

Then generate real HTTP or gRPC traffic and verify that the selected process is discovered and telemetry is exported. Startup success alone is insufficient: a missing capability may affect only a later tracer or propagation mode.

## Conclusion

For a DaemonSet, `hostPID: true` provides visibility; targeted capabilities provide authority; and an unconfined AppArmor profile prevents the LSM from blocking those authorized operations. Keep `privileged: false`, enable `BEYLA_ENFORCE_SYS_CAPS=1`, and build the capability set from the Beyla features actually in use. Re-test it whenever you enable Traffic Control, a new language tracer, or a different kernel/runtime combination.

## Official Documentation

- [Grafana Beyla security, permissions, and capabilities](https://grafana.com/docs/beyla/latest/security/)
- [Deploy Beyla in Kubernetes](https://grafana.com/docs/beyla/latest/setup/kubernetes/)
- [Grafana Alloy `beyla.ebpf` permissions](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/#permissions)
- [Kubernetes AppArmor documentation](https://kubernetes.io/docs/tutorials/security/apparmor/)
- [Linux capabilities manual](https://man7.org/linux/man-pages/man7/capabilities.7.html)

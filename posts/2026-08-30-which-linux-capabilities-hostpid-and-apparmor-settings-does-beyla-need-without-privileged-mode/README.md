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
- AppArmor controls which kernel and filesystem operations the process may perform even after capabilities have been granted. Grafana's Alloy `beyla.ebpf` Kubernetes guidance calls for an unconfined AppArmor profile. Standalone Beyla's Kubernetes guide does not impose one universally, but the same setting is needed if the node or runtime profile would otherwise block Beyla's host inspection or eBPF operations.

None of these substitutes for another. Adding `BPF` does not make host processes visible, and `hostPID` does not authorize loading an eBPF program.

## Choose capabilities by feature

For broad application observability across supported languages, Grafana documents this capability set:

- `BPF` for general BPF operations.
- `PERFMON` for performance-monitoring and probe operations.
- `DAC_READ_SEARCH` and `CHECKPOINT_RESTORE` for process and `/proc` inspection.
- `SYS_PTRACE` for executable and module inspection.
- `NET_RAW` for the socket filter used by application HTTP instrumentation.
- `SYS_ADMIN` for library-level uprobes. It is also the fallback on distributions whose `kernel.perf_event_paranoid` setting prevents `PERFMON` from being sufficient.

Network collection with `source: tc` requires `BPF`, `PERFMON`, and `NET_ADMIN`, while socket-filter network metrics in current Beyla releases require `BPF`, `PERFMON`, and `NET_RAW`. Network-level trace-context propagation also adds `NET_ADMIN` to the application-observability set because it uses Linux Traffic Control. In Kubernetes, node-wide network collection additionally requires `hostNetwork: true` for packet visibility. Add `SYS_RESOURCE` for raising locked-memory limits on kernels earlier than 5.11; current kernels account BPF memory differently.

This means there is no honest universal "minimal" list. Start from the use case, enable Beyla's capability enforcement, and remove capabilities only after testing every enabled protocol and propagation path.

## A non-privileged DaemonSet security context

The following security-focused fragment is a practical baseline for application observability. It assumes that the `beyla` ServiceAccount, its RBAC, and Beyla's discovery and export configuration are defined separately. It deliberately keeps `privileged` false while allowing library-level instrumentation:

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
          env:
            - name: BEYLA_ENFORCE_SYS_CAPS
              value: "1"
```

The structured `appArmorProfile` field is the current Kubernetes API and is stable from Kubernetes 1.31; releases before 1.30 used the now-deprecated annotation form. If an older cluster rejects the field, use the documentation for that exact Kubernetes version rather than copying a modern manifest unchanged.

If you enable network-level context propagation, set `hostNetwork: true` (normally with `dnsPolicy: ClusterFirstWithHostNet`), add `NET_ADMIN`, and mount the host paths documented by Beyla for `/sys/fs/cgroup` and `/sys/kernel/tracing`. If the node kernel is older than 5.11, add `SYS_RESOURCE` so Beyla can raise its own `RLIMIT_MEMLOCK`; arranging a sufficient memlock limit at the runtime or service-manager layer is an alternative.

## Do not confuse AppArmor with seccomp

AppArmor and seccomp are independent. An AppArmor profile can be unconfined while a seccomp profile still blocks `bpf`, `perf_event_open`, or another required syscall. Start with the container runtime's current seccomp behavior, examine node audit logs when a load fails, and relax only the operation shown to be blocked. A generic `operation not permitted` message does not prove which control rejected the call.

Pod Security Admission is another separate concern. Both the Baseline and Restricted policies reject host PID access and these added capabilities, so run Beyla in a dedicated, tightly governed namespace whose admission policy explicitly permits this DaemonSet. That is preferable to granting the DaemonSet privileged mode on every node.

## Verify the effective posture

After deployment, confirm both configuration and behavior:

```bash
kubectl -n observability get pod -l app=beyla \
  -o jsonpath='{range .items[*]}{.metadata.name}{" hostPID="}{.spec.hostPID}{" privileged="}{.spec.containers[0].securityContext.privileged}{" appArmor="}{.spec.containers[0].securityContext.appArmorProfile.type}{"\n"}{end}'

kubectl -n observability logs -l app=beyla --tail=200 | \
  grep -E 'capabilit|permission|BPF|instrument'

BEYLA_POD="$(kubectl -n observability get pod -l app=beyla \
  -o jsonpath='{.items[0].metadata.name}')"

kubectl -n observability debug -it "pod/$BEYLA_POD" \
  --image=busybox:1.37.0 \
  --profile=general -- \
  sh -c 'for status_file in /proc/[0-9]*/status; do
    if grep -q "^Name:[[:space:]]*beyla$" "$status_file"; then
      grep -E "^(Name|Pid|Cap(Eff|Prm|Bnd)|NoNewPrivs):" "$status_file"
      exit
    fi
  done
  echo "Beyla process not found" >&2
  exit 1'
```

The official Beyla image is built from `scratch` and contains no shell, so the last command uses a one-shot ephemeral BusyBox container. Because `hostPID: true` exposes the node PID namespace, it scans for Beyla's actual PID instead of reading `/proc/1`, which belongs to the node's init process. The ephemeral-container entry remains in the Pod until that Pod is replaced.

Then generate real HTTP or gRPC traffic and verify that the selected process is discovered and telemetry is exported. Startup success alone is insufficient: a missing capability may affect only a later tracer or propagation mode.

## Conclusion

For a DaemonSet, `hostPID: true` provides visibility; targeted capabilities provide authority; and an unconfined AppArmor profile prevents AppArmor from blocking those authorized operations. Keep `privileged: false`, enable `BEYLA_ENFORCE_SYS_CAPS=1`, and build the capability set from the Beyla features actually in use. Re-test it whenever you enable Traffic Control, a new language tracer, or a different kernel/runtime combination.

## Official Documentation

- [Grafana Beyla security, permissions, and capabilities](https://grafana.com/docs/beyla/latest/security/)
- [Deploy Beyla in Kubernetes](https://grafana.com/docs/beyla/latest/setup/kubernetes/)
- [Grafana Alloy `beyla.ebpf` permissions](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/#permissions)
- [Kubernetes AppArmor documentation](https://kubernetes.io/docs/tutorials/security/apparmor/)
- [Linux capabilities manual](https://man7.org/linux/man-pages/man7/capabilities.7.html)

# Why Containerized Node Exporter Reports Container Metrics Instead of Host Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Node Exporter, Containers, Linux, Host Monitoring

Description: Configure and verify a containerized Node Exporter so every collector observes the intended host namespaces, filesystems, and devices.

---

Node Exporter reports what the kernel and filesystems make visible to the `node_exporter` process. A container normally has its own root filesystem, mount namespace, PID namespace, and network namespace. Starting the exporter in that default environment does not turn those views into host views.

The result is often more dangerous than an obvious failure: a mixture of host-wide and container-scoped metrics. For example, some Linux kernel counters remain system-wide, while filesystem and network collectors can see only the container's mount tree and interfaces. A successful scrape only proves that Prometheus reached an HTTP endpoint; it does not prove that the endpoint describes the host.

## Understand What Each Collector Observes

On Linux, Node Exporter gathers metrics from several interfaces:

| Source | Example metrics | Container isolation that matters |
| --- | --- | --- |
| procfs | CPU, memory, processes, mount information | PID namespace and the procfs mounted for it |
| sysfs | block devices, network classes, hardware data | mounts, device visibility, and network namespace |
| root filesystem | filesystem capacity and OS files | container root versus a bind-mounted host root |
| system calls | time, uname, filesystem statistics | capabilities and the namespace of the process |
| network namespace | interfaces and network counters | container network versus host network |

This is why one plausible metric does not validate the deployment. `node_uname_info` can describe the host kernel while `node_filesystem_size_bytes{mountpoint="/"}` describes the container image. Similarly, the exporter can expose the host's aggregate CPU accounting but omit host interfaces or mounts.

`up{job="node"} == 1` means the scrape succeeded. It says nothing about which namespace the exporter inspected.

## Use the Upstream Container Pattern

The Node Exporter project documents this host-monitoring pattern:

```bash
docker run -d \
  --name node-exporter \
  --network host \
  --pid host \
  --mount type=bind,source=/,target=/host,readonly,bind-propagation=rslave \
  quay.io/prometheus/node-exporter:<pinned-version> \
  --path.rootfs=/host
```

Each part has a distinct purpose:

- `--network host` exposes the host network namespace;
- `--pid host` exposes the host PID namespace and its process mount information;
- the read-only `/` bind mount makes the host filesystem tree available at `/host`;
- `rslave` lets mount and unmount events from the host propagate into the bind mount without propagating container-originated events back; and
- `--path.rootfs=/host` tells collectors to prefix host filesystem paths with that bind-mount location.

The bind target and `--path.rootfs` value must match. Mounting the host at `/host` but passing `--path.rootfs=/rootfs` produces missing files or filesystem-stat errors. Mounting only `/proc` is also not an equivalent replacement: filesystem, device, OS, and other collectors use more than procfs.

Pin an image digest or release version. `latest` makes a collector or label change indistinguishable from a host change during an incident.

## Translate the Pattern to Kubernetes Carefully

A node-level exporter normally runs as a DaemonSet so that every eligible node gets one Pod. The relevant part of a Linux Pod template looks like this:

```yaml
spec:
  hostNetwork: true
  hostPID: true
  containers:
    - name: node-exporter
      image: quay.io/prometheus/node-exporter:<pinned-version>
      args:
        - --path.rootfs=/host
      ports:
        - name: metrics
          containerPort: 9100
          hostPort: 9100
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
      volumeMounts:
        - name: host-root
          mountPath: /host
          readOnly: true
          mountPropagation: HostToContainer
  volumes:
    - name: host-root
      hostPath:
        path: /
        type: Directory
```

`HostToContainer` is the Kubernetes one-way mount-propagation mode needed for host mounts created after the Pod starts to become visible. Whether `hostPort` is appropriate depends on how Prometheus discovers and reaches the Pod; it is not required when the Pod IP is directly scrapeable.

Host namespaces and a host root mount are powerful permissions. Kubernetes Pod Security Standards do not allow `hostPID` in the restricted profiles, and a host root `hostPath` expands the impact of an exporter compromise even when mounted read-only. Put the DaemonSet in a tightly controlled namespace, use a dedicated service account with no unnecessary API permissions, restrict who can alter the workload, and apply network policy or host firewall controls to port 9100. If that exposure is unacceptable, installing the exporter as a hardened host service is usually simpler to reason about.

## Verify the Data, Not Just the Pod

Start with the exporter endpoint:

```bash
curl -fsS http://127.0.0.1:9100/metrics \
  | grep -E '^(node_uname_info|node_boot_time_seconds|node_filesystem_size_bytes|node_network_info)'
```

Then compare representative facts with commands on the same host:

```bash
findmnt -rn -o SOURCE,TARGET,FSTYPE
ip -brief link
cat /proc/uptime
```

Check all of these:

1. The root filesystem's device, type, and size match the host, not the container overlay.
2. A known non-root persistent mount appears with the host mountpoint label.
3. Host physical and virtual interfaces that should be monitored appear.
4. The boot time corresponds to the node.
5. A mount created after the exporter started appears without restarting the container.
6. There is exactly one intended exporter target per node.

Prometheus can make the verification repeatable:

```promql
count by (instance) (
  node_filesystem_size_bytes{
    fstype!~"proc|sysfs|tmpfs|devtmpfs|overlay"
  }
)
```

An unexpectedly small or identical count across unlike hosts is a useful diagnostic, but it is not a universal correctness threshold. Maintain a small inventory of mounts or interfaces that each host class must expose and alert when those expectations are absent.

## Diagnose Collector-Specific Gaps

If most host metrics are correct but one family is missing, do not immediately add broad privileges.

- Filesystem gaps commonly mean a missing root bind, mismatched `--path.rootfs`, private mount propagation, or an exclusion regex.
- Network gaps commonly mean the exporter is not in the host network namespace.
- Process-related gaps commonly involve the PID namespace, procfs mount, or procfs `hidepid` policy.
- Hardware and device gaps can result from missing sysfs or device access.
- The `timex` collector may require `CAP_SYS_TIME` on some systems, as the upstream container guidance notes.
- The systemd collector requires access to the relevant systemd interfaces; a host-root bind alone does not create that access.

Grant only the capability needed for a collector you deliberately enable. Running the whole container privileged can hide the real dependency and weakens the security boundary.

## Know the Limit

Node Exporter is a machine exporter. It is not the source for per-container CPU, memory, or filesystem usage. Use kubelet/cAdvisor or another cgroup-aware collector for workload metrics, and keep host and container series labeled and queried separately.

A correct setup therefore has two properties:

- Node Exporter sees the host views required by its enabled collectors.
- Container monitoring uses cgroup-scoped metrics rather than interpreting host counters as workload counters.

Treat namespace configuration as part of the monitoring contract. A green target with the wrong view is still broken monitoring.

## Official Documentation

- [Node Exporter: Docker deployment and host namespace flags](https://github.com/prometheus/node_exporter#docker)
- [Node Exporter collectors and include/exclude controls](https://github.com/prometheus/node_exporter#collectors)
- [Prometheus guide to monitoring Linux hosts with Node Exporter](https://prometheus.io/docs/guides/node-exporter/)
- [Linux kernel documentation for `/proc/<pid>/mountinfo`](https://docs.kernel.org/filesystems/proc.html#proc-pid-mountinfo-information-about-mounts)
- [Linux kernel shared-subtree and slave-mount semantics](https://docs.kernel.org/filesystems/sharedsubtree.html)
- [Kubernetes volume mount propagation](https://kubernetes.io/docs/concepts/storage/volumes/#mount-propagation)
- [Kubernetes DaemonSet documentation](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)

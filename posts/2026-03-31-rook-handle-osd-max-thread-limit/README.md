# How to Handle OSD Hitting Maximum Thread Limit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Threading, Troubleshooting

Description: Diagnose and resolve Ceph OSD pods hitting the maximum thread limit, causing slow requests and potential OSD crashes in Rook clusters.

---

## Understanding the OSD Thread Limit Problem

Ceph OSDs are multi-threaded processes that spawn threads for each client operation, recovery task, heartbeat, and internal service. The Linux kernel enforces a per-user process and thread limit controlled by `ulimit -u` (RLIMIT_NPROC) and a system-wide limit via the `kernel.threads-max` sysctl parameter. When an OSD pod hits either limit, new operations cannot create worker threads, causing request queuing, slow ops warnings, and eventually OSD crashes or HEALTH_ERR alerts.

## Identifying the Problem

Signs that an OSD is hitting the thread limit include:

- `HEALTH_WARN` with slow ops messages in `ceph status`
- OSD logs showing `pthread_create failed`
- OSD pod crashing and restarting repeatedly

Check OSD logs for thread creation errors:

```bash
kubectl -n rook-ceph logs rook-ceph-osd-<id>-<suffix> | grep -i "thread\|pthread\|spawn"
```

View current thread count for an OSD process:

```bash
kubectl -n rook-ceph exec -it rook-ceph-osd-<id>-<suffix> -- \
  cat /proc/1/status | grep Threads
```

## Ensuring Sufficient Resources for OSD Pods

Thread-heavy OSDs need adequate CPU and memory to handle their workload efficiently. While resource limits do not control the thread creation limit itself (that is governed by `RLIMIT_NPROC` at the node level and `kernel.threads-max`), ensuring OSD pods have enough CPU and memory prevents resource starvation that compounds thread pressure. Update the `CephCluster` resource to set appropriate resource allocations:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  resources:
    osd:
      limits:
        cpu: "4"
        memory: "8Gi"
```

## Reducing Thread Consumption via Ceph Config

Reduce thread usage by tuning the OSD thread pool sizes:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_num_threads_per_shard 2

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_num_shards 8

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd ms_async_op_threads 3
```

## Setting Node-Level Thread Limits

Update the kernel thread limit on nodes hosting OSDs using a DaemonSet or node configuration:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: set-thread-limit
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      name: set-thread-limit
  template:
    metadata:
      labels:
        name: set-thread-limit
    spec:
      hostIPC: true
      hostPID: true
      containers:
      - name: set-limit
        image: busybox
        command: ["sh", "-c", "sysctl -w kernel.threads-max=4194304 && sleep infinity"]
        securityContext:
          privileged: true
```

## Monitoring Thread Counts

Continuously monitor thread counts across OSD pods:

```bash
for pod in $(kubectl -n rook-ceph get pods -l app=rook-ceph-osd -o name); do
  echo -n "$pod: "
  kubectl -n rook-ceph exec $pod -- cat /proc/1/status 2>/dev/null | grep Threads
done
```

## Summary

OSD thread limit exhaustion causes slow requests and OSD crashes. Reduce thread consumption by tuning `osd_op_num_shards` and `ms_async_op_threads` via `ceph config set`. Ensure node kernel thread limits are sufficient by setting `kernel.threads-max` via a privileged DaemonSet. Monitor thread counts proactively to catch growth trends before they cause outages.

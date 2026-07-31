# Fixing Missing Filesystem Metrics and `node_filesystem_device_error` in Containerized Node Exporter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Node Exporter, Filesystems, Containers, Linux, Troubleshooting

Description: Diagnose missing Node Exporter filesystem series and device errors by checking mount discovery, root-path mapping, propagation, filters, and stat failures.

---

Missing filesystem capacity metrics do not all mean the same thing. A mount can be invisible to the exporter, intentionally filtered, discovered but impossible to stat, or absent because the entire filesystem collector failed. Treating every case as “the disk disappeared” leads to the wrong fix.

The most useful distinction is:

- **not discovered:** no filesystem series exist for the mount;
- **discovered with an error:** `node_filesystem_device_error` is `1`;
- **successfully inspected:** the device-error metric is `0` and the normal size, free, available, inode, and read-only metrics are emitted.

## Understand `node_filesystem_device_error`

The metric's upstream help text is:

```text
Whether an error occurred while getting statistics for the given device.
```

On Linux, the filesystem collector discovers mounts from procfs and calls `statfs` against the corresponding path under `--path.rootfs`. If that call errors, the collector emits `node_filesystem_device_error` with value `1` and does not emit the normal size and inode metrics for that filesystem in that scrape.

This is an observation failure, not proof of physical-disk failure. Common causes include:

- the host mount exists in procfs but not below the container's configured root path;
- the exporter lacks search permission on a path;
- a security policy denies the operation;
- a network filesystem is unavailable or unresponsive;
- a mount disappeared during the scrape; or
- the root bind and mount namespace describe inconsistent mount trees.

Current Node Exporter source can also attach a `device_error` label containing an error description. Do not make an alert depend on that label: inspect the actual `/metrics` output for the release you run, and use the numeric value as the stable condition.

## Start With Four Different Health Checks

First confirm target health:

```promql
up{job="node"} == 0
```

Then confirm the collector ran successfully:

```promql
node_scrape_collector_success{collector="filesystem"} == 0
```

Then find per-filesystem stat errors:

```promql
node_filesystem_device_error{job="node"} == 1
```

Finally inspect what was actually exposed:

```bash
curl -fsS http://node.example:9100/metrics \
  | grep -E '^# HELP node_filesystem_|^node_filesystem_'
```

These checks answer different questions. `up=0` means the whole scrape failed. Collector success `0` means the collector returned a top-level error. A device error identifies an individual discovered filesystem whose statistics could not be obtained. No matching series at all usually points to discovery, namespace, or filtering.

## Check the Container's Host View

The upstream Docker pattern is:

```bash
docker run -d \
  --network host \
  --pid host \
  --mount type=bind,source=/,target=/host,readonly,bind-propagation=rslave \
  quay.io/prometheus/node-exporter:<pinned-version> \
  --path.rootfs=/host
```

Verify the invariants rather than copying the command blindly:

```bash
# On the host
findmnt -rn -o SOURCE,TARGET,FSTYPE

# In the exporter container
grep -E ' / | /data | /var ' /proc/1/mountinfo
test -d /host
test -e /host/data
```

On current Linux Node Exporter, the collector attempts `/proc/1/mountinfo` and falls back to the exporter's own mount information only when that file is missing. The host PID namespace helps make PID 1's host mount view available. The host root bind gives `statfs` a path to inspect. Both views must refer to the same mount tree.

If the host was mounted at `/host/root`, the argument must be:

```text
--path.rootfs=/host/root
```

`--path.rootfs` does not mount anything. It only changes the prefix Node Exporter uses when opening host paths.

## Preserve Mount Events

A plain read-only bind can show the mount tree that existed when the container started but miss later mounts. Use recursive slave propagation:

```text
/:/host:ro,rslave
```

In Kubernetes, the corresponding volume mount setting is:

```yaml
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

Test propagation explicitly: create or attach a safe test mount on a non-production node after the exporter Pod starts, wait for a scrape, and verify that its mountpoint appears. Restarting the exporter after every mount event can mask a propagation defect.

## Audit Filesystem Filters

The filesystem collector supports mutually exclusive include and exclude flags:

```text
--collector.filesystem.mount-points-include
--collector.filesystem.mount-points-exclude
--collector.filesystem.fs-types-include
--collector.filesystem.fs-types-exclude
```

The upstream project documents a mountpoint exclusion example:

```text
--collector.filesystem.mount-points-exclude=^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/.+)($|/)
```

Check the effective command line and logs, not only the intended manifest. A regular expression can exclude a parent path more broadly than expected. Include and exclude flags for the same scope cannot be combined.

Also inspect request-time collector filtering. A scrape using:

```yaml
params:
  collect[]:
    - cpu
    - meminfo
```

does not request the filesystem collector at all. Metric relabeling can remove `node_filesystem_*` after collection as well, so compare the raw exporter response with Prometheus's `scrape_samples_scraped`, `scrape_samples_post_metric_relabeling`, and stored series.

## Build Alerts for Both Errors and Absence

Alert on explicit errors directly:

```yaml
groups:
  - name: node-filesystem-observability
    rules:
      - alert: NodeFilesystemStatError
        expr: node_filesystem_device_error{job="node"} == 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Cannot collect filesystem statistics on {{ $labels.instance }}"
          description: "Node Exporter cannot stat {{ $labels.mountpoint }} ({{ $labels.device }})."
```

Do not substitute an absent `node_filesystem_avail_bytes` with zero. Zero available bytes is a capacity state; no series is an observability state.

For filesystems that were successfully discovered, this query can reveal a normal device-error series without a matching capacity series:

```promql
node_filesystem_device_error{job="node"} == 0
unless on (job, instance, device, mountpoint, fstype)
node_filesystem_avail_bytes{job="node"}
```

It cannot detect a mount the exporter never discovered. For critical mounts, maintain an independent expectation, such as an inventory metric:

```text
expected_node_filesystem{instance="db-01:9100",mountpoint="/data"} 1
```

Then compare the expected set with successfully collected capacity series:

```promql
expected_node_filesystem == 1
unless on (instance, mountpoint)
node_filesystem_avail_bytes{job="node"}
```

Keep the inventory's lifecycle independent from Node Exporter. Deriving expectations from the same missing metric defeats the check.

## Use a Bounded Repair Sequence

1. Confirm whether the target, collector, or one device is failing.
2. Compare the raw exporter output with stored Prometheus series.
3. Compare host `findmnt` output with the mount information visible to the container.
4. Verify that the host-root bind path equals `--path.rootfs`.
5. Verify host-to-container mount propagation with a mount created after startup.
6. Review effective include/exclude flags, request parameters, and metric relabeling.
7. Inspect the `device_error` label and debug-level exporter logs for the exact `statfs` error and path.
8. Fix path mapping, permissions, or the underlying mount; do not suppress a real error merely to make an alert green.
9. Add an explicit expectation for every operationally critical mount.

If a network mount is intentionally unreliable and not operationally important, excluding it can prevent a slow or failed stat from affecting collection. If it is important, excluding it removes the evidence you need; monitor its reachability and capacity instead.

## Official Documentation

- [Node Exporter Docker deployment](https://github.com/prometheus/node_exporter#docker)
- [Node Exporter include and exclude flags](https://github.com/prometheus/node_exporter#include--exclude-flags)
- [Node Exporter Linux filesystem collector source](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_linux.go)
- [Node Exporter filesystem metric definitions](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_common.go)
- [Linux kernel documentation for `/proc/<pid>/mountinfo`](https://docs.kernel.org/filesystems/proc.html#proc-pid-mountinfo-information-about-mounts)
- [Linux kernel shared-subtree mount propagation](https://docs.kernel.org/filesystems/sharedsubtree.html)
- [Kubernetes mount propagation](https://kubernetes.io/docs/concepts/storage/volumes/#mount-propagation)
- [Prometheus scrape configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)

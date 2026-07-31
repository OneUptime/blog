# Exclude Pseudo-Filesystems and Ephemeral Mounts from Disk Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Node Exporter, Disk Alerts, Filesystem, PromQL, Linux

Description: Build disk-capacity alerts that exclude non-actionable filesystem series while preserving visibility into the real storage that can exhaust.

---

Node Exporter can expose a large filesystem inventory on container hosts: physical filesystems, memory-backed filesystems, kernel pseudo-filesystems, container overlays, loop-mounted images, bind mounts, and transient workload mounts. Applying one percentage threshold to all of them creates duplicate or meaningless alerts.

The safe fix is not “ignore anything unfamiliar.” Classify mounts by operational ownership, then filter at the right layer. An ephemeral mount can still hold critical data, and a pseudo-filesystem can have a separate capacity risk even when a block-device alert is inappropriate.

## Decide Where to Filter

There are three filtering points:

1. **Node Exporter collector flags** prevent series from being exposed.
2. **Prometheus metric relabeling** drops series after the exporter has done the collection work.
3. **PromQL selectors** retain the raw data but exclude it from a particular dashboard or alert.

Start with PromQL while developing the policy. It is reversible and lets operators inspect excluded series during an incident. Move stable, universally unwanted classes to Node Exporter flags when the cardinality or collection work is material. Use metric relabeling only when central policy must discard data; it does not reduce work inside the exporter.

## Inventory Before Excluding

List the filesystem series as Prometheus sees them:

```promql
count by (instance, device, mountpoint, fstype) (
  node_filesystem_size_bytes
)
```

Compare them with the host:

```bash
findmnt -rn -o SOURCE,TARGET,FSTYPE,OPTIONS
```

Classify each recurring group:

| Class | Typical examples | Capacity policy |
| --- | --- | --- |
| persistent data | `/`, `/var`, `/srv`, `/data`, PVC-backed mounts | alert on bytes and often inodes |
| kernel pseudo-filesystem | `proc`, `sysfs`, `cgroup2`, `debugfs` | exclude from disk-space alert |
| memory-backed | `tmpfs`, `devtmpfs` | exclude from disk alert; monitor memory policy separately if needed |
| container storage view | `overlay`, runtime or kubelet submounts | alert on the underlying host filesystem, not every view |
| read-only image | `/dev/loop*`, `squashfs`, `iso9660` | normally exclude from writable-capacity alert |
| network filesystem | NFS, CIFS, distributed storage | retain if the team owns its capacity; use different routing if not |
| ephemeral application volume | scratch, `emptyDir`, build workspace | alert only when exhaustion has an actionable consequence |

Use actual labels from your hosts. Device names, filesystem types, and runtime paths vary by distribution and storage driver.

## Know the Upstream Defaults

Current Node Exporter Linux source has default filesystem-type exclusions for many pseudo and image filesystems, including procfs, sysfs, cgroups, debugfs, devpts, overlay, squashfs, EROFS, and iso9660. It also excludes several `/dev`, `/proc`, `/sys`, and container-storage subpaths by mountpoint.

Defaults can change between releases, and distribution packages can add their own flags. Inspect:

```bash
node_exporter --help
ps -eo args | grep '[n]ode_exporter'
```

Do not duplicate a remembered default and assume it matches the binary in production.

## Filter at Collection Time

The filesystem collector accepts regular expressions:

```text
--collector.filesystem.fs-types-exclude='^(autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|erofs|fusectl|hugetlbfs|iso9660|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tracefs)$'
--collector.filesystem.mount-points-exclude='^/(dev|proc|sys|run/credentials/.+|var/lib/docker/.+|var/lib/containers/storage/.+|var/lib/kubelet/.+)($|/)'
```

These are examples to review, not a universal answer. In particular:

- excluding `/var/lib/docker/.+` still permits a distinct filesystem mounted at `/var/lib/docker` itself;
- excluding `/var/lib/kubelet/.+` removes per-workload mount views, but the backing filesystem must remain monitored elsewhere;
- `tmpfs` is not in the example above because memory-backed exhaustion may matter and deserves an explicit decision; and
- filesystem-type include and exclude flags are mutually exclusive, as are mountpoint include and exclude flags.

An allowlist can be safer on fixed-purpose appliances:

```text
--collector.filesystem.mount-points-include='^/(|var|srv|data)$'
```

Prometheus regular expressions are fully anchored, and Node Exporter examples commonly use explicit `^` and `$` anchors for clarity. Test the exact expression against a representative fleet before rollout.

## Build One Reusable Alert Selector

For a query-time policy, repeat the same selectors on numerator and denominator:

```promql
100 * (
  1 -
  node_filesystem_avail_bytes{
    job="node",
    fstype!~"autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|erofs|fusectl|hugetlbfs|iso9660|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tmpfs|tracefs",
    device!~"/dev/loop[0-9]+",
    mountpoint!~"/var/lib/(docker|containers/storage|kubelet)/.+"
  }
  /
  node_filesystem_size_bytes{
    job="node",
    fstype!~"autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|erofs|fusectl|hugetlbfs|iso9660|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tmpfs|tracefs",
    device!~"/dev/loop[0-9]+",
    mountpoint!~"/var/lib/(docker|containers/storage|kubelet)/.+"
  }
)
and on (job, instance, device, mountpoint, fstype)
node_filesystem_size_bytes{job="node"} > 0
```

This calculates space unavailable to non-root users, which is usually the useful operational percentage. `node_filesystem_free_bytes` includes blocks reserved from ordinary users and can delay an application-facing alert.

Put the long expression in a recording rule:

```yaml
groups:
  - name: node-filesystem
    rules:
      - record: instance_device_mountpoint:node_filesystem_used:ratio
        expr: |
          1 -
          node_filesystem_avail_bytes{
            job="node",
            fstype!~"autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|erofs|fusectl|hugetlbfs|iso9660|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tmpfs|tracefs",
            device!~"/dev/loop[0-9]+",
            mountpoint!~"/var/lib/(docker|containers/storage|kubelet)/.+"
          }
          /
          node_filesystem_size_bytes{
            job="node",
            fstype!~"autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|erofs|fusectl|hugetlbfs|iso9660|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tmpfs|tracefs",
            device!~"/dev/loop[0-9]+",
            mountpoint!~"/var/lib/(docker|containers/storage|kubelet)/.+"
          }
          and on (job, instance, device, mountpoint, fstype)
          node_filesystem_size_bytes{job="node"} > 0
```

Then alert with a readable condition:

```yaml
      - alert: NodeFilesystemSpaceLow
        expr: instance_device_mountpoint:node_filesystem_used:ratio > 0.90
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Filesystem space low on {{ $labels.instance }}"
          description: "{{ $labels.mountpoint }} on {{ $labels.device }} is over 90% used."
```

Add a predictive condition or a second critical threshold only when the responders have an action for it. Percentage alone can page too early on a multi-terabyte volume and too late on a small, fast-growing one.

## Alert Separately on Inodes and Collection Errors

Byte exclusions should normally be shared with the inode alert:

```promql
1 -
node_filesystem_files_free{
  job="node",
  fstype!~"autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|erofs|fusectl|hugetlbfs|iso9660|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tmpfs|tracefs",
  device!~"/dev/loop[0-9]+",
  mountpoint!~"/var/lib/(docker|containers/storage|kubelet)/.+"
}
/
node_filesystem_files{
  job="node",
  fstype!~"autofs|binfmt_misc|bpf|cgroup2?|configfs|debugfs|devpts|devtmpfs|erofs|fusectl|hugetlbfs|iso9660|mqueue|nsfs|overlay|proc|procfs|pstore|rpc_pipefs|securityfs|selinuxfs|squashfs|sysfs|tmpfs|tracefs",
  device!~"/dev/loop[0-9]+",
  mountpoint!~"/var/lib/(docker|containers/storage|kubelet)/.+"
}
and on (job, instance, device, mountpoint, fstype)
node_filesystem_files{job="node"} > 0
```

Keep observation failures separate:

```promql
node_filesystem_device_error{job="node"} == 1
```

Filtering out a filesystem because `statfs` fails turns a monitoring fault into silence. Exclude it only after deciding the filesystem is intentionally outside the monitoring contract.

## Avoid Three Common Mistakes

### Excluding every loop device by name only

Loop-backed read-only package images are usually noise, but loop devices can also back writable or operationally important filesystems. Combine device, filesystem type, mountpoint, and read-only status when the environment uses loop devices for real storage.

### Alerting on every container mount

Many container mountpoints are alternate views of the same underlying capacity. Page once on the backing host filesystem and use workload-level ephemeral-storage or volume signals for attribution. Do not count mount series as independent disks.

### Ignoring tmpfs without another policy

`tmpfs` consumes memory rather than block storage. It does not belong in a disk-full alert, but an oversized or full tmpfs can still break an application. Exclusion from one alert should route the risk to memory or workload monitoring, not erase it.

## Validate the Policy

Before deploying:

1. Evaluate the raw inventory and the filtered selector side by side.
2. Confirm every persistent backing filesystem remains.
3. Confirm container submounts do not create duplicate pages.
4. Check representative bare-metal, VM, container-host, and storage-node classes.
5. Simulate a threshold on a test filesystem.
6. Review the excluded set after runtime, Kubernetes, or operating-system upgrades.

An exclusion policy is part of the storage ownership model. Version it, test it, and make the excluded inventory observable.

## Official Documentation

- [Node Exporter include and exclude flags](https://github.com/prometheus/node_exporter#include--exclude-flags)
- [Node Exporter Linux filesystem collector defaults](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_linux.go)
- [Node Exporter filesystem metric definitions](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_common.go)
- [Prometheus querying basics and fully anchored regular expressions](https://prometheus.io/docs/prometheus/latest/querying/basics/#regular-expressions)
- [Prometheus vector matching and set operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#vector-matching)
- [Prometheus recording rule guidance](https://prometheus.io/docs/practices/rules/)
- [Linux kernel procfs mount information](https://docs.kernel.org/filesystems/proc.html#proc-pid-mountinfo-information-about-mounts)
- [Kubernetes local ephemeral storage](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#local-ephemeral-storage)

# How to Monitor Inode Exhaustion Before a Server Runs Out of Disk Space

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Prometheus, Node Exporter, Inodes, Filesystems, Alerting

Description: Detect inode exhaustion per filesystem with ratio, absolute headroom, and depletion forecasts before file creation fails despite free bytes.

---

A Linux filesystem can have gigabytes of free data blocks and still refuse to create another file. The missing resource is often an inode, the filesystem object that stores metadata for a file.

Workloads that create huge numbers of small files are especially vulnerable:

- mail and job spools;
- caches with one object per file;
- unbounded temporary directories;
- container image and overlay storage;
- log sharding;
- package or build artifacts;
- applications that fail to clean up sessions or uploads.

Byte-space and inode-space are independent constraints. Monitor both.

## The node_exporter Inode Metrics

The filesystem collector exposes:

```text
node_filesystem_files
node_filesystem_files_free
```

On Linux, these come from the `f_files` and `f_ffree` fields returned by `statfs(2)`:

- `node_filesystem_files` is the filesystem's total file-node count;
- `node_filesystem_files_free` is its total free file-node count.

The free ratio is:

```promql
node_filesystem_files_free
/
node_filesystem_files
```

The used ratio is:

```promql
1 -
(
  node_filesystem_files_free
  /
  node_filesystem_files
)
```

Evaluate each `instance`, `device`, `mountpoint`, and `fstype` separately. Do not sum inodes across mounts: an exhausted `/var` cannot allocate an inode from `/home`.

## Filter Filesystems Deliberately

Some virtual or special filesystems report zero, undefined, or operationally irrelevant inode values. Start with the persistent filesystem types you actually support:

```promql
node_filesystem_files_free{fstype=~"ext4|xfs"}
/
node_filesystem_files{fstype=~"ext4|xfs"}
```

Expand the allowlist for other real filesystems in your estate. A copied exclusion regex is fragile because a newly introduced persistent filesystem may never be monitored.

Also require a positive total when exploring an unfamiliar environment:

```promql
(
  node_filesystem_files_free
  /
  node_filesystem_files
)
and
(
  node_filesystem_files > 0
)
```

The two vectors match by their complete non-name label sets, including the filesystem labels.

## Combine Ratio and Absolute Inode Headroom

One percent remaining can mean:

- 1,000 inodes on a small filesystem;
- 10 million inodes on a very large one.

An alert can require both relative and absolute scarcity:

```promql
(
  node_filesystem_files_free{fstype=~"ext4|xfs"}
  /
  node_filesystem_files{fstype=~"ext4|xfs"}
  < 0.10
)
and
(
  node_filesystem_files_free{fstype=~"ext4|xfs"}
  < 100000
)
```

The correct absolute reserve depends on peak file-creation rate and cleanup time. A busy mail spool can consume 100,000 inodes in minutes; a mostly static root filesystem may take years.

## A Practical Alert Rule

```yaml
groups:
  - name: host-filesystem-inodes
    rules:
      - alert: FilesystemInodesLow
        expr: |
          (
            node_filesystem_files_free{fstype=~"ext4|xfs"}
            /
            node_filesystem_files{fstype=~"ext4|xfs"}
            < 0.10
          )
          and
          (
            node_filesystem_files_free{fstype=~"ext4|xfs"}
            < 100000
          )
          and
          (
            node_filesystem_readonly{fstype=~"ext4|xfs"} == 0
          )
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low inode headroom on {{ $labels.instance }} {{ $labels.mountpoint }}"
```

Use a separate alert for an unexpected read-only filesystem. Monitor `node_filesystem_device_error` as well: failure to collect statistics must not be mistaken for healthy inode headroom.

## Forecast Time to Exhaustion

For a workload that consumes inodes at a stable rate:

```promql
predict_linear(
  node_filesystem_files_free{fstype=~"ext4|xfs"}[6h],
  24 * 60 * 60
) < 0
```

This predicts whether free inodes will cross zero within 24 hours based on the last six hours.

Linear prediction is useful for a steadily growing spool, but unreliable for:

- build directories removed at the end of a job;
- cache eviction;
- log rotation;
- periodic retention cleanup;
- a one-time restore;
- filesystems that allocate inode structures dynamically.

Pair the forecast with current scarcity and a negative trend:

```promql
(
  predict_linear(
    node_filesystem_files_free{fstype=~"ext4|xfs"}[6h],
    24 * 60 * 60
  ) < 0
)
and
(
  node_filesystem_files_free
  /
  node_filesystem_files
  < 0.20
)
and
(
  deriv(node_filesystem_files_free[6h]) < 0
)
```

Use the same filesystem selectors in every branch in the production rule.

## Confirm the Problem on the Host

Check the same mount namespace that node exporter observes:

```bash
df -i
```

Then identify directories with large numbers of entries. On a typical GNU/Linux host, one investigation is to stay on the affected filesystem with `find -xdev`, group entries by parent directory, and inspect the largest counts:

```bash
find /var -xdev -printf '%h\n' \
  | sort \
  | uniq -c \
  | sort -nr \
  | head
```

This scan itself can be expensive on a filesystem with millions of files. Run it with appropriate priority, narrow the starting path when possible, and avoid making an overloaded filesystem worse.

Other useful questions:

- Is file creation continuing while cleanup has stopped?
- Are filenames distributed across directories as the application expects?
- Did a retention configuration change?
- Are deleted files still open? An open-but-unlinked file keeps its inode and data blocks allocated until the last file descriptor referring to it is closed, even though its directory entry is gone.
- Is the apparent mount an overlay backed by a different host filesystem?

Do not delete files based only on age or a broad wildcard during an incident. Identify the owning service, retention contract, and recovery implications first.

## Account for Filesystem Design

Inode behavior is filesystem-specific:

- ext-family filesystems normally create their inode tables when the filesystem is formatted, with additional block groups and inodes possible during a supported filesystem resize;
- XFS allocates inodes dynamically within filesystem allocation structures and reports inode statistics through its own implementation;
- network, copy-on-write, distributed, and pseudo filesystems may have different limits or reporting semantics;
- a project quota or directory-specific limit can fail before the mount-wide free-inode count is low.

The generic node exporter ratio is a first-line capacity signal, not a replacement for filesystem-specific health and quota metrics.

## Prevent the Next Exhaustion

After restoring headroom:

1. fix the producer or failed cleanup;
2. enforce age, size, and object-count retention;
3. measure file-creation and deletion rates;
4. add an owner and runbook to the mountpoint alert;
5. test cleanup before the filesystem is nearly exhausted;
6. redesign one-file-per-event layouts when object count will grow without bound;
7. rebuild or resize the filesystem only with filesystem-specific procedures and verified backups.

Deleting a few files treats the symptom. The durable fix puts a bound on the population.

## Summary

Monitor `node_filesystem_files_free / node_filesystem_files` per persistent mount, and combine that ratio with absolute inode headroom and a sustained duration. Forecast exhaustion only for stable creation patterns. Keep inode alerts separate from byte-space alerts, account for filesystem and quota semantics, and make the runbook identify the directory and service creating unbounded file counts.

## Official Documentation

- [Linux `statfs(2)` definitions for total and free file nodes](https://man7.org/linux/man-pages/man2/statfs.2.html)
- [Prometheus node exporter filesystem metric definitions](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_common.go)
- [Prometheus node exporter Linux `statfs` implementation](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_linux.go)
- [Linux ext4 inode table documentation](https://docs.kernel.org/filesystems/ext4/inodes.html)
- [Linux XFS filesystem documentation](https://docs.kernel.org/admin-guide/xfs.html)
- [GNU `df(1)` manual, including inode reporting](https://man7.org/linux/man-pages/man1/df.1.html)
- [Prometheus `predict_linear()` and `deriv()` functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)

# Validation Summary: How to Monitor Inode Exhaustion Before a Server Runs Out of Disk Space

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Linux filesystems and inodes
- Prometheus and PromQL
- Prometheus node_exporter filesystem metrics
- Prometheus alerting rules
- ext4 and XFS
- GNU `df`, `find`, `sort`, `uniq`, and `head`
- OverlayFS and filesystem quotas

## Sources Consulted

- [Linux `statfs(2)` manual](https://man7.org/linux/man-pages/man2/statfs.2.html)
- [Prometheus node_exporter filesystem metric definitions](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_common.go)
- [Prometheus node_exporter Linux filesystem collector](https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_linux.go)
- [Prometheus query operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Linux ext4 inode table documentation](https://docs.kernel.org/filesystems/ext4/inode_table.html)
- [Linux ext4 block group documentation](https://docs.kernel.org/filesystems/ext4/blockgroup.html)
- [Linux XFS filesystem documentation](https://docs.kernel.org/admin-guide/xfs.html)
- [XFS `mkfs.xfs(8)` manual](https://man7.org/linux/man-pages/man8/mkfs.xfs.8.html)
- [GNU Coreutils `df` manual](https://www.gnu.org/s/coreutils/manual/html_node/df-invocation.html)
- [GNU Findutils manual](https://www.gnu.org/software/findutils/manual/html_mono/find.html)
- [Linux `unlink(2)` manual](https://man7.org/linux/man-pages/man2/unlink.2.html)
- [Linux mount namespaces manual](https://man7.org/linux/man-pages/man7/mount_namespaces.7.html)
- [Linux quota subsystem documentation](https://docs.kernel.org/filesystems/quota.html)
- [Linux OverlayFS documentation](https://docs.kernel.org/filesystems/overlayfs.html)

## Issues Found

- The description called the forecast a creation-rate alert, but `deriv(node_filesystem_files_free[6h])` measures the net rate of change in free inodes after both creation and deletion. Changed the wording to "depletion forecasts."
- The positive-total example said its vectors match by filesystem labels. PromQL's default vector matching considers the complete non-name label set, which includes target labels as well as filesystem labels. Clarified the matching behavior.
- The open-but-unlinked-file explanation said an open file description is closed. `close(2)` closes file descriptors, and Linux retains an unlinked file until the last file descriptor referring to it is closed. Corrected the terminology.

## Review Notes

- The alert rule and all PromQL examples were syntax-checked with `promtool` from Prometheus 3.13.2.
- The ratio and absolute thresholds are examples that must be tuned to the filesystem and workload, as the post correctly explains.
- The node_exporter source links target the moving `master` branch. They are current, but pinning them to a release tag would make the references reproducible if the post is versioned in the future.

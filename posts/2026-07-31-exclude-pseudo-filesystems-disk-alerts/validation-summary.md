# Validation Summary: Exclude Pseudo-Filesystems and Ephemeral Mounts from Disk Alerts

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus, PromQL, metric relabeling, recording rules, and alerting rules
- Prometheus Node Exporter filesystem collector
- Linux filesystems, pseudo-filesystems, loop devices, mount information, `statfs`, and `tmpfs`
- Kubernetes local ephemeral storage and `emptyDir` volumes
- util-linux `findmnt`

## Sources Consulted

- [Node Exporter include and exclude flags](https://github.com/prometheus/node_exporter#include--exclude-flags)
- [Node Exporter v1.11.1 Linux filesystem collector source and defaults](https://github.com/prometheus/node_exporter/blob/v1.11.1/collector/filesystem_linux.go)
- [Node Exporter v1.11.1 filesystem flags and metric definitions](https://github.com/prometheus/node_exporter/blob/v1.11.1/collector/filesystem_common.go)
- [Prometheus query basics and regular-expression semantics](https://prometheus.io/docs/prometheus/latest/querying/basics/#regular-expressions)
- [Prometheus operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/#vector-matching)
- [Prometheus configuration reference for metric relabeling](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs)
- [Prometheus recording-rule configuration](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus alerting-rule configuration](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus recording-rule naming and aggregation guidance](https://prometheus.io/docs/practices/rules/)
- [Prometheus `promtool` reference](https://prometheus.io/docs/prometheus/latest/command-line/promtool/)
- [util-linux `findmnt(8)` manual](https://man7.org/linux/man-pages/man8/findmnt.8.html)
- [Linux `statfs(2)` manual](https://man7.org/linux/man-pages/man2/statfs.2.html)
- [Linux kernel procfs mount-information documentation](https://docs.kernel.org/filesystems/proc.html#proc-pid-mountinfo-information-about-mounts)
- [Linux kernel `tmpfs` documentation](https://docs.kernel.org/filesystems/tmpfs.html)
- [Kubernetes local ephemeral-storage documentation](https://kubernetes.io/docs/concepts/storage/ephemeral-storage/)
- [Kubernetes resource-management documentation for memory-backed `emptyDir`](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#considerations-for-memory-backed-emptydir-volumes)

## Issues Found

- The custom filesystem-type exclusion examples omitted `erofs`, even though EROFS is in the current Node Exporter v1.11.1 Linux default exclusion. Because explicitly setting the flag replaces the default expression, the examples would have re-enabled EROFS collection. Added `erofs` to the collection-time, query-time, recording-rule, and inode selectors and noted EROFS in the defaults discussion.
- The recording rule omitted the `node_filesystem_size_bytes > 0` guard used by the preceding ad hoc query. Added the same `and on (...)` guard so zero-sized filesystem series do not produce a division-by-zero result in the reusable rule.
- The inode query contained a literal `<same selectors>` placeholder and was not valid PromQL as shown. Replaced it with the actual exclusion selectors and added a matching positive-inode-count guard.

## Review Notes

- The PromQL expressions and combined recording/alerting rule file were syntax-checked successfully with the official Prometheus `promtool` v3.11.2 binary.
- The collection-time flag names and regular expressions were accepted by the official Node Exporter v1.11.1 binary, and the Linux-specific defaults and pre-`statfs` filtering behavior were checked in the v1.11.1 source.
- The post correctly warns that Node Exporter defaults and distribution startup flags are version-specific and should be inspected on the deployed binary.

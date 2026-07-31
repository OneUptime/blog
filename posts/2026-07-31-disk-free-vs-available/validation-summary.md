# Validation Summary: Disk Free vs Disk Available: Choosing the Right Metric for Low-Space Alerts

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- Linux filesystem statistics (`statfs` and `statvfs`)
- Prometheus
- PromQL
- Prometheus alerting rules
- Prometheus Node Exporter filesystem collector
- Linux filesystems, reserved blocks, and inode capacity
- Containerized host monitoring

## Sources Consulted
- Linux `statfs(2)` manual page: https://man7.org/linux/man-pages/man2/statfs.2.html
- Linux `statvfs(3)` manual page: https://man7.org/linux/man-pages/man3/statvfs.3.html
- GNU `df(1)` manual page: https://man7.org/linux/man-pages/man1/df.1.html
- `tune2fs(8)` reserved-block documentation: https://man7.org/linux/man-pages/man8/tune2fs.8.html
- Linux ext4 `statfs` implementation: https://github.com/torvalds/linux/blob/master/fs/ext4/super.c
- Prometheus Node Exporter filesystem metric definitions: https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_common.go
- Prometheus Node Exporter Linux filesystem implementation: https://github.com/prometheus/node_exporter/blob/master/collector/filesystem_linux.go
- Prometheus Node Exporter containerized host-monitoring guidance: https://github.com/prometheus/node_exporter#docker
- Prometheus query functions (`predict_linear`): https://prometheus.io/docs/prometheus/latest/querying/functions/#predict_linear
- Prometheus operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus 3.13.1 release and `promtool`: https://github.com/prometheus/prometheus/releases/tag/v3.13.1

## Issues Found
No technical issues found.

## Review Notes
- All standalone PromQL examples were parsed successfully with Prometheus `promtool` 3.13.1.
- The complete alerting-rule YAML passed `promtool check rules`.
- The `f_blocks`, `f_bfree`, and `f_bavail` mappings and byte conversions match the current Node Exporter Linux collector implementation.
- The percentage-plus-absolute-threshold expressions use compatible Node Exporter label sets, so the default PromQL vector matching is valid.
- The post correctly treats `free_bytes - avail_bytes` as filesystem-dependent and does not assume that every difference is an ext-family reserved-block setting.
- The forecast example correctly uses a gauge range vector and a future offset in seconds. Its warnings about non-linear workloads and the need for matching production filters are appropriate.
- The linked documentation URLs resolve to the intended authoritative resources.

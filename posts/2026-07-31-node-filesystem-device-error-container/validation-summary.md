# Validation Summary: Fixing `node_filesystem_device_error` in Containerized Node Exporter

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Prometheus and PromQL
- Prometheus Node Exporter
- Docker bind mounts and PID namespaces
- Kubernetes `hostPath` volumes and mount propagation
- Linux procfs, mount namespaces, `mountinfo`, `statfs`, and shared-subtree propagation
- YAML alerting and scrape configuration

## Sources Consulted

- [Node Exporter v1.12.1 README: Docker deployment, collector filtering, and include/exclude flags](https://github.com/prometheus/node_exporter/blob/v1.12.1/README.md)
- [Node Exporter v1.12.1 Linux filesystem collector](https://github.com/prometheus/node_exporter/blob/v1.12.1/collector/filesystem_linux.go)
- [Node Exporter v1.12.1 filesystem metric definitions and filtering](https://github.com/prometheus/node_exporter/blob/v1.12.1/collector/filesystem_common.go)
- [Node Exporter v1.12.1 collector success metric implementation](https://github.com/prometheus/node_exporter/blob/v1.12.1/collector/collector.go)
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Prometheus query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus v3.13.2 scrape metric implementation](https://github.com/prometheus/prometheus/blob/v3.13.2/scrape/scrape.go)
- [Docker bind-mount documentation](https://docs.docker.com/engine/storage/bind-mounts/)
- [Kubernetes mount-propagation documentation](https://kubernetes.io/docs/concepts/storage/volumes/#mount-propagation)
- [Linux kernel documentation for `/proc/<pid>/mountinfo`](https://docs.kernel.org/filesystems/proc.html#proc-pid-mountinfo-information-about-mounts)
- [Linux kernel shared-subtree documentation](https://docs.kernel.org/filesystems/sharedsubtree.html)
- [`statfs(2)` Linux manual page](https://man7.org/linux/man-pages/man2/statfs.2.html)

## Issues Found

- The post said Node Exporter falls back from `/proc/1/mountinfo` whenever that path is unavailable. The Linux collector falls back to its own mount information only when reading PID 1's mount information returns `os.ErrNotExist`; other errors are returned as collector failures. Changed the wording to say the fallback occurs only when the file is missing.
- The metric-relabeling diagnostic mentioned only `scrape_samples_scraped`, which counts samples before metric relabeling. Added `scrape_samples_post_metric_relabeling`, which reports the number remaining after metric relabeling, so the suggested comparison can reveal samples removed at that stage.
- The repair sequence implied the exact `statfs` error and path appear in ordinary exporter logs. Node Exporter emits that log entry at debug level, while current releases also place the error text in the `device_error` label. Updated the instruction to inspect the label and debug-level logs.

## Review Notes

- The Node Exporter flags were checked against the v1.12.1 release, and all PromQL alert and recording-rule expressions were successfully parsed with Prometheus `promtool` v3.13.2.
- The Docker `--mount` syntax, `rslave` propagation, Kubernetes `HostToContainer` setting, YAML fragments, filesystem metric behavior, collector-success semantics, and referenced URLs are technically correct as reviewed.
- The post deliberately uses a `<pinned-version>` placeholder; readers must replace it with a real image tag before running the command.
- The source links in the post target the moving `master` branch. They are valid, but their contents can change after this validation date.

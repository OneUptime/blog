# Validation Summary: How to Implement Prometheus Node Exporter for Host-Level Metrics Collection

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Prometheus
- Prometheus Node Exporter
- PromQL
- Linux systemd
- Kubernetes DaemonSet and Service manifests
- Prometheus TLS and basic authentication configuration

## Sources Consulted
- Prometheus Node Exporter README and collector flag reference: https://github.com/prometheus/node_exporter
- Prometheus Node Exporter v1.7.0 README for version-specific flag checks: https://raw.githubusercontent.com/prometheus/node_exporter/v1.7.0/README.md
- Prometheus Node Exporter releases: https://github.com/prometheus/node_exporter/releases
- Prometheus guide, Monitoring Linux host metrics with the Node Exporter: https://prometheus.io/docs/guides/node-exporter/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTPS and authentication configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/https/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/

## Issues Found
- The installation commands described Node Exporter v1.7.0 as the latest release. The current latest release is v1.11.1, so the download URL, extracted directory, and Kubernetes image tag were updated to v1.11.1.
- The systemd unit creation used `sudo cat > /etc/systemd/system/node_exporter.service`, but shell redirection would still run as the non-root shell and fail for a protected system path. This was changed to `sudo tee ... > /dev/null`.
- The systemd service file referenced `User=node_exporter` before the install steps created that user. The user creation command was moved before the service file creation.
- The examples used `--collector.netclass.ignored-devices`, which is not the documented Node Exporter include/exclude flag. It was replaced with `--collector.netdev.device-exclude`, the documented flag for filtering network interface statistics.
- The Prometheus scrape configuration claimed a 15-second scrape interval without configuring one in the job. Added `scrape_interval: 15s` to match the explanation.
- The "Disk I/O operations per second" PromQL example used `node_disk_io_time_seconds_total`, which measures time spent doing I/O, not operation count. It was changed to use read and write completed operation counters.

## Review Notes
The security configuration is technically valid, but the example keeps the Prometheus scrape password inline for brevity. In production, using `password_file` or secret management is preferable.

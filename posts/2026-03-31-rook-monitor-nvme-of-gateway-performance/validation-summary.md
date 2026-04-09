# Validation Summary: How to Monitor NVMe-oF Gateway Performance in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph NVMe-oF gateway
- Prometheus (metrics and alerting)
- Grafana (visualization)
- nvme-cli (NVMe userspace tools)
- iostat / sysstat
- biolatency / bcc-tools
- kubectl

## Sources Consulted
- Ceph NVMe-oF CLI source code at https://github.com/ceph/ceph-nvmeof (control/cli.py)
- Ceph mgr NVMe-oF module at https://github.com/ceph/ceph (src/pybind/mgr/nvmeof/)
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- nvme-cli documentation and man pages: https://github.com/linux-nvme/nvme-cli
- nvme-smart-log man page: https://manpages.debian.org/testing/nvme-cli/nvme-smart-log.1.en.html
- nvme-get-log man page: https://manpages.debian.org/testing/nvme-cli/nvme-get-log.1.en.html
- Grafana dashboard 2842 (Ceph - Cluster): https://grafana.com/grafana/dashboards/2842-ceph-cluster/
- Grafana dashboard 5336 (Ceph - OSD Single): https://grafana.com/grafana/dashboards/5336-ceph-osd-single/
- Rook Ceph monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Rook Ceph Dashboard documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/

## Issues Found

1. **`--nqn` flag does not exist on namespace list command**: The `ceph nvmeof namespace list` command uses `--subsystem` (short: `-n`) to specify the NQN, not `--nqn`. Changed `--nqn` to `--subsystem`.

2. **`nvme latency-stats` is a fabricated command**: The `nvme latency-stats` subcommand does not exist in nvme-cli. There is no such command in the upstream repository or man pages. Replaced with `biolatency -d nvme0n1 10 1` (from bcc-tools), which is the standard tool for monitoring block I/O latency distributions.

3. **`nvme get-log` missing required `--log-len` parameter**: The `nvme get-log` command requires `--log-len` to be specified. Without it, the command fails. Added `--log-len=512` and updated the comment to clarify this returns raw format data.

4. **Grafana vs Ceph Dashboard confusion**: The post said "Port-forward Grafana" but the command `kubectl -n rook-ceph port-forward svc/rook-ceph-mgr-dashboard 8443:8443` opens the Ceph Dashboard (built-in web UI), not Grafana. Grafana is typically deployed in a separate monitoring namespace. Fixed the comments to clarify the distinction and added a commented example for port-forwarding Grafana.

5. **Dashboard 2842 mislabeled as "Ceph - OSD (Single)"**: Grafana dashboard ID 2842 is "Ceph - Cluster", not "Ceph - OSD (Single)" (which is dashboard 5336). Corrected the label.

6. **`ceph_nvmeof_gateway_state` metric unverified**: NVMe-oF gateway metrics are exposed by the gateway's own Prometheus exporter on port 10008, not through the Ceph mgr exporter on port 9283. Restructured the Prometheus section to separate pool-level metrics (available on 9283) from gateway-specific metrics (on 10008), and updated the alert rule to use `ceph_nvmeof_gateway_up`.

## Review Notes
- The `ceph nvmeof` CLI commands (gateway info, subsystem list, namespace list) are available through the Ceph mgr module in newer Ceph versions (Squid/v19+). In older versions or standalone deployments, the tool is called `ceph-nvmeof` (with a hyphen). The post assumes the mgr module interface which is appropriate for Rook deployments.
- `nvme smart-log` on NVMe-oF connected devices returns data from the gateway's NVMe-oF target implementation (e.g., SPDK), not from physical disk health. The data may be synthetic or minimal since the namespace is backed by an RBD image, not a physical NVMe drive. The post could benefit from a note about this caveat.
- The `iostat` `%util` metric can be misleading for NVMe devices due to internal parallelism — users should focus on `await` and `aqu-sz` instead.
- The NQN format `nqn.2024-01.io.ceph:mysubsystem` is valid per the NVMe specification.

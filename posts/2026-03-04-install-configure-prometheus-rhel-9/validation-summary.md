# Validation Summary: How to Install and Configure Prometheus on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- Prometheus
- PromQL
- systemd
- firewalld
- Node Exporter metrics

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus command-line flags documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus downloads page: https://prometheus.io/download/
- Prometheus consoles and dashboards documentation: https://prometheus.io/docs/practices/consoles/
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Local `promtool` 3.11.3 validation against the post's Prometheus configuration snippet.

## Issues Found
- The post described downloading the latest Prometheus release but pinned `PROM_VERSION="2.51.0"`. Updated the version to `3.11.3`, the latest Prometheus release listed on the official download page during review.
- The install steps copied `consoles` and `console_libraries` from the Prometheus archive and configured matching systemd flags. Prometheus 3.0 and later no longer bundle those console templates and libraries, so those copy commands and service flags would fail with the current release. Removed them.
- The service used `--storage.tsdb.retention.time=30d`, and the retention section recommended retention command-line flags. The latest Prometheus documentation marks those flags as deprecated in favor of the `storage.tsdb.retention` configuration. Moved the 30-day retention setting into `prometheus.yml` and updated the retention guidance.
- The user creation command was described as creating a system user but omitted `--system`. Added `--system` to match the command with the stated intent.

## Review Notes
The updated Prometheus configuration snippet was validated successfully with `promtool check config` from Prometheus 3.11.3. The Node Exporter PromQL examples are syntactically valid but depend on Node Exporter being installed and scraped successfully, as the post notes.

# Validation Summary: How to Monitor Calicoctl Installation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Prometheus node_exporter textfile collector
- Bash scripting
- Cron
- SSH

## Sources Consulted
- Calico Open Source documentation: Install calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico Open Source documentation: Configure calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico Open Source documentation: calicoctl version - https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico Open Source documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Prometheus node_exporter README: Textfile Collector - https://github.com/prometheus/node_exporter#textfile-collector
- Prometheus Python client documentation: Node exporter textfile collector - https://prometheus.github.io/client_python/exporting/textfile/

## Issues Found
- The fleet monitoring script hardcoded `EXPECTED_VERSION="v3.27.0"`, which can become stale and conflicts with Calico's guidance to match `calicoctl` to the Calico cluster version. Changed it to require `EXPECTED_VERSION` from the environment or a second argument.
- The fleet monitoring script did not skip blank lines or comments in the hosts file. Updated the read loop to handle those entries safely.
- The Prometheus textfile collector example wrote directly to the final `.prom` file. Updated it to write to a temporary file and rename it into place, matching node_exporter's documented atomic-write pattern.
- The Prometheus metric label used fragile shell quoting. Replaced it with `printf` and escaped backslashes and double quotes in the version label.
- Several shell examples used unquoted path variables and `which`. Updated them to quote path variables and use `command -v`.
- The configuration drift example used a placeholder hash that would always report drift. Updated it to require `EXPECTED_CONFIG_HASH` and use `sha256sum` for the approved configuration hash.
- The troubleshooting section claimed the monitoring script caches results, but the provided scripts do not cache results. Updated the note to refer to the script run interval and Prometheus scrape interval.

## Review Notes
The edited Bash snippets were checked with `bash -n`. `shellcheck` is not installed in this workspace, so no shellcheck lint result is available. The metrics directory remains an example path; operators must configure node_exporter with `--collector.textfile.directory` pointing at the same directory.

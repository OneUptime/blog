# Validation Summary: How to Install and Configure Grafana Agent for Metrics Collection on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Grafana Alloy
- Grafana Agent
- Prometheus metrics
- Prometheus remote write
- Grafana Cloud
- Loki log collection
- systemd
- firewalld

## Sources Consulted
- Grafana Alloy Linux installation documentation: https://grafana.com/docs/alloy/latest/set-up/install/linux/
- Grafana Alloy Linux configuration documentation: https://grafana.com/docs/alloy/latest/configure/linux/
- Grafana Alloy Linux service documentation: https://grafana.com/docs/alloy/latest/set-up/run/linux/
- Grafana Alloy `prometheus.exporter.unix` component reference: https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.exporter.unix/
- Grafana Alloy `prometheus.scrape` component reference: https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.scrape/
- Grafana Alloy `prometheus.remote_write` component reference: https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.remote_write/
- Grafana Alloy `local.file_match` component reference: https://grafana.com/docs/alloy/latest/reference/components/local/local.file_match/
- Grafana Alloy `loki.source.file` component reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/
- Grafana Alloy `loki.write` component reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/
- Grafana Alloy `fmt` command reference: https://grafana.com/docs/alloy/latest/reference/cli/fmt/
- Grafana Alloy `validate` command reference: https://grafana.com/docs/alloy/latest/reference/cli/validate/

## Issues Found
- The RPM installation example did not import the Grafana RPM GPG key before adding the repository. Added the official `wget` and `rpm --import` commands from Grafana's RHEL/Fedora installation instructions.
- The remote write and Loki examples used fixed Grafana Cloud regional URLs and referred to API keys. Grafana Cloud endpoints and credentials are stack-specific, so the examples now use explicit placeholders for the Prometheus remote write URL, Loki push URL, usernames, and access policy token.
- The restart section described `alloy fmt /etc/alloy/config.alloy` as validating the configuration. The `fmt` command only formats Alloy syntax and does not validate component configuration, so it was changed to `alloy validate /etc/alloy/config.alloy`.
- The `/metrics` check claimed to verify that the agent is scraping metrics. That endpoint verifies Alloy's built-in HTTP server is responding, so the wording was corrected.
- The firewall section opened port `12345` without configuring Alloy to listen on a non-local address. Added the documented `--server.http.listen-addr=0.0.0.0:12345` setting before the firewalld commands.

## Review Notes
Grafana Agent is deprecated and Grafana Alloy is the correct collector for new deployments. The post's Alloy component syntax for `prometheus.exporter.unix`, `prometheus.scrape`, `prometheus.remote_write`, `local.file_match`, `loki.source.file`, and `loki.write` matches the current Grafana Alloy component references.

# Validation Summary: How to Set Up Prometheus and Grafana for Docker Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Prometheus
- Grafana
- cAdvisor
- Node Exporter
- Alertmanager
- PromQL alerting rules
- Mermaid diagrams

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker daemon Prometheus metrics documentation: https://docs.docker.com/engine/daemon/prometheus/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Docker image configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/
- cAdvisor running documentation: https://github.com/google/cadvisor/blob/master/docs/running.md
- Grafana pie chart panel plugin repository notice: https://github.com/grafana/piechart-panel

## Issues Found
- The Docker Compose examples used the obsolete top-level `version: '3.8'` field. Removed it from both Compose snippets because current Docker Compose uses the Compose Specification and warns that the `version` field is obsolete.
- The Prometheus container scraped `host.docker.internal:9323` without mapping that hostname on Linux. Added `extra_hosts: ["host.docker.internal:host-gateway"]` to the Prometheus service in both Compose examples, matching Docker's documented containerized Prometheus pattern.
- The Docker daemon metrics JSON included a JavaScript-style comment and set `"experimental": true`. Removed the comment so the snippet is valid JSON and removed the no-longer-needed experimental flag; current Docker documentation only requires `metrics-addr` for this setup.
- The Docker daemon metrics snippet exposed `0.0.0.0:9323` without caveat. Added a short warning to bind to `127.0.0.1:9323` when Prometheus runs on the host and use `0.0.0.0:9323` only when the Prometheus container needs host-gateway access.
- The Alertmanager Slack config used `${SLACK_WEBHOOK_URL}` directly in `alertmanager.yml`. Replaced it with the supported `api_url_file` option and added the corresponding Docker volume mount for a webhook URL file.
- The production setup mounted `alerts.yml` but did not show the required Prometheus `rule_files` entry or Alertmanager target configuration. Added a minimal `prometheus.yml` snippet showing `rule_files` and `alerting.alertmanagers`.
- The production Grafana service installed `grafana-piechart-panel`, which is deprecated because Grafana has included a pie chart panel since Grafana 8. Removed the deprecated plugin installation line.
- The architecture diagram implied Prometheus directly monitors Docker containers. Adjusted the diagram to show Docker daemon metrics flowing to Prometheus and container metrics flowing through cAdvisor.

## Review Notes
- The image tags in the article are pinned and older than current releases as of 2026-06-22. They are still syntactically valid examples, but future maintenance should consider updating Prometheus, Grafana, cAdvisor, Node Exporter, and Alertmanager versions together and retesting the dashboard and alert examples.
- The example cAdvisor image uses the older `gcr.io/cadvisor/cadvisor` registry because it pins v0.47.2. Current cAdvisor documentation uses `ghcr.io/google/cadvisor` for newer releases.
- The alert expressions are valid PromQL examples, but production deployments should tune CPU and memory alert thresholds per workload and account for containers without explicit memory limits.

# Validation Summary: How to Run PagerDuty Integration with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- PagerDuty Agent
- PagerDuty Events API v2
- Prometheus
- Alertmanager
- cAdvisor
- Node Exporter
- Python
- Docker SDK for Python

## Sources Consulted
- PagerDuty Agent Integration Guide: https://support.pagerduty.com/main/docs/pagerduty-agent-integration-guide
- PagerDuty pdagent GitHub repository: https://github.com/PagerDuty/pdagent
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/events-api-v2/overview/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- PagerDuty Prometheus Integration Guide: https://www.pagerduty.com/docs/guides/prometheus-integration-guide/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Docker Compose file reference and version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker events CLI documentation: https://docs.docker.com/reference/cli/docker/system/events/
- Docker SDK for Python client documentation: https://docker-py.readthedocs.io/en/stable/client.html

## Issues Found
- The post used `pagerduty/pdagent:latest`, but PagerDuty does not publish an official Docker Hub image under that name. Replaced the command with the official source-repository Docker workflow and updated the later `docker exec` container name to `pdagent-ubuntu`.
- The post said to send events through the PagerDuty Agent CLI or a local HTTP endpoint, but the official PagerDuty Agent documentation describes the `pd-send` CLI and queue daemon, not a local HTTP endpoint. Removed the HTTP endpoint reference.
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification guidance.
- Alertmanager was configured with `routing_key: "${PD_INTEGRATION_KEY}"`, which would not reliably read the shell variable from the mounted YAML file. Added `pagerduty.key`, mounted it into Alertmanager, and changed the receiver configuration to `routing_key_file`.
- Alertmanager routes used deprecated `match` syntax. Updated them to `matchers`, which is the current documented route matcher format for Alertmanager v0.27.0 and later.
- The `ContainerHighMemory` alert returned a ratio while the annotation described a percentage, and it could alert on containers with no memory limit. Updated the expression to calculate a percentage and filter out zero memory limits.
- The `ContainerRestarting` alert used `container_restart_count`, which is not listed in cAdvisor's Prometheus metrics. Replaced it with a rule based on changes to `container_start_time_seconds`, which cAdvisor documents.
- The Python example imported unused `json` and `time` modules. Removed those imports.

## Review Notes
Local validation confirmed that the YAML snippets parse and the Python example is syntactically valid. `promtool` and `amtool` were not installed in this workspace, and Docker Hub rate limiting prevented pulling the Alertmanager image to run those binaries from the container, so Prometheus and Alertmanager semantic validation was performed against official documentation rather than local CLI tooling.

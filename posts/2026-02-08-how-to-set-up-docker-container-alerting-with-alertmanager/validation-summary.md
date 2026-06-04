# Validation Summary: How to Set Up Docker Container Alerting with Alertmanager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- cAdvisor
- Prometheus
- PromQL alerting rules
- Alertmanager
- Slack notifications
- PagerDuty notifications
- Alertmanager silences API

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Prometheus cAdvisor monitoring guide: https://prometheus.io/docs/guides/cadvisor/
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template examples/reference: https://prometheus.io/docs/prometheus/latest/configuration/template_examples/
- Prometheus `promtool check rules` documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Alertmanager overview: https://prometheus.io/docs/alerting/latest/alertmanager/
- Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/
- Alertmanager API v2 documentation: https://prometheus.io/docs/alerting/latest/alerts_api/

## Issues Found
- The introduction incorrectly implied that Alertmanager evaluates Prometheus alert rules. Updated it to state that Prometheus evaluates rules and sends firing alerts to Alertmanager for routing.
- The Docker Compose example used the obsolete top-level `version` property. Removed it because current Compose uses the Compose Specification and treats `version` as only informative.
- The generic `ContainerDown` rule could not reliably identify arbitrary stopped containers with cAdvisor metrics after their series disappear. Replaced it with an explicit expected-container `ContainerMissing` example using `absent(container_last_seen{name="app"})`.
- The restart alert used `increase(container_start_time_seconds[15m])`, which is incorrect for a timestamp gauge. Changed it to `changes(container_start_time_seconds[15m])`.
- The memory percentage alerts did not guard against containers without a memory limit. Added a positive memory-limit condition.
- The CPU alert text described the expression as a generic percentage. Updated the wording to clarify that the expression represents usage above 0.8 CPU cores.
- The Alertmanager route and inhibition examples used deprecated matcher fields (`match`, `source_match`, and `target_match`). Updated them to `matchers`, `source_matchers`, and `target_matchers`.
- The PagerDuty example used `service_key`; updated it to the current `routing_key` field.
- The inhibition rule compared `alertname`, which would not suppress a different warning alert for the same container. Changed it to compare the container `name` label.
- The memory stress test used `dd if=/dev/zero of=/dev/null`, which does not allocate sustained container memory. Replaced it with a Python command that allocates memory and sleeps.
- The silence example used fixed dates that are expired as of the validation date. Replaced them with current UTC `START` and `END` values generated at runtime.

## Review Notes
- The Prometheus alert rules were validated with `promtool check rules` from a local `prom/prometheus:v2.55.1` image because pulling the exact `v2.48.0` image hit Docker Hub's unauthenticated pull rate limit.
- The Alertmanager configuration was validated with `amtool check-config` from a local `prom/alertmanager:latest` image because pulling the exact `v0.26.0` image hit Docker Hub's unauthenticated pull rate limit.
- The Docker Compose snippet was validated with `docker compose -f - config --quiet`.

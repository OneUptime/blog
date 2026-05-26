# Validation Summary: How to Use Ansible Delegation for Monitoring Registration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks, delegation, handlers, `uri`, `copy`, `template`, `file`, `apt`, and `systemd` modules
- Prometheus file-based service discovery, HTTP service discovery, and HTTP API
- Alertmanager v2 silences API
- Nagios Core object configuration and configuration verification
- Datadog Tags API, Monitors API, and Downtimes API

## Sources Consulted
- Ansible playbook delegation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible `uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `strftime` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/strftime_filter.html
- Prometheus configuration documentation for `file_sd_config` and `http_sd_config`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP service discovery documentation: https://prometheus.io/docs/prometheus/latest/http_sd/
- Prometheus HTTP API documentation for `/api/v1/targets`: https://prometheus.io/docs/prometheus/latest/querying/api/
- Alertmanager API v2 OpenAPI documentation: https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml
- Nagios Core object definitions: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/objectdefinitions.html
- Nagios Core configuration verification: https://assets.nagios.com/downloads/nagioscore/docs/nagioscore/4/en/verifyconfig.html
- Datadog Tags API: https://docs.datadoghq.com/api/latest/tags/
- Datadog Monitors API: https://docs.datadoghq.com/api/latest/monitors/
- Datadog Downtimes API: https://docs.datadoghq.com/api/latest/downtimes/

## Issues Found
- The Prometheus introduction said Prometheus uses "API-based targets." Prometheus does not provide a general API for adding scrape targets; its generic dynamic target mechanisms include file-based service discovery and HTTP service discovery. Changed the wording to "file-based service discovery or HTTP service discovery."
- The Datadog monitor creation example used `type: http` with an empty query. Datadog monitor types do not include `http`; HTTP-style checks are represented through service check monitors or synthetics. Changed the example to a `service check` monitor with a valid `http.can_connect` service-check query and removed `run_once` so the per-host monitor example runs for each host.
- The Datadog downtime example used the deprecated v1 downtime endpoint and POSIX timestamp fields. Updated it to the v2 downtime endpoint with the current JSON:API request shape, including `data.type`, `attributes.monitor_identifier`, `attributes.scope`, `attributes.schedule`, and v2 cancellation URL handling.
- The Alertmanager silence and Datadog downtime end-time expressions used local-time `now()` while appending `Z`. Changed them to UTC-aware `now(utc=true)` and the documented Ansible `strftime(seconds=..., utc=true)` form.

## Review Notes
- The Prometheus examples assume the Prometheus server is already configured with a matching `file_sd_configs` glob for `/etc/prometheus/targets/*.yml`.
- The Datadog `http.can_connect` service check monitor assumes the Datadog Agent has an HTTP check configured to emit that service check for the host.

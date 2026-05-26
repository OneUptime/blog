# Validation Summary: How to Use Ansible to Configure Prometheus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Prometheus
- PromQL
- Jinja2 templates
- YAML
- JSON
- File-based service discovery
- Alerting and recording rules

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus file-based service discovery guide: https://prometheus.io/docs/guides/file-sd/
- Prometheus promtool command documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Ansible template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html

## Issues Found
- The file-based service discovery template used a JSON comment and comma logic that could produce invalid JSON when multiple inventory groups were rendered. I changed the filename comment to a Jinja comment and replaced the comma logic with a Jinja namespace flag so the rendered file remains valid JSON.
- The web application scrape config dropped `http_request_duration_seconds_bucket`, but the later `HighLatency` alert queries that bucket metric. I changed the relabeling example to drop high-cardinality labels (`request_id` and `session_id`) instead of removing the histogram metric needed by the alert.
- The `HighErrorRate` alert divided raw 5xx request rates by raw request rates. With a `status` label present, Prometheus vector matching can compare the 5xx series only with matching status series rather than total traffic. I changed the expression to aggregate numerator and denominator by `job` and `instance` before division.
- The reload handler used Prometheus's HTTP reload endpoint without mentioning that it requires Prometheus to run with `--web.enable-lifecycle`. I added that requirement before the handler snippet.

## Review Notes
- The Prometheus configuration fields, `file_sd_configs` shape, alerting and recording rule structure, `promtool check config` command, and Ansible module names are current according to the official documentation consulted.
- I validated the corrected Jinja file service discovery template locally with sample inventory data and confirmed that it renders parseable JSON.

# Validation Summary: How to Use Ansible Callback Plugins for Monitoring Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- Ansible configuration
- Prometheus Pushgateway and prometheus_client
- Datadog Ansible callback integration
- PagerDuty Events API v2
- Grafana annotations
- Ansible set_stats

## Sources Consulted
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible configuration settings for callbacks_enabled: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible ansible.builtin.default callback result_format documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible ansible.builtin.set_stats module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/set_stats_module.html
- Ansible community.grafana.grafana_annotations callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/grafana/grafana_annotations_callback.html
- Ansible ansible.posix.profile_tasks callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/profile_tasks_callback.html
- Ansible ansible.posix.timer callback documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/timer_callback.html
- Ansible community.general.syslog_json callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/syslog_json_callback.html
- Datadog Ansible integration documentation: https://docs.datadoghq.com/integrations/ansible/
- Datadog ansible-datadog-callback repository: https://github.com/DataDog/ansible-datadog-callback
- Prometheus Python client Pushgateway documentation: https://prometheus.github.io/client_python/exporting/pushgateway/
- Prometheus Pushgateway documentation: https://prometheus.io/docs/instrumenting/pushing/
- PagerDuty Events API v2 endpoint reference: https://support.pagerduty.com/main/docs/rulesets-advanced-configuration

## Issues Found
- The post used the older `callback_whitelist` Ansible setting in examples. Updated examples to use the current `callbacks_enabled` setting.
- Custom callback examples used `CALLBACK_NEEDS_WHITELIST`. Updated them to `CALLBACK_NEEDS_ENABLED`, the current callback plugin attribute.
- The Prometheus callback imported `Counter` but did not use it. Removed the unused import.
- The Datadog section described a `community.general.datadog` callback and `[callback_datadog]` configuration that is not the documented Datadog integration path. Updated it to use Datadog's supported `ansible-datadog-callback` plugin, `datadog_callback`, and `DATADOG_API_KEY`.
- The Datadog metric list included "Host status" as a metric. Updated it to "Skipped and unreachable task counts" to match the documented collected metrics.
- The PagerDuty example imported `json` but did not use it. Removed the unused import.
- The Grafana example used the wrong callback plugin name, wrong config section, and a Jinja expression in `ansible.cfg`. Updated it to `community.grafana.grafana_annotations`, `[callback_grafana_annotations]`, the annotations API URL, and the documented `GRAFANA_API_KEY` environment variable.
- The complete monitoring stack used the deprecated/removed `yaml` stdout callback pattern. Updated it to `ansible.builtin.default` with `callback_result_format = yaml`.
- The complete monitoring stack used short or incorrect callback names for timer/profile/syslog. Updated them to `ansible.posix.timer`, `ansible.posix.profile_tasks`, and `community.general.syslog_json`.

## Review Notes
The examples assume the relevant Ansible collections and Python packages are installed on the controller. The custom callback examples are illustrative and do not include production hardening such as HTTP response status checks, retry logic, or metric grouping keys.

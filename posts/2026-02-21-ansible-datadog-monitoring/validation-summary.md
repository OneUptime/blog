# Validation Summary: How to Use Ansible with Datadog for Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Datadog Agent
- Datadog Ansible collection
- Datadog integrations for NGINX, PostgreSQL, OpenMetrics, logs, APM, and processes
- Datadog Monitors API
- UFW firewall management
- Cron automation

## Sources Consulted
- Datadog Ansible collection documentation: https://docs.datadoghq.com/agent/supported_platforms/ansible/
- Datadog Ansible role variables documentation: https://docs.datadoghq.com/agent/guide/ansible_standalone_role/
- Datadog host Agent log collection documentation: https://docs.datadoghq.com/agent/logs/
- Datadog Monitors API documentation: https://docs.datadoghq.com/api/latest/monitors/
- Datadog NGINX integration documentation: https://docs.datadoghq.com/integrations/nginx/
- Datadog PostgreSQL integration documentation: https://docs.datadoghq.com/integrations/postgres/
- Datadog OpenMetrics integration documentation: https://docs.datadoghq.com/integrations/openmetrics/
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The Datadog live process configuration used `process_config.enabled: true`. Datadog documents this value as a string with accepted values such as `"true"`, `"false"`, and `"disabled"`, so it was changed to `enabled: "true"`.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the current timezone module is provided by `community.general.timezone` and is not included in ansible-core. The task was updated to use `community.general.timezone`.

## Review Notes
- The Datadog collection, role name, `datadog_api_key`, `datadog_site`, `datadog_agent_major_version`, `datadog_config`, and `datadog_checks` examples align with current Datadog role documentation.
- The log collection example follows Datadog's documented `logs_enabled: true` and `conf.d/<source>.d/conf.yaml` pattern.
- The monitor creation example uses the documented Datadog v1 monitor endpoint, required API/application key headers, valid `metric alert` type, and valid metric monitor query shape.
- The post assumes the Datadog collection and `community.general` collection are available on the control node before running the playbooks.

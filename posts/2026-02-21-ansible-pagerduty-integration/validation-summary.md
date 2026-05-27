# Validation Summary: How to Use Ansible to Configure PagerDuty Integration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- PagerDuty Events API v2
- PagerDuty REST API
- Prometheus Alertmanager
- Alertmanager notification templates
- Bash
- Python JSON generation
- curl

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager API documentation: https://prometheus.io/docs/alerting/0.30/alerts_api/
- PagerDuty services and integrations documentation: https://support.pagerduty.com/main/docs/services-and-integrations
- PagerDuty API access keys documentation: https://support.pagerduty.com/main/docs/api-access-keys
- PagerDuty rulesets and Events API v2 endpoint documentation: https://support.pagerduty.com/main/docs/rulesets-advanced-configuration
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html

## Issues Found
- The Alertmanager examples targeted Alertmanager 0.27.0 but used deprecated `match`, `source_match`, and `target_match` fields. Updated the route variables and template output to use `matchers`, `source_matchers`, and `target_matchers`, matching current Alertmanager guidance and UTF-8 matcher migration recommendations.
- The Alertmanager PagerDuty receiver used `service_key` while the surrounding examples created and used PagerDuty Events API v2 integrations. Updated the receiver examples to use `routing_key`, which Alertmanager documents as the field for Events API v2 integration keys.
- The Alertmanager role wrote `/etc/alertmanager/templates/pagerduty.tmpl` without first creating `/etc/alertmanager/templates`. Added a task to create the template directory before deploying the template.
- The Alertmanager test playbook posted alerts to `/api/v1/alerts`, but Alertmanager API v1 was removed in Alertmanager 0.27.0. Updated both trigger and resolve calls to `/api/v2/alerts`.
- The custom Bash trigger script built JSON with shell string interpolation, which could produce invalid JSON when arguments contained quotes, backslashes, or other special characters. Replaced the heredoc JSON construction with Python `json.dumps` while keeping the script interface the same.

## Review Notes
Ansible and Alertmanager command-line tools were not installed in the local environment, so the examples were not executed end-to-end. The review was performed against official documentation and static inspection. The PagerDuty API management example uses direct POST requests and is suitable as a provisioning example, but production automation should normally add idempotent lookup/update behavior to avoid duplicate services and integrations.

# Validation Summary: How to Use Ansible to Configure Alert Notifications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Prometheus
- Prometheus Alertmanager
- Alertmanager routing and inhibition configuration
- Slack, email, PagerDuty, and webhook alert receivers
- PromQL alerting rules
- systemd

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager 0.27 configuration documentation: https://prometheus.io/docs/alerting/0.27/configuration/
- Prometheus Alertmanager Alerts API documentation: https://prometheus.io/docs/alerting/latest/alerts_api/
- Prometheus Alertmanager concepts documentation: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Ansible get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html

## Issues Found
- Alertmanager route examples used deprecated `match` and `match_re` fields. Updated them to the current `matchers` syntax because the post targets Alertmanager 0.27.0, where the official docs recommend `matchers`.
- Alertmanager inhibition rules used deprecated `source_match` and `target_match` fields. Updated them to `source_matchers` and `target_matchers`.
- PagerDuty was configured with `service_key` while also setting the Events API v2 endpoint. Updated the example to use a PagerDuty `routing_key`, which is the documented key type for Events API v2.
- The Alertmanager test playbook posted alerts to `/api/v1/alerts`, which was removed in Alertmanager 0.27.0. Updated both test requests to `/api/v2/alerts`.
- Route ordering made database and webhook routes unreachable for common severity-labeled alerts. Moved webhook and database routes before the severity routes and set `continue: true` where the post intends additional routing.
- The project structure omitted template files referenced later by the role. Added `alertmanager.service.j2` and `notification.tmpl.j2` to the shown structure.
- The architecture diagram showed all alerts going to email, but the configuration only routes database alerts to email. Updated the diagram label to match the configuration.

## Review Notes
- The Ansible module usage, Prometheus alert rule syntax, Alertmanager receiver types, and `amtool check-config` command are consistent with the consulted official documentation.
- `amtool` was not installed in the local environment, so validation was performed by reviewing the snippets against official documentation rather than executing `amtool check-config`.

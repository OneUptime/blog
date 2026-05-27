# Validation Summary: How to Use Ansible with PagerDuty for Alerting

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Ansible playbooks and task files
- `community.general.pagerduty_alert`
- PagerDuty REST API
- PagerDuty maintenance windows and incident notes
- Ansible `uri`, facts, filters, cron, command, service, template, copy, package, lineinfile, hostname, and error handling
- UFW firewall management with `community.general.ufw`

## Sources Consulted
- Ansible `community.general.pagerduty_alert` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/pagerduty_alert_module.html
- Ansible `community.general.pagerduty` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/pagerduty_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible `strftime` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/strftime_filter.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible error handling documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- PagerDuty REST API OpenAPI schema: https://github.com/PagerDuty/api-schema
- PagerDuty API access key documentation: https://support.pagerduty.com/main/docs/api-access-keys

## Issues Found
- The incident example used `community.general.pagerduty_alert` without the current Events API v2 fields. I updated it to use `integration_key`, `api_version: v2`, and `source`, matching the current Ansible module documentation.
- The incident note example used an Events API incident key directly in the PagerDuty REST notes endpoint. PagerDuty's REST endpoint requires the incident ID, so I added a lookup by `incident_key` and used the returned incident ID for the note URL.
- The PagerDuty REST examples reused a single `pagerduty_api_key` for both Events API and REST API operations. PagerDuty documents separate REST API keys and Events API integration keys, so I changed the examples to use `pagerduty_integration_key` for events and `pagerduty_rest_api_key` for REST calls.
- The PagerDuty REST write examples were missing required `Accept`, `Content-Type`, and `From` headers. I added the required headers where the PagerDuty OpenAPI schema requires them.
- The maintenance window creation task omitted `status_code: 201`, so Ansible's `uri` module would treat a successful PagerDuty create response as a failure. I added the expected status code.
- The maintenance window deletion task omitted `status_code: 204`, so Ansible's `uri` module would treat a successful delete/end response as a failure. I added the expected status code.
- The maintenance window end time formatted a timestamp with a `Z` suffix without forcing UTC. I updated the `strftime` filter call to pass `utc=true`.
- The infrastructure example used `ansible.builtin.timezone`, but the current documented FQCN is `community.general.timezone`. I updated the module name.

## Review Notes
The examples are technically plausible after the fixes, but production playbooks should still account for eventual consistency after triggering a PagerDuty event before immediately looking up the incident by key.

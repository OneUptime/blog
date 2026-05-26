# Validation Summary: How to Audit Ansible Automation Changes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible callback plugins
- Ansible configuration
- AWX REST API
- Filebeat
- jq
- Python datetime
- Ansible playbooks and modules

## Sources Consulted
- Ansible callback plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible local callback loading source in installed ansible 2.21.0
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Elastic Filebeat migration guide: https://www.elastic.co/docs/reference/beats/filebeat/migrate-to-filestream
- Elastic Filebeat filestream input documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-filestream
- AWX REST API filtering documentation: https://docs.ansible.com/projects/awx/en/latest/rest_api/filtering.html
- AWX OpenAPI reference: https://docs.ansible.com/projects/awx/en/latest/open_api/explorer.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- community.general.mail module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/mail_module.html
- jq manual: https://jqlang.org/manual/

## Issues Found
- The callback plugin used `CALLBACK_NEEDS_WHITELIST` and mentioned whitelist-based enabling. Current Ansible documentation and the locally installed Ansible 2.21.0 source use `CALLBACK_NEEDS_ENABLED` with `callbacks_enabled`, so the plugin attribute and documentation text were updated.
- The Python example used `datetime.utcnow()`, which is deprecated as of Python 3.12. It was replaced with `datetime.now(timezone.utc)` through a small helper that keeps the log output in UTC ISO format.
- The Filebeat example used the deprecated `log` input and legacy `json.*` options. Elastic documents `log` as deprecated since 7.16 and disabled by default in 9.0, so the snippet now uses `filestream` with the `ndjson` parser.
- The Slack notification labelled `ansible_play_name` as a playbook. That Ansible variable is the current play name, so the label was corrected to `Play`.

## Review Notes
- The examples are conceptually valid, but the callback is intentionally minimal. A production audit callback should also consider unreachable hosts, skipped tasks, loop item callbacks, secret redaction, and log file permissions/rotation.

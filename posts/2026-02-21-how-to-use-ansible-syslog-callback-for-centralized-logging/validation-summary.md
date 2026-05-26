# Validation Summary: How to Use Ansible Syslog Callback for Centralized Logging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible callback plugins
- community.general.syslog_json
- ansible.cfg
- rsyslog
- Logstash
- Elasticsearch and Kibana
- Python custom Ansible callback plugins
- Linux syslog

## Sources Consulted
- Ansible community.general.syslog_json callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/syslog_json_callback.html
- Ansible callback plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible callback plugin index: https://docs.ansible.com/projects/ansible/latest/collections/index_callback.html
- Ansible developing plugins documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_plugins.html
- community.general syslog_json callback source: https://raw.githubusercontent.com/ansible-collections/community.general/main/plugins/callback/syslog_json.py
- rsyslog omfwd documentation: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html
- rsyslog properties documentation: https://docs.rsyslog.com/doc/configuration/properties.html
- Elastic Logstash syslog input plugin documentation: https://www.elastic.co/guide/en/logstash/current/plugins-inputs-syslog.html
- Elastic Logstash JSON filter documentation: https://www.elastic.co/guide/en/logstash/8.19/plugins-filters-json.html

## Issues Found
- The post said the syslog callback ships with Ansible and that a built-in `syslog_json` callback works in most setups. Updated this to identify `community.general.syslog_json` as a callback from the `community.general` collection, which may be included with the full `ansible` package but is not included in `ansible-core`.
- The post recommended `ansible.posix.syslog` for plain-text syslog. Current official callback indexes do not list that callback, so the invalid configuration and `ansible.posix` installation guidance were removed.
- The post implied the callback writes to the local syslog daemon by default. The documented callback sends to a configured syslog server, defaulting to `localhost:514`, so the configuration now explicitly sets `[callback_syslog_json]` options and the rsyslog example enables a UDP listener.
- The rsyslog examples filtered on `$programname == 'ansible'`, which does not match the documented `community.general.syslog_json` implementation. Updated filters to match the callback message text containing `ansible-command`.
- The JSON examples showed fields such as `ansible_playbook`, `ansible_task`, and `ansible_timestamp` that are not emitted by `community.general.syslog_json`. Replaced them with representative serialized Ansible result payloads.
- The Logstash pipeline parsed the entire syslog `message` as JSON and queried fields that the callback does not emit. Updated the pipeline to extract the JSON result from the callback message, parse it conditionally, and query the actual `ansible_result`, `ansible_host`, and parsed result fields.
- The custom callback used `play.get_variable_manager()`, which is not part of the documented callback API and would fail on the play object. Replaced it with `play.hosts`.
- The custom callback used `datetime.utcnow()`. Updated it to `datetime.now(timezone.utc).isoformat()` for current Python compatibility.
- The custom callback section did not show how to enable a callback marked with `CALLBACK_NEEDS_ENABLED = True`. Added the required `callbacks_enabled = custom_syslog` note.

## Review Notes
The corrected `community.general.syslog_json` workflow is accurate for the current documented callback behavior, but production deployments should also consider TLS or RELP for syslog forwarding when logs cross untrusted networks.

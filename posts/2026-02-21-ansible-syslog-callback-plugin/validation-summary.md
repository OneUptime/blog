# Validation Summary: How to Use the Ansible syslog Callback Plugin

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Ansible callback plugins
- community.general.syslog_json callback
- syslog
- rsyslog
- syslog-ng
- Logstash / Elasticsearch
- Splunk Universal Forwarder
- logrotate

## Sources Consulted
- Ansible community.general.syslog_json callback documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/syslog_json_callback.html
- Ansible Core callback plugin documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible Core configuration settings: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/config.html
- community.general syslog_json callback source: https://raw.githubusercontent.com/ansible-collections/community.general/main/plugins/callback/syslog_json.py
- Python logging.handlers.SysLogHandler documentation: https://docs.python.org/3/library/logging.handlers.html#sysloghandler
- rsyslog imudp documentation: https://docs.rsyslog.com/doc/configuration/modules/imudp.html
- syslog-ng filter documentation: https://syslog-ng.github.io/admin-guide/080_Log/030_Filters/000_Using_filters.html

## Issues Found
- The post referred to `community.general.syslog`, but the documented callback plugin is `community.general.syslog_json`. Updated the title, description, configuration, commands, and examples to use the correct plugin name.
- The post used deprecated Ansible callback enablement keys (`callback_whitelist` and `ANSIBLE_CALLBACK_WHITELIST`). Updated examples to `callbacks_enabled` and `ANSIBLE_CALLBACKS_ENABLED`, and added `bin_ansible_callbacks` / `ANSIBLE_LOAD_CALLBACK_PLUGINS` where the ad hoc `ansible` command is used.
- The configuration section used the wrong callback section and option names. Replaced `[callback_syslog] facility = LOG_USER` with `[callback_syslog_json]` options `syslog_server`, `syslog_port`, `syslog_facility`, and `syslog_setup`.
- The logging behavior and sample output claimed task starts, playbook start/end, and recap messages were logged. The callback source logs task result events, skipped tasks, failures, unreachable hosts, and import events. Updated the claims and sample output accordingly.
- The syslog filters matched `$programname == 'ansible'` or `program("ansible")`, which is not reliable for this callback's emitted message format. Updated rsyslog and syslog-ng examples to match `ansible-command` in the message.
- The Logstash, Splunk, and alert examples matched the old sample text (`task failed`, `task ok`). Updated patterns to match the callback's actual `task execution FAILED/OK` message format and JSON result payload.
- The local rsyslog examples assumed localhost UDP syslog reception without showing the required UDP input. Added `imudp` loading and UDP input configuration.

## Review Notes
The callback sends to a configured syslog server and port using Python's SysLogHandler behavior, with defaults of `localhost` and UDP port `514`. Deployments should confirm that the local or central syslog daemon is actually listening on that port before relying on the callback output.

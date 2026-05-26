# Validation Summary: How to Use the community.zabbix Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy collections
- community.zabbix collection
- Zabbix API
- Zabbix agent and agent 2
- Zabbix host groups, hosts, templates, maintenance windows, user groups, media types, and discovery rules

## Sources Consulted
- Ansible community.zabbix collection index: https://docs.ansible.com/projects/ansible/latest/collections/community/zabbix/index.html
- Ansible community.zabbix HTTP API plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/zabbix/zabbix_httpapi.html
- Ansible community.zabbix zabbix_host module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/zabbix/zabbix_host_module.html
- Ansible community.zabbix zabbix_group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/zabbix/zabbix_group_module.html
- Ansible community.zabbix zabbix_template module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/zabbix/zabbix_template_module.html
- Ansible community.zabbix zabbix_maintenance module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/zabbix/zabbix_maintenance_module.html
- Ansible community.zabbix zabbix_usergroup module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/zabbix/zabbix_usergroup_module.html
- Ansible community.zabbix zabbix_mediatype module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/zabbix/zabbix_mediatype_module.html
- Ansible community.zabbix zabbix_discovery_rule module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/zabbix/zabbix_discovery_rule_module.html
- community.zabbix zabbix_agent role documentation: https://raw.githubusercontent.com/ansible-collections/community.zabbix/main/docs/ZABBIX_AGENT_ROLE.md
- Zabbix maintenance documentation: https://www.zabbix.com/documentation/current/en/manual/maintenance

## Issues Found
- The installation section incorrectly said API modules require the `zabbix-api` Python library, with `zabbix_utils` as an alternative for newer Zabbix versions. Current `community.zabbix` API modules use Ansible's `httpapi` connection plugin, so I replaced those commands with the required Ansible collections: `ansible.netcommon`, plus `ansible.posix` and `community.general` for the agent role.
- The connection example used obsolete per-module variables such as `zabbix_api_server_url`, `zabbix_api_login_user`, and `zabbix_api_login_pass`. I changed it to a dedicated Zabbix API inventory host using `ansible_connection: httpapi`, `ansible_network_os: community.zabbix.zabbix`, and the current authentication variables.
- The API module examples passed removed/unsupported parameters (`server_url`, `login_user`, and `login_password`) directly to modules. I removed those arguments and adjusted the play targets/delegation to use the HTTP API inventory host.
- The agent role example used `zabbix_agent_tlspskvalue`, which is not the current role variable. I changed it to `zabbix_agent_tlspsk_secret` and added `zabbix_agent_tlspskfile`.
- The agent role example showed inline `command` entries under `zabbix_agent_userparameters`, but the role expects user parameter template names and optional script directories. I changed the example to use `name` and `scripts_dir`.
- The module list included `zabbix_screen`, which is not present in the current collection index. I replaced it with `zabbix_map`.
- The maintenance example used the deprecated `minutes` argument. I changed it to `time_periods` with `frequency: once`, `duration`, `start_date`, and `start_time`.
- The user group example used `rights`, which applies to older Zabbix versions. I changed it to `hostgroup_rights`, which matches the current Zabbix 7.0+ examples in the collection documentation.
- The production tip recommended `delegate_to: localhost` for API calls. I updated it to recommend delegating to an inventory host that represents the Zabbix API endpoint.

## Review Notes
- The examples now align with the current `community.zabbix` 4.x documentation. For Zabbix 6.0 and older user group permission examples, the collection documentation still shows `rights`; the post now favors the current Zabbix 7.0+ `hostgroup_rights` form.
- I could not run Ansible syntax validation locally because `ansible-galaxy` / Ansible is not installed in this workspace, so validation was performed against the official collection documentation.

# Validation Summary: How to Use Ansible to Set Up Intrusion Detection (OSSEC)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- OSSEC HIDS
- OSSEC server/agent deployments
- OSSEC `ossec.conf`
- OSSEC agent key management
- OSSEC rules and active response

## Sources Consulted
- OSSEC unattended source installation documentation: https://www.ossec.net/docs/docs/manual/installation/install-source-unattended.html
- OSSEC `manage_agents` documentation: https://ossec-docs.readthedocs.io/en/latest/docs/programs/manage_agents.html
- OSSEC agent management documentation: https://www.ossec.net/docs/docs/manual/agent/agent-management.html
- OSSEC 3.7.0 source release and bundled examples: https://github.com/ossec/ossec-hids/releases/tag/3.7.0
- OSSEC active response configuration documentation: https://www.ossec.net/docs/docs/syntax/head_ossec_config.active-response.html
- OSSEC remote configuration documentation: https://www.ossec.net/docs/docs/syntax/head_ossec_config.remote.html
- OSSEC syscheck documentation: https://ossec-docs.readthedocs.io/en/latest/docs/manual/syscheck/index.html
- OSSEC rules syntax documentation: https://ossec-docs.readthedocs.io/en/latest/docs/syntax/head_rules.html
- OSSEC rules configuration documentation: https://ossec-docs.readthedocs.io/en/pr_314/docs/syntax/head_ossec_config.rules.html
- Ansible `command` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `blockinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/blockinfile_module.html

## Issues Found
- The server configuration template referenced an active response named `host-deny` but did not define the corresponding `<command>` block. Added the required `host-deny` command definition.
- The server configuration template did not include `local_rules.xml`, so the later custom rules example would not be loaded. Added `<include>local_rules.xml</include>`.
- The `<allowed-ips>` option was shown under a secure agent `<remote>` connection, but OSSEC documents it as a syslog sender allowlist. Removed it from the secure agent connection example.
- The agent key extraction task used agent names with `manage_agents -e`, but OSSEC expects an agent ID. Added explicit agent IDs and changed extraction to use those IDs.
- The agent import task piped a key into `manage_agents -i`, but the documented command-line form expects the key as the `-i` argument. Updated the import command accordingly.
- The custom rule IDs used `100001` and above, outside OSSEC's documented `100` to `99999` rule ID range. Changed them to `90001`, `90002`, and `90003`.
- The custom correlation rule used `<if_matched_sid>` and `<same_source_ip />` without `frequency` and `timeframe`, which OSSEC documents as required for that matching style. Added `frequency="4"` and `timeframe="120"`.
- The custom rules destination used `/var/ossec/rules/local_rules.xml`, but the OSSEC 3.7.0 source release installs local rules under `/var/ossec/etc/rules/local_rules.xml`. Updated the path.

## Review Notes
The examples remain source-install oriented and version-specific to OSSEC 3.7.0. OSSEC 4.0.0 is now available, so a future revision could either update the tutorial to 4.x or explicitly state why 3.7.0 is being used.

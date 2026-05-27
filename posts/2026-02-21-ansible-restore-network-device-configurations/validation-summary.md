# Validation Summary: How to Use Ansible to Restore Network Device Configurations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Cisco IOS network automation
- cisco.ios.ios_config
- cisco.ios.ios_command
- ansible.netcommon.net_put
- Cisco IOS configure replace
- Git-based configuration restore workflows

## Sources Consulted
- Ansible cisco.ios.ios_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Ansible cisco.ios.ios_command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- Ansible ansible.netcommon.net_put module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/net_put_module.html
- Ansible network command output and prompt handling guide: https://docs.ansible.com/projects/ansible/latest/network/user_guide/network_working_with_command_output.html
- Ansible regex_search filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/regex_search_filter.html
- Ansible block and rescue documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible task delegation documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Cisco IOS Configuration Fundamentals Command Reference, configure replace command: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/command/cf_command_ref/C_commands.html

## Issues Found
- The first restore section said `ios_config` replaces the entire running configuration and used `replace: config`. The documented `replace` choices are `line` and `block`, and `ios_config` applies supplied configuration lines rather than deleting every omitted line. Changed the explanation and used `replace: block`.
- The `configure replace` task waited for output containing `successfully`, but Cisco's documented example output ends with `Rollback Done`. Updated the `wait_for` condition accordingly.
- The flash cleanup example sent an empty command after `delete`. Updated it to use the documented `ios_command` prompt/answer pattern with `answer: "\r"`.
- The selective OSPF restore could fail when `regex_search` returned `None`. Added `default('', true)` before the later `split` and length check.
- The rollback example wrote to `/tmp/rollback` without creating the directory. Added an `ansible.builtin.file` task delegated to localhost.
- The rollback restore used invalid `replace: config` and incorrectly delegated the network configuration task to localhost. Changed it to `replace: block` and kept the task targeted at the network device.

## Review Notes
The examples are syntactically valid YAML. The `src` parameter remains acceptable for static configuration files; the current Ansible documentation notes that using `src` for Jinja2 template processing is deprecated in favor of rendering templates and passing `content`, but these examples use plain backup files rather than templates.

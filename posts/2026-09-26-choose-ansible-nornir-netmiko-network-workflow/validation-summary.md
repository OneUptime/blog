# Validation Summary: How to Choose Ansible, Nornir, or Netmiko for a Real Network Automation Workflow

## Status

validated

## Post Type

Technical selection guide with Ansible YAML and Python implementation examples.

## Technologies Covered

- Ansible, Cisco IOS resource modules, and network_cli
- Nornir inventory, runners, task results, and connection management
- nornir_netmiko task plugin
- Netmiko and Paramiko SSH host-key verification
- Python and YAML
- Cisco IOS CLI

## Sources Consulted

- Ansible network resource module guide: https://docs.ansible.com/projects/ansible/latest/network/user_guide/network_resource_modules.html
- Cisco IOS interface module reference: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_interfaces_module.html
- Ansible IOS platform settings: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Ansible execution strategies and serial batching: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible interactive CLI command module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/cli_command_module.html
- Nornir inventory tutorial: https://nornir.readthedocs.io/en/latest/tutorial/inventory.html
- Nornir failed-task tutorial: https://nornir.readthedocs.io/en/latest/tutorial/failed_tasks.html
- Nornir result API: https://nornir.readthedocs.io/en/latest/api/nornir/core/task.html
- Nornir core API: https://nornir.readthedocs.io/en/latest/api/nornir/core/__init__.html
- Nornir core implementation: https://raw.githubusercontent.com/nornir-automation/nornir/develop/nornir/core/__init__.py
- Official nornir_netmiko command task implementation: https://raw.githubusercontent.com/ktbyers/nornir_netmiko/develop/nornir_netmiko/tasks/netmiko_send_command.py
- Netmiko project documentation: https://github.com/ktbyers/netmiko
- Netmiko connection API and implementation: https://ktbyers.github.io/netmiko/docs/netmiko/base_connection.html
- Paramiko SSH client and known-hosts loading: https://docs.paramiko.org/en/stable/api/client.html
- Python compound statements, including try/finally and context managers: https://docs.python.org/3/reference/compound_stmts.html
- Author profile link: https://github.com/nawazdhandala

## Issues Found

- The Nornir finally block called `nr.close_connections()` with the default `on_failed=False`. A host whose command failed after connecting could retain its open session because failed hosts are skipped during cleanup. Changed the call to `nr.close_connections(on_failed=True)` so both successful and failed hosts are included. Verified the behavior against the official Nornir core API and implementation.

## Review Notes

- README.md received only the connection-cleanup correction above. The division between desired-state modules, Python fleet orchestration, and CLI connection handling is accurate; the selection recommendations are contextual engineering judgments.
- Parsed both Python examples with Python's AST parser and parsed the YAML example with PyYAML. All syntax checks passed.
- Verified the Ansible interface configuration fields, merged state, and inventory connection settings. serial: 5 batches hosts. The sample demonstrates a configuration task; the acceptance criteria and pilot describe additional workflow work such as preview, post-checks, and repeat-run verification.
- Verified Nornir initialization, inventory filtering, aggregate results, failed-host tracking, explicit error raising, and connection cleanup. The command task forwards read_timeout to Netmiko. Required inventory/configuration files and installed plugins are environmental prerequisites.
- Verified Netmiko's Cisco IOS connection usage, context-manager cleanup, and send_command timeout parameter. ssh_strict=True rejects unknown host keys; system_host_keys=True loads the default SSH known-hosts store through Paramiko. A custom known-hosts path would require the alternate host-key options.
- A returned CLI error message is not necessarily a transport exception. Output validation remains an application responsibility, consistent with the post's denied-command, malformed-response, and completeness checks.
- The examples require reachable devices, appropriate command permissions, credentials, and platform-specific configuration. No live device execution, authentication tests, fleet timing tests, or device idempotency tests were performed.
- The post pins no dependency versions. The consulted Nornir documentation identifies version 3.6.0 and the Ansible interface reference identifies cisco.ios 11.5.1. The APIs used are supported in the consulted documentation; no deprecated API usage was found. Deployment compatibility should still be verified with the exact installed versions, as the post recommends.
- All external links in the post resolve to the intended documentation or author profile. The www.github.com author link redirects to github.com.

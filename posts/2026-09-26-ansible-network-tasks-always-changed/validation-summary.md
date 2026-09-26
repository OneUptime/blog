# Validation Summary: How to Stop Ansible Network Tasks from Reporting Changed on Every Run

## Status
validated

## Post Type
Technical troubleshooting guide with Ansible YAML task examples.

## Technologies Covered
- Ansible task change reporting, failure handling, and handlers
- ansible.netcommon.cli_command and network_cli connections
- cisco.ios.ios_config and cisco.ios.ios_interfaces
- Cisco IOS running and startup configuration
- YAML, configuration comparison, resource states, and controller artifacts

## Sources Consulted
- [Ansible error handling](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html): changed_when, failed_when, handlers, and connection failures.
- [Ansible Network FAQ](https://docs.ansible.com/projects/ansible/latest/network/user_guide/faq.html): abbreviated commands and configuration comparison.
- [ios_config reference](https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html): parameters, canonical syntax, backups, and persistence policies.
- [ios_interfaces reference](https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_interfaces_module.html): interface fields and supported states.
- [cli_command reference](https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/cli_command_module.html): command syntax and response fields.
- [IOS platform options](https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html): connection and privilege prerequisites.
- [Network resource modules](https://docs.ansible.com/projects/ansible/latest/network/user_guide/network_resource_modules.html): merge, replacement, gathering, and convergence checks.
- [Official cli_command implementation](https://raw.githubusercontent.com/ansible-collections/ansible.netcommon/main/plugins/modules/cli_command.py): default change reporting and connection-error handling.
- [Official ios_config implementation](https://raw.githubusercontent.com/ansible-collections/cisco.ios/main/plugins/modules/ios_config.py): task-local save decisions, full configuration saves, and diff handling.
- [Author profile](https://github.com/nawazdhandala): verified the linked author destination.

## Issues Found
- Corrected wording that implied `save_when: changed` saves only the task's own configuration changes. It gates when a save occurs; both `changed` and `modified` copy the entire running configuration, including unrelated unsaved edits. The corrected paragraph matches the official `ios_config` parameter documentation and implementation.

## Review Notes
- No further technical README changes were needed after the persistence-scope correction. All three YAML examples parsed successfully with PyYAML; module names, argument types, and values match the official references. The post contains task fragments, not standalone playbooks or shell command sequences.
- The observation example uses a supported show version command. The current cli_command implementation already initializes changed to false, so changed_when: false is redundant but valid as an explicit reporting contract. It does not suppress connection failures or prove that a command is read-only.
- The text configuration example correctly scopes a full interface name with parents and uses supported line matching and replacement settings. The guidance on canonical syntax, defaults, and unmanaged lines is accurate.
- The structured example uses supported name, description, and enabled fields with state: merged. Gathering and replacement cautions agree with resource-module semantics.
- save_when: changed depends on changes made within that same module invocation. save_when: modified compares running and startup configuration. Both save policies invoke a full running-to-startup copy when triggered.
- The caution about diff_ignore_lines is appropriately qualified: it should not be treated as a universal comparison override. The reviewed ios_config implementation also uses it in the running/startup comparison for save_when: modified, beyond displayed diffs.
- Timestamped artifacts and changing template inputs can legitimately prevent stable output. Creating a backup artifact should not automatically be equated with a device configuration mutation or assumed to determine every module's changed result.
- All four documentation links in the post resolved to the intended official resources; the author profile also resolved. The consulted module documentation identifies cisco.ios 11.5.1 and ansible.netcommon 8.6.2. The post does not pin versions and correctly recommends checking collection/device compatibility. None of the example options is marked deprecated in the consulted references.
- Execution requires installed collections, an appropriate network_cli inventory and platform selection, credentials, sufficient device privileges, and an actual interface matching the example name. No live device execution or Ansible integration run was performed; validation covered documentation, upstream implementation, and YAML syntax. The proposed steady-state, drift, and failure-path tests remain appropriate lab acceptance checks.

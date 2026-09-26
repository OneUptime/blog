# Validation Summary: How to Make cisco.ios.ios_config Idempotent with Match and Replace Modes

## Status
validated

## Post Type
Technical guide with Ansible task examples and a device convergence test procedure.

## Technologies Covered
- Ansible and YAML task configuration
- The cisco.ios collection and cisco.ios.ios_config module
- ansible.netcommon.network_cli and NetworkConfig comparison logic
- Cisco IOS / IOS XE interface configuration, logging, and ACLs
- Configuration idempotency, check mode, diff mode, and persistence

## Sources Consulted
- [Official ios_config module reference](https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html): supported parameters, examples, defaults, and return values.
- [IOS platform connection guide](https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html): network_cli, network OS identifier, and enable mode.
- [Ansible Network FAQ](https://docs.ansible.com/projects/ansible/latest/network/user_guide/faq.html): command normalization and abbreviation-related repeated changes.
- [Official ios_config implementation](https://github.com/ansible-collections/cisco.ios/blob/main/plugins/modules/ios_config.py): comparison, conditional before/after commands, command returns, saving, and check-mode diff limitations.
- [Official IOS cliconf implementation](https://github.com/ansible-collections/cisco.ios/blob/main/plugins/cliconf/ios.py): get_diff delegates matching and replacement expansion to NetworkConfig.
- [Official ansible.netcommon NetworkConfig implementation](https://github.com/ansible-collections/ansible.netcommon/blob/main/plugins/module_utils/network/common/config.py): line, strict, and exact comparison, and hierarchy-based block expansion.
- [Ansible check and diff mode documentation](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html): CLI flags and preview limitations.
- [Ansible changed_when documentation](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html#defining-changed): overriding change reporting does not prevent task execution.
- [Official ios_acls resource module reference](https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_acls_module.html): resource states and ACL replacement caveats.
- [Cisco Catalyst system message logging guide](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960/software/release/12-2_53_se/configuration/guide/2960scg/swlog.html): logging host configuration and explicit destination removal.

## Issues Found
1. **Incorrect block-replacement behavior in the logging example.** The original explanation suggested that a missing destination could cause both independent top-level logging commands to be submitted. The comparison implementation expands affected configuration hierarchies; it does not group every entry in a task's lines list into one block. Clarified the scope of replace: block and corrected the example's explanation: with match: line, one present destination and one missing destination produce only the missing command. Retained the valid YAML and the explanation that an unmanaged third destination remains untouched.
2. **Insufficiently specific check-mode preview guidance.** The original recommendation to use --check --diff was qualified by support availability but did not explain this module's limitation. Clarified that commands or updates provide the proposed command list, while diff_against: running cannot generate a before-and-after running-config diff in check mode. This follows the module's explicit warning and diff-handling branch.

## Review Notes
- Parsed both YAML examples successfully with PyYAML and verified their match and replace values against the module reference. They are task snippets intended for an existing playbook, with inventory and credentials supplied as described.
- Verified the match policies, canonical command requirements, conditional before behavior, default handling, stale running_config warning, save_when behavior, and changed_when explanation against official documentation and implementation.
- Traced the logging example through IOS get_diff and NetworkConfig.difference. A runtime reproduction was attempted but could not run because the local Python environment lacks Ansible; the behavioral finding is based on source inspection.
- No IOS device was available for live application or second-run convergence testing. Interface names, canonical logging output, defaults, and ACL behavior still require validation on the target platform and release, as the post recommends.
- The retrieved module documentation identifies cisco.ios 11.5.1; the post does not pin a collection or IOS release. The referenced latest documentation and main-branch source can change over time. No deprecated option is used by either example.
- Confirmed that the post's Ansible documentation and module-source links resolve to the intended resources. The author profile is attribution, not a technical source.
- Created validation.json with status validated and the requested date, 2026-09-26. Preserved the post's structure and confined README edits to the two technical corrections above.

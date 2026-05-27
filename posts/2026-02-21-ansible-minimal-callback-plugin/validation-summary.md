# Validation Summary: How to Use the Ansible minimal Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible callback plugins
- Ansible configuration (`ansible.cfg`)
- Shell commands and CI scripts
- GitLab CI YAML
- Python callback plugin customization

## Sources Consulted
- Ansible official documentation: `ansible.builtin.minimal` callback - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/minimal_callback.html
- Ansible official documentation: Callback plugins - https://docs.ansible.com/projects/ansible/latest/plugins/callback.html
- Ansible official documentation: Ansible configuration settings (`stdout_callback`, `ANSIBLE_STDOUT_CALLBACK`, `bin_ansible_callbacks`) - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible official documentation: `ansible.builtin.default` callback - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- Ansible official documentation: `ansible.builtin.oneline` callback - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/oneline_callback.html
- Ansible official documentation: `community.general.dense` callback - https://docs.ansible.com/projects/ansible/latest/collections/community/general/dense_callback.html
- Local installed Ansible package source for `ansible.plugins.callback.minimal` and `CallbackBase._dump_results` (`ansible-core` 2.21.0)

## Issues Found
- The description said minimal output reduces logs to "only essential information like failures and changes." The minimal callback prints successful, changed, failed, skipped, and unreachable host results, so the description was changed to "compact per-host results."
- The minimal output examples showed single-line JSON dictionaries. The current minimal callback passes an indentation value when dumping results, so JSON result payloads are displayed as indented blocks by default. The playbook and `ping` output examples were updated to multiline JSON blocks.
- The ad-hoc command section omitted that `ansible` already uses the minimal callback by default. A clarifying sentence was added.
- The post recommended parsing minimal output. Official Ansible documentation notes callback result formats are interspersed with other non-machine-parseable data, so "parse" was changed to "filter."
- The large-inventory section described "result lines" and later "Each line" as a host result. Because minimal JSON output can span multiple lines, this was changed to host results / blocks.
- The verbosity section claimed `-v` includes the full result dictionary and `-vv` includes module arguments. The minimal callback already prints task result data, while invocation and diff details are normally retained at `-vvv` and above. The paragraph was corrected.
- The CI section referred to a `--verbose` flag that "only triggers on failure." Ansible verbosity flags do not work that way; the example reruns the playbook with `-vv` after a failure. The explanation was corrected.
- The compact callback comparison said Ansible includes `dense`. In current documentation, `dense` is provided by the `community.general` collection, not `ansible-core`. The entry was changed to `community.general.dense`.

## Review Notes
The custom callback example is a simplified recap implementation and does not print every field that the built-in default recap prints, such as skipped, rescued, and ignored counts. It is still valid for the narrow example shown, but a production callback should mirror the default callback more completely if full recap parity is desired.

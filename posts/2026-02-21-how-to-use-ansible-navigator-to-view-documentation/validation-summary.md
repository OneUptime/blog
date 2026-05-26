# Validation Summary: How to Use ansible-navigator to View Documentation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-navigator
- ansible-doc
- Ansible Execution Environments
- Ansible collections, modules, plugins, and playbook keywords

## Sources Consulted
- Ansible Navigator documentation: https://docs.ansible.com/projects/navigator/
- Ansible Navigator settings reference: https://docs.ansible.com/projects/navigator/settings/
- Ansible Navigator subcommands reference: https://docs.ansible.com/projects/navigator/subcommands/
- ansible-doc CLI documentation: https://docs.ansible.com/projects/ansible-core/devel/cli/ansible-doc.html
- Ansible community.general.ini_file module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ini_file_module.html
- Local `ansible-doc --help` / `ansible-doc -t keyword --list` behavior from ansible-core 2.21.0 where available.
- ansible-navigator 26.4.0 package source downloaded from PyPI to verify stdout pass-through behavior for `doc --list`.

## Issues Found
- `community.general.json_query` was shown as a community module, but it is a filter plugin, so the default module lookup would not match the example description. Replaced it with `community.general.ini_file`, which is documented as a community.general module.
- `ansible-navigator doc --list` was described as an interactive module browser. The navigator implementation forces stdout mode for ansible-doc list/snippet/metadata options, so the post now describes `doc --list --mode stdout` as a stdout listing and directs readers to open a selected module with `ansible-navigator doc`.
- The interactive documentation browser section used `ansible-navigator doc --list`, which does not open an interactive module-selection browser. Replaced it with `ansible-navigator doc ansible.builtin.copy`.
- The helper script examples used `community.general.json_query` even though the script assumes module documentation. Replaced those examples with `community.general.ini_file`.
- The `ansible-navigator exec` example placed `--mode stdout` after the command passed to `ansible-galaxy`, where it would be interpreted by `ansible-galaxy` rather than ansible-navigator. Moved `--mode stdout` before the `--` separator.

## Review Notes
Most remaining examples are version-dependent on the collections installed in the selected Execution Environment. The post correctly frames this as EE-specific documentation, but readers still need the referenced collections present in their EE for non-builtin examples such as `amazon.aws`, `community.docker`, `ansible.posix`, and `community.general`.

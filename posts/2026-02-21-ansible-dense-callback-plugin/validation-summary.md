# Validation Summary: How to Use the Ansible dense Callback Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible callback plugins
- `community.general.dense` stdout callback
- Ansible callback configuration
- `ansible-playbook`
- `community.docker.docker_image`
- `community.docker.docker_container`
- `ansible.builtin.uri`

## Sources Consulted
- Ansible Community Documentation: `community.general.dense` callback, https://docs.ansible.com/projects/ansible/latest/collections/community/general/dense_callback.html
- Ansible Core Documentation: Callback plugins, https://docs.ansible.com/projects/ansible-core/devel/plugins/callback.html
- Ansible Community Documentation: Configuration setting `DEFAULT_STDOUT_CALLBACK` / `ANSIBLE_STDOUT_CALLBACK`, https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: `ansible.builtin.minimal` callback, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/minimal_callback.html
- Ansible Community Documentation: `ansible.builtin.oneline` callback, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/oneline_callback.html
- Ansible Community Documentation: `community.docker.docker_image` module, https://docs.ansible.com/ansible/latest/collections/community/docker/docker_image_module.html
- Ansible Community Documentation: `community.docker.docker_container` module, https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html
- Ansible Community Documentation: `ansible.builtin.uri` module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Upstream `community.general.dense` callback source, https://raw.githubusercontent.com/ansible-collections/community.general/main/plugins/callback/dense.py

## Issues Found
- The post described `dense` as printing one aggregate count line per task, such as `ok=4 changed=1 unreachable=0 failed=0`. The actual callback rewrites a live task line with host names color-coded by result state. Updated all dense output examples and related explanations.
- The post implied the callback is available as a built-in callback. Current documentation places it in the `community.general` collection and recommends using `community.general.dense`. Added the collection installation command and updated `stdout_callback` / `ANSIBLE_STDOUT_CALLBACK` examples to use the FQCN.
- The post claimed dense prints the standard `PLAY RECAP` in normal mode. The callback source returns before printing stats at normal verbosity. Updated the recap description to note that normal dense output omits the standard recap and verbosity is needed for summary-style output.
- The post stated that `-v` shows individual failed and changed task results while ok hosts remain aggregated, and omitted the higher-verbosity fallback behavior. Updated the section to explain that `-v` adds details for non-`ok` results and `-vv` and higher fall back to default callback behavior.
- The configuration snippet used a `[callback_dense]` section for `display_skipped_hosts` and `display_ok_hosts`. The documented configuration entries are under `[defaults]`. Updated the snippet and explanation.
- The practical playbook used short Docker module names. Updated them to current documented FQCNs: `community.docker.docker_image`, `community.docker.docker_container`, and `ansible.builtin.uri`.
- The comparison with minimal and oneline callbacks overstated dense as an aggregate-count callback and claimed it was the only compact callback showing task names alongside results. Updated the comparison to match documented callback behavior.

## Review Notes
The local environment does not have `ansible` or `ansible-doc` installed, so CLI help output could not be checked locally. Validation was performed against official Ansible documentation and the upstream callback source.

# Validation Summary: How to Use Ansible to Deploy Applications from Git with Tags

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Ansible playbooks
- ansible.builtin.git
- ansible.builtin.pip
- ansible.builtin.systemd_service
- ansible.builtin.uri
- ansible.builtin.pause
- ansible.builtin.lineinfile
- Git tags
- Deployment rollbacks and canary deployments

## Sources Consulted
- Ansible `ansible.builtin.git` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible `ansible.builtin.pip` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/pip_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible blocks and error handling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.pause` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/pause_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html

## Issues Found
- Git tags were described as immutable. Git tags can be moved or deleted unless protected by repository policy, so the text now says deployments are reproducible when tags are treated as protected release artifacts.
- The version validation regex was not anchored at the end, so values like `v1.2.3-extra` could pass despite the message saying the format must be `v0.0.0`. Added the `$` end anchor.
- The migration and static asset shell tasks used Bash-specific `source`, while Ansible shell commands use the remote shell by default. Added `args: executable: /bin/bash` to those tasks.
- The examples used `ansible.builtin.systemd`; official documentation now names the module `ansible.builtin.systemd_service`, with `systemd` kept as a backward-compatible alias. Updated the examples to the current FQCN.
- The health-check retry examples had `retries` and `delay` but no explicit `until` condition. Added registered results and `until` checks matching the official `uri` retry pattern.
- The canary validation pause had `minutes: 5` while the prompt instructed the operator to press Enter. Removed `minutes` so the prompt behaves as an interactive approval gate.

## Review Notes
The examples remain illustrative and assume the target hosts already have required runtime prerequisites such as Git, Python, pip, virtualenv support, and systemd where those modules are used. I could not run `ansible-playbook --syntax-check` because Ansible is not installed in this workspace.

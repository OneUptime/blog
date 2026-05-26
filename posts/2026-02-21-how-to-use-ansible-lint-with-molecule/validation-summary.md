# Validation Summary: How to Use ansible-lint with Molecule

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible-lint
- Molecule
- Molecule Docker driver / molecule-plugins
- GitHub Actions
- YAML

## Sources Consulted
- Molecule Command Line Reference: https://docs.ansible.com/projects/molecule/usage/
- Molecule Workflow Reference: https://docs.ansible.com/projects/molecule/workflow/
- Molecule Configuration Reference: https://docs.ansible.com/projects/molecule/configuration/
- ansible-lint Configuration Documentation: https://docs.ansible.com/projects/lint/configuring/
- ansible-lint Usage Documentation: https://docs.ansible.com/projects/lint/usage/
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.service_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- PyPI `molecule-plugins` project page: https://pypi.org/project/molecule-plugins/
- Local CLI check with Molecule 26.4.0 and ansible-lint 26.4.0 installed into `/tmp/molecule-review-pkg`.

## Issues Found
- The post claimed that current Molecule has built-in ansible-lint integration and runs a `lint` step by default. Current Molecule documentation and CLI output do not list a `lint` action, and `molecule test` runs `dependency, cleanup, destroy, syntax, create, prepare, converge, idempotence, side_effect, verify, cleanup, destroy`. Updated the post to run ansible-lint separately before `molecule test`.
- The post used the removed `molecule lint` command in several examples. Replaced those examples with direct `ansible-lint` commands.
- The post showed the old `provisioner.lint` Molecule configuration. Replaced it with current Molecule configuration guidance and noted that ansible-lint is configured separately via `.ansible-lint`.
- The setup command used `molecule init role`, but current Molecule 26.4.0 exposes `molecule init scenario`; role creation should be done with `ansible-galaxy role init`. Updated the setup commands accordingly.
- The Docker driver example installed only `molecule` and `ansible-lint`, but the Docker driver requires its plugin package. Added `molecule-plugins[docker]` to the install command.
- The post said excluding `molecule/` from ansible-lint would still allow Molecule to lint those files independently. Since current Molecule does not run ansible-lint, updated the explanation to say excluded scenario files are not linted in that run.
- The verify playbook used `ansible.builtin.systemd` without `state` or `enabled`, which is invalid for the current module contract. Replaced it with `ansible.builtin.service_facts` plus assertions using bracket notation for `ansible_facts.services`.
- The pinned example versions were outdated. Updated the pins to ansible-lint 26.4.0, Molecule 26.4.0, molecule-plugins 25.8.12, and yamllint 1.38.0.

## Review Notes
The post is now accurate for current Molecule and ansible-lint behavior. Older Molecule releases had different lint integration patterns, so readers maintaining legacy roles may still encounter historical examples that use `molecule lint` or `provisioner.lint`.

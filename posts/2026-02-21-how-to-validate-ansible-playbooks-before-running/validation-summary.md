# Validation Summary: How to Validate Ansible Playbooks Before Running

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- ansible-playbook CLI
- Ansible check mode and diff mode
- ansible-lint
- Molecule
- GitHub Actions CI
- YAML

## Sources Consulted
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible special variables documentation: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/special_variables.html
- ansible-lint usage documentation: https://ansible.readthedocs.io/projects/lint/usage/
- ansible-lint configuration documentation: https://ansible.readthedocs.io/projects/lint/configuring/
- ansible-lint rules documentation: https://ansible.readthedocs.io/projects/lint/rules/
- ansible-lint `latest` rule documentation: https://ansible.readthedocs.io/projects/lint/rules/latest/
- ansible-lint `no-changed-when` rule documentation: https://ansible.readthedocs.io/projects/lint/rules/no-changed-when/
- Molecule installation documentation: https://docs.ansible.com/projects/molecule/installation/
- Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Molecule configuration documentation: https://docs.ansible.com/projects/molecule/configuration/
- Molecule Docker example documentation: https://docs.ansible.com/projects/molecule/examples/docker/

## Issues Found
- The Molecule installation command used the older standalone `molecule-docker` package. Current Molecule documentation recommends installing `ansible-dev-tools` or `molecule ansible-core`, with drivers and dependencies handled through current Molecule and Ansible tooling. Updated the local and CI install examples to use `pip install ansible-dev-tools`.
- The Molecule `molecule.yml` example listed `verify: verify.yml` under `provisioner.playbooks`. Current Molecule documentation describes user-supplied provisioner playbooks such as `create`, `destroy`, `converge`, `prepare`, `side_effect`, and `cleanup`, while the `verify` action runs tests configured by the `verifier` section. Removed the unsupported `verify` playbook entry.
- The ansible-lint example output described `no-changed-when` as needing a "when clause". The rule is about declaring change behavior with `changed_when`, `creates`, or `removes`. Updated the example output to reference `changed_when`.
- Several Ansible snippets used short module names and `yes`/`no` booleans. These still work in Ansible, but they conflict with current ansible-lint expectations such as FQCN usage and YAML truthy checks. Updated snippets to use `ansible.builtin.*` module names and `true`/`false` booleans.

## Review Notes
The check mode section is technically correct, but real check-mode behavior varies by module and by task dependencies. The Molecule examples remain representative, but current Molecule documentation also emphasizes ansible-native configurations; the post's pre-ansible-native Docker-style scenario is still documented.

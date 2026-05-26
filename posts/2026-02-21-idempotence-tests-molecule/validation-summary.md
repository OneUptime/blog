# Validation Summary: How to Write Idempotence Tests in Molecule

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Molecule
- YAML
- Ansible roles, handlers, modules, and lookups
- Molecule scenarios and idempotence testing

## Sources Consulted
- Molecule workflow reference: https://docs.ansible.com/projects/molecule/workflow/
- Molecule FAQ: https://docs.ansible.com/projects/molecule/faq/
- Molecule configuration reference: https://docs.ansible.com/projects/molecule/configuration/
- Molecule command line reference: https://docs.ansible.com/projects/molecule/usage/
- Ansible Lint no-changed-when rule: https://docs.ansible.com/projects/lint/rules/no-changed-when/
- ansible.builtin.command module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.copy module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.template module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- ansible.builtin.service module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- ansible.builtin.apt module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.stat module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- ansible.builtin.password lookup: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/password_lookup.html
- Ansible handlers guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html

## Issues Found
- The post said command and shell modules always report changed. I changed this to "usually" and clarified that they report changed unless change detection is provided, because Ansible supports `changed_when`, `creates`, and `removes`.
- The custom idempotence verification example did not actually compare before and after state, and it wrote a checksum file during verification. I replaced it with a checksum-before, rerun-role, checksum-after, assert workflow using `ansible.builtin.stat`.
- The idempotence exclusion example used `notest`, which Molecule skips more broadly. I changed it to `molecule-idempotence-notest`, which Molecule documents as the idempotence-action-only skip tag.
- The complete role example notified `reload nginx` but did not define the handler. I added a minimal `handlers/main.yml` example so the role example is complete enough to run.

## Review Notes
The examples are generally accurate for current Molecule and ansible-core documentation. Molecule was not installed in the local environment, so CLI behavior was verified against official Molecule documentation rather than local `--help` output.

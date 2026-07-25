# Validation Summary: Testing Ansible Roles with Check Mode, ansible-lint, and Molecule

## Status

validated

## Post Type

Technical guide / tutorial

## Technologies Covered

- Ansible Core
- Ansible roles and role argument specifications
- Ansible check mode and diff mode
- ansible-lint
- Molecule
- YAML and INI configuration
- Continuous integration

## Sources Consulted

- [Ansible: Validating tasks with check and diff mode](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html)
- [Ansible: `ansible.builtin.command` module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html)
- [Ansible Core: Roles and role argument validation](https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_reuse_roles.html)
- [Ansible: Galaxy user guide](https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html)
- [ansible-lint: Installation](https://docs.ansible.com/projects/lint/installing/)
- [ansible-lint: Usage](https://docs.ansible.com/projects/lint/usage/)
- [ansible-lint: Configuration](https://docs.ansible.com/projects/lint/configuring/)
- [ansible-lint: Profiles](https://docs.ansible.com/projects/lint/profiles/)
- [ansible-lint: `syntax-check` rule](https://docs.ansible.com/projects/lint/rules/syntax-check/)
- [Molecule: Installation](https://docs.ansible.com/projects/molecule/installation/)
- [Molecule: Ansible-native configuration](https://docs.ansible.com/projects/molecule/ansible-native/)
- [Molecule: Workflow reference](https://docs.ansible.com/projects/molecule/workflow/)
- [Molecule: Command-line reference](https://docs.ansible.com/projects/molecule/usage/)
- [Molecule: FAQ](https://docs.ansible.com/projects/molecule/faq/)
- [RFC 5737: IPv4 address blocks reserved for documentation](https://www.rfc-editor.org/rfc/rfc5737.html)

## Issues Found

- The static test harness referenced `myapp` from `tests/test.yml`, but the shown `roles/myapp` layout was not on Ansible's default role search path. Added a minimal project-level `ansible.cfg` with `roles_path = roles` so the documented syntax-check and check-mode commands can resolve the role.
- The example described as explicitly modeling a check-mode prediction used `when: not ansible_check_mode`, so the command was skipped and reported no predicted change. Replaced it with the `command` module's supported `creates` pattern, which checks the marker and reports the predicted changed status without executing the command.
- The standalone-role path guidance was ambiguous for the current Ansible-native Molecule schema. Clarified that the generated `ansible.cfg` setting belongs under `ansible.cfg.defaults` in `molecule.yml`, while retaining the documented Molecule 6+ guidance to avoid old Molecule-specific path options.

## Review Notes

- The corrected examples were checked with Ansible Core 2.21.2, ansible-lint 26.6.0, and Molecule 26.6.0. A representative fixture passed Ansible syntax checks and the ansible-lint `production` profile. The invalid-input `block`/`rescue` example was also executed successfully.
- A full converge was not run because the post intentionally uses an example application, filesystem paths, health endpoint, and pre-created target rather than a supplied runnable role and disposable host.
- `192.0.2.50` is in the RFC 5737 TEST-NET-1 documentation range. Readers must replace it with the address of an actual disposable target.
- In Molecule 26.6.0, `molecule matrix test` shows the ordered actions but labels automatic `syntax` and `idempotence` actions as missing playbooks because neither has a dedicated playbook. Direct execution still uses the converge playbook as documented.

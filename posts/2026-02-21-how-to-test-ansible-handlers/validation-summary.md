# Validation Summary: How to Test Ansible Handlers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible handlers
- Ansible check mode
- Ansible `meta: flush_handlers`
- Ansible `listen` handler topics
- Molecule
- ansible-lint
- GitHub Actions

## Sources Consulted
- Ansible handler documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible check mode documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible `meta` module documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/meta_module.html
- Ansible `changed` test documentation: https://docs.ansible.com/projects/ansible-core/2.15/collections/ansible/builtin/changed_test.html
- Ansible `service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `file` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- Molecule configuration documentation: https://ansible.readthedocs.io/projects/molecule/configuration/
- ansible-lint usage documentation: https://docs.ansible.com/projects/lint/usage/

## Issues Found
- The check mode section said check mode does not actually execute tasks. Updated it to clarify that check mode makes no remote changes, while supported modules still run in simulation and report predicted changes.
- The handler wiring assertion used `config_result.changed or config_result is not changed`, which did not meaningfully validate the expected result. Replaced it with checks that the registered result exists and is reported as changed.
- The `flush_handlers` section implied a handler could be tested without relying on notification. Updated it to state that `meta: flush_handlers` runs handlers that have already been notified.
- The idempotency section described handlers as generally idempotent, but Ansible's `service` module documents `state: restarted` as always bouncing the service. Updated the section to focus on avoiding unexpected second-run notifications.

## Review Notes
The examples are illustrative and assume a test host or Molecule image where `nginx`, `webapp`, and system service management are available. In real CI, the Molecule image may need additional setup for systemd and package installation depending on the role implementation.

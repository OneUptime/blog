# Validation Summary: How to Use Ansible to Manage Multiple Services in a Loop

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible loops and loop control
- ansible.builtin.systemd_service
- ansible.builtin.service_facts
- ansible.builtin.apt
- ansible.builtin.template
- ansible.builtin.include_tasks
- Ansible async and async_status

## Sources Consulted
- Ansible `systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible loops documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible `service_facts` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible asynchronous actions and polling documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_async.html
- Ansible `apt` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html

## Issues Found
- Updated examples from `ansible.builtin.systemd` to `ansible.builtin.systemd_service`. The official documentation says `ansible.builtin.systemd` has been renamed to `ansible.builtin.systemd_service`, with `systemd` kept as a backward-compatible alias.
- Tightened `service_facts` checks for unwanted services and status reporting. The official documentation notes that systemd may know about units that were never installed and recommends checking that `status` is not `not-found`, rather than relying only on key existence.
- Updated the async polling example from `until: job_results.finished` to `until: job_results is finished`, matching the documented Ansible async polling pattern.

## Review Notes
Ansible was not installed in the local environment, so I could not run `ansible-playbook --syntax-check`. The snippets were reviewed against the current official Ansible documentation.

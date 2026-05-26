# Validation Summary: How to Use Ansible loop to Manage Multiple Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible `loop`
- `ansible.builtin.service`
- `ansible.builtin.service_facts`
- `ansible.builtin.template`
- Linux service management with systemd and other init systems

## Sources Consulted
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `ansible.builtin.service_facts` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_facts_module.html
- Ansible playbook loops documentation: https://docs.ansible.com/projects/ansible/8/playbook_guide/playbooks_loops.html
- Ansible conditionals with loops documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible `default` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_filter.html

## Issues Found
- The post said each service loop iteration calls `systemctl start <service>`. The `ansible.builtin.service` module is a proxy to the detected service manager and may use systemd, SysV, OpenRC, SMF, upstart, or another supported manager. Updated the wording to say it asks the detected service manager to start the service, with `systemctl` as the systemd example.
- The configuration restart section said to combine `loop` with handlers, but the example uses a registered loop result and a conditional restart task rather than an Ansible handler. Updated the wording to match the code.
- The group-based management example used `loop: "{{ managed_services }}"` with `when: managed_services is defined`. Ansible evaluates the loop input before applying `when` per item, so hosts without `managed_services` could fail. Changed the loop to `{{ managed_services | default([]) }}`.
- The `service_facts` examples treated the presence of a service key as proof that a service exists. Ansible's official examples note that systemd can report units with `status: not-found`. Updated the status checks to treat `status: not-found` as missing.

## Review Notes
Ansible was not installed in the local workspace, so `ansible-playbook --syntax-check` could not be run. The YAML snippets were parsed locally with PyYAML, and the Ansible behavior was checked against official documentation.

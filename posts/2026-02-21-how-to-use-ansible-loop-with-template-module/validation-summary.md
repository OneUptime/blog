# Validation Summary: How to Use Ansible loop with Template Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- ansible.builtin.template
- ansible.builtin.file
- ansible.builtin.service
- ansible.builtin.systemd_service
- Jinja2 templates
- Nginx configuration validation
- systemd unit files

## Sources Consulted
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible loops documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Nginx command-line parameters documentation: https://nginx.org/en/docs/switches.html
- systemd service unit documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd execution environment documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html

## Issues Found
- The `deploy-apps.yml` example notified `Reload systemd` but did not define that handler. I added a `handlers` block using `ansible.builtin.systemd_service` with `daemon_reload: true`, which is the appropriate Ansible module action after installing or updating systemd unit files.

## Review Notes
The remaining examples use current Ansible loop syntax, fully qualified Ansible builtin module names, valid `register` result access for looped tasks, valid `loop_control.loop_var` usage, and a valid Nginx validation command pattern with `%s` for the temporary rendered file. I could not run `ansible-playbook --syntax-check` locally because Ansible is not installed in this environment.

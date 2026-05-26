# Validation Summary: How to Use Ansible Facts to Get OS Information

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible facts and fact gathering
- Ansible playbooks
- Ansible package management modules
- Jinja2 templates in Ansible
- Linux operating system facts
- OpenSSH service management

## Sources Consulted
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- ansible.builtin.setup module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/setup_module.html
- ansible.builtin.package module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- ansible.builtin.group_by module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_by_module.html
- ansible.builtin.version test documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/version_test.html
- Ubuntu OpenSSH server documentation: https://documentation.ubuntu.com/server/how-to/security/openssh-server/

## Issues Found
- The RHEL row in the common fact values table listed `dnf` without a version qualifier. Changed the label to `RHEL 8/9` because older RHEL releases use `yum`, while the example table value applies to current RHEL major versions.
- The package module example comment said the module uses only the `pkg_mgr` fact. Updated it to say it uses facts or auto-detection, matching the current `ansible.builtin.package` documentation.
- The SSH configuration example hard-coded the service name `sshd`, which fails on Debian-family systems such as Ubuntu where the packaged OpenSSH service is `ssh.service`. Added an `ssh_service_name` fact based on `os_family` and used it in the handler.
- The template example used `ansible_date_time.iso8601`, which depends on top-level fact injection being enabled. Changed it to `ansible_facts['date_time']['iso8601']` to match the article's `ansible_facts` access pattern and work when top-level fact injection is disabled.

## Review Notes
Could not run `ansible-playbook --syntax-check` because Ansible is not installed in the workspace. The snippets were reviewed statically against official Ansible and Ubuntu documentation.

# Validation Summary: How to Use Ansible to Validate Terraform Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules
- community.general Ansible collection
- Terraform state
- PostgreSQL command-line validation
- Ubuntu/OpenSSH service management

## Sources Consulted
- Ansible playbook keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible inventory guide: https://docs.ansible.com/ansible/latest/user_guide/intro_inventory.html
- ansible-playbook CLI reference: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html
- ansible.builtin.ping module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- ansible.builtin.assert module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- ansible.builtin.wait_for module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- ansible.builtin.uri module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.command module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.hostname module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- ansible.builtin.cron module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- community.general.timezone module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ubuntu OpenSSH server documentation: https://documentation.ubuntu.com/server/how-to/security/openssh-server/
- Terraform state purpose: https://docs.hashicorp.com/terraform/language/state/purpose

## Issues Found
- The infrastructure provisioning workflow used `ansible.builtin.timezone`, but current Ansible documentation lists the timezone module as `community.general.timezone`. Updated the task to use `community.general.timezone`.
- The SSH restart handler used service name `sshd`. The post validates Ubuntu 22.04, and Ubuntu's OpenSSH documentation uses `ssh.service`. Updated the handler to restart `ssh`.

## Review Notes
- The main validation playbook examples use short module names such as `ping`, `wait_for`, `uri`, `assert`, and `command`. These remain valid for built-in modules, though Ansible documentation recommends FQCNs for clarity and avoiding name conflicts.
- The PostgreSQL validation commands assume local `psql` access as the `postgres` database user is configured for the Ansible remote user. In production, inventories commonly need `become_user`, connection variables, or credentials for this check.

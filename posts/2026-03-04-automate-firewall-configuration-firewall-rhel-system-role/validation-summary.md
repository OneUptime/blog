# Validation Summary: How to Automate Firewall Configuration Using the firewall RHEL System Role

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- firewalld
- Ansible
- YAML

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring firewalld by using RHEL system roles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/assembly_configuring-firewalld-using-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation: Introduction to RHEL system roles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/intro-to-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Enterprise Linux 9 documentation: Installing RHEL system roles collection, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automating_system_administration_by_using_rhel_system_roles/index
- Ansible documentation: Roles, https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible documentation: Building an inventory, https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html

## Issues Found
- The playbook included the firewall role without any `firewall` variables, so it did not actually configure a firewalld zone or rule. Updated the example to enable the `https` service with `runtime: true` and `permanent: true`, matching Red Hat's documented variable structure.
- The role invocation used the traditional `rhel-system-roles.firewall` role name. Updated it to the current collection FQCN, `redhat.rhel_system_roles.firewall`, using `ansible.builtin.include_role`, as shown in current Red Hat documentation.
- The installation path stated that roles are installed to `/usr/share/ansible/roles/`. Updated it to the current collection path used by the `rhel-system-roles` package on current RHEL releases.
- The documentation lookup command pointed to `/usr/share/doc/rhel-system-roles/firewall/README.md`, but current collection role documentation is available under the collection role directory. Updated the `cat` command to use `/usr/share/ansible/collections/ansible_collections/redhat/rhel_system_roles/roles/firewall/README.md`.
- The verification commands used placeholders for an unspecified service and config file. Replaced them with firewalld-specific checks using `systemctl status firewalld` and `firewall-cmd --list-services`.

## Review Notes
The tutorial now demonstrates one concrete firewall change. For a production guide, future improvements could include verifying the exact zone being changed and using `ansible-playbook --syntax-check` before applying the playbook.

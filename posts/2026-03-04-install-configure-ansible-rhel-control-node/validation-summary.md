# Validation Summary: How to Install and Configure Ansible on RHEL as a Control Node

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible Core
- Red Hat Ansible Automation Platform repositories
- SSH key authentication
- Ansible inventory and configuration files
- Ansible ad-hoc commands

## Sources Consulted
- Red Hat Enterprise Linux for SAP Solutions 9 documentation, "Installing Ansible Core": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html-single/installing_rhel_9_for_sap_solutions/installing_rhel_9_for_sap_solutions
- Red Hat Ansible Automation Platform 2.5 RPM installation documentation, repository selection and subscription-manager usage: https://docs.redhat.com/en/documentation/red_hat_ansible_automation_platform/2.5/html-single/rpm_installation/index
- Ansible configuration settings reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible inventory guide: https://docs.ansible.com/projects/ansible/8/inventory_guide/intro_inventory.html
- Ansible `ansible.builtin.ping` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- Ansible CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible.html
- OpenSSH `ssh-keygen` and `ssh-copy-id` local help output.

## Issues Found
- The installation section presented the Ansible Automation Platform 2.4 repository as the first/default installation path. Red Hat documents `ansible-core` as available from the RHEL 9 AppStream repository, while Automation Platform repositories are subscription-, version-, RHEL-, and architecture-specific. I changed AppStream installation to the primary path and updated the Automation Platform example to use the documented 2.5 repository naming pattern.
- The SSH key example generated an Ed25519 key at `~/.ssh/id_rsa`, which is technically possible but misleading and inconsistent with normal OpenSSH naming. I changed the generated key and Ansible inventory path to `~/.ssh/id_ed25519`.
- The `ssh-copy-id` examples did not specify which public key to copy, so they might copy a different default key than the one generated in the tutorial. I added `-i ~/.ssh/id_ed25519.pub` to each `ssh-copy-id` command.

## Review Notes
- The `host_key_checking = False` setting is valid Ansible configuration, but disabling host key checking is not ideal for production environments.
- The `ansible all -m ping` example is correct: Ansible documents the short `ping` module name as usable because `ansible.builtin.ping` is included in `ansible-core`.

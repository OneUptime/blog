# Validation Summary: How to Join RHEL Systems to Active Directory Using Ansible System Roles

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible
- Ansible Vault
- Active Directory
- SSSD
- realmd
- Kerberos

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Joining RHEL systems to an Active Directory by using RHEL system roles - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/using_ansible_to_install_and_manage_identity_management/integrating-rhel-systems-into-ad-directly-with-ansible-using-rhel-system-roles_using-ansible-to-install-and-manage-idm
- Red Hat Enterprise Linux 10 documentation: System roles that provide identity management features - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/using_ansible_to_install_and_manage_identity_management_in_rhel/system-roles-that-provide-identity-management-features
- Ansible documentation: Using encrypted variables and files - https://docs.ansible.com/ansible/latest/vault_guide/vault_using_encrypted_content.html
- Ansible core CLI documentation: ansible-vault - https://ansible.readthedocs.io/projects/ansible-core/stable-2.15/cli/ansible-vault.html

## Issues Found
- The playbook used `rhel-system-roles.ad_integration` in the `roles` list. Red Hat's current examples use the collection-qualified role name `redhat.rhel_system_roles.ad_integration`, so the playbook was updated to use the documented role name.
- The inline comment above `ad_integration_manage_dns: false` said "Allow specific AD groups to log in", but that variable controls whether the role manages DNS configuration. The comment was corrected to say that existing DNS configuration is left unchanged.
- The Ansible Vault example created `vars/ad_secrets.yml` but did not load that file when running the playbook, so `ad_join_password` would remain undefined. The command was updated to pass the encrypted variables file with `-e @vars/ad_secrets.yml` and to include `--ask-become-pass`, matching the earlier privilege escalation example.
- The non-Vault example described a command-line extra variable as secure and vault-encrypted. The surrounding sentence and comment were corrected to state that the password is passed as an extra variable for quick testing.

## Review Notes
The tutorial is technically relevant and aligns with Red Hat's documented `ad_integration` role workflow after the fixes. Ansible was not installed in the local review environment, so command syntax was checked against official documentation rather than executed locally.

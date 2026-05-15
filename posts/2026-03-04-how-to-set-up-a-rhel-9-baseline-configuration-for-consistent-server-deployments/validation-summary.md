# Validation Summary: How to Set Up a RHEL 9 Baseline Configuration for Consistent Server Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Kickstart
- Ansible
- chrony
- OpenSSH server configuration
- firewalld
- AIDE
- OpenSCAP / SCAP Security Guide
- Red Hat Insights and subscription-manager
- System-wide cryptographic policies

## Sources Consulted
- Red Hat RHEL 9 Automatically installing RHEL, Kickstart commands and options reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/automatically_installing_rhel/index
- Red Hat RHEL 9 Security hardening, OpenSCAP compliance scanning: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat RHEL 9 Security hardening, system-wide cryptographic policies: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Ansible builtin collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/index.html
- Ansible ansible.builtin.template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible ansible.builtin.include_tasks module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_tasks_module.html
- Ansible handlers documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html

## Issues Found
- The Kickstart snippet used `rootpw --lock` without the required password argument. Red Hat's RHEL 9 Kickstart reference defines `rootpw [--iscrypted|--plaintext] [--lock] password`, so I added an encrypted placeholder hash while keeping the root account locked.
- The Kickstart snippet created `sysadmin` with `--lock` and then disabled SSH password authentication, leaving no usable administrative login path in the shown baseline. I changed the user to use an encrypted placeholder password hash and added a Kickstart `sshkey` line for key-based SSH access.

## Review Notes
- The OpenSCAP command uses the documented RHEL 9 data stream path and CIS profile ID. The `scap-security-guide` package must be installed on the target system for that path to exist.
- The Kickstart template still assumes the deployment environment supplies an installation source, such as a boot-time `inst.repo` value or an added `cdrom`, `url`, `nfs`, `harddrive`, `rhsm`, or other valid Kickstart source command.

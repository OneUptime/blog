# Validation Summary: How to Manage SSH Configuration with RHEL System Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- RHEL System Roles
- Ansible
- OpenSSH server (`sshd`)
- OpenSSH client (`ssh`)
- YAML playbooks

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: Configuring the OpenSSH server and client by using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/automating_system_administration_by_using_rhel_system_roles/index
- Red Hat Enterprise Linux 9 documentation: Configuring the OpenSSH server and client by using RHEL system roles: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-secure-communication-by-using-the-ssh-and-sshd-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- Red Hat Ecosystem Catalog: Red Hat Enterprise Linux System Roles collection: https://catalog.redhat.com/en/software/collection/redhat/rhel_system_roles
- Upstream `sshd` role README: https://github.com/willshersystems/ansible-sshd
- Upstream `ssh` role README: https://github.com/linux-system-roles/ssh

## Issues Found
- The server examples used the older `sshd` variable. The upstream role README states that this previous name is deprecated and current Red Hat documentation uses `sshd_config`. Updated the server playbooks to use `sshd_config`.
- The Match block example used a separate `sshd_match` variable with lowercase `condition` keys. Current Red Hat examples document `Match` entries inside `sshd_config` with `Condition` keys. Updated the example accordingly.
- The client host-specific example used an undocumented `ssh_host` variable with lowercase `host` keys. Current Red Hat documentation and the upstream role README use `Host` entries inside the `ssh` dictionary with `Condition` keys. Updated the client playbook accordingly.
- The role references used the older role names `rhel-system-roles.sshd` and `rhel-system-roles.ssh`. Current Red Hat collection documentation states that installed roles are available as `redhat.rhel_system_roles.<role_name>`. Updated the role names and diagram labels to the current fully qualified collection names.

## Review Notes
The YAML snippets parse successfully after the corrections. The OpenSSH verification commands (`sshd -t`, `sshd -T`, `systemctl status sshd`, and `ssh -v`) are valid. The cipher, MAC, and key exchange examples use valid OpenSSH option names and plausible algorithm names, but environments that enforce RHEL system-wide crypto policies may need to account for those policies when overriding cryptographic settings.

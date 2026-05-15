# Validation Summary: How to Use Ansible to Configure NFS Shares on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible playbooks
- Ansible built-in modules (`dnf`, `file`, `template`, `systemd`, `command`, `import_playbook`)
- Ansible POSIX collection modules (`firewalld`, `mount`)
- NFS server and client configuration
- firewalld
- Linux NFS mount options and verification commands

## Sources Consulted
- Ansible `ansible.posix.mount` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/mount_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible `ansible.builtin.import_playbook` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/import_playbook_module.html
- Ansible playbook reuse documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse.html
- Red Hat Enterprise Linux 9 NFS server documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/deploying-an-nfs-server_configuring-and-using-network-file-services
- Red Hat Enterprise Linux 9 NFS client mounting documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems
- Linux `nfs(5)` manual page: https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux `nfsstat(8)` manual page: https://man7.org/linux/man-pages/man8/nfsstat.8.html

## Issues Found
- The NFS client playbook used the `intr` mount option. Linux keeps `intr` only for backward compatibility and ignores it after kernel 2.6.25, so it is not meaningful for RHEL 9. Removed `intr` from the three NFS client mount option strings.

## Review Notes
The playbooks use valid Ansible module names and parameters, and the `/etc/exports`, firewalld service names, NFS service names, import playbook usage, and verification commands align with the consulted documentation. The firewall example opens `nfs`, `rpc-bind`, and `mountd`, which is appropriate for NFSv3-compatible setups; NFSv4-only environments can often use a narrower firewall configuration.

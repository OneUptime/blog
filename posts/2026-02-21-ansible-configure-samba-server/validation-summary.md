# Validation Summary: How to Use Ansible to Configure Samba Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Samba
- SMB/CIFS file sharing
- Linux systemd services
- Active Directory integration with realmd and Winbind
- Samba VFS full_audit logging
- firewalld and rsyslog

## Sources Consulted
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible blockinfile module documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/blockinfile_module.html
- Ansible firewalld module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- Samba smb.conf man page: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba smbpasswd man page: https://www.samba.org/samba/docs/current/man-html/smbpasswd.8.html
- Samba smbstatus man page: https://www.samba.org/samba/docs/current/man-html/smbstatus.1.html
- Samba vfs_full_audit man page: https://www.samba.org/samba/docs/current/man-html/vfs_full_audit.8.html
- SambaWiki domain member setup documentation: https://wiki.samba.org/index.php/Setting_up_Samba_as_a_Domain_Member
- Ubuntu Server Samba file server documentation: https://documentation.ubuntu.com/server/how-to/samba/file-server/index.html
- Red Hat Enterprise Linux 9 Samba server documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_using_network_file_services/assembly_using-samba-as-a-server_configuring-and-using-network-file-services
- realm(8) man page: https://manpages.org/realm/8

## Issues Found
- Debian/Ubuntu Samba service handling was incomplete. The installation playbook only enabled Red Hat service units (`smb` and `nmb`), while Ubuntu documents `smbd.service` and `nmbd.service`. Added Debian-specific systemd tasks and updated later handlers to use OS-specific service names.
- The share configuration handler always restarted `smb` and `nmb`, which would fail on Debian/Ubuntu systems. Added an OS-specific `samba_services` mapping and used it in the handler.
- The template recommended `socket options = TCP_NODELAY IPTOS_LOWDELAY` under "Performance tuning". Red Hat's Samba documentation warns that setting `socket options` overrides kernel auto-tuning and usually decreases performance. Removed that line.
- The Active Directory package task used only `yum` and included `sssd`. Red Hat documents that Samba file servers using AD domain users should use Winbind, and SSSD is not supported for this Samba server role. Split the package task into Red Hat and Debian variants, removed `sssd`, and installed Winbind-related packages.
- The Active Directory join command did not force Winbind/Samba enrollment. Updated `realm join` to use `--membership-software=samba --client-software=winbind`, matching realmd and Red Hat guidance for Samba Winbind integration.
- The AD `blockinfile` example inserted `security = ads` and `workgroup` immediately after `[global]`, leaving later `security = user` and `workgroup` lines in the existing template to override them. Replaced this with `lineinfile` updates that replace existing global parameters instead of adding conflicting duplicates.
- The AD idmap example used only the default `*` idmap range for all users. Samba domain member guidance recommends non-overlapping ranges and a domain-specific idmap backend unless using `autorid`. Added separate default and domain idmap ranges with the `rid` backend for the AD domain.
- The audit logging handler restarted only the Red Hat `smb` service. Updated it to use OS-specific service names.

## Review Notes
- The playbooks remain illustrative snippets rather than a complete production role. A production role should also manage NSS/PAM configuration for Winbind where needed, firewall handling on Debian/Ubuntu, and idempotent Samba password updates.
- The examples use `ansible.builtin.systemd`, which is retained as a backward-compatible alias for `ansible.builtin.systemd_service` in current Ansible documentation.

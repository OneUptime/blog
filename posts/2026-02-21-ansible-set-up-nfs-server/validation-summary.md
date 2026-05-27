# Validation Summary: How to Use Ansible to Set Up NFS Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- NFS and NFSv4
- Linux package and service management
- firewalld
- Kerberos / RPCSEC_GSS for NFS
- Linux mount and export configuration

## Sources Consulted
- Ansible `ansible.posix.mount` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/mount_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Linux `nfs(5)` manual page: https://man7.org/linux/man-pages/man5/nfs.5.html
- Linux `exports(5)` manual page: https://man7.org/linux/man-pages/man5/exports.5.html
- Linux `nfs.conf(5)` manual page: https://man7.org/linux/man-pages/man5/nfs.conf.5.html
- Red Hat Enterprise Linux NFS server documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_using_network_file_services/deploying-an-nfs-server
- Red Hat Enterprise Linux NFS security / Kerberos documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_using_network_file_services/nfs-security-with-auth_gss_securing-nfs
- Debian NFS server documentation: https://wiki.debian.org/NFS/Server
- Debian NFS Kerberos documentation: https://wiki.debian.org/NFS/Kerberos

## Issues Found
- The client mount examples used the `intr` option. Linux `nfs(5)` documents `intr` and `nointr` as backward-compatible options ignored after kernel 2.6.25, so the examples were updated to omit `intr`.
- The NFSv4-only `nfs.conf` example included `vers2=n`, which is not a recognized `[nfsd]` key in current `nfs.conf(5)`. The snippet now uses `vers3=n` and `vers4=y`.
- The Kerberos example enabled `gssproxy` without installing it. Package installation tasks were added for RedHat and Debian systems.
- The Kerberos export example added `/srv/nfs/secure` to `/etc/exports` without ensuring the directory existed. A directory creation task was added before exporting it.
- The Kerberos section implied the playbook was sufficient by itself. The prose now states that Kerberos principals and keytabs must already exist for the server and clients.

## Review Notes
The Ansible module usage, NFS export syntax, firewalld service names, `exportfs -ra`, `sec=krb5p`, `_netdev`, `hard`, `timeo`, and `retrans` usage were consistent with the consulted documentation. The Kerberos playbook remains a compact example rather than a full Kerberos realm enrollment workflow.

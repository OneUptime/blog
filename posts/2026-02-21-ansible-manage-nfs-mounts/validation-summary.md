# Validation Summary: How to Use Ansible to Manage NFS Mounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- NFS
- Linux mount options and `/etc/fstab`
- `/etc/exports` and `exportfs`
- AutoFS
- firewalld
- Linux sysctl tuning

## Sources Consulted
- Ansible `ansible.posix.mount` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/mount_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Linux `nfs(5)` manual page: https://www.man7.org/linux/man-pages/man5/nfs.5.html
- Linux `exports(5)` manual page: https://man7.org/linux/man-pages/man5/exports.5.html
- Ubuntu `auto.master(5)` manual page for AutoFS map format and timeout option: https://manpages.ubuntu.com/manpages/stonking/man5/auto.master.5.html
- Red Hat Enterprise Linux NFS documentation for required services and firewall behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_using_network_file_services/deploying-an-nfs-server

## Issues Found
- The NFS client examples used `soft` for writable shared and backup mounts. Linux NFS documentation warns that `soft` can cause silent data corruption in some cases, so the examples now use `hard` for writable data and the explanatory text reserves `soft` for cases where responsiveness is more important than data integrity.
- The stale file handles pitfall recommended `soft` mounts as the general fix. This was changed to recommend `hard` mounts for important data and to frame `soft` as a deliberate tradeoff.
- The NFS server directory creation task used the Debian-specific `nogroup` group on all OS families. The example now uses `nogroup` on Debian and `nobody` on Red Hat-family systems.
- The AutoFS playbook used `ansible.builtin.copy` with Jinja content. Ansible's copy module documentation recommends `template` for variable interpolation, so the task now uses `ansible.builtin.template` with a small `auto.nfs.j2` template.
- The NFS tuning task name claimed it set read and write sizes, but the sysctl values shown configure socket buffer and RPC slot settings. The task name was corrected.

## Review Notes
- The examples assume the `ansible.posix` collection is installed; this is included with the full `ansible` package but not with `ansible-core` alone.
- The firewall task opens common firewalld services for NFS on Red Hat-family systems. Pure NFSv4 deployments may need fewer RPC-related services than mixed NFSv3/NFSv4 environments.

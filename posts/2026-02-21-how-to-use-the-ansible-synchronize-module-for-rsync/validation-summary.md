# Validation Summary: How to Use the Ansible synchronize Module for rsync

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.posix.synchronize
- rsync
- YAML playbooks
- SSH-based file synchronization

## Sources Consulted
- Ansible Community Documentation: ansible.posix.synchronize module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/synchronize_module.html
- rsync 3.4.1 man page, https://download.samba.org/pub/rsync/rsync.1

## Issues Found
- The introduction overstated how the `copy` module behaves for directory trees. I changed it to say that `copy` does not use rsync's file-list and delta-transfer protocol, which is the technically relevant distinction.
- The permissions section did not mention the privilege requirement for `--chown`. I added the Ansible-documented caveat that destination ownership changes require appropriate receiver-side privileges and that `synchronize` can only use passwordless sudo for `become`.
- The bandwidth example used `--bwlimit=10000` and described it as 10 MB/s. The rsync man page treats an unsuffixed value as KiB/s, so I changed the example to `--bwlimit=10m` and described it as about 10 MiB/s.
- The performance table presented environment-dependent timings as if they were universal. I added a note that exact timings vary by hardware, network, file sizes, and Ansible settings.
- The prerequisites section omitted that `ansible.posix.synchronize` belongs to the `ansible.posix` collection. I added that requirement while keeping the rsync installation requirement.

## Review Notes
The main examples for `mode: push`, `mode: pull`, `delete`, `recursive`, `checksum`, `rsync_opts`, include/exclude ordering, backups, and `delegate_to` match the current Ansible module documentation and rsync option behavior. The post uses `yes` for booleans, which Ansible accepts, though `true` is more common in newer examples.

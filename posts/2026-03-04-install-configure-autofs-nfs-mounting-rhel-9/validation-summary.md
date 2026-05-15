# Validation Summary: How to Install and Configure autofs for On-Demand NFS Mounting on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- autofs
- NFS
- systemd
- dnf

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "The autofs configuration files" and "Configuring autofs mount points": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 documentation, "Frequently used NFS mount options": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems
- Red Hat Knowledgebase, "NFS mounts do not honor the 'intr' or 'nointr' mount options in RHEL 6 and later": https://access.redhat.com/solutions/157873
- Linux man-pages project, auto.master(5): https://man7.org/linux/man-pages/man5/auto.master.5%40%40autofs.html

## Issues Found
- The NFS mount examples used the `intr` option, and the "Common Mount Options" section described `intr` as allowing interruption of hung NFS operations. Red Hat documents that `intr` and `nointr` are ignored on RHEL 7, 8, and 9, so I removed `intr` from the sample autofs map entries and removed it from the options list.

## Review Notes
- Red Hat's autofs procedure uses `systemctl reload autofs.service` after map changes, while the post uses `systemctl restart autofs`. Restarting is valid, though reload is less disruptive.
- The post uses `soft` NFS mounts, which Red Hat lists as a supported NFS option. For production workloads, administrators should consider the application-level implications of soft mounts because timed-out NFS operations can return errors to callers.

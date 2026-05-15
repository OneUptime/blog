# Validation Summary: How to Configure Persistent NFS Mounts in /etc/fstab on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NFS and NFSv4
- `/etc/fstab`
- `mount`, `findmnt`, and `journalctl`
- systemd mount units
- SELinux troubleshooting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Mounting NFS shares automatically when the system boots: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems
- Red Hat Enterprise Linux 9 documentation: Frequently used NFS mount options, including `rsize` and `wsize`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems
- Red Hat Customer Portal: NFS mounts do not honor the `intr` or `nointr` mount options in RHEL 6 and later: https://access.redhat.com/solutions/157873
- systemd.mount manual: fstab conversion, `_netdev`, `nofail`, and network mount ordering: https://www.freedesktop.org/software/systemd/man/systemd.mount.html
- Local `fstab(5)` man page for fstab fields, `defaults`, `nofail`, and pass/dump values.
- Local `systemd-escape --path /mnt/nfs-shared` output to verify the escaped mount unit name.

## Issues Found
- The post recommended the `intr` NFS mount option and described it as allowing signal interrupts during hangs. On RHEL 9, `intr`/`nointr` is retained only for backward compatibility and is ignored, so I removed it from the recommended fstab entry, option table, and systemd mount unit example.
- The post stated that `_netdev` is critical for NFS and that without it the system tries to mount NFS before the network is up. systemd recognizes NFS filesystem types as network mounts automatically, while `_netdev` is an explicit override/safeguard. I updated the explanation and common-pitfall wording accordingly.
- The post attributed boot hangs specifically to `hard` mounts. A required NFS mount can delay or fail boot when the server is unavailable, while `hard` primarily controls retry behavior for NFS operations. I adjusted the boot-failure wording to be more precise.
- The common-pitfall entry for missing `nofail` said a down NFS server blocks the entire boot. I changed this to "can delay or fail the boot" to match systemd `nofail` behavior more accurately.

## Review Notes
- The examples use `rsize=65536` and `wsize=65536`, which are valid, but RHEL 9 can negotiate larger values up to 1,048,576 bytes. Future revisions could mention that fixed sizes are workload-dependent rather than universally faster.
- The `nfs4` filesystem type and `vers=4` examples are valid. Red Hat documentation commonly uses `nfsvers=4`, but `vers=4` is accepted by the Linux NFS mount helper.

# Validation Summary: How to Configure NFS Mounts Using the Cockpit Web Console on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Cockpit web console
- NFS client mounts
- `/etc/fstab`
- autofs
- firewalld
- SELinux booleans
- Linux storage and mount utilities

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Connecting NFS mounts in the web console": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems#connecting-nfs-mounts-in-the-web-console_mounting-nfs-shares
- Red Hat Enterprise Linux 9 documentation, "Customizing NFS mount options in the web console": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems#customizing-nfs-mount-options-in-the-web-console_mounting-nfs-shares
- Red Hat Enterprise Linux 9 documentation, "Frequently-used NFS mount options": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-nfs-shares_managing-file-systems#frequently-used-nfs-mount-options_mounting-nfs-shares
- Red Hat Enterprise Linux 9 documentation, "Mounting file systems on demand": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems#mounting-file-systems-on-demand_managing-file-systems
- Red Hat Enterprise Linux 9 documentation, "Adjusting the policy for sharing NFS and CIFS volumes by using SELinux booleans": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux#adjusting-the-policy-for-sharing-nfs-and-cifs-volumes-by-using-selinux-booleans_configuring-selinux-for-applications-and-services-with-non-standard-configurations
- Linux `nfs(5)` manual page: https://man7.org/linux/man-pages/man5/nfs.5.html
- Red Hat Customer Portal solution, "NFS mounts do not honor the 'intr' or 'nointr' mount options in RHEL 6 and later": https://access.redhat.com/solutions/157873
- Local command help for `mount` and `findmnt`.

## Issues Found
- Cockpit persistence was described as unconditional. Red Hat documents "Mount at boot" as a selectable option, so the post now says `/etc/fstab` persistence is added when "Mount at boot" is selected.
- The prerequisites omitted `cockpit-storaged` and enabling `cockpit.socket`, both of which Red Hat lists as prerequisites for using the web console storage workflow. These were added, and `rpcbind` was marked as optional for NFSv3 workflows.
- The Cockpit navigation text described an "NFS mounts" section. Red Hat documents creating a mount from the Storage table menu, so the wording was corrected.
- The edit workflow implied a mounted NFS mount can be edited directly. Red Hat documents unmounting before saving custom mount options, so the post now includes that step.
- The `intr` NFS option was listed and used as a functional option. On RHEL 9 it is accepted only for backward compatibility and ignored, so it was removed from the options table and examples.
- The status command `mount -t nfs4` only shows NFSv4 mounts. The post says "all NFS mounts", so it was changed to `findmnt -t nfs,nfs4`.
- The `showmount` troubleshooting text only mentioned the `nfs` firewall service. It now also mentions `rpc-bind` and `mountd`, which are needed for NFSv3-style export discovery.

## Review Notes
- `showmount -e` is useful for many NFS servers, especially NFSv3-style export discovery, but NFSv4-only environments may not expose complete information through `showmount`.
- `rsize=1048576,wsize=1048576` is valid on RHEL 9, but Red Hat documents that the client and server negotiate the largest mutually supported value by default.

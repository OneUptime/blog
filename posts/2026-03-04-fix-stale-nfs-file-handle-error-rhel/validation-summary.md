# Validation Summary: How to Fix 'Stale NFS File Handle' Error on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- NFS client and server
- nfs-utils commands: mount, umount, exportfs, nfsstat, rpcdebug
- systemd service management
- /etc/fstab NFS mount configuration
- autofs configuration

## Sources Consulted
- Red Hat Customer Portal: NFS mounts do not honor the intr or nointr mount options in RHEL 6 and later - https://access.redhat.com/solutions/157873
- Red Hat Customer Portal: What causes stale NFS file handles? - https://access.redhat.com/solutions/2674
- Red Hat Customer Portal: How to unmount a stale NFS mount that fails to unmount with device is busy after network disconnectivity - https://access.redhat.com/solutions/204423
- Linux man-pages project: nfs(5) - https://man7.org/linux/man-pages/man5/nfs.5.html
- Local util-linux manual page: umount(8)

## Issues Found
- The /etc/fstab example recommended the `intr` mount option. On RHEL 6 and later, `intr` and `nointr` are ignored for NFS mounts, so the example was changed to use `hard,timeo=600,retrans=3`.
- The prevention section implied that `hard` prevents stale file handles. `hard` improves retry behavior during transient outages, but it does not prevent stale handles caused by deleted or re-created objects. The comments were updated to make that distinction.
- The individual-file section said that accessing the parent directory or running `stat` could refresh a stale handle. Listing the parent can help determine scope, and `stat` can confirm ESTALE, but it does not reliably repair an invalid file handle. The wording was corrected.
- The final paragraph said stale handles are most commonly caused by restarting the NFS service or re-exporting a filesystem. A restart alone should not invalidate stable file handles; stale handles are more accurately tied to server-side object/export changes, failover/remount events, and fileid/fsid changes. The paragraph was updated.

## Review Notes
The remaining commands are technically valid for RHEL-style NFS troubleshooting. Future revisions could add safer operational guidance around lazy unmounts because `umount -l` detaches the mount immediately and can leave references until later cleanup.

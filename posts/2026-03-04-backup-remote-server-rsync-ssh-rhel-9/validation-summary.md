# Validation Summary: How to Configure Backup to Remote Server with rsync over SSH on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- rsync
- OpenSSH
- SSH public-key authentication
- Cron
- Bash

## Sources Consulted
- rsync official man page: https://download.samba.org/pub/rsync/rsync.1
- OpenBSD sshd manual page, including authorized_keys command restrictions: https://man.openbsd.org/sshd.8
- OpenBSD ssh-keygen manual page: https://man.openbsd.org/ssh-keygen.1
- OpenBSD sshd_config manual page: https://man.openbsd.org/sshd_config.5
- Red Hat Enterprise Linux 9 Securing networks documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/index
- Local command help/version checks for rsync 3.2.7, OpenSSH ssh, ssh-keygen, and ssh-copy-id.

## Issues Found
- The post copied the SSH key to `backupuser` before showing creation of that account. I added a note that `backupuser` must exist first and that the backup-server setup is shown in Step 5.
- The restricted `authorized_keys` command wrapper allowed only `rsync --server*`, but the backup and verification examples also used the same key for remote `mkdir`, `rm`, `ln`, `du`, and `ls` commands. I updated the wrapper to allow only rsync plus the specific backup maintenance and read-only verification commands used later in the post.
- The backup command used `rsync -a` to preserve owner/group/device metadata while writing as the unprivileged `backupuser`. Because rsync only preserves ownership on the receiver when it has super-user privileges or fake-super support, I added remote-side `-M--fake-super` to the backup and dry-run restore examples.

## Review Notes
- The examples assume the backup filesystem supports extended attributes for rsync `--fake-super`, which is true for typical RHEL filesystems such as XFS and ext4 when mounted normally.
- The cleanup script is intentionally simple. In production, test the `find ... -exec rm -rf` expression carefully against the actual backup path layout before enabling it from cron.

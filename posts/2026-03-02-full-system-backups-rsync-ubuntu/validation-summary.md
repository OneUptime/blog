# Validation Summary: How to Create Full System Backups with rsync on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- rsync
- SSH
- cron
- GNU GRUB
- Bash scripting

## Sources Consulted
- rsync official man page and local `rsync --help`: https://download.samba.org/pub/rsync/rsync.1
- Ubuntu rsync man page: https://manpages.ubuntu.com/manpages/jammy/man1/rsync.1.html
- GNU GRUB 2.14 manual, `grub-install`: https://www.gnu.org/software/grub/manual/grub/html_node/Invoking-grub_002dinstall.html
- Ubuntu/Debian crontab man page and local `man 5 crontab`: https://manpages.ubuntu.com/manpages/jammy/man5/crontab.5.html
- Local `grub-install --help`

## Issues Found
- `-a` does not preserve hard links. Updated rsync backup, restore, and verification examples to use `-H`, and added a flag explanation for hard-link preservation.
- The remote backup example used an unprivileged `user@backup-server` destination while also showing system-level metadata preservation. Changed it to `root@backup-server` and clarified that the remote account must be able to preserve ownership, device files, ACLs, and extended attributes.
- The cleanup command could match and remove the snapshot root directory itself if it was older than the retention period. Added `-mindepth 1` to limit deletion to child snapshot directories.
- The GRUB restore example used the legacy `--root-directory` form. Updated it to the current documented `--boot-directory=/mnt/target/boot` form and labeled it as a BIOS-system example.
- The troubleshooting note suggested adding `--no-compress` for local backups, but the local backup commands did not enable compression. Reworded the advice to avoid `-z` or `--compress` on local or fast-network backups.

## Review Notes
The post is technically relevant and the main workflow is sound after the corrections. Full-system restores can vary on UEFI systems, separate `/boot` or EFI partitions, encrypted disks, LVM, and Btrfs subvolumes, so future revisions could add platform-specific restore caveats.

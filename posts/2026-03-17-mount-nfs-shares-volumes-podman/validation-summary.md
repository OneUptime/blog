# Validation Summary: How to Mount NFS Shares as Volumes in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman volumes
- NFS
- Linux mount options
- SELinux volume labeling
- Linux networking diagnostics

## Sources Consulted
- Podman `podman-volume-create` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- Podman `--volume` / bind mount documentation: https://docs.podman.io/en/v4.3/markdown/options/volume.html
- Linux `nfs(5)` manual page: https://man7.org/linux/man-pages/man5/nfs.5.html

## Issues Found
- Podman local-driver mount options require root privileges. Added a note that the volume examples use rootful Podman and changed the NFS-backed volume examples and related `podman` verification commands to use `sudo podman`.
- The troubleshooting section mounted `/mnt/test` without creating it first. Added `sudo mkdir -p /mnt/test` before the manual mount command.
- The troubleshooting command `sudo ss -tlnp | grep 2049` was described as verifying firewall access, but it only checks listening sockets on the machine where it runs. Changed the comment to clarify it should be run on the NFS server to verify that NFS is listening on port 2049.
- The summary recommended `soft` mounts for resilience. Linux NFS documentation warns that `soft` can cause silent data corruption in some cases, so the summary now says to use `soft` only when responsiveness is more important than data integrity.

## Review Notes
The NFSv3 UDP example is syntactically valid, but UDP transport is best treated as a legacy compatibility choice. Linux NFS documentation warns about NFS over UDP on high-speed links, so TCP is generally preferred when the server supports it.

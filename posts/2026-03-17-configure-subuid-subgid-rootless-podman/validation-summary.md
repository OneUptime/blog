# Validation Summary: How to Configure subuid and subgid for Rootless Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- `/etc/subuid` and `/etc/subgid`
- `usermod`
- `podman system migrate`

## Sources Consulted
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman `podman-system-migrate` documentation: https://docs.podman.io/en/v5.1.0/markdown/podman-system-migrate.1.html
- `usermod(8)` manual page: https://man7.org/linux/man-pages/man8/usermod.8.html
- `subuid(5)` manual page: https://man7.org/linux/man-pages/man5/subuid.5.html
- Local `usermod --help` output from the review environment

## Issues Found
- The examples used `grep "$USER" /etc/subuid` and `grep "$USER" /etc/subgid`, which can match unrelated usernames that contain the current username as a substring. Changed these checks to `grep "^$(id -un):"` so they match the current login name at the start of the subordinate ID record.
- The troubleshooting command for an insufficient range added `100000-231535` even though the post had already configured `100000-165535`. That creates an overlapping subordinate ID allocation. Changed it to add a non-overlapping extension, `165536-231535`, matching the post's own existing range.

## Review Notes
The core format `username:start:count`, the `usermod --add-subuids` / `--add-subgids` and deletion flags, the recommendation to use non-overlapping ranges, and the use of `podman system migrate` after subordinate ID changes were verified against Podman and shadow-utils documentation. Future improvements could mention that subordinate ID delegation may come from NSS subid plugins rather than only local files on newer systems, but that is outside the scope of this focused correction.

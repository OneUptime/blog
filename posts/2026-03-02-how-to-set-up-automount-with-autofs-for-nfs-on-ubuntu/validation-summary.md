# Validation Summary: How to Set Up Automount with autofs for NFS on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- autofs (automounter daemon, v5.x)
- NFS (Network File System)
- Ubuntu (apt package management, systemd)
- SSSD (System Security Services Daemon) for LDAP/AD integration
- nfs-common (NFS client utilities)

## Sources Consulted
- autofs(5) and auto.master(5) man pages (kernel.org / Linux man-pages)
- automount(8) man page
- Ubuntu package documentation for `autofs` and `nfs-common`
- Red Hat documentation on autofs and SSSD automount integration (https://access.redhat.com/documentation/)
- SSSD documentation (https://sssd.io/docs/)
- Linux kernel NFS client documentation (Documentation/filesystems/nfs/)

## Issues Found
No technical issues found. The post is technically accurate:

- The `autofs` and `nfs-common` package names are correct for Ubuntu.
- `/etc/auto.master` format with `mount-point  map-file  [options]` is correct.
- `--timeout=N` and `--ghost` (with `--browse` as a synonym) are valid auto.master options.
- The indirect map syntax (`key  [options]  location`) with `-` prefix for mount options is correct.
- Wildcard key `*` with `&` substitution is the correct autofs syntax for dynamic home directories.
- The `/-` direct map indicator in auto.master is correct.
- SSSD integration via `services = nss, pam, autofs` and an `[autofs]` section in `sssd.conf`, with `sss` as the map source in `auto.master`, is correct.
- LDAP map source syntax `ldap:basedn` is valid.
- `systemctl enable/start/reload/restart autofs` commands are correct on Ubuntu.
- `automount --dumpmaps`, `-f`, `-v`, and `--debug` are valid options in autofs 5.x.
- The `/net` automount with the `/etc/auto.net` executable map script for browsing NFS exports is correct (this script is shipped with the autofs package).

## Review Notes
- The `intr` mount option used in several examples has been deprecated since Linux kernel 2.6.25 (2008) and is silently ignored by the kernel. It does not cause errors and is still very commonly seen in tutorials and documentation, so its inclusion is not incorrect — just historical. Future revisions could drop it.
- The post does not explicitly mention updating `/etc/nsswitch.conf` with `automount: files sss` when configuring SSSD as a map source. On some distributions this is required for SSSD-served maps to be picked up, though SSSD's autofs responder typically configures this. This is a minor omission, not a technical error.
- The `--browse` option is described as "similar to `--ghost` on some systems" — in practice on Linux autofs these are aliases for the same behavior (ghost/browsable directories), but the wording is acceptable.
- The post is well-structured and covers the major autofs use cases (indirect maps, direct maps, wildcard maps, SSSD/LDAP map sources, and `/net` browsing) accurately.

# Validation Summary: How to Use setfacl and getfacl for Extended ACL Permissions on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- POSIX Access Control Lists (ACLs)
- `setfacl` / `getfacl` (acl package, util-linux ecosystem)
- ext4 / XFS / Btrfs filesystem ACL support
- Ubuntu system administration
- `tune2fs`, `/etc/fstab`, `/proc/mounts`

## Sources Consulted
- `setfacl(1)` man page (acl 2.3.2)
- `getfacl(1)` man page (acl 2.3.2)
- `setfacl --help` and `getfacl --help` output
- POSIX 1003.1e ACL specification (informational, withdrawn draft 17) as implemented by the Linux acl package
- Ubuntu / Linux kernel documentation on ext4 ACL support (POSIX ACLs enabled by default in modern kernels)

## Issues Found
- **"Detecting Files with ACLs" — broken find/grep pattern**: The original recipe
  `sudo find /srv -xdev -exec getfacl {} \; 2>/dev/null | grep -B5 "^user:.*:"`
  does not filter correctly. The regex `^user:.*:` matches both the base entry
  `user::rw-` (the `.*` accepts an empty string) and named entries like
  `user:alice:rw-`, so it would not actually isolate files with extended ACLs.
  Replaced with the idiomatic `getfacl -R --skip-base /srv 2>/dev/null`, which
  is the documented way (per `getfacl --help`: `-s, --skip-base   skip files
  that only have the base entries`) and is also far more efficient than
  forking `getfacl` per file via `find -exec`.

## Review Notes
- All other commands and flags were verified against the `setfacl`/`getfacl` man pages and `--help` output: `-m`, `-x`, `-b`, `-k`, `-R`, `--restore=`, `--set-file=-`, the `d:` default-ACL prefix, the `u:NAME:perms` / `g:NAME:perms` / `m:perms` entry syntax, and the uppercase `X` (conditional execute) permission are all correct.
- The claim that modern Ubuntu kernels enable POSIX ACLs by default on ext4 (no explicit `acl` mount option required) is accurate — POSIX ACL support became a kernel-level default for ext4 in Linux 2.6.39 (2011) and remains so. The `defaults,acl` fstab snippet is still valid and harmless, just usually redundant.
- The mask behaviour, effective-rights comments (`#effective:`), and the `+` indicator in `ls -la` are all described correctly.
- The `--set-file=-` stdin pipe pattern for copying ACLs between files is correct and matches the man page.

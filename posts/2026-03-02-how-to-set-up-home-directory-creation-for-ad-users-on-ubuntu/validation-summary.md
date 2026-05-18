# Validation Summary: How to Set Up Home Directory Creation for AD Users on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (22.04 / 24.04)
- Active Directory integration
- SSSD (System Security Services Daemon)
- PAM (`pam_mkhomedir.so`, `pam_oddjob_mkhomedir.so`, `pam-auth-update`)
- oddjob / oddjobd (D-Bus service)
- NFS (`nfs-common`, `nfsvers=4`)
- autofs (`/etc/auto.master`, `/etc/auto.home`)
- mkhomedir_helper
- Kerberos (`klist`)
- SELinux (`restorecon`)

## Sources Consulted
- `man pam-auth-update(8)` — verified `--enable` / `--disable` profile flags
- `man pam_mkhomedir(8)` — verified `umask`, `skel` options and default values (umask=0022, skel=/etc/skel)
- `man mkhomedir_helper(8)` — verified syntax `mkhomedir_helper {user} [umask [path-to-skel [home_mode]]]`
- `/usr/share/pam-configs/mkhomedir` — verified default Ubuntu mkhomedir PAM profile content
- SSSD upstream documentation (sssd.conf(5)) for `fallback_homedir`, `default_shell`, `ldap_user_shell`, `%u`/`%d` template tokens
- Red Hat / Fedora oddjob and `pam_oddjob_mkhomedir` documentation for D-Bus-based home directory creation

## Issues Found

1. **"Expected output" of the mkhomedir profile was incorrect.** The post claimed enabling the profile produces `session optional pam_mkhomedir.so skel=/etc/skel umask=0077`. The actual Ubuntu default profile in `/usr/share/pam-configs/mkhomedir` ships only `optional pam_mkhomedir.so` with no `skel` or `umask` options. Updated the expected output and added a clarifying note that the module falls back to its built-in defaults (`skel=/etc/skel`, `umask=0022`), and that customization is shown in the manual section below.

2. **Test command did not actually trigger home directory creation.** The original test used `sudo -u aduser@corp.example.com ls ~`. Two problems: (a) the tilde is expanded by the invoker's shell before `sudo` runs, so it points at the caller's home rather than the AD user's; (b) a non-login `sudo -u` invocation may not reliably open a fresh PAM session that fires `pam_mkhomedir`. Replaced with `sudo -iu aduser@corp.example.com whoami`, which forces a login shell and exercises the full PAM session stack.

## Review Notes
- `pam-auth-update` may overwrite manual edits to `/etc/pam.d/common-session` on later upgrades; the post implicitly acknowledges this by recommending the `--enable` flow first, which is the right call.
- Mounting NFS directly over `/home` (as shown in the "Using a Shared Home Directory Server" section) will hide any pre-existing local users' home directories on that mount point. This is a known administrative caveat but the surrounding context (AD environments where local accounts are minimal) makes it acceptable; left unchanged.
- The permissions-fix loop uses `chown -R "$owner:$owner"` which assumes a per-user primary group. For AD users with `Domain Users` as primary group, this may not match the actual gid. The code is illustrative rather than canonical and the comment frames it as a fix-up script, so left as-is.
- The `default_shell` / `ldap_user_shell` snippet under "Setting Default Shell for AD Users" mixes in a `fallback_homedir = /home/%u` line. It is not technically wrong, just stylistically out of place; left intact to preserve the author's structure.
- The claim that oddjob "falls back to mkhomedir if D-Bus is not available" is true in the sense that two `optional` PAM stack entries will both be attempted in order — accurate when configured as shown.

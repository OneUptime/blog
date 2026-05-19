# Validation Summary: How to Manage Extended Attributes (xattr) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux extended attributes (xattr)
- `attr` package: `getfattr`, `setfattr`, `attr` CLI tools
- ext4, XFS, Btrfs filesystems
- POSIX ACLs (`setfacl`, `getfacl`) and the `system.posix_acl_access` xattr
- Linux capabilities (`setcap`, `getcap`) and the `security.capability` xattr
- `cp`, `rsync`, `tar` xattr-preservation flags
- xattr namespaces: `user.`, `trusted.`, `security.`, `system.`

## Sources Consulted
- xattr(7) man page — namespace definitions, kernel VFS size limits (XATTR_SIZE_MAX = 65536, XATTR_NAME_MAX = 255)
- getfattr(1) man page — `-d`, `-n`, `-m`, `-e {text,hex,base64}`, `-h` flags
- setfattr(1) man page — `-n`, `-v`, `-x`, `-h` flags
- attr(1) man page — `-g`, `-s`, `-V`, `-l`, `-r` flags
- capabilities(7) man page — `security.capability` xattr storage
- cp(1) man page (GNU coreutils) — `--preserve=xattr`, `-a` (= `-dR --preserve=all`)
- rsync(1) man page — `-X/--xattrs`, `-A/--acls` (not implied by `-a`)
- tar(1) man page (GNU tar) — `--xattrs`, `--xattrs-include`, `--xattrs-exclude`
- Linux kernel ext4 documentation: https://docs.kernel.org/filesystems/ext4/attributes.html — block-size limit and `ea_inode` feature

## Issues Found

1. **Incorrect description of `getfattr -e base64`.** The original text described `-e base64` as "Show attribute length instead of value." This is wrong — `-e` is the output encoding flag (`text`, `hex`, or `base64`) and base64 encodes the *value* (prefixed with `0s`), not its length. There is no flag to show attribute length only. Replaced the comment with an accurate description ("Show value in base64 encoding").

2. **Misleading `getfattr FILE` without `-d`.** Several examples used bare `getfattr FILE` with comments like "Get all user attributes" or "Verify removal." Without `-d` (or `-n name`), getfattr only lists attribute *names*, not values. Updated those examples to `getfattr -d` where the intent was clearly to see values, and adjusted the comment for the name-listing case to "List all user attribute names."

3. **Imprecise ext4 size-limit claim.** The original said individual xattrs are "typically 64KB for ext4." 64KB is the VFS-wide `XATTR_SIZE_MAX` limit, not an ext4-specific limit. On ext4, the total of all xattr names+values must fit in a single filesystem block (typically 4KB) unless the `ea_inode` feature is enabled, which lets individual values grow to the 64KB VFS ceiling. Rewrote the paragraph to distinguish the VFS limit from the ext4 block/`ea_inode` reality.

## Review Notes

- All xattr namespace claims are accurate per xattr(7).
- `system.posix_acl_access` (for ACLs) and `security.capability` (for file capabilities) are the canonical xattr names — both verified against xattr(7) and capabilities(7).
- `cp -a` implies `--preserve=all`, which does preserve xattrs (verified). `rsync -a` does *not* imply `--xattrs` or `--acls` — they must be specified explicitly, which the post does correctly.
- The example `setcap cap_net_raw+ep /usr/bin/ping` is technically valid syntax; on modern Ubuntu, `ping` ships in `/usr/bin/ping` with this capability already set via the `iputils-ping` package.
- The `user_xattr` mount option is the default on modern ext4 and does not typically need to be set in `/etc/fstab`. The post correctly notes this.
- The shell-script pattern `getfattr -n user.status "$f" 2>/dev/null | grep -oP '(?<=")[^"]+'` is fragile but functional for the demonstrated use case; not a technical error.

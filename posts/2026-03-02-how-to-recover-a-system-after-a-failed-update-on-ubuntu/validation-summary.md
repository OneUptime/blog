# Validation Summary: How to Recover a System After a Failed Update on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Ubuntu (apt, dpkg package management)
- APT (apt-get, apt-cache, apt-mark)
- dpkg (--configure, --force-* options, debug output)
- systemd / journalctl
- GRUB (recovery mode, advanced options)
- LVM (snapshots, lvcreate, lvconvert)
- unattended-upgrades

## Sources Consulted
- `dpkg(1)` man page and `dpkg --help` / `dpkg --force-help` output
- `dpkg-query(1)` man page (package state codes documentation)
- `apt-get(8)`, `apt-cache(8)`, `apt-mark(8)` man pages
- Debian Policy Manual / dpkg lock file paths (/var/lib/dpkg/lock, lock-frontend, /var/cache/apt/archives/lock, /var/lib/apt/lists/lock)
- Ubuntu documentation on recovery mode and GRUB advanced options
- `lvcreate(8)` and `lvconvert(8)` LVM2 documentation
- unattended-upgrades configuration documentation (/etc/apt/apt.conf.d/50unattended-upgrades)

## Issues Found

1. **Incorrect dpkg state codes in the "Half-upgraded packages" scenario.** The post listed `Hn = half-installed` and `Un = unpacked but not configured`. These are not valid dpkg -l output codes. Per `dpkg-query(1)`, the two-letter prefix in `dpkg -l` output is `<desired-action><current-status>`, where the desired action is one of `u/i/h/r/p` and the current status is one of `n/c/H/U/F/W/t/i`. The correct codes are `iH` (install desired, Half-installed) and `iU` (install desired, Unpacked). Fixed the codes and added `iF` (half-configured) for completeness.

2. **Broken regex in the grep filter for abnormal packages.** The original `grep -E "^[^hi]"` is a character class meaning "first char is not h or i". This incorrectly excludes the most common problematic states (`iH`, `iU`, `iF`) since they all start with `i`. Changed to `^[a-z][^i] ` which correctly matches lines whose second character (the package status) is not `i` (i.e., not "Installed").

3. **Broken character class in the awk pattern.** The original `awk '!/^[hi|ii|rc]/ ...'` uses `[hi|ii|rc]` which is a character class (matching any single char from `h`, `i`, `|`, `r`, `c`) — not regex alternation. This made the pattern semantically meaningless for the intended filter. Replaced this command with `sudo dpkg --audit`, which is the canonical, built-in way to list packages needing attention and is what was effectively being attempted.

## Review Notes

- All lock file paths (`/var/lib/dpkg/lock`, `/var/lib/dpkg/lock-frontend`, `/var/cache/apt/archives/lock`, `/var/lib/apt/lists/lock`) are correct for modern Ubuntu.
- `dpkg --force-configure-any` and `dpkg --force-remove-reinstreq` are valid force options confirmed against `dpkg --force-help`.
- `dpkg --debug=777` is a valid invocation; the octal value enables multiple debug categories per `dpkg --debug=help`.
- The LVM snapshot/merge workflow (`lvcreate -s`, `lvconvert --merge`) is correct. Note that `--merge` for the root LV requires a reboot to take effect (already noted in the post).
- The unattended-upgrades config snippet uses correct syntax including the `//` C-style comments that the Apt config parser accepts.
- The `apt-cache policy nginx` example output uses jammy archive paths; the version `1.24.0-1ubuntu1` would more realistically come from a PPA/backports than `jammy-updates` (jammy ships 1.18.0). This is an illustrative example so was left as-is.
- The chroot recovery procedure correctly bind-mounts `/dev`, `/proc`, `/sys`. Some users also bind-mount `/run` and `/sys/firmware/efi/efivars` (for EFI systems) before running `update-grub`, but the procedure as shown will work for most cases.

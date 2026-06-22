# Validation Summary: How to Downgrade Packages on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (18.04+)
- APT / apt-cache / apt-mark
- dpkg
- GRUB (kernel boot management)
- ppa-purge / PPAs
- Synaptic Package Manager
- Snap
- Flatpak
- Docker (for isolated testing)

## Sources Consulted
- apt(8) and apt-get(8) manpages — `--allow-downgrades`, version pinning syntax (`pkg=version`), `-s` simulate, `-f`/`--fix-broken` (https://manpages.ubuntu.com/manpages/jammy/man8/apt.8.html)
- apt-cache(8) manpage — `policy`, `madison`, `showpkg`, `depends`, `rdepends` (https://manpages.ubuntu.com/manpages/jammy/man8/apt-cache.8.html)
- apt-mark(8) manpage — `hold`, `unhold`, `showhold`
- dpkg(1) manpage — `-i`, `--force-depends`, `--force-remove-reinstreq`, `--configure -a`, `--remove`
- Ubuntu kernel / GRUB documentation — `GRUB_DEFAULT` submenu syntax (`"Advanced options for Ubuntu>..."`), `update-grub`
- Ubuntu archive references — archive.ubuntu.com pool layout, old-releases.ubuntu.com for EOL releases, packages.ubuntu.com
- ppa-purge documentation
- Snap documentation — `snap revert`, `snap refresh --revision`, `snap info` (https://snapcraft.io/docs)
- Flatpak documentation — `flatpak remote-info --log`, `flatpak update --commit` for downgrades (https://docs.flatpak.org/en/latest/tips-and-tricks.html)

## Issues Found
No technical issues found.

All commands, flags, and procedures were verified as syntactically correct and current:
- The core APT downgrade flow (`apt install pkg=version --allow-downgrades`) is accurate.
- Version discovery commands (`apt-cache policy`, `apt-cache madison`) are correct.
- The dpkg manual download/install flow with `apt install -f` cleanup is correct.
- `apt-mark hold/unhold/showhold` usage is correct.
- The GRUB submenu `GRUB_DEFAULT` syntax using the `>` separator and `update-grub` is correct.
- `ppa-purge` usage and the `old-releases.ubuntu.com` workaround for EOL releases are accurate.
- Snap (`snap revert`, `snap refresh --revision=`) and Flatpak (`remote-info --log`, `update --commit=`) downgrade methods are the documented approaches.
- The bash downgrade script is syntactically valid.

## Review Notes
- `snap info package-name` shows channel/revision availability per channel; to list *all installed* revisions (including disabled ones for revert), `snap list --all package-name` is more precise. The post's usage is still a reasonable way to discover available revisions, so no change was made.
- The post correctly notes risk-laden operations (`dpkg --force-depends`, `--force-remove-reinstreq`) as risky/force operations — appropriate caution is conveyed.
- Specific version strings (e.g., `nginx=1.18.0-0ubuntu1`, kernel `5.15.0-9x-generic`) are illustrative examples and will naturally vary by release; this is clearly contextual and not an error.
- Best practices around backups, isolation testing, and holding packages are sound recovery guidance.

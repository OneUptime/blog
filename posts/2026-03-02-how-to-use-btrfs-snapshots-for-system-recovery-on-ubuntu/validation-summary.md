# Validation Summary: How to Use Btrfs Snapshots for System Recovery on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Btrfs filesystem (subvolumes, snapshots, copy-on-write)
- `btrfs-progs` CLI (`btrfs subvolume`, `btrfs filesystem`, `btrfs qgroup`)
- Snapper (snapshot management tool)
- systemd timers (`snapper-timeline.timer`, `snapper-cleanup.timer`)
- APT/dpkg hooks (`/etc/apt/apt.conf.d/`)
- GRUB and `grub-btrfs` package
- Ubuntu Linux

## Sources Consulted
- Btrfs Wiki: https://btrfs.readthedocs.io/en/latest/
- `btrfs-subvolume(8)` man page: https://btrfs.readthedocs.io/en/latest/btrfs-subvolume.html
- Snapper documentation: http://snapper.io/documentation.html
- openSUSE Snapper wiki: https://en.opensuse.org/openSUSE:Snapper_Tutorial
- Ubuntu manpages for `snapper(8)`
- Debian APT configuration reference (`apt.conf(5)`) for DPkg hook semantics
- `grub-btrfs` project: https://github.com/Antynea/grub-btrfs

## Issues Found
1. **Incorrect comment for `btrfs subvolume list -s /`**: The original comment said "List subvolumes with size info", but the `-s` flag actually filters for snapshot subvolumes only — it has nothing to do with size. Fixed the comment to "List only snapshot subvolumes" and added a follow-up example showing how to actually get per-subvolume usage via `btrfs quota enable` + `btrfs qgroup show`, which is the genuine way to view space usage on Btrfs.

2. **Broken APT/dpkg hook example**: The original snippet had two related problems:
   - It used `DPkg::Pre-Install-Pkgs`, which is the hook contract for tools that read package info from stdin (e.g. apt-listbugs). It is not the right hook for a generic "run before apt does anything" command. The correct hook is `DPkg::Pre-Invoke`.
   - The pre-hook ran `snapper create ... --print-number` but did not redirect its stdout, while the post-hook tried to `cat /run/snapper_pre_num`. The file was never written, so the pre-number lookup would fail every time.

   Changed the hook to `DPkg::Pre-Invoke` and added `> /run/snapper_pre_num` so the printed snapshot number is actually captured for the post-hook to consume.

## Review Notes
- The `snapper rollback` workflow is described with a caveat that it requires the `@` layout. In practice Ubuntu's default installer creates `@` and `@home` subvolumes, but `snapper rollback` was designed around openSUSE's specific layout (it expects `.snapshots` to be a subvolume under the root). On Ubuntu the manual rename approach described in Method 1 is generally more reliable.
- `snapper-zypp-plugin` is the openSUSE/zypper integration; the post correctly notes there is no direct apt equivalent and falls back to the dpkg-hook approach. An `apt-btrfs-snapshot` package exists in some Debian-derivative repositories and could be mentioned as an alternative, but the wrapper-script approach shown is valid.
- The `btrfs subvolume list -r /` example filters for read-only subvolumes (not strictly "snapshots"), but the parenthetical clarification in the comment is accurate given that all snapshots created earlier in the post used `-r`.
- The `mount -o subvolid=5` examples correctly use ID 5, which is always the Btrfs top-level subvolume.
- Output samples for `snapper list` and `snapper diff` match the actual format produced by snapper.

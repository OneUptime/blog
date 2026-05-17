# Validation Summary: How to Use Snapper for Btrfs Snapshots on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Snapper (snapshot management tool)
- Btrfs filesystem
- Ubuntu (apt / dpkg)
- systemd timers (snapper-timeline.timer, snapper-cleanup.timer)
- GRUB (boot-from-snapshot recovery)
- btrfs-progs

## Sources Consulted
- Debian snapper(8) manpage — https://manpages.debian.org/bookworm/snapper/snapper.8.en.html
- Arch Wiki: Snapper — https://wiki.archlinux.org/title/Snapper
- openSUSE Snapper Tutorial — https://en.opensuse.org/openSUSE:Snapper_Tutorial
- Ubuntu package: snapper-gui (universe) — https://packages.ubuntu.com/source/focal/snapper-gui
- Ubuntu package: apt-btrfs-snapshot — https://launchpad.net/ubuntu/+source/apt-btrfs-snapshot
- Debian snapper package — https://packages.debian.org/bullseye/snapper

## Issues Found

1. **Non-existent `snapper sdiff` subcommand.** The post used `sudo snapper -c root sdiff 1 2` to "show the actual diff content". Snapper has no `sdiff` subcommand — its comparison subcommands are `status`, `diff`, and `xadiff`. Removed the `sdiff` line and kept `status` + `diff` as the file-change / diff commands.

2. **Wrong syntax for `snapper diff` and `snapper status`.** The post had `snapper diff 1 2` (space-separated) and inconsistently `snapper status 1..2` (correct). The snapper manpage requires the `number1..number2` form for both. Changed `diff 1 2` to `diff 1..2`.

3. **Wrong package names in the apt-integration section.** The post recommended `sudo apt install -y snapper-dbg` and `sudo apt install -y btrfs-apt-snapshot`. `snapper-dbg` is a debug-symbols package, not an apt-integration plugin. `btrfs-apt-snapshot` does not exist in Ubuntu (the closest real package, `apt-btrfs-snapshot`, is independent of snapper and creates its own raw Btrfs snapshots, not snapper-managed ones). Replaced the misleading installation block with a one-sentence note that snapper on Ubuntu has no pre-built apt hook, so users need to install the DPkg hook themselves — which is exactly what the rest of the section already does correctly.

4. **Misleading `snapper list -a` example.** The post used `sudo snapper -c root list -a` with the comment "View space used by each snapshot". The `-a`/`--all-configs` flag lists snapshots across every config (and is contradictory with `-c root`); it does not toggle the used-space column, which is shown by default once btrfs quota is enabled. Dropped the `-a` and updated the comment to mention the quota requirement.

## Review Notes

- The post is targeted at Ubuntu but most of the snapshot-management workflow it describes (custom apt hooks, manual rollback via subvolume swap, GRUB editing) reflects the fact that Ubuntu — unlike openSUSE — does not ship pre-baked snapper integration. The post is now consistent on this point after the fixes.
- `snapper undochange 5..0` is correct: `0` is snapper's documented special value for "current system state".
- `snapper rollback` exists as a first-class subcommand (used heavily on openSUSE with the `installation-helper`/grub-btrfs stack) but it requires the openSUSE-style subvolume layout where the root is a snapshot subvolume. On a standard Ubuntu `@` layout, the manual delete-and-snapshot approach the post shows is the appropriate option — left as written.
- The systemd unit names `snapper-timeline.timer` and `snapper-cleanup.timer` are correct.
- `snapper-gui` does exist in Ubuntu universe, so leaving it in the install line is fine, though it is largely unmaintained upstream and most users will only use the CLI.
- The example snapshot-list table uses pipe-separated columns rather than snapper's actual whitespace-aligned output, but it is clearly shown as illustrative output rather than something to copy/parse, so no change needed.

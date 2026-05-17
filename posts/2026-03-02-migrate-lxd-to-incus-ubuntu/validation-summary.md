# Validation Summary: How to Migrate from LXD to Incus on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- LXD (Linux Containers daemon)
- Incus (community fork of LXD)
- `lxd-to-incus` migration tool
- Zabbly Incus apt repository (deb822 sources format)
- Ubuntu / apt / snap
- systemd

## Sources Consulted
- Incus migration how-to: https://linuxcontainers.org/incus/docs/main/howto/server_migrate_lxd/
- `lxd-to-incus` source: https://github.com/lxc/incus/blob/main/cmd/lxd-to-incus/main.go
- `incus` CLI reference: https://linuxcontainers.org/incus/docs/main/reference/manpages/incus/
- `incus network` subcommands: https://linuxcontainers.org/incus/docs/main/reference/manpages/incus/network/
- `incus info` reference (for `--show-log`): https://linuxcontainers.org/incus/docs/main/reference/manpages/incus/info/
- `incus snapshot` reference: https://linuxcontainers.org/incus/docs/main/reference/manpages/incus/snapshot/
- LXD `lxc snapshot` reference: https://documentation.ubuntu.com/lxd/en/latest/reference/manpages/lxc/snapshot/
- Zabbly Incus packages: https://github.com/zabbly/incus

## Issues Found
1. **`lxc snapshot create "$container" pre-migration`** — The LXD CLI does not have a `create` subcommand under `lxc snapshot`. The correct LXD syntax is `lxc snapshot <instance> [<snapshot name>]`. (Incus *does* have `incus snapshot create`, but the post was using the LXD client.) Changed to `lxc snapshot "$container" pre-migration`.

2. **`sudo lxd-to-incus --dry-run`** — The `lxd-to-incus` tool has no `--dry-run` flag. Its actual supported flags are `--yes`, `--cluster-member`, `--ignore-version-check`, `--version`, and `--help`. The tool itself performs validation checks and prints a summary before prompting the user to confirm. Rewrote the section to describe running the tool interactively (it asks "Proceed with the migration?" before changing anything) and noted that `--yes` skips the prompt.

3. **`incus logs my-container`** — There is no `incus logs` subcommand. The correct way to view an instance's recent log entries is `incus info <name> --show-log`. Updated the troubleshooting snippet accordingly.

4. **`incus network restart incusbr0`** — There is no `restart` subcommand under `incus network` (the available subcommands include `create`, `delete`, `edit`, `set`, `show`, `info`, `list`, etc., but not `restart`). Replaced with `sudo systemctl restart incus` to re-apply the network configuration, followed by restarting the container.

## Review Notes
- The Zabbly deb822 sources snippet uses `sh -c '...EOF'` with command substitution `$(. /etc/os-release && echo $VERSION_CODENAME)`; the substitution is evaluated inside the `sh -c` subshell, so it correctly expands to the host's codename (e.g. `noble`, `jammy`). This works as intended.
- `incus-tools` and `lxd-to-incus` are both available as separate packages from the Zabbly repository on supported Ubuntu releases.
- The socket path comparison (`/var/snap/lxd/common/lxd/unix.socket` for the LXD snap vs. `/var/lib/incus/unix.socket` for native Incus) is accurate.
- `incusbr0` is the default Incus bridge name created by `incus admin init`.
- The `rm -rf /var/snap/lxd/common/lxd` step after `snap remove --purge lxd` is largely redundant because purge removes snap data, but it is harmless as a belt-and-braces cleanup.
- The `for container in $(incus list --format csv -c n,s | grep -v RUNNING | cut -d, -f1)` loop will also try to start containers in `FROZEN`/`ERROR`/header-less states; in practice after a migration all instances are stopped so this is fine.

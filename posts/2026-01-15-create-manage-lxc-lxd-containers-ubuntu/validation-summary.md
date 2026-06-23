# Validation Summary: How to Create and Manage LXC/LXD Containers on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- LXD (system container/VM manager)
- LXC (`lxc` client CLI)
- Ubuntu 20.04 / 22.04 / 24.04
- Snap and APT package installation
- Container networking (lxdbr0 bridge, proxy devices, custom networks)
- Storage pools and volumes (dir, zfs, btrfs)
- Profiles, images, snapshots, and backup/export

## Sources Consulted
- LXD `lxc import` manpage — https://canonical.com/lxd/docs/latest/reference/manpages/lxc/import/
- LXD `lxc export` manpage — https://canonical.com/lxd/docs/latest/reference/manpages/lxc/export/
- LXD documentation (instances, networking, storage, profiles) — https://documentation.ubuntu.com/lxd/latest/

## Issues Found
1. **`lxc import` used an invalid `--name` flag** (line ~411). The original command was `lxc import /backup/mycontainer.tar.gz --name restored-container`. The `lxc import` command does not have a `--name` flag; the instance name is supplied as a positional argument (`lxc import [<remote>:] <backup file> [<instance name>]`). Fixed to `lxc import /backup/mycontainer.tar.gz restored-container`.

## Review Notes
- The `lxc export ... --instance-only=false` example is technically valid (`--instance-only` is a real boolean flag) and produces the intended "export with snapshots" behavior. It is slightly redundant since exports include snapshots by default, but it is not incorrect, so it was left unchanged.
- All other commands were verified and are correct: lifecycle (`start`/`stop`/`restart`/`delete --force`), `lxc exec --env`, resource limits (`limits.memory`, `limits.cpu`, `limits.cpu.priority`), `boot.autostart*` keys, networking (`config device override`, proxy port forwarding, `network create/attach/set`), storage pools/volumes, bind mounts, profiles (YAML format correct), image management, snapshots (`mycontainer/snap1` syntax), copy/move, and file push/pull.
- The `lxc list` column shorthand strings (`nsb4tSa`, `nsb4t`) use valid column characters.
- Version caveat: the `images:` remote remains available in current LXD releases, but distro image availability there changes over time; readers on a given Ubuntu/LXD version should confirm the exact alias (e.g. `images:debian/12`) is still published with `lxc image list images:`.

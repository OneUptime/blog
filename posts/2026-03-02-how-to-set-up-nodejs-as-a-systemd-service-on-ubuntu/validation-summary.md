# Validation Summary: How to Set Up Node.js as a systemd Service on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js (20.x via NodeSource)
- systemd (unit files, service management)
- journalctl (log viewing)
- npm (package management, `npm ci`)
- Ubuntu user management (`useradd`)
- nginx (reverse proxy)
- authbind (privileged port binding)
- Linux capabilities (`setcap`, `cap_net_bind_service`)

## Sources Consulted
- systemd.unit(5) — https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- systemd.service(5) — https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.resource-control(5) — https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html
- systemd.exec(5) — https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- NodeSource distributions — https://github.com/nodesource/distributions
- npm-ci documentation — https://docs.npmjs.com/cli/v10/commands/npm-ci
- journalctl(1) — https://www.freedesktop.org/software/systemd/man/journalctl.html
- capabilities(7) — https://man7.org/linux/man-pages/man7/capabilities.7.html
- authbind(1) man page

## Issues Found

1. **`MemoryLimit=512M` is deprecated.** Per `systemd.resource-control(5)`, `MemoryLimit=` is explicitly marked deprecated (it's the cgroup v1 name). The replacement is `MemoryMax=`, which is the unified cgroup v2 name. Ubuntu has used cgroup v2 by default since 21.10. Changed `MemoryLimit=512M` to `MemoryMax=512M`.

2. **`StartLimitIntervalSec=` and `StartLimitBurst=` were placed in the wrong section.** Per `systemd.unit(5)`, these two directives belong in the `[Unit]` section, not `[Service]`. systemd still parses them from `[Service]` for backwards compatibility but emits warnings on newer versions. Moved both directives from `[Service]` into the `[Unit]` section.

## Review Notes

- The `npm ci --production` flag still works in npm 10.x but is a legacy alias for `--omit=dev`. Both are accepted; left as-is since it remains functional.
- The two `useradd` commands shown in "Creating a Dedicated Service User" are clearly presented as alternatives (the second is gated by "If your app needs a home directory"), so the apparent duplication is intentional and acceptable.
- The authbind permission `chmod 500` is correct — the file needs to be readable/executable by the owner (nodeapp), which the `chown` step grants.
- The `setcap cap_net_bind_service=+ep /usr/bin/node` approach has a caveat the post doesn't mention: the capability is cleared if `/usr/bin/node` is replaced by a package update, so it must be re-applied after Node.js upgrades. Not strictly inaccurate, but worth noting.
- `ProtectHome=yes` combined with `User=nodeapp` and `useradd --create-home` (the second variant) would block the app from reading its own home directory. If the home-directory variant of `useradd` is used, the user should set `ProtectHome=read-only` or `false` instead. Left as-is since the primary variant in the post is `--no-create-home`.
- The post's reference to `systemd-notify` for `Type=notify` startup is correct but minimal; readers wanting to use it will need a library like `sd-notify` for Node.js.

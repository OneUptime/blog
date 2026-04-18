# Validation Summary: How to Troubleshoot systemd-networkd with networkctl

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- systemd-networkd
- networkctl (systemd networking control tool)
- journalctl (systemd log query)
- systemd-resolved / resolvectl
- .network unit files (systemd.network format)
- DHCP / DNS diagnostics on Linux

## Sources Consulted
- `networkctl(1)` man page, systemd 255 (https://www.freedesktop.org/software/systemd/man/latest/networkctl.html)
- `systemd.network(5)` man page (https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html)
- `resolvectl(1)` man page (https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html)
- `systemd-networkd.service(8)` documentation
- systemd NEWS / release history for subcommand availability (networkctl `up`/`down` added in v246, `reload`/`reconfigure` added in v244)

## Issues Found

1. **Incorrect `linger` state description.** The post originally described `linger` as "carrier lost but interface still exists." Per the official `networkctl(1)` man page, `linger` means "The link is gone, but has not yet been dropped by systemd-networkd" — i.e., the interface was removed (e.g., USB NIC unplugged) and networkd has not finished cleaning up. Carrier loss corresponds to the operational state `no-carrier`, not the setup state `linger`. Fixed the description.

2. **`degraded` misclassified as a setup state.** The post listed `degraded` alongside setup states like `configured`, `unmanaged`, `failed`, and `linger`. `degraded` is actually an **operational** state (STATE column in `networkctl list`), not a setup state (SETUP column). Fixed by splitting the list into two subsections — SETUP states and operational STATE examples — and added `configuring` (a valid setup state) and `routable` / `no-carrier` to give a more complete picture.

3. **`unmanaged` slightly oversimplified.** Originally described as "no .network file matches this interface." Broadened to "networkd is not handling this link (e.g., no matching .network file)" since `unmanaged` can also result from `Unmanaged=yes` or the link being explicitly excluded.

4. **`failed` description in the conclusion.** Originally said "configuration was applied but an error occurred," which is misleading — `failed` means networkd failed to configure the link at all. Updated to match the official definition.

All other commands and claims verified correct:
- `networkctl list`, `status`, `reload`, `reconfigure`, `up`, `down` — all valid in current systemd.
- `journalctl -u systemd-networkd` flags (`-n`, `-f`, `--since`) — all correct.
- `.network` file format with `[Match]` / `[Network]` and `DHCP=ipv4` — correct per `systemd.network(5)`.
- `networkctl status <iface>` does include a `Network File:` field — confirmed.
- `resolvectl query` and `resolvectl status <link>` — both valid subcommands.
- Paths `/etc/systemd/network/`, `/run/systemd/network/`, `/usr/lib/systemd/network/` — correct search order per systemd.

## Review Notes
- `networkctl up`/`down` require systemd ≥ v246 (April 2021); `reload`/`reconfigure` require ≥ v244. Very old LTS distros (e.g., Ubuntu 18.04 / RHEL 7) may not support these, but all currently supported distros do. Could be worth a brief version note in a future revision.
- The `cat > /etc/systemd/network/10-eth0.network << EOF ... EOF` block requires root; the post doesn't mention `sudo` but this is a minor stylistic point, not a technical error.
- The post could mention `SYSTEMD_LOG_LEVEL=debug` or `networkctl --json=pretty status` for deeper diagnostics, but current content is accurate as-is.

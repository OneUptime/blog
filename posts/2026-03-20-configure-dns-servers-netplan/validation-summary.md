# Validation Summary: How to Configure DNS Servers with Netplan - Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netplan
- DNS client configuration
- `systemd-networkd` / Netplan `networkd` renderer
- `systemd-resolved`
- `resolvectl`
- Ubuntu Server / Linux networking
- Wi-Fi configuration with Netplan

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan examples: https://netplan.readthedocs.io/en/latest/examples/
- Ubuntu Server networking guide, configuring networks: https://ubuntu.com/server/docs/explanation/networking/configuring-networks/
- `resolvectl` man page: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- `systemd-resolved.service` man page: https://www.freedesktop.org/software/systemd/man/247/systemd-resolved.service.html
- Local `man 5 netplan`, `man 1 resolvectl`, `resolvectl --help`, and `netplan help` output to verify field names, backend caveats, and current CLI syntax

## Issues Found
1. **Over-broad resolver claim in the introduction**: The original post said Netplan DNS settings are applied through `systemd-resolved`. That is too broad for a general Netplan article. I corrected it to say Netplan-defined DNS settings persist across reboots, and that `resolvectl` is the inspection tool on systems using `systemd-resolved`.

2. **Missing backend caveat for `dhcp4-overrides.use-dns`**: Current Netplan documentation states `use-dns` currently only has effect on the `networkd` backend. I added `renderer: networkd` to the server-oriented Ethernet examples and updated the explanatory text so the behavior is described accurately.

3. **Misleading verification comment for `resolvectl query`**: The original comment implied `resolvectl query example.com` shows which DNS server is being used. The `resolvectl` documentation describes `query` as resolving through the system resolver, while `status` is the command that shows DNS settings currently in effect. I updated the comment accordingly.

4. **`/etc/resolv.conf` symlink note was too absolute**: The original debug note said the file "should be a symlink". I narrowed this to systems using `systemd-resolved`, which matches the systemd documentation.

5. **`nslookup` / `dig` availability**: The commands are valid, but they are typically provided by the `dnsutils` package rather than guaranteed on every base install. I clarified that note without changing the commands themselves.

## Review Notes
- The Netplan `nameservers` mapping and the `search` / `addresses` fields are correct per the current Netplan reference.
- The static route syntax using `routes: - to: default` is current and preferable to deprecated `gateway4` examples often found in older posts.
- Example interface names such as `eth0` and `wlan0` are placeholders; on modern Ubuntu systems the actual names are often predictable names such as `enp0s3` or `wlp2s0`.
- For remote systems, `sudo netplan try` is often safer than `sudo netplan apply` because it can roll back automatically, but that is a best-practice note rather than a required correction.

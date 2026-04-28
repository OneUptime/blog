# Validation Summary: How to Configure Multiple IPv4 Addresses with Netplan

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Netplan (YAML-based network configuration tool)
- systemd-networkd (renderer)
- Ubuntu / Debian-based Linux
- IPv4 networking
- iproute2 (`ip` command)

## Sources Consulted
- Netplan official documentation: https://netplan.readthedocs.io/
- Netplan YAML reference (addresses, routes, nameservers): https://netplan.readthedocs.io/en/stable/netplan-yaml/
- `netplan try` man page / docs: https://netplan.readthedocs.io/en/stable/netplan/
- Ubuntu Server networking guide: https://ubuntu.com/server/docs/network-configuration
- iproute2 `ip-address(8)` man page

## Issues Found
- The inline bash comment `# Validate the YAML syntax before applying` above `sudo netplan try` was misleading. `netplan try` does not merely validate syntax — it applies the configuration temporarily and reverts after a timeout (default 120s) unless the user confirms. The surrounding prose described the behavior correctly, but the comment did not. Updated the comment to `# Apply temporarily and auto-revert if not confirmed` to align with the actual command behavior.

## Review Notes
- The Netplan YAML uses the modern `routes:` syntax with `to: default` rather than the deprecated `gateway4:` key — this is correct and recommended for current Netplan versions.
- The `addresses:`, `nameservers:`, and `ethernets:` field structure matches the current Netplan schema.
- The 120-second default timeout for `netplan try` is correct (configurable via `--timeout`).
- The second example uses `10.0.0.100/8`, which is a very wide subnet. It is technically valid, but in practice administrators typically use a smaller mask (e.g. `/24`). This is a stylistic choice rather than a technical error and was left unchanged.
- `ip addr show eth0` is the correct command for verifying assigned addresses.
- No version-specific caveats noted; the configuration shown works across current Netplan releases on Ubuntu 18.04+ and Debian-based systems shipping Netplan.

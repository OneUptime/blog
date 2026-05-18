# Validation Summary: How to Understand Netplan YAML Configuration Syntax on Ubuntu

## Status
validated

## Post Type
Reference / Tutorial — a syntax reference guide for Netplan YAML configuration on Ubuntu

## Technologies Covered
- Netplan (Ubuntu's network configuration abstraction)
- YAML
- systemd-networkd
- NetworkManager
- WireGuard (tunnel mode)
- 802.1X / EAP authentication
- VLANs, bridges, bonds (network virtualization)

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan reference (stable): https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Ubuntu manpage for netplan-try: https://manpages.ubuntu.com/manpages/jammy/man8/netplan-try.8.html
- Canonical Netplan project: https://github.com/canonical/netplan

## Issues Found
1. **Incorrect device type key for dummy interfaces.** The post listed `dummies` in the Supported Device Types table. The correct Netplan key is `dummy-devices`. Changed `dummies` → `dummy-devices`.

2. **Incorrect WireGuard private key syntax.** The post used `private-key: /etc/wireguard/wg0.key` as a flat top-level key under the `wg0` tunnel. Netplan's WireGuard configuration uses a nested mapping under `key:` or `keys:` with a `private:` sub-property (this also matches the structure used for `peers.keys.public`). Changed to:
   ```yaml
   keys:
     private: /etc/wireguard/wg0.key
   ```

## Review Notes
- The commented-out `# request-hostname: myhost` line under `dhcp4-overrides` references a property that does not exist in Netplan. Since it is commented out and the surrounding context (the actual `hostname:` line above it) is correct, it does not produce a broken config — but the line is misleading. Left unchanged to avoid removing content beyond strict technical errors; a future revision could remove or replace it with `send-hostname: true|false`.
- All other technical content (route properties including `type` values, dhcp4-overrides, 802.1X auth keys, bridge/bond/VLAN parameters, interface match criteria, `netplan try` 120-second default timeout, lexicographic file ordering, and renderer values) verified against the official Netplan documentation.
- Note that as of newer Netplan releases the device-type list could also include `modems`, `virtual-ethernets`/`veths`, `vrfs`, and `nm-devices`. The post's table is non-exhaustive but the entries listed are accurate after the `dummies` fix.

# Validation Summary: How to Configure a WireGuard VPN with Netplan

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Netplan (YAML network configuration on Ubuntu/Debian)
- WireGuard (`wg` userspace tools and kernel module)
- `systemd-networkd` (Netplan back end that supports WireGuard)
- Linux networking utilities (`ip`, `ping`)

## Sources Consulted
- Netplan YAML reference, WireGuard tunnel section: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Canonical Netplan official WireGuard example: https://github.com/canonical/netplan/blob/main/examples/wireguard.yaml
- WireGuard quickstart / `wg(8)` man page: https://www.wireguard.com/quickstart/

## Issues Found
The post used property names that are not part of Netplan's WireGuard schema. Netplan does not recognise `private-key-file`, `private-key`, or a top-level `public-key`. The supported schema is:

- The tunnel's private key goes in `key` (a base64-encoded key string, or — with `systemd-networkd` v242+ — an absolute path to a file containing the key).
- A peer's public key goes in `keys.public` (and an optional pre-shared key in `keys.shared`).

I corrected this throughout the post:

1. **Basic WireGuard Configuration** — changed `private-key-file: /etc/netplan/wg0-private.key` to `key: /etc/netplan/wg0-private.key`, and changed the peer's `public-key:` entry to a nested `keys:` mapping with `public:` underneath.
2. **Inline Private Key (Less Secure)** — same change: `private-key:` → `key:`, and the peer's `public-key:` was nested under `keys:`. Updated the trailing sentence ("Using `private-key-file` is preferred over `private-key`...") to "Referencing the private key by file path is preferred over an inline key for security." since the original property names no longer existed.
3. **Full Tunnel (Route All Traffic Through VPN)** — same `key:` and `keys.public:` corrections.
4. **Remote Peer Configuration** — same `key:` and `keys.public:` corrections.
5. **Conclusion** — updated to reference the tunnel's `key` property and `keys.public` for peers, instead of the non-existent `private-key-file`.

The shell commands (`wg genkey | tee ... | wg pubkey`, `chmod 600`, `netplan apply`, `wg show`, `ip addr show`, `ping -c 3`) are all correct, as are the example values (port 51820, RFC 5737 documentation address `203.0.113.0/24`).

## Review Notes
- The post does not mention that the file-path form of `key:` requires Netplan's `systemd-networkd` back end (`networkd` is the default, so this is usually fine, but on systems using `NetworkManager` only the inline base64 form is accepted). A future revision could call this out.
- The post uses `keepalive: 25` which is a reasonable persistent-keepalive value (the WireGuard project suggests 25 for NAT keepalives); valid range is 1–65535.
- The `wg genkey` pipeline writes the private key to `/etc/netplan/wg0-private.key` via `tee` before `chmod 600` runs, so the file is briefly created with default umask permissions. For stricter handling, `(umask 077; wg genkey > .../wg0-private.key)` would be safer, but the current approach is the form most commonly shown in WireGuard guides and is not technically incorrect.
- Netplan applies tunnel-level `addresses:` to the `wg0` interface; the post's use of `/24` on the tunnel address is conventional and works, though `/32` per peer in `allowed-ips` (as shown) is the more typical pattern for point-to-point setups.

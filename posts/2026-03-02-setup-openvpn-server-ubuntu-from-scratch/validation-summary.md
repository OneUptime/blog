# Validation Summary: How to Set Up OpenVPN Server on Ubuntu from Scratch

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- OpenVPN (community 2.5/2.6 on Ubuntu)
- Easy-RSA 3 (PKI management)
- Ubuntu 22.04 / 24.04
- iptables / netfilter-persistent
- UFW (Uncomplicated Firewall)
- systemd (`openvpn-server@.service`)
- Linux IP forwarding / NAT masquerading

## Sources Consulted
- OpenVPN community reference manual (2.6): https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/
- Easy-RSA documentation: https://github.com/OpenVPN/easy-rsa/blob/master/doc/EasyRSA-Readme.md
- Easy-RSA Advanced Usage: https://github.com/OpenVPN/easy-rsa/blob/master/doc/EasyRSA-Advanced.md
- Ubuntu Server Guide — OpenVPN: https://ubuntu.com/server/docs/service-openvpn
- Ubuntu packages: `openvpn` (2.5.x in 22.04, 2.6.x in 24.04), `easy-rsa` (3.x), `iptables-persistent`
- OpenVPN systemd unit naming (`openvpn-server@<config>.service` for `/etc/openvpn/server/<config>.conf`)
- iptables(8) MASQUERADE / conntrack state matching documentation

## Issues Found

1. **NAT masquerade source CIDR was overly broad (`/8` instead of `/24`).**
   The server config uses `server 10.8.0.0 255.255.255.0` (a `/24`), but the iptables MASQUERADE rule and the UFW `before.rules` snippet specified `-s 10.8.0.0/8`. A `/8` would match the entire `10.0.0.0/8` private space — masquerading unrelated traffic from other private networks the server may reach. Changed both occurrences to `-s 10.8.0.0/24` to match the actual VPN subnet.
   - Edited line ~192 (iptables section).
   - Edited line ~315 (UFW `before.rules` comment block).

## Review Notes

- The `openvpn --genkey secret <file>` syntax is the modern (OpenVPN 2.5+) form; correct for both Ubuntu 22.04 (2.5.x) and 24.04 (2.6.x). The older `--genkey --secret <file>` form is no longer required.
- The configuration uses `tls-auth` (HMAC) with `key-direction 1` inline on the client. This is still supported, but `tls-crypt` is now the OpenVPN-recommended default for new deployments (it also encrypts the control channel). Not changed — `tls-auth` is functionally correct.
- `cipher AES-256-CBC` / `auth SHA256` are still accepted in OpenVPN 2.6, but `cipher` is deprecated in favor of `data-ciphers` (e.g. `data-ciphers AES-256-GCM:AES-128-GCM`). The current directives still negotiate correctly with modern clients, so not changed; this is worth modernizing in a future revision.
- The `FORWARD` chain rules include both a blanket `-i tun0 -j ACCEPT` and a narrower stateful rule for the same direction; the stateful one is redundant given the blanket rule, but the configuration as written is still functional and not incorrect.
- `user nobody` / `group nogroup` are the correct privilege-drop accounts on Ubuntu (Debian-family distributions use `nogroup`; RHEL-family uses `nobody`).
- The systemd unit `openvpn-server@server` correctly resolves to `/etc/openvpn/server/server.conf`, which is where the post writes the config.
- The Easy-RSA workflow (manual `cp -r` from `/usr/share/easy-rsa/`) works; the alternative `make-cadir ~/openvpn-ca` helper would also work but isn't required.
- Pushing `redirect-gateway def1 bypass-dhcp` plus Google Public DNS is a reasonable full-tunnel default; readers running split-tunnel setups would need to adjust.

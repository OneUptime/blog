# Validation Summary: How to Install and Configure an OpenVPN Server with IPv4 on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- OpenVPN (2.5+/2.6)
- Easy-RSA 3.x (PKI / certificate authority)
- Ubuntu (apt package management)
- systemd (`openvpn-server@.service` template unit)
- iptables (NAT / MASQUERADE)
- Linux kernel networking (IPv4 forwarding via sysctl)

## Sources Consulted
- OpenVPN 2.6 manual page: https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/
- Easy-RSA documentation: https://github.com/OpenVPN/easy-rsa/blob/master/doc/EasyRSA-Readme.md
- Ubuntu OpenVPN package metadata (`apt-cache show openvpn` — verified version 2.6.19 on Ubuntu 24.04)
- Ubuntu OpenVPN package contents (`dpkg -L openvpn` — verified sample config path `/usr/share/doc/openvpn/examples/sample-config-files/server.conf` exists and is not gzipped on current Ubuntu)
- OpenVPN HOWTO: https://openvpn.net/community-resources/how-to/
- Linux kernel sysctl documentation for `net.ipv4.ip_forward`

## Issues Found
No technical issues found.

All commands, directives, and paths verified correct:

- `make-cadir`, `./easyrsa init-pki`, `./easyrsa build-ca nopass`, `./easyrsa gen-req server nopass`, `./easyrsa sign-req server server`, `./easyrsa gen-dh` — all valid Easy-RSA 3.x commands.
- `openvpn --genkey secret <file>` — correct modern (2.5+) syntax for generating the TLS auth key. The older `--genkey --secret` form was replaced.
- File locations after Easy-RSA generation are correct: `pki/ca.crt`, `pki/issued/server.crt`, `pki/private/server.key`, `pki/dh.pem`, and the `ta.key` placed in `pki/`.
- Sample server config path `/usr/share/doc/openvpn/examples/sample-config-files/server.conf` exists on current Ubuntu and is not gzipped.
- Server configuration directives (`port`, `proto`, `dev tun`, `server 10.8.0.0 255.255.255.0`, `ifconfig-pool-persist`, `push "redirect-gateway def1 bypass-dhcp"`, `push "dhcp-option DNS ..."`, `keepalive 10 120`, `tls-auth <key> 0`, `user nobody`, `group nogroup`, `persist-key`, `persist-tun`, `status`, `verb 3`) are all valid.
- systemd unit `openvpn-server@server` is the correct instance name for the `openvpn-server@.service` template; it reads `/etc/openvpn/server/server.conf`.
- `iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE` is syntactically and semantically correct (interface name `eth0` is conventional placeholder; readers on modern systems with predictable interface names like `ens3`/`enp0s3` will need to substitute).
- `sysctl -w net.ipv4.ip_forward=1` plus the persistent edit to `/etc/sysctl.conf` is correct.

## Review Notes
- `cipher AES-256-CBC` still works in OpenVPN 2.6 but has been deprecated in favor of the negotiated `data-ciphers` directive (e.g. `data-ciphers AES-256-GCM:AES-128-GCM`). Connecting clients running 2.6 will see a deprecation warning. The post is not wrong, just using a legacy directive.
- `tls-auth` with a static key in direction 0/1 is still supported, but `tls-crypt` (single key, encrypts the control channel) is the modern recommendation and is widely considered superior.
- The MASQUERADE rule is added with `iptables` only and is not made persistent (e.g. via `iptables-persistent` / `netfilter-persistent`). On reboot, the rule is lost — readers wiring this into production should persist it.
- The `eth0` interface name will not match on most modern Ubuntu systems that use predictable network interface names; readers should run `ip route show default` or `ip -br link` to identify their actual outbound interface.
- DH parameters (`./easyrsa gen-dh`) are only used if a DH-based cipher suite is negotiated. Modern TLS suites use ECDHE and do not require these, but they remain harmless and are still referenced by `dh /etc/openvpn/server/dh.pem` in many configs.
- No client-side configuration is included; the post sets up the server only and ends with "Clients can now connect using certificate-based authentication" — readers will need a separate guide for client certificate generation and `.ovpn` file creation.

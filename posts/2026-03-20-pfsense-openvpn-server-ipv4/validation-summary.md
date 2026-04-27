# Validation Summary: How to Set Up OpenVPN Server for IPv4 on pfSense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- pfSense (firewall/router platform)
- OpenVPN (Remote Access SSL/TLS + User Auth)
- X.509 PKI (Certificate Authority and server/client certificates)
- RSA 4096 / SHA-256 / AES-256-GCM cryptography
- Diffie-Hellman parameters
- IPv4 networking and tunneling
- pfSense `openvpn-client-export` package

## Sources Consulted
- pfSense documentation: OpenVPN Remote Access Server (https://docs.netgate.com/pfsense/en/latest/recipes/openvpn-ra.html)
- pfSense Certificate Management documentation (https://docs.netgate.com/pfsense/en/latest/certificates/index.html)
- pfSense OpenVPN Client Export package documentation (https://docs.netgate.com/pfsense/en/latest/packages/openvpn-export.html)
- OpenVPN 2.x manual page reference for client/server directives, including `proto`, `remote-cert-tls`, `tls-version-min`, `cipher`, and `auth` (https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/)

## Issues Found
No technical issues found.

The pfSense GUI navigation paths (System > Cert. Manager, VPN > OpenVPN > Servers, Firewall > Rules > WAN/OpenVPN, System > Package Manager, System > User Manager) match the current pfSense CE / Plus interface. The OpenVPN server settings (Remote Access SSL/TLS + User Auth, UDP on IPv4 only, port 1194, AES-256-GCM, SHA256 auth, TLS key, DH 4096) are all valid options and appropriate for an IPv4 remote-access setup. The client `.ovpn` directives (`proto udp4`, `dev tun`, `remote-cert-tls server`, `tls-version-min 1.2`, `cipher AES-256-GCM`, `auth SHA256`, `persist-key`, `persist-tun`, `nobind`, `resolv-retry infinite`) are all valid OpenVPN 2.x options.

## Review Notes
- The introduction mentions the OpenVPN Wizard, but the body of the post walks through the manual flow (Cert Manager → Server → Firewall). This is a stylistic inconsistency, not a technical error — both flows are valid in pfSense.
- The example uses RSA 4096 + DH 4096 with AES-256-GCM. This is secure but compute-heavy; ECDSA with an EC key (e.g., prime256v1) is a faster modern alternative if/when this post is refreshed.
- `cipher` as a standalone client directive is being phased out in favor of `data-ciphers` / `data-ciphers-fallback` in OpenVPN 2.5+. The current post still works with OpenVPN 2.5/2.6, but a future revision could update the client config to use `data-ciphers AES-256-GCM:AES-128-GCM` for forward compatibility.
- The example WAN public address `203.0.113.1` is from the TEST-NET-3 documentation range (RFC 5737), which is the correct placeholder choice.
- The example user password `SecurePass!` is illustrative only; readers should not reuse it.

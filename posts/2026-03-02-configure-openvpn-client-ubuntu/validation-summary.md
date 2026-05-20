# Validation Summary: How to Configure OpenVPN Client on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- OpenVPN client
- systemd services
- NetworkManager and nmcli
- systemd-resolved DNS integration
- Linux networking tools
- OpenSSL

## Sources Consulted
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- OpenVPN DHCP options documentation: https://openvpn.net/community-docs/pushing-dhcp-options-to-clients.html
- NetworkManager nmcli reference: https://www.networkmanager.dev/docs/api/latest/nmcli.html
- Ubuntu package details for openvpn-systemd-resolved: https://packages.ubuntu.com/noble/openvpn-systemd-resolved
- Ubuntu file list for openvpn-systemd-resolved: https://packages.ubuntu.com/noble/amd64/openvpn-systemd-resolved/filelist
- update-systemd-resolved project README: https://github.com/jonathanio/update-systemd-resolved
- Local OpenVPN 2.6.14 `openvpn --help` output
- Local systemd unit definitions for `openvpn-client@.service` and `openvpn@.service`
- Local `nmcli --help` output

## Issues Found
- The `curl ifconfig.me` verification claimed it should return the VPN server IP unconditionally. This is only true for full-tunnel configurations, so the note was qualified.
- The password-removal example used `openssl rsa`, which only handles RSA keys. It was changed to `openssl pkey`, which works for generic PEM private keys.
- The sample client configuration used `cipher AES-256-CBC` as the main cipher directive. OpenVPN 2.5 and later use `data-ciphers` for data-channel cipher negotiation, so the example was updated to `data-ciphers AES-256-GCM:AES-128-GCM`.
- The UDP `nc` reachability check implied a timeout proves failure. UDP is connectionless and this check is not definitive, so the caveat was added inline.
- The TCP fallback example used `proto tcp`. For a client configuration, `proto tcp-client` is the explicit OpenVPN mode, so the example was corrected.
- The DNS leak fix referenced `/etc/openvpn/update-resolv-conf` while installing `openvpn-systemd-resolved`. On Ubuntu, that package provides `/etc/openvpn/update-systemd-resolved`, so the config was corrected and `up-restart`/`down-pre` were added per the helper's documented OpenVPN configuration.
- The DNS leak snippet said it used DNS servers pushed by the server but then set `dhcp-option DNS 8.8.8.8` locally. The local DNS override was removed, and `dhcp-option DOMAIN-ROUTE .` was added to route DNS queries through the VPN DNS servers when using `systemd-resolved`.

## Review Notes
The systemd service guidance matches the installed `openvpn-client@.service` template on a current Ubuntu/Debian-style OpenVPN package, where instances read `%i.conf` from `/etc/openvpn/client`. The NetworkManager import commands match the current `nmcli connection import type openvpn file ...` syntax, but users may need to use the actual imported connection name shown by `nmcli connection show` if it differs from the file basename.

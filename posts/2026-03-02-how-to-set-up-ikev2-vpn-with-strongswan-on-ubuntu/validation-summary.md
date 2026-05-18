# Validation Summary: How to Set Up IKEv2 VPN with strongSwan on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ubuntu 22.04 / 24.04
- strongSwan (IKEv2 IPsec implementation)
- strongSwan `pki` tool (PKI / certificate management)
- IKEv2 / IPsec protocol
- EAP-MSCHAPv2 authentication
- iptables / iptables-persistent (NAT, MASQUERADE, FORWARD)
- UFW firewall
- systemd (`strongswan-starter` service)
- OpenSSL (DER/PKCS12 export)
- Native VPN clients on Windows, macOS, iOS

## Sources Consulted
- strongSwan official documentation (docs.strongswan.org)
- strongSwan `ipsec` command man page (https://man.archlinux.org/man/ipsec.8) — for the list of valid subcommands
- strongSwan cipher suite documentation — for verifying IKE/ESP proposal syntax
- Ubuntu package archive — for confirming package names (`strongswan`, `strongswan-pki`, `libcharon-extra-plugins`, `libcharon-extauth-plugins`, `iptables-persistent`)
- strongSwan `ipsec.conf` reference — for verifying `conn` section options (`auto`, `keyexchange`, `mobike`, `forceencaps`, `fragmentation`, `left*`/`right*` options, `rightauth=eap-mschapv2`, `eap_identity`)
- strongSwan `pki` tool documentation — for `--gen`, `--self`, `--issue`, `--pub`, `--flag serverAuth`, `--flag ikeIntermediate`

## Issues Found

1. **Invalid `ipsec` subcommand: `ipsec listconn`** — There is no `listconn` (or `listconns`) subcommand in the strongSwan `ipsec` wrapper. The documented list commands are `listcerts`, `listcacerts`, `listacerts`, `listocspcerts`, `listaacerts`, `listpubkeys`, `listcrls`, `listocsp`, `listalgs`, `listplugins`, `listcounters`, `listgroups`, `listcainfos`, and `listall`. Loaded connections are visible in `ipsec statusall`. **Fix:** removed the `ipsec listconn` line and consolidated the comment with the existing `ipsec statusall` line.

2. **Invalid `ipsec` subcommand: `ipsec checkconfig`** — There is no `checkconfig` subcommand in the legacy stroke interface. The closest practical alternative is `ipsec reload`, which re-reads `ipsec.conf` and reports parse errors to the log without restarting the daemon. **Fix:** replaced `ipsec checkconfig` with `ipsec reload`, with an updated comment.

## Review Notes

- **Cipher proposals**: The IKE/ESP proposals (`chacha20poly1305-sha512-curve25519-prfsha512,aes256gcm16-sha384-prfsha384-ecp384,aes256-sha1-modp1024,aes128-sha1-modp1024,3des-sha1-modp1024!`) match the long-standing DigitalOcean strongSwan tutorial format. The integrity tokens (`sha512`, `sha384`) paired with AEAD ciphers are technically redundant (AEAD ciphers don't take a separate integrity algorithm), but strongSwan's proposal parser identifies algorithms by name regardless of position and ignores the redundant integrity for AEAD ciphers, so this works in practice. The weak fallback proposals (`aes256-sha1-modp1024`, `aes128-sha1-modp1024`, `3des-sha1-modp1024`) exist for backward compatibility with older Windows 7 / legacy clients — modern Windows 10/11, macOS, and iOS will negotiate the stronger AEAD suites at the front of the list. Operators who don't need legacy client support should drop the SHA1/MODP1024/3DES entries.
- **`3des` plugin in modern strongSwan**: On strongSwan 5.9.x and later, 3DES support may require the `des` plugin to be loaded. On stock Ubuntu 22.04/24.04 packages it is loaded by default, so the proposal as written works out of the box.
- **`forceencaps=yes`** forces UDP encapsulation (NAT-T on port 4500) even when no NAT is detected — this is the right setting for Windows clients, which sometimes misbehave with raw ESP.
- **systemd service name**: `strongswan-starter.service` is correct on Ubuntu 22.04/24.04 — this is the legacy stroke-based service that reads `/etc/ipsec.conf`. The modern alternative is `strongswan.service` (vici/swanctl, reading `swanctl.conf`), which would require a completely different configuration style and is out of scope for this tutorial.
- **`ipsec.secrets` syntax**: `: RSA "server.key.pem"` and `username : EAP "password"` are both valid. Quoting the filename is acceptable.
- **Future migration**: The legacy `ipsec.conf` / `starter` interface is deprecated upstream in favor of `swanctl.conf`. The tutorial is still accurate for current Ubuntu LTS packages, but a future revision could mention the swanctl-based alternative.
- **DNS**: The example uses Google DNS (8.8.8.8 / 8.8.4.4) — operators concerned about privacy may want to use Cloudflare (1.1.1.1) or their own resolver.

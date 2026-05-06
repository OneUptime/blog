# Validation Summary: How to Work Around CGNAT for Port Forwarding

## Status
validated

## Post Type
Guide

## Technologies Covered
- Carrier-Grade NAT (CGNAT)
- IPv4 shared address space (RFC 6598)
- frp
- ngrok
- OpenSSH reverse port forwarding
- autossh
- WireGuard
- iptables
- Cloudflare Tunnel

## Sources Consulted
- RFC 6598: IANA-Reserved IPv4 Prefix for Shared Address Space: https://www.rfc-editor.org/rfc/rfc6598
- frp repository and usage examples: https://github.com/fatedier/frp
- frp authentication documentation: https://gofrp.org/en/docs/features/common/authentication/
- frp release assets: https://github.com/fatedier/frp/releases
- ngrok Linux installation guide: https://ngrok.com/download/linux
- ngrok getting started guide: https://ngrok.com/docs/getting-started
- ngrok HTTP/S endpoint documentation: https://ngrok.com/docs/universal-gateway/http
- OpenSSH client remote forwarding reference: https://man.openbsd.org/OpenBSD-6.4/ssh_config.5
- OpenSSH server `GatewayPorts` reference: https://man.openbsd.org/sshd_config
- WireGuard quick start: https://www.wireguard.com/quickstart/
- Linux kernel IPv4 forwarding documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- iptables NAT HOWTO: https://www.iptables.org/documentation/HOWTO/NAT-HOWTO-6.html
- Cloudflare Tunnel setup guide: https://developers.cloudflare.com/tunnel/setup/
- Cloudflare Tunnel routing guide: https://developers.cloudflare.com/tunnel/routing/
- Cloudflare Tunnel local configuration file guide: https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- Cloudflare Tunnel run parameters: https://developers.cloudflare.com/tunnel/advanced/run-parameters/

## Issues Found
- The post described `100.64.0.0/10` as a private range. I changed it to shared address space wording to match RFC 6598.
- The `frp` examples extracted the archive but then ran `./frps` and `./frpc` without changing into the extracted directory, and the client block omitted downloading the client binary. I added the missing directory step and client-side download lines.
- The `ngrok` installation snippet used an outdated apt repository label, skipped `apt update`, and showed the old `.ngrok.io` hostname pattern. I updated the commands and public URL example to current documented behavior.
- The WireGuard example omitted required IP forwarding and the NAT return-path rules needed for a typical VPS relay setup. I added `net.ipv4.ip_forward=1`, an established-traffic `FORWARD` rule, and `POSTROUTING` SNAT.
- The Cloudflare Tunnel example mixed quick-tunnel and named-tunnel syntax by using `cloudflared tunnel run --url ... home-tunnel`. I replaced it with the documented named-tunnel flow using `config.yml`, `route dns`, and `cloudflared tunnel run home-tunnel`, and noted the Cloudflare-domain prerequisite.
- The comparison table marked ISP public IP access as not supporting HTTPS. I changed that cell to `Manual`, since HTTPS is possible but not provided automatically.
- I replaced one unsupported absolute popularity claim with non-absolute wording.

## Review Notes
- The `frp` and `cloudflared` install examples are Linux `amd64` examples; other architectures need matching release assets.
- The WireGuard section uses `iptables`; environments managed directly with `nftables` may prefer equivalent `nft` rules.
- Cloudflare currently recommends remotely-managed tunnels for most production use cases, but the corrected locally-managed workflow remains valid.
- Commands and documentation were validated as of 2026-05-06.

# Validation Summary: How to Configure IPSec VPN with StrongSwan for IPv4 on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- strongSwan
- IPsec
- IKEv2
- Linux networking
- iptables
- systemd

## Sources Consulted
- strongSwan Installation Documentation: https://docs.strongswan.org/docs/latest/install/install.html
- strongSwan Configuration Files: https://docs.strongswan.org/docs/latest/config/config.html
- strongSwan Introduction: https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan IKEv2 Configuration Examples: https://docs.strongswan.org/docs/latest/config/IKEv2.html
- strongSwan Forwarding and Split-Tunneling: https://docs.strongswan.org/docs/latest/howtos/forwarding.html
- strongSwan Logging: https://docs.strongswan.org/docs/latest/config/logging.html
- strongSwan updown Plugin: https://docs.strongswan.org/docs/latest/plugins/updown.html
- strongSwan FAQ: https://docs.strongswan.org/docs/latest/support/faq.html
- RFC 4303, IP Encapsulating Security Payload (ESP): https://datatracker.ietf.org/doc/html/rfc4303
- RFC 7296, Internet Key Exchange Protocol Version 2 (IKEv2): https://datatracker.ietf.org/doc/html/rfc7296

## Issues Found
- The RHEL/CentOS install snippet omitted the EPEL repository even though the official strongSwan installation docs point to Red Hat Enterprise Linux and CentOS packages via EPEL. I added `sudo dnf install epel-release -y` before installing `strongswan`.
- The post installed the legacy `strongswan` package/backend but then used the `strongswan` systemd unit. Official strongSwan documentation distinguishes the modern `strongswan.service` (`charon-systemd` with `swanctl`) from the legacy `strongswan-starter.service` (`ipsec.conf`/`stroke`). I changed the start and log commands to use `strongswan-starter`.
- The connection definition used `right=%any` with `auto=add`, which is a passive roadwarrior/responder-style setup. In that configuration, `ipsec up vpn-psk` is not the correct next step for this generic server-side example. I removed that command and clarified that `auto=add` loads the connection and waits for clients.
- The forwarding/NAT section was incomplete for a full-tunnel remote-access gateway. Official strongSwan forwarding guidance requires IP forwarding and, on restrictive firewalls, explicit forwarding allowance; it also recommends exempting IPsec-matching traffic from NAT before a general `MASQUERADE` rule. I added `FORWARD` rules and an IPsec policy exemption before the NAT rule.
- The `charondebug` comment described the logging scale incorrectly. strongSwan documents log levels from `-1` through `4`, not `0` through `4`. I corrected the comment.

## Review Notes
- The post is technically correct after the above fixes for the legacy `ipsec.conf` / `ipsec.secrets` / `stroke` backend installed by the `strongswan` package.
- strongSwan upstream currently recommends the newer `swanctl` / `vici` workflow and documents the `ipsec.conf` backend as deprecated and no longer built by default in strongSwan 6.0 upstream builds.
- PSK-based IKE authentication remains weaker than certificate-based authentication, and strongSwan explicitly advises against reusing the same PSK across multiple roadwarrior clients.

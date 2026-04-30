# Validation Summary: How to Configure IPsec Site-to-Site VPN on Linux with strongSwan

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- strongSwan
- IPsec
- IKEv2
- Linux networking
- `ipsec.conf` / `ipsec.secrets`
- `iptables`
- `systemd`
- `sysctl`

## Sources Consulted
- strongSwan Configuration Files: https://docs.strongswan.org/docs/latest/config/config.html
- strongSwan Introduction: https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan Installation Documentation: https://docs.strongswan.org/docs/latest/install/install.html
- strongSwan Algorithm Proposals (Cipher Suites): https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan Security Recommendations: https://docs.strongswan.org/docs/latest/howtos/securityRecommendations.html
- Ubuntu 24.04 `strongswan` and `strongswan-starter` package metadata, inspected locally via `apt-cache show`
- Ubuntu 24.04 `strongswan-starter` package contents, including `ipsec.conf(5)`, `ipsec.secrets(5)`, `ipsec(8)`, and `strongswan-starter.service`, inspected locally from `strongswan-starter_5.9.13-2ubuntu4.24.04.3_amd64.deb`

## Issues Found
- The post set `dpdtimeout=120s` in an IKEv2 configuration. I removed it from both gateway configs because `ipsec.conf(5)` states `dpdtimeout` only applies to IKEv1 and has no effect on IKEv2.
- The post used `systemctl enable strongswan` and `systemctl start strongswan` even though its `apt install strongswan` command installs the legacy `strongswan-starter` backend used by `ipsec.conf` and the `ipsec` CLI. I corrected both commands to `strongswan-starter`.
- The troubleshooting section used `journalctl -u strongswan -f`, which matches the `charon-systemd`/`swanctl` service, not the legacy backend installed by the package in this guide. I corrected it to `journalctl -u strongswan-starter -f`.
- The post told readers to run `ipsec up site-to-site` immediately after starting the daemon without noting that `auto=start` already initiates the tunnel automatically. I clarified that the manual command is only needed if the tunnel is not already established.
- The connectivity test comment implied running `ping 192.168.2.10` directly from the gateway shell. I clarified that this test should be run from a host on Gateway A's LAN so the traffic matches the configured protected subnet.
- The explanation of the `!` suffix was too broad. I corrected it to the precise strongSwan behavior: it prevents strongSwan from appending its default proposals, so only the explicitly configured algorithms are accepted.

## Review Notes
- The guide is technically valid after correction, but it uses the deprecated `ipsec.conf` / `ipsec` stroke-based backend. This is still consistent with the Debian/Ubuntu `strongswan` metapackage installed in the post, while upstream recommends `swanctl` / VICI for modern deployments.
- The configured `ike=` and `esp=` proposals are valid. However, the `esp=` proposal does not include a DH group, so perfect forward secrecy for subsequent CHILD_SA rekeys is not enabled by the ESP proposal. This is not incorrect, but it is a future hardening option.

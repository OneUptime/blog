# Validation Summary: How to Compare WireGuard vs OpenVPN Performance on RHEL

## Status
validated

## Post Type
Tutorial / Benchmarking guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- WireGuard
- OpenVPN
- Easy-RSA
- iperf3
- sysstat (`sar`, `pidstat`)
- iputils `ping`

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Red Hat Enterprise Linux 9 Technology Previews / WireGuard notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.5_release_notes/technology-previews
- Red Hat EPEL support guidance: https://access.redhat.com/solutions/3358
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- OpenVPN 2.6 generated man page: https://build.openvpn.net/man/openvpn-2.6/openvpn.8.html
- wg-quick manual page: https://manpages.debian.org/trixie/wireguard-tools/wg-quick.8.en.html
- iperf3 manual page: https://man.archlinux.org/man/iperf3.1.en
- iputils ping manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- Local OpenVPN, ping, sar, and pidstat command help output was also checked where available.

## Issues Found
- The setup section did not mention that WireGuard is an unsupported Technology Preview on RHEL 9 or that EPEL packages are community-supported outside Red Hat production SLAs. Added a short caveat so the benchmark does not imply production support.
- The OpenVPN section described AES-256-GCM as "the recommended cipher" and configured only `AES-256-GCM`. OpenVPN 2.5+ uses `data-ciphers` negotiation, with AES-GCM defaults and OpenVPN 2.6 optionally adding ChaCha20-Poly1305 depending on build support. Updated the wording and example to use an AES-GCM negotiation list: `AES-256-GCM:AES-128-GCM`.
- The OpenVPN comparison table said TCP/443 can "blend with HTTPS" and that OpenVPN can "tunnel through HTTPS." OpenVPN can run on TCP/443 and supports HTTP proxy traversal, but it is not the same as HTTPS traffic. Reworded those entries.
- The table described OpenVPN dynamic IP assignment as "Built-in DHCP." For typical `tun` deployments OpenVPN uses server mode and address pools, not DHCP in the usual LAN sense. Reworded it as "Built-in address pools."

## Review Notes
The benchmark commands, WireGuard `wg-quick` fields, OpenVPN `data-ciphers`/`auth`/`connect-timeout` options, `iperf3` flags, and `ping` flags were otherwise consistent with the referenced documentation. The example OpenVPN server config remains intentionally abbreviated because certificate/key and `server`/address-pool directives are represented by the existing standard config placeholder.

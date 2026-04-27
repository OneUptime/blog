# Validation Summary: How to Configure OpenVPN for IPv4 Site-to-Site Connectivity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenVPN 2.5+ (community edition)
- IPv4 routed VPN tunnels (`dev tun`)
- Static-key (pre-shared secret) mode
- Certificate (PKI / TLS) mode with client-config-dir and iroute
- Linux IPv4 forwarding (`net.ipv4.ip_forward`)
- `iproute2` (`ip route`)

## Sources Consulted
- OpenVPN 2.6 manual page (openvpn.8): https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/
- OpenVPN HOWTO — "Expanding the scope of the VPN to include additional machines on either the client or server subnet": https://openvpn.net/community-resources/how-to/
- OpenVPN 2.5 release notes covering the `--genkey` subcommand syntax change (`openvpn --genkey secret <file>`)
- OpenVPN man page sections on `--server`, `--ifconfig-push`, `--client-config-dir`, `--iroute`, `--client-to-client`, `--keepalive`, `--topology`
- RFC 5737 (use of 203.0.113.0/24 as documentation address space)
- Linux kernel networking documentation on `net.ipv4.ip_forward`

## Issues Found

1. **Server config missing `client-config-dir`.** The Option 2 server snippet references a CCD file (`/etc/openvpn/ccd/remote-site`) but did not include the `client-config-dir` directive, so OpenVPN would never read that file. Replaced the misleading `client-to-client` line with `client-config-dir /etc/openvpn/ccd`, which is what is actually required for per-client `iroute` entries to take effect.

2. **Incorrect claim about `client-to-client`.** The comment stated that `client-to-client` is "Required for routes to work with certificate-based clients." This is wrong: `client-to-client` only affects whether OpenVPN internally bridges traffic between connected clients (bypassing the kernel routing table). Routing to client-side LANs is done via `route` + `client-config-dir` + `iroute`. The line was removed along with its incorrect comment.

3. **Invalid `ifconfig-push` pair for net30 topology.** The original `ifconfig-push 10.8.0.10 10.8.0.11` uses `10.8.0.11`, which is the broadcast address of the `10.8.0.8/30` block. Under OpenVPN's default `net30` topology, the two IPs supplied to `ifconfig-push` must be the two host endpoints of an unused /30. Corrected to `ifconfig-push 10.8.0.10 10.8.0.9`, which is a valid pair within `10.8.0.8/30`.

## Review Notes
- The `openvpn --genkey secret <file>` subcommand form is correct for OpenVPN 2.5+. Readers on OpenVPN 2.4 or older would need the legacy `--genkey --secret <file>` form, but 2.5 has been the stable line since 2020 so the new form is the right default.
- The post implicitly relies on OpenVPN's default `net30` topology. Modern setups commonly use `topology subnet`, in which case `ifconfig-push` takes the form `<ip> <netmask>` rather than a /30 pair. Adding an explicit `topology subnet` line on both server and client would future-proof the config and avoid the net30 pairing pitfall, but the current configuration is internally consistent with the default and works correctly as written.
- The remote client config could optionally include `nobind`, `persist-key`, `persist-tun`, `resolv-retry infinite`, and `remote-cert-tls server` for robustness and to mitigate MITM during the TLS handshake, but their absence is not a correctness error.
- `203.0.113.1` is correctly used as a documentation/example public IP per RFC 5737. The private subnets `192.168.1.0/24` and `192.168.2.0/24` and the VPN subnets `10.7.0.0/24` / `10.8.0.0/24` are all in RFC 1918 ranges and appropriate for example use.
- The trailing explanation that `iroute` "tells the OpenVPN server to direct traffic for that subnet through the specified client connection" is accurate. Worth noting (not added to the post): a matching `route` line in the main server config is also required so the kernel sends those packets into `tun0` in the first place — the post already includes `route 192.168.2.0 255.255.255.0` on the server, so this is satisfied.

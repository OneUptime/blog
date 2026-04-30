# Validation Summary: How to Handle Fragmentation with GRE Tunnels

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- GRE
- MTU
- IP fragmentation
- Path MTU Discovery (PMTUD)
- Linux `iproute2`
- Linux `iptables` / `TCPMSS`
- `systemd-networkd`
- IPsec / ESP

## Sources Consulted
- Linux `ip-tunnel(8)` manual page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- Linux `iptables-extensions(8)` manual page, `TCPMSS` target: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux `ping(8)` manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- Linux kernel IP sysctl documentation (`ip_no_pmtu_disc`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `systemd.netdev` manual page: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- `systemd.network` manual page: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- `networkctl` manual page: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784
- RFC 2890, Key and Sequence Number Extensions to GRE: https://www.rfc-editor.org/rfc/rfc2890.html
- RFC 4303, IP Encapsulating Security Payload (ESP): https://www.rfc-editor.org/rfc/rfc4303.html

## Issues Found
- The introduction said packets may be "silently dropped if DF bit is set." That is too absolute. In the documented Linux/IPv4 behavior, DF-related oversize packets are normally dropped with an ICMP fragmentation-needed error. I corrected the sentence accordingly.
- The GRE/IPsec overhead section treated IPsec transport-mode overhead as a fixed 58 bytes. RFC 4303 shows ESP overhead depends on the negotiated transform and can include variable IV, padding, and integrity data. I changed the text to say the overhead varies by ESP settings and kept 1418 bytes only as an example calculation.
- The GRE options line said "optional checksum/key" while subtracting only 4 bytes. GRE checksum and GRE key are separate optional 4-byte additions. I corrected the wording to "checksum or key" so the arithmetic matches the text.
- The DF-handling section incorrectly used `/proc/sys/net/ipv4/ip_no_pmtu_disc` as if it directly described GRE tunnel DF behavior, and it used `nopmtudisc` as if it were the setting that ignores DF. The `ip-tunnel(8)` documentation distinguishes `nopmtudisc` from `ignore-df`, and also notes that fixed `ttl` is incompatible with `nopmtudisc`. I rewrote that section to use the GRE DF-suppression setting via `ip link set ... type gre ignore-df` / `noignore-df`, and left `pmtudisc` as the default PMTU behavior.
- The fragment-capture example used `tcpdump -i gre1`, which observes packets on the tunnel interface rather than the outer fragmented packets on the physical underlay. I changed the example to discover the underlay interface and capture there instead.

## Review Notes
- The fixed MSS example of 1436 is correct for IPv4 TCP over a basic IPv4 GRE tunnel with a 1476-byte tunnel MTU. The post already mentions `--clamp-mss-to-pmtu`, which is generally the safer operational choice when the effective path MTU can vary.
- The `systemd-networkd` examples are valid. `networkctl reload` will reload `.netdev` and `.network` files; for modified existing `.netdev` definitions, `systemd-networkd` does not recreate the netdev automatically, which is worth keeping in mind operationally.

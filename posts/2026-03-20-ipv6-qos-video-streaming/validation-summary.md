# Validation Summary: How to Configure IPv6 QoS for Video Streaming

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DiffServ / DSCP
- Linux nftables
- Linux traffic control (`tc`, HTB, FQ-CoDel)
- Nginx
- iperf3
- tcpdump
- FFmpeg / ffplay
- IPv6 multicast

## Sources Consulted
- RFC 4594, DiffServ service-class guidance for multimedia streaming and conferencing: https://www.rfc-editor.org/rfc/rfc4594.html
- RFC 3849, IPv6 documentation prefix `2001:db8::/32`: https://www.rfc-editor.org/info/rfc3849
- nftables man page, IPv6 hooks and DSCP handling: https://netfilter.org/projects/nftables/manpage.html
- `tc-u32(8)`, IPv6 Traffic Class matching with `match ip6 priority`: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- `ip-maddress(8)`, note that `ip maddr` does not join protocol multicast groups: https://man7.org/linux/man-pages/man8/ip-maddress.8.html
- `ip-link(8)`, interface statistics via `ip -s link show`: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Nginx core `listen` directive documentation, including `http2` parameter deprecation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx HTTP/2 module documentation, current `http2 on;` syntax: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- FFmpeg protocol documentation for UDP multicast reception and `localaddr=`: https://ffmpeg.org/ffmpeg-protocols.html
- `tcpdump(8)` manual page for command syntax and expression placement: https://man7.org/linux/man-pages/man8/tcpdump.8.html

## Issues Found
- The post marked streaming traffic as AF41 in multiple places. RFC 4594 classifies multimedia streaming under AF31 and conferencing separately, so I changed the streaming guidance to AF31 and kept AF41 for interactive video.
- The nftables example used a `prerouting` chain with destination-port matches, which does not correctly describe marking locally generated egress video delivery from a server. I changed it to `postrouting`, switched to service source ports for outbound traffic, and constrained HTTPS/HLS marking to a dedicated streaming subnet so it no longer implies that all port 443 traffic is video.
- The `tc` filter example matched a raw byte offset that does not correctly isolate the IPv6 Traffic Class field. I replaced it with `u32 match ip6 priority`, and added separate AF41 and AF31 filters so conferencing and streaming classes map correctly.
- The Nginx snippet used `listen ... http2`, which the current Nginx docs mark as deprecated. I updated it to `listen [::]:443 ssl;` with `http2 on;`.
- Several example IPv6 addresses were invalid because they embedded non-hex text such as `video-server`, `server`, `source`, and `streaming`. I replaced them with valid RFC 3849 documentation addresses.
- The `tcpdump` verification command had option ordering problems and checked for AF41 while the corrected streaming class is AF31. I fixed the command ordering and the expected Traffic Class value.
- The "continuous bandwidth monitoring" command read `/proc/net/if_inet6`, which lists IPv6 interface address data rather than bandwidth or packet counters. I replaced it with `ip -s link show dev eth0` and updated the description accordingly.
- The multicast join example used `ip -6 maddr add`, but `ip-maddress(8)` explicitly says this does not join protocol multicast groups. I removed that line, used the receiving application (`ffplay`) to join the group via the UDP URL, and tightened the firewall example to the specific group and port.
- The opening paragraph said QoS would "guarantee" minimum bandwidth. I changed that to "reserve" minimum bandwidth to avoid overstating what a local QoS policy can ensure end to end.

## Review Notes
- The HLS/HTTPS classification now explicitly assumes dedicated origin addresses. If general web traffic and HLS share the same `443` listener and address, L4-only classification cannot reliably distinguish video delivery from other HTTPS traffic.
- The post still mixes nftables and `ip6tables` examples. That is technically valid on many Linux systems, but converting the firewall example to nftables later would make the article more internally consistent.

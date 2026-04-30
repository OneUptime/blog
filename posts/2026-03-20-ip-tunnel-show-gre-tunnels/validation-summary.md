# Validation Summary: How to Use ip tunnel show to Inspect GRE Tunnels

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `iproute2`
- `ip` networking CLI
- GRE tunnels
- GRETAP tunnels
- IPIP and SIT tunnels
- Bash shell scripting

## Sources Consulted
- `ip-tunnel(8)` upstream manual: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- `ip-link(8)` upstream manual: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-address(8)` upstream manual: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip(8)` upstream manual: https://man7.org/linux/man-pages/man8/ip.8.html
- `iproute2` upstream source for `ip tunnel show`: https://github.com/iproute2/iproute2/blob/main/ip/iptunnel.c
- `iproute2` upstream source for tunnel mode strings: https://github.com/iproute2/iproute2/blob/main/ip/tunnel.c

## Issues Found
- The intro said `ip tunnel show` lists all tunnel interfaces on the system. I narrowed this to tunnel interfaces handled by `ip tunnel`, because GRE TAP and some other tunnel link types are inspected through `ip link`.
- The sample output labeled `tunl0` as `ipip/ip` and `sit0` as `sit/ip`. Upstream `iproute2` prints these mode strings as `ip/ip` and `ipv6/ip`, so I corrected the examples.
- The post described `ip -d tunnel show` as a way to get detailed tunnel output. Current `iproute2` does not add extra `ip tunnel` detail for `-d`, so I changed the example back to plain `ip tunnel show`.
- The stats section used `ip -s tunnel show gre1` to imply packet and byte counters come from `ip tunnel`. I changed this to `ip -s link show gre1`, which is the interface-statistics view that actually exposes counters.
- The shell example filtered tunnels with `grep "^gre"`, which misses GRE tunnels whose interface names do not start with `gre`. I changed the filter to match the reported tunnel mode field `gre/ip` instead.
- The output explanation treated `nopmtudisc` as part of the sample line even though it is optional. I clarified it as optional when shown.

## Review Notes
- Current `iproute2` behavior and `ip tunnel help` accept `ip tunnel show <name>`, but the published `ip-tunnel(8)` man page still says `ip tunnel show` has no arguments. The example in the post matches current tool behavior.
- Default devices such as `gre0`, `tunl0`, and `sit0` can vary by kernel modules and distro configuration, so readers may not see the exact same baseline list on every host.

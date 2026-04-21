# Validation Summary: How to Use traceroute vs tracepath on Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux networking
- traceroute
- tracepath
- Path MTU Discovery
- iproute2 `ip link`
- PPPoE MTU behavior

## Sources Consulted
- Linux `traceroute(8)` manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- Traceroute for Linux project page: https://traceroute.sourceforge.net/
- Linux `tracepath(8)` manual page: https://man7.org/linux/man-pages/man8/tracepath.8.html
- iputils upstream `tracepath` documentation: https://raw.githubusercontent.com/iputils/iputils/master/doc/tracepath.xml
- Linux `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- RFC 2516, PPP over Ethernet: https://www.rfc-editor.org/rfc/rfc2516
- Local command help: `tracepath -h`, `tracepath -V`, `ip link help`

## Issues Found
- The post described Path MTU discovery as unique to `tracepath` and listed `traceroute` MTU discovery as unavailable. Updated the description and comparison table to say `tracepath` discovers Path MTU by default, while Linux `traceroute` supports optional MTU discovery with `--mtu`; added a minimal `traceroute --mtu -n 8.8.8.8` example.
- The privilege comparison overstated `traceroute` root requirements. Updated it to distinguish default UDP traceroute, which is unprivileged in modern Linux traceroute, from raw ICMP/TCP methods that may need elevated privileges or capabilities.
- The `tracepath` output explanation overstated precision for MTU and asymmetric-route reporting. Updated `pmtu` and `asymm` descriptions to reflect that Path MTU is reported when detected and return-hop asymmetry is estimated.
- The comments around ICMP/TCP traceroute implied firewall behavior too strongly. Reworded them to describe the probe types and possible filtering more accurately.
- The installation row contained an incomplete `sudo apt install` command. Updated it to package-specific Debian/Ubuntu commands for `traceroute` and `iputils-tracepath`.
- The MTU troubleshooting example stated a failure cause too definitively and used a less explicit `ip link` form. Updated it to "can explain" and changed the command to the documented `ip link set dev tun0 mtu 1420` form.

## Review Notes
`tracepath` is a good first tool for unprivileged Path MTU checks, but its output can still be affected by firewall policy, ICMP filtering, asymmetric routing, and incomplete ICMP error data from routers. `traceroute` was not installed in the local environment, so its options were verified against the upstream Linux traceroute manual and project documentation rather than by local execution.

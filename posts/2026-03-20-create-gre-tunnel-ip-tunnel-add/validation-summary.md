# Validation Summary: How to Create a GRE Tunnel with ip tunnel add

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GRE (Generic Routing Encapsulation) - RFC 2784
- Linux `iproute2` (`ip` command suite)
- IPv4 networking
- `sysctl` for IP forwarding

## Sources Consulted
- RFC 2784 - Generic Routing Encapsulation (GRE): https://datatracker.ietf.org/doc/html/rfc2784
- iproute2 `ip-tunnel(8)` man page: https://man7.org/linux/man-pages/man8/ip-tunnel.8.html
- iproute2 `ip-link(8)` man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- iproute2 `ip-route(8)` man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux kernel networking documentation on IP forwarding (`net.ipv4.ip_forward`): https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- Bash reference manual (line continuation behavior): https://www.gnu.org/software/bash/manual/bash.html

## Issues Found

1. **Broken bash line continuations with inline comments (Host A and Host B tunnel creation blocks)**: The original code used inline `#` comments after a `\` line-continuation marker that was followed by spaces, like:
   ```
   sudo ip tunnel add gre1 mode gre \
     local 10.0.0.1 \      # This host's public IP
   ```
   In bash, when `\` is followed by a space (rather than a newline), it escapes the space rather than continuing the line. The subsequent `#` then starts a comment that runs to end-of-line, terminating the command before the rest of its arguments. Pasted as-is, the command would fail. **Fix:** Moved the explanatory comments above the command block and removed the inline `#` comments so the line continuations work correctly.

## Review Notes

- The post uses `10.0.0.x` to represent "public" addresses. These are actually RFC 1918 private addresses, but using them in tutorial diagrams is a long-standing convention to avoid putting real public IPs in examples. Not a technical error in the commands themselves.
- The GRE overhead claim (24 bytes = 20-byte outer IPv4 header + 4-byte GRE header) is correct per RFC 2784 for the basic GRE header without optional checksum/key/sequence-number fields. If those optional fields are enabled, overhead increases by 4 bytes each.
- The MTU calculation (1500 - 24 = 1476) is correct for GRE-over-IPv4 over a 1500-byte path. Note that real-world deployments often need to account for additional path-MTU constraints (e.g., GRE over IPsec or over a PPPoE link).
- `ip tunnel add ... mode gre` is the legacy syntax and remains supported in current iproute2. The newer equivalent is `ip link add name gre1 type gre local ... remote ...`. Both work; the legacy form chosen here is fine and is what the post title advertises.
- `ip tunnel show` continues to work; `ip -d link show gre1` produces more detailed output in modern iproute2 if a reader wants more inspection options.
- GRE point-to-point tunnels created via `ip tunnel add ... mode gre` actually create an interface of kernel type `gre` (not `gretap`), which carries IP packets directly. This matches what the post is trying to do.

# Validation Summary: How to Use HAProxy resolvers Section for Dynamic IPv4 Server Discovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- HAProxy Runtime API
- DNS resolver configuration
- DNS A-record service discovery
- Consul DNS service discovery
- `socat`

## Sources Consulted
- HAProxy 3.2 Configuration Manual: https://docs.haproxy.org/3.2/configuration.html
- HAProxy DNS Resolution Tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/dns-resolution/
- HAProxy Runtime API Installation: https://www.haproxy.com/documentation/haproxy-runtime-api/installation/
- HAProxy Runtime API `show resolvers`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-resolvers/
- HAProxy Runtime API `show servers state`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-servers-state/
- HAProxy Runtime API `set server`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/set-server/

## Issues Found
- The comment on `accepted_payload_size 8192` was incorrect. It said the directive accepts IP changes without a reload, but the directive actually sets the maximum DNS payload size HAProxy accepts and advertises. I corrected the comment to match the configuration manual.
- The `init-addr` explanation was incorrect. It said `none` causes startup failure when DNS is unavailable, but HAProxy documents `none` as allowing startup without an address so runtime resolution can happen later. I corrected the explanation and changed the direct server examples from `init-addr last` to `init-addr last,none` so they do not fail on first startup when no saved address exists.
- The `server-template` explanation mismatched the example. It said HAProxy would populate `server1` through `server10`, but the configured prefix is `svc`, so the generated server names are `svc1` through `svc10`. I corrected the comment.
- The Runtime API section overstated what commands do. `show resolvers` reports resolver statistics, not cached entries, and `set server ... fqdn ...` is documented as setting the server FQDN dynamically, not as a supported way to bypass the DNS cache or force an immediate re-resolution. I corrected the wording and removed the unsupported claim.
- The `socat` examples for the UNIX admin socket were not written in the documented `unix-connect:` form. I updated the commands to use `unix-connect:/run/haproxy/admin.sock` and added the matching `stats socket` directive in the example configuration so the commands have the required socket.
- The logging section assumed `/var/log/haproxy.log` always exists and presented sample messages as expected output. Because HAProxy logs go through syslog, the actual destination depends on system logging configuration. I changed the wording to make the file path conditional and the example log lines illustrative rather than guaranteed.
- The conclusion attributed DNS query control too broadly to `hold` timers. I adjusted the wording so it correctly describes resolver timeouts and `hold` periods as balancing update responsiveness with backend state stability.

## Review Notes
- `resolve-prefer ipv4` prefers IPv4 when both IPv4 and IPv6 answers are available. On HAProxy 3.2 and newer, `dns-accept-family ipv4` is available if strict IPv4-only DNS acceptance is required.
- A local `haproxy` binary was not available in the workspace, so syntax and behavior were validated against official HAProxy documentation rather than by running `haproxy -c`.

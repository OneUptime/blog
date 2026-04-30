# Validation Summary: How to Set Up HAProxy DNS Resolution with resolve-prefer ipv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- DNS
- DNS A and AAAA records
- DNS SRV records
- HAProxy Runtime API / admin socket
- `socat`

## Sources Consulted
- HAProxy Configuration Manual 3.1: https://docs.haproxy.org/3.1/configuration.html
- HAProxy Management Guide 3.2: https://docs.haproxy.org/3.2/management.html
- HAProxy DNS resolution tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/dns-resolution/
- HAProxy Runtime API `show resolvers`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-resolvers/
- HAProxy Runtime API `set server`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/set-server/
- HAProxy Runtime API `show servers state`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-servers-state/

## Issues Found
- The post described `hold valid` as a TTL override and implied that it controls when backend server hostnames are re-resolved. The HAProxy configuration manual does not describe it that way for dynamic server resolution, so I removed the incorrect TTL wording and updated the DNS failover note.
- The DNS SRV `server-template` example hardcoded `:80`, but the official HAProxy SRV example uses the SRV records to populate the port. I removed the hardcoded port and clarified the comment.
- The `show resolvers` command was described as showing the DNS resolution cache, but the Runtime API documents it as resolver statistics. I corrected the description.
- The `set server ... fqdn` example was described as forcing a re-resolution, but the Runtime API documents that command as changing a server's FQDN at runtime. I corrected the description.
- The conclusion overstated the behavior of `resolve-prefer ipv4`. I revised it to say that HAProxy prefers IPv4 when both A and AAAA records are available.

## Review Notes
- For HAProxy 3.2 and newer, `dns-accept-family ipv4` is another official option when you want to accept only IPv4 DNS answers. `resolve-prefer ipv4` is a preference, not a blanket ban on IPv6 results.
- The post's examples assume the HAProxy Runtime API/admin socket is already enabled at `/run/haproxy/admin.sock`.

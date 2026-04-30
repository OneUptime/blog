# Validation Summary: How to Configure HAProxy IPv6-to-IPv4 Gateway

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- IPv6
- IPv4
- Dual-stack networking
- HTTP reverse proxying
- TLS/SSL termination
- `X-Forwarded-For`
- `curl`
- `ss`

## Sources Consulted
- HAProxy Configuration Manual 3.2: https://docs.haproxy.org/3.2/configuration.html
- HAProxy Frontends tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/frontends/
- HAProxy X-Forwarded-For tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/client-ip-preservation/add-x-forward-for-header/
- HAProxy Forwarded header tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/client-ip-preservation/add-forwarded-header/
- curl official man page: https://curl.se/docs/manpage.html?force_isolation=true
- Local CLI help: `curl --help all`
- Local CLI help: `ss --help`

## Issues Found
- The IPv6 bind examples used `:::80`, `:::443`, and `2001:db8::1:80`. I changed them to `bind [::]:80 v4v6`, `bind [::]:443 v4v6 ...`, and `bind [2001:db8::1]:80` to match HAProxy's documented IPv6 listener examples and remove ambiguity in the address format.
- The explanation of `v4v6` described it as directly enabling `IPV6_V6ONLY=0`. I rewrote this to the documented behavior: HAProxy uses a dual-stack listener on the default IPv6 address so one listener can accept both IPv6 and IPv4 connections.
- The verification and takeaway wording around `option forwardfor` and listener checks was slightly imprecise. I tightened that language so it correctly describes passing the client address to the backend in `X-Forwarded-For` and checking that HAProxy is listening on the expected ports.

## Review Notes
- The post is technically relevant and salvageable; it remains a valid configuration guide after the corrections above.
- HAProxy's official documentation also notes the standardized `Forwarded` header as a newer alternative to `X-Forwarded-For` in supported versions, but the post's use of `option forwardfor` remains valid and current.
- The local environment did not have a `haproxy` binary installed, so the review validated configuration syntax and behavior against HAProxy's official documentation rather than running `haproxy -c` locally.

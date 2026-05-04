# Validation Summary: How to Configure HAProxy Dual-Stack with v4v6 Option

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- IPv4
- IPv6
- TLS/SSL
- `curl`

## Sources Consulted
- HAProxy configuration tutorials: Frontends - https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/frontends/
- HAProxy configuration tutorials: ACLs - https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/acls/
- HAProxy configuration tutorials: Global TLS settings - https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/global-tls-settings/
- HAProxy Configuration Manual 3.2 - https://docs.haproxy.org/3.2/configuration.html

## Issues Found
- The HTTPS example placed `ssl-default-bind-options ssl-min-ver TLSv1.2` inside a `frontend`. HAProxy documents `ssl-default-bind-options` as a global directive, so the example was corrected to use the per-bind `ssl-min-ver TLSv1.2` argument on the `bind` line.
- The `v4v6` ACL section implied that IPv4 ACLs must be written in IPv4-mapped IPv6 form. HAProxy's ACL matching supports plain IPv4 patterns against `::ffff:A.B.C.D` client addresses, so the example was corrected to use standard IPv4 CIDR notation and to clarify that mapped formatting mainly affects logging and readability.
- The comparison table said `v4v6` would not work with `bindv6only=1`. HAProxy documents `v4v6` as specifically useful on systems that bind IPv6 sockets as IPv6-only by default, so that row was corrected.
- The log-validation command used `grep -E '\[.*:.*\]|::ffff'`, which can match HAProxy timestamps rather than the client address field. It was replaced with a direct log-inspection command and an explanatory note.
- The IPv6 `curl` example used the documentation prefix `2001:db8::/32` as a literal destination. It was changed to `curl -6 http://example.com/` so the example tests IPv6 on a dual-stack hostname instead of a reserved documentation address.

## Review Notes
- The post is technically relevant and salvageable; after the corrections above, it is accurate.
- Local `haproxy` binary validation was not possible in this workspace because `haproxy` is not installed, so syntax and behavior were verified against the official HAProxy documentation instead.

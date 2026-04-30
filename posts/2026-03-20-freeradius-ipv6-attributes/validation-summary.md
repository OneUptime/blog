# Validation Summary: How to Configure FreeRADIUS with IPv6 Attributes

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- FreeRADIUS
- RADIUS
- IPv6
- MySQL/PostgreSQL-backed FreeRADIUS configuration
- Linux networking and service management
- RFC 3162 and RFC 4818

## Sources Consulted
- FreeRADIUS default virtual server documentation: https://networkradius.com/doc/current/raddb/sites-available/default.html
- FreeRADIUS client definition documentation: https://networkradius.com/doc/current/raddb/clients.html
- FreeRADIUS SQL module documentation: https://networkradius.com/doc/current/raddb/mods-available/sql.html
- FreeRADIUS detail module documentation: https://networkradius.com/doc/current/raddb/mods-available/detail.html
- FreeRADIUS IP address data type documentation: https://networkradius.com/doc/current/raddb/syntax/data_ip.html
- FreeRADIUS `radclient` man page: https://www.freeradius.org/radiusd/man/radclient.html
- FreeRADIUS `radtest` man page: https://www.freeradius.org/radiusd/man/radtest.html
- RFC 3162, RADIUS and IPv6: https://datatracker.ietf.org/doc/rfc3162/
- RFC 4818, RADIUS Delegated-IPv6-Prefix Attribute: https://www.rfc-editor.org/rfc/rfc4818

## Issues Found
- The post used invalid IPv6 examples such as `2001:db8:nas::1` and `2001:db8::radius`. These were replaced with valid documentation-prefix IPv6 addresses.
- The IPv6 listener example mixed `type = auth+acct` on port `1812` with a separate accounting listener on `1813`, and the comment pointed at the wrong file. The example was corrected to use separate `auth` and `acct` IPv6 listeners in `sites-enabled/default-ipv6`.
- The `clients.conf` examples used `nastype`, but FreeRADIUS documents this field as `nas_type`. This was corrected.
- The dual-stack NAS example defined both `ipaddr` and `ipv6addr` in one `client` block. FreeRADIUS documents that only one of `ipaddr`, `ipv4addr`, or `ipv6addr` may be specified per client, so the example was split into separate IPv4 and IPv6 client blocks.
- The SQL module example used `read_clients = yes`, but the documented directive is `readclients = yes`. This was corrected.
- The `Framed-IPv6-Route` examples omitted a metric. RFC 3162 describes the route text format as destination prefix, gateway, and metric(s), so the examples were updated to include a metric.
- The testing section incorrectly claimed that `radtest` does not support IPv6. The section was corrected to focus on `radclient`, which is the more flexible tool for these IPv6-specific attribute examples.
- The test commands used a shared secret that did not match the sample NAS client. The commands were updated to use `naspassword` so the examples are internally consistent.
- The dictionary include example only added `dictionary.rfc3162`, even though the post also relies on `Delegated-IPv6-Prefix` from RFC 4818. An include for `dictionary.rfc4818` was added.
- The description of `Framed-IPv6-Prefix` as only assigning `/128` or `/64` was too narrow. It was updated to describe the attribute more generally as an assigned IPv6 prefix.

## Review Notes
- The post is now technically correct for FreeRADIUS 3.x-style Debian/Ubuntu layouts such as `/etc/freeradius/3.0`; other distributions and FreeRADIUS 4.x use different paths and configuration structure.
- Exact behavior for `Framed-IPv6-Prefix`, `Framed-IPv6-Route`, and `Framed-IPv6-Pool` still depends on NAS support, even though the attribute syntax and FreeRADIUS-side configuration shown here are correct.

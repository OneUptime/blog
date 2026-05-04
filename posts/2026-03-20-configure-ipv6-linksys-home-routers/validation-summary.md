# Validation Summary: How to Configure IPv6 on Linksys Home Routers

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- IPv6 (addressing, SLAAC, DHCPv6, Prefix Delegation)
- Linksys Smart Wi-Fi firmware (EA7500, EA8300, EA9500)
- Linksys MR series (MR7350, MR9600)
- Linksys Velop mesh (MX4200, MX10600, WHW03)
- Linksys mobile app
- Router Advertisement options (RDNSS)
- DUID (DUID-LLT)
- Linux/macOS IPv6 verification utilities (`ip`, `ping6`, `curl`)

## Sources Consulted
- Linksys Smart Wi-Fi / Velop support pages on IPv6 configuration (https://www.linksys.com/support-article)
- Linksys product specification pages confirming IPv6 support for the listed EA, MR, and Velop models
- RFC 8415 — Dynamic Host Configuration Protocol for IPv6 (DHCPv6), DUID types
- RFC 8106 — IPv6 Router Advertisement Options for DNS Configuration (RDNSS)
- RFC 4291 — IP Version 6 Addressing Architecture (link-local fe80::/10)
- Google Public DNS IPv6 documentation (https://developers.google.com/speed/public-dns/docs/using) — confirms 2001:4860:4860::8888 / ::8844
- iproute2 `ip` manual page for `ip -6 addr show scope global`
- curl manual for the `-6` flag

## Issues Found
No technical issues found.

## Review Notes
- The default management URL `http://linksyssmartwifi.com` is historically valid; current Linksys firmware also accepts `http://myrouter.local`. Either works, so the post is not incorrect.
- Default credentials of `admin/admin` reflect older Linksys defaults; newer Smart Wi-Fi setups prompt the user to set a password during initial setup, with the username often blank. The note to change credentials is appropriate.
- `ping6` is being phased out on modern Linux distributions in favor of `ping -6` (or unified `ping`), but it remains available on macOS and many current Linux installs, so the command is still functional for the target audience.
- The /56 prefix delegation size shown is a reasonable default; some ISPs hand out /60 or /64, so users may need to adjust based on what their ISP delegates. This is acceptable as written since /56 is requested, not assumed delivered.

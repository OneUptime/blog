# Validation Summary: How to Configure Apache mod_remoteip for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- `mod_remoteip`
- IPv6
- `X-Forwarded-For`
- `X-Real-IP`
- Reverse proxies and load balancers

## Sources Consulted
- Apache HTTP Server `mod_remoteip` documentation: https://httpd.apache.org/docs/current/en/mod/mod_remoteip.html
- Apache HTTP Server `mod_log_config` documentation: https://httpd.apache.org/docs/current/en/mod/mod_log_config.html
- Debian `a2enmod` man page: https://manpages.debian.org/bookworm/apache2/a2enmod.8.en.html
- Debian `a2enconf` man page: https://manpages.debian.org/bookworm/apache2/a2enconf.8.en.html

## Issues Found
- Several IPv6 examples used invalid placeholder addresses such as `2001:db8::client`, `2001:db8::lb`, and `2001:db8:lb::/64`. These are not syntactically valid IPv6 literals, so they were replaced with valid documentation addresses from `2001:db8::/32`.
- The post said `%h` was `REMOTE_ADDR`. In Apache logging, `%h` is the remote host name or address, while `%a` is the client IP address. The wording was corrected to avoid conflating `%h` with `REMOTE_ADDR`.
- The log format used `%O`, which depends on `mod_logio`. The example was changed to `%b` so it works without requiring an additional logging module that the post did not mention.
- The verification example used `/server-info` and `SetHandler modinfo`, which does not validate the rewritten client IP and used the wrong handler name for that purpose. It was replaced with a working verification flow based on a trusted local proxy test, access-log inspection, or checking `REMOTE_ADDR` from a script.
- The `RemoteIPTrustedProxy` versus `RemoteIPInternalProxy` explanation was inaccurate. The comments were updated to reflect Apache’s documented distinction between trusted proxies and internal proxies.
- One `RemoteIPInternalProxy` example used an invalid IPv6 literal (`2001:db8::internal-proxy`). It was replaced with a valid IPv6 example.

## Review Notes
- Debian-specific commands and paths in the post (`a2enmod`, `a2enconf`, `/etc/apache2/conf-available/remoteip.conf`, `/var/log/apache2/access.log`) are appropriate for Debian/Ubuntu, but they are not portable to every Apache distribution.
- `mod_remoteip` only trusts forwarded IP headers from addresses configured with `RemoteIPTrustedProxy` or `RemoteIPInternalProxy`; local testing will not work unless loopback is trusted or the request comes through a configured proxy.

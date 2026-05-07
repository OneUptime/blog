# Validation Summary: How to Configure Apache Logging to Record IPv4 Client Addresses

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Apache HTTP Server
- `mod_log_config`
- `mod_remoteip`
- `mod_setenvif`
- Apache access logging and `CustomLog`
- Debian/Ubuntu Apache helper commands (`a2enmod`)

## Sources Consulted
- Apache HTTP Server `mod_log_config` documentation: https://httpd.apache.org/docs/current/en/mod/mod_log_config.html
- Apache HTTP Server `mod_remoteip` documentation: https://httpd.apache.org/docs/current/en/mod/mod_remoteip.html
- Apache HTTP Server core documentation for `HostnameLookups`: https://httpd.apache.org/docs/current/en/mod/core.html#hostnamelookups
- Apache HTTP Server expression syntax documentation: https://httpd.apache.org/docs/current/expr.html
- Debian manpage for `a2enmod`: https://manpages.debian.org/bookworm/apache2/a2enmod.8.en.html
- Debian manpage for `a2enconf`: https://manpages.debian.org/bookworm/apache2/a2enconf.8.en.html

## Issues Found
1. **`common` and `combined` were described as built-in formats and used the wrong byte token**: Apache documents these as standard log format layouts that are typically assigned nicknames with `LogFormat`; they are not intrinsic built-ins. The post also used `%O`, which requires `mod_logio`, where the documented standard layouts use `%b`. I changed the wording and updated the examples to the documented `%b` forms.
2. **The custom format comments did not match the fields being logged**: The detailed format comment said it logged forwarded IPs and upstream information, but the format only logged the processed client IP and the underlying connection IP. I corrected the description to match the actual fields.
3. **The detailed and JSON examples unnecessarily depended on `mod_logio`**: Using `%O` would require enabling `mod_logio`. I changed those examples to `%B`, which is provided by `mod_log_config`, keeps the JSON numeric field valid, and still logs response size in bytes.
4. **The proxy configuration mixed Debian-specific commands with incomplete/generic file placement and used the less suitable proxy directive for private proxy IPs**: I scoped `a2enmod remoteip` to Debian/Ubuntu, changed the file comments to refer to a loaded Apache config file instead of `conf-available` paths that would need a separate enable step, and replaced `RemoteIPTrustedProxy` with `RemoteIPInternalProxy` for the RFC1918 load balancer example in line with Apache's documentation.

## Review Notes
- The post is technically valid for Apache HTTP Server 2.4-style configurations, including `mod_remoteip`, `%{c}a`, and `CustomLog ... "expr=..."`.
- The logging directives shown are not IPv4-exclusive. If a client connects over IPv6, `%a`, `%{c}a`, and `%h` will log IPv6 literals as applicable.
- The operational examples are Debian/Ubuntu-oriented (`a2enmod`, `/etc/apache2/...`, `/etc/logrotate.d/apache2`). Other distributions use different module-enable workflows and logrotate paths.

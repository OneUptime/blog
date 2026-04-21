# Validation Summary: How to Configure Squid Proxy Domain Blacklists for IPv4 Traffic

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Squid proxy server
- Squid ACLs and `http_access` rules
- Squid `dstdomain`, `url_regex`, `urlpath_regex`, `deny_info`, and `error_directory` directives
- Linux package management with APT and DNF
- systemd service management
- Squid access log monitoring with shell commands

## Sources Consulted
- Squid official `acl` configuration reference: https://www.squid-cache.org/Doc/config/acl/
- Squid official `http_access` configuration reference: https://www.squid-cache.org/Doc/config/http_access/
- Squid official `deny_info` configuration reference: https://www.squid-cache.org/Doc/config/deny_info/
- Squid official `error_directory` configuration reference: https://www.squid-cache.org/Doc/config/error_directory/
- Squid official `url_rewrite_program` configuration reference: https://www.squid-cache.org/Doc/config/url_rewrite_program/
- Squid Web Cache wiki, ACL behavior and domain matching: https://wiki.squid-cache.org/SquidFaq/SquidAcl
- Squid Web Cache wiki, native access log format: https://wiki.squid-cache.org/Features/LogFormat
- Ubuntu Server documentation, installing and managing Squid: https://ubuntu.com/server/docs/how-to/web-services/install-a-squid-server/
- Red Hat Enterprise Linux documentation, configuring Squid and domain deny lists: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/deploying_web_servers_and_reverse_proxies/configuring-the-squid-caching-proxy-server
- UT1 Blacklists official index: https://dsi.ut-capitole.fr/blacklists/index_en.php
- URLhaus Community API documentation: https://urlhaus.abuse.ch/api/
- Local `apt-get --help`, `systemctl` man page, and Ubuntu Squid 6.14 package/man-page checks.

## Issues Found
- The RHEL-family install command used `yum`. Updated it to `dnf`, matching current Red Hat documentation for installing the `squid` package.
- The URL path filtering example did not state that path matching only works when Squid can see the URL path. Clarified the comment to scope path regex matching to visible paths such as plain HTTP requests.
- The blocked-page section described `error_directory` and `url_rewrite_program` as a way to redirect denied requests. Replaced that with `deny_info`, which Squid documents as the mechanism for custom denied-request error pages and redirect URLs. Kept `error_directory` only for the custom error-template case.
- The denial-count command used `head 20`, which is not valid GNU `head` syntax for limiting output. Changed it to `head -n 20`.
- The denial-count comment said "by domain", but the default Squid native log field being printed is the requested URL. Changed the comment to "by requested URL".
- The conclusion recommended ShallaList as a current community source. Replaced it with UT1 Blacklists, which has a current official index and update notes.

## Review Notes
- The Squid ACL and `http_access` examples match the official Squid configuration syntax and Red Hat's domain deny-list guidance.
- The multiline Squid ACL examples were spot-checked with an extracted Ubuntu Squid 6.14 parser; the parser accepted the line continuations used in the post.
- Full `sudo squid -k parse` against an installed system configuration was not run because Squid is not installed as a system package in this workspace.

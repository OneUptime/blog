# Validation Summary: How to Set Up ClickHouse with Let's Encrypt TLS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (server configuration, openSSL settings, secure ports)
- Let's Encrypt / certbot (certificate issuance, standalone and DNS-01 challenges, renewal hooks)
- TLS/SSL (HTTPS, secure native TCP protocol)
- OpenSSL CLI (certificate verification)
- systemd (service restart/reload)

## Sources Consulted
- ClickHouse official documentation on SSL/TLS configuration: https://clickhouse.com/docs/en/guides/sre/configuring-ssl
- ClickHouse server configuration reference (`openSSL`, `https_port`, `tcp_port_secure`): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- certbot official documentation (standalone mode, DNS plugins, renewal hooks): https://eff-certbot.readthedocs.io/en/latest/
- Let's Encrypt documentation on challenge types (HTTP-01, DNS-01): https://letsencrypt.org/docs/challenge-types/
- certbot DNS plugin documentation (route53, cloudflare, digitalocean): https://eff-certbot.readthedocs.io/en/latest/using.html#dns-plugins
- ClickHouse `system.query_log` table reference: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found
- **Shebang ordering in renewal hook script (Step 7):** The file path comment `# /etc/letsencrypt/renewal-hooks/post/clickhouse.sh` appeared before the `#!/bin/bash` shebang line. The OS only recognizes `#!` as a shebang if it is the very first two bytes of the file. If a reader copied the code block verbatim, the resulting script would not be recognized as a bash script when executed directly. Fixed by swapping the two lines so the shebang comes first.

## Review Notes
- The SQL query in "Verifying TLS is Active" uses `system.query_log` with the `interface` column, which shows TCP (1) vs HTTP (2) but does not distinguish TLS from non-TLS connections. It serves as a general activity check rather than a TLS-specific verification. The `openssl s_client` command shown immediately after is the proper way to confirm TLS is active and working.
- The post does not mention disabling the default non-secure ports (8123 for HTTP, 9000 for native TCP) after enabling TLS. These remain open unless explicitly disabled in config. For a production security hardening guide this would be important, but it is outside the scope of this tutorial.
- The DNS-01 wildcard certificate section (Step 8) references `--dns-route53` which requires installing the separate `certbot-dns-route53` plugin package. The post assumes the reader will install the appropriate plugin but does not show the installation command. This is a minor omission rather than an error.

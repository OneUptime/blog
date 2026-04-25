# Validation Summary: How to Set Up Squid Proxy on pfSense for IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- pfSense
- Squid
- squidGuard
- pf firewall/NAT redirect rules
- TLS interception / SSL Bump

## Sources Consulted
- Netgate pfSense package list: https://docs.netgate.com/pfsense/en/latest/packages/package-list.html
- Netgate pfSense package manager docs: https://docs.netgate.com/pfsense/en/latest/packages/manager.html
- Netgate pfSense cache/proxy package overview: https://docs.netgate.com/pfsense/en/latest/packages/cache-proxy/index.html
- Netgate pfSense squidGuard package docs: https://docs.netgate.com/pfsense/en/latest/packages/cache-proxy/squidguard.html
- Netgate pfSense certificate management docs: https://docs.netgate.com/pfsense/en/latest/certificates/index.html
- pfSense package source for Squid general settings: https://github.com/pfsense/FreeBSD-ports/blob/devel/www/pfSense-pkg-squid/files/usr/local/pkg/squid.xml
- pfSense package source for Squid local cache settings: https://github.com/pfsense/FreeBSD-ports/blob/devel/www/pfSense-pkg-squid/files/usr/local/pkg/squid_cache.xml
- pfSense package source for Squid firewall/NAT rule generation: https://github.com/pfsense/FreeBSD-ports/blob/devel/www/pfSense-pkg-squid/files/usr/local/pkg/squid.inc
- pfSense package source for Squid status and real-time pages: https://github.com/pfsense/FreeBSD-ports/blob/devel/www/pfSense-pkg-squid/files/usr/local/www/status_squid.php
- pfSense package source for Squid real-time log viewer: https://github.com/pfsense/FreeBSD-ports/blob/devel/www/pfSense-pkg-squid/files/usr/local/www/squid_monitor.php
- pfSense package source for squidGuard general settings: https://github.com/pfsense/FreeBSD-ports/blob/devel/www/pfSense-pkg-squidGuard/files/usr/local/pkg/squidguard.xml
- pfSense package source for squidGuard Common ACL: https://github.com/pfsense/FreeBSD-ports/blob/devel/www/pfSense-pkg-squidGuard/files/usr/local/pkg/squidguard_default.xml
- pfSense package source for squidGuard target categories: https://github.com/pfsense/FreeBSD-ports/blob/devel/www/pfSense-pkg-squidGuard/files/usr/local/pkg/squidguard_dest.xml
- Squid `http_port` documentation: https://www.squid-cache.org/Doc/config/http_port/
- Squid `ssl_bump` documentation: https://www.squid-cache.org/Doc/config/ssl_bump/
- Squid command-line usage source (`-k check`, `-k parse`, etc.): https://www.squid-cache.org/Doc/code/main_8cc_source.dyn

## Issues Found
- The introduction incorrectly implied that transparent mode automatically intercepts both ports `80` and `443`. I corrected this to state that port `443` interception only happens when `HTTPS/SSL Interception` is enabled.
- The post did not mention that Netgate currently marks `squid`, `squidGuard`, and `lightsquid` as deprecated due to unfixed upstream vulnerabilities. I added a minimal warning so the guidance is current.
- The cache section used outdated/incorrect UI labels, including `Cache Mgmt`, `Level 1 Subdirs`, and a configurable `Level 2 Subdirs` field. I updated the section to the current `Local Cache` tab, changed the field name to `Level 1 Directories`, and clarified that the package fixes the Level 2 value at `256` internally.
- The HTTPS interception snippet used outdated field names. I corrected the settings to the current package labels: `HTTPS/SSL Interception`, `SSL/MITM Mode`, `SSL Intercept Interface(s)`, `CA`, and `SSL Proxy Compatibility Mode`.
- The transparent proxy firewall section was technically incorrect because it instructed readers to add a manual NAT port-forward rule. The current package generates the required `rdr pass` redirect rules automatically when transparent mode is enabled, so I replaced that section with the correct behavior.
- The squidGuard section omitted the final `Apply` step after editing categories and ACLs. I added that step because the package documentation requires returning to `General settings` and applying the configuration.
- The monitoring section referenced an outdated navigation path, `Status > Squid Proxy Stats`. I corrected it to the current `Status` and `Real Time` tabs under `Services > Squid Proxy Server`, and made the CLI validation command explicit with the full binary and config path.

## Review Notes
- The post is technically salvageable and now accurate against the current pfSense package source, but the package remains deprecated in current pfSense documentation and is not a good choice for new deployments.

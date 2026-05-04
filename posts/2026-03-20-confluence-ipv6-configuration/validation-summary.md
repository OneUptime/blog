# Validation Summary: How to Configure Confluence with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Atlassian Confluence
- Apache Tomcat (Confluence's bundled servlet container)
- IPv6 networking
- Nginx (reverse proxy with IPv6 listeners)
- JVM IPv6 system properties (`java.net.preferIPv6Addresses`, `java.net.preferIPv4Stack`)
- PostgreSQL JDBC connection strings with IPv6 literals
- ip6tables / iptables-persistent
- systemd service management
- curl, ss for verification

## Sources Consulted
- Atlassian Confluence Server documentation: default install path `/opt/atlassian/confluence`, Tomcat connector configuration in `conf/server.xml`, default HTTP connector port 8090, shutdown port 8000
- Atlassian docs on configuring `setenv.sh` and `CATALINA_OPTS`/`JAVA_OPTS` for Confluence
- Atlassian docs: Confluence home directory `/var/atlassian/application-data/confluence` and `confluence.cfg.xml`; `confluence-init.properties` location at `WEB-INF/classes/confluence-init.properties`
- Apache Tomcat 9 documentation for the HTTP Connector — `address`, `protocol="org.apache.coyote.http11.Http11NioProtocol"`, `URIEncoding`, `proxyName`, `proxyPort`, `scheme`, `secure` attributes
- RFC 3986 (URI generic syntax) and RFC 2732 — IPv6 literals in URLs use bracket notation `[...]`
- PostgreSQL JDBC driver documentation — host literal in brackets for IPv6
- Nginx `listen` directive documentation — `listen [::]:443 ssl http2` syntax
- netfilter `ip6tables` man page; Debian/Ubuntu `iptables-persistent` (`netfilter-persistent`) package — saves rules to `/etc/iptables/rules.v4` and `/etc/iptables/rules.v6`
- `ss(8)` man page for `-6 -tlnp` flags
- `curl(1)` man page for `-6`, `-L`, `-w`, `-o`, `-I` flags

## Issues Found
1. **Incorrect iptables-persistent path** — the original post wrote saved rules to `/etc/ip6tables/rules.v6`. The correct path used by the `iptables-persistent` / `netfilter-persistent` package on Debian/Ubuntu (and the convention followed by other distros) is `/etc/iptables/rules.v6`. Fixed by updating the redirect target to `/etc/iptables/rules.v6`.

## Review Notes
- The example uses non-hex placeholder strings inside IPv6 literals (e.g. `[2001:db8::postgres]`, `[2001:db8::confluence]`, `2001:db8:internal::/48`). These are clearly intended as documentation placeholders for readers to substitute with real values — they would not parse if used verbatim. This is a common documentation convention and not a technical error, so it was left unchanged to preserve the author's style.
- `address="::"` on a Linux Tomcat connector typically results in a dual-stack socket (IPv4-mapped IPv6 connections accepted) unless `net.ipv6.bindv6only=1` is set. Worth knowing, but not incorrect.
- The Tomcat connector example uses `URIEncoding="UTF-8"` which is correct; Confluence's stock `server.xml` historically also includes `maxHttpHeaderSize="8192"` and `useBodyEncodingForURI="true"` — their absence from the snippet is a simplification, not an error.
- `JAVA_OPTS` and `CATALINA_OPTS` in `setenv.sh` are both honored by Tomcat's `catalina.sh`; Atlassian commonly recommends `CATALINA_OPTS` for Confluence-specific tuning, but using `JAVA_OPTS` for `-Djava.net.preferIPv6Addresses=true` is functionally equivalent.
- `ss -6 -tlnp | grep 8090` is correct for verifying the IPv6 listener.

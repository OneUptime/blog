# Validation Summary: How to Configure Nexus Repository with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Sonatype Nexus Repository Manager 3
- Eclipse Jetty (embedded web server in Nexus)
- IPv6 networking
- systemd
- Nginx (reverse proxy)
- Docker (registry usage)
- Maven (settings.xml configuration)
- Let's Encrypt / TLS

## Sources Consulted
- Sonatype Nexus Repository 3 download page: https://help.sonatype.com/repomanager3/product-information/download
- Sonatype Nexus install docs (Run as a Service): https://help.sonatype.com/repomanager3/installation-and-upgrades/run-as-a-service
- Sonatype Nexus configuration directories docs: https://help.sonatype.com/repomanager3/installation-and-upgrades/directories
- Eclipse Jetty ServerConnector / network host docs: https://eclipse.dev/jetty/documentation/
- Nginx `listen` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Maven settings.xml reference: https://maven.apache.org/settings.html
- Docker Engine `docker login` reference: https://docs.docker.com/reference/cli/docker/login/
- curl manual (`-6` / `--ipv6`): https://curl.se/docs/manpage.html
- RFC 4291 (IPv6 Addressing Architecture) for `::` unspecified address semantics

## Issues Found
No technical issues found.

The post's core claims and snippets check out:
- `application-host=::` in `nexus-default.properties` is the correct Jetty dual-stack bind on Linux (the JVM defaults to `IPV6_V6ONLY=false`, so binding to `::` accepts both IPv4-mapped and native IPv6 connections).
- The systemd unit (`Type=forking`, `User=nexus`, `ExecStart=/opt/nexus/bin/nexus start`) matches Sonatype's documented service pattern.
- Nginx IPv6 listener syntax (`listen [::]:443 ssl http2;` and `listen [::]:80;`) is correct.
- Default Docker registry connector port (8082) matches the conventional Nexus Docker repository connector setup.
- `curl -6` correctly forces IPv6 resolution.
- Maven `settings.xml` mirror/server schema is valid.

## Review Notes
- Nexus 3 has historically shipped a `bin/nexus.rc` file where `run_as_user="nexus"` may need to be set if the start script is executed by a different user. Because the systemd unit already sets `User=nexus`, this is not required here, but readers running Nexus outside systemd may need to set it.
- The post does not call out the JVM flag `-Djava.net.preferIPv4Stack=false`. On modern Linux JVMs this is the default and `application-host=::` works as advertised, but on hardened or older JVM installs where `preferIPv4Stack=true` has been set, the bind would silently fall back to IPv4. This is a minor caveat worth knowing but not a technical error in the post.
- For HTTPS direct on Nexus, `application-port-ssl=8443` alone is insufficient — additional `nexus-args` entries (e.g. `${jetty.etc}/jetty-https.xml`) and a keystore are required. The post wisely keeps that line commented out and recommends Nginx termination instead, so this is not a defect.
- `LimitNOFILE=65536` is recommended by Sonatype for production but is not strictly required for IPv6 functionality, so its omission is not an error.
- The `https://www.github.com/...` author link works but the canonical form is `https://github.com/...`; this is stylistic, not a technical issue.

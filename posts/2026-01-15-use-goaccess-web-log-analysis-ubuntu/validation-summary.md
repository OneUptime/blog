# Validation Summary: How to Use GoAccess for Web Log Analysis on Ubuntu

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- GoAccess
- Ubuntu
- Nginx access logging and WebSocket reverse proxying
- Apache access logging and mod_status
- MaxMind GeoIP / GeoLite2 databases
- systemd services
- cron-based report generation
- Linux shell commands

## Sources Consulted
- GoAccess manual page: https://goaccess.io/man
- GoAccess downloads and official Debian/Ubuntu repository instructions: https://goaccess.io/download
- GoAccess get-started guide: https://goaccess.io/get-started
- GoAccess FAQ for real-time HTML, WebSocket, SSL, config file, and GeoIP notes: https://goaccess.io/faq
- GoAccess release notes: https://goaccess.io/release-notes
- Nginx ngx_http_log_module documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx logging administration guide: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/
- Apache mod_log_config documentation: https://httpd.apache.org/docs/current/mod/mod_log_config.html
- Apache mod_status documentation: https://httpd.apache.org/docs/2.4/mod/mod_status.html
- MaxMind GeoIP Update documentation: https://dev.maxmind.com/geoip/updating-databases/

## Issues Found
- The source build section used GoAccess 1.9.3 while calling it the latest source release. Updated the download, extraction, and directory commands to GoAccess 1.10.2, matching the current stable version listed by the official GoAccess downloads page.
- The source build dependencies used `libncursesw5-dev`, which is not the current dependency name shown in GoAccess's Ubuntu/Debian package table. Updated it to `libncursesw6-dev`.
- The source build enabled OpenSSL and GeoIP but omitted zlib, while the article later demonstrates direct `.gz` log parsing. Added `zlib1g-dev` and `--with-zlib`.
- The usage overview said GoAccess automatically detects common formats. Adjusted the wording to say GoAccess can prompt for a format, while explicit `--log-format` is still recommended.
- The non-TLS real-time HTML command used a `wss://` WebSocket URL without TLS flags. Changed it to `ws://yourserver.com:7890`.
- The JSON log parsing example used `--date-format` and `--time-format` with `%x` for an ISO 8601 combined timestamp. Replaced them with `--datetime-format='%Y-%m-%dT%H:%M:%S%z'`, which matches GoAccess's documented `%x` usage.
- The static asset exclusion example used `--ignore-referer` flags to match file extensions. Replaced this with `--ignore-statics=panel`, the documented GoAccess option for excluding static requests from panels.
- The internal traffic section claimed `--exclude-ip` supports CIDR notation, but GoAccess documents single IPs and dash-separated IP ranges. Updated the comment to match the supported syntax.
- The crawler exclusion example created an unused custom list and combined `--ignore-crawlers` with `--crawlers-only`, which are contradictory for excluding bots. Simplified the example to use the built-in `--ignore-crawlers` option.
- The systemd service used `www-data` without granting access to Ubuntu web server logs, and it attempted to read TLS private keys directly. Added `SupplementaryGroups=adm`, removed direct certificate flags, bound GoAccess to loopback, and set `--ws-url` to the Nginx reverse-proxy path.
- The troubleshooting section used `--debug-file` for parse errors, but the GoAccess manual says that option requires a debug build. Replaced it with `--invalid-requests`, which is intended for saving unparseable log lines.
- The WebSocket troubleshooting section used `netstat`, which is commonly absent on modern Ubuntu installs unless `net-tools` is installed. Replaced it with `ss`.

## Review Notes
- The remaining examples are technically plausible for current GoAccess, Nginx, Apache, MaxMind GeoIP Update, systemd, and Ubuntu usage.
- GoAccess was not installed in the local workspace environment, so CLI behavior was verified against official GoAccess documentation rather than local `goaccess --help` output.
- The direct TLS WebSocket example remains valid when GoAccess is built with OpenSSL and can read the configured certificate and key. The later systemd example now uses the reverse-proxy pattern to avoid service-user certificate access problems.

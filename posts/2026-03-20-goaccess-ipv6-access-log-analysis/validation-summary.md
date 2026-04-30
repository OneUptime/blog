# Validation Summary: How to Set Up IPv6 Access Log Analysis with GoAccess

## Status
validated

## Post Type
Guide

## Technologies Covered
- GoAccess
- Nginx
- IPv6
- MaxMind GeoLite2 / GeoIP2
- systemd journal
- Bash

## Sources Consulted
- GoAccess Manual Page: https://goaccess.io/man
- GoAccess Get Started: https://goaccess.io/get-started
- GoAccess Downloads / build options: https://goaccess.io/download
- NGINX `ngx_http_log_module`: https://nginx.org/en/docs/http/ngx_http_log_module.html
- NGINX variable index: https://nginx.org/en/docs/varindex.html
- NGINX `ngx_http_core_module` embedded variables: https://nginx.org/en/docs/http/ngx_http_core_module.html
- MaxMind GeoIP and GeoLite database docs: https://dev.maxmind.com/geoip/docs/databases/?lang=en

## Issues Found
- The GoAccess config snippet had two active `log-format` directives in the same example. I kept `log-format COMBINED` as the active example and converted the alternative into a commented replacement, because GoAccess uses a single log format definition at a time.
- Multiple pipe-based GoAccess commands were missing the stdin marker `-`. I corrected the rotated-log, IPv6-only, real-time HTML, journald, and cron examples so they use GoAccess's documented stdin behavior.
- The IPv6-only filter used a narrow regex that could miss valid IPv6 forms. I replaced it with `awk '$1 ~ /:/'`, which matches an IPv6 address in the client-IP field without assuming a specific textual form.
- The real-time example was described as a terminal dashboard while the command actually generated real-time HTML with `--real-time-html`. I corrected the description and used `tail -f -n +0`, matching GoAccess's documented pattern for parsing existing content and following updates.
- The custom Nginx format labeled `$server_protocol` as `ipv=...`, which was technically incorrect because `$server_protocol` is the HTTP protocol value such as `HTTP/1.1` or `HTTP/2.0`, not the IP version. I changed the example to `proto=$server_protocol` and updated the matching GoAccess format string.
- The report panel descriptions overstated what GoAccess shows. I corrected the Visitors panel description, fixed the Not Found panel description to refer to 404 requests rather than clients, and clarified the GeoIP note to reflect GeoIP2/MMDB build support and IPv6 lookup behavior.

## Review Notes
- The journald example is only applicable when Nginx access logs are being sent to journald; standard Nginx deployments usually write access logs to files.
- If the real-time HTML dashboard must accept IPv6 WebSocket connections directly, GoAccess can be started with `--addr=::`.

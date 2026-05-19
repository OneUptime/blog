# Validation Summary: How to Configure HAProxy Rate Limiting on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ubuntu
- HAProxy
- HAProxy stick tables
- HAProxy ACLs
- HAProxy Runtime API
- systemd
- socat

## Sources Consulted
- HAProxy stick tables documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/stick-tables/
- HAProxy 2.8 configuration manual: https://docs.haproxy.org/2.8/configuration.html
- HAProxy Runtime API `set table` reference: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/set-table/
- HAProxy Runtime API `show table` reference: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-table/
- Ubuntu package archive for HAProxy on Ubuntu 24.04 LTS: https://packages.ubuntu.com/noble/net/haproxy
- Local syntax validation with Ubuntu HAProxy package 2.8.16-0ubuntu0.24.04.2.

## Issues Found
- The Runtime API examples used `/run/haproxy/admin.sock`, but the configuration snippets did not create that socket. Added `stats socket /run/haproxy/admin.sock mode 660 level admin` to the relevant `global` sections.
- The per-URL stick table used `type binary` and claimed to track an IP+path key, but the rule tracked only `src`, an IP sample. Changed the login tracking rule to use `base32+src`, which matches the binary stick-table key and represents the path plus source address.
- The error-rate section said `http_err_rate` tracked 4xx/5xx responses and included unused status ACLs. Corrected the comment to request errors and 4xx responses, matching HAProxy's `http_err_rate` behavior.
- The `high_error_ratio` ACL compared a sample fetch to `sc_http_req_rate(0)/2`, which is not valid HAProxy ACL syntax. Replaced it with a variable and converter-based comparison that validates with HAProxy 2.8.
- The IP banning example described `tune.stick-counters` as the ban table size and described an IP table as a binary key. Corrected those comments.
- The custom 429 response had duplicated `Content-Type` handling and an unsafe argument order for `http-request return`. Reordered it to use `content-type`, `string`, and `hdr` in syntax validated by HAProxy 2.8.

## Review Notes
- The examples were syntax-checked with HAProxy 2.8.16 from the Ubuntu 24.04 package after substituting local test certificates and loopback backend addresses where needed.
- The full install snippets still assume the HAProxy Debian/Ubuntu package creates the `haproxy` user and group, which is standard for the package.

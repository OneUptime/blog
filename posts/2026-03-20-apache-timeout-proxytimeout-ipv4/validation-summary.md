# Validation Summary: How to Configure Apache Timeout and ProxyTimeout for IPv4 Backends

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- `mod_proxy`
- `mod_proxy_balancer`
- `mod_reqtimeout`
- Reverse proxy configuration with IPv4 backends

## Sources Consulted
- Apache HTTP Server core directives (`TimeOut`, `KeepAliveTimeout`): https://httpd.apache.org/docs/current/en/mod/core.html
- Apache `mod_proxy` documentation (`ProxyTimeout`, `ProxyPass`, worker parameters, `BalancerMember`): https://httpd.apache.org/docs/current/mod/mod_proxy.html
- Apache `mod_reqtimeout` documentation (`RequestReadTimeout`): https://httpd.apache.org/docs/2.4/en/mod/mod_reqtimeout.html
- Apache directive index (used to confirm `ProxyConnectTimeout` is not a documented directive): https://httpd.apache.org/docs/current/mod/directives.html

## Issues Found
- `ProxyConnectTimeout` was presented as an Apache directive, but Apache 2.4 documents backend connect timeout as the `connectiontimeout` worker parameter on `ProxyPass` and `ProxySet`. I replaced the invalid standalone directive with a valid `ProxyPass ... connectiontimeout=10` example.
- `ProxyTimeout` and `RequestReadTimeout` were shown inside `<Location>` blocks. Apache documents `ProxyTimeout` and `RequestReadTimeout` as valid only in server config and virtual host context, so those examples would not load as written. I replaced them with path-specific `ProxyPass ... timeout=` mappings and clarified that `RequestReadTimeout` must be configured separately at server or virtual-host scope.
- The post described `Timeout` as the maximum time for a client to complete a request and `ProxyTimeout` as the time to receive the complete backend response. Apache documents these as I/O and network timeouts rather than total wall-clock budgets. I corrected the table, comments, and explanation text to match Apache's semantics.
- The `RequestReadTimeout` commentary said the body had to complete within 40 seconds, but `body=20,MinRate=500` actually allows at least 20 seconds and extends as data arrives. I corrected the comments and aligned the option casing with the documentation.
- The `BalancerMember ... retry=30` comment described error-counting behavior that the directive does not implement. I changed it to the documented retry-after-error behavior.
- The sample log-message commentary was too specific for a generic Apache timeout discussion. I replaced it with guidance to search for timeout, proxy, and `AH01xxx` messages instead.

## Review Notes
- The examples use Debian and Ubuntu style file paths such as `/etc/apache2` and `/var/log/apache2/error.log`; the directives are portable, but file locations differ on other distributions.
- `ProxyTimeout` is an inactivity timeout for proxied network I/O, not a total end-to-end request budget. Long-polling and SSE setups still need heartbeat traffic or a timeout high enough to cover expected idle gaps.

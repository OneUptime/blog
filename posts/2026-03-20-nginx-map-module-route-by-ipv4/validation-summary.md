# Validation Summary: How to Use the Nginx map Module to Route Traffic by IPv4 Address

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (`ngx_http_map_module`)
- Nginx (`ngx_http_geo_module`)
- Nginx upstream / proxy_pass directives
- curl (`--interface` flag)

## Sources Consulted
- Official Nginx `map` module documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Official Nginx `geo` module documentation: https://nginx.org/en/docs/http/ngx_http_geo_module.html
- Nginx `if` directive guidance ("If is Evil"): https://www.nginx.com/resources/wiki/start/topics/depth/ifisevil/
- curl manual for `--interface` option: https://curl.se/docs/manpage.html

## Issues Found

1. **CIDR notation used inside a `map` directive (broken example).** In the "Routing to Different Upstreams Based on IP" section, the example contained the line:
   ```
   10.0.0.0/8     "internal_backends";   # Note: CIDR requires geo module
   ```
   Per the official `map` module docs, only exact strings, regular expressions (`~`/`~*`), and hostname wildcards are supported as match types — CIDR is **not** supported. The line as written would be treated as a literal string `"10.0.0.0/8"` and never match a real client IP. The inline comment acknowledged the limitation but the example was still misleading and would not work if copy-pasted. Replaced the CIDR line with a regex prefix match (`~^10\.`), which is correctly supported by the `map` module and achieves an equivalent intent for the `10.0.0.0/8` range. Added a comment cross-referencing the geo module section for true CIDR.

## Review Notes

- The "Feature Flags by IP" example uses `proxy_pass` inside an `if` block with a fallback `proxy_pass` after it. While the canonical "If is Evil" guidance discourages `if` inside `location`, `proxy_pass` inside `if` is one of the documented safe uses, and the pattern shown works in practice. Some readers may prefer using `map` to set a backend variable and a single `proxy_pass http://$backend;` instead, but the example as written is not technically incorrect.
- `curl --interface 10.0.0.5 ...` only works if the host actually has a network interface configured with that IP (the flag accepts an interface name, IP, or hostname). This is a usage caveat rather than a technical error.
- The `map` module evaluates lazily as stated; this is correctly described in the conclusion.
- The `geo` module example correctly uses CIDR ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), which matches the official docs.

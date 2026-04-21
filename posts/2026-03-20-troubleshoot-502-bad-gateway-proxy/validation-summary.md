# Validation Summary: How to Troubleshoot HTTP 502 Bad Gateway Errors Behind a Reverse Proxy

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- HTTP 502 Bad Gateway and related 504 Gateway Timeout semantics
- Nginx reverse proxy configuration
- Linux networking and process diagnostics
- systemd journal logging
- PM2 process logging
- Mermaid flowchart syntax

## Sources Consulted
- RFC 9110 HTTP Semantics, Section 15.6.3: https://www.rfc-editor.org/rfc/rfc9110.html#section-15.6.3
- RFC 9110 HTTP Semantics, Section 15.6.5: https://www.rfc-editor.org/rfc/rfc9110.html#section-15.6.5
- NGINX ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX command-line parameter documentation: https://nginx.org/en/docs/switches.html
- curl man page: https://curl.se/docs/manpage.html
- systemd journalctl man page: https://man7.org/linux/man-pages/man1/journalctl.1%40%40systemd.html
- ss man page: https://man7.org/linux/man-pages/man8/ss.8.html
- iptables man page: https://man7.org/linux/man-pages/man8/iptables.8.html
- top man page: https://man7.org/linux/man-pages/man1/top.1.html
- dmesg man page: https://man7.org/linux/man-pages/man1/dmesg.1.html
- PM2 log management documentation: https://pm2.io/docs/runtime/guide/log-management/
- Local command help for `ss`, `netstat`, `journalctl`, `top`, `dmesg`, `iptables`, Bash `ulimit`, `tail`, and `grep`

## Issues Found
- The 502 definition was too broad because it described "invalid or no response" from upstream. RFC 9110 defines 502 as an invalid upstream response, while lack of a timely upstream response is 504. Updated the wording to "invalid or unusable response" and framed the problem as a proxy-to-upstream path or upstream application failure.
- The post listed `upstream timed out` as a common 502 error pattern and routed the flowchart toward increasing `proxy_read_timeout`. Timeout failures are more accurately associated with 504 Gateway Timeout. Replaced the example with `upstream prematurely closed connection`, changed the timeout comment to neutral configuration wording, and adjusted the flowchart to focus on premature closes/resets.
- The log filtering command used escaped alternation with basic `grep`. Updated it to `grep -E "502|upstream|connect"` so the alternation is explicit and portable across typical GNU grep usage.

## Review Notes
- `netstat` is a legacy alternative and may not be installed by default on modern Linux systems; the post correctly presents `ss` first.
- `ulimit -n` checks the current shell's file descriptor limit, which may differ from limits applied to systemd-managed services.
- Nginx was not installed in the local environment, so the Nginx snippet was verified against official directive documentation rather than by running `nginx -t`.

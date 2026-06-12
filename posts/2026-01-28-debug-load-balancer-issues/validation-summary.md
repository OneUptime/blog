# Validation Summary: How to Debug Load Balancer Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- NGINX (open source and NGINX Plus)
- HAProxy
- AWS ELB / ALB (CLI via `aws elbv2`)
- Linux networking tooling (`tcpdump`, `nc`, `ss`, `iptables`, `dmesg`, `socat`)
- OpenSSL (`s_client`) and `nmap` for TLS testing
- Linux kernel networking sysctls (`net.core.*`, `net.ipv4.tcp_*`, `net.netfilter.nf_conntrack_max`)
- WebSocket proxying
- `curl` (including `-w` timing format and TLS testing)
- Mermaid diagrams for documentation

## Sources Consulted
- NGINX documentation: `ngx_http_upstream_module` (https://nginx.org/en/docs/http/ngx_http_upstream_module.html) — verified `keepalive`, `keepalive_requests`, `keepalive_timeout`, `ip_hash`, `hash ... consistent`
- NGINX documentation: `ngx_http_proxy_module` (https://nginx.org/en/docs/http/ngx_http_proxy_module.html) — verified `proxy_connect_timeout`, `proxy_read_timeout`, `proxy_send_timeout`, `proxy_http_version`, `proxy_set_header`, `proxy_buffering`
- `nginx_upstream_check_module` (Yaoweibin / Tengine) documentation — verified `check`, `check_http_send`, `check_http_expect_alive` syntax
- HAProxy configuration manual (https://docs.haproxy.org/) — verified `option httpchk`, `http-check expect`, `default-server inter/fall/rise`, `slowstart`, `balance` algorithms, `timeout tunnel`, runtime API via socat
- AWS CLI Command Reference: `elbv2 describe-target-health`, `ec2 describe-security-groups`
- Linux kernel networking documentation (`Documentation/networking/ip-sysctl.txt`) — verified `tcp_tw_reuse`, `tcp_keepalive_*`, `ip_local_port_range`, `somaxconn`, `netdev_max_backlog`, `rmem_max`, `wmem_max`
- `nf_conntrack` sysctl documentation — verified `net.netfilter.nf_conntrack_max`
- OpenSSL `s_client` man page — verified `-connect`, `-servername`, `-state`, `-debug`, `-showcerts`, `-tls1_2`, `-tls1_3`
- `curl` man page — verified `-w` write-out variables (`time_namelookup`, `time_connect`, `time_appconnect`, `time_pretransfer`, `time_starttransfer`, `time_total`)
- `tcpdump` filter syntax (BPF) — verified `tcp[tcpflags] & (tcp-rst) != 0` expression

## Issues Found
No technical issues found.

All configurations, directives, sysctl parameters, and CLI invocations match current official documentation. The `tcp_tw_reuse` recommendation is still safe and recommended (unlike the removed `tcp_tw_recycle`, which was eliminated in kernel 4.12 and is correctly not mentioned). HAProxy `option httpchk` with the `\r\n` escape syntax is a legacy form but remains functional in current HAProxy versions, alongside the newer `http-check send` syntax.

## Review Notes
- The NGINX active health-check directives (`check`, `check_http_send`, `check_http_expect_alive`) are not part of NGINX OSS core — they ship with the third-party `nginx_upstream_check_module` (Yaoweibin) or Tengine. The syntax shown is correct for that module. Readers using vanilla NGINX OSS would need to either build NGINX with this module or use the NGINX Plus active health checks (`health_check` directive in `location` blocks). This is a context note rather than a technical error.
- HAProxy now also supports a newer `http-check send meth GET uri /health ver HTTP/1.1 hdr Host localhost` form, which is recommended over the inline `\r\n`-escaped variant in HAProxy 2.2+. The post's form still works but is the legacy style.
- NGINX Plus API version `/api/6/` is correct syntax but reflects older Plus releases; newer Plus releases support higher API versions (the API is versioned and backward-compatible).
- `dmesg | grep "nf_conntrack: table full"` matches the historical kernel message; some newer kernels phrase it slightly differently but `table full` remains the reliable substring.
- The `echo | openssl s_client ... | grep -E "(subject|issuer|dates)"` will surface `subject=` and `issuer=` lines from `s_client`, but certificate validity `notBefore`/`notAfter` dates are not part of `s_client`'s default banner output — extracting them typically requires piping through `openssl x509 -noout -dates`. The intent reads correctly in context, so left as-is.
- None of the above are corrections — they are forward-looking notes for future updates.

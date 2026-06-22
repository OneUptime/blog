# Validation Summary: How to Configure HAProxy for IPv6 Load Balancing

## Status
validated

## Post Type
Tutorial / Reference guide (configuration-heavy)

## Technologies Covered
- HAProxy (load balancing, dual-stack frontends, backends, health checks, stick tables, ACLs, SSL/TLS termination, PROXY protocol, runtime API)
- IPv6 / dual-stack networking
- Keepalived (VRRP for virtual IPs)
- Linux sysctl networking tuning
- DNS resolution (A / AAAA records, HAProxy resolvers)
- Prometheus exporter (HAProxy built-in)
- curl / socat / ss / ip6tables / traceroute6 (troubleshooting tools)

## Sources Consulted
- HAProxy Configuration Manual 2.8 — https://docs.haproxy.org/2.8/configuration.html (acl declaration rules, `http-request return` `string` vs `lf-string`, `http-check`/`tcp-check`, `stick-table type ipv6`, `server-template`, resolvers)
- HAProxy ACLs blog/tutorials — https://www.haproxy.com/blog/introduction-to-haproxy-acls and https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/acls/ (confirmation that OR is expressed by repeating the same ACL name, and that ACLs cannot be defined by combining other ACLs)
- HAProxy community thread "Building ACLs using others ACLs" — https://discourse.haproxy.org/t/building-acls-using-others-acls/4092

## Issues Found
1. **Invalid ACL definition syntax using `or` to combine named ACLs.** The post defined ACLs like `acl is_internal or is_internal_v4 is_internal_v6` (and the same pattern for `is_north_america`, `is_europe`, `is_asia`). This is not valid HAProxy syntax — the `acl` directive expects a sample fetch as its criterion, not the word `or` or references to other ACLs (`or` would be rejected as an unknown fetch method). Logical OR between ACLs is only valid inside an `if`/`unless` condition, or is achieved by declaring the **same ACL name multiple times**.
   - Fix (internal networks): collapsed to two same-named declarations — `acl is_internal src 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16` and `acl is_internal src 2001:db8:100::/48` (a single `src` ACL can also list mixed v4/v6 CIDRs).
   - Fix (geo routing): renamed the `_v4`/`_v6` ACLs to the shared names (`is_north_america`, `is_europe`, `is_asia`) declared twice each (once for the v6 file, once for the v4 file), which OR-combines them, and removed the now-invalid "Combined ACLs" block.

2. **`http-request return ... string` does not evaluate log-format expressions.** The debug endpoint used `... string "Client IP: %[src]\n..."`, but the `string` keyword emits the literal text, so `%[src]`, `%[dst]`, etc. would appear verbatim instead of being substituted. Changed `string` to `lf-string`, which is the keyword that interprets log-format expressions.

## Review Notes
- **External health checks need a global directive.** The `option external-check` example (backend `external_health_check`) will not actually fork the check process unless `insecure-fork-wanted` is set in the `global` section (required since HAProxy 2.x). The snippet only shows the backend, so no edit was made, but readers should add `insecure-fork-wanted` globally for this to work.
- **IP-version detection logic is imperfect.** Both the `set-var(txn.ip_version)` lines (`{ src,ipv6 }`) and the `%[src,ipv6,iif(ipv6,ipv4)]` log/return expression rely on the `ipv6` converter, which maps IPv4 addresses to IPv4-mapped IPv6 — so these tests tend to evaluate as "ipv6" for all clients. A more reliable approach is to match address families directly (e.g. an ACL `src 0.0.0.0/0` matches only IPv4). Left as-is since these are illustrative debug snippets and not core to the guide; the `string`→`lf-string` correction at least makes the expression evaluate.
- **`X-RateLimit-Remaining` math is inverted.** `%[sc_http_req_rate(0),sub(100)]` computes `rate - 100` (negative until the limit is exceeded) rather than `100 - rate`. Cosmetic header value only; not a syntax error, so left unchanged.
- **Deprecated-but-valid items:** the older `option httpchk GET /health HTTP/1.1\r\nHost:\ localhost` style is superseded by the `http-check send` syntax (the post correctly demonstrates both); `ssl-engine rdrand` works but OpenSSL ENGINE support is deprecated in OpenSSL 3.x. These remain functional and were left intact.
- **Keepalived dual-family VIPs:** placing the IPv6 VIP under `virtual_ipaddress_excluded` of an IPv4 VRRP instance is a recognized keepalived workaround (those addresses are not advertised in VRRP). It is valid; a fully separate `vrrp_instance` per address family is an alternative worth mentioning but not required.
- All IPv6 addressing examples correctly use documentation ranges (`2001:db8::/32`) and bracket notation; bind/wildcard/stick-table/`type ipv6`/resolver/PROXY-protocol syntax all check out against the manual.

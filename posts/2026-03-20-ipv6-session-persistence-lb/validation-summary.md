# Validation Summary: How to Configure IPv6 Session Persistence in Load Balancers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- HAProxy
- nginx
- Linux IPVS / `ipvsadm`
- TLS session persistence
- `curl`

## Sources Consulted
- RFC 8981: Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6 — https://www.rfc-editor.org/rfc/rfc8981
- HAProxy Configuration Manual — https://www.haproxy.com/documentation/haproxy-configuration-manual/new/latest/
- HAProxy Session Persistence documentation — https://www.haproxy.com/documentation/haproxy-configuration-tutorials/session-persistence/
- nginx `ngx_http_upstream_module` documentation — https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- `ipvsadm` upstream man page — https://kernel.googlesource.com/pub/scm/utils/kernel/ipvsadm/ipvsadm/+/089387716f02522e543b661555983436b64a73b1/ipvsadm.8

## Issues Found
- The post said IPv6 privacy extensions rotate temporary addresses every hour. That was too specific and not the standards default. RFC 8981 defines a default temporary-address preferred lifetime of 1 day, so I changed the wording to say temporary addresses rotate over time and updated the timeout guidance accordingly.
- The nginx sticky-session section was outdated. `sticky cookie` is documented in the official upstream module and is available in open-source nginx starting with 1.29.6, while older releases required NGINX Plus or third-party modules. I changed the heading and removed the inaccurate "requires nginx-extras" implication.
- Several example IPv6 literals were invalid, such as `2001:db8::web1` and `2001:db8::server1`, because `web1` and `server1` are not valid hexadecimal interface identifiers. I replaced them with valid documentation-prefix addresses.
- The IPVS example incorrectly used `-6` with `-t`. Per the `ipvsadm` man page, `-6` is for IPv6 fwmark services used with `-f`, not normal TCP service definitions with `-t`. I removed `-6` from those commands.
- The HAProxy prefix-persistence example used an invalid sample expression, `src,ip_is_src,bytes(0,8)`, and the surrounding text inconsistently referred to `/56`, `/48`, and `/64`. I replaced it with the documented `ipmask(24,64)` converter and aligned the explanation to `/64` prefix masking.
- The HAProxy stats verification command did not match the CSV format it was trying to parse. I replaced it with an `awk` command that actually prints per-server counters from the CSV output.

## Review Notes
- The nginx `sticky` directive remains version-sensitive: open-source nginx supports it in 1.29.6 and newer, while older open-source releases still need NGINX Plus or a third-party module.
- HAProxy documents `ssl_fc_session_id` as usable for stickiness, but also notes that some browsers refresh their TLS session ID every few minutes. Cookie-based persistence is still the stronger recommendation for most web workloads.
- Prefix-based IPv6 affinity at `/64` can reduce breakage from temporary-address rotation, but it also groups all clients on the same subnet onto the same backend. The corrected post now reflects that tradeoff.

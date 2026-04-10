# Validation Summary: How to Look Up Ceph Monitors Through DNS

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph Monitor DNS discovery (`mon_dns_srv_name`)
- DNS SRV records (BIND zone file format)
- Rook (Ceph operator for Kubernetes)
- Kubernetes Service DNS
- CoreDNS (Kubernetes DNS server)
- msgr v1 and msgr v2 protocols

## Sources Consulted
- Ceph official documentation — Monitor Lookup through DNS: https://docs.ceph.com/en/latest/rados/configuration/mon-lookup-dns/
- Ceph configuration reference for `mon_dns_srv_name` option (default value: `ceph-mon`)
- Ceph Messenger v2 documentation: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- CoreDNS plugins list: https://coredns.io/plugins/
- CoreDNS template plugin documentation: https://coredns.io/plugins/template/
- Rook Ceph Monitor Health documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-mon-health/
- Ceph GitHub PR #17539 (mon_dns_srv_name default value)

## Issues Found

### Issue 1: Incorrect `mon_dns_srv_name` value
- **What was wrong:** The `ceph.conf` example set `mon_dns_srv_name = _ceph-mon._tcp.ceph.example.com` (full SRV record name including `_` prefix and `._tcp` protocol).
- **What was changed:** Corrected to `mon_dns_srv_name = ceph-mon` (bare service name only).
- **Why:** Ceph internally constructs the full SRV query by prepending `_` and appending `._tcp.<search-domain>` to the value of `mon_dns_srv_name`. Setting the full SRV name would cause Ceph to produce a malformed query like `__ceph-mon._tcp.ceph.example.com._tcp.<domain>`. The default value is `ceph-mon` per official Ceph documentation. Also updated the explanatory text above the config snippet to clarify how Ceph constructs the DNS query.

### Issue 2: Non-existent CoreDNS `srv` plugin
- **What was wrong:** The CoreDNS configuration used a `srv` plugin directive, which does not exist as a built-in CoreDNS plugin. This configuration would cause a CoreDNS parse error.
- **What was changed:** Replaced with a working configuration using the `template` plugin (a built-in CoreDNS plugin) that generates SRV record responses matching the `_ceph-mon._tcp.ceph.cluster.local` query pattern.
- **Why:** CoreDNS has no `srv` plugin. Custom SRV records can be served via the `template`, `file`, or `etcd` plugins. The `template` plugin was chosen as the most straightforward approach for inline configuration.

## Review Notes
- The Rook Kubernetes section uses port 6789 (msgr v1) in `mon_host`. Modern Rook deployments (v1.3+) default to msgr v2 on port 3300. While 6789 still works (monitors bind both ports), users deploying new clusters may prefer using the v2 address format (e.g., `v2:rook-ceph-mon-a.rook-ceph.svc.cluster.local:3300`).
- The SRV record examples in BIND zone file format are syntactically correct and use proper priority/weight/port/target ordering.
- The `dig SRV` command and expected output are correct.
- Kubernetes Service DNS names for Rook monitors (`rook-ceph-mon-{a,b,c}.rook-ceph.svc.cluster.local`) follow the correct Rook naming convention.

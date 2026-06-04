# Validation Summary: How to Build Custom CoreDNS Configurations for Private DNS Zones in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CoreDNS
- Kubernetes DNS
- Kubernetes ConfigMaps, Deployments, Services, and RBAC
- external-dns
- Prometheus / PromQL
- DNS zone files and resource records

## Sources Consulted
- CoreDNS file plugin documentation: https://coredns.io/plugins/file/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS prometheus metrics plugin documentation: https://coredns.io/plugins/metrics/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS ACL plugin documentation: https://coredns.io/plugins/acl/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Customizing DNS Service documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes kubectl reference documentation: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- external-dns provider documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/providers/
- external-dns CoreDNS tutorial: https://kubernetes-sigs.github.io/external-dns/v0.14.0/tutorials/coredns/

## Issues Found
- The "Integrating Kubernetes Services with Private Zones" CoreDNS example had `file` before `kubernetes` in the Corefile and configured the Kubernetes plugin for `cluster.local`, while the explanation claimed Kubernetes services could be queried using `internal.company.com`. CoreDNS plugin execution order and authoritative zones make that inaccurate. Updated the example so `kubernetes` is authoritative for `internal.company.com`, uses `fallthrough`, and then falls through to the static zone file.
- The wildcard zone used `*.apps` and `admin.apps` under `$ORIGIN apps.company.com.`, which expands to `*.apps.apps.company.com.` and `admin.apps.apps.company.com.`. Changed those owner names to `*` and `admin` so they match `<anything>.apps.company.com` and `admin.apps.company.com`.
- The tenant-zone explanation claimed separate zones prevent cross-tenant DNS queries. Separate zones organize names but do not enforce query authorization by themselves. Updated the text to recommend CoreDNS ACLs, NetworkPolicies, or separate DNS deployments for query restrictions.
- The split-horizon section described source-based split-horizon DNS, but the Corefile only serves a private override for `company.com` and forwards unrelated names. Renamed and reworded the section to accurately describe internal overrides with public forwarding.
- The external-dns section said external-dns updates a private zone ConfigMap directly. Official external-dns CoreDNS examples use the CoreDNS provider with an etcd backend. Updated the text to avoid claiming ConfigMap updates.
- The PromQL latency example used invalid aggregation syntax for `histogram_quantile`. Updated it to aggregate by `zone` and `le` before calling `histogram_quantile`.
- The cache hit-rate query used `zone` and total DNS requests, but CoreDNS cache metrics use the `zones` label and expose `coredns_cache_requests_total`. Updated the query accordingly.
- The testing section described an absent record lookup as an isolation test. Changed the comment to "Verify a missing record" to match what the command actually verifies.

## Review Notes
The Deployment example is a partial update snippet rather than a complete standalone `apps/v1` Deployment manifest. That is acceptable in context because the text says to update the existing CoreDNS Deployment, but a future revision could show this explicitly as a patch command or include the full Deployment selector and pod labels.

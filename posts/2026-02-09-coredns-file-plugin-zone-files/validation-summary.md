# Validation Summary: How to Use CoreDNS File Plugin to Serve Custom Zone Files in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CoreDNS
- CoreDNS file plugin
- CoreDNS hosts, reload, kubernetes, forward, cache, and prometheus plugins
- Kubernetes ConfigMaps, Deployments, and volumes
- DNS zone files and RFC 1035 master file format
- Prometheus / PromQL
- BIND `named-checkzone`
- `kubectl`

## Sources Consulted
- CoreDNS file plugin documentation: https://coredns.io/plugins/file/
- CoreDNS reload plugin documentation: https://coredns.io/plugins/reload/
- CoreDNS hosts plugin documentation: https://coredns.io/plugins/hosts/
- CoreDNS prometheus plugin documentation: https://coredns.io/plugins/metrics/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS manual / plugin chain behavior: https://coredns.io/manual/toc/
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes volumes / ConfigMap volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/#configmap
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- RFC 1035, Domain Names - Implementation and Specification: https://www.rfc-editor.org/rfc/rfc1035
- BIND 9 Administrator Reference Manual / `named-checkzone`: https://bind9.readthedocs.io/

## Issues Found
- The introduction said the CoreDNS hosts plugin is limited to simple A and AAAA records. CoreDNS hosts also automatically generates PTR records, so the text now says it is limited to A, AAAA, and automatically generated PTR records.
- The automatic reload section incorrectly referred to enabling the CoreDNS reload plugin for zone file updates. The shown syntax is the file plugin's own `reload` option, while the CoreDNS reload plugin reloads the Corefile. The section now names the file plugin option and explains that it reloads when the SOA serial changes.
- The reload explanation incorrectly said CoreDNS reloads the zone when modification time or content changes. CoreDNS file plugin documentation states that zone reload is based on the SOA version changing, so the explanation was corrected.
- The example combining `file` with `forward` claimed unmatched file-plugin queries would be forwarded, but the CoreDNS file plugin requires `fallthrough` for that behavior. The example now includes `fallthrough` and the explanation was updated.
- The PromQL examples used a nonexistent `plugin` label on `coredns_dns_requests_total` and request duration metrics. The examples now use `coredns_dns_responses_total{plugin="file"}` for file-plugin responses and filter request duration by zone instead of plugin.

## Review Notes
The Kubernetes manifests are illustrative snippets for modifying an existing CoreDNS deployment and ConfigMap rather than complete standalone manifests. The CoreDNS image tag `1.11.1` is older but not invalid for the demonstrated file plugin syntax.

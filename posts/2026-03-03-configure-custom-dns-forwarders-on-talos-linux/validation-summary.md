# Validation Summary: How to Configure Custom DNS Forwarders on Talos Linux

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`)
- CoreDNS (Corefile, plugins: `health`, `ready`, `kubernetes`, `prometheus`, `forward`, `cache`, `loop`, `reload`, `loadbalance`)
- Kubernetes (ConfigMap, Pod spec, `dnsPolicy`, `dnsConfig`)
- DNS-over-TLS (DoT) via CoreDNS forward plugin
- Prometheus (metrics, PrometheusRule alerts)
- kubectl, dig, nslookup

## Sources Consulted
- CoreDNS `health` plugin: https://coredns.io/plugins/health/
- CoreDNS `forward` plugin: https://coredns.io/plugins/forward/
- CoreDNS `kubernetes` plugin: https://coredns.io/plugins/kubernetes/
- Talos CLI reference (`talosctl patch`, `talosctl read`): https://www.talos.dev/latest/reference/cli/
- Talos machine config network nameservers reference
- Kubernetes Pod DNS configuration: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found

1. **Invalid CoreDNS `health` plugin option `lazystart`** — The post used `health { lazystart }` in three Corefile examples. The CoreDNS `health` plugin does not support a `lazystart` directive; the only valid option is `lameduck DURATION`. Using `lazystart` would cause CoreDNS to fail parsing the Corefile. Replaced all three occurrences with `health { lameduck 5s }`.

2. **Misleading explanation of `expire` in the `forward` plugin** — The "Handling Failover" section claimed that with `expire 30s`, CoreDNS "skips [a downed server] for 30 seconds before trying again." This is incorrect: `expire` controls how long idle upstream connections are cached (to help prevent TCP exhaustion), not the cooldown for a downed server. A downed server stays down until subsequent health checks succeed. Rewrote the explanation to correctly describe the behavior of `max_fails`, `health_check`, and `expire`.

## Review Notes

- The `talosctl patch machineconfig --patch-file <file>` flag is valid (the alternative `--patch @<file>` form also works). Both are documented in the Talos CLI reference.
- The Prometheus metric names (`coredns_forward_requests_total`, `coredns_forward_responses_total`, `coredns_forward_request_duration_seconds`, `coredns_forward_healthcheck_failures_total`) are all valid CoreDNS forward plugin metrics.
- The `kubectl port-forward -n kube-system svc/kube-dns 9153:9153` works because CoreDNS in Kubernetes typically ships behind the `kube-dns` service for backward compatibility, even though the deployment is CoreDNS.
- The `coredns/coredns:1.11.1` image used in the sidecar example is a real published tag; a newer minor version may be preferable when readers adopt this in production, but the example as written is functional.
- The DNS-over-TLS forward syntax (`tls://1.1.1.1`, `tls_servername cloudflare-dns.com`) matches the documented CoreDNS forward plugin syntax.
- The "Conditional Forwarding Based on Source" section correctly notes that CoreDNS does not natively support source-based routing and demonstrates an acceptable sidecar workaround.

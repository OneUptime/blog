# Validation Summary: How to Configure CoreDNS on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration: `cluster.coreDNS`)
- CoreDNS (Corefile, plugins: kubernetes, forward, cache, hosts, log, health, prometheus, errors, ready, loop, reload, loadbalance)
- Kubernetes (ConfigMaps, Deployments, Services, kubectl operations)
- cluster-proportional-autoscaler (DNS autoscaling)
- Prometheus / ServiceMonitor (monitoring CoreDNS metrics)

## Sources Consulted
- Talos Linux v1.9 configuration reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- CoreDNS cache plugin docs: https://coredns.io/plugins/cache/
- CoreDNS forward plugin docs: https://coredns.io/plugins/forward/
- CoreDNS metrics (prometheus plugin) docs: https://coredns.io/plugins/metrics/
- CoreDNS cache plugin README on GitHub: https://github.com/coredns/coredns/blob/master/plugin/cache/README.md
- Datadog reference on CoreDNS metrics (coredns_cache_hits_total, coredns_forward_responses_total)

## Issues Found
No technical issues found.

Verified items:
- `cluster.coreDNS` block in Talos supports `disabled` (bool) and `image` (string) fields as shown.
- Default Kubernetes cluster DNS service IP `10.96.0.10` is the standard.
- Default Corefile structure and plugin order matches what Talos and upstream Kubernetes ship.
- Cache plugin syntax `success CAPACITY [TTL]`, `denial CAPACITY [TTL]`, and `prefetch AMOUNT [DURATION] [PERCENTAGE%]` matches official docs.
- `forward . 8.8.8.8 8.8.4.4 { max_concurrent 1000 }` is valid forward plugin syntax.
- `health { lameduck 5s }` is valid health plugin syntax.
- `hosts { ... fallthrough }` syntax with inline entries is valid.
- `log` plugin enables query logging as described.
- Metrics listed (`coredns_dns_requests_total`, `coredns_dns_responses_total`, `coredns_dns_request_duration_seconds`, `coredns_cache_hits_total`, `coredns_cache_misses_total`, `coredns_panics_total`, `coredns_forward_responses_total`) all exist — cache_hits/misses come from the cache plugin and forward_responses from the forward plugin (the metrics plugin docs explicitly note other plugins export additional stats).
- `cluster-proportional-autoscaler` image path `registry.k8s.io/cpa/cluster-proportional-autoscaler` and `--default-params` JSON format with `coresPerReplica`, `nodesPerReplica`, `min`, `max`, `preventSinglePointFailure` are correct.
- All `kubectl` commands (get pods/svc/configmap/endpoints, edit configmap, rollout restart, scale, run with --rm) use valid flags and syntax.
- ServiceMonitor with `selector.matchLabels: k8s-app: kube-dns` correctly targets the CoreDNS Service (which uses the `kube-dns` label for backward compatibility).

## Review Notes
- The CoreDNS image example `v1.11.1` was released in late 2023; by May 2026 newer CoreDNS versions exist (1.12.x+). The post uses it only as an illustrative example via `cluster.coreDNS.image`, so it remains functionally correct, but readers should bump to a newer tag in practice.
- The DNS autoscaler snippet omits the companion ConfigMap, ServiceAccount, and RBAC needed to fully deploy `cluster-proportional-autoscaler`. The snippet shown is correct as far as it goes — it just isn't a complete standalone manifest. Not a technical error in what is shown.
- `kubectl get endpoints` still works but `EndpointSlice` is the modern API; this is purely a future-proofing note and not an error today.
- The post's claim that ConfigMap edits persist is accurate for current Talos behavior — Talos provisions the CoreDNS manifests at bootstrap and does not continuously reconcile the Corefile ConfigMap afterwards.

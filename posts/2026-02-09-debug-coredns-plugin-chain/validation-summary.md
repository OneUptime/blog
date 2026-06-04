# Validation Summary: How to Debug CoreDNS Plugin Chain Ordering and Configuration Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- CoreDNS
- CoreDNS Corefile configuration
- Kubernetes DNS
- kubectl
- Prometheus metrics and alerting
- Docker-based CoreDNS validation

## Sources Consulted
- CoreDNS Manual: https://coredns.io/manual/toc/
- CoreDNS log plugin documentation: https://coredns.io/plugins/log/
- CoreDNS errors plugin documentation: https://coredns.io/plugins/errors/
- CoreDNS debug plugin documentation: https://coredns.io/plugins/debug/
- CoreDNS kubernetes plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS prometheus plugin documentation: https://coredns.io/plugins/metrics/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Local verification of `coredns/coredns:1.10.1 -h` command-line flags.

## Issues Found
- Corrected the plugin execution model. The post originally said CoreDNS executes plugins in the order they appear in the Corefile, but official CoreDNS documentation states that different plugin directives execute in the static order compiled into `plugin.cfg`.
- Replaced the cache-before-forward ordering example. The original example claimed `cache` after `forward` was too late, but CoreDNS plugin execution is not determined by Corefile text order. The replacement uses multiple `forward` directives, where official documentation says listed order matters and more specific zones should appear before parent zones.
- Corrected the `fallthrough` explanation. The original text implied that missing `fallthrough` breaks ordinary external queries. The revised text scopes the issue to unresolved names in zones handled by the plugin.
- Corrected the debug plugin description. The original text overstated that debug output shows plugin invocation order and decisions. The revised text reflects that `debug` enables debug logging, disables automatic panic recovery, and individual plugins choose what debug details they emit.
- Replaced the nonexistent CoreDNS `-validate` flag. Local verification of `coredns/coredns:1.10.1 -h` showed no `-validate` option, so the syntax check now uses a short CoreDNS startup parse check with `-conf` and `-dns.port`.
- Corrected `kubectl exec` examples that used a label selector directly. The Kubernetes `kubectl exec` reference expects a pod or resource/name target, so the script now resolves a CoreDNS pod name first.
- Corrected Prometheus metric examples. `coredns_dns_requests_total` does not have a `plugin` label, `coredns_dns_errors_total` is not documented by the CoreDNS prometheus plugin, and the forward health check metric has moved to `coredns_proxy_healthcheck_failures_total{proxy_name="forward", ...}`.

## Review Notes
The test script's cache timing check is a heuristic and can be noisy in real clusters, but it is acceptable as a warning-level smoke test rather than a strict correctness proof.

# Validation Summary: Monitor Node Local DNS Cache with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NodeLocal DNSCache (Kubernetes addon)
- CoreDNS
- Calico (GlobalNetworkPolicy, calicoctl)
- Kubernetes (kubectl, DaemonSet)
- Prometheus Operator (ServiceMonitor, PrometheusRule)
- kube-state-metrics

## Sources Consulted
- Kubernetes NodeLocal DNSCache upstream manifest: https://raw.githubusercontent.com/kubernetes/kubernetes/master/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml
- Kubernetes NodeLocal DNSCache documentation: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- CoreDNS Prometheus plugin (metric names): https://coredns.io/plugins/metrics/
- Prometheus Operator ServiceMonitor / PrometheusRule CRDs: https://prometheus-operator.dev/docs/operator/api/
- kube-state-metrics DaemonSet metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/daemonset-metrics.md

## Issues Found
1. **Wrong metrics port (8080 → 9253).** The Step 3 command `curl -s "http://169.254.20.10:8080/metrics"` used port 8080, but in the upstream node-local-dns manifest port 8080 is the `/health` endpoint and Prometheus metrics are exposed on port 9253 (the Corefile contains `prometheus :9253`). Updated the curl command to use port 9253 so it actually returns metrics.
2. **Inaccurate default memory limit claim.** The Best Practices section said "default 70Mi is often too low." The upstream nodelocaldns.yaml only sets `requests: cpu: 25m / memory: 5Mi` and defines no memory limit at all. Rewrote the bullet to recommend setting explicit memory requests and limits, noting the actual upstream defaults.

## Review Notes
- The link-local IP `169.254.20.10` is the conventional default used by the upstream manifest's `__PILLAR__LOCAL__DNS__` placeholder; this is correct.
- The three `sed` substitutions (`__PILLAR__DNS__SERVER__`, `__PILLAR__LOCAL__DNS__`, `__PILLAR__DNS__DOMAIN__`) match the placeholders in the upstream manifest.
- Calico `GlobalNetworkPolicy` schema (`apiVersion: projectcalico.org/v3`, `selector: all()`, `order`, `types`, `egress` with `action`/`protocol`/`destination.nets`/`destination.ports`) is correct. Note that in Calico lower `order` values are evaluated first, so `order: 50` is indeed higher priority than the default; the inline comment is accurate.
- CoreDNS metric names referenced (`coredns_cache_hits_total`, `coredns_cache_misses_total`, `coredns_forward_requests_total`, `coredns_dns_request_duration_seconds`) match the names exposed by the CoreDNS `cache`, `forward`, and built-in metrics plugins that node-local-dns embeds.
- kube-state-metrics metric names `kube_daemonset_status_number_ready` and `kube_daemonset_status_desired_number_scheduled` are correct (modern kube-state-metrics still exposes these as the canonical DaemonSet status gauges).
- The `ServiceMonitor` references `port: metrics`, which matches the named port on the `node-local-dns` Service in the upstream manifest.
- One minor caveat the post doesn't mention: when `node-local-dns` is in use, the link-local IP `169.254.20.10` is reached via the host's `nodelocaldns` iptables/dummy-interface plumbing, not through the Calico-managed pod network, so Calico egress rules to `169.254.20.10/32` are mainly relevant when Calico installs host-endpoint or default-deny policies that would otherwise drop link-local destinations. Acceptable to leave as-is for the scope of this tutorial.

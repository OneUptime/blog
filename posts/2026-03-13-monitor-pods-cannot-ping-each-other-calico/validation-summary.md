# Validation Summary: How to Monitor for Pod Connectivity Failures with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (OSS) / Felix
- Kubernetes (DaemonSet, CronJob, Service ClusterIP, kube-dns)
- kube-proxy (iptables/IPVS modes)
- Prometheus + prometheus-operator (PrometheusRule CRD)
- Alertmanager
- BusyBox (`nc`, `nslookup`)
- `calicoctl`, `kubectl`

## Sources Consulted
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico recommended Prometheus metrics: https://docs.tigera.io/calico-cloud/operations/monitor/metrics/recommended-metrics
- Calico Felix configuration reference (prometheusMetricsEnabled / prometheusMetricsPort): https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- prometheus-operator PrometheusRule API (`monitoring.coreos.com/v1`): https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes batch/v1 CronJob API (GA since 1.21): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found

1. **Non-existent Felix metric `felix_iptables_dropped_total`.**
   The PrometheusRule and the diagnosis `grep` referenced `felix_iptables_dropped_total`, which is not a metric exposed by OSS Calico Felix. There is no per-policy packet-drop counter in OSS Felix (`calico_denied_packets` exists but is a separate flow/policy-sync metric typically associated with Calico Enterprise/Cloud).
   - **Fix:** Replaced the diagnosis grep with a pattern that matches real Felix metrics (`felix_int_dataplane_failures`, `felix_ipset_errors`, `felix_iptables_(restore|save)_errors`) and replaced the `CalicoHighPolicyDropRate` alert with a `CalicoDataplaneFailures` alert on `rate(felix_int_dataplane_failures[5m])`, which is a real Felix counter.

2. **Non-existent Felix metric `felix_ipset_errors_total`.**
   The real metric name is `felix_ipset_errors` (no `_total` suffix). Also, the alert was misnamed `CalicoIPIPTunnelDown` even though `ipset_errors` has nothing to do with the IP-in-IP tunnel.
   - **Fix:** Renamed the alert to `CalicoIPSetErrors` and changed the expression to `rate(felix_ipset_errors[5m]) > 0` using the correct metric name.

3. **ICMP `ping` to a Service ClusterIP does not work reliably.**
   The DaemonSet and CronJob both pinged the kube-dns ClusterIP `10.96.0.10`. kube-proxy only DNATs TCP/UDP traffic for Service ports; ICMP packets to a ClusterIP are not forwarded to backing pods (iptables mode drops/leaves them unrouted; IPVS mode may falsely reply because the ClusterIP is bound to the `kube-ipvs0` dummy interface). Either way, ping is not a valid kube-dns connectivity test.
   - **Fix:** Replaced the DaemonSet ping loop with `nc -z -w 2 10.96.0.10 53` (TCP probe to DNS) and the CronJob ping with `nslookup kubernetes.default.svc.cluster.local 10.96.0.10`, which actually exercises kube-dns resolution. Added short comments explaining why ping was avoided.

## Review Notes

- `kubectl patch felixconfiguration default --type merge --patch '{...}'` is correct and matches the Calico FelixConfiguration schema (`prometheusMetricsEnabled`, `prometheusMetricsPort`). Default port 9091 is also correct.
- `monitoring.coreos.com/v1` PrometheusRule is the correct API version for prometheus-operator.
- `batch/v1` CronJob is the correct GA API (since Kubernetes 1.21).
- The narrative still uses the phrase "Felix drop counters" in a couple of places (Symptoms, Root Causes, Prevention, Conclusion) even though OSS Felix does not expose dedicated drop counters. The applied edits make the alert/diagnosis code correct, but a future revision could tighten this language (e.g., "Felix dataplane and ipset error counters") to better match what OSS Calico actually exposes.
- For users who genuinely need per-policy/per-flow drop counters, the post could also point readers to Calico flow logs or Calico Enterprise's `calico_denied_packets` metric — but adding this would expand scope beyond a correctness fix, so it has been noted here rather than inserted.
- The mermaid diagram and overall structure are unchanged and remain accurate.

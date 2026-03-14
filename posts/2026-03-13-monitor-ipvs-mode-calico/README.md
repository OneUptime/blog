# Monitor IPVS Mode in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPVS, Kube-proxy, Kubernetes, Networking, Monitoring, Load Balancing

Description: Learn how to monitor Calico in environments using IPVS-mode kube-proxy, including service routing health, IPVS table consistency, and performance metrics for high-scale Kubernetes clusters.

---

## Introduction

IPVS (IP Virtual Server) is a high-performance in-kernel load balancing mechanism that serves as an alternative to iptables for kube-proxy's service routing. In large Kubernetes clusters with thousands of services, IPVS significantly outperforms iptables-mode kube-proxy due to its O(1) rule lookup complexity versus iptables' O(n) chain traversal.

When running Calico alongside IPVS-mode kube-proxy, understanding how the two interact is important: Calico handles pod network policy via iptables (or eBPF), while IPVS handles service routing. Monitoring both layers ensures that service traffic is correctly load-balanced while Calico's policy rules remain effective and do not conflict with IPVS routing.

This guide covers monitoring Calico in IPVS mode, validating service routing health, checking IPVS table consistency, and diagnosing common IPVS + Calico interaction issues.

## Prerequisites

- Kubernetes cluster with kube-proxy configured in IPVS mode
- Calico v3.27+ installed
- `kubectl` with admin access
- `calicoctl` v3.27+ installed
- `ipvsadm` available on nodes for IPVS table inspection

## Step 1: Verify IPVS Mode is Active

Confirm that kube-proxy is running in IPVS mode.

Check kube-proxy configuration and verify IPVS mode:

```bash
# Check kube-proxy ConfigMap for mode setting
kubectl get configmap kube-proxy -n kube-system -o yaml | grep "mode"

# Verify kube-proxy pods are running with IPVS
kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=10 | grep -i ipvs

# Check IPVS modules are loaded on nodes
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  lsmod | grep -E "ip_vs|nf_conntrack"

# View current IPVS virtual servers on a node
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ipvsadm -ln | head -30
```

## Step 2: Monitor IPVS Table Completeness

Verify that all Kubernetes services have corresponding IPVS entries.

Compare Kubernetes services against IPVS virtual server entries:

```bash
# Count total services (should match IPVS virtual servers)
kubectl get services -A --no-headers | wc -l

# Count IPVS virtual servers on a node
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ipvsadm -ln | grep -c "^TCP\|^UDP"

# Check for services without IPVS entries (sync issues)
kubectl get services -A -o yaml | \
  grep "clusterIP:" | grep -v "None" | awk '{print $2}' | \
  while read ip; do
    echo "Checking IPVS for service IP: $ip"
  done
```

## Step 3: Verify Calico Policy Enforcement with IPVS

Confirm that Calico network policies are correctly enforced when traffic is routed via IPVS.

Test that Calico policies apply to IPVS-routed service traffic:

```bash
# Create a test service and policy
kubectl create deployment web --image=nginx -n test
kubectl expose deployment web --port=80 -n test

# Apply a deny policy that should block access to the service
kubectl apply -n test -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-web-ingress
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
EOF

# Test that policy blocks service access through IPVS
SVC_IP=$(kubectl get svc web -n test -o jsonpath='{.spec.clusterIP}')
kubectl run test --image=curlimages/curl -n test --rm -it -- \
  curl --connect-timeout 5 http://$SVC_IP:80
```

## Step 4: Monitor IPVS Connection Tracking

Track IPVS connection state to detect connection table overflow.

Check IPVS connection table utilization:

```bash
# View active IPVS connections on a node
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  ipvsadm -ln --stats | head -20

# Check connection tracking table size (critical for high-traffic nodes)
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  cat /proc/sys/net/netfilter/nf_conntrack_max

# Check current connection tracking usage vs maximum
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- \
  cat /proc/sys/net/netfilter/nf_conntrack_count
```

## Step 5: Configure Prometheus Monitoring for IPVS

Set up metrics collection for IPVS performance and health.

Create a Prometheus recording rule for IPVS metrics:

```yaml
# ipvs-monitoring-rules.yaml - Prometheus rules for IPVS + Calico monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ipvs-calico-monitoring
  namespace: monitoring
spec:
  groups:
  - name: ipvs-health
    rules:
    - alert: IPVSConnTrackNearFull
      expr: |
        node_nf_conntrack_entries / node_nf_conntrack_entries_limit > 0.8
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Connection tracking table on {{ $labels.node }} is 80%+ full"
        description: "IPVS connection tracking exhaustion can cause packet drops"
    - alert: CalicoIPVSPolicyConflict
      expr: rate(felix_int_dataplane_failures_total[5m]) > 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Calico Felix dataplane failures - possible IPVS conflict"
```

Apply the monitoring rules:

```bash
kubectl apply -f ipvs-monitoring-rules.yaml
```

## Best Practices

- Set `strictARP: true` in the kube-proxy ConfigMap when using IPVS mode to prevent ARP flooding
- Increase `nf_conntrack_max` on nodes with high service traffic when using IPVS + Calico
- Monitor kube-proxy sync duration - slow IPVS sync indicates service routing delays
- Use Calico eBPF mode as an alternative to IPVS + iptables for even better performance at scale
- Configure OneUptime service endpoint monitors to validate that IPVS load balancing is distributing traffic correctly

## Conclusion

Running Calico alongside IPVS-mode kube-proxy provides excellent performance for high-scale Kubernetes clusters, but requires monitoring both the IPVS service routing layer and Calico's policy enforcement layer. By checking IPVS table completeness, verifying policy enforcement for IPVS-routed traffic, and monitoring connection tracking utilization, you can maintain reliable service routing at scale. Use OneUptime to validate service endpoint availability and response times as the user-facing metric for IPVS + Calico health.

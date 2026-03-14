# Monitor Node Local DNS Cache with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, DNS, NodeLocal DNSCache, Kubernetes, Networking, Monitoring, Performance

Description: Learn how to monitor NodeLocal DNSCache in Calico-managed Kubernetes clusters, ensuring DNS caching is operational and correctly integrated with Calico network policies for reliable service discovery.

---

## Introduction

NodeLocal DNSCache is a Kubernetes add-on that runs a DNS caching agent on each node to reduce DNS query latency and load on CoreDNS. By intercepting DNS queries at the node level before they reach CoreDNS, NodeLocal DNSCache reduces average DNS resolution time significantly and provides higher resilience against CoreDNS pod failures.

When used alongside Calico, NodeLocal DNSCache requires specific network policy considerations. By default, Calico's network policies must allow traffic to the NodeLocal DNSCache IP (169.254.20.10 by default) in addition to CoreDNS. If network policies block access to the link-local IP used by NodeLocal DNSCache, pods will experience DNS resolution failures even if CoreDNS is healthy.

This guide covers deploying and monitoring NodeLocal DNSCache alongside Calico, configuring Calico policies to allow DNS cache traffic, and diagnosing DNS-related connectivity issues.

## Prerequisites

- Kubernetes cluster v1.22+ with Calico v3.27+ installed
- `kubectl` with admin access
- `calicoctl` v3.27+ installed
- CoreDNS running as the cluster DNS provider
- Understanding of Kubernetes DNS architecture

## Step 1: Deploy NodeLocal DNSCache

Install the NodeLocal DNSCache DaemonSet on the cluster.

Apply the NodeLocal DNSCache manifest with appropriate configuration:

```bash
# Download the NodeLocal DNSCache manifest
curl -O https://raw.githubusercontent.com/kubernetes/kubernetes/master/cluster/addons/dns/nodelocaldns/nodelocaldns.yaml

# Configure the manifest for your cluster DNS settings
# Replace __PILLAR__DNS__SERVER__ with CoreDNS ClusterIP
COREDNS_IP=$(kubectl get service kube-dns -n kube-system -o jsonpath='{.spec.clusterIP}')
echo "CoreDNS IP: $COREDNS_IP"

sed -i "s/__PILLAR__DNS__SERVER__/$COREDNS_IP/g" nodelocaldns.yaml
sed -i "s/__PILLAR__LOCAL__DNS__/169.254.20.10/g" nodelocaldns.yaml
sed -i "s/__PILLAR__DNS__DOMAIN__/cluster.local/g" nodelocaldns.yaml

# Apply the NodeLocal DNSCache DaemonSet
kubectl apply -f nodelocaldns.yaml

# Wait for all NodeLocal DNSCache pods to be running
kubectl rollout status daemonset node-local-dns -n kube-system --timeout=120s
```

## Step 2: Configure Calico Policies for NodeLocal DNSCache

Create Calico network policies to allow DNS traffic to the node-local cache IP.

Apply GlobalNetworkPolicy rules that allow pods to use NodeLocal DNSCache:

```yaml
# node-local-dns-policy.yaml - Calico policy allowing NodeLocal DNSCache traffic
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-node-local-dns
spec:
  selector: all()
  order: 50          # High priority - DNS must work before other policies apply
  types:
  - Egress
  egress:
  # Allow UDP DNS to NodeLocal DNSCache IP (link-local)
  - action: Allow
    destination:
      nets:
      - 169.254.20.10/32    # NodeLocal DNSCache IP
      ports:
      - 53
    protocol: UDP
  # Allow TCP DNS to NodeLocal DNSCache (for large responses)
  - action: Allow
    destination:
      nets:
      - 169.254.20.10/32
      ports:
      - 53
    protocol: TCP
  # Also allow direct CoreDNS access as fallback
  - action: Allow
    destination:
      selector: "k8s-app == 'kube-dns'"
      ports:
      - 53
```

Apply the policy:

```bash
calicoctl apply -f node-local-dns-policy.yaml

# Verify the policy is active
calicoctl get globalnetworkpolicies | grep "allow-node-local-dns"
```

## Step 3: Validate DNS Resolution Through the Cache

Test that pods are correctly using the NodeLocal DNSCache.

Verify DNS queries are hitting the local cache:

```bash
# Deploy a test pod and check DNS resolution
kubectl run dns-test --image=nicolaka/netshoot --rm -it -- \
  nslookup kubernetes.default.svc.cluster.local 169.254.20.10

# Verify the node-local DNS agent is responding
kubectl run dns-test --image=curlimages/curl --rm -it -- \
  curl -s "http://169.254.20.10:8080/metrics" | grep "coredns_cache"

# Check DNS query latency before and after NodeLocal DNSCache
kubectl run latency-test --image=nicolaka/netshoot --rm -it -- \
  bash -c "for i in {1..10}; do
    time nslookup kubernetes.default.svc.cluster.local > /dev/null 2>&1
  done"
```

## Step 4: Monitor NodeLocal DNSCache Health

Set up monitoring for NodeLocal DNSCache performance and availability.

Configure Prometheus to collect NodeLocal DNSCache metrics:

```yaml
# node-local-dns-servicemonitor.yaml - Prometheus ServiceMonitor for DNS cache
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: node-local-dns-metrics
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
    - kube-system
  selector:
    matchLabels:
      k8s-app: node-local-dns
  endpoints:
  - port: metrics
    interval: 15s
    # Key metrics to monitor:
    # coredns_cache_hits_total - cache hit rate
    # coredns_cache_misses_total - cache miss rate
    # coredns_forward_requests_total - upstream queries to CoreDNS
    # coredns_dns_request_duration_seconds - query latency
```

Create Prometheus alert rules for DNS cache health:

```yaml
# dns-cache-alerts.yaml - alerts for NodeLocal DNSCache health
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: node-local-dns-alerts
  namespace: monitoring
spec:
  groups:
  - name: dns-cache
    rules:
    - alert: NodeLocalDNSCachePodDown
      expr: kube_daemonset_status_number_ready{daemonset="node-local-dns"} < kube_daemonset_status_desired_number_scheduled{daemonset="node-local-dns"}
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "NodeLocal DNSCache pod is down on one or more nodes"
```

Apply the monitoring configuration:

```bash
kubectl apply -f node-local-dns-servicemonitor.yaml
kubectl apply -f dns-cache-alerts.yaml
```

## Step 5: Diagnose DNS Issues in Calico + NodeLocal DNS Environments

Identify whether DNS failures are caused by Calico policy or NodeLocal DNSCache issues.

Use a systematic approach to diagnose DNS failures:

```bash
# Step 1: Check if NodeLocal DNSCache pods are running
kubectl get pods -n kube-system -l k8s-app=node-local-dns

# Step 2: Test direct CoreDNS access (bypass NodeLocal DNS)
kubectl run dns-bypass-test --image=nicolaka/netshoot --rm -it -- \
  nslookup kubernetes.default.svc.cluster.local \
  $(kubectl get svc kube-dns -n kube-system -o jsonpath='{.spec.clusterIP}')

# Step 3: Test NodeLocal DNS directly
kubectl run dns-local-test --image=nicolaka/netshoot --rm -it -- \
  nslookup kubernetes.default.svc.cluster.local 169.254.20.10

# Step 4: Check if Calico is blocking DNS (look for drops to 169.254.20.10)
calicoctl get globalnetworkpolicies | grep dns
```

## Best Practices

- Always create Calico policies allowing DNS before applying other restrictive policies
- Monitor the NodeLocal DNSCache cache hit rate — a low hit rate may indicate TTL configuration issues
- Set the NodeLocal DNSCache memory limit high enough to maintain a warm cache (default 70Mi is often too low)
- Use Calico's high-priority policy ordering for DNS allow rules so they take effect before namespace-level deny policies
- Monitor DNS query latency with OneUptime by checking response times for service discovery endpoints

## Conclusion

NodeLocal DNSCache significantly improves DNS performance in Kubernetes but requires careful integration with Calico network policies. By explicitly allowing traffic to the link-local DNS cache IP in Calico policies and monitoring cache health and hit rates, you can ensure reliable, high-performance service discovery across your cluster. Use OneUptime to monitor application response times that depend on service discovery as an indirect measure of DNS cache health.

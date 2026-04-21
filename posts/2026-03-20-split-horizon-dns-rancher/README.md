# How to Set Up Split-Horizon DNS in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, DNS, Split-Horizon, Kubernetes, Networking

Description: Guide to implementing split-horizon DNS in Rancher for different internal and external name resolution.

## Introduction

How to Set Up Split-Horizon DNS in Rancher is an important DNS capability for production Kubernetes clusters managed by Rancher. This guide provides practical CoreDNS configuration steps and examples for resolving selected zones through internal DNS servers while leaving normal public lookups unchanged.

## Prerequisites

- Rancher-managed Kubernetes cluster using CoreDNS for cluster DNS
- Currently supported Rancher, RKE2, K3s, or downstream Kubernetes versions for production
- Cluster admin access
- Internal DNS resolver IPs reachable from the cluster, such as `10.0.0.53` and `10.0.0.54`
- Understanding of Kubernetes DNS fundamentals
- CNI plugin with NetworkPolicy support if you use egress restrictions

## Architecture Overview

DNS resolution in Rancher-managed Kubernetes clusters is usually handled by CoreDNS. Pods send DNS queries to the cluster DNS Service, and CoreDNS answers Kubernetes Service and Pod records through the `kubernetes` plugin. For split-horizon DNS, add a more specific `forward` rule for the internal zone before the default upstream resolver rule.

## Step 1: Verify Current DNS Configuration

```bash
# Check the cluster DNS Service
kubectl -n kube-system get service kube-dns

# Find the CoreDNS pods and labels
kubectl -n kube-system get pods -o wide --show-labels | grep -E 'coredns|kube-dns'

# Review the active CoreDNS Corefile
kubectl -n kube-system get configmap coredns -o jsonpath='{.data.Corefile}'

# Check whether DNS egress is restricted by NetworkPolicy
kubectl get networkpolicies --all-namespaces
```

## Step 2: Configure the DNS Forwarding Rule

Start from the current CoreDNS ConfigMap and add the internal `forward` rule before the default `forward . /etc/resolv.conf` rule. A minimal Corefile looks like this:

```text
.:53 {
    errors
    health {
        lameduck 5s
    }
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
        ttl 30
    }
    prometheus :9153
    forward corp.example.com 10.0.0.53 10.0.0.54
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
    loadbalance
}
```

Replace `corp.example.com` with your internal zone and keep the existing cluster domain from your current Corefile if it is not `cluster.local`. Preserve any provider-specific entries or additional ConfigMap keys from your cluster. In RKE2 clusters, keep this change in your cluster configuration or GitOps workflow so packaged CoreDNS upgrades do not discard it.

```bash
# Back up the current CoreDNS configuration
kubectl -n kube-system get configmap coredns -o yaml > coredns.backup.yaml

# Edit a copy of the live ConfigMap and add the forward rule shown above
cp coredns.backup.yaml split-horizon-coredns.yaml
${EDITOR:-vi} split-horizon-coredns.yaml

# Apply the updated ConfigMap
kubectl apply -f split-horizon-coredns.yaml

# Restart CoreDNS if you want the change picked up immediately
COREDNS_DEPLOYMENT=$(kubectl -n kube-system get deployment -o name | grep -E 'coredns|kube-dns' | head -1)
kubectl -n kube-system rollout restart "$COREDNS_DEPLOYMENT"
kubectl -n kube-system rollout status "$COREDNS_DEPLOYMENT"
```

## Step 3: Apply DNS Egress Policy

If the application namespace has default-deny egress policies, allow workloads to reach CoreDNS on TCP and UDP port 53. Confirm the CoreDNS pod labels in your cluster before applying the selector.

```yaml
# dns-egress-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-service
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
      podSelector:
        matchLabels:
          k8s-app: kube-dns
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

## Step 4: Test DNS Configuration

```bash
# Test the internal split-horizon zone from inside the cluster
kubectl run dns-test-internal --image=busybox:1.36 --rm -it --restart=Never --command -- nslookup app.corp.example.com

# Verify Kubernetes service DNS still works
kubectl run dns-test-kubernetes --image=busybox:1.36 --rm -it --restart=Never --command -- nslookup kubernetes.default.svc.cluster.local

# Verify normal external lookups still use the default upstream path
kubectl run dns-test-external --image=busybox:1.36 --rm -it --restart=Never --command -- nslookup www.example.com

# Optional: compare the same name through a public resolver outside the cluster
nslookup app.corp.example.com 8.8.8.8
```

## Step 5: Monitor DNS Traffic

```bash
# View recent CoreDNS logs
COREDNS_POD=$(kubectl -n kube-system get pods -o name | grep -E 'coredns|kube-dns' | head -1)
kubectl -n kube-system logs "$COREDNS_POD" --tail=100

# Inspect CoreDNS Prometheus metrics locally in one terminal
kubectl -n kube-system port-forward "$COREDNS_POD" 9153:9153

# In another terminal
curl -s http://127.0.0.1:9153/metrics | grep '^coredns_'
```

## Step 6: Configure Prometheus Alerts for DNS

If Rancher Monitoring or another Prometheus Operator deployment is installed, add alerting rules for the internal DNS forwarders. Add any labels required by your Prometheus `ruleSelector`.

```yaml
# coredns-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: coredns-split-horizon
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: coredns.split-horizon.rules
    rules:
    - alert: CoreDNSForwardHealthcheckFailures
      expr: |
        sum(rate(coredns_proxy_healthcheck_failures_total{proxy_name="forward",to=~"10\\.0\\.0\\.5[34].*"}[5m])) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "CoreDNS health checks are failing for an internal DNS forwarder"

    - alert: CoreDNSServfailFromInternalResolvers
      expr: |
        sum(rate(coredns_proxy_request_duration_seconds_count{proxy_name="forward",to=~"10\\.0\\.0\\.5[34].*",rcode="SERVFAIL"}[5m])) > 0
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "Internal DNS forwarders are returning SERVFAIL through CoreDNS"
```

## Step 7: Troubleshooting Common Issues

```bash
# Show the active Corefile
kubectl -n kube-system get configmap coredns -o jsonpath='{.data.Corefile}'

# Check CoreDNS logs for reload, forward, or plugin errors
COREDNS_POD=$(kubectl -n kube-system get pods -o name | grep -E 'coredns|kube-dns' | head -1)
kubectl -n kube-system logs "$COREDNS_POD" --tail=200 | grep -Ei 'reload|forward|plugin/errors|servfail'

# Query the internal resolver directly from a test pod
kubectl run dns-debug-upstream --image=nicolaka/netshoot --rm -it --restart=Never --command -- dig @10.0.0.53 app.corp.example.com

# Query through CoreDNS from the same type of test pod
kubectl run dns-debug-coredns --image=nicolaka/netshoot --rm -it --restart=Never --command -- dig app.corp.example.com

# If needed, restore the backup
kubectl apply -f coredns.backup.yaml
```

## Conclusion

How to Set Up Split-Horizon DNS in Rancher requires careful understanding of the cluster DNS provider and upstream resolver topology. Test thoroughly in a staging environment before applying changes to production. Monitor CoreDNS metrics and set up alerts to detect resolution issues early.

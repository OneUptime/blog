# How to Fix Calico Pods Cannot Reach External Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, External Services, NAT

Description: Fix connectivity from Calico pods to external services by resolving NAT misconfiguration, network policy egress blocks, and DNS resolution failures.

---

## Introduction

Fixing external service connectivity from Calico pods requires addressing the specific layer where the failure occurs. The most common fixes are enabling `natOutgoing` on the IP pool, adding egress Allow rules to network policies, or fixing CoreDNS resolution failures. Each fix is targeted to the specific root cause identified during diagnosis.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` CLI configured
- `kubectl` with cluster-admin access

## Step 1: Fix — Enable NAT for Outgoing Traffic

If pods can ping external IPs but external services see a non-routable source IP, enable `natOutgoing` on the IP pool.

```bash
# Check current natOutgoing setting
calicoctl get ippools -o yaml | grep -A 3 "natOutgoing:"

# Fix: Enable natOutgoing on the default IP pool
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"natOutgoing": true}}'

# Verify the change was applied
calicoctl get ippool default-ipv4-ippool -o yaml | grep natOutgoing

# Test immediately - no pod restart needed, Felix applies the change quickly
kubectl exec connectivity-test -- curl -s --connect-timeout 10 https://ifconfig.me
# Should now show the node IP, not the pod IP
```

## Step 2: Fix — Add Egress Allow Rules to Network Policies

If a default-deny policy blocks all egress, add explicit rules for external traffic.

```yaml
# calico-egress-allow-external.yaml
# Allows pods to reach external services on common ports
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-external-egress
spec:
  order: 200
  selector: all()
  egress:
    # Allow DNS to CoreDNS
    - action: Allow
      protocol: UDP
      destination:
        ports: [53]
    - action: Allow
      protocol: TCP
      destination:
        ports: [53]
    # Allow HTTPS to external services
    - action: Allow
      protocol: TCP
      destination:
        nets: ["0.0.0.0/0"]
        notNets: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
        ports: [443, 80]
```

```bash
# Apply the egress allow policy
calicoctl apply -f calico-egress-allow-external.yaml

# Test connectivity
kubectl exec connectivity-test -- curl -s --connect-timeout 10 https://google.com
```

## Step 3: Fix — Repair CoreDNS DNS Resolution

If DNS is the root cause of external service failures, fix CoreDNS first.

```bash
# Check CoreDNS pod health
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Restart CoreDNS if pods are unhealthy
kubectl rollout restart deployment coredns -n kube-system
kubectl rollout status deployment coredns -n kube-system

# Test DNS after CoreDNS restart
kubectl exec connectivity-test -- nslookup google.com
kubectl exec connectivity-test -- nslookup kubernetes.default.svc.cluster.local
```

## Step 4: Fix — Restore iptables NAT Rules After Felix Restart

If Felix was restarted or iptables rules were flushed, force Felix to reprogram the rules.

```bash
# Restart the calico-node pod on the affected node to force Felix rule reprogramming
NODE="worker-01"
CALICO_POD=$(kubectl get pods -n calico-system -l app=calico-node \
  --field-selector spec.nodeName=${NODE} -o name | head -1)

kubectl delete "${CALICO_POD}" -n calico-system

# Wait for calico-node to restart and reprogram rules
kubectl rollout status daemonset calico-node -n calico-system

# Verify NAT rules are back
kubectl exec -n calico-system \
  "$(kubectl get pods -n calico-system -l app=calico-node \
    --field-selector spec.nodeName=${NODE} -o name | head -1)" -- \
  iptables -t nat -L cali-nat-outgoing -n 2>/dev/null
```

## Step 5: Verify the Fix

Run the full connectivity test suite to confirm external services are now reachable.

```bash
# Test DNS
kubectl exec connectivity-test -- nslookup google.com

# Test ICMP
kubectl exec connectivity-test -- ping -c 3 8.8.8.8

# Test HTTP
kubectl exec connectivity-test -- curl -s --connect-timeout 10 http://example.com | head -5

# Test HTTPS
kubectl exec connectivity-test -- curl -s --connect-timeout 10 https://google.com | head -5

# Clean up test pod
kubectl delete pod connectivity-test
```

## Best Practices

- Set `natOutgoing: true` on all IP pools as a default in new Calico deployments
- When creating default-deny GlobalNetworkPolicies, always include DNS egress Allow rules as the first step
- Test external connectivity from a new pod after every network policy change
- Use `calicoctl patch` to make in-place changes to IP pools rather than deleting and recreating them

## Conclusion

Fixing external service connectivity from Calico pods involves one or more of: enabling `natOutgoing` on the IP pool, adding egress Allow rules to network policies, or fixing CoreDNS resolution. Always verify the fix with the full connectivity test suite covering DNS, ICMP, HTTP, and HTTPS before closing the incident.

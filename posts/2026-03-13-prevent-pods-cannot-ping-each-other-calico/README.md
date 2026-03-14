# How to Prevent Pods from Being Unable to Ping Each Other with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting

Description: Network policy design patterns and Calico configuration practices that prevent pod-to-pod connectivity failures from occurring in the first place.

---

## Introduction

Preventing pod-to-pod connectivity failures in Calico requires careful network policy design and a systematic approach to testing connectivity changes before they reach production. Most ping failures between pods trace back to overly broad default-deny policies applied without comprehensive allow rules, or to encapsulation mode mismatches introduced during cluster configuration changes.

The most effective prevention strategy is to design NetworkPolicies with explicit allow rules for each communication pattern before enabling default-deny. Calico's policy audit mode allows operators to observe what traffic would be blocked by a policy without actually enforcing it, enabling safe policy development.

This guide covers network policy design patterns, encapsulation mode validation, and connectivity testing practices that collectively prevent pod-to-pod communication failures.

## Symptoms

- Connectivity failures discovered after applying a new NetworkPolicy
- Cross-node communication breaks after cluster upgrades or IP pool changes
- Intermittent pod-to-pod failures on nodes with different subnet configurations

## Root Causes

- Default-deny policy applied before allow rules are validated
- IPIP/VXLAN mode changed without testing cross-node connectivity
- New node subnets added without verifying they fall within existing IP pool CIDR

## Diagnosis Steps

```bash
# Audit existing NetworkPolicies before making changes
kubectl get networkpolicy --all-namespaces -o yaml

# Check encapsulation consistency across IP pools
calicoctl get ippool -o yaml | grep -E "cidr|ipipMode|vxlanMode"

# Verify cross-node connectivity before changes
kubectl run pre-test --image=busybox --restart=Never -- sleep 300
```

## Solution

**Prevention 1: Use Calico audit mode before enabling default-deny**

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: audit-default-deny
spec:
  selector: all()
  types:
  - Ingress
  - Egress
  # Audit mode - log but don't enforce
  ingress:
  - action: Log
  - action: Pass
  egress:
  - action: Log
  - action: Pass
```

**Prevention 2: Always pair default-deny with explicit allow rules**

```yaml
# Step 1: Deploy allow rules for known traffic patterns
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-intra-namespace
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector: {}
  egress:
  - to:
    - podSelector: {}
  - to:  # Allow DNS
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
---
# Step 2: Only then apply default-deny
# (rely on Calico NetworkPolicy ordering or Kubernetes policy being additive)
```

**Prevention 3: Validate encapsulation before IP pool changes**

```bash
# Before changing ipipMode or vxlanMode:
# 1. Test cross-node connectivity
kubectl run node-a-pod --image=busybox -o yaml --dry-run=client \
  --overrides='{"spec":{"nodeName":"<node-a>"}}' -- sleep 300 | kubectl apply -f -
kubectl run node-b-pod --image=busybox -o yaml --dry-run=client \
  --overrides='{"spec":{"nodeName":"<node-b>"}}' -- sleep 300 | kubectl apply -f -
kubectl wait pod/node-a-pod pod/node-b-pod --for=condition=Ready --timeout=60s

# 2. Test before change
B_IP=$(kubectl get pod node-b-pod -o jsonpath='{.status.podIP}')
kubectl exec node-a-pod -- ping -c 3 $B_IP

# 3. Apply the IP pool change
# 4. Test after change immediately
kubectl exec node-a-pod -- ping -c 3 $B_IP

kubectl delete pod node-a-pod node-b-pod
```

**Prevention 4: Document all communication patterns before applying policies**

Create a connectivity matrix:

```plaintext
Service A -> Service B: TCP 8080
Service A -> DNS: UDP 53
Service B -> Database: TCP 5432
Monitoring -> All pods: TCP 9090
```

Translate each row to an explicit NetworkPolicy rule before applying default-deny.

```mermaid
flowchart LR
    A[New policy needed] --> B[Map all communication patterns]
    B --> C[Apply allow rules for each pattern]
    C --> D[Test connectivity in staging]
    D --> E[Enable audit mode in production]
    E --> F[Review audit logs for unexpected blocks]
    F --> G[Apply default-deny in production]
    G --> H[Monitor for connectivity alerts]
```

## Prevention

- Run connectivity regression tests as part of CI/CD for infrastructure changes
- Use Calico's GlobalNetworkPolicy order field to ensure allow rules are evaluated before deny rules
- Review NetworkPolicy changes in pull requests with a network design checklist

## Conclusion

Preventing pod-to-pod connectivity failures requires deliberate network policy design, encapsulation mode validation, and regression testing. Using Calico's audit mode before enforcing default-deny policies is the single most effective prevention measure, as it reveals blocking behavior before it impacts production traffic.

# Zero Trust with ICMP and Ping Rules in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, ICMP, Security, Network

Description: Implement zero trust security using ICMP and Ping Rules in Calico.

---

## Introduction

ICMP and Ping Rules in Calico provides fine-grained network security controls using the `projectcalico.org/v3` API. This guide covers how to zero trust ICMP Rules effectively.

Calico's extensible policy model supports ICMP Rules through its `GlobalNetworkPolicy` and `NetworkPolicy` resources, giving you cluster-wide and namespace-scoped control over traffic that matches your ICMP Rules criteria.

This guide provides practical techniques for zero trust ICMP Rules in your Kubernetes cluster, following security best practices and production-tested patterns.

## Prerequisites

- Kubernetes cluster with Calico v3.26+
- `calicoctl` and `kubectl` installed
- Basic understanding of Calico network policy concepts

## Step 1: Apply Default Deny First

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: zt-default-deny
spec:
  order: 1000
  namespaceSelector: projectcalico.org/name == "production"
  selector: all()
  types:
    - Ingress
    - Egress
```

## Step 2: Define Zero Trust ICMP Rules Rules

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: zt-icmp-rules
  namespace: production
spec:
  order: 100
  selector: all()
  ingress:
    - action: Allow
      protocol: ICMP
      source:
        selector: trust == 'verified'
      icmp:
        type: 8 # Echo request (ping)
    - action: Allow
      protocol: ICMPv6
      source:
        selector: trust == 'verified'
      icmp:
        type: 128 # Echo request (ping)
  egress:
    - action: Allow
      protocol: ICMP
      destination:
        selector: app == 'protected-service'
      icmp:
        type: 8 # Echo request (ping)
    - action: Allow
      protocol: ICMPv6
      destination:
        selector: app == 'protected-service'
      icmp:
        type: 128 # Echo request (ping)
    - action: Allow
      protocol: UDP
      destination:
        namespaceSelector: projectcalico.org/name == "kube-system"
        selector: k8s-app == "kube-dns"
        ports: [53]
    - action: Allow
      protocol: TCP
      destination:
        namespaceSelector: projectcalico.org/name == "kube-system"
        selector: k8s-app == "kube-dns"
        ports: [53]
  types:
    - Ingress
    - Egress
```

## Step 3: Verify No Implicit Trust

```bash
# Verify unauthorized access is blocked

PROTECTED_POD_IP=$(kubectl get pod -n production -l app=protected-service -o jsonpath='{.items[0].status.podIP}')
kubectl exec -n production unauthorized-pod -- ping -c 1 -W 5 "$PROTECTED_POD_IP"
echo "Should be DENIED: $?"
```

## Architecture

```mermaid
flowchart TD
    A[Source Pod] -->|Traffic| B{Calico Policy\nICMP Rules}
    B -->|Allow Rule Matches| C[Destination Pod]
    B -->|No Match / Deny| D[BLOCKED]
    E[Policy Controller] -->|Updates| B
```

## Conclusion

Zero Trust ICMP Rules policies in Calico requires attention to policy ordering, selector accuracy, and bidirectional rule coverage. Follow the patterns in this guide to ensure your ICMP Rules policies are correctly configured, tested, and monitored. Always validate in staging before applying to production, and maintain comprehensive logging for visibility into policy decisions.

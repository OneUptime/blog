# How to Monitor Calico GlobalNetworkPolicy Impact

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Global Policy, Security

Description: Monitor Calico GlobalNetworkPolicy for cluster-wide network traffic control that applies across all namespaces.

---

## Introduction

Calico GlobalNetworkPolicy in Calico provides comprehensive network traffic controls using the `projectcalico.org/v3` API. This guide covers monitoring GlobalNetworkPolicy with production-ready configurations.

## Prerequisites

- Kubernetes cluster with Calico v3.26+
- `calicoctl` and `kubectl` installed

## Core Configuration

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: monitor-globalnetworkpolicy
spec:
  order: 100
  selector: all()
  ingress:
    - action: Allow
      source:
        selector: app == 'authorized'
    - action: Log
    - action: Deny
  egress:
    - action: Allow
      protocol: UDP
      destination:
        ports: [53]
    - action: Allow
      destination:
        selector: app == 'permitted-destination'
    - action: Log
    - action: Deny
  types:
    - Ingress
    - Egress
```

## Implementation

```bash
# Apply policy

calicoctl apply -f monitor-globalnetworkpolicy.yaml

# Verify policy is active
calicoctl get globalnetworkpolicy -o wide

# Test connectivity
kubectl exec -n test test-pod -- curl -s --max-time 5 http://target:8080
echo "Result: $?"
```

## Verification

```bash
# Check Felix policy metrics
curl -s http://localhost:9091/metrics | grep felix_active_local_policies

# Review policy logs on Linux iptables dataplane nodes
journalctl -k -f | grep calico-packet
```

## Architecture

```mermaid
flowchart TD
    A[Source Pod] -->|Traffic| B{GlobalNetworkPolicy\nPolicy}
    B -->|Allow Match| C[Destination]
    B -->|No Match/Deny| D[Blocked]
    E[Felix] -->|Enforces| B
```

## Conclusion

Monitor GlobalNetworkPolicy in Calico ensures your network policies are properly configured, tested, and monitored. Follow the patterns in this guide, validate in staging first, and maintain comprehensive logging for security visibility. Regular policy audits help you keep your cluster's security posture aligned with evolving requirements.

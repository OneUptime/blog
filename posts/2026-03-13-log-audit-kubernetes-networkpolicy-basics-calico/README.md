# How to Log and Audit Kubernetes NetworkPolicy Basics with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Basics, Security

Description: Log Audit Kubernetes NetworkPolicy basics using Calico as the network policy enforcement engine.

---

## Introduction

Log and Audit Kubernetes NetworkPolicy Basics with Calico requires careful policy design in Calico to balance security with performance and availability. The `projectcalico.org/v3` API provides the flexibility needed to handle kubernetes networkpolicy basics while maintaining strict access controls.

This guide covers log audit Kubernetes NetworkPolicy Basics in Calico with production-ready configurations.

## Prerequisites

- Kubernetes cluster with Calico v3.26+
- `calicoctl` and `kubectl` installed

## Core Configuration

```yaml
# Calico NetworkPolicy with Log actions

apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  selector: app == "backend"
  types:
    - Ingress
    - Egress
  ingress:
    - action: Log
      protocol: TCP
      source:
        selector: app == "frontend"
      destination:
        ports:
          - 8080
    - action: Allow
      protocol: TCP
      source:
        selector: app == "frontend"
      destination:
        ports:
          - 8080
  egress:
    - action: Log
      protocol: TCP
      destination:
        selector: app == "database"
        ports:
          - 5432
    - action: Allow
      protocol: TCP
      destination:
        selector: app == "database"
        ports:
          - 5432
    - action: Log
      protocol: UDP
      destination:
        ports:
          - 53
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
```

## Apply and Test

```bash
# Apply Calico NetworkPolicy
calicoctl apply -f basic-network-policy.yaml

# Verify policy is enforced by Calico
calicoctl get networkpolicy allow-frontend-to-backend -n production -o yaml

# Test connectivity
kubectl exec -n production frontend-pod -- curl -s http://backend-service:8080
echo "Frontend to backend (should pass): $?"

kubectl exec -n production other-pod -- curl -s --max-time 5 http://backend-service:8080
echo "Other pod to backend (should fail): $?"
```

## Architecture

```mermaid
flowchart TD
    A[Source] -->|Traffic| B{Calico Policy\nKubernetes NetworkPolicy Basics}
    B -->|Allowed| C[Destination]
    B -->|Denied| D[Blocked]
    E[Felix] -->|Enforces| B
```

## Conclusion

Log Audit Kubernetes NetworkPolicy Basics in Calico requires balancing security controls with operational requirements. Use the patterns in this guide as a starting point, test thoroughly in staging, and monitor policy impact after deployment. Regular review of your policies ensures they remain appropriate as your workload requirements evolve.

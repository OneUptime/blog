# How to Validate Zero Trust Network Policy in Calico Before Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Zero Trust, Security, Microsegmentation

Description: Validate zero trust network policies in Calico to enforce the principle of never trust, always verify across your Kubernetes cluster.

---

## Introduction

Zero Trust Network Policy in Calico implements the principle of never trust, always verify at the Kubernetes network layer. With default-deny policies in place, every connection is evaluated against explicit policy rules, and nothing is permitted unless it is allowed by policy. This eliminates implicit trust that allows compromised workloads to move laterally through the cluster.

Calico's `projectcalico.org/v3` GlobalNetworkPolicy and NetworkPolicy resources provide the building blocks for zero trust: default deny at the cluster level, explicit allow rules for each required communication path, and log rules for traffic decisions you choose to observe.

This guide covers how to validate zero trust network policies in Calico, including the full policy stack from global defaults to workload-specific microsegmentation.

## Prerequisites

- Kubernetes cluster with Calico v3.26+
- `calicoctl` and `kubectl` installed
- Complete traffic map of all required communication paths
- Monitoring and alerting configured

## Core Zero Trust Policy Stack

```yaml
# Layer 1: Global default deny for non-system workloads

apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: zt-global-default-deny
spec:
  namespaceSelector: 'kubernetes.io/metadata.name not in {"calico-system", "kube-public", "kube-system", "tigera-operator"}'
  egress:
    - action: Allow
      protocol: UDP
      destination:
        namespaceSelector: 'kubernetes.io/metadata.name == "kube-system"'
        selector: 'k8s-app == "kube-dns"'
        ports: [53]
    - action: Allow
      protocol: TCP
      destination:
        namespaceSelector: 'kubernetes.io/metadata.name == "kube-system"'
        selector: 'k8s-app == "kube-dns"'
        ports: [53]
  types:
    - Ingress
    - Egress
---
# Layer 2: Application-specific ingress allow rules
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: zt-allow-frontend-to-api-ingress
  namespace: production
spec:
  order: 100
  selector: tier == 'api'
  ingress:
    - action: Allow
      source:
        selector: tier == 'frontend'
      destination:
        ports: [8080]
  types:
    - Ingress
---
# Layer 3: Application-specific egress allow rules
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: zt-allow-frontend-to-api-egress
  namespace: production
spec:
  order: 100
  selector: tier == 'frontend'
  egress:
    - action: Allow
      protocol: TCP
      destination:
        selector: tier == 'api'
        ports: [8080]
  types:
    - Egress
```

## Zero Trust Verification

```bash
# Verify default deny is active
kubectl exec -n production test-pod -- curl -s --max-time 5 http://unauthorized-service:8080
echo "Should timeout (default deny): $?"

# Verify explicit allows work
kubectl exec -n production frontend-pod -- curl -s --max-time 5 http://backend-api:8080
echo "Should succeed (explicit allow): $?"

# Verify lateral movement is blocked
kubectl exec -n production frontend-pod -- nc -vz -w 5 database 5432
echo "Should timeout (no frontend->DB allow): $?"
```

## Zero Trust Policy Architecture

```mermaid
flowchart TD
    ALL[Non-system Workload Traffic] --> GD{GlobalNetworkPolicy\nDefault Deny}
    GD -->|DNS Traffic| DNS[Allow kube-dns :53]
    GD -->|App Traffic| APP{Application\nNetworkPolicy}
    APP -->|Explicit Allow| PERMIT[Traffic Permitted]
    APP -->|No Match| DENY[DENIED - Zero Trust]
```

## Conclusion

Zero trust network policies in Calico require a layered approach: start with global default deny, add required system traffic, then incrementally add application-specific allow rules. The zero trust model is a journey - begin with monitoring mode to discover your traffic patterns, then progressively restrict traffic as you build your allow rule library. Comprehensive logging and monitoring are essential to detect gaps and anomalies in your zero trust posture.

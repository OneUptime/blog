# How to Log and Audit External IP Policies in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, External IP, Security

Description: Configure logging and auditing for External IP Policies in Calico for security visibility.

---

## Introduction

External IP Policies in Calico provides fine-grained network security controls using the `projectcalico.org/v3` API. This guide covers how to log audit External IP effectively.

Calico's extensible policy model supports External IP through its `GlobalNetworkPolicy` and `NetworkPolicy` resources, giving you cluster-wide and namespace-scoped control over traffic that matches your External IP criteria.

This guide provides practical techniques for log audit External IP in your Kubernetes cluster, following security best practices and production-tested patterns.

## Prerequisites

- Kubernetes cluster with Calico v3.26+
- `calicoctl` and `kubectl` installed
- Basic understanding of Calico network policy concepts

## Step 1: Configure Policy Log Output

```bash
kubectl patch felixconfiguration default --type=merge -p '{"spec":{"logPrefix":"calico-packet"}}'
```

## Step 2: Add Log Actions to Policy

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: log-external-ip
  namespace: production
spec:
  order: 100
  selector: all()
  ingress:
    - action: Log
      source:
        nets:
          - 203.0.113.0/24
    - action: Allow
      source:
        nets:
          - 203.0.113.0/24
    - action: Log
    - action: Deny
  types:
    - Ingress
```

## Step 3: Ensure Syslog Logging Is Enabled

```bash
kubectl patch felixconfiguration default --type=merge -p '{"spec":{"logSeveritySys":"Info"}}'
```

## Step 4: Query and Alert

```bash
journalctl -k | grep "calico-packet" | tail -20
```

## Architecture

```mermaid
flowchart TD
    A[Source Pod] -->|Traffic| B{Calico Policy\nExternal IP}
    B -->|Allow Rule Matches| C[Destination Pod]
    B -->|No Match / Deny| D[BLOCKED]
    E[Policy Controller] -->|Updates| B
```

## Conclusion

Log Audit External IP policies in Calico requires attention to policy ordering, selector accuracy, and bidirectional rule coverage. Follow the patterns in this guide to ensure your External IP policies are correctly configured, tested, and monitored. Always validate in staging before applying to production, and maintain comprehensive logging for visibility into policy decisions.

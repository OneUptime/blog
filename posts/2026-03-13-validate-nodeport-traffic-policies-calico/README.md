# How to Validate Calico NodePort Traffic Policies Before Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, NodePort, Security

Description: Validate Calico NodePort traffic policies to secure Kubernetes NodePort service access.

---

## Introduction

NodePort traffic policies in Calico give you control over how traffic flows through Kubernetes service networking. The `projectcalico.org/v3` API provides the tools needed to secure NodePort traffic effectively while maintaining service availability.

Proper NodePort traffic policy configuration is essential for clusters that expose services to external traffic. Without it, any source that can reach your nodes can reach your NodePort services, creating significant attack surface.

This guide covers validating NodePort traffic policies in Calico with practical, production-tested configurations.

## Prerequisites

- Kubernetes cluster with Calico v3.26+
- `calicoctl` and `kubectl` installed
- Calico HostEndpoints configured, or automatic HostEndpoint creation enabled and node labels synced to HostEndpoints
- Understanding of Kubernetes service networking

## Core Configuration

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: secure-nodeport-traffic
spec:
  order: 100
  preDNAT: true
  applyOnForward: true
  selector: has(kubernetes-host)
  ingress:
    - action: Allow
      protocol: TCP
      source:
        nets:
          - 10.0.0.0/8
          - 172.16.0.0/12
      destination:
        ports: ['30000:32767']
    - action: Deny
      protocol: TCP
      destination:
        ports: ['30000:32767']
    - action: Allow
      protocol: UDP
      source:
        nets:
          - 10.0.0.0/8
          - 172.16.0.0/12
      destination:
        ports: ['30000:32767']
    - action: Deny
      protocol: UDP
      destination:
        ports: ['30000:32767']
    - action: Allow
      protocol: SCTP
      source:
        nets:
          - 10.0.0.0/8
          - 172.16.0.0/12
      destination:
        ports: ['30000:32767']
    - action: Deny
      protocol: SCTP
      destination:
        ports: ['30000:32767']
  types:
    - Ingress
```



## Verification

```bash
# Apply the policy

calicoctl apply -f validate-nodeport-traffic.yaml

# Verify NodePort traffic behavior from an allowed or denied source
curl -s --max-time 5 http://<node-ip>:<node-port>
echo "Result: $?"
```

## Architecture

```mermaid
flowchart TD
    A[Client] -->|Request| B[NodePort Traffic]
    B -->|Calico Policy| C{Allow/Deny}
    C -->|Allowed| D[Backend Pods]
    C -->|Denied| E[Blocked at Node]
```

## Conclusion

NodePort traffic policies in Calico provide essential security controls for Kubernetes service traffic. Configure them carefully, test bidirectional traffic flows, and use staged policies to preview impact before enforcement. Regular monitoring of denial rates helps you detect misconfigurations and unauthorized access attempts before they impact service availability.

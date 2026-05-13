# How to Configure Encrypted Pod Traffic in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Encryption, WireGuard, Security

Description: Configure Calico WireGuard encrypted pod traffic to ensure all inter-pod communication is encrypted in transit.

---

## Introduction

Encrypted Pod Traffic in Calico protects inter-node pod communication on the host-to-host portion of the path. Using WireGuard, Calico encrypts inter-node, in-cluster pod traffic transparently, without requiring application changes.

Calico's encryption works alongside network policies - traffic is still subject to policy evaluation, but the payload is encrypted in transit. This combination of network-layer policy enforcement and encryption provides defense in depth for sensitive workloads.

This guide covers configuring WireGuard Encryption in Calico, including enabling WireGuard encryption and combining it with network policy for a complete zero-trust data plane.

## Prerequisites

- Kubernetes cluster with Calico v3.26+ (WireGuard requires Linux kernel 5.6+)
- `calicoctl` and `kubectl` installed
- WireGuard installed on all nodes that should participate in encrypted traffic

## Enable WireGuard Encryption

```bash
# Enable WireGuard encryption cluster-wide

kubectl patch felixconfiguration default --type=merge -p '{
  "spec": {
    "wireguardEnabled": true,
    "wireguardMTU": 1440
  }
}'

# Verify WireGuard is active
calicoctl get node <node-name> -o yaml | grep wireguardPublicKey
kubectl exec -n <calico-namespace> <calico-node-pod> -- wg show
```

## Combine with Network Policy

```yaml
# Encrypt and restrict
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: configure-wireguard-encryption
  namespace: production
spec:
  order: 100
  selector: app == 'payment-service'
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: app == 'authorized-client'
      destination:
        ports: [8443]
  egress:
    - action: Allow
      protocol: TCP
      destination:
        selector: app == 'payment-db'
        ports: [5432]
    - action: Allow
      protocol: UDP
      destination:
        ports: [53]
  types:
    - Ingress
    - Egress
```

## Verify Encryption

```bash
# Verify WireGuard tunnel is established between nodes
kubectl exec -n <calico-namespace> <calico-node-pod> -- wg show all

# Check encryption statistics
kubectl exec -n <calico-namespace> <calico-node-pod> -- wg show all | grep transfer

# Verify no unencrypted traffic (packet capture should show WireGuard frames)
kubectl debug node/<node-name> -it --image=nicolaka/netshoot -- tcpdump -i any -n udp port 51820
```

## Architecture

```mermaid
flowchart LR
    A[Pod A<br/>Node 1] -->|WireGuard Encrypted| B[Node 1 -> Node 2]
    B -->|Decrypt| C[Pod B<br/>Node 2]
    D[Network Policy] -->|Evaluated before encryption| A
    E[Attacker] -.-x|Cannot read traffic| B
```

## Conclusion

Encrypted Pod Traffic with Calico provides transparent, high-performance encryption for inter-node pod traffic. WireGuard integration in Calico makes it straightforward to enable encryption across the entire cluster without changing application code. Combine encryption with strict network policies for a complete zero-trust data plane where traffic is both encrypted and access-controlled. Monitor WireGuard statistics regularly to ensure encryption is active and performing well.

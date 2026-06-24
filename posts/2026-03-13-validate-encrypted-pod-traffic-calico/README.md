# How to Validate Encrypted Pod Traffic in Calico Before Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Encryption, WireGuard, Security

Description: Validate Calico WireGuard encrypted pod traffic to ensure all inter-pod communication is encrypted in transit.

---

## Introduction

Encrypted Pod Traffic in Calico ensures that inter-node pod communication is encrypted on the host-to-host portion of the path. Using WireGuard, Calico encrypts supported in-cluster pod traffic transparently, without requiring application changes.

Calico's encryption works alongside network policies - traffic is still subject to policy evaluation, but the payload is encrypted in transit for supported inter-node flows. This combination of network-layer policy enforcement and encryption provides defense in depth for sensitive workloads.

This guide covers validate WireGuard Encryption in Calico, including enabling WireGuard encryption and combining it with network policy for a complete zero-trust data plane.

## Prerequisites

- Kubernetes cluster with Calico v3.26+ (WireGuard is included in Linux kernel 5.6+ and has been backported to some earlier distribution kernels)
- `calicoctl` and `kubectl` installed
- WireGuard kernel module available on all nodes

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
calicoctl get node <NODE-NAME> -o yaml
kubectl exec -n kube-system <CALICO_NODE_POD> -c calico-node -- wg show
```

## Combine with Network Policy

```yaml
# Encrypt and restrict
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: validate-wireguard-encryption
  namespace: production
spec:
  order: 100
  selector: app == 'payment-service'
  ingress:
    - action: Allow
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
kubectl exec -n kube-system <CALICO_NODE_POD_ON_NODE1> -c calico-node -- wg show all

# Check encryption statistics
kubectl exec -n kube-system <CALICO_NODE_POD_ON_NODE1> -c calico-node -- wg show all | grep transfer

# Verify no unencrypted traffic (packet capture should show WireGuard frames)
kubectl debug node/node1 -it --image=nicolaka/netshoot --profile=netadmin -- tcpdump -i any -n port 51820
```

## Architecture

```mermaid
flowchart LR
    A[Pod A
Node 1] -->|Host-to-host WireGuard encryption| B[Node 1 -> Node 2]
    B -->|Decrypt| C[Pod B
Node 2]
    D[Network Policy] -->|Evaluated before encryption| A
    E[Attacker] -.-x|Cannot read traffic| B
```

## Conclusion

Encrypted Pod Traffic with Calico provides transparent, high-performance encryption for supported inter-node pod traffic. WireGuard integration in Calico makes it straightforward to enable encryption across the entire cluster without changing application code. Combine encryption with strict network policies for a complete zero-trust data plane where supported inter-node traffic is both encrypted and access-controlled. Monitor WireGuard statistics regularly to ensure encryption is active and performing well.

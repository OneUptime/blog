# How to Monitor Encrypted Pod Traffic in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy, Encryption, WireGuard, Security

Description: Monitor Calico WireGuard encrypted pod traffic to ensure all inter-pod communication is encrypted in transit.

---

## Introduction

Encrypted Pod Traffic in Calico uses WireGuard to protect inter-node pod traffic as it crosses the network between Kubernetes nodes. Calico encrypts the host-to-host portion of this traffic transparently, without requiring application changes.

Calico's encryption works alongside network policies - traffic is still subject to policy evaluation, but the payload is encrypted in transit. This combination of network-layer policy enforcement and encryption provides defense in depth for sensitive workloads.

This guide covers monitor WireGuard Encryption in Calico, including enabling WireGuard encryption and combining it with network policy for a complete zero-trust data plane.

## Prerequisites

- Kubernetes cluster with Calico v3.26+ (WireGuard is included in Linux kernel 5.6+ and is backported in some earlier distribution kernels)
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
calicoctl get node <node-name> -o yaml | grep wireguard
CALICO_NODE_NS=$(kubectl get pods -A -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.namespace}')
CALICO_NODE_POD=$(kubectl get pods -A -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n "$CALICO_NODE_NS" "$CALICO_NODE_POD" -- wg show
```

## Combine with Network Policy

```yaml
# Encrypt and restrict
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: monitor-wireguard-encryption
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
CALICO_NODE_NS=$(kubectl get pods -A -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.namespace}')
CALICO_NODE_POD=$(kubectl get pods -A -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n "$CALICO_NODE_NS" "$CALICO_NODE_POD" -- wg show all

# Check encryption statistics
kubectl exec -n "$CALICO_NODE_NS" "$CALICO_NODE_POD" -- wg show all | grep transfer

# Confirm inter-node traffic uses WireGuard frames
kubectl debug node/node1 -it --image=nicolaka/netshoot --profile=netadmin -- tcpdump -i any -n udp port 51820
```

## Architecture

```mermaid
flowchart LR
    A[Pod A
Node 1] -->|WireGuard Encrypted| B[Node 1 -> Node 2]
    B -->|Decrypt| C[Pod B
Node 2]
    D[Network Policy] -->|Enforced at endpoints| A
    E[Attacker] -.-x|Cannot read traffic| B
```

## Conclusion

Encrypted Pod Traffic with Calico provides transparent, high-performance encryption for inter-node pod traffic. WireGuard integration in Calico makes it straightforward to enable encryption across the entire cluster without changing application code. Combine encryption with strict network policies for a complete zero-trust data plane where inter-node traffic is encrypted and access-controlled. Monitor WireGuard statistics regularly to ensure encryption is active and performing well.

# Zero Trust BGP Security with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, BGP, Security, Network Policy

Description: Zero Trust secure BGP sessions in Calico to prevent route injection and unauthorized BGP peering.

---

## Introduction

BGP (Border Gateway Protocol) sessions in Calico are used to distribute pod routes between nodes and to upstream routers. Unsecured BGP sessions are vulnerable to route injection attacks, where a malicious peer could inject false routes and redirect cluster traffic. Securing BGP sessions is an essential part of hardening a production Calico deployment.

Calico supports BGP session authentication using MD5 passwords and can be configured to only peer with authorized BGP peers. The `projectcalico.org/v3` BGPPeer resource lets you configure per-peer authentication settings. BGP passwords do not encrypt BGP traffic.

This guide covers zero trust BGP sessions in Calico to prevent unauthorized route injection and BGP hijacking.

## Prerequisites

- Kubernetes cluster with Calico v3.26+ in BGP mode
- `calicoctl` and `kubectl` installed
- Access to BGP peer configuration on both sides

## Secure BGP Configuration

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: secure-bgp-peer-router01
spec:
  peerIP: 192.168.1.1
  asNumber: 65001
  password:
    secretKeyRef:
      name: bgp-peer-secrets
      key: router01-password
  node: "node01"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: bgp-peer-secrets-reader
  namespace: kube-system # Use calico-system for operator-based installs.
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["bgp-peer-secrets"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: calico-read-bgp-peer-secrets
  namespace: kube-system # Use calico-system for operator-based installs.
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: bgp-peer-secrets-reader
subjects:
  - kind: ServiceAccount
    name: calico-node
    namespace: kube-system # Use calico-system for operator-based installs.
```

```bash
# Create BGP password secret in the namespace where calico-node runs

kubectl create secret generic bgp-peer-secrets \
  --from-literal=router01-password="$(openssl rand -base64 32)" \
  -n kube-system \
  --dry-run=client -o yaml | kubectl apply -f -

# Apply the RBAC and BGP peer with authentication
kubectl apply -f secure-bgp-peer.yaml

# Verify BGP session
calicoctl node status
```

## Verify BGP Security

```bash
# Check BGP peer status
calicoctl node status | grep Established

# Verify the BGPPeer references the password secret
calicoctl get bgppeer secure-bgp-peer-router01 -o yaml

# Check for unauthorized BGP connections
calicoctl get bgppeers -o wide
```

## Architecture

```mermaid
flowchart LR
    C[Calico Node] -->|BGP + MD5 Auth| R[Authorized Router]
    C -.-x|Rejected: no auth| U[Unauthorized Peer]
    R -->|Authorized Routes| C
    U -.-x|Route injection blocked| C
```

## Conclusion

Securing BGP sessions in Calico with MD5 authentication helps prevent route injection attacks and unauthorized BGP peering. Configure BGP passwords using Kubernetes Secrets, apply them to each BGPPeer resource, and monitor your BGP session status regularly to detect unauthorized connection attempts. In high-security environments, combine BGP authentication with strict host endpoint policies to restrict which hosts can establish BGP connections with your nodes.

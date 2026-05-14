# Common Mistakes to Avoid When Securing Calico BGP Sessions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, BGP, Security, Network Policy

Description: Avoid Mistakes secure BGP sessions in Calico to prevent route injection and unauthorized BGP peering.

---

## Introduction

BGP (Border Gateway Protocol) sessions in Calico are used to distribute pod routes between nodes and to upstream routers. Unsecured BGP sessions are vulnerable to route injection attacks, where a malicious peer could inject false routes and redirect cluster traffic. Securing BGP sessions is an essential part of hardening a production Calico deployment.

Calico supports BGP session authentication using MD5 passwords and can be configured to only peer with authorized BGP peers. The `projectcalico.org/v3` BGPPeer resource lets you configure per-peer authentication. Password authentication does not encrypt the BGP data exchange.

This guide covers avoid mistakes BGP sessions in Calico to prevent unauthorized route injection and BGP hijacking.

## Prerequisites

- Kubernetes cluster with Calico v3.26+ in BGP mode
- `calicoctl` and `kubectl` installed
- Access to BGP peer configuration on both sides
- The namespace where the `calico-node` pod runs, usually `calico-system` for operator installs or `kube-system` for manifest installs

## Secure BGP Configuration

Keep the Kubernetes Secret and RBAC resources in `bgp-secret-rbac.yaml`, and keep the Calico BGPPeer resource in `secure-bgp-peer.yaml`:

```yaml
# bgp-secret-rbac.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bgp-peer-secrets
  namespace: calico-system
type: Opaque
stringData:
  router01-password: "replace-with-the-shared-bgp-password"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: bgp-peer-secrets-reader
  namespace: calico-system
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
  namespace: calico-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: bgp-peer-secrets-reader
subjects:
  - kind: ServiceAccount
    name: calico-node
    namespace: calico-system
---
# secure-bgp-peer.yaml
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
```

```bash
# Create the BGP password secret in the calico-node namespace and allow calico-node to read it
kubectl apply -f bgp-secret-rbac.yaml

# Apply BGP peer with authentication
calicoctl apply -f secure-bgp-peer.yaml

# Verify BGP session
calicoctl node status
```

## Verify BGP Security

```bash
# Check BGP peer status
calicoctl node status | grep Established

# Verify the BGPPeer references the password secret
calicoctl get bgppeer secure-bgp-peer-router01 -o yaml | grep -A3 password

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

Securing BGP sessions in Calico with MD5 authentication helps prevent route injection attacks and unauthorized BGP peering. Configure BGP passwords using Kubernetes Secrets in the `calico-node` namespace, apply them to each BGPPeer resource, and monitor your BGP session status regularly to detect unauthorized connection attempts. In high-security environments, combine BGP authentication with strict host endpoint policies to restrict which hosts can establish BGP connections with your nodes.

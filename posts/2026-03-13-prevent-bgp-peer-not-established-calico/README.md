# How to Prevent BGP Peer Not Established in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting

Description: BGP configuration validation and network planning practices that prevent peer session failures in Calico deployments.

---

## Introduction

Preventing BGP peer not established issues requires validating peer configuration before applying, ensuring network connectivity prerequisites are met, and monitoring peer session state continuously. BGP configuration errors (wrong ASN, wrong peer IP) are completely preventable through pre-deployment validation.

## Symptoms

- BGP peer failures after configuration changes
- New BGP peers not establishing on initial configuration

## Root Causes

- BGP peer configuration applied without testing
- Firewall rules not updated before BGP peers configured
- ASN or peer IP typos in BGPPeer resources

## Diagnosis Steps

```bash
calicoctl get bgppeer -o yaml
calicoctl get bgpconfiguration -o yaml
```

## Solution

**Prevention 1: Validate peer connectivity before creating BGPPeer**

```bash
#!/bin/bash
# validate-bgp-peer.sh <peer-ip> <asn>
PEER_IP=$1
PEER_ASN=$2

echo "=== BGP Peer Pre-validation ==="
echo "Testing TCP connectivity to $PEER_IP:179..."
nc -zv $PEER_IP 179 2>&1 && echo "PASS: TCP 179 reachable" || echo "FAIL: TCP 179 not reachable"

echo "Testing ICMP to $PEER_IP..."
ping -c 2 -W 2 $PEER_IP > /dev/null 2>&1 && echo "PASS: Peer reachable" || echo "FAIL: Peer not reachable"

echo "ASN $PEER_ASN - verify this is correct for your network"
```

**Prevention 2: Document BGP topology before configuration**

```yaml
# BGP topology documentation (example)
# Node-to-node mesh (< 100 nodes):
#   - All nodes peer with each other automatically
#   - nodeToNodeMeshEnabled: true in BGPConfiguration
#
# Route reflector (> 100 nodes):
#   - Dedicated route reflector nodes
#   - Only RR nodes peer with all nodes
#   - Other nodes peer only with RR
```

**Prevention 3: Use GitOps for BGP peer changes**

```yaml
# Store BGPPeer resources in Git
# Require review for all changes
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: node-a-to-rr1
spec:
  node: node-a
  peerIP: 10.0.0.100  # Route reflector IP
  asNumber: 64512
```

**Prevention 4: Test BGP changes in staging first**

```bash
# Deploy BGPPeer in staging cluster
calicoctl apply -f bgppeer-staging.yaml
# Wait 60 seconds
calicoctl node status | grep -A5 "BGP summary"
# Verify Established before production deployment
```

```mermaid
flowchart LR
    A[New BGP peer planned] --> B[Run validate-bgp-peer.sh]
    B -- Pass --> C[Document in topology record]
    C --> D[Deploy to staging]
    D --> E[Verify Established in staging]
    E -- Established --> F[Deploy to production]
    F --> G[Monitor peer state]
```

## Prevention

- Run peer connectivity validation before every BGPPeer resource change
- Store BGP topology documentation alongside BGPPeer manifests
- Monitor BGP peer state and alert within 2 minutes of non-Established state

## Conclusion

Preventing BGP peer failures requires pre-validation of TCP 179 connectivity, correct ASN configuration, and testing in staging before production. Most BGP peer failures are configuration errors that are completely preventable with proper validation.

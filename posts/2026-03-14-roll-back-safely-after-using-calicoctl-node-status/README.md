# Rolling Back Safely After Using calicoctl node status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, BGP, Rollback, Kubernetes

Description: Strategies for recovering from issues detected by calicoctl node status, including restoring BGP configurations, fixing broken peering, and reverting networking changes.

---

## Introduction

The `calicoctl node status` command is read-only and does not modify your cluster. However, it often reveals problems that were caused by recent changes to BGP configuration, node labels, or network policy. When these changes cause BGP sessions to drop or fail to establish, you need to roll back the changes that caused the issue.

This guide covers common scenarios where `calicoctl node status` reveals problems and provides rollback procedures for each. The focus is on restoring healthy BGP peering and network connectivity.

## Prerequisites

- Kubernetes cluster with Calico
- `calicoctl` and `kubectl` access
- Knowledge of what was recently changed
- Backup of previous BGP configuration (ideally)

## Rolling Back BGP Configuration Changes

If a BGP configuration change caused peers to drop:

```bash
# Check the current BGP configuration
calicoctl get bgpconfigurations default -o yaml

# Restore the default full-mesh configuration
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  nodeToNodeMeshEnabled: true
  asNumber: 64512
  logSeverityScreen: Info
EOF

# Verify peers re-establish
sleep 15
sudo calicoctl node status
```

## Rolling Back BGP Peer Changes

If explicit BGP peers were added or modified incorrectly:

```bash
# List current BGP peers
calicoctl get bgppeers -o yaml

# Delete a problematic BGP peer
calicoctl delete bgppeer <peer-name>

# Or restore a previous peer configuration
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: route-reflector-1
spec:
  peerIP: 10.0.1.100
  asNumber: 64512
  nodeSelector: all()
EOF
```

## Rolling Back Node Configuration Changes

If a node's BGP configuration was modified incorrectly:

```bash
# Check current node BGP config
calicoctl get node $(hostname) -o yaml | grep -A10 "bgp:"

# Restore correct node BGP configuration
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: Node
metadata:
  name: $(hostname)
spec:
  bgp:
    ipv4Address: $(hostname -I | awk '{print $1}')/24
    asNumber: 64512
EOF

# Wait for BGP to re-establish
sleep 10
sudo calicoctl node status
```

## Emergency: Restoring Full BGP Mesh

If all BGP peering is broken:

```bash
#!/bin/bash
# restore-bgp-mesh.sh
# Emergency script to restore full BGP mesh

echo "=== Emergency BGP Mesh Restoration ==="

# Step 1: Ensure node-to-node mesh is enabled
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  nodeToNodeMeshEnabled: true
  asNumber: 64512
EOF

# Step 2: Remove any custom BGP peers that might be interfering
echo "Removing custom BGP peers..."
for PEER in $(calicoctl get bgppeers -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'); do
  echo "  Removing: $PEER"
  calicoctl delete bgppeer "$PEER"
done

# Step 3: Restart calico-node pods to force BGP re-establishment
echo "Restarting calico-node pods..."
kubectl rollout restart daemonset calico-node -n calico-system

# Step 4: Wait and verify
echo "Waiting for pods to restart..."
kubectl rollout status daemonset calico-node -n calico-system --timeout=120s

echo "Checking BGP status..."
sleep 15
sudo calicoctl node status
```

## Rolling Back IP Pool Changes

IP pool changes can affect BGP route advertisements:

```bash
# Check current IP pools
calicoctl get ippools -o yaml

# Restore the original IP pool
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Verification

After rollback:

```bash
# Check BGP is healthy
sudo calicoctl node status

# Verify all expected peers are established
EXPECTED=$(($(kubectl get nodes --no-headers | wc -l) - 1))
ACTUAL=$(sudo calicoctl node status | grep -c "Established")
echo "Expected peers: $EXPECTED, Actual: $ACTUAL"

# Test connectivity
kubectl run ping-test --image=busybox --rm -it --restart=Never -- ping -c 3 kubernetes.default
```

## Troubleshooting

- **Peers still not establishing after rollback**: Restart the calico-node pod on both sides of the failed peering.
- **Routes not converging after fix**: BGP convergence can take 30-60 seconds. Wait and recheck.
- **Some nodes fixed, others still broken**: Apply the rollback on each affected node. Check for node-specific overrides.
- **Cannot apply configuration changes**: Verify datastore connectivity with `calicoctl get nodes`.

## Conclusion

When `calicoctl node status` reveals BGP problems caused by recent changes, the key is to identify what changed and revert it precisely. Whether the issue is in the BGP configuration, peer definitions, node settings, or IP pools, having backup configurations and tested rollback procedures ensures you can restore healthy networking quickly.

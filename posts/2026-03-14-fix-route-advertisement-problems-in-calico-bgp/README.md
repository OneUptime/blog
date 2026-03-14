# Fixing Route Advertisement Problems in Calico BGP

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, BGP

Description: Step-by-step guide to fix BGP route advertisement failures in Calico, covering peering configuration, AS number alignment, route reflector setup, and IP pool settings.

---

## Introduction

BGP route advertisement problems in Calico prevent pod-to-pod communication across nodes. Once you have diagnosed the specific failure, the fix typically involves correcting BGP peering configuration, aligning AS numbers, fixing firewall rules, or adjusting IP pool advertisement settings.

The fixes in this guide are ordered by the most common root causes. Each section addresses a specific failure mode with the exact configuration changes needed. Apply only the fix that matches your diagnosed problem to avoid introducing new issues.

This guide assumes you have already diagnosed the root cause using BIRD status, BGP peer checks, and route table analysis.

## Prerequisites

- A Kubernetes cluster with Calico in BGP mode
- `kubectl` with cluster-admin access
- `calicoctl` CLI tool installed
- Diagnosis results identifying the specific BGP failure mode
- A maintenance window for changes that affect routing

## Fixing BGP Peering Failures

If BGP peers are not reaching the Established state, fix the peering configuration:

```yaml
# Fix 1: Correct the BGPConfiguration with proper AS number
# Apply this if nodes have mismatched AS numbers
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true
  asNumber: 64512
```

```bash
# Apply the corrected BGP configuration
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true
  asNumber: 64512
EOF

# Verify the change propagated
calicoctl get bgpconfiguration default -o yaml
```

If peering with external routers, configure explicit BGP peers:

```yaml
# Fix 2: Configure explicit BGP peer for external router
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: external-router
spec:
  # IP address of the external BGP peer (your router)
  peerIP: 10.0.0.1
  # AS number of the external peer
  asNumber: 64513
  # Apply to all nodes, or use nodeSelector for specific nodes
  nodeSelector: all()
```

## Fixing Firewall and Security Group Rules

If port 179 is blocked between nodes:

```bash
# For iptables-based firewalls on the nodes themselves
# Add rules to allow BGP traffic between cluster nodes
NODE_CIDR="10.0.0.0/16"

# Allow inbound BGP
iptables -A INPUT -p tcp --dport 179 -s $NODE_CIDR -j ACCEPT
# Allow outbound BGP
iptables -A OUTPUT -p tcp --dport 179 -d $NODE_CIDR -j ACCEPT

# For AWS Security Groups (using AWS CLI)
# aws ec2 authorize-security-group-ingress \
#   --group-id sg-xxxxx \
#   --protocol tcp --port 179 \
#   --source-group sg-xxxxx

# For GCP firewall rules
# gcloud compute firewall-rules create allow-bgp \
#   --allow tcp:179 \
#   --source-ranges $NODE_CIDR \
#   --target-tags kubernetes-node
```

## Fixing IP Pool Advertisement Settings

If BGP is peered correctly but routes are not advertised:

```yaml
# Fix 3: Ensure IP pool is configured for proper encapsulation and advertisement
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  blockSize: 26
  # For nodes on the same L2 network, use Never
  # For nodes across subnets, use CrossSubnet or Always
  ipipMode: CrossSubnet
  vxlanMode: Never
  natOutgoing: true
  nodeSelector: all()
  # Ensure this is NOT set to true
  disabled: false
```

```bash
# Apply the IP pool fix
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  blockSize: 26
  ipipMode: CrossSubnet
  vxlanMode: Never
  natOutgoing: true
  nodeSelector: all()
EOF

# Verify the IP pool configuration
calicoctl get ippool default-ipv4-ippool -o yaml
```

## Setting Up Route Reflectors for Large Clusters

For clusters with more than 50 nodes, disable the full mesh and use route reflectors:

```yaml
# Step 1: Label nodes that will serve as route reflectors
# Choose 2-3 nodes for redundancy
# kubectl label node rr-node-1 route-reflector=true
# kubectl label node rr-node-2 route-reflector=true

# Step 2: Disable full mesh
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  nodeToNodeMeshEnabled: false
  asNumber: 64512
---
# Step 3: Configure route reflector nodes
apiVersion: projectcalico.org/v3
kind: Node
metadata:
  name: rr-node-1
  labels:
    route-reflector: "true"
spec:
  bgp:
    routeReflectorClusterID: 244.0.0.1
---
# Step 4: Create BGP peer for non-RR nodes to peer with RR nodes
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: peer-with-route-reflectors
spec:
  nodeSelector: "!has(route-reflector)"
  peerSelector: route-reflector == 'true'
---
# Step 5: Create BGP peer for RR nodes to peer with each other
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rr-mesh
spec:
  nodeSelector: route-reflector == 'true'
  peerSelector: route-reflector == 'true'
```

```bash
# Apply route reflector configuration
calicoctl apply -f route-reflector-config.yaml

# Verify BGP peering after route reflector setup
sleep 30
calicoctl node status
```

## Verification

Confirm routes are now being advertised correctly:

```bash
# Check BGP peers are all Established
calicoctl node status

# Verify routes exist on all nodes
for NODE in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  ROUTE_COUNT=$(kubectl debug node/$NODE -it --image=nicolaka/netshoot -- \
    ip route show proto bird 2>/dev/null | wc -l)
  echo "$NODE: $ROUTE_COUNT BGP routes"
done

# Test cross-node pod connectivity
kubectl run route-test-1 --image=nginx --restart=Never
kubectl run route-test-2 --image=busybox --restart=Never -- sleep 300
kubectl wait --for=condition=Ready pod/route-test-1 pod/route-test-2 --timeout=60s
SERVER_IP=$(kubectl get pod route-test-1 -o jsonpath='{.status.podIP}')
kubectl exec route-test-2 -- wget -qO- --timeout=5 http://$SERVER_IP && echo "PASS" || echo "FAIL"
kubectl delete pod route-test-1 route-test-2
```

## Troubleshooting

- **Routes appear but disappear after a few minutes**: Check for route flapping caused by unstable BGP sessions. Review calico-node logs for repeated connect/disconnect patterns and check for MTU issues on the network.
- **Route reflector nodes become a single point of failure**: Always deploy at least two route reflectors on separate physical nodes. Use anti-affinity rules to prevent scheduling both on the same host.
- **External router rejects BGP peering**: Verify the external router's BGP configuration accepts the AS number and peer IP configured in Calico. Check the router's BGP logs for negotiation errors.
- **IPIP tunnels not established after IP pool change**: Restart calico-node DaemonSet with `kubectl rollout restart daemonset calico-node -n calico-system` to force tunnel re-establishment.

## Conclusion

Fixing BGP route advertisement problems in Calico depends on the specific failure mode: peering failures require AS number and connectivity fixes, missing routes require IP pool advertisement configuration, and large clusters need route reflectors instead of full mesh. Apply changes incrementally, verify BGP peering state after each change, and test cross-node pod connectivity to confirm the fix is effective.

# How to Use calicoctl node status with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Kubernetes, BGP, Networking, Troubleshooting

Description: Learn how to use calicoctl node status to inspect BGP peering state, route sharing, and node health in Calico clusters.

---

## Introduction

The `calicoctl node status` command displays the BGP peering status for the Calico node on the current host. It reports the state of all BGP sessions, including the peer address, peer type (node-to-node mesh or configured peer), the BGP state, and timing information. This is one of the most important commands for troubleshooting Calico networking issues.

When pods cannot communicate across nodes, `calicoctl node status` is typically the first command to run. It immediately reveals whether BGP sessions are established and routes are being exchanged. A healthy Calico cluster will show all BGP peers in the "Established" state.

This guide demonstrates how to use `calicoctl node status` effectively for monitoring and troubleshooting Calico BGP networking.

## Prerequisites

- Kubernetes cluster with Calico installed using BGP networking
- `calicoctl` CLI installed
- SSH access to cluster nodes (for running directly on nodes)
- `kubectl` access for pod-based execution

## Running calicoctl node status

### Directly on a Node

```bash
sudo calicoctl node status
```

Example output:

```text
Calico process is running.

IPv4 BGP status
+----------------+-------------------+-------+----------+-------------+
|  PEER ADDRESS  |     PEER TYPE     | STATE |  SINCE   |    INFO     |
+----------------+-------------------+-------+----------+-------------+
| 192.168.1.11   | node-to-node mesh | up    | 08:15:30 | Established |
| 192.168.1.12   | node-to-node mesh | up    | 08:15:31 | Established |
| 192.168.1.13   | node-to-node mesh | up    | 08:15:32 | Established |
+----------------+-------------------+-------+----------+-------------+

IPv6 BGP status
No IPv6 peers found.
```

### From a Calico Pod in Kubernetes

```bash
# Find the calico-node pod on a specific node
NODE_NAME="worker-1"
POD=$(kubectl get pods -n calico-system -l k8s-app=calico-node \
  --field-selector spec.nodeName="$NODE_NAME" \
  -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n calico-system "$POD" -- calico-node -birdcl show protocols
```

### Checking All Nodes

```bash
#!/bin/bash
# Check BGP status on all calico-node pods
PODS=$(kubectl get pods -n calico-system -l k8s-app=calico-node \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.nodeName}{"\n"}{end}')

while IFS=$'\t' read -r pod node; do
  echo "=== Node: $node ==="
  kubectl exec -n calico-system "$pod" -- calicoctl node status 2>/dev/null
  echo ""
done <<< "$PODS"
```

## Understanding the Output

### BGP States

The STATE and INFO columns indicate the BGP session health:

- **up / Established**: The session is healthy and routes are being exchanged.
- **start / Active**: The node is trying to connect. The peer may be unreachable.
- **start / Connect**: TCP connection is in progress.
- **start / OpenSent**: BGP OPEN message sent, waiting for response.
- **down**: The session is not active.

### Peer Types

- **node-to-node mesh**: Automatic full mesh BGP between all Calico nodes.
- **global**: A globally configured BGP peer.
- **node specific**: A peer configured for a specific node.

## Monitoring Script

Create a script that alerts on unhealthy BGP sessions:

```bash
#!/bin/bash
# monitor-bgp.sh - Alert on non-established BGP sessions

NAMESPACE="calico-system"
PODS=$(kubectl get pods -n "$NAMESPACE" -l k8s-app=calico-node \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.nodeName}{"\n"}{end}')

EXIT_CODE=0

while IFS=$'\t' read -r pod node; do
  STATUS=$(kubectl exec -n "$NAMESPACE" "$pod" -- calicoctl node status 2>/dev/null)

  # Check for non-established peers
  NON_ESTABLISHED=$(echo "$STATUS" | grep -E "start|down|Active|Connect|OpenSent" | grep -v "^$")

  if [ -n "$NON_ESTABLISHED" ]; then
    echo "WARNING: Node $node has unhealthy BGP sessions:"
    echo "$NON_ESTABLISHED"
    EXIT_CODE=1
  else
    echo "OK: Node $node - all BGP sessions established"
  fi
done <<< "$PODS"

exit $EXIT_CODE
```

## Checking BGP Session Details

For deeper inspection, query BIRD directly from the calico-node pod:

```bash
# Show detailed BGP protocol info
kubectl exec -n calico-system "$POD" -- calico-node -birdcl show protocols all

# Show learned routes
kubectl exec -n calico-system "$POD" -- calico-node -birdcl show route
```

## Verification

Verify your Calico BGP networking is healthy:

```bash
# Quick health check
sudo calicoctl node status | grep -c "Established"

# Compare with expected peer count
EXPECTED_PEERS=$(($(kubectl get nodes --no-headers | wc -l) - 1))
ACTUAL_PEERS=$(sudo calicoctl node status | grep -c "Established")
echo "Expected peers: $EXPECTED_PEERS, Established: $ACTUAL_PEERS"

# Test cross-node connectivity
kubectl exec -it test-pod-on-node1 -- ping -c 3 <pod-ip-on-node2>
```

## Troubleshooting

- **All peers show "Active" or "Connect"**: Check that port 179 (BGP) is open between nodes. Verify firewall rules and security groups.
- **Some peers not listed**: Ensure node-to-node mesh is enabled in BGP configuration, or verify the specific BGP peer definitions.
- **Calico process is not running**: The calico-node container may have crashed. Check `kubectl logs -n calico-system <pod>` for errors.
- **IPv6 peers not showing**: Verify IPv6 is enabled in the Calico installation and that nodes have IPv6 addresses configured.

## Conclusion

The `calicoctl node status` command is the essential first-response tool for BGP networking issues in Calico. It provides immediate visibility into peering state across your cluster. By incorporating it into monitoring scripts and understanding the meaning of each BGP state, you can quickly diagnose and resolve networking problems. Regular status checks, especially after cluster changes, help ensure your Calico BGP mesh remains healthy.

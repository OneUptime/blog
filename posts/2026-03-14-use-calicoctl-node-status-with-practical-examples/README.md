# Using calicoctl node status with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, BGP, Node Status, Kubernetes, Networking

Description: Master calicoctl node status to monitor BGP peering health, diagnose connectivity issues, and understand your Calico network topology through practical examples.

---

## Introduction

The `calicoctl node status` command provides a real-time view of the Calico node's BGP peering state. It shows which peers are connected, their connection state, and how long each session has been established. This command is one of the most frequently used diagnostic tools in Calico troubleshooting.

BGP is the control plane that distributes routing information between Calico nodes. When BGP sessions are not established, pods on different nodes cannot communicate. Understanding the output of `calicoctl node status` is therefore essential for maintaining a healthy Calico network.

This guide walks through practical examples of using `calicoctl node status` for common operational tasks, from basic health checks to advanced topology diagnosis.

## Prerequisites

- A Kubernetes cluster with Calico installed (BGP mode)
- `calicoctl` v3.25+ installed
- Root or sudo access (required for this command)
- At least two nodes in the cluster for meaningful BGP peering

## Basic Usage

```bash
# Run on any Calico node
sudo calicoctl node status
```

Typical output:

```
Calico process is running.

IPv4 BGP status
+---------------+-------------------+-------+----------+-------------+
| PEER ADDRESS  |     PEER TYPE     | STATE |  SINCE   |    INFO     |
+---------------+-------------------+-------+----------+-------------+
| 10.0.1.11     | node-to-node mesh | up    | 08:15:30 | Established |
| 10.0.1.12     | node-to-node mesh | up    | 08:15:31 | Established |
| 10.0.1.13     | node-to-node mesh | up    | 08:15:32 | Established |
+---------------+-------------------+-------+----------+-------------+

IPv6 BGP status
No IPv6 peers found.
```

## Understanding the Output Fields

- **PEER ADDRESS**: The IP address of the remote BGP peer
- **PEER TYPE**: Either `node-to-node mesh` (full mesh) or `global` (explicit BGP peer)
- **STATE**: `up` means the session is active; `start`, `connect`, or `active` indicate problems
- **SINCE**: When the session entered the current state
- **INFO**: `Established` means healthy; other values indicate the specific failure

## Checking Cluster-Wide BGP Health

Run the status check across all nodes:

```bash
#!/bin/bash
# check-bgp-health.sh
# Checks BGP status on all nodes in the cluster

NODES=$(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')

for NODE in $NODES; do
  echo "=== $NODE ==="
  kubectl exec -n calico-system $(kubectl get pod -n calico-system -l k8s-app=calico-node \
    --field-selector spec.nodeName=$NODE -o jsonpath='{.items[0].metadata.name}') \
    -- calicoctl node status 2>/dev/null
  echo ""
done
```

## Diagnosing Specific BGP States

### State: start

The peer is configured but the connection has not been initiated:

```bash
# Check if the peer IP is reachable
ping -c 3 <peer-address>

# Check if BGP port is open on the peer
nc -zv <peer-address> 179
```

### State: connect

The node is attempting to connect but cannot establish a TCP session:

```bash
# Check firewall rules
sudo iptables -L -n | grep 179

# Check if the peer's BGP daemon is running
ssh <peer-address> "sudo calicoctl node status"
```

### State: active

TCP connection established but BGP negotiation failed:

```bash
# Check for AS number mismatch
calicoctl get nodes -o yaml | grep asNumber

# Check BGP configuration
calicoctl get bgpconfigurations default -o yaml
```

## Monitoring BGP Session Stability

Track session flapping by monitoring the SINCE field:

```bash
#!/bin/bash
# monitor-bgp-stability.sh
# Detects BGP session flapping

THRESHOLD_MINUTES=5

while true; do
  OUTPUT=$(sudo calicoctl node status 2>/dev/null)
  
  echo "$OUTPUT" | grep "Established" | while read -r line; do
    PEER=$(echo "$line" | awk '{print $2}')
    SINCE=$(echo "$line" | awk '{print $8}')
    
    # Parse the SINCE time and check how recent it is
    echo "Peer $PEER established since $SINCE"
  done
  
  # Check for non-established peers
  NON_ESTABLISHED=$(echo "$OUTPUT" | grep -v "Established" | grep -E "^\|" | grep -v "PEER")
  if [ -n "$NON_ESTABLISHED" ]; then
    echo "WARNING: Non-established peers detected!"
    echo "$NON_ESTABLISHED"
  fi
  
  sleep 60
done
```

## Using node status with Route Reflectors

In route reflector topologies, the peer type changes:

```bash
sudo calicoctl node status
```

Output with route reflectors:

```
IPv4 BGP status
+---------------+-------------------+-------+----------+-------------+
| PEER ADDRESS  |     PEER TYPE     | STATE |  SINCE   |    INFO     |
+---------------+-------------------+-------+----------+-------------+
| 10.0.1.100    | global            | up    | 08:15:30 | Established |
| 10.0.1.101    | global            | up    | 08:15:31 | Established |
+---------------+-------------------+-------+----------+-------------+
```

`global` peers are explicitly configured BGP peers (like route reflectors), as opposed to the automatic `node-to-node mesh`.

## Integration with Monitoring Systems

Export BGP status as metrics:

```bash
#!/bin/bash
# bgp-metrics.sh
# Outputs BGP metrics in a format suitable for monitoring

OUTPUT=$(sudo calicoctl node status 2>/dev/null)

TOTAL_PEERS=$(echo "$OUTPUT" | grep -c "node-to-node\|global" || true)
ESTABLISHED=$(echo "$OUTPUT" | grep -c "Established" || true)
DOWN=$((TOTAL_PEERS - ESTABLISHED))

echo "calico_bgp_peers_total $TOTAL_PEERS"
echo "calico_bgp_peers_established $ESTABLISHED"
echo "calico_bgp_peers_down $DOWN"

if [ "$DOWN" -gt 0 ]; then
  echo "calico_bgp_health 0"
else
  echo "calico_bgp_health 1"
fi
```

## Verification

Verify BGP is healthy across your cluster:

```bash
# Quick health check
sudo calicoctl node status | grep -c "Established"

# Should match the number of expected peers
EXPECTED_PEERS=$(($(kubectl get nodes --no-headers | wc -l) - 1))
ACTUAL_PEERS=$(sudo calicoctl node status | grep -c "Established")
echo "Expected: $EXPECTED_PEERS, Actual: $ACTUAL_PEERS"
```

## Troubleshooting

- **"Calico process is not running"**: The calico-node container or Felix/BIRD process has stopped. Check container logs and restart if needed.
- **All peers showing "start"**: The BIRD BGP daemon may have failed to start. Check `docker logs calico-node` for BIRD-specific errors.
- **Intermittent peer drops**: Look for network instability or MTU issues. Check `dmesg` for network interface errors on the host.
- **Wrong number of peers**: In full mesh mode, each node should peer with every other node. Missing peers may indicate nodes that failed to register in the datastore.

## Conclusion

`calicoctl node status` is your primary window into Calico's BGP control plane. Regular monitoring of BGP session states, combined with automated health checks and alerting, ensures that routing problems are detected before they impact application traffic. Make this command part of your standard operational toolkit for any Calico deployment.

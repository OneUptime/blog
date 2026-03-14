# Rolling Back Safely After Using calicoctl node run

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Rollback, Node Management, Kubernetes

Description: Safe procedures for stopping, reverting, and recovering from failed calicoctl node run deployments, including handling node registration cleanup and traffic preservation.

---

## Introduction

When `calicoctl node run` creates problems, whether from a misconfigured node, a bad image version, or conflicting network settings, you need to roll back cleanly. Unlike application deployments, rolling back a network infrastructure component requires extra caution because the node may be carrying live traffic.

A failed Calico node can cause pods on that host to lose connectivity, BGP routes to be withdrawn, and network policies to stop being enforced. The rollback procedure must stop the problematic node, clean up its state, and either restore the previous version or remove the node entirely.

This guide provides step-by-step rollback procedures for different failure scenarios when using `calicoctl node run`.

## Prerequisites

- Root access to the affected host
- `calicoctl` installed on the host
- Knowledge of the previous working configuration
- Access to the Calico datastore

## Stopping the Calico Node

The first step in any rollback is stopping the current node cleanly:

```bash
# Graceful stop using calicoctl
sudo calicoctl node stop

# If calicoctl node stop fails, use Docker directly
docker stop calico-node
docker rm calico-node

# Verify the container is stopped
docker ps --filter name=calico-node
```

## Scenario 1: Revert to Previous Image Version

```bash
#!/bin/bash
# rollback-node-image.sh
# Reverts to a previous calico/node image version

PREVIOUS_IMAGE="${1:-calico/node:v3.26.4}"

echo "Rolling back to $PREVIOUS_IMAGE"

# Stop current node
docker stop calico-node 2>/dev/null
docker rm calico-node 2>/dev/null

# Pull the previous image
docker pull "$PREVIOUS_IMAGE"

# Get current node configuration from datastore
NODE_NAME=$(hostname)
NODE_IP=$(calicoctl get node "$NODE_NAME" -o jsonpath='{.spec.bgp.ipv4Address}' | cut -d/ -f1)
NODE_AS=$(calicoctl get node "$NODE_NAME" -o jsonpath='{.spec.bgp.asNumber}')

echo "Restarting with: name=$NODE_NAME ip=$NODE_IP as=${NODE_AS:-default}"

# Start with previous image
sudo calicoctl node run \
  --node-image="$PREVIOUS_IMAGE" \
  --name="$NODE_NAME" \
  --ip="$NODE_IP"

# Verify
sleep 10
sudo calicoctl node status
```

## Scenario 2: Clean Node Removal

If the node should be completely removed from the cluster:

```bash
#!/bin/bash
# remove-calico-node.sh
# Completely removes a Calico node and cleans up its state

NODE_NAME=$(hostname)

echo "Removing Calico node: $NODE_NAME"

# Stop the container
docker stop calico-node 2>/dev/null
docker rm calico-node 2>/dev/null

# Remove the node from the datastore
calicoctl delete node "$NODE_NAME"

# Clean up iptables rules
sudo iptables-save | grep -v "cali-" | sudo iptables-restore

# Clean up IPAM allocations for this node
calicoctl ipam release --node="$NODE_NAME"

# Remove Calico interfaces
for iface in $(ip link show | grep "cali" | awk -F: '{print $2}' | tr -d ' '); do
  sudo ip link delete "$iface" 2>/dev/null
done

# Clean up routes
ip route | grep "bird" | while read -r route; do
  sudo ip route del $route 2>/dev/null
done

echo "Node cleanup complete."
```

## Scenario 3: Configuration Rollback

When the node started but with wrong configuration:

```bash
#!/bin/bash
# rollback-node-config.sh
# Restops the node with corrected configuration

# Stop the misconfigured node
docker stop calico-node
docker rm calico-node

# Restore the correct configuration
# Option A: Use a saved environment file
cp /etc/calico/calico-node.env.backup /etc/calico/calico-node.env

# Option B: Manually specify correct values
cat > /etc/calico/calico-node.env << 'EOF'
DATASTORE_TYPE=etcdv3
ETCD_ENDPOINTS=https://10.0.1.5:2379
ETCD_KEY_FILE=/etc/calico/certs/key.pem
ETCD_CERT_FILE=/etc/calico/certs/cert.pem
ETCD_CA_CERT_FILE=/etc/calico/certs/ca.pem
CALICO_IP=autodetect
CALICO_IP_AUTODETECTION_METHOD=interface=ens192
EOF

# Restart with corrected configuration
source /etc/calico/calico-node.env
sudo -E calicoctl node run \
  --node-image=calico/node:v3.27.0 \
  --name=$(hostname)

# Verify
sleep 10
sudo calicoctl node status
```

## Preserving Traffic During Rollback

To minimize disruption during rollback:

```bash
#!/bin/bash
# graceful-rollback.sh
# Drains workloads before rolling back the Calico node

NODE_NAME=$(hostname)

# Step 1: Cordon the node (if in Kubernetes)
kubectl cordon "$NODE_NAME" 2>/dev/null

# Step 2: Drain pods (if in Kubernetes)
kubectl drain "$NODE_NAME" --ignore-daemonsets --delete-emptydir-data --timeout=120s 2>/dev/null

# Step 3: Wait for pods to drain
echo "Waiting for pods to drain..."
sleep 30

# Step 4: Stop Calico node
docker stop calico-node
docker rm calico-node

# Step 5: Start with previous version
sudo calicoctl node run --node-image=calico/node:v3.26.4 --name="$NODE_NAME"

# Step 6: Wait and verify
sleep 15
sudo calicoctl node status

# Step 7: Uncordon the node
kubectl uncordon "$NODE_NAME" 2>/dev/null

echo "Graceful rollback complete."
```

## Post-Rollback Verification

```bash
#!/bin/bash
# post-rollback-verify.sh

echo "=== Post-Rollback Verification ==="

# Node container running
echo "Container status:"
docker ps --filter name=calico-node --format "{{.Status}}"

# Node process healthy
echo ""
echo "Node status:"
sudo calicoctl node status

# Check for errors in logs
echo ""
echo "Recent errors:"
docker logs calico-node --since 2m 2>&1 | grep -i "error" | tail -5

# Verify BGP established
echo ""
echo "BGP state:"
sudo calicoctl node status | grep -E "(Established|start|connect|active)"

# Check network connectivity
echo ""
echo "Route count:"
ip route | grep -c "cali\|bird"
```

## Verification

Run the post-rollback verification:

```bash
sudo ./post-rollback-verify.sh
```

All checks should pass, BGP peers should show as "Established", and there should be no recent errors in the logs.

## Troubleshooting

- **Node stop hangs**: Use `docker kill calico-node` as a last resort if `docker stop` hangs.
- **Stale node entry in datastore**: If you cannot start a new node because the old entry exists, use `calicoctl delete node <name>` to clean it up.
- **iptables rules left behind after stop**: The cleanup script above removes leftover `cali-` chains. Run it if pods have connectivity issues after stopping the node.
- **IPAM leaks after node removal**: Use `calicoctl ipam check` to identify leaked IP addresses, then release them with `calicoctl ipam release`.

## Conclusion

Rolling back `calicoctl node run` requires a methodical approach: stop the node cleanly, clean up any state if needed, and restart with the correct configuration or image. By combining graceful workload draining with systematic node recovery, you minimize disruption while resolving the issue that triggered the rollback.

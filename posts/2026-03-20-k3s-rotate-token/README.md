# How to Rotate K3s Token

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Security, Token, DevOps

Description: Learn how to rotate the K3s cluster token to maintain security and prevent unauthorized nodes from joining your cluster.

## Introduction

The K3s cluster token (`K3S_TOKEN`) is a shared secret used to authenticate nodes joining the cluster. If this token is compromised, an attacker could join unauthorized nodes to your cluster. Rotating the token periodically - or immediately after a suspected compromise - is a critical security practice. This guide explains the process for safely rotating the K3s token with coordinated service restarts.

## Understanding K3s Token Usage

The K3s token serves multiple purposes:
- **Node authentication**: Agents use it to authenticate when joining the server
- **Certificate bootstrapping**: Used to bootstrap kubelet client certificates
- **Bootstrap data encryption**: The server token is used as the PBKDF2 passphrase for bootstrap data stored in the datastore

The server token is stored at `/var/lib/rancher/k3s/server/token` on the server. If you configure a separate agent token, it is stored at `/var/lib/rancher/k3s/server/agent-token`.

## Prerequisites

- Root/sudo access to all K3s nodes
- A maintenance window (service restarts required)
- List of all agent nodes in the cluster
- A K3s release that includes `k3s token rotate` support (`v1.28.2+k3s1`, `v1.27.7+k3s1`, `v1.26.10+k3s1`, `v1.25.15+k3s1`, or later)

## Step 1: Check the Current Token

```bash
# View the current server token

cat /var/lib/rancher/k3s/server/token

# If a separate agent token is configured, view it as well
cat /var/lib/rancher/k3s/server/agent-token

# Token files are written in secure format:
# K10<cluster-ca-hash>::<credentials>
```

## Step 2: Generate a New Token

You can use any sufficiently random string as the new token:

```bash
# Generate a cryptographically secure random token
NEW_TOKEN=$(openssl rand -hex 32)
echo "New token: $NEW_TOKEN"

# Store the new token for reference
echo "$NEW_TOKEN" > /tmp/new-k3s-token.txt

# Keep a copy of the current server token as well.
# Snapshots taken before rotation require the old token when restoring the cluster.
cp /var/lib/rancher/k3s/server/token /root/old-k3s-server-token.txt
```

## Step 3: Update the Server Token

### Option A: Using K3s Config File

```bash
# On every server node, add the new token without overwriting existing settings
install -d -m 755 /etc/rancher/k3s/config.yaml.d

cat > /etc/rancher/k3s/config.yaml.d/90-token-rotation.yaml << EOF
token: "your-new-secure-token-here"
EOF

# On one server node, rotate the cluster's server token
OLD_TOKEN=$(cat /var/lib/rancher/k3s/server/token)
k3s token rotate --token "$OLD_TOKEN" --new-token "your-new-secure-token-here"

# Restart K3s on each server node to pick up the new token
# In HA clusters, restart servers one at a time
systemctl restart k3s

# Verify the server is healthy
kubectl get nodes
```

### Option B: Using Environment Variables

```bash
# On every server node, update the environment file without overwriting other values
if [ -f /etc/systemd/system/k3s.service.env ] && \
  grep -q '^K3S_TOKEN=' /etc/systemd/system/k3s.service.env; then
  sed -i 's|^K3S_TOKEN=.*|K3S_TOKEN=your-new-secure-token-here|' \
    /etc/systemd/system/k3s.service.env
else
  echo 'K3S_TOKEN=your-new-secure-token-here' >> /etc/systemd/system/k3s.service.env
fi

# On one server node, rotate the cluster's server token
OLD_TOKEN=$(cat /var/lib/rancher/k3s/server/token)
k3s token rotate --token "$OLD_TOKEN" --new-token "your-new-secure-token-here"

# Restart K3s on each server node to pick up the new token
systemctl restart k3s
```

## Step 4: Update Agent Nodes

If your cluster uses the default shared token, every agent node must be updated and restarted with the new token. If you configured a separate `K3S_AGENT_TOKEN`, only agents using the token being rotated need to be updated.

```bash
#!/bin/bash
# update-agent-token.sh
# Run this on each agent node

NEW_TOKEN="your-new-secure-token-here"

# Stop the agent service
systemctl stop k3s-agent

# Update the token in the agent environment file
if [ -f /etc/systemd/system/k3s-agent.service.env ] && \
  grep -q '^K3S_TOKEN=' /etc/systemd/system/k3s-agent.service.env; then
  # Update existing env file
  sed -i "s|^K3S_TOKEN=.*|K3S_TOKEN=$NEW_TOKEN|" \
    /etc/systemd/system/k3s-agent.service.env
else
  # Add the token without overwriting other environment settings
  echo "K3S_TOKEN=$NEW_TOKEN" >> /etc/systemd/system/k3s-agent.service.env
fi

# Start the agent
systemctl start k3s-agent

echo "Agent token updated and service restarted"
```

If agents were installed with the token embedded in `/etc/rancher/k3s/config.yaml`:

```bash
# Stop agent
systemctl stop k3s-agent

# Add a config drop-in so existing agent settings are preserved
install -d -m 755 /etc/rancher/k3s/config.yaml.d

cat > /etc/rancher/k3s/config.yaml.d/90-token-rotation.yaml << EOF
token: "your-new-secure-token-here"
EOF

# Restart agent
systemctl start k3s-agent
```

## Step 5: Verify All Nodes Have Reconnected

After updating all agents, verify the cluster is healthy:

```bash
# Check all nodes are Ready
kubectl get nodes

# If an agent hasn't reconnected, check its logs
journalctl -u k3s-agent -f
```

## Step 6: Handle Node Password Secrets If Needed

K3s agents store a per-node password locally at `/etc/rancher/node/password`, and the cluster stores a corresponding node-password secret. If a node cannot rejoin because its local password was lost or the hostname is being reused, delete the node from the cluster so K3s removes the old node-password secret:

```bash
# On the K3s server, delete the stale node object
kubectl delete node <node-name>

# Verify the corresponding node-password secret has been removed
kubectl get secret -n kube-system <node-name>.node-password.k3s
# Expect "NotFound" after the node is deleted
```

## Automating Token Rotation

For environments requiring regular token rotation, create a rotation script:

```bash
#!/bin/bash
# /usr/local/bin/rotate-k3s-token.sh

set -euo pipefail

AGENT_NODES=("192.168.1.11" "192.168.1.12" "192.168.1.13")
SSH_USER="root"

# Save the current token for the rotation command and for older snapshots
OLD_TOKEN=$(cat /var/lib/rancher/k3s/server/token)

# Generate new token
NEW_TOKEN=$(openssl rand -hex 32)
echo "Generated new token: ${NEW_TOKEN:0:8}..."

# Update the server environment file without overwriting other values
if [ -f /etc/systemd/system/k3s.service.env ] && \
  grep -q '^K3S_TOKEN=' /etc/systemd/system/k3s.service.env; then
  sed -i "s|^K3S_TOKEN=.*|K3S_TOKEN=$NEW_TOKEN|" /etc/systemd/system/k3s.service.env
else
  echo "K3S_TOKEN=$NEW_TOKEN" >> /etc/systemd/system/k3s.service.env
fi

# Rotate the token in cluster state and restart the server
k3s token rotate --token "$OLD_TOKEN" --new-token "$NEW_TOKEN"
systemctl restart k3s
echo "Server updated"

# Update each agent via SSH
for NODE in "${AGENT_NODES[@]}"; do
  echo "Updating agent: $NODE"
  ssh "$SSH_USER@$NODE" "
    set -e
    if [ -f /etc/systemd/system/k3s-agent.service.env ] && grep -q '^K3S_TOKEN=' /etc/systemd/system/k3s-agent.service.env; then
      sed -i 's|^K3S_TOKEN=.*|K3S_TOKEN=$NEW_TOKEN|' /etc/systemd/system/k3s-agent.service.env
    else
      echo 'K3S_TOKEN=$NEW_TOKEN' >> /etc/systemd/system/k3s-agent.service.env
    fi
    systemctl restart k3s-agent
  "
  echo "Agent $NODE updated"
done

echo "Token rotation complete"
```

## Conclusion

Rotating the K3s token is a straightforward but important security practice. The process requires coordinating updates across all server and agent nodes with brief service restarts. For multi-agent clusters, consider using configuration management tools like Ansible to automate the token update across all nodes simultaneously, minimizing the maintenance window duration.

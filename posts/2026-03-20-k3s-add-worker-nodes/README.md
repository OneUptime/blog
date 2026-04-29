# How to Add Worker Nodes to K3s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Cluster Management, Scaling, DevOps

Description: Learn how to expand your K3s cluster by adding worker nodes to increase compute capacity for your workloads.

## Introduction

As your workloads grow, you'll need to scale out your K3s cluster by adding worker nodes. K3s makes this remarkably simple - joining a new agent node requires just a single command with the server URL and token. This guide covers adding worker nodes to both single-server and HA K3s clusters.

## Prerequisites

- A running K3s server with `kubectl` access
- One or more new machines to use as worker nodes
- Network connectivity between the new nodes and the K3s server on port 6443
- Root/sudo access on all machines

## Step 1: Get the Server URL and Token

First, retrieve the information needed to join new nodes:

```bash
# On the K3s server node, get the server IP/hostname

hostname -I | awk '{print $1}'

# Get the node token (needed for agent authentication)
cat /var/lib/rancher/k3s/server/node-token

# The token looks like:
# K10abc123...::server:secretpassword
```

## Step 2: Prepare the New Worker Node

On the machine you want to add as a worker node:

```bash
# Update the system
apt-get update && apt-get upgrade -y   # Debian/Ubuntu
# or
yum update -y                           # RHEL/CentOS

# Disable swap (recommended for Kubernetes)
swapoff -a
sed -i '/swap/d' /etc/fstab

# Ensure required ports are open in firewall
# K3s agent needs outbound access to server:6443
# If you keep a host firewall enabled, allow the default K3s pod/service CIDRs
# and allow node-to-node traffic for Flannel VXLAN (UDP 8472) and kubelet
# metrics/API (TCP 10250) only from trusted node networks

# For UFW (replace <node-subnet> if your nodes are on a different network)
ufw allow 6443/tcp
ufw allow from 10.42.0.0/16 to any
ufw allow from 10.43.0.0/16 to any
ufw allow proto udp from <node-subnet> to any port 8472
ufw allow proto tcp from <node-subnet> to any port 10250

# For firewalld (replace <node-subnet> if your nodes are on a different network)
firewall-cmd --permanent --add-port=6443/tcp
firewall-cmd --permanent --zone=trusted --add-source=10.42.0.0/16
firewall-cmd --permanent --zone=trusted --add-source=10.43.0.0/16
firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="<node-subnet>" port port="8472" protocol="udp" accept'
firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="<node-subnet>" port port="10250" protocol="tcp" accept'
firewall-cmd --reload
```

## Step 3: Install the K3s Agent

Run the K3s installer with agent mode and your server details:

```bash
# Basic agent installation
curl -sfL https://get.k3s.io | \
  K3S_URL=https://<server-ip>:6443 \
  K3S_TOKEN=<node-token> \
  sh -

# The agent will:
# 1. Download the K3s binary
# 2. Configure the systemd service
# 3. Start and connect to the server
```

### Specifying a Version

To pin the agent to the same version as your server:

```bash
# Check the server version first
kubectl version

# Install matching version on agent
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_VERSION=vX.Y.Z+k3s1 \
  K3S_URL=https://<server-ip>:6443 \
  K3S_TOKEN=<node-token> \
  sh -
```

### Using a Config File Instead

Create a config file for cleaner configuration management:

```bash
# Create the config directory on the agent node
mkdir -p /etc/rancher/k3s

# Create agent config file
cat > /etc/rancher/k3s/config.yaml << EOF
server: "https://<server-ip>:6443"
token: "<node-token>"
# Optional: Set a custom node name
node-name: "worker-01"
# Optional: Add node labels
node-label:
  - "role=worker"
  - "zone=us-east-1a"
EOF

# Install K3s as agent (config file is auto-detected)
curl -sfL https://get.k3s.io | sh -s - agent
```

## Step 4: Verify the Node Joined

From the K3s server, verify the new node appears:

```bash
# Watch nodes join the cluster
kubectl get nodes -w

# The new node should appear as Ready within 30-60 seconds
# NAME         STATUS   ROLES    AGE   VERSION
# k3s-server   Ready    control-plane,master   10d   vX.Y.Z+k3s1
# worker-01    Ready    <none>                  30s   vX.Y.Z+k3s1

# Check node details
kubectl describe node worker-01
```

## Step 5: Add Node Labels and Taints (Optional)

Label the new node for workload targeting:

```bash
# Add role label
kubectl label node worker-01 node-role.kubernetes.io/worker=true

# Add custom labels for workload placement
kubectl label node worker-01 \
  topology.kubernetes.io/zone=us-east-1a \
  hardware=high-memory \
  environment=production

# Verify labels
kubectl get node worker-01 --show-labels
```

## Step 6: Adding Multiple Nodes with Ansible

For adding many nodes efficiently, use Ansible:

```yaml
# playbook-add-agents.yaml
---
- name: Add K3s agent nodes
  hosts: k3s_agents
  become: true
  vars:
    k3s_server_url: "https://192.168.1.10:6443"
    k3s_token: "<node-token>"
    k3s_version: "vX.Y.Z+k3s1"

  tasks:
    - name: Disable swap
      command: swapoff -a
      when: ansible_swaptotal_mb > 0

    - name: Install K3s agent
      shell: |
        curl -sfL https://get.k3s.io | \
        INSTALL_K3S_VERSION={{ k3s_version }} \
        K3S_URL={{ k3s_server_url }} \
        K3S_TOKEN={{ k3s_token }} \
        sh -
      args:
        creates: /usr/local/bin/k3s

    - name: Wait for agent to be ready
      pause:
        seconds: 30
```

Run the playbook:

```bash
ansible-playbook -i inventory.ini playbook-add-agents.yaml
```

## Troubleshooting Node Join Issues

**Node stuck in NotReady state:**

```bash
# Check agent logs on the new node
journalctl -u k3s-agent -f

# Common issues:
# - Wrong token: "Node password rejected"
# - Network issue: "connection refused to server:6443"
# - Time sync: ensure NTP is working on all nodes
```

**Node not appearing in kubectl get nodes:**

```bash
# Verify the agent service is running
systemctl status k3s-agent

# Check server connectivity
curl -k https://<server-ip>:6443/readyz
```

## Conclusion

Adding worker nodes to K3s is one of its most compelling features - a single install command is all that's needed. For production environments, use a config file approach for consistent, reproducible node configuration. As your cluster grows, consider using infrastructure-as-code tools like Ansible or Terraform to manage node additions at scale.

# How to Add the Tailscale Extension to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Tailscale, VPN, Networking, System Extensions, Kubernetes, Infrastructure

Description: Learn how to install and configure the Tailscale extension on Talos Linux for secure mesh VPN connectivity between your cluster nodes and other resources.

---

Tailscale is a mesh VPN built on WireGuard that makes it easy to connect machines across different networks securely. Adding Tailscale to your Talos Linux nodes opens up possibilities like connecting nodes across data centers, enabling remote access to cluster services, and building hybrid cloud architectures. Since Talos does not allow installing packages through a shell, Tailscale is added as a system extension that runs at the OS level.

## Why Tailscale on Talos?

There are several compelling reasons to add Tailscale to your Talos nodes:

- **Cross-datacenter networking** - Connect nodes in different locations as if they were on the same network
- **Remote cluster access** - Access your Talos API and Kubernetes services from anywhere on your tailnet
- **Hybrid cloud** - Bridge on-premises and cloud nodes seamlessly
- **Development access** - Give developers secure access to staging clusters without VPN infrastructure
- **Egress routing** - Route traffic through specific nodes for internet access from air-gapped environments

## Installing the Tailscale Extension

### Method 1: Image Factory

Generate a custom Talos image with the Tailscale extension:

```bash
# Create a schematic with Tailscale
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "systemExtensions": {
        "officialExtensions": [
          "siderolabs/tailscale"
        ]
      }
    }
  }'

# Use the returned schematic ID in your installer URL
# factory.talos.dev/installer/<schematic-id>:v1.7.0
```

### Method 2: Machine Configuration

Include the extension in your machine configuration:

```yaml
machine:
  install:
    image: factory.talos.dev/installer/<schematic-with-tailscale>:v1.7.0
    extensions:
      - image: ghcr.io/siderolabs/tailscale:v1.7.0
```

### Method 3: Upgrade Existing Nodes

```bash
# Upgrade with Tailscale extension
talosctl -n 192.168.1.10 upgrade \
  --image factory.talos.dev/installer/<schematic-with-tailscale>:v1.7.0
```

## Configuring Tailscale

After installing the extension, you need to configure Tailscale through the Talos machine configuration. The key piece is the Tailscale auth key, which registers the node with your tailnet.

### Generating an Auth Key

Generate an auth key from the Tailscale admin console:

1. Go to https://login.tailscale.com/admin/settings/keys
2. Generate a new auth key
3. Enable "Reusable" if you want to use the same key for multiple nodes
4. Optionally enable "Ephemeral" for nodes that should be automatically removed when they disconnect

### Applying the Configuration

Configure Tailscale through the machine config extension service configuration:

```yaml
machine:
  files:
    - content: |
        TS_AUTHKEY=tskey-auth-xxxxx-xxxxxxxxxxxxxxxxxx
        TS_ROUTES=10.244.0.0/16,10.96.0.0/12
        TS_EXTRA_ARGS=--advertise-tags=tag:kubernetes --hostname=talos-cp-1
        TS_ACCEPT_DNS=false
      path: /var/etc/tailscale/auth.env
      permissions: 0600
      op: create
```

Apply this to your nodes:

```bash
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "add",
    "path": "/machine/files/-",
    "value": {
      "content": "TS_AUTHKEY=tskey-auth-xxxxx-xxxxxxxxxxxxxxxxxx\nTS_ROUTES=10.244.0.0/16,10.96.0.0/12\nTS_EXTRA_ARGS=--advertise-tags=tag:kubernetes --hostname=talos-cp-1\nTS_ACCEPT_DNS=false\n",
      "path": "/var/etc/tailscale/auth.env",
      "permissions": 384,
      "op": "create"
    }
  }
]'
```

### Configuration Options Explained

```bash
# Required: Authentication key for registering with your tailnet
TS_AUTHKEY=tskey-auth-xxxxx-xxxxxxxxxxxxxxxxxx

# Optional: Advertise subnet routes
# Useful for making pod and service CIDRs accessible from your tailnet
TS_ROUTES=10.244.0.0/16,10.96.0.0/12

# Optional: Additional Tailscale arguments
# --advertise-tags: ACL tags for this node
# --hostname: Custom hostname in the tailnet
# --accept-routes: Accept routes advertised by other nodes
TS_EXTRA_ARGS=--advertise-tags=tag:kubernetes --hostname=talos-cp-1

# Optional: Whether to use Tailscale DNS
# Set to false if you want to keep your existing DNS configuration
TS_ACCEPT_DNS=false
```

## Verifying the Connection

After configuration, verify Tailscale is connected:

```bash
# Check the Tailscale extension service
talosctl -n 192.168.1.10 services | grep tailscale

# View Tailscale logs
talosctl -n 192.168.1.10 logs ext-tailscale

# Check the Tailscale admin console for the new node
# https://login.tailscale.com/admin/machines
```

In the Tailscale admin console, you should see your Talos node listed with the hostname you specified.

## Common Use Cases

### Use Case 1: Remote Cluster Access

Advertise the Kubernetes API server endpoint through Tailscale:

```yaml
machine:
  files:
    - content: |
        TS_AUTHKEY=tskey-auth-xxxxx
        TS_ROUTES=192.168.1.0/24
        TS_EXTRA_ARGS=--hostname=talos-gateway
      path: /var/etc/tailscale/auth.env
      permissions: 0600
      op: create
```

After enabling subnet routing and approving it in the Tailscale admin console, you can access your cluster's API from any machine on your tailnet:

```bash
# From any machine on your tailnet
kubectl --server=https://192.168.1.10:6443 get nodes
```

### Use Case 2: Cross-Datacenter Kubernetes

Connect nodes in different data centers:

```yaml
# Datacenter A nodes
machine:
  files:
    - content: |
        TS_AUTHKEY=tskey-auth-xxxxx
        TS_ROUTES=10.10.0.0/16
        TS_EXTRA_ARGS=--hostname=dc-a-node-1 --accept-routes
      path: /var/etc/tailscale/auth.env
      permissions: 0600

# Datacenter B nodes
machine:
  files:
    - content: |
        TS_AUTHKEY=tskey-auth-xxxxx
        TS_ROUTES=10.20.0.0/16
        TS_EXTRA_ARGS=--hostname=dc-b-node-1 --accept-routes
      path: /var/etc/tailscale/auth.env
      permissions: 0600
```

### Use Case 3: Secure Admin Access

Give cluster administrators Tailscale-based access to the Talos API:

```bash
# On the admin's workstation (with Tailscale installed)
# Access Talos API through Tailscale IP
talosctl -n 100.100.1.10 version  # Tailscale IP of the node
```

## Setting Up ACLs

Use Tailscale ACLs to control which nodes and users can communicate:

```json
{
  "tagOwners": {
    "tag:kubernetes": ["autogroup:admin"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["tag:kubernetes"],
      "dst": ["tag:kubernetes:*"]
    },
    {
      "action": "accept",
      "src": ["group:devops"],
      "dst": ["tag:kubernetes:6443"]
    }
  ],
  "autoApprovers": {
    "routes": {
      "10.244.0.0/16": ["tag:kubernetes"],
      "10.96.0.0/12": ["tag:kubernetes"]
    }
  }
}
```

## Rolling Out to All Nodes

Deploy Tailscale across your entire cluster:

```bash
#!/bin/bash

AUTH_KEY="tskey-auth-xxxxx-xxxxxxxxxxxxxxxxxx"

# Control plane nodes
CP_NODES=("192.168.1.10:talos-cp-1" "192.168.1.11:talos-cp-2" "192.168.1.12:talos-cp-3")

# Worker nodes
WORKER_NODES=("192.168.1.20:talos-worker-1" "192.168.1.21:talos-worker-2")

ALL_NODES=("${CP_NODES[@]}" "${WORKER_NODES[@]}")

for entry in "${ALL_NODES[@]}"; do
  IFS=':' read -r node hostname <<< "$entry"
  echo "Configuring Tailscale on $node ($hostname)..."

  talosctl -n "$node" patch machineconfig -p "[
    {
      \"op\": \"add\",
      \"path\": \"/machine/files/-\",
      \"value\": {
        \"content\": \"TS_AUTHKEY=${AUTH_KEY}\nTS_EXTRA_ARGS=--hostname=${hostname} --advertise-tags=tag:kubernetes\nTS_ACCEPT_DNS=false\n\",
        \"path\": \"/var/etc/tailscale/auth.env\",
        \"permissions\": 384,
        \"op\": \"create\"
      }
    }
  ]"
done

echo "Done. Check Tailscale admin console for new nodes."
```

## Troubleshooting

### Tailscale Not Connecting

```bash
# Check extension service
talosctl -n 192.168.1.10 services | grep tailscale

# View logs for connection issues
talosctl -n 192.168.1.10 logs ext-tailscale

# Common issues:
# - Invalid auth key
# - Expired auth key
# - Network blocking Tailscale DERP servers
```

### Subnet Routes Not Working

If advertised routes are not accessible:

1. Check that routes are approved in the Tailscale admin console
2. Verify the node is advertising routes in its logs
3. Make sure `--accept-routes` is set on nodes that need to use the routes

### DNS Conflicts

If Tailscale DNS conflicts with your cluster DNS:

```yaml
# Disable Tailscale DNS
TS_ACCEPT_DNS=false
```

This keeps your existing DNS configuration intact while still using Tailscale for connectivity.

## Security Considerations

1. **Use ephemeral keys for workers** - Worker nodes that might be replaced frequently should use ephemeral auth keys so they are automatically cleaned up from your tailnet.

2. **Apply tags for ACL control** - Use Tailscale tags and ACLs to limit which nodes can communicate with each other.

3. **Rotate auth keys** - Do not use the same auth key indefinitely. Rotate it periodically.

4. **Monitor your tailnet** - Keep track of which nodes are connected and investigate any unexpected devices.

The Tailscale extension transforms Talos Linux into a mesh-connected node that can reach any other machine on your tailnet, making it an excellent building block for distributed Kubernetes deployments.

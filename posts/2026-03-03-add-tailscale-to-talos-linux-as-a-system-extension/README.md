# How to Add Tailscale to Talos Linux as a System Extension

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Tailscale, VPN, Networking, WireGuard

Description: Learn how to install and configure Tailscale as a system extension on Talos Linux for secure mesh networking and remote access to your Kubernetes cluster.

---

Tailscale is a mesh VPN built on WireGuard that makes it easy to connect devices and services across different networks without complex firewall configurations or port forwarding. Adding Tailscale to Talos Linux as a system extension gives your nodes a secure, encrypted network overlay that works across data centers, cloud providers, and even home labs behind NAT. This is especially useful for managing remote clusters, connecting multi-site deployments, or providing secure access to cluster services.

This guide walks through installing Tailscale on Talos Linux, configuring authentication, and using it for practical networking scenarios.

## Why Tailscale on Talos Linux

Running Tailscale at the system level on Talos has several advantages over running it as a Kubernetes pod:

- **Network-level access** - The Tailscale interface is available to the entire node, not just pods
- **Persistent connection** - The VPN stays up even if Kubernetes services are restarting
- **Remote management** - You can reach nodes via `talosctl` through the Tailscale network
- **Subnet routing** - Nodes can advertise pod and service CIDRs to the Tailscale network
- **Exit node** - Nodes can serve as exit nodes for internet traffic routing

## Installing the Tailscale Extension

### Adding to Machine Configuration

The Tailscale extension is maintained by Sidero Labs and is available in the official extensions repository.

```yaml
# worker.yaml or controlplane.yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/tailscale:v1.62.0
```

### Using Image Factory

```bash
# Create a schematic with Tailscale
cat > tailscale-schematic.yaml << 'EOF'
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/tailscale
EOF

# Submit to Image Factory
SCHEMATIC_ID=$(curl -sX POST \
  --data-binary @tailscale-schematic.yaml \
  https://factory.talos.dev/schematics \
  -H "Content-Type: application/yaml" | jq -r '.id')

echo "Installer: factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0"
```

## Configuring Tailscale Authentication

Tailscale requires an authentication key to join the node to your tailnet. You configure this through environment variables in the machine config.

### Generating an Auth Key

Go to the Tailscale admin console at https://login.tailscale.com/admin/settings/keys and generate a new auth key. For production use, create a reusable auth key with the appropriate tags.

```bash
# You can also use the Tailscale API
curl -X POST "https://api.tailscale.com/api/v2/tailnet/-/keys" \
  -u "tskey-api-xxxxx:" \
  -H "Content-Type: application/json" \
  -d '{
    "capabilities": {
      "devices": {
        "create": {
          "reusable": true,
          "ephemeral": false,
          "preauthorized": true,
          "tags": ["tag:k8s-node"]
        }
      }
    },
    "expirySeconds": 7776000
  }'
```

### Configuring via Machine Config

Add the Tailscale configuration to your machine config using environment files.

```yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/tailscale:v1.62.0
  files:
    - content: |
        TS_AUTHKEY=tskey-auth-kAbCdEfGhIjKlMnOpQrStUvWxYz
        TS_ROUTES=10.244.0.0/16,10.96.0.0/12
        TS_EXTRA_ARGS=--advertise-tags=tag:k8s-node --accept-routes
        TS_HOSTNAME=talos-worker-01
      permissions: 0o600
      path: /var/etc/tailscale/auth.env
      op: create
```

The environment variables control Tailscale behavior:

- `TS_AUTHKEY` - The authentication key for joining the tailnet
- `TS_ROUTES` - Subnet routes to advertise (pod CIDR and service CIDR)
- `TS_EXTRA_ARGS` - Additional command-line arguments for Tailscale
- `TS_HOSTNAME` - The hostname for this node in the tailnet

## Applying the Configuration

Apply the configuration to your nodes.

```bash
# For new nodes, apply during setup
talosctl apply-config --insecure \
  --nodes 10.0.0.20 \
  --file worker.yaml

# For existing nodes, apply and upgrade
talosctl -n 10.0.0.20 apply-config --file worker.yaml
talosctl -n 10.0.0.20 upgrade \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

## Verifying Tailscale Connection

After the node boots with Tailscale, verify the connection.

```bash
# Check that the Tailscale extension is loaded
talosctl -n 10.0.0.20 get extensions

# Check the Tailscale network interface
talosctl -n 10.0.0.20 read /proc/net/dev | grep tailscale

# Verify the node appears in your tailnet
# From any device on your tailnet:
tailscale status

# You should see your Talos node listed with its Tailscale IP
```

## Accessing Nodes via Tailscale

Once connected, you can manage your Talos nodes over the Tailscale network.

```bash
# Get the Tailscale IP of your node
# Check in the Tailscale admin console or run:
tailscale status | grep talos-worker-01

# Use talosctl over the Tailscale network
talosctl -n 100.64.0.5 health
talosctl -n 100.64.0.5 get members

# Access the Kubernetes API through Tailscale
kubectl --server=https://100.64.0.3:6443 get nodes
```

This is particularly valuable for managing clusters that are behind NAT or firewalls.

## Subnet Routing

One of the most useful Tailscale features for Kubernetes is subnet routing. By advertising the pod and service CIDRs, you can access Kubernetes services directly from any device on your tailnet.

```yaml
# In your auth.env, advertise the Kubernetes networks
TS_ROUTES=10.244.0.0/16,10.96.0.0/12
```

After connecting, approve the routes in the Tailscale admin console. Then from any device on your tailnet:

```bash
# Access a Kubernetes service directly by its ClusterIP
curl http://10.96.0.1:443

# Or by pod IP
curl http://10.244.1.5:8080
```

This eliminates the need for NodePort services or LoadBalancers for internal access.

## Configuring ACLs for Security

Use Tailscale ACLs to control access to your Kubernetes nodes.

```json
{
  "acls": [
    {
      "action": "accept",
      "src": ["group:devops"],
      "dst": ["tag:k8s-node:*"]
    },
    {
      "action": "accept",
      "src": ["tag:k8s-node"],
      "dst": ["tag:k8s-node:*"]
    }
  ],
  "tagOwners": {
    "tag:k8s-node": ["group:devops"]
  }
}
```

This ACL allows the devops group and other k8s nodes to access the Kubernetes nodes, while blocking other tailnet devices.

## Multi-Cluster Networking

Tailscale can connect multiple Talos clusters across different locations.

```yaml
# Cluster A - Worker config
machine:
  files:
    - content: |
        TS_AUTHKEY=tskey-auth-xxxxx
        TS_ROUTES=10.244.0.0/16,10.96.0.0/12
        TS_HOSTNAME=cluster-a-worker-01
        TS_EXTRA_ARGS=--advertise-tags=tag:cluster-a --accept-routes
      permissions: 0o600
      path: /var/etc/tailscale/auth.env
      op: create

# Cluster B - Worker config
machine:
  files:
    - content: |
        TS_AUTHKEY=tskey-auth-yyyyy
        TS_ROUTES=10.245.0.0/16,10.97.0.0/12
        TS_HOSTNAME=cluster-b-worker-01
        TS_EXTRA_ARGS=--advertise-tags=tag:cluster-b --accept-routes
      permissions: 0o600
      path: /var/etc/tailscale/auth.env
      op: create
```

Make sure each cluster uses different pod and service CIDRs to avoid conflicts.

## Using Tailscale as an Exit Node

You can configure a Talos node to serve as a Tailscale exit node, routing all internet traffic from other tailnet devices through the node.

```yaml
machine:
  files:
    - content: |
        TS_AUTHKEY=tskey-auth-xxxxx
        TS_EXTRA_ARGS=--advertise-exit-node
      permissions: 0o600
      path: /var/etc/tailscale/auth.env
      op: create
```

Enable IP forwarding in the machine config.

```yaml
machine:
  sysctls:
    net.ipv4.ip_forward: "1"
    net.ipv6.conf.all.forwarding: "1"
```

## Troubleshooting Tailscale Issues

If Tailscale is not connecting properly, here are steps to diagnose the problem.

```bash
# Check the Tailscale service status
talosctl -n 10.0.0.20 services | grep tailscale

# Check Tailscale logs
talosctl -n 10.0.0.20 logs ext-tailscale

# Verify the auth.env file exists
talosctl -n 10.0.0.20 read /var/etc/tailscale/auth.env

# Check if the Tailscale interface exists
talosctl -n 10.0.0.20 read /proc/net/dev | grep tailscale

# Verify WireGuard kernel module is loaded
talosctl -n 10.0.0.20 read /proc/modules | grep wireguard
```

Common issues include expired auth keys, incorrect environment variable formatting, and firewall rules blocking UDP traffic on the Tailscale port.

## Rotating Auth Keys

When your Tailscale auth key expires, you need to update it on all nodes.

```bash
# Create a patch with the new auth key
cat > tailscale-key-patch.yaml << 'EOF'
machine:
  files:
    - content: |
        TS_AUTHKEY=tskey-auth-newkeyhere
        TS_ROUTES=10.244.0.0/16,10.96.0.0/12
        TS_EXTRA_ARGS=--advertise-tags=tag:k8s-node --accept-routes
        TS_HOSTNAME=talos-worker-01
      permissions: 0o600
      path: /var/etc/tailscale/auth.env
      op: create
EOF

# Apply to each node
talosctl -n 10.0.0.20 patch machineconfig --patch @tailscale-key-patch.yaml
```

## Conclusion

Adding Tailscale to Talos Linux as a system extension creates a secure, zero-configuration mesh network for your Kubernetes infrastructure. It solves the common challenge of accessing clusters behind NAT or across different networks, and the subnet routing feature provides direct access to pod and service IPs from anywhere on your tailnet. The system extension approach ensures Tailscale starts before Kubernetes, providing reliable connectivity from the moment the node boots. Whether you are managing a home lab, connecting multi-cloud clusters, or providing secure remote access for your team, Tailscale on Talos is a practical and powerful combination.

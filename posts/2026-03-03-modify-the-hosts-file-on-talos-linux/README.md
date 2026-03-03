# How to Modify the Hosts File on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DNS, Hosts File, Networking, Machine Configuration, Kubernetes

Description: Learn how to modify the hosts file on Talos Linux nodes through machine configuration since direct file editing is not available.

---

On most Linux systems, modifying the hosts file is as simple as opening `/etc/hosts` in a text editor and adding a line. On Talos Linux, it is not that straightforward. The root filesystem is immutable, so you cannot directly edit `/etc/hosts`. But you absolutely can add custom host entries - you just do it through the machine configuration.

This guide shows you how to add, modify, and manage custom host entries on Talos Linux nodes.

## Why You Might Need Custom Host Entries

Before diving into the how, let us consider the when. There are several legitimate reasons to add custom host entries on Kubernetes nodes:

- **Internal services without DNS**: If you have services that are not registered in DNS but need to be reachable by hostname
- **Split-horizon DNS**: When you need nodes to resolve a hostname differently than external clients
- **Development and testing**: Overriding DNS for testing purposes
- **Private registries**: Pointing to a container registry by hostname when DNS is not configured
- **Migration scenarios**: Temporarily pointing a hostname to a new IP during a migration

## Viewing the Current Hosts File

First, check what is currently in the hosts file:

```bash
# Read the hosts file from a Talos node
talosctl read --nodes 192.168.1.10 /etc/hosts
```

The default Talos hosts file typically contains just the localhost entries:

```
127.0.0.1       localhost
::1             localhost
```

## Adding Host Entries via Machine Configuration

The proper way to add host entries on Talos Linux is through the `machine.network.extraHostEntries` field in the machine configuration:

```yaml
machine:
  network:
    extraHostEntries:
      - ip: 192.168.1.100
        aliases:
          - registry.internal
          - docker-registry
      - ip: 192.168.1.200
        aliases:
          - database.internal
      - ip: 10.0.0.50
        aliases:
          - api.example.com
          - api
```

Each entry has an `ip` field and an `aliases` list. The aliases can include both fully qualified domain names and short names.

## Applying the Configuration

### For New Nodes

If you are creating a new cluster or adding a new node, include the host entries in the initial machine configuration:

```bash
# Generate the configuration
talosctl gen config my-cluster https://192.168.1.10:6443

# Edit the generated controlplane.yaml or worker.yaml
# to include the extraHostEntries section

# Apply the configuration to the node
talosctl apply-config --nodes 192.168.1.20 --file worker.yaml --insecure
```

### For Existing Nodes

To add host entries to a running node, patch the existing configuration:

```bash
# Create a patch file
cat > hosts-patch.yaml << 'EOF'
machine:
  network:
    extraHostEntries:
      - ip: 192.168.1.100
        aliases:
          - registry.internal
          - docker-registry
      - ip: 192.168.1.200
        aliases:
          - database.internal
EOF

# Apply the patch to the node
talosctl apply-config --nodes 192.168.1.10 --file hosts-patch.yaml --mode=no-reboot
```

Or use the patch command directly:

```bash
# Patch the machine configuration with additional host entries
talosctl patch machineconfig --nodes 192.168.1.10 --patch '[
  {
    "op": "add",
    "path": "/machine/network/extraHostEntries",
    "value": [
      {
        "ip": "192.168.1.100",
        "aliases": ["registry.internal"]
      }
    ]
  }
]'
```

## Verifying the Changes

After applying the configuration, verify that the hosts file was updated:

```bash
# Read the updated hosts file
talosctl read --nodes 192.168.1.10 /etc/hosts
```

The output should now include your custom entries:

```
127.0.0.1       localhost
::1             localhost
192.168.1.100   registry.internal docker-registry
192.168.1.200   database.internal
```

You can also test name resolution from a pod running on the node:

```bash
# Run a test pod to verify resolution
kubectl run dns-test --rm -it --image=busybox --restart=Never -- \
  nslookup registry.internal

# Or check from a debug container
kubectl debug node/talos-worker-1 -it --image=busybox -- \
  ping -c 1 registry.internal
```

## Applying to Multiple Nodes

If you need the same host entries on all nodes, create a config patch and apply it to each node:

```bash
# Apply to multiple nodes
for node in 192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21; do
  echo "Applying to $node..."
  talosctl patch machineconfig --nodes $node --patch-file hosts-patch.yaml
done
```

For clusters managed with GitOps or infrastructure as code, include the host entries in the base configuration template so all nodes get them automatically.

## Updating Existing Entries

To change an existing host entry, you need to replace the entire `extraHostEntries` section:

```bash
# Get the current configuration
talosctl get machineconfig --nodes 192.168.1.10 -o yaml > current-config.yaml

# Edit the extraHostEntries section in current-config.yaml
# Then apply the updated configuration
talosctl apply-config --nodes 192.168.1.10 --file current-config.yaml
```

Or use a patch to replace the entire section:

```bash
talosctl patch machineconfig --nodes 192.168.1.10 --patch '[
  {
    "op": "replace",
    "path": "/machine/network/extraHostEntries",
    "value": [
      {
        "ip": "192.168.1.150",
        "aliases": ["registry.internal"]
      },
      {
        "ip": "192.168.1.200",
        "aliases": ["database.internal"]
      }
    ]
  }
]'
```

## Removing Host Entries

To remove all custom host entries:

```bash
talosctl patch machineconfig --nodes 192.168.1.10 --patch '[
  {
    "op": "remove",
    "path": "/machine/network/extraHostEntries"
  }
]'
```

## Host Entries and Pod DNS

It is important to understand that `/etc/hosts` on the node is not the same as `/etc/hosts` inside a pod. Kubernetes pods get their own DNS configuration based on the pod's `dnsPolicy` setting.

If you need a pod to resolve a hostname to a specific IP, you have additional options:

### Pod-Level Host Aliases

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  hostAliases:
    - ip: "192.168.1.100"
      hostnames:
        - "registry.internal"
        - "docker-registry"
  containers:
    - name: myapp
      image: myapp:latest
```

### CoreDNS Custom Records

For cluster-wide custom DNS, modify the CoreDNS configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  custom.server: |
    registry.internal:53 {
        hosts {
            192.168.1.100 registry.internal
            fallthrough
        }
    }
```

### Using hostNetwork

Pods that use `hostNetwork: true` will use the node's `/etc/hosts` and DNS configuration:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: host-network-pod
spec:
  hostNetwork: true
  containers:
    - name: myapp
      image: myapp:latest
```

## Common Use Cases

### Private Container Registry

```yaml
machine:
  network:
    extraHostEntries:
      - ip: 10.0.1.50
        aliases:
          - registry.company.internal
```

Combined with the registry mirrors configuration:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://registry.company.internal
```

### Multi-Cluster Communication

When multiple Kubernetes clusters need to communicate and shared DNS is not available:

```yaml
machine:
  network:
    extraHostEntries:
      - ip: 10.1.0.10
        aliases:
          - cluster-b-api.internal
      - ip: 10.2.0.10
        aliases:
          - cluster-c-api.internal
```

### Database Failover

During a database migration, temporarily point the hostname to the new server:

```yaml
machine:
  network:
    extraHostEntries:
      - ip: 192.168.2.50
        aliases:
          - postgres.database.internal
```

## Troubleshooting

### Changes Not Taking Effect

If the hosts file does not update after applying the configuration:

```bash
# Check if the configuration was accepted
talosctl get machineconfig --nodes 192.168.1.10 -o yaml | grep -A10 "extraHostEntries"

# Check for configuration apply errors
talosctl get events --nodes 192.168.1.10
```

### DNS Resolution Still Using Old IP

Name resolution caches can cause stale results. If the hosts file is correct but resolution is returning the old IP:

```bash
# Check the hosts file directly
talosctl read --nodes 192.168.1.10 /etc/hosts

# Check from inside a pod (pods may cache DNS)
kubectl exec -it <pod-name> -- cat /etc/resolv.conf
```

## Conclusion

Modifying the hosts file on Talos Linux requires going through the machine configuration rather than editing the file directly. While this adds a step compared to traditional Linux, it ensures that host entries are version-controlled, reproducible across nodes, and persistent across reboots and upgrades. For pod-level DNS customization, use Kubernetes-native features like hostAliases or CoreDNS configuration. The combination of node-level host entries and Kubernetes DNS gives you complete control over name resolution in your cluster.

# How to Inspect Node Resources with talosctl get

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Resource Inspection, Talosctl, System Administration

Description: Learn how to use talosctl get to inspect node resources in Talos Linux, from hardware details to network configuration and runtime state.

---

Talos Linux manages its configuration and runtime state through a resource-based model. Every piece of information about a node, from its hardware configuration to its network settings to its Kubernetes state, is represented as a resource that you can inspect with the `talosctl get` command. This is one of the most powerful commands in the talosctl toolkit, and understanding how to use it opens up deep visibility into your cluster.

## The Resource Model

Talos Linux organizes everything into resources, similar to how Kubernetes organizes things into API objects. Each resource has:

- A **type** (like MachineConfig, Address, Hostname, etc.)
- A **namespace** (like `config`, `runtime`, `network`, etc.)
- An **ID** (a unique identifier within the type)
- A **specification** (the actual data)

You query these resources using `talosctl get`.

## Basic Usage

```bash
# Get all resources of a given type
talosctl get <resource-type> --nodes <node-ip>

# Get a specific resource by ID
talosctl get <resource-type> <resource-id> --nodes <node-ip>

# Get a resource with full details in YAML
talosctl get <resource-type> -o yaml --nodes <node-ip>
```

## Discovering Available Resource Types

To see all resource types available on a node:

```bash
# List all resource definitions
talosctl get resourcedefinitions --nodes <node-ip>
```

This returns a long list. Some of the most commonly used types include:

- `addresses` - IP addresses assigned to the node
- `hostname` - The node's hostname
- `machineconfig` - The full machine configuration
- `members` - Cluster member information
- `services` - Service status
- `cpus` - CPU information
- `memory` - Memory information

## Inspecting Hardware Information

### CPU Details

```bash
# Get CPU information
talosctl get cpus --nodes <node-ip> -o yaml
```

This shows the number of CPU cores, model, frequency, and other hardware details.

### Memory Information

```bash
# Get memory information
talosctl get memorymodules --nodes <node-ip> -o yaml
```

For current memory usage statistics:

```bash
# Get runtime memory stats
talosctl get systemstat --nodes <node-ip> -o yaml
```

### Disk Information

```bash
# List all block devices (disks)
talosctl get blockdevices --nodes <node-ip>
```

This shows all storage devices, their sizes, and partition information. Useful for verifying that Talos is using the correct disk.

## Inspecting Network Configuration

### IP Addresses

```bash
# List all IP addresses on the node
talosctl get addresses --nodes <node-ip>
```

This shows every IP address assigned to every network interface.

### Network Interfaces

```bash
# List all network interfaces
talosctl get links --nodes <node-ip>
```

Shows physical and virtual network interfaces with their status.

### Routes

```bash
# Get the routing table
talosctl get routes --nodes <node-ip>
```

### DNS Configuration

```bash
# Check DNS resolver configuration
talosctl get resolvers --nodes <node-ip>
```

### Hostname

```bash
# Get the node's hostname
talosctl get hostname --nodes <node-ip>
```

## Inspecting Machine Configuration

The machine configuration is the central piece that defines how a Talos node behaves:

```bash
# Get the current machine configuration
talosctl get machineconfig --nodes <node-ip> -o yaml
```

This is the full configuration, including:

- Machine type (controlplane or worker)
- Network settings
- Install disk
- Cluster certificates
- Kubernetes settings
- Custom patches

## Inspecting Runtime State

### Node Identity

```bash
# Get the node's identity information
talosctl get nodename --nodes <node-ip>
```

### Cluster Membership

```bash
# See what the node knows about cluster members
talosctl get members --nodes <node-ip>
```

This shows all discovered cluster members from this node's perspective.

### Service Status

```bash
# Get service status as resources
talosctl get services --nodes <node-ip>
```

This is the resource-based equivalent of `talosctl services`.

### Kubernetes Node Status

```bash
# Get the Kubernetes node status from the Talos side
talosctl get nodestatus --nodes <node-ip> -o yaml
```

## Filtering and Output Formats

### YAML Output

```bash
# Full YAML output for detailed inspection
talosctl get addresses --nodes <node-ip> -o yaml
```

### JSON Output

```bash
# JSON output for scripting
talosctl get addresses --nodes <node-ip> -o json
```

### Specific Resource by ID

```bash
# Get a specific address by its ID
talosctl get addresses eth0/192.168.1.10 --nodes <node-ip> -o yaml
```

## Using talosctl get for Troubleshooting

### Network Connectivity Issues

When a node cannot communicate with the cluster:

```bash
# Check assigned addresses
talosctl get addresses --nodes <node-ip>

# Check routes
talosctl get routes --nodes <node-ip>

# Check DNS configuration
talosctl get resolvers --nodes <node-ip>

# Check if the node sees other cluster members
talosctl get members --nodes <node-ip>
```

### Configuration Drift

To check if a node's running configuration matches what you expect:

```bash
# Get the running configuration
talosctl get machineconfig --nodes <node-ip> -o yaml > running-config.yaml

# Compare with your expected configuration
diff running-config.yaml expected-config.yaml
```

### Disk Space Issues

```bash
# Check disk devices and partitions
talosctl get blockdevices --nodes <node-ip> -o yaml

# Check mount information
talosctl get mounts --nodes <node-ip>
```

### Certificate Issues

```bash
# Check Kubernetes certificates
talosctl get kubernetesstatus --nodes <node-ip> -o yaml
```

## Watching Resources for Changes

You can watch resources for real-time updates:

```bash
# Watch for address changes
talosctl get addresses --nodes <node-ip> --watch

# Watch service status changes
talosctl get services --nodes <node-ip> --watch
```

The `--watch` flag keeps the command running and outputs changes as they happen. This is useful during upgrades or configuration changes to see the effects in real time.

## Querying Across Multiple Nodes

```bash
# Check addresses on all control plane nodes at once
talosctl get addresses --nodes 10.0.0.1,10.0.0.2,10.0.0.3
```

This lets you quickly compare configurations across nodes.

## Scripting with talosctl get

The JSON output format makes it easy to script resource queries:

```bash
#!/bin/bash
# check-node-ips.sh - Verify expected IPs on all nodes

NODES="10.0.0.1 10.0.0.2 10.0.0.3 10.0.0.4 10.0.0.5"

for node in $NODES; do
    echo "=== $node ==="
    talosctl get addresses --nodes $node -o json 2>/dev/null | \
        jq -r '.spec.address'
done
```

## Common Resource Types Reference

Here is a quick reference of the most useful resource types:

| Resource Type | Description |
|--------------|-------------|
| `addresses` | IP addresses on the node |
| `blockdevices` | Storage devices |
| `cpus` | CPU hardware information |
| `hostname` | Node hostname |
| `links` | Network interfaces |
| `machineconfig` | Full machine configuration |
| `members` | Cluster member discovery |
| `mounts` | Filesystem mounts |
| `nodename` | Kubernetes node name |
| `resolvers` | DNS resolver settings |
| `routes` | Network routing table |
| `services` | Service status |

## Conclusion

The `talosctl get` command is your window into every aspect of a Talos Linux node. From hardware details to network configuration to runtime state, everything is accessible through the resource model. Learning to use it effectively transforms your ability to troubleshoot issues, verify configurations, and understand exactly what is happening on each node in your cluster. Start with the common resource types listed above, and explore the full list of resource definitions to discover everything that is available.

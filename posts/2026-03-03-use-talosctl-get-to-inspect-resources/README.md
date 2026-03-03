# How to Use talosctl get to Inspect Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Resource Inspection, talosctl, Node Management

Description: A comprehensive guide to using talosctl get for inspecting resources on Talos Linux nodes, from system state to network configuration.

---

The `talosctl get` command is one of the most versatile tools in the Talos Linux toolkit. It lets you inspect virtually every aspect of a node's state, from hardware details to network settings to runtime configuration. Talos Linux models everything as resources, and this command is how you read them. Whether you are debugging a network issue, verifying a configuration change, or simply checking what hardware a node has, `talosctl get` is the command you reach for.

## The Resource Model Explained

Talos Linux organizes all system information into resources. Think of it like the Kubernetes resource model, but for the operating system layer. Each resource has:

- A **namespace** that groups related resources (like `network`, `config`, `runtime`)
- A **type** that defines the kind of resource (like `Address`, `Hostname`, `MachineConfig`)
- An **ID** that uniquely identifies a specific resource within its type
- A **spec** that contains the actual data

This model is consistent across all information. Whether you are looking at IP addresses or CPU details, the query syntax is the same.

## Basic Syntax

```bash
# Get all resources of a type
talosctl get <type> --nodes <node-ip>

# Get a specific resource by ID
talosctl get <type> <id> --nodes <node-ip>

# Get with full YAML output
talosctl get <type> --nodes <node-ip> -o yaml

# Get with JSON output
talosctl get <type> --nodes <node-ip> -o json
```

## Discovering Resource Types

Talos Linux has many resource types. To see all of them:

```bash
# List all resource definitions
talosctl get rd --nodes <node-ip>
```

This outputs every resource type available on the node. The list is long, but you will mostly use a handful of types regularly.

Some of the most common resource types:

```bash
# Network resources
talosctl get addresses --nodes <node-ip>    # IP addresses
talosctl get links --nodes <node-ip>        # Network interfaces
talosctl get routes --nodes <node-ip>       # Routing table
talosctl get resolvers --nodes <node-ip>    # DNS resolvers
talosctl get hostname --nodes <node-ip>     # Hostname

# Hardware resources
talosctl get cpus --nodes <node-ip>         # CPU information
talosctl get memorymodules --nodes <node-ip> # Memory modules
talosctl get blockdevices --nodes <node-ip>  # Disks

# Runtime resources
talosctl get services --nodes <node-ip>     # Service status
talosctl get members --nodes <node-ip>      # Cluster members
talosctl get nodename --nodes <node-ip>     # Kubernetes node name

# Configuration resources
talosctl get machineconfig --nodes <node-ip> # Full machine config
```

## Output Formats

### Default Table Format

```bash
talosctl get addresses --nodes <node-ip>
```

Shows a compact table with resource IDs and basic info. Good for quick overviews.

### YAML Format

```bash
talosctl get addresses --nodes <node-ip> -o yaml
```

Shows the full resource specification in YAML. This is the most detailed output format and is essential for debugging.

### JSON Format

```bash
talosctl get addresses --nodes <node-ip> -o json
```

Machine-readable output, useful for scripting:

```bash
# Extract specific values with jq
talosctl get addresses --nodes <node-ip> -o json | jq '.spec.address'
```

## Practical Examples

### Finding a Node's IP Addresses

```bash
# List all IP addresses assigned to the node
talosctl get addresses --nodes <node-ip>
```

This shows every IP on every interface, including loopback addresses, pod CIDRs, and service addresses assigned by Kubernetes.

To get just the primary IP:

```bash
# Get detailed address info to find the primary interface
talosctl get addresses --nodes <node-ip> -o yaml | grep -B5 "eth0\|ens\|enp"
```

### Checking Disk Configuration

```bash
# See all block devices
talosctl get blockdevices --nodes <node-ip>

# Get detailed info about a specific disk
talosctl get blockdevices sda --nodes <node-ip> -o yaml
```

This shows disk size, partitions, model, serial number, and other hardware details. Useful for verifying that Talos installed to the correct disk.

### Verifying Network Routes

```bash
# Show the complete routing table
talosctl get routes --nodes <node-ip> -o yaml
```

Look for the default route to verify the node can reach external networks:

```bash
# Find the default route
talosctl get routes --nodes <node-ip> -o yaml | grep -A5 "0.0.0.0/0"
```

### Checking DNS Configuration

```bash
# See configured DNS resolvers
talosctl get resolvers --nodes <node-ip> -o yaml
```

If DNS resolution is not working, this tells you what nameservers the node is configured to use.

### Inspecting the Machine Configuration

```bash
# Get the full machine configuration
talosctl get machineconfig --nodes <node-ip> -o yaml
```

This outputs the complete configuration including cluster certificates, kubelet settings, and network configuration. Note that sensitive values like private keys are included, so handle this output carefully.

### Checking Cluster Member Discovery

```bash
# See what cluster members this node has discovered
talosctl get members --nodes <node-ip>
```

This shows all nodes the current node knows about through cluster discovery. If a node is missing from this list, there may be a discovery or network issue.

## Watching Resources for Changes

The `--watch` flag streams resource changes in real time:

```bash
# Watch for new addresses being assigned
talosctl get addresses --nodes <node-ip> --watch

# Watch service status changes
talosctl get services --nodes <node-ip> --watch
```

This is extremely useful during:

- Cluster bootstrap (watch services start up)
- Configuration changes (watch the effect in real time)
- Network troubleshooting (watch interface changes)
- Upgrades (watch services restart)

Press Ctrl+C to stop watching.

## Filtering by Namespace

Resources live in namespaces. Most commonly used resources are in the default namespace, but you can specify others:

```bash
# Get resources from a specific namespace
talosctl get addresses --namespace network --nodes <node-ip>
```

To see available namespaces:

```bash
# The namespace is part of the resource definition
talosctl get rd --nodes <node-ip> -o yaml | grep "namespace"
```

## Querying Multiple Nodes

Compare resources across nodes:

```bash
# Check addresses on all control plane nodes
talosctl get addresses --nodes 10.0.0.1,10.0.0.2,10.0.0.3
```

The output includes the node IP, so you can see which resources belong to which node. This is great for verifying consistent configuration across a cluster.

## Using talosctl get in Scripts

The JSON output format makes scripting straightforward:

```bash
#!/bin/bash
# verify-dns.sh - Check that all nodes have the expected DNS servers

EXPECTED_DNS="8.8.8.8"
NODES="10.0.0.1 10.0.0.2 10.0.0.3 10.0.0.4 10.0.0.5"

for node in $NODES; do
    DNS=$(talosctl get resolvers --nodes $node -o json 2>/dev/null | \
        jq -r '.spec.dnsServers[]' 2>/dev/null)
    if echo "$DNS" | grep -q "$EXPECTED_DNS"; then
        echo "$node: DNS OK"
    else
        echo "$node: DNS MISMATCH - Expected $EXPECTED_DNS, got $DNS"
    fi
done
```

```bash
#!/bin/bash
# check-disk-space.sh - Monitor disk utilization

NODES="10.0.0.1 10.0.0.2 10.0.0.3"

for node in $NODES; do
    echo "=== $node ==="
    talosctl get blockdevices --nodes $node -o yaml 2>/dev/null | grep "size:"
done
```

## Troubleshooting with talosctl get

### Node Not Joining the Cluster

```bash
# Check if the node has the right hostname
talosctl get hostname --nodes <node-ip>

# Check if it can see other cluster members
talosctl get members --nodes <node-ip>

# Check the node name Kubernetes will use
talosctl get nodename --nodes <node-ip>
```

### Network Connectivity Problems

```bash
# Full network diagnostic
talosctl get addresses --nodes <node-ip>
talosctl get routes --nodes <node-ip>
talosctl get resolvers --nodes <node-ip>
talosctl get links --nodes <node-ip>
```

### Configuration Verification

```bash
# Compare running config with expected config
talosctl get machineconfig --nodes <node-ip> -o yaml > running.yaml
diff running.yaml expected.yaml
```

### Service Not Starting

```bash
# Check service resources
talosctl get services --nodes <node-ip>

# Detailed service info
talosctl get services kubelet --nodes <node-ip> -o yaml
```

## Advanced: Custom Resource Queries

As Talos Linux evolves, new resource types are added. Extensions and custom components may register their own resources. You can always discover what is available:

```bash
# Full list of resource types
talosctl get rd --nodes <node-ip> | wc -l

# Search for a specific type
talosctl get rd --nodes <node-ip> | grep -i "network"
```

## Conclusion

The `talosctl get` command provides access to every piece of information about a Talos Linux node through a consistent, query-based interface. From hardware details to network configuration to runtime state, everything is a resource you can inspect. Master the common resource types, use YAML output for debugging, JSON output for scripting, and the watch flag for real-time monitoring. This single command replaces dozens of traditional Linux diagnostic tools, all accessible remotely through the Talos API.

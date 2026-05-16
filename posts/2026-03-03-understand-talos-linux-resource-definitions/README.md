# How to Understand Talos Linux Resource Definitions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Resource, System State, Kubernetes, API

Description: A guide to understanding resource definitions in Talos Linux and how they represent the complete state of your nodes.

---

Talos Linux manages its entire system state through resources. If you have worked with Kubernetes, this concept will feel familiar. Just as Kubernetes represents everything - pods, services, deployments, nodes - as API resources, Talos represents all system state as resources that can be queried, watched, and managed through the Talos API.

Understanding resource definitions is essential for operating and troubleshooting Talos Linux. Resources are how you see what the system is doing, how you diagnose problems, and how you understand the relationship between configuration and actual behavior.

## What Are Resources in Talos?

A resource in Talos is a typed data object that represents a piece of system state. Every aspect of the system - network interfaces, IP addresses, routes, hostname, cluster membership, time synchronization, certificates, and more - is represented as a resource.

Resources have four key properties:

- **Type** - What kind of resource it is (e.g., AddressSpec, HostnameStatus)
- **Namespace** - A grouping for related resources (e.g., network, config, k8s)
- **ID** - A unique identifier within the namespace and type
- **Spec** - The actual data of the resource

```bash
# List all resource types (resource definitions)

talosctl -n 10.0.0.11 get rd

# This outputs dozens of resource types, each representing
# a different aspect of system state
```

Resource Definitions

A resource definition (RD) describes a type of resource. It tells Talos the resource type, default namespace, aliases, and table columns used when printing resources. You can think of it as similar to the discovery part of a CustomResourceDefinition (CRD) in Kubernetes.

```bash
# List all resource definitions
talosctl -n 10.0.0.11 get rd

# Example output (abbreviated):
# NAMESPACE  TYPE                 ID
# meta       ResourceDefinition   addressspecs.net.talos.dev
# meta       ResourceDefinition   addressstatuses.net.talos.dev
# meta       ResourceDefinition   hostnamespecs.net.talos.dev
# meta       ResourceDefinition   hostnamestatuses.net.talos.dev
# meta       ResourceDefinition   linkspecs.net.talos.dev
# meta       ResourceDefinition   linkstatuses.net.talos.dev
# meta       ResourceDefinition   members.cluster.talos.dev
# meta       ResourceDefinition   routespecs.net.talos.dev
# meta       ResourceDefinition   routestatuses.net.talos.dev
```

Each resource definition describes:
- The type name
- The default namespace it belongs to
- Aliases that can be used with `talosctl get`
- Table columns used in the default output

```bash
# Get detailed information about a specific resource definition
talosctl -n 10.0.0.11 get rd addressspecs.net.talos.dev -o yaml
```

## Spec vs Status Resources

Talos follows the same spec/status pattern that Kubernetes uses.

**Spec resources** represent desired state. They are created by the configuration controller (from your machine config) or by operator controllers (like DHCP). Specs tell the system what should be true.

**Status resources** represent actual state. They are updated by controllers that have applied the spec to the system. Status tells you what is actually true right now.

When the system is healthy and reconciled, spec and status should match. When they do not match, a controller is either in the process of reconciling or has encountered an error.

```bash
# Compare spec and status for hostnames
talosctl -n 10.0.0.11 get hostnamespec -o yaml
talosctl -n 10.0.0.11 get hostnamestatus -o yaml

# Compare spec and status for addresses
talosctl -n 10.0.0.11 get addressspecs -o yaml
talosctl -n 10.0.0.11 get addresses -o yaml
```

## Common Resource Types

### Network Resources

Network resources are the most numerous. They cover every aspect of network configuration.

```bash
# Link resources (network interfaces)
talosctl -n 10.0.0.11 get links
# Shows all network interfaces with their state, MAC address, MTU

# Address resources (IP addresses)
talosctl -n 10.0.0.11 get addresses
# Shows all IP addresses assigned to interfaces

# Route resources (routing table)
talosctl -n 10.0.0.11 get routes
# Shows the complete routing table

# Resolver resources (DNS)
talosctl -n 10.0.0.11 get resolvers
# Shows configured DNS servers

# Time server resources
talosctl -n 10.0.0.11 get timeservers
# Shows configured NTP servers
```

### Cluster Resources

Cluster resources represent information about the Talos cluster itself.

```bash
# Member resources (discovered cluster members)
talosctl -n 10.0.0.11 get members
# Shows all nodes in the cluster with their roles and addresses

# Cluster identity
talosctl -n 10.0.0.11 get infos -o yaml
# Shows cluster information, including the cluster ID

# Node name
talosctl -n 10.0.0.11 get nodename
# Shows the Kubernetes node name
```

### Machine Resources

Machine resources represent the state of the machine itself.

```bash
# Machine configuration
talosctl -n 10.0.0.11 get machineconfig
# The complete machine configuration document

# Machine type
talosctl -n 10.0.0.11 get machinetype
# Whether this is a control plane or worker node

# Machine status
talosctl -n 10.0.0.11 get machinestatus
# Overall machine state (booting, running, etc.)
```

### Certificate Resources

Certificate resources track the PKI state of the node.

```bash
# View API certificate material
talosctl -n 10.0.0.11 get apicertificates -o yaml

# View the etcd PKI (control plane only)
talosctl -n 10.0.0.11 get pkistatuses -o yaml
```

## Querying Resources

talosctl provides several ways to query resources.

### Basic Listing

```bash
# List all resources of a type
talosctl -n 10.0.0.11 get addresses

# Get a specific resource by ID
talosctl -n 10.0.0.11 get addresses eth0/10.0.0.11
```

### Output Formats

```bash
# Default table format
talosctl -n 10.0.0.11 get addresses

# YAML format (shows full spec data)
talosctl -n 10.0.0.11 get addresses -o yaml

# JSON format
talosctl -n 10.0.0.11 get addresses -o json
```

### Watching Resources

The watch feature is one of the most useful for debugging. It streams resource changes in real time.

```bash
# Watch for address changes
talosctl -n 10.0.0.11 get addresses --watch

# Watch with YAML output to see the full data on each change
talosctl -n 10.0.0.11 get addresses --watch -o yaml

# Watch multiple nodes simultaneously
talosctl -n 10.0.0.11,10.0.0.12 get addresses --watch
```

### Querying Across Nodes

You can query resources across multiple nodes to compare state.

```bash
# Compare addresses across all nodes
talosctl -n 10.0.0.11,10.0.0.12,10.0.0.13 get addresses

# Compare member lists (should be the same on all nodes)
talosctl -n 10.0.0.11,10.0.0.12 get members
```

Resource Namespaces

Resources are organized into namespaces. This is not the same as Kubernetes namespaces. Talos resource namespaces are categories for different aspects of the system.

```bash
# Common Talos resource namespaces:
# network        - Network configuration and state
# network-config - Unmerged network configuration resources
# config         - Machine configuration
# k8s            - Kubernetes-related resources
# cluster        - Cluster membership and discovery
# hardware       - Hardware information
# runtime        - Runtime state
# etcd           - etcd cluster state (control plane)
```

Resource Layers and Priority

Resources can originate from different layers, and layers have priority. This matters when multiple sources try to set the same value.

The **configuration** layer has the highest priority and comes from the machine configuration. When you set a static IP in the config, it always wins.

The **operator** layer comes from dynamic sources like DHCP or the virtual IP operator. It provides values when higher-priority layers do not specify them.

The **platform** layer comes from cloud or platform metadata, and the **cmdline** layer comes from kernel command line network options.

The **default** layer provides system defaults for resources that are not configured explicitly.

From lowest to highest priority, the network configuration layers are: `default`, `cmdline`, `platform`, `operator`, and `configuration`.

```bash
# View the layer of address resources
talosctl -n 10.0.0.11 get addressspecs -o yaml

# In the output, look for:
# spec:
#   layer: configuration  # or "operator", "platform", "cmdline", or "default"
```

## Using Resources for Troubleshooting

Resources are your primary tool for diagnosing issues on Talos nodes.

### Network Issues

```bash
# Is the interface up?
talosctl -n 10.0.0.11 get links eth0 -o yaml

# Does it have an IP address?
talosctl -n 10.0.0.11 get addresses

# Is the default route configured?
talosctl -n 10.0.0.11 get routes | grep "0.0.0.0/0"

# Are DNS servers configured?
talosctl -n 10.0.0.11 get resolvers
```

### Cluster Issues

```bash
# Can the node see other cluster members?
talosctl -n 10.0.0.11 get members

# Is the node registered with the cluster?
talosctl -n 10.0.0.11 get nodename

# What is the machine type?
talosctl -n 10.0.0.11 get machinetype
```

### Configuration Issues

```bash
# What configuration is the node running?
talosctl -n 10.0.0.11 get machineconfig -o yaml

# Is the configuration valid?
talosctl -n 10.0.0.11 get machinestatus
```

## Creating Custom Tooling with Resources

Since resources are accessible through the gRPC API, you can build custom monitoring and automation tools that query resource state.

```go
// Go example: Query addresses from a Talos node
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/cosi-project/runtime/pkg/resource"
    "github.com/siderolabs/talos/pkg/machinery/client"
    "github.com/siderolabs/talos/pkg/machinery/resources/network"
)

func main() {
    ctx := context.Background()
    ctx = client.WithNode(ctx, "10.0.0.11")

    c, err := client.New(ctx, client.WithDefaultConfig())
    if err != nil {
        log.Fatal(err)
    }
    defer c.Close()

    // List all address resources
    kind := resource.NewMetadata(network.NamespaceName, network.AddressStatusType, "", resource.VersionUndefined)
    items, err := c.COSI.List(ctx, kind)
    if err != nil {
        log.Fatal(err)
    }

    for _, item := range items.Items {
        fmt.Printf("Address: %s\n", item.Metadata().ID())
    }
}
```

## Conclusion

Resource definitions in Talos Linux provide a structured, queryable representation of the entire system state. Every aspect of the node, from network interfaces to cluster membership, is represented as a typed resource that can be listed, inspected, and watched in real time. The spec/status pattern gives you visibility into both the desired and actual state, making it easy to identify when something is not reconciled. Understanding the resource model is the key to effective troubleshooting on Talos Linux because it gives you a complete, live view of what is happening on every node in your cluster.

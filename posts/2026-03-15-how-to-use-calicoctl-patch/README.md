# How to Use calicoctl patch with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Kubernetes, Networking, Configuration, DevOps

Description: Learn how to use calicoctl patch to make targeted modifications to Calico resources such as IP pools, BGP configurations, and network policies.

---

## Introduction

The `calicoctl patch` command applies partial updates to existing Calico resources. Instead of replacing the entire resource definition, you can modify specific fields using a JSON merge patch. This is particularly useful for making targeted changes to large or complex resources without needing to retrieve, edit, and reapply the full resource.

The patch command uses strategic merge patch by default, where you provide a JSON document containing only the fields you want to change. Fields not included in the patch remain unchanged. You can also use JSON Merge Patch (RFC 7386) or JSON Patch (RFC 6902) by specifying the `--type` flag.

This guide demonstrates practical uses of `calicoctl patch` for common Calico configuration changes.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` CLI installed and configured
- Existing Calico resources to modify
- Understanding of JSON merge patch semantics

## Basic Patch Syntax

The general syntax is:

```bash
calicoctl patch <resource_type> <resource_name> -p '<json_patch>'
```

## Patching IP Pools

### Disable an IP Pool

Prevent new IP allocations from a pool without deleting it:

```bash
calicoctl patch ippool old-pool -p '{"spec": {"disabled": true}}'
```

### Change NAT Outgoing Setting

```bash
calicoctl patch ippool default-ipv4-ippool -p '{"spec": {"natOutgoing": false}}'
```

### Update IPIP Mode

```bash
calicoctl patch ippool default-ipv4-ippool -p '{"spec": {"ipipMode": "CrossSubnet"}}'
```

### Update VXLAN Mode

```bash
calicoctl patch ippool default-ipv4-ippool -p '{"spec": {"vxlanMode": "Always"}}'
```

## Patching BGP Configuration

### Set the Default AS Number

```bash
calicoctl patch bgpconfiguration default -p '{"spec": {"asNumber": 64513}}'
```

### Enable Full Mesh

```bash
calicoctl patch bgpconfiguration default -p '{"spec": {"nodeToNodeMeshEnabled": true}}'
```

### Disable Full Mesh for Custom BGP Topology

```bash
calicoctl patch bgpconfiguration default -p '{"spec": {"nodeToNodeMeshEnabled": false}}'
```

## Patching Global Network Policies

### Add a Label to a Policy

```bash
calicoctl patch globalnetworkpolicy my-policy -p '{"metadata": {"labels": {"environment": "staging"}}}'
```

### Change the Policy Order

```bash
calicoctl patch globalnetworkpolicy my-policy -p '{"spec": {"order": 100}}'
```

## Patching Felix Configuration

### Adjust Logging Level

```bash
calicoctl patch felixconfiguration default -p '{"spec": {"logSeverityScreen": "Warning"}}'
```

### Enable Flow Logs (Calico Enterprise Only)

```bash
calicoctl patch felixconfiguration default -p '{"spec": {"flowLogsFlushInterval": "15s"}}'
```

### Set IP-in-IP MTU

```bash
calicoctl patch felixconfiguration default -p '{"spec": {"ipipMTU": 1440}}'
```

## Patching Nodes

### Update BGP Settings on a Specific Node

```bash
calicoctl patch node worker-1 -p '{"spec": {"bgp": {"asNumber": 64514}}}'
```

### Set a Route Reflector Cluster ID

```bash
calicoctl patch node rr-node-1 -p '{"spec": {"bgp": {"routeReflectorClusterID": "244.0.0.1"}}}'
```

## Scripted Patching

### Patch Multiple Nodes

```bash
#!/bin/bash
# Set all nodes in a rack to a specific AS number
NODES=$(calicoctl get nodes -o json | jq -r '.items[].metadata.name' | grep "rack01")

for node in $NODES; do
  echo "Patching node: $node"
  calicoctl patch node "$node" -p '{"spec": {"bgp": {"asNumber": 64520}}}'
done
```

### Conditional Patching

```bash
#!/bin/bash
# Disable IP pools that have no allocations
POOLS=$(calicoctl get ippools -o json | jq -r '.items[].metadata.name')

for pool in $POOLS; do
  CIDR=$(calicoctl get ippool "$pool" -o json | jq -r '.spec.cidr')
  echo "Checking pool $pool ($CIDR)"
  calicoctl patch ippool "$pool" -p '{"spec": {"disabled": true}}'
done
```

## Verification

After patching, verify the changes took effect:

```bash
# Check the patched resource
calicoctl get ippool default-ipv4-ippool -o yaml

# Verify Felix configuration
calicoctl get felixconfiguration default -o yaml

# Check BGP configuration
calicoctl get bgpconfiguration default -o yaml
```

## Troubleshooting

- **Patch rejected**: Ensure the JSON is valid. Use `echo '{"spec": {...}}' | jq .` to validate before patching.
- **No effect observed**: Some changes like Felix configuration updates may take a few seconds to propagate to all nodes.
- **Resource not found**: Verify the resource name with `calicoctl get <type>`.
- **Invalid field**: Check the Calico API reference for the correct field names and nesting for the resource type you are patching.

## Conclusion

The `calicoctl patch` command provides a concise way to make targeted modifications to Calico resources without needing to manage full resource definitions. It is especially useful for operational changes like disabling IP pools, tuning Felix parameters, or adjusting BGP configuration. Combined with scripting, it enables efficient bulk configuration changes across your Calico deployment.

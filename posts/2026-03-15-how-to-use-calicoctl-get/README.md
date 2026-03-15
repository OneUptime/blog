# How to Use calicoctl get with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Kubernetes, Networking, Troubleshooting, DevOps

Description: Learn how to use calicoctl get to inspect and query Calico resources including policies, IP pools, nodes, and workload endpoints.

---

## Introduction

The `calicoctl get` command retrieves Calico resources from the datastore and displays them in various output formats. It is the primary tool for inspecting the current state of your Calico configuration, including network policies, IP pools, BGP peers, and workload endpoints.

Unlike `kubectl get`, which can only access Calico resources stored as Kubernetes CRDs, `calicoctl get` understands the full Calico data model and provides properly formatted output for all resource types. It also supports output in YAML, JSON, wide table, and custom Go template formats.

This guide demonstrates practical uses of `calicoctl get` for day-to-day Calico operations and troubleshooting.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` CLI installed and configured
- `kubectl` access to the cluster
- Basic familiarity with Calico resource types

## Basic Resource Retrieval

### Listing All Resources of a Type

```bash
# List all Calico nodes
calicoctl get nodes

# List all IP pools
calicoctl get ippools

# List all global network policies
calicoctl get globalnetworkpolicy

# List all host endpoints
calicoctl get hostendpoints

# List all BGP peers
calicoctl get bgppeer
```

### Getting a Specific Resource by Name

```bash
calicoctl get ippool default-ipv4-ippool
```

## Output Formats

### YAML Output

```bash
calicoctl get globalnetworkpolicy default-deny -o yaml
```

### JSON Output

```bash
calicoctl get ippool default-ipv4-ippool -o json
```

### Wide Table Output

```bash
calicoctl get nodes -o wide
```

### Go Template Output

```bash
calicoctl get nodes -o go-template='{{range .}}{{.ObjectMeta.Name}}{{"\n"}}{{end}}'
```

## Querying Workload Endpoints

Workload endpoints represent pod network interfaces managed by Calico:

```bash
# List all workload endpoints
calicoctl get workloadendpoints

# Get endpoints in a specific namespace
calicoctl get workloadendpoints --namespace=production

# Get detailed info on an endpoint
calicoctl get workloadendpoints --namespace=default -o yaml
```

## Inspecting IP Pool Usage

```bash
# Show all IP pools with their CIDR ranges
calicoctl get ippools -o wide

# Export the full IP pool configuration
calicoctl get ippools -o yaml > ippools-backup.yaml
```

## Checking BGP Configuration

```bash
# View BGP configuration
calicoctl get bgpconfiguration -o yaml

# List all BGP peers
calicoctl get bgppeer -o wide

# Check BGP node-specific settings
calicoctl get node -o yaml | grep -A 5 bgp
```

## Filtering and Scripting

### Using calicoctl with jq

```bash
# Get all IP pool CIDRs
calicoctl get ippools -o json | jq -r '.items[].spec.cidr'

# Count workload endpoints per namespace
calicoctl get workloadendpoints --all-namespaces -o json | \
  jq -r '.items[].metadata.namespace' | sort | uniq -c | sort -rn

# List policies with their selectors
calicoctl get globalnetworkpolicy -o json | \
  jq -r '.items[] | "\(.metadata.name): \(.spec.selector)"'
```

### Backing Up All Resources

```bash
#!/bin/bash
RESOURCES="ippools globalnetworkpolicy bgppeer bgpconfiguration hostendpoints globalnetworkset"
BACKUP_DIR="calico-backup-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

for resource in $RESOURCES; do
  calicoctl get "$resource" -o yaml > "$BACKUP_DIR/${resource}.yaml" 2>/dev/null
  echo "Backed up $resource"
done
```

## Verification

Confirm your queries return expected results:

```bash
# Verify node count matches cluster
CALICO_NODES=$(calicoctl get nodes -o json | jq '.items | length')
KUBE_NODES=$(kubectl get nodes --no-headers | wc -l)
echo "Calico nodes: $CALICO_NODES, Kubernetes nodes: $KUBE_NODES"

# Verify IP pool exists
calicoctl get ippool default-ipv4-ippool -o yaml
```

## Troubleshooting

- **Empty output**: Ensure `DATASTORE_TYPE` and `KUBECONFIG` are set. Run `calicoctl get nodes` as a connectivity check.
- **Resource not found**: Verify the resource name and type. Use the plural form for listing (e.g., `ippools` not `ippool` when listing all).
- **Permission denied**: The user needs RBAC permissions on the Calico CRDs (`projectcalico.org` API group).
- **Namespace scoping**: Some resources like `NetworkPolicy` are namespace-scoped. Use `--namespace` or `--all-namespaces` to query them.

## Conclusion

The `calicoctl get` command is an essential tool for inspecting and auditing your Calico configuration. By combining it with output format options and tools like `jq`, you can build effective monitoring scripts, backup procedures, and troubleshooting workflows. Regular use of `calicoctl get` to review your policies, IP pools, and BGP configuration helps ensure your network configuration remains correct and consistent.

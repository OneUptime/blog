# How to Use calicoctl node diags with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Kubernetes, Diagnostics, Troubleshooting, DevOps

Description: Learn how to use calicoctl node diags to collect diagnostic data from Calico nodes for troubleshooting networking and connectivity issues.

---

## Introduction

The `calicoctl node diags` command collects a comprehensive set of diagnostic information from a Calico node. This includes logs, configuration files, routing tables, iptables rules, BIRD status, and system information. The output is packaged into a tarball that can be shared with support teams or used for offline analysis.

When you encounter a networking issue that cannot be resolved with basic inspection commands, `calicoctl node diags` gathers everything needed for a thorough investigation in one step. This is much faster than manually collecting individual pieces of diagnostic data.

This guide covers how to use `calicoctl node diags` effectively, what data it collects, and how to interpret the results.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` CLI installed
- Root or sudo access on the node (for direct execution)
- `kubectl` access for pod-based execution

## Running calicoctl node diags

### Directly on a Node

```bash
sudo calicoctl node diags
```

This creates a diagnostics tarball in the current directory:

```
Collecting diagnostics
Using log dir: /var/log/calico
Dumping netstat
Dumping routes (IPv4)
Dumping routes (IPv6)
Dumping iptables (IPv4)
Dumping iptables (IPv6)
Dumping ipsets
Dumping BIRD protocols
Dumping BIRD routes
...
Diags saved to /tmp/calico-diags-20260315_143022.tar.gz
```

### Specifying a Custom Log Directory

```bash
sudo calicoctl node diags --log-dir=/var/log/calico
```

### From a Calico Pod in Kubernetes

```bash
# Find the calico-node pod on the problematic node
NODE_NAME="worker-1"
POD=$(kubectl get pods -n calico-system -l k8s-app=calico-node \
  --field-selector spec.nodeName="$NODE_NAME" \
  -o jsonpath='{.items[0].metadata.name}')

# Run diags inside the pod
kubectl exec -n calico-system "$POD" -- calico-node -diags
```

### Copying the Diagnostics Tarball

```bash
# Copy the diags file from the pod
kubectl cp calico-system/"$POD":/tmp/calico-diags-*.tar.gz ./calico-diags-worker1.tar.gz
```

## What Data is Collected

The diagnostics tarball contains:

- **System info**: hostname, OS version, kernel version, uptime
- **Network config**: IP addresses, routing tables (IPv4 and IPv6), ARP cache
- **iptables rules**: Full iptables and ip6tables dumps including all chains
- **ipsets**: All ipset lists used by Calico
- **BIRD status**: BGP protocol status, route tables, BIRD configuration
- **Calico logs**: Felix logs, BIRD logs, confd logs
- **Network interfaces**: Interface configuration and statistics
- **Netstat output**: Active connections and listening ports

## Extracting and Analyzing Diagnostics

### Extract the Tarball

```bash
mkdir calico-diags && cd calico-diags
tar xzf ../calico-diags-20260315_143022.tar.gz
ls -la
```

### Check Routing Tables

```bash
cat route
cat route6
```

### Review iptables Rules

```bash
# Check filter table rules
cat iptables

# Look for Calico-specific chains
grep "cali-" iptables
```

### Inspect BIRD Status

```bash
cat bird_protocols
cat bird_routes
```

### Check Felix Logs for Errors

```bash
grep -i error calico-felix.log | tail -20
```

## Collecting Diags from All Nodes

```bash
#!/bin/bash
# collect-all-diags.sh
NAMESPACE="calico-system"
OUTPUT_DIR="cluster-diags-$(date +%Y%m%d)"
mkdir -p "$OUTPUT_DIR"

PODS=$(kubectl get pods -n "$NAMESPACE" -l k8s-app=calico-node \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.nodeName}{"\n"}{end}')

while IFS=$'\t' read -r pod node; do
  echo "Collecting diags from node: $node (pod: $pod)"
  kubectl exec -n "$NAMESPACE" "$pod" -- calico-node -diags 2>/dev/null

  # Find the generated diags file
  DIAGS_FILE=$(kubectl exec -n "$NAMESPACE" "$pod" -- ls /tmp/ | grep calico-diags | tail -1)

  if [ -n "$DIAGS_FILE" ]; then
    kubectl cp "$NAMESPACE/$pod:/tmp/$DIAGS_FILE" "$OUTPUT_DIR/${node}-diags.tar.gz"
    echo "  Saved to $OUTPUT_DIR/${node}-diags.tar.gz"
  else
    echo "  WARNING: No diags file found for $node"
  fi
done <<< "$PODS"

echo "All diagnostics saved to $OUTPUT_DIR/"
```

## Comparing Diags Between Nodes

When troubleshooting connectivity between two specific nodes, collect diags from both and compare:

```bash
# Compare routing tables
diff <(tar xzf node1-diags.tar.gz -O route 2>/dev/null) \
     <(tar xzf node2-diags.tar.gz -O route 2>/dev/null)

# Compare iptables rules
diff <(tar xzf node1-diags.tar.gz -O iptables 2>/dev/null) \
     <(tar xzf node2-diags.tar.gz -O iptables 2>/dev/null)
```

## Verification

Verify the diagnostics collection was successful:

```bash
# Check the tarball contents
tar tzf calico-diags-*.tar.gz

# Verify key files are present
tar tzf calico-diags-*.tar.gz | grep -E "route|iptables|bird"

# Check file sizes (empty files may indicate collection issues)
tar tzvf calico-diags-*.tar.gz
```

## Troubleshooting

- **Empty diagnostics files**: The calico-node process may not have access to the host network namespace. Ensure the pod has the correct security context and host networking enabled.
- **Permission denied**: Run with `sudo` or ensure the pod has the necessary capabilities.
- **Tarball not created**: Check available disk space in `/tmp`. The diagnostics can be several megabytes depending on log volume.
- **Cannot copy from pod**: Ensure the pod name is correct and the file path matches. Use `kubectl exec` to list files in `/tmp` first.
- **Missing BIRD data**: If Calico is running in VXLAN-only mode, BIRD may not be running and those sections will be empty.

## Conclusion

The `calicoctl node diags` command is an invaluable tool for comprehensive troubleshooting of Calico networking issues. By collecting all relevant diagnostic data in a single step, it saves significant time compared to manual data gathering. When combined with scripts for multi-node collection and comparison, it provides a complete picture of your cluster networking state. Always include diagnostics data when filing support requests or bug reports.

# How to Use calicoctl node diags with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Kubernetes, Diagnostic, Troubleshooting, DevOps

Description: Learn how to use calicoctl node diags to collect diagnostic data from Calico nodes for troubleshooting networking and connectivity issues.

---

## Introduction

The `calicoctl node diags` command collects a comprehensive set of diagnostic information from a Calico node. This includes logs, routing tables, interface addresses, nftables and iptables rules, ipsets, socket information, and basic host information. The output is packaged into a tarball that can be shared with support teams or used for offline analysis.

When you encounter a networking issue that cannot be resolved with basic inspection commands, `calicoctl node diags` gathers everything needed for a thorough investigation in one step. This is much faster than manually collecting individual pieces of diagnostic data.

This guide covers how to use `calicoctl node diags` effectively, what data it collects, and how to interpret the results.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` CLI installed
- Root or sudo access on the node (for direct execution)
- `kubectl` access for identifying the target node

## Running calicoctl node diags

### Directly on a Node

```bash
sudo calicoctl node diags
```

This creates a diagnostics tarball under a temporary directory in `/tmp`:

```text
Collecting diagnostics
Using temp dir: /tmp/calico676127473
Dumping netstat
Dumping routes (IPv4)
Dumping routes (IPv6)
Dumping interface info (IPv4)
Dumping interface info (IPv6)
Dumping nftables
Dumping iptables (IPv4)
Dumping iptables (IPv6)
Dumping ipsets
...
Diags saved to /tmp/calico676127473/diags-20260315_143022.tar.gz
```

### Specifying a Custom Log Directory

```bash
sudo calicoctl node diags --log-dir=/var/log/calico
```

### Identifying the Node from Kubernetes

```bash
NODE_NAME="worker-1"
kubectl get pods -n calico-system -l k8s-app=calico-node \
  --field-selector spec.nodeName="$NODE_NAME" \
  -o wide

# SSH to that node and run:
sudo calicoctl node diags
```

### Copying the Diagnostics Tarball

```bash
# Copy the diags file from the node after the command prints its path
ssh worker-1 'sudo cat /tmp/calico676127473/diags-20260315_143022.tar.gz' \
  > ./calico-diags-worker1.tar.gz
```

## What Data is Collected

The diagnostics tarball contains:

- **System info**: date and hostname
- **Network config**: IP addresses and routing tables (IPv4 and IPv6)
- **nftables and iptables rules**: nftables ruleset plus iptables and ip6tables dumps including counters
- **ipsets**: All ipset lists used by Calico
- **Calico logs**: Files from the configured Calico log directory, plus container logs when available
- **Network interfaces**: Interface configuration and statistics
- **Netstat or ss output**: Active connections and listening ports

## Extracting and Analyzing Diagnostics

### Extract the Tarball

```bash
mkdir calico-diags && cd calico-diags
tar xzf ../diags-20260315_143022.tar.gz
ls -la
```

### Check Routing Tables

```bash
cat diagnostics/ipv4_route
cat diagnostics/ipv6_route
```

### Review iptables Rules

```bash
# Check filter table rules
cat diagnostics/ipv4_tables

# Look for Calico-specific chains
grep "cali-" diagnostics/ipv4_tables
```

### Inspect the Calico Node Journal

```bash
cat diagnostics/journalctl_calico_node
```

### Check Felix Logs for Errors

```bash
grep -Ri error diagnostics/logs | tail -20
```

## Collecting Diags from All Nodes

```bash
#!/bin/bash
# collect-all-diags.sh
OUTPUT_DIR="cluster-diags-$(date +%Y%m%d)"
mkdir -p "$OUTPUT_DIR"

NODES=$(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')

while read -r node; do
  echo "Collecting diags from node: $node"
  DIAGS_PATH=$(ssh "$node" 'sudo calicoctl node diags' | awk '/Diags saved to/ {print $4}')

  if [ -n "$DIAGS_PATH" ]; then
    ssh "$node" "sudo cat '$DIAGS_PATH'" > "$OUTPUT_DIR/${node}-diags.tar.gz"
    echo "  Saved to $OUTPUT_DIR/${node}-diags.tar.gz"
  else
    echo "  WARNING: No diags file found for $node"
  fi
done <<< "$NODES"

echo "All diagnostics saved to $OUTPUT_DIR/"
```

## Comparing Diags Between Nodes

When troubleshooting connectivity between two specific nodes, collect diags from both and compare:

```bash
# Compare routing tables
diff <(tar xzf node1-diags.tar.gz -O diagnostics/ipv4_route 2>/dev/null) \
     <(tar xzf node2-diags.tar.gz -O diagnostics/ipv4_route 2>/dev/null)

# Compare iptables rules
diff <(tar xzf node1-diags.tar.gz -O diagnostics/ipv4_tables 2>/dev/null) \
     <(tar xzf node2-diags.tar.gz -O diagnostics/ipv4_tables 2>/dev/null)
```

## Verification

Verify the diagnostics collection was successful:

```bash
# Check the tarball contents
tar tzf diags-*.tar.gz

# Verify key files are present
tar tzf diags-*.tar.gz | grep -E "ipv4_route|ipv4_tables|journalctl"

# Check file sizes (empty files may indicate collection issues)
tar tzvf diags-*.tar.gz
```

## Troubleshooting

- **Empty diagnostics files**: Ensure `calicoctl node diags` is running on the specific node you are diagnosing and has access to host networking commands.
- **Permission denied**: Run with `sudo` or ensure your SSH user can run the required commands with elevated privileges.
- **Tarball not created**: Check available disk space in `/tmp`. The diagnostics can be several megabytes depending on log volume.
- **Cannot copy from node**: Ensure the node name is resolvable over SSH and the file path matches the path printed by `calicoctl`.
- **Missing BIRD data**: `calicoctl node diags` does not dump BIRD protocol tables directly in current Calico releases. Use `calicoctl node status` on the node if you need BGP peer status.

## Conclusion

The `calicoctl node diags` command is an invaluable tool for comprehensive troubleshooting of Calico networking issues. By collecting all relevant diagnostic data in a single step, it saves significant time compared to manual data gathering. When combined with scripts for multi-node collection and comparison, it provides a complete picture of your cluster networking state. Always include diagnostics data when filing support requests or bug reports.

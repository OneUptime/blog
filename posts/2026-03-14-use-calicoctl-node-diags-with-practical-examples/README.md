# Using calicoctl node diags with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Diagnostic, Kubernetes, Troubleshooting

Description: Learn how to collect comprehensive Calico node diagnostics using calicoctl node diags, including log collection, configuration dumps, and system information gathering.

---

## Introduction

When troubleshooting complex Calico networking issues, you need more than just BGP status or individual log lines. The `calicoctl node diags` command collects a diagnostic bundle from the Calico node, including logs, routing tables, interface information, iptables rules, ipsets, and system information. This bundle is invaluable for support cases and deep troubleshooting.

The diagnostic bundle captures a point-in-time snapshot of many details relevant to Calico's operation on a specific node. Instead of manually collecting dozens of pieces of information, `calicoctl node diags` gathers the key data in one command.

This guide shows practical examples of collecting, extracting, and analyzing Calico node diagnostics.

## Prerequisites

- A Kubernetes cluster with Calico installed
- Root or sudo access on the node
- `calicoctl` installed
- SSH access and non-interactive sudo for the multi-node examples
- Sufficient disk space for the diagnostic bundle (typically 10-50 MB)

## Basic Diagnostic Collection

```bash
# Collect diagnostics from the current node

sudo calicoctl node diags
```

This creates a tar.gz file under a temporary directory in `/tmp`. The output tells you the filename:

```text
Collecting diagnostics
Using temp dir: /tmp/calico676127473
Dumping netstat
Dumping routes (IPv4)
Dumping routes (IPv6)
Dumping interface info (IPv4)
Dumping interface info (IPv6)
Dumping iptables (IPv4)
Dumping iptables (IPv6)
Dumping ipsets
...
Diags saved to /tmp/calico676127473/diags-20260314_103000.tar.gz
```

## Examining the Diagnostic Bundle

```bash
# Store the diagnostic bundle path
DIAG_TAR=$(find /tmp -path "/tmp/calico*/diags-*.tar.gz" -type f | sort | tail -1)

# List the contents of the bundle
tar tzf "$DIAG_TAR"

# Extract the bundle
mkdir calico-diags && cd calico-diags
tar xzf "$DIAG_TAR"

# View the directory structure
find . -type f | head -30
```

Typical contents include:

```text
diagnostics/date
diagnostics/hostname
diagnostics/netstat
diagnostics/ipv4_route
diagnostics/ipv6_route
diagnostics/ipv4_addr
diagnostics/ipv6_addr
diagnostics/ipv4_tables
diagnostics/ipv6_tables
diagnostics/ipsets
diagnostics/ipset_container
diagnostics/journalctl_calico_node
diagnostics/logs/
```

## Collecting Diagnostics for Kubernetes Nodes

In Kubernetes environments, `calicoctl node` commands still need to run directly on the compute host running `calico-node`, because they need access to host networking and filesystem state:

```bash
# Pick the Kubernetes node to inspect
NODE="worker-1"

# Collect diagnostics on that node
ssh "$NODE" "sudo calicoctl node diags"

# Copy the newest diagnostic bundle from the node
DIAG_FILE=$(ssh "$NODE" "find /tmp -path '/tmp/calico*/diags-*.tar.gz' -type f | sort | tail -1")
scp "$NODE:$DIAG_FILE" "./${NODE}-diags.tar.gz"
```

## Automated Multi-Node Collection

```bash
#!/bin/bash
# collect-all-diags.sh
# Collects diagnostics from every node in the cluster

OUTPUT_DIR="cluster-diags-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

NODES=$(kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')

for NODE in $NODES; do
  echo "Collecting from $NODE..."
  
  if ! ssh "$NODE" "command -v calicoctl >/dev/null"; then
    echo "  WARNING: calicoctl not found on $NODE"
    continue
  fi
  
  # Collect diagnostics on the node
  ssh "$NODE" "sudo calicoctl node diags" 2>/dev/null
  
  # Find and copy the diagnostic file
  DIAG_FILE=$(ssh "$NODE" "find /tmp -path '/tmp/calico*/diags-*.tar.gz' -type f | sort | tail -1" 2>/dev/null)
  
  if [ -n "$DIAG_FILE" ]; then
    scp "$NODE:$DIAG_FILE" "${OUTPUT_DIR}/${NODE}-diags.tar.gz" 2>/dev/null
    echo "  Saved: ${OUTPUT_DIR}/${NODE}-diags.tar.gz"
  else
    echo "  WARNING: No diagnostic file found"
  fi
done

echo ""
echo "All diagnostics saved to $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"
```

## Analyzing Key Diagnostic Files

### Checking iptables Rules

```bash
# Extract and review iptables rules
tar xzf calico-diags.tar.gz
cat diagnostics/ipv4_tables | grep -c "cali-"
echo "---"
cat diagnostics/ipv4_tables | grep "DROP" | head -10
echo "---"
cat diagnostics/ipv4_tables | grep "ACCEPT" | head -10
```

### Reviewing Felix Logs

```bash
# Look for errors in Felix logs
grep -Ri "error" diagnostics/logs/ | tail -20

# Check for policy updates
grep -Ri "policy" diagnostics/logs/ | tail -10
```

### Checking Routing Tables

```bash
# Review IP routes
cat diagnostics/ipv4_route

# Review blackhole routes for local Calico IP blocks
grep "blackhole" diagnostics/ipv4_route
```

## Verification

Confirm the diagnostic bundle is complete:

```bash
# Verify key files exist in the bundle
tar tzf calico-diags.tar.gz | grep -E "(ipv4_tables|ipv4_route|journalctl_calico_node|logs/)"
```

## Troubleshooting

- **Diagnostic collection fails with permission errors**: Must run as root or via sudo on the node. If `calicoctl` uses environment variables for datastore access, use `sudo -E`.
- **Bundle is too large**: In clusters with high log volumes, old logs inflate the bundle. Rotate Calico logs before collection.
- **Cannot copy bundle from a node**: Ensure SSH access works and that the diagnostic file path from the command output still exists.
- **Missing expected packet filter rules**: The node may be using Calico's nftables data plane instead of the default iptables data plane. If the bundle does not include the rules you need, collect `sudo nft list ruleset` separately.

## Conclusion

`calicoctl node diags` is one of the most useful single commands for collecting node-level Calico troubleshooting data. By automating collection across all nodes and understanding how to analyze the key files in the bundle, you can dramatically reduce the time spent diagnosing complex networking issues. Always collect diagnostics before making changes so you have a baseline for comparison.

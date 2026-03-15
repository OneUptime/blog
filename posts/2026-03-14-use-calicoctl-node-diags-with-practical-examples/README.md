# Using calicoctl node diags with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Diagnostics, Kubernetes, Troubleshooting

Description: Learn how to collect comprehensive Calico node diagnostics using calicoctl node diags, including log collection, configuration dumps, and system information gathering.

---

## Introduction

When troubleshooting complex Calico networking issues, you need more than just BGP status or individual log lines. The `calicoctl node diags` command collects a comprehensive diagnostic bundle from the Calico node, including logs, configuration, routing tables, iptables rules, and system information. This bundle is invaluable for support cases and deep troubleshooting.

The diagnostic bundle captures a point-in-time snapshot of everything relevant to Calico's operation on a specific node. Instead of manually collecting dozens of pieces of information, `calicoctl node diags` gathers everything in one command.

This guide shows practical examples of collecting, customizing, and analyzing Calico node diagnostics.

## Prerequisites

- A Kubernetes cluster with Calico installed
- Root or sudo access on the node
- `calicoctl` installed
- Sufficient disk space for the diagnostic bundle (typically 10-50 MB)

## Basic Diagnostic Collection

```bash
# Collect diagnostics from the current node
sudo calicoctl node diags
```

This creates a tar.gz file in the current directory containing all diagnostic data. The output tells you the filename:

```text
Collecting diagnostics
Using log dir /var/log/calico
Dumping iptables
Dumping ip routes
Dumping ip addresses
...
Diags saved to /tmp/calico-diags-20260314_103000.tar.gz
```

## Examining the Diagnostic Bundle

```bash
# List the contents of the bundle
tar tzf /tmp/calico-diags-*.tar.gz

# Extract the bundle
mkdir calico-diags && cd calico-diags
tar xzf /tmp/calico-diags-*.tar.gz

# View the directory structure
find . -type f | head -30
```

Typical contents include:

```text
./date
./hostname
./ip-addr
./ip-route
./ip-rule
./iptables
./ip6tables
./ipset-list
./calico-node-logs/
./bird-logs/
./felix-logs/
./confd-logs/
./bgp-status
./calico-resources/
```

## Collecting Diagnostics from Kubernetes

In Kubernetes environments, collect diags from within the calico-node pod:

```bash
# Find the calico-node pod on a specific node
NODE="worker-1"
POD=$(kubectl get pod -n calico-system -l k8s-app=calico-node \
  --field-selector spec.nodeName=$NODE \
  -o jsonpath='{.items[0].metadata.name}')

# Collect diagnostics inside the pod
kubectl exec -n calico-system $POD -- calicoctl node diags

# Copy the diagnostic bundle out of the pod
kubectl cp calico-system/$POD:/tmp/calico-diags-*.tar.gz ./calico-diags-$NODE.tar.gz
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
  
  POD=$(kubectl get pod -n calico-system -l k8s-app=calico-node \
    --field-selector spec.nodeName="$NODE" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
  
  if [ -z "$POD" ]; then
    echo "  WARNING: No calico-node pod on $NODE"
    continue
  fi
  
  # Collect diagnostics
  kubectl exec -n calico-system "$POD" -- calicoctl node diags 2>/dev/null
  
  # Find and copy the diagnostic file
  DIAG_FILE=$(kubectl exec -n calico-system "$POD" -- ls /tmp/ 2>/dev/null | grep "calico-diags" | tail -1)
  
  if [ -n "$DIAG_FILE" ]; then
    kubectl cp "calico-system/${POD}:/tmp/${DIAG_FILE}" "${OUTPUT_DIR}/${NODE}-diags.tar.gz" 2>/dev/null
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
cat iptables | grep -c "cali-"
echo "---"
cat iptables | grep "DROP" | head -10
echo "---"
cat iptables | grep "ACCEPT" | head -10
```

### Reviewing Felix Logs

```bash
# Look for errors in Felix logs
grep -i "error" felix-logs/* | tail -20

# Check for policy updates
grep "policy" felix-logs/* | tail -10
```

### Checking Routing Tables

```bash
# Review IP routes
cat ip-route

# Look for blackhole routes (indicating issues)
grep "blackhole" ip-route
```

## Verification

Confirm the diagnostic bundle is complete:

```bash
# Verify key files exist in the bundle
tar tzf calico-diags.tar.gz | grep -E "(iptables|ip-route|felix|bird|bgp-status)"
```

## Troubleshooting

- **Diagnostic collection fails with permission errors**: Must run as root or via sudo. In Kubernetes, the calico-node pod already has the required privileges.
- **Bundle is too large**: In clusters with high log volumes, old logs inflate the bundle. Rotate Calico logs before collection.
- **Cannot copy bundle from pod**: Ensure `tar` is available in the calico-node container. Use `kubectl exec` to verify.
- **Missing iptables in bundle**: The node may be using nftables instead of iptables. Check the bundle for nftables output.

## Conclusion

`calicoctl node diags` is the most comprehensive single command for collecting Calico troubleshooting data. By automating collection across all nodes and understanding how to analyze the key files in the bundle, you can dramatically reduce the time spent diagnosing complex networking issues. Always collect diagnostics before making changes so you have a baseline for comparison.

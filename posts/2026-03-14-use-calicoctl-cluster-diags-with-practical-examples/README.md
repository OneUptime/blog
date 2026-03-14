# Using calicoctl cluster diags with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Cluster Diagnostics, Kubernetes, Troubleshooting

Description: Collect comprehensive cluster-wide Calico diagnostics using calicoctl cluster diags for holistic troubleshooting and support case preparation.

---

## Introduction

While `calicoctl node diags` collects information from a single node, `calicoctl cluster diags` gathers diagnostic data from across the entire cluster. This includes Calico resource configurations, node states, policy definitions, IP pool allocations, and cluster-wide health information. It is the go-to command when troubleshooting issues that span multiple nodes or affect the cluster as a whole.

The cluster-level diagnostic bundle is invaluable for support cases because it provides a complete picture of the Calico deployment without requiring individual access to each node. It captures the control plane state that determines how all nodes should behave.

## Prerequisites

- A Kubernetes cluster with Calico installed
- `calicoctl` v3.25+ with access to the Calico datastore
- `kubectl` access with cluster-admin privileges
- Sufficient disk space for the diagnostic bundle

## Basic Usage

```bash
calicoctl cluster diags
```

This collects cluster-wide Calico resources and saves them to a tar.gz file:

```
Collecting cluster diagnostics...
  Collecting ClusterInformation...
  Collecting Nodes...
  Collecting IPPools...
  Collecting BGPConfigurations...
  Collecting BGPPeers...
  Collecting FelixConfigurations...
  Collecting GlobalNetworkPolicies...
  Collecting NetworkPolicies...
  Collecting GlobalNetworkSets...
  ...
Diagnostics saved to calico-cluster-diags-20260314.tar.gz
```

## Collecting Diagnostics for Support Cases

```bash
#!/bin/bash
# collect-support-bundle.sh
# Prepares a comprehensive support bundle

BUNDLE_DIR="support-bundle-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BUNDLE_DIR"

echo "=== Collecting Support Bundle ==="

# 1. Cluster diagnostics
echo "Collecting cluster diagnostics..."
calicoctl cluster diags 2>/dev/null
mv calico-cluster-diags-*.tar.gz "$BUNDLE_DIR/" 2>/dev/null

# 2. Calico version info
echo "Collecting version information..."
calicoctl version > "$BUNDLE_DIR/calico-version.txt" 2>&1

# 3. Kubernetes cluster info
echo "Collecting Kubernetes info..."
kubectl cluster-info > "$BUNDLE_DIR/k8s-cluster-info.txt" 2>&1
kubectl get nodes -o wide > "$BUNDLE_DIR/k8s-nodes.txt" 2>&1

# 4. Calico pod status
echo "Collecting Calico pod status..."
kubectl get pods -n calico-system -o wide > "$BUNDLE_DIR/calico-pods.txt" 2>&1
kubectl get pods -n tigera-operator -o wide >> "$BUNDLE_DIR/calico-pods.txt" 2>&1

# 5. Recent events
echo "Collecting events..."
kubectl get events -n calico-system --sort-by='.lastTimestamp' > "$BUNDLE_DIR/calico-events.txt" 2>&1

# 6. Calico resource counts
echo "Collecting resource summary..."
{
  echo "Nodes: $(calicoctl get nodes -o json 2>/dev/null | python3 -c 'import json,sys; print(len(json.load(sys.stdin).get("items",[])))')"
  echo "IP Pools: $(calicoctl get ippools -o json 2>/dev/null | python3 -c 'import json,sys; print(len(json.load(sys.stdin).get("items",[])))')"
  echo "Global Network Policies: $(calicoctl get globalnetworkpolicies -o json 2>/dev/null | python3 -c 'import json,sys; print(len(json.load(sys.stdin).get("items",[])))')"
  echo "Network Policies: $(calicoctl get networkpolicies --all-namespaces -o json 2>/dev/null | python3 -c 'import json,sys; print(len(json.load(sys.stdin).get("items",[])))')"
} > "$BUNDLE_DIR/resource-summary.txt"

# Create final bundle
tar czf "${BUNDLE_DIR}.tar.gz" "$BUNDLE_DIR"
echo ""
echo "Support bundle saved to: ${BUNDLE_DIR}.tar.gz"
echo "Size: $(du -h ${BUNDLE_DIR}.tar.gz | cut -f1)"
```

## Analyzing Cluster Diagnostics

```bash
#!/bin/bash
# analyze-cluster-diags.sh

BUNDLE="$1"
if [ -z "$BUNDLE" ]; then
  echo "Usage: $0 <calico-cluster-diags.tar.gz>"
  exit 1
fi

WORK_DIR=$(mktemp -d)
tar xzf "$BUNDLE" -C "$WORK_DIR"

echo "=== Cluster Diagnostic Analysis ==="

# Analyze nodes
echo "--- Nodes ---"
find "$WORK_DIR" -name "nodes*" -exec cat {} \; 2>/dev/null | python3 -c "
import json, sys, yaml
try:
    data = yaml.safe_load(sys.stdin) or json.load(open(sys.argv[1] if len(sys.argv)>1 else '/dev/stdin'))
except:
    data = json.load(sys.stdin)
items = data.get('items', [data]) if isinstance(data, dict) else data
print(f'Total nodes: {len(items)}')
" 2>/dev/null || echo "Could not parse node data"

# Analyze IP pools
echo ""
echo "--- IP Pools ---"
find "$WORK_DIR" -name "*ippool*" -exec cat {} \; 2>/dev/null | head -20

# Analyze policies
echo ""
echo "--- Policy Summary ---"
GNP_COUNT=$(find "$WORK_DIR" -name "*globalnetworkpolic*" -exec cat {} \; 2>/dev/null | grep -c "name:" || echo 0)
NP_COUNT=$(find "$WORK_DIR" -name "*networkpolic*" ! -name "*global*" -exec cat {} \; 2>/dev/null | grep -c "name:" || echo 0)
echo "Global Network Policies: $GNP_COUNT"
echo "Namespace Network Policies: $NP_COUNT"

rm -rf "$WORK_DIR"
```

## Scheduled Cluster Diagnostics

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-cluster-diags
  namespace: calico-system
spec:
  schedule: "0 2 * * 0"  # Weekly on Sunday at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calicoctl
          containers:
          - name: diags
            image: calico/ctl:v3.27.0
            command:
            - /bin/sh
            - -c
            - |
              calicoctl cluster diags
              cp calico-cluster-diags-*.tar.gz /diags/
            volumeMounts:
            - name: diags
              mountPath: /diags
          volumes:
          - name: diags
            persistentVolumeClaim:
              claimName: calico-diags-pvc
          restartPolicy: Never
```

## Verification

```bash
# Collect diagnostics
calicoctl cluster diags

# Verify the bundle
ls -lh calico-cluster-diags-*.tar.gz
tar tzf calico-cluster-diags-*.tar.gz | head -20

# Analyze
./analyze-cluster-diags.sh calico-cluster-diags-*.tar.gz
```

## Troubleshooting

- **Collection fails with permission errors**: Ensure calicoctl has read access to all Calico CRDs. Check RBAC configuration.
- **Bundle is missing some resources**: Some resource types may not exist in your cluster (e.g., BGPPeers if not configured). This is normal.
- **Large bundle size**: Clusters with many network policies generate larger bundles. This is expected.
- **Cannot collect from air-gapped environment**: Run calicoctl locally with a kubeconfig that has access to the cluster.

## Conclusion

`calicoctl cluster diags` provides a comprehensive snapshot of your entire Calico deployment in a single command. By automating collection, establishing analysis procedures, and including cluster diagnostics in support workflows, you ensure that troubleshooting always starts with complete information about the cluster state.

# Troubleshooting Errors in calicoctl cluster diags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Cluster Diagnostics, Troubleshooting, Kubernetes

Description: Resolve errors encountered when running calicoctl cluster diags, including RBAC issues, datastore connectivity problems, and incomplete collection.

---

## Introduction

When `calicoctl cluster diags` fails, it typically indicates problems with datastore access or RBAC permissions. Since this command reads from the Calico datastore (Kubernetes API or etcd), any connectivity or authorization issue will prevent diagnostic collection.

This guide addresses common errors and provides solutions to ensure you can always collect cluster-wide diagnostics when needed.

## Prerequisites

- Kubernetes cluster with Calico
- `calicoctl` installed and configured
- Understanding of RBAC and datastore access

## Error: Unable to Connect to Datastore

```text
Failed to collect diagnostics: unable to connect to Calico datastore
```

```bash
# Verify datastore configuration
echo $DATASTORE_TYPE

# For Kubernetes datastore
export DATASTORE_TYPE=kubernetes

# Test connectivity
calicoctl get nodes

# Verify kubeconfig
kubectl cluster-info
```

## Error: RBAC Permission Denied

```yaml
Error: forbidden: User cannot list resource "globalnetworkpolicies"
```

Create a comprehensive ClusterRole for diagnostic collection:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calicoctl-diags-reader
rules:
- apiGroups: ["crd.projectcalico.org"]
  resources: ["*"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["nodes", "pods", "namespaces"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: calicoctl-diags-reader-binding
subjects:
- kind: ServiceAccount
  name: calicoctl
  namespace: kube-system
roleRef:
  kind: ClusterRole
  name: calicoctl-diags-reader
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f calicoctl-diags-rbac.yaml
```

## Error: Partial Collection

When some resources are collected but others fail:

```bash
# Check which CRDs exist
kubectl get crd | grep projectcalico

# Some resources may not exist in your installation
# This is normal for minimal Calico configurations

# Force collection of available resources only
calicoctl cluster diags 2>&1 | tee diags-output.log
```

## Manual Cluster Diagnostic Collection

If the automated command fails, collect manually:

```bash
#!/bin/bash
# manual-cluster-diags.sh

DIAG_DIR="manual-cluster-diags-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DIAG_DIR"

RESOURCES="clusterinformations felixconfigurations bgpconfigurations bgppeers ippools globalnetworkpolicies globalnetworksets hostendpoints nodes"

for RESOURCE in $RESOURCES; do
  echo "Collecting $RESOURCE..."
  calicoctl get "$RESOURCE" -o yaml > "$DIAG_DIR/${RESOURCE}.yaml" 2>/dev/null || echo "  Skipped (not available)"
done

# Collect namespaced policies
echo "Collecting network policies..."
calicoctl get networkpolicies --all-namespaces -o yaml > "$DIAG_DIR/networkpolicies.yaml" 2>/dev/null

# Create bundle
tar czf "${DIAG_DIR}.tar.gz" "$DIAG_DIR"
echo "Manual diagnostics saved to ${DIAG_DIR}.tar.gz"
```

## Verification

After fixing issues:

```bash
# Re-attempt cluster diagnostics
calicoctl cluster diags

# Verify the bundle is complete
tar tzf calico-cluster-diags-*.tar.gz
```

## Troubleshooting

- **Timeout during collection**: Large clusters with many resources may take longer. Ensure there is no network instability between calicoctl and the API server.
- **Empty resource files**: The resource type may exist but have no instances. This is normal.
- **Cannot write output file**: Check disk space and write permissions in the current directory.

## Conclusion

Most `calicoctl cluster diags` errors stem from RBAC permissions or datastore connectivity. By ensuring proper access and having a manual fallback script, you can always gather the cluster-wide diagnostic data needed for effective troubleshooting.

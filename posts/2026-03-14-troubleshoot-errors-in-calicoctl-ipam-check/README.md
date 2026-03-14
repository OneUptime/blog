# Troubleshooting Errors in calicoctl ipam check

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Troubleshooting, Kubernetes

Description: Resolve errors encountered when running calicoctl ipam check and understand how to interpret and act on the issues it reports.

---

## Introduction

The `calicoctl ipam check` command can fail to run (due to connectivity or permission issues) or report issues in the IPAM state that need resolution. This guide covers both types of problems: errors that prevent the check from running and issues the check discovers.

## Prerequisites

- Kubernetes cluster with Calico IPAM
- `calicoctl` with admin access
- Understanding of IPAM concepts

## Errors Running the Check

### Connection Failures

```bash
# Verify datastore access
export DATASTORE_TYPE=kubernetes
calicoctl get nodes

# If using etcd
echo $ETCD_ENDPOINTS
```

### Permission Errors

```yaml
# Required RBAC for ipam check
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: calicoctl-ipam-reader
rules:
- apiGroups: ["crd.projectcalico.org"]
  resources: ["ipamblocks", "ipamhandles", "blockaffinities", "ippools", "nodes"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
```

## Acting on Reported Issues

### Leaked IP Addresses

```bash
# Identify leaked IPs
calicoctl ipam check 2>&1 | grep "leaked"

# For each leaked IP, verify no pod uses it
calicoctl ipam show --ip=<leaked-ip>

# Release leaked IPs
calicoctl ipam release --ip=<leaked-ip>
```

### Orphaned Blocks

```bash
# Identify orphaned blocks
calicoctl ipam check 2>&1 | grep "orphan"

# Check if the node still exists
calicoctl get nodes

# Release all IPs from an orphaned node
calicoctl ipam release --node=<old-node-name>
```

### Block Affinity Issues

```bash
# Check block affinities
calicoctl ipam show --show-blocks

# If blocks are assigned to wrong nodes, this may require
# manual cleanup of block affinity resources
kubectl get blockaffinities.crd.projectcalico.org
```

## Comprehensive Fix Script

```bash
#!/bin/bash
# fix-ipam-issues.sh
# Attempts to automatically fix IPAM issues found by check

echo "Running IPAM check..."
CHECK=$(calicoctl ipam check 2>&1)
echo "$CHECK"

ISSUES=$(echo "$CHECK" | grep -cE "leaked|orphan" || echo 0)
if [ "$ISSUES" -eq 0 ]; then
  echo "No IPAM issues found."
  exit 0
fi

echo ""
echo "Found $ISSUES issues. Attempting cleanup..."

# Get list of valid nodes
VALID_NODES=$(calicoctl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')

# Check for orphaned node blocks
calicoctl ipam show --show-blocks 2>/dev/null | while read -r line; do
  NODE=$(echo "$line" | grep -oP 'node:\s*\K\S+')
  if [ -n "$NODE" ] && ! echo "$VALID_NODES" | grep -q "^${NODE}$"; then
    echo "Releasing IPs from orphaned node: $NODE"
    calicoctl ipam release --node="$NODE" 2>&1
  fi
done

echo ""
echo "Re-running check..."
calicoctl ipam check
```

## Verification

```bash
# Run the fix script
./fix-ipam-issues.sh

# Verify clean state
calicoctl ipam check
calicoctl ipam show
```

## Troubleshooting

- **Cannot release leaked IP**: The IP may still be referenced by an IPAM handle. Check handles with `kubectl get ipamhandles.crd.projectcalico.org`.
- **Orphaned blocks keep returning**: There may be a stale block affinity resource. Check `kubectl get blockaffinities.crd.projectcalico.org`.
- **Check shows inconsistencies but pods work fine**: The issues may be cosmetic. Monitor over time and clean up during maintenance windows.

## Conclusion

`calicoctl ipam check` is both a diagnostic tool and a gateway to remediation. By understanding what issues it reports and how to resolve them, you keep your IPAM state clean and prevent IP exhaustion problems.

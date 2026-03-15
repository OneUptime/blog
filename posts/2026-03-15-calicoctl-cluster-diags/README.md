# How to Use calicoctl cluster diags with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Kubernetes, Diagnostics, Troubleshooting, Networking, DevOps

Description: Learn how to use calicoctl cluster diags to collect diagnostic information from a Calico cluster for troubleshooting.

---

## Introduction

When troubleshooting Calico networking issues in a Kubernetes cluster, collecting diagnostic information from multiple components can be tedious. The `calicoctl cluster diags` command automates this process by gathering logs, configuration, and state from all Calico components into a single diagnostic bundle.

This diagnostic bundle includes node status, BGP peering information, IP pool configurations, workload endpoint details, and Calico component logs. Having all this information in one place significantly speeds up root cause analysis and simplifies communication with support teams.

This guide demonstrates how to use `calicoctl cluster diags` effectively, including filtering options and how to interpret the collected data.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` configured with access to the Calico datastore
- `kubectl` access to the cluster
- Sufficient disk space for diagnostic output

## Collecting Basic Diagnostics

Run the diagnostics collector with:

```bash
calicoctl cluster diags
```

This creates a compressed archive containing diagnostic data from the cluster. The output indicates where the archive is saved:

```
Collecting diagnostics...
  Collecting Calico node status...
  Collecting BGP peer information...
  Collecting IP pool information...
  Collecting workload endpoints...
  Collecting felix configuration...
  Collecting component logs...
Diagnostics saved to: calico-diagnostics-20260315-143022.tar.gz
```

## Examining the Diagnostic Bundle

Extract and examine the contents:

```bash
tar xzf calico-diagnostics-20260315-143022.tar.gz
ls calico-diagnostics-20260315-143022/
```

The bundle typically contains:

```
calico-diagnostics-20260315-143022/
  nodes/
  bgp/
  ipam/
  policies/
  logs/
  config/
```

### Reviewing Node Information

```bash
cat calico-diagnostics-*/nodes/node-status.json | jq '.items[] | {name: .metadata.name, status: .status}'
```

### Checking BGP Peering State

```bash
cat calico-diagnostics-*/bgp/peers.json | jq '.items[] | {node: .metadata.name, peerIP: .spec.peerIP, asNumber: .spec.asNumber}'
```

## Collecting Diagnostics with Log Levels

To include more verbose component logs:

```bash
CALICO_LOG_LEVEL=debug calicoctl cluster diags
```

This collects debug-level logs from Felix, BIRD, and confd, providing deeper visibility into component behavior.

## Filtering Diagnostics by Component

You can focus on specific areas when you already suspect a particular component:

```bash
# Collect only networking diagnostics
calicoctl cluster diags --type=network

# Collect only policy-related diagnostics
calicoctl cluster diags --type=policy
```

## Automating Periodic Diagnostic Collection

Set up a CronJob to collect diagnostics on a schedule:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-diags-collector
  namespace: kube-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: diags
            image: calico/ctl:v3.27.0
            command:
            - /bin/sh
            - -c
            - |
              calicoctl cluster diags
              cp calico-diagnostics-*.tar.gz /diags/
            volumeMounts:
            - name: diags-storage
              mountPath: /diags
          volumes:
          - name: diags-storage
            persistentVolumeClaim:
              claimName: calico-diags-pvc
          restartPolicy: OnFailure
```

## Comparing Diagnostics Over Time

When you have multiple diagnostic bundles, compare them to identify changes:

```bash
# Compare node counts
echo "Bundle 1 nodes:"
cat bundle1/nodes/node-status.json | jq '.items | length'
echo "Bundle 2 nodes:"
cat bundle2/nodes/node-status.json | jq '.items | length'

# Compare IP pool usage
echo "Bundle 1 IPAM:"
cat bundle1/ipam/pools.json | jq '.items[] | {cidr: .spec.cidr}'
echo "Bundle 2 IPAM:"
cat bundle2/ipam/pools.json | jq '.items[] | {cidr: .spec.cidr}'
```

## Verification

Verify the diagnostic bundle is complete and readable:

```bash
tar tzf calico-diagnostics-*.tar.gz | head -20
tar tzf calico-diagnostics-*.tar.gz | wc -l
```

A complete bundle should contain files across all diagnostic categories.

## Troubleshooting

- **Permission denied**: Ensure `calicoctl` has the correct RBAC permissions or datastore credentials configured.
- **Empty diagnostic sections**: Some components may not be running. Check that all Calico pods are healthy with `kubectl get pods -n calico-system`.
- **Large bundle size**: If the bundle is very large, it may include excessive logs. Reduce the log collection window or filter by component type.
- **Timeout during collection**: In large clusters, diagnostic collection can take time. Increase any client-side timeouts if the process is interrupted.

## Conclusion

The `calicoctl cluster diags` command simplifies the process of collecting comprehensive diagnostic information from a Calico cluster. By automating diagnostic collection and maintaining historical bundles, you can quickly identify issues and track changes in cluster networking state over time. This is especially valuable when working with support teams who need a complete picture of the cluster configuration and state.

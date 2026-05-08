# How to Use calicoctl cluster diags with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Kubernetes, Diagnostic, Troubleshooting, Networking, DevOps

Description: Learn how to use calicoctl cluster diags to collect diagnostic information from a Calico cluster for troubleshooting.

---

## Introduction

When troubleshooting Calico networking issues in a Kubernetes cluster, collecting diagnostic information from multiple components can be tedious. The `calicoctl cluster diags` command automates this process by gathering logs, configuration, and state from all Calico components into a single diagnostic bundle.

This diagnostic bundle includes Kubernetes resources, Calico custom resources, Calico and Tigera namespace state, Calico component logs, pod descriptions, and dataplane diagnostics from Calico nodes. Having all this information in one place significantly speeds up root cause analysis and simplifies communication with support teams.

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

```text
==== Begin collecting diagnostics. ====
Created temporary directory: /tmp/123456789
Collecting kubernetes version...
Collecting core kubernetes resources...
Collecting detailed diags for namespace calico-system...
Collecting detailed diags for pod calico-node-abcde in namespace calico-system on node node1...
Collecting dataplane diags for calico-node: calico-node-abcde

==== Producing a diagnostics bundle. ====
Diagnostic bundle created at ./calico-diagnostics-20260315_143022.tar.gz
```

## Examining the Diagnostic Bundle

Extract and examine the contents:

```bash
tar xzf calico-diagnostics-20260315_143022.tar.gz
ls calico-diagnostics-20260315_143022/
```

The bundle typically contains:

```text
calico-diagnostics-20260315_143022/
  cluster/
  links/
  nodes/
  tls/
```

### Reviewing Node Information

```bash
cat calico-diagnostics-*/cluster/kubernetes/nodes.txt
```

### Reviewing BGP Peer Configuration

```bash
cat calico-diagnostics-*/cluster/crd/bgppeers.crd.projectcalico.org.txt
```

## Collecting Diagnostics After Increasing Log Levels

The diagnostics command collects logs that already exist in the cluster. To include more verbose Felix logs, increase the Felix log level before collecting diagnostics:

```bash
kubectl get felixconfig -o yaml > felixconfig.yaml
# Edit logSeverityScreen to Debug, then apply the updated resource.
kubectl replace -f felixconfig.yaml
calicoctl cluster diags
```

For BGP agent logs, update the `logSeverityScreen` field on the BGP configuration instead. Debug logging can be verbose, so return the setting to its previous value after collecting the bundle.

## Filtering Diagnostics by Scope

You can focus diagnostic collection using available options:

```bash
# Collect diagnostics from the last hour only

calicoctl cluster diags --since=1h

# Focus on specific nodes and limit log collection
calicoctl cluster diags --focus-nodes=node1,node2 --max-logs=3
```

## Automating Periodic Diagnostic Collection

After creating a PVC and granting the job's service account the required cluster-wide read permissions, set up a CronJob to collect diagnostics on a schedule:

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
          serviceAccountName: calico-diags-collector
          containers:
          - name: diags
            image: calico/ctl:v3.32.0
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
tail -n +2 bundle1/cluster/kubernetes/nodes.txt | wc -l
echo "Bundle 2 nodes:"
tail -n +2 bundle2/cluster/kubernetes/nodes.txt | wc -l

# Compare IP pool usage
echo "Bundle 1 IPAM:"
cat bundle1/cluster/crd/ippools.crd.projectcalico.org.txt
echo "Bundle 2 IPAM:"
cat bundle2/cluster/crd/ippools.crd.projectcalico.org.txt
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
- **Empty diagnostic sections**: Some components may not be running. Check that all Calico pods are healthy with `kubectl get pods -n calico-system` for operator-managed installs, or `kubectl get pods -n kube-system` for manifest-based installs.
- **Large bundle size**: If the bundle is very large, it may include excessive logs. Reduce the log collection window or filter by component type.
- **Timeout during collection**: In large clusters, diagnostic collection can take time. Increase any client-side timeouts if the process is interrupted.

## Conclusion

The `calicoctl cluster diags` command simplifies the process of collecting comprehensive diagnostic information from a Calico cluster. By automating diagnostic collection and maintaining historical bundles, you can quickly identify issues and track changes in cluster networking state over time. This is especially valuable when working with support teams who need a complete picture of the cluster configuration and state.

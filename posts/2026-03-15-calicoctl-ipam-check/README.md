# How to Use calicoctl ipam check with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Kubernetes, Networking, Troubleshooting, IP Address Management

Description: Learn how to use calicoctl ipam check to validate IPAM data consistency and identify leaked or orphaned IP addresses.

---

## Introduction

Over time, Calico IPAM data can become inconsistent due to node failures, interrupted pod deletions, or datastore issues. The `calicoctl ipam check` command validates the consistency of IPAM allocations against the actual state of workloads in the cluster.

This command identifies orphaned IP allocations where an IP is marked as allocated but no corresponding workload exists, as well as missing allocations where a workload has an IP that IPAM does not track. Detecting and resolving these inconsistencies prevents IP address leaks and potential address conflicts.

This guide demonstrates how to use `calicoctl ipam check` to audit your cluster IPAM state and resolve issues.

## Prerequisites

- Kubernetes cluster with Calico IPAM
- `calicoctl` configured with datastore access
- `kubectl` access to the cluster
- Sufficient permissions to read IPAM and workload data

## Running a Basic IPAM Check

Run the consistency check:

```bash
calicoctl ipam check
```

A clean cluster produces output like:

```text
Checking IPAM data consistency...
  Checking allocations against workload endpoints...
  Checking for orphaned allocations...
  Checking for missing allocations...
  Checking block affinity consistency...

Found 0 inconsistencies.
IPAM data is consistent.
```

## Interpreting Inconsistency Reports

When issues are found, the output details each inconsistency:

```text
Checking IPAM data consistency...
  Checking allocations against workload endpoints...
  Checking for orphaned allocations...
    WARNING: IP 10.244.1.15 allocated to non-existent workload default/old-pod
    WARNING: IP 10.244.2.23 allocated to non-existent workload kube-system/deleted-ds-xyz
  Checking for missing allocations...
  Checking block affinity consistency...
    WARNING: Block 10.244.3.0/26 affine to non-existent node worker-old

Found 3 inconsistencies.
```

### Types of Inconsistencies

- **Orphaned allocations**: IPs allocated to workloads that no longer exist. These are the most common issue.
- **Missing allocations**: Workloads with IPs that are not tracked by IPAM. This is rare but can happen during datastore recovery.
- **Block affinity issues**: IP blocks assigned to nodes that have been removed from the cluster.

## Saving Check Results to a File

For audit purposes or to process results programmatically, use the `-o` flag to specify an output report file:

```bash
calicoctl ipam check -o ipam-check-results.json
```

You can also show specific IP details:

```bash
# Show all IPs that are checked
calicoctl ipam check --show-all-ips

# Show only problem IPs (leaked or improperly allocated)
calicoctl ipam check --show-problem-ips
```

## Running Periodic IPAM Checks

Create a CronJob to check IPAM consistency on a schedule:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-ipam-check
  namespace: kube-system
spec:
  schedule: "0 8 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: ipam-check
            image: calico/ctl:v3.27.0
            command:
            - /bin/sh
            - -c
            - |
              RESULT=$(calicoctl ipam check 2>&1)
              echo "$RESULT"
              if echo "$RESULT" | grep -q "inconsistencies"; then
                echo "ALERT: IPAM inconsistencies detected"
              fi
          restartPolicy: OnFailure
```

## Resolving Orphaned Allocations

After identifying orphaned IPs with `calicoctl ipam check`, release them:

```bash
# First identify orphaned IPs
calicoctl ipam check 2>&1 | grep "orphaned" | awk '{print $3}'

# Release each orphaned IP
calicoctl ipam release --ip=10.244.1.15
calicoctl ipam release --ip=10.244.2.23
```

## Scripting a Full Audit

Combine the check with other IPAM commands for a complete audit:

```bash
#!/bin/bash
echo "=== IPAM Consistency Check ==="
calicoctl ipam check

echo ""
echo "=== IPAM Usage Summary ==="
calicoctl ipam show

echo ""
echo "=== Active Workload Endpoints ==="
calicoctl get workloadendpoints -A --no-headers | wc -l

echo ""
echo "=== Node Count ==="
kubectl get nodes --no-headers | wc -l
```

## Verification

After resolving any reported issues, re-run the check:

```bash
calicoctl ipam check
```

The output should report zero inconsistencies. Also verify that no running pods lost connectivity:

```bash
kubectl get pods -A | grep -v Running | grep -v Completed
```

## Troubleshooting

- **Check takes a long time**: In large clusters, the consistency check must compare all allocations against all workload endpoints. This is normal for clusters with thousands of pods.
- **False positives during scaling**: If pods are being created or destroyed while the check runs, you may see temporary inconsistencies. Run the check during a quiet period.
- **Datastore connection errors**: Ensure `calicoctl` can reach the datastore. Check the `DATASTORE_TYPE` and connection environment variables.
- **Persistent orphaned allocations**: If orphaned IPs reappear after release, investigate whether a controller is creating and immediately deleting pods.

## Conclusion

Regular use of `calicoctl ipam check` helps maintain a healthy IPAM state in your Calico cluster. By identifying and resolving orphaned allocations and block affinity issues, you prevent IP address leaks that could eventually lead to address exhaustion. Incorporating this check into your operational routine provides early warning of IPAM inconsistencies before they impact workloads.

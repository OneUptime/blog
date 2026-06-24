# How to Use calicoctl ipam check with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Kubernetes, Networking, Troubleshooting, IP Address Management

Description: Learn how to use calicoctl ipam check to validate IPAM data consistency and identify leaked or orphaned IP addresses.

---

## Introduction

Over time, Calico IPAM data can become inconsistent due to node failures, interrupted pod deletions, or datastore issues. The `calicoctl ipam check` command validates the consistency of IPAM allocations against the actual state of workloads in the cluster.

This command identifies leaked IP allocations where an IP is marked as allocated but no corresponding workload or node tunnel address is using it, as well as in-use addresses that IPAM does not track. Detecting and resolving these inconsistencies prevents IP address leaks and potential address conflicts.

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
Checking IPAM for inconsistencies...

Loading all IPAM blocks...
Found 12 IPAM blocks.
IPAM blocks record 245 allocations.

Loading all IPAM pools...
  10.244.0.0/16
Found 1 active IP pools.

Loading all nodes.
Found 3 node tunnel IPs.

Loading all workload endpoints.
Found 242 workload IPs.
Workloads and nodes are using 245 IPs.

Loading all handles
Looking for top (up to 20) nodes by allocations...

Scanning for IPs that are allocated but not actually in use...
Found 0 IPs that are allocated in IPAM but not actually in use.
Scanning for IPs that are in use by a workload or node but not allocated in IPAM...
Found 0 in-use IPs that are not in active IP pools.
Found 0 in-use IPs that are in active IP pools but have no corresponding IPAM allocation.

Scanning for IPAM handles with no matching IPs...
Found 0 handles with no matching IPs (and 245 handles with matches).
Scanning for IPs with missing handle...
Found 0 handles mentioned in blocks with no matching handle resource.
Check complete; found 0 problems.
```

## Interpreting Inconsistency Reports

When issues are found, the output details each inconsistency:

```text
Checking IPAM for inconsistencies...

Scanning for IPs that are allocated but not actually in use...
  10.244.1.15 leaked; attrs handle="k8s-pod-network.default.old-pod" secondary={namespace=default,node=worker-1,pod=old-pod}
  10.244.2.23 leaked; attrs handle="k8s-pod-network.kube-system.deleted-ds-xyz" secondary={namespace=kube-system,node=worker-2,pod=deleted-ds-xyz}
Found 2 IPs that are allocated in IPAM but not actually in use.
Scanning for IPs that are in use by a workload or node but not allocated in IPAM...
Found 0 in-use IPs that are not in active IP pools.
Found 0 in-use IPs that are in active IP pools but have no corresponding IPAM allocation.

Scanning for IPAM handles with no matching IPs...
Found 1 handles with no matching IPs (and 244 handles with matches).
Scanning for IPs with missing handle...
Found 0 handles mentioned in blocks with no matching handle resource.
Check complete; found 3 problems.
```

### Types of Inconsistencies

- **Leaked allocations**: IPs allocated in IPAM that are not actually in use by a workload or node tunnel address. These are the most common issue.
- **Missing allocations**: Workloads or node tunnel addresses with IPs that are not tracked by IPAM. This is rare but can happen during datastore recovery.
- **Leaked handles**: IPAM handle records that no longer have matching active IPs.

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
            # Use the calicoctl image version that matches your Calico cluster.
            image: calico/ctl:v3.27.0
            env:
            - name: DATASTORE_TYPE
              value: kubernetes
            command:
            - /bin/sh
            - -c
            - |
              RESULT=$(calicoctl ipam check 2>&1)
              echo "$RESULT"
              if ! echo "$RESULT" | grep -q "Check complete; found 0 problems."; then
                echo "ALERT: IPAM inconsistencies detected"
                exit 1
              fi
          restartPolicy: OnFailure
```

## Resolving Leaked Allocations

After identifying leaked IPs with `calicoctl ipam check`, release them:

```bash
# Generate a report of leaked addresses
calicoctl ipam check --show-problem-ips -o ipam-check-results.json

# Release leaked addresses from the report
calicoctl ipam release --from-report=ipam-check-results.json
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
calicoctl get workloadendpoints -A | tail -n +2 | wc -l

echo ""
echo "=== Node Count ==="
kubectl get nodes --no-headers | wc -l
```

## Verification

After resolving any reported issues, re-run the check:

```bash
calicoctl ipam check
```

The output should report zero problems. Also verify that no running pods lost connectivity:

```bash
kubectl get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded
```

## Troubleshooting

- **Check takes a long time**: In large clusters, the consistency check must compare all allocations against all workload endpoints. This is normal for clusters with thousands of pods.
- **False positives during scaling**: If pods are being created or destroyed while the check runs, you may see temporary inconsistencies. Run the check during a quiet period.
- **Datastore connection errors**: Ensure `calicoctl` can reach the datastore. Check the `DATASTORE_TYPE` and connection environment variables.
- **Persistent leaked allocations**: If leaked IPs reappear after release, investigate whether a controller is creating and immediately deleting pods.

## Conclusion

Regular use of `calicoctl ipam check` helps maintain a healthy IPAM state in your Calico cluster. By identifying and resolving leaked allocations and stale IPAM handles, you prevent IP address leaks that could eventually lead to address exhaustion. Incorporating this check into your operational routine provides early warning of IPAM inconsistencies before they impact workloads.

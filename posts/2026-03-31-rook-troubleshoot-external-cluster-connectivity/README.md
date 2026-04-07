# How to Troubleshoot External Cluster Connectivity in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, External Cluster, Troubleshooting, Connectivity

Description: Learn how to diagnose and fix connectivity issues between a Rook consumer cluster and an external Ceph provider cluster using logs, secrets, and direct tests.

---

## Overview

When Rook runs in external cluster mode, connectivity between the consumer Kubernetes cluster and the Ceph provider can fail due to network issues, incorrect secrets, stale monitor endpoints, or permission mismatches. This guide covers a systematic approach to diagnosing and resolving these connectivity problems.

## Step 1 - Check CephCluster Status

Start with the CephCluster resource status in the consumer cluster:

```bash
kubectl -n rook-ceph-external get cephcluster
kubectl -n rook-ceph-external describe cephcluster rook-ceph-external
```

Look for the `status.phase` and `status.message` fields. Common states:

```text
Connecting  - attempting to reach provider monitors
Connected   - healthy connection
Error       - connection failed, check message for details
```

## Step 2 - Inspect Rook Operator Logs

The operator logs contain detailed connection error messages:

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-operator --tail=100 | grep -i "external\|error\|failed"
```

Common errors include:

```text
failed to connect to mon: connection refused
RADOS: error connecting to the cluster
keyring authentication failure
```

## Step 3 - Verify Monitor Endpoints

Check that the ConfigMap contains correct, reachable monitor addresses:

```bash
kubectl -n rook-ceph-external get configmap rook-ceph-mon-endpoints -o yaml
```

Test connectivity to each monitor from inside the cluster:

```bash
kubectl -n rook-ceph-external run net-test --image=busybox --restart=Never -- \
  nc -zv 192.168.1.1 6789
kubectl -n rook-ceph-external logs net-test
kubectl -n rook-ceph-external delete pod net-test
```

## Step 4 - Verify Secrets Exist and Are Correct

List all secrets in the external namespace:

```bash
kubectl -n rook-ceph-external get secrets
```

Decode and inspect a secret to verify it has the expected structure:

```bash
kubectl -n rook-ceph-external get secret rook-ceph-mon -o jsonpath='{.data.ceph-secret}' | base64 -d
```

Compare the decoded keyring value against the provider cluster:

```bash
# On the provider cluster
ceph auth get client.healthchecker
```

## Step 5 - Test CSI Driver Connectivity

CSI provisioner pods also need direct access to Ceph monitors. Check CSI logs:

```bash
kubectl -n rook-ceph logs -l app=csi-rbdplugin-provisioner -c csi-provisioner --tail=50
kubectl -n rook-ceph logs -l app=csi-rbdplugin --tail=50
```

## Step 6 - Verify Firewall Rules

Ensure that the Kubernetes nodes running the Rook operator and CSI drivers can reach the Ceph monitor ports (default 6789 for v1 protocol, 3300 for msgr2):

```bash
# Test msgr2 port
kubectl run net-test2 --image=busybox --restart=Never -- \
  nc -zv 192.168.1.1 3300
kubectl logs net-test2
kubectl delete pod net-test2
```

## Step 7 - Re-run the Export Script

If credentials have drifted, re-generate them from the provider and reapply:

```bash
# On provider cluster
python3 create-external-cluster-resources.py \
  --rbd-data-pool-name replicapool \
  --namespace rook-ceph-external \
  --format bash > fresh-config.sh

# On consumer cluster
bash fresh-config.sh
kubectl -n rook-ceph rollout restart deployment/rook-ceph-operator
```

## Summary

Troubleshooting Rook external cluster connectivity follows a layered approach: start with the CephCluster status, then check operator logs, verify monitor endpoints in the ConfigMap, decode and compare secrets, test network reachability to monitor ports, and finally re-export credentials if all else fails. Most connectivity issues fall into one of three categories: stale monitor addresses, rotated keyrings not synced to the consumer, or firewall rules blocking Ceph monitor ports.

# How to Test Failover in Rook Stretch Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Stretch Cluster, Failover, Disaster Recovery

Description: Learn how to safely test site failover in Rook-Ceph stretch clusters by simulating zone loss and verifying I/O continuity on the surviving site.

---

## Overview

Testing failover in a Rook-Ceph stretch cluster validates that your deployment can survive the loss of an entire data center zone while continuing to serve I/O. This kind of test should be performed regularly in non-production environments before relying on the stretch setup for critical workloads. This guide walks through a controlled failover test procedure.

## Prerequisites

Before testing failover, confirm your stretch cluster is healthy:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph quorum_status -f json-pretty
```

All OSDs should be `up` and `in`, and monitors should show full quorum across all three zones.

## Step 1 - Deploy a Test Workload

Create a PVC and a test pod writing data before simulating the failure:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: stretch-test-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: rook-ceph-stretch-block
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fio-test
spec:
  containers:
  - name: fio
    image: nixery.dev/shell/fio
    command:
    - fio
    - --name=write
    - --ioengine=libaio
    - --rw=write
    - --bs=4k
    - --numjobs=1
    - --size=1G
    - --filename=/data/test.dat
    - --runtime=3600
    - --time_based
    volumeMounts:
    - name: stretch-data
      mountPath: /data
  volumes:
  - name: stretch-data
    persistentVolumeClaim:
      claimName: stretch-test-pvc
```

```bash
kubectl apply -f stretch-test-pvc.yaml
kubectl apply -f fio-test-pod.yaml
```

## Step 2 - Simulate Zone A Loss

Cordon and drain all nodes in zone A to simulate a site outage:

```bash
# Get nodes in zone-a
kubectl get nodes -l topology.kubernetes.io/zone=zone-a

# Cordon all zone-a nodes
for node in $(kubectl get nodes -l topology.kubernetes.io/zone=zone-a -o name); do
  kubectl cordon $node
done

# Stop kubelet on zone-a nodes to simulate full isolation
for node in $(kubectl get nodes -l topology.kubernetes.io/zone=zone-a -o jsonpath='{.items[*].metadata.name}'); do
  ssh $node sudo systemctl stop kubelet
done
```

## Step 3 - Observe Cluster Behavior

Watch the cluster react to the zone loss:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -w
```

You should see monitors from zone-a go offline, OSDs from zone-a marked down, then the surviving monitors (zone-b + tiebreaker) form quorum. After `mon_osd_down_out_interval` seconds, OSDs are marked `out` and recovery starts.

Check that I/O continues on zone-b:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool stats
```

## Step 4 - Verify Application Continuity

Check the test workload survived the failover:

```bash
kubectl get pod fio-test
kubectl logs fio-test --tail=20
```

If the pod was scheduled on zone-a nodes, it will be evicted and rescheduled on zone-b. PVCs using the stretch pool should remount successfully on zone-b nodes.

## Step 5 - Restore Zone A

Bring zone-a nodes back and watch the cluster recover:

```bash
for node in $(kubectl get nodes -l topology.kubernetes.io/zone=zone-a -o jsonpath='{.items[*].metadata.name}'); do
  ssh $node sudo systemctl start kubelet
  kubectl uncordon $node
done
```

Monitor recovery:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -w
```

The cluster should return to `HEALTH_OK` once all placement groups are active and clean.

## Summary

Testing failover in Rook stretch clusters involves draining a zone, observing that the tiebreaker arbiter grants quorum to the surviving site, and verifying I/O continues uninterrupted. Always run these tests before relying on stretch mode for production workloads. Document the time to quorum recovery and PG recovery completion to establish baseline SLA expectations for your deployment.

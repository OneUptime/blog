# How to Configure Ceph for GPU Cluster Data Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, GPU, Storage, Machine Learning, Kubernetes

Description: Configure Rook-Ceph storage topology and performance settings for GPU cluster environments to prevent storage from becoming an ML training bottleneck.

---

## Overview

GPU clusters can process data faster than traditional storage systems can deliver it. Ceph must be configured to match GPU throughput requirements - typically 10-100+ GB/s aggregate - through RDMA, striping, and cache tuning.

## Assess GPU Cluster Storage Requirements

Calculate required storage throughput per GPU:

```bash
# For A100 GPUs with NVLink, per-GPU memory bandwidth is ~2TB/s internally
# Estimate data loading bottleneck:
# num_gpus * batch_size * sample_size / training_step_time = required_storage_bandwidth

# Example: 8x A100, 32 samples/step, 10MB/sample, 0.5s/step
# = 8 * 32 * 10MB / 0.5s = 5.12 GB/s required
```

## Storage Network Topology

Place Ceph OSDs on nodes with high-bandwidth network interfaces:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  network:
    provider: host
  storage:
    useAllNodes: false
    nodes:
      - name: "storage-node-1"
        devices:
          - name: "nvme0n1"
          - name: "nvme1n1"
```

Configure Ceph to bind to specific 100GbE subnets:

```bash
# Set public and cluster networks to match your 100GbE interface subnets
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set global public_network 10.100.0.0/24

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set global cluster_network 10.200.0.0/24
```

## Create a High-Performance Pool

```bash
# Create an SSD-backed pool for GPU training data
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd pool create gpu-training-data 256 256

# Assign to SSD device class
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd pool set gpu-training-data crush_rule ssd-rule

# Enable pg_autoscaler
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd pool set gpu-training-data pg_autoscale_mode on
```

## Tune for High Concurrency

GPU training jobs may have hundreds of data loader workers per node:

```bash
# Increase OSD op threads
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_num_shards 16

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_num_threads_per_shard 2

# Increase client cache
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set client objecter_inflight_ops 32768
```

## Pin GPU Nodes as Preferred Clients

Use Ceph client configurations per GPU node:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set client.gpu-node-1 rbd_cache true

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set client.gpu-node-1 rbd_cache_size 536870912
```

## Deploy Data Pre-loading Job

Pre-load training data to CephFS before training starts:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: dataset-preloader
spec:
  template:
    spec:
      nodeSelector:
        gpu: "true"
      restartPolicy: Never
      containers:
        - name: preloader
          image: python:3.11
          command: ["python", "preload_dataset.py", "--source=s3://raw-data", "--dest=/mnt/cache"]
          volumeMounts:
            - name: training-cache
              mountPath: /mnt/cache
      volumes:
        - name: training-cache
          persistentVolumeClaim:
            claimName: training-cache-rwx
```

## Summary

Configuring Ceph for GPU cluster storage requires matching network bandwidth to GPU throughput requirements, dedicating NVMe OSDs with high-bandwidth network interfaces, tuning OSD thread counts for high concurrency, and pre-loading datasets to avoid GPU idle time during training. Proper topology configuration ensures storage does not bottleneck GPU utilization.

# How to Set Up CephFS for Shared Model Checkpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Checkpoint, Machine Learning, Distributed Training

Description: Configure CephFS as shared checkpoint storage for distributed ML training, enabling all workers to write and read model checkpoints with consistent access.

---

## Overview

Distributed ML training with multiple GPU workers requires a shared checkpoint location where any worker can save or resume training. CephFS with ReadWriteMany access provides a POSIX-compatible checkpoint directory accessible from all training pods.

## Create a Dedicated Checkpoint Filesystem

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: ml-checkpoints
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
    - name: data
      replicated:
        size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
```

Create a StorageClass and PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: model-checkpoints
  namespace: ml-training
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: rook-cephfs
  resources:
    requests:
      storage: 500Gi
```

## Checkpoint Writing Strategy in PyTorch

Use rank 0 to write checkpoints to avoid conflicts:

```python
import torch
import torch.distributed as dist
import os

def save_checkpoint(model, optimizer, epoch, checkpoint_dir):
    """Save checkpoint - only rank 0 writes to avoid conflicts."""
    if dist.get_rank() == 0:
        checkpoint_path = os.path.join(
            checkpoint_dir,
            f"checkpoint_epoch_{epoch:04d}.pt"
        )
        torch.save({
            'epoch': epoch,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
        }, checkpoint_path)
        print(f"Checkpoint saved to {checkpoint_path}")

    # Barrier ensures all ranks wait for the checkpoint to complete
    dist.barrier()

def load_latest_checkpoint(model, optimizer, checkpoint_dir):
    """Find and load the latest checkpoint."""
    checkpoints = sorted(os.listdir(checkpoint_dir))
    if not checkpoints:
        return 0
    latest = os.path.join(checkpoint_dir, checkpoints[-1])
    checkpoint = torch.load(latest, map_location='cpu')
    model.load_state_dict(checkpoint['model_state_dict'])
    optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
    return checkpoint['epoch']
```

## Mount Checkpoints in Training Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: distributed-training
spec:
  completions: 4
  parallelism: 4
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: trainer
          image: pytorch/pytorch:2.1.0-cuda11.8-cudnn8-runtime
          env:
            - name: CHECKPOINT_DIR
              value: /mnt/checkpoints
          volumeMounts:
            - name: checkpoints
              mountPath: /mnt/checkpoints
      volumes:
        - name: checkpoints
          persistentVolumeClaim:
            claimName: model-checkpoints
```

## Implement Checkpoint Rotation

```bash
#!/bin/bash
CHECKPOINT_DIR="/mnt/checkpoints"
KEEP_LAST=5

# List checkpoints sorted by modification time, delete oldest
ls -t $CHECKPOINT_DIR/checkpoint_epoch_*.pt | \
  tail -n +$((KEEP_LAST + 1)) | \
  xargs -r rm -v
```

Run as a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: checkpoint-rotation
spec:
  schedule: "0 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: rotator
              image: alpine
              command: ["/bin/sh", "/scripts/rotate-checkpoints.sh"]
              volumeMounts:
                - name: checkpoints
                  mountPath: /mnt/checkpoints
          volumes:
            - name: checkpoints
              persistentVolumeClaim:
                claimName: model-checkpoints
```

## Summary

CephFS provides an ideal shared checkpoint backend for distributed ML training. Using ReadWriteMany PVCs, all training workers can access the same checkpoint directory with POSIX semantics. Designating rank 0 as the checkpoint writer and adding a barrier prevents race conditions, while scheduled rotation jobs manage storage consumption.

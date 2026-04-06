# How to Set Up Rook-Ceph for Machine Learning Training Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Machine Learning, AI, Storage, Kubernetes

Description: Learn how to configure Rook-Ceph as the storage backend for machine learning training datasets, model artifacts, and experiment tracking on Kubernetes.

---

Machine learning workloads on Kubernetes require storage for large datasets, model checkpoints, and experiment artifacts. Rook-Ceph provides the scalability and flexibility to handle terabytes of training data with both shared filesystem access and S3-compatible object storage.

## ML Storage Requirements

Different ML pipeline stages have distinct storage needs:

- **Raw datasets** - Large files (images, audio, video), S3-compatible object storage via RGW
- **Processed features** - Shared filesystem access for concurrent training pods
- **Model checkpoints** - Block storage or S3 for frequent writes
- **Final models** - Object storage for versioning and distribution
- **Experiment metadata** - Block storage for MLflow or similar tools

## Setting Up Object Storage for Datasets

Store large training datasets in Ceph RGW:

```bash
# Create a dataset bucket
aws s3 mb s3://ml-datasets \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local:80

# Upload dataset from local machine
aws s3 sync ./imagenet-subset/ s3://ml-datasets/imagenet/ \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local \
  --storage-class STANDARD
```

## CephFS for Shared Training Data Access

When multiple training pods read the same dataset simultaneously, CephFS allows ReadWriteMany access:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: training-data
  namespace: ml
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: rook-cephfs
  resources:
    requests:
      storage: 2Ti
```

## Training Job with Shared Data Access

Configure a PyTorch distributed training job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pytorch-training
  namespace: ml
spec:
  completions: 4
  parallelism: 4
  template:
    spec:
      containers:
        - name: trainer
          image: pytorch/pytorch:2.2-cuda12.1-cudnn8-devel
          command: ["python", "train.py", "--data-dir=/data/imagenet"]
          volumeMounts:
            - name: training-data
              mountPath: /data
              readOnly: true
            - name: checkpoints
              mountPath: /checkpoints
          resources:
            limits:
              nvidia.com/gpu: "1"
      volumes:
        - name: training-data
          persistentVolumeClaim:
            claimName: training-data
        - name: checkpoints
          persistentVolumeClaim:
            claimName: model-checkpoints
```

## MLflow with Rook Storage

Deploy MLflow backed by Ceph storage for experiment tracking:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mlflow
  namespace: ml
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: mlflow
          image: ghcr.io/mlflow/mlflow:v2.12.1
          args:
            - mlflow
            - server
            - --backend-store-uri=postgresql://mlflow:mlflow@postgres/mlflow
            - --default-artifact-root=s3://mlflow-artifacts
            - --host=0.0.0.0
          env:
            - name: MLFLOW_S3_ENDPOINT_URL
              value: http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: mlflow-s3-creds
                  key: accessKey
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: mlflow-s3-creds
                  key: secretKey
```

## Optimizing Ceph for Large Sequential Reads

Training workloads tend to read data sequentially. Tune the pool for this access pattern:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set ml-data-pool rbd_cache_max_dirty_age 5

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global rbd_readahead_max_bytes 10485760
```

## Summary

Rook-Ceph supports ML workloads through RGW (S3-compatible datasets and model storage), CephFS (shared ReadWriteMany access for concurrent training pods), and RBD (low-latency block storage for checkpoints). MLflow and other experiment tracking tools connect to Ceph RGW via standard S3 APIs. Tuning readahead settings improves throughput for the sequential read patterns typical in training data pipelines.

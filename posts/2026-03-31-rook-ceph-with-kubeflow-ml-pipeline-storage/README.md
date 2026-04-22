# How to Use Ceph with Kubeflow for ML Pipeline Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubeflow, Machine Learning, Pipeline, Storage

Description: Integrate Rook-Ceph with Kubeflow Pipelines for persistent artifact storage, enabling reproducible ML experiments with versioned datasets and models.

---

## Overview

Kubeflow Pipelines store artifacts, metrics, and model outputs in MinIO by default. You can replace MinIO with Ceph RGW to gain enterprise storage features, larger capacity, and CRUSH-based data placement for your ML pipelines.

## Replace MinIO with Ceph RGW

First, create a Ceph RGW object store and user:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin user create --uid=kubeflow --display-name="Kubeflow Pipelines"

# Save credentials
KF_ACCESS_KEY=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin user info --uid=kubeflow | \
  python3 -c "import sys,json; u=json.load(sys.stdin); print(u['keys'][0]['access_key'])")

KF_SECRET_KEY=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin user info --uid=kubeflow | \
  python3 -c "import sys,json; u=json.load(sys.stdin); print(u['keys'][0]['secret_key'])")
```

## Create Kubeflow Buckets

```bash
export AWS_ENDPOINT_URL=http://rook-ceph-rgw-my-store.rook-ceph.svc
export AWS_ACCESS_KEY_ID=$KF_ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=$KF_SECRET_KEY

aws s3 mb s3://mlpipeline --endpoint-url $AWS_ENDPOINT_URL
aws s3 mb s3://mlpipeline-metrics --endpoint-url $AWS_ENDPOINT_URL
```

## Configure Kubeflow to Use Ceph

Update the Kubeflow pipeline secret with Ceph credentials:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mlpipeline-minio-artifact
  namespace: kubeflow
type: Opaque
stringData:
  accesskey: "<KF_ACCESS_KEY>"
  secretkey: "<KF_SECRET_KEY>"
```

Update the MinIO service to point to Ceph RGW:

```yaml
# ExternalName only creates a DNS CNAME alias - it does not proxy or remap ports.
# Ensure the CephObjectStore gateway port matches what Kubeflow expects (default 9000).
apiVersion: v1
kind: Service
metadata:
  name: minio-service
  namespace: kubeflow
spec:
  type: ExternalName
  externalName: rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local
```

## Configure Pipeline Component Storage

In your Kubeflow pipeline components, use the S3 artifact store:

```python
from kfp import dsl

@dsl.component
def train_model(
    dataset_path: str,
    model_output: dsl.Output[dsl.Model]
):
    import torch
    import boto3
    # Training code here
    torch.save(model.state_dict(), model_output.path)

@dsl.pipeline(name="ML Training Pipeline")
def ml_pipeline():
    train_op = train_model(dataset_path="s3://mlpipeline/datasets/train/")
    train_op.set_env_variable("S3_ENDPOINT", "http://rook-ceph-rgw-my-store.rook-ceph.svc")
```

## Monitor Pipeline Storage Usage

```bash
# Check bucket usage
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin bucket stats --bucket=mlpipeline

# Check user quota
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  radosgw-admin quota get --quota-scope=user --uid=kubeflow
```

## Summary

Integrating Rook-Ceph with Kubeflow Pipelines replaces the default MinIO artifact store with a scalable, enterprise-grade object storage backend. By pointing the MinIO service endpoint to Ceph RGW and providing matching S3 credentials, all pipeline artifacts, metrics, and model outputs are stored in Ceph with full CRUSH-based data placement and replication.

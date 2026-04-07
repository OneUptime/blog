# How to Configure Rook-Ceph for Serverless Function Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Serverless, Knative, Function, Storage, Kubernetes

Description: Learn how to configure Rook-Ceph to provide persistent and object storage for serverless function platforms like Knative, OpenFaaS, and Fission on Kubernetes.

---

Serverless function platforms on Kubernetes need storage for function artifacts, shared state, and event data. Rook-Ceph's S3-compatible object storage and shared filesystem capabilities integrate naturally with serverless runtimes.

## Storage Needs for Serverless Workloads

Serverless functions are ephemeral by nature, but often require:
- **Function artifact storage** - Storing compiled function packages
- **Shared state** - Data accessible across function invocations
- **Event processing storage** - Checkpoints for stream processing
- **Configuration and secrets** - Injected via volume or S3

## Setting Up Object Storage for Function Artifacts

Create a bucket for storing function code:

```bash
# Create a user for the serverless platform
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
    --uid=serverless \
    --display-name="Serverless Functions" \
    --access-key=fn-access-key \
    --secret-key=fn-secret-key

# Create buckets via S3 API
aws s3 mb s3://function-artifacts \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80

aws s3 mb s3://function-state \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Knative with Ceph Storage

Configure Knative to pull function images stored in a Ceph-backed registry:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: my-function
  namespace: functions
spec:
  template:
    spec:
      containers:
        - image: my-registry.example.com/functions/myfunction:v1
          env:
            - name: S3_ENDPOINT
              value: http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local
            - name: S3_BUCKET
              value: function-state
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: ceph-s3-creds
                  key: accessKey
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: ceph-s3-creds
                  key: secretKey
```

## OpenFaaS with CephFS Shared Storage

For functions needing persistent shared state, use a CephFS volume:

```yaml
apiVersion: openfaas.com/v1
kind: Function
metadata:
  name: data-processor
  namespace: openfaas-fn
  annotations:
    com.openfaas.health.http.path: /healthz
spec:
  name: data-processor
  image: myrepo/data-processor:latest
```

Then in the function's `stack.yml` or deployment configuration, reference the PVC using OpenFaaS's `existing_secrets` and volume configuration. Alternatively, mount the CephFS volume at the Kubernetes level by adding a volume to the function's deployment via a profile or custom template:

Create the shared PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: openfaas-shared-data
  namespace: openfaas-fn
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: rook-cephfs
  resources:
    requests:
      storage: 10Gi
```

## Using Rook as Event Storage for Fission

Store Fission function archives in Ceph:

```bash
# Configure Fission to use S3-compatible storage
fission environment create \
  --name python \
  --image fission/python-env:latest \
  --builder fission/python-builder:latest

# Package and deploy function using Fission's archive storage
fission fn create \
  --name myfunction \
  --env python \
  --deploy myfunction.zip
```

To back Fission's built-in storage service with Ceph, configure the `storageServiceUrl` in the Fission Helm chart to point to the RGW endpoint, or mount a CephFS-backed PVC for the Fission storage service pod.

## Tuning for Cold Start Performance

Function cold starts are sensitive to storage latency. Reduce startup time:

```bash
# Set smaller object size for function artifacts
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw.my-store rgw_max_chunk_size 1048576

# Disable ops log to reduce I/O overhead on the RGW
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw.my-store rgw_enable_ops_log false
```

## Summary

Rook-Ceph supports serverless workloads on Kubernetes through object storage for function artifacts (S3 API via RGW) and shared filesystem storage for stateful function data (CephFS with ReadWriteMany). Knative, OpenFaaS, and Fission all integrate with S3-compatible storage for code distribution. Tuning RGW chunk sizes improves cold start performance for function invocations that fetch artifacts at startup.

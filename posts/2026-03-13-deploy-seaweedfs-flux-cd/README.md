# How to Deploy SeaweedFS with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, SeaweedFS, Object Storage, Distributed Storage, S3

Description: Deploy SeaweedFS distributed object and file storage on Kubernetes using Flux CD HelmRelease for GitOps-managed lightweight object storage.

---

## Introduction

SeaweedFS is a fast, simple, and scalable distributed storage system designed to store billions of files efficiently. Originally inspired by Facebook's Haystack paper, SeaweedFS has evolved into a full-featured system that supports S3-compatible object storage, POSIX filesystem (via FUSE), and Kafka-compatible message queues. Its architecture is simpler than Ceph, making it easier to operate while still delivering high throughput.

SeaweedFS's Helm chart deploys the core components: Master (metadata coordination), Volume Server (data storage), and Filer (filesystem namespace and optional S3 API). Deploying through Flux CD gives you GitOps-managed SeaweedFS infrastructure with version-controlled configuration.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass for Volume Server PVCs
- `kubectl` and `flux` CLIs installed

## Step 1: Add the SeaweedFS HelmRepository

```yaml
# infrastructure/sources/seaweedfs-helm.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: seaweedfs
  namespace: flux-system
spec:
  interval: 12h
  url: https://seaweedfs.github.io/seaweedfs/helm
```

## Step 2: Create the Namespace

```yaml
# infrastructure/storage/seaweedfs/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: seaweedfs
```

## Step 3: Deploy SeaweedFS

```yaml
# infrastructure/storage/seaweedfs/seaweedfs.yaml
apiVersion: v1
kind: Secret
metadata:
  name: seaweedfs-s3-secret
  namespace: seaweedfs
type: Opaque
stringData:
  seaweedfs_s3_config: |-
    {
      "identities": [
        {
          "name": "admin",
          "credentials": [
            {
              "accessKey": "AKIAIOSFODNN7EXAMPLE",
              "secretKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
            }
          ],
          "actions": ["Admin", "Read", "Write"]
        },
        {
          "name": "readonly-user",
          "credentials": [
            {
              "accessKey": "AKIAReadOnlyKey",
              "secretKey": "ReadOnlySecretKey"
            }
          ],
          "actions": ["Read"]
        }
      ]
    }
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: seaweedfs
  namespace: seaweedfs
spec:
  interval: 30m
  chart:
    spec:
      chart: seaweedfs
      version: "4.0.0"
      sourceRef:
        kind: HelmRepository
        name: seaweedfs
        namespace: flux-system
  values:
    global:
      createClusterRole: true
      # Enable monitoring
      monitoring:
        enabled: true

    # Master server (metadata coordination)
    master:
      enabled: true
      replicas: 1   # use 3 in production
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"
      data:
        type: persistentVolumeClaim
        size: 10Gi
        storageClass: ""   # use default StorageClass

      # Vacuum volumes when deleted data reaches 30%
      garbageThreshold: 0.3

    # Volume server (data storage)
    volume:
      enabled: true
      replicas: 3
      resources:
        requests:
          cpu: "500m"
          memory: "1Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
      dataDirs:
        - name: data1
          type: persistentVolumeClaim
          size: 100Gi
          storageClass: premium-ssd
          maxVolumes: 0
      # Index type: leveldb is recommended for large datasets
      index: leveldb
      idx:
        type: persistentVolumeClaim
        size: 20Gi
        storageClass: premium-ssd

    # Filer (POSIX filesystem + S3 API)
    filer:
      enabled: true
      replicas: 1
      resources:
        requests:
          cpu: "200m"
          memory: "512Mi"
        limits:
          cpu: "1"
          memory: "1Gi"
      data:
        type: persistentVolumeClaim
        size: 10Gi

      # S3 configuration
      s3:
        enabled: true
        port: 8333
        enableAuth: true
        existingConfigSecret: seaweedfs-s3-secret
        auditLogConfig: {}

      extraEnvironmentVars:
        WEED_FILER_OPTIONS_RECURSIVE_DELETE: "false"
        WEED_LEVELDB2_ENABLED: "true"
        WEED_LEVELDB2_DIR: "/data/filerldb2"
```

## Step 4: Create a CSI Driver StorageClass (Optional)

If the SeaweedFS CSI driver is installed, you can create a StorageClass for dynamic PV provisioning:

```yaml
# infrastructure/storage/seaweedfs/csi-driver.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: seaweedfs-storage
provisioner: seaweedfs-csi-driver
reclaimPolicy: Delete
allowVolumeExpansion: true
parameters:
  replication: "001"    # one extra replica (use "002" for two extra replicas)
  collection: ""         # default collection
  diskType: ""           # default disk type
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/seaweedfs-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: seaweedfs
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/seaweedfs
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: seaweedfs-master
      namespace: seaweedfs
    - apiVersion: apps/v1
      kind: StatefulSet
      name: seaweedfs-volume
      namespace: seaweedfs
```

## Step 6: Verify and Test

```bash
# Check all pods
kubectl get pods -n seaweedfs

# Port-forward the S3 API
kubectl port-forward svc/seaweedfs-filer-client 8333:8333 -n seaweedfs

# Test S3 API with AWS CLI
aws configure set aws_access_key_id AKIAIOSFODNN7EXAMPLE
aws configure set aws_secret_access_key wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
aws s3 --endpoint-url http://localhost:8333 mb s3://my-bucket
echo "Hello SeaweedFS" | aws s3 --endpoint-url http://localhost:8333 cp - s3://my-bucket/hello.txt
aws s3 --endpoint-url http://localhost:8333 ls s3://my-bucket/

# Check Master UI
kubectl port-forward svc/seaweedfs-master 9333:9333 -n seaweedfs
# Navigate to http://localhost:9333

# Check cluster topology
kubectl exec -i -n seaweedfs seaweedfs-master-0 -- \
  weed shell -master localhost:9333 <<< "cluster.ps"
```

## Best Practices

- Run 3 Master replicas for production HA - single-master deployments are a control-plane availability risk.
- Set `garbageThreshold: 0.3` to automatically reclaim disk space from deleted files when 30% of a volume is garbage.
- Use `leveldb2` as the Filer metadata backend for large file counts, but keep only one Filer replica with this local backend.
- Configure replication (`replication: "000"` for no extra copy, `"001"` for one extra copy on another server in the same rack, `"010"` for one extra copy in another rack) based on your resilience requirements.
- Separate master, volume server, and filer on dedicated nodes for production to avoid resource contention.

## Conclusion

SeaweedFS deployed via Flux CD provides a lightweight, high-performance distributed storage system that is significantly simpler to operate than Ceph while offering S3-compatible object storage, POSIX filesystem access, and flexible replication. Its straightforward architecture makes it ideal for teams that need distributed storage without the operational complexity of Ceph. With Flux managing the SeaweedFS deployment, your object storage infrastructure is version-controlled and consistently configured across environments.

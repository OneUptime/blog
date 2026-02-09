# How to Configure Generic Ephemeral Volumes for Temporary Scratch Space

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, EphemeralVolume, TemporaryStorage

Description: Learn how to use generic ephemeral volumes in Kubernetes to provide temporary scratch space for pods with automatic cleanup, better performance than emptyDir, and support for storage features like snapshots and cloning.

---

Generic ephemeral volumes provide temporary storage that follows the pod lifecycle while offering more features than emptyDir volumes. They're perfect for scratch space, caches, and temporary data processing that needs storage features like CSI drivers, snapshots, or specific performance characteristics.

## Understanding Generic Ephemeral Volumes

Generic ephemeral volumes are created and deleted with the pod, similar to emptyDir, but backed by PersistentVolumes. This gives you:

1. **CSI driver features** - Snapshots, cloning, volume metrics
2. **StorageClass parameters** - Custom IOPS, encryption, filesystem type
3. **Automatic cleanup** - Volume deleted when pod terminates
4. **Resource tracking** - Better visibility into storage usage

Unlike persistent volumes, ephemeral volumes don't survive pod deletion.

## Basic Generic Ephemeral Volume

Create a pod with a generic ephemeral volume:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: data-processor
spec:
  containers:
  - name: processor
    image: ubuntu:22.04
    command:
    - /bin/bash
    - -c
    - |
      # Write temporary processing data
      dd if=/dev/zero of=/scratch/tempfile bs=1M count=100
      echo "Processing data in scratch space..."
      sleep 3600
    volumeMounts:
    - name: scratch
      mountPath: /scratch
  volumes:
  - name: scratch
    ephemeral:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          storageClassName: fast-ssd
          resources:
            requests:
              storage: 5Gi
```

Deploy and verify:

```bash
kubectl apply -f ephemeral-pod.yaml

# Check the pod
kubectl get pod data-processor

# Verify the ephemeral PVC was created
kubectl get pvc

# The PVC name includes the pod name
# Example: data-processor-scratch-xxxxx

# Check volume usage
kubectl exec data-processor -- df -h /scratch

# Delete the pod
kubectl delete pod data-processor

# Verify the PVC was automatically deleted
kubectl get pvc
# The ephemeral PVC should be gone
```

## Using Ephemeral Volumes for Build Caches

Configure build pods with fast SSD cache storage:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-builder
spec:
  containers:
  - name: builder
    image: maven:3.9-eclipse-temurin-17
    command:
    - mvn
    - clean
    - package
    - -Dmaven.repo.local=/cache/maven
    volumeMounts:
    - name: source
      mountPath: /workspace
      readOnly: true
    - name: build-cache
      mountPath: /cache
    workingDir: /workspace
  volumes:
  - name: source
    configMap:
      name: source-code
  - name: build-cache
    ephemeral:
      volumeClaimTemplate:
        metadata:
          labels:
            type: build-cache
        spec:
          accessModes:
            - ReadWriteOnce
          storageClassName: fast-ssd
          resources:
            requests:
              storage: 20Gi
```

## Ephemeral Volumes for Data Processing Jobs

Use ephemeral storage in batch jobs for temporary data:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: video-transcoder
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: transcoder
        image: jrottenberg/ffmpeg:4.4-alpine
        command:
        - /bin/sh
        - -c
        - |
          # Download video to ephemeral storage
          wget -O /scratch/input.mp4 $VIDEO_URL
          # Process video
          ffmpeg -i /scratch/input.mp4 -vcodec h264 /scratch/output.mp4
          # Upload result
          aws s3 cp /scratch/output.mp4 s3://bucket/output.mp4
        env:
        - name: VIDEO_URL
          value: "https://example.com/video.mp4"
        volumeMounts:
        - name: scratch
          mountPath: /scratch
      volumes:
      - name: scratch
        ephemeral:
          volumeClaimTemplate:
            spec:
              accessModes:
                - ReadWriteOnce
              storageClassName: high-iops-ssd
              resources:
                requests:
                  storage: 50Gi
```

## Multiple Ephemeral Volumes

Use different ephemeral volumes for different purposes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ml-training
spec:
  containers:
  - name: trainer
    image: tensorflow/tensorflow:latest-gpu
    command:
    - python
    - train.py
    - --data-dir=/data
    - --checkpoint-dir=/checkpoints
    - --temp-dir=/tmp-processing
    volumeMounts:
    - name: training-data
      mountPath: /data
    - name: checkpoints
      mountPath: /checkpoints
    - name: temp-processing
      mountPath: /tmp-processing
  volumes:
  # Fast SSD for training data
  - name: training-data
    ephemeral:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          storageClassName: nvme-local
          resources:
            requests:
              storage: 100Gi
  # Standard storage for checkpoints
  - name: checkpoints
    ephemeral:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          storageClassName: standard-ssd
          resources:
            requests:
              storage: 50Gi
  # Cheap storage for temporary files
  - name: temp-processing
    ephemeral:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          storageClassName: budget-storage
          resources:
            requests:
              storage: 200Gi
```

## Ephemeral Volumes with Encryption

Create encrypted ephemeral volumes for sensitive temporary data:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-processor
spec:
  containers:
  - name: processor
    image: alpine:latest
    command:
    - sh
    - -c
    - |
      # Process sensitive data
      echo "Sensitive data" > /secure/data.txt
      # Data is encrypted at rest
      sleep 3600
    volumeMounts:
    - name: secure-scratch
      mountPath: /secure
  volumes:
  - name: secure-scratch
    ephemeral:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          storageClassName: encrypted-storage
          resources:
            requests:
              storage: 10Gi
---
# StorageClass with encryption enabled
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: encrypted-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
  kmsKeyId: "arn:aws:kms:us-east-1:123456789012:key/xxxxx"
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Using Ephemeral Volumes in StatefulSets

While StatefulSets typically use persistent storage, you can mix both:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database-cluster
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  # Persistent storage for data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes:
        - ReadWriteOnce
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        - name: temp-processing
          mountPath: /tmp/processing
      volumes:
      # Ephemeral storage for temporary query results
      - name: temp-processing
        ephemeral:
          volumeClaimTemplate:
            spec:
              accessModes:
                - ReadWriteOnce
              storageClassName: fast-ssd
              resources:
                requests:
                  storage: 20Gi
```

## Resource Limits for Ephemeral Storage

Control ephemeral storage usage with resource quotas:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ephemeral-storage-quota
  namespace: default
spec:
  hard:
    # Limit total ephemeral storage
    requests.ephemeral-storage: "500Gi"
    # Limit number of ephemeral volumes
    persistentvolumeclaims: "50"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - medium
      - low
```

## Monitoring Ephemeral Volume Usage

Track ephemeral volumes in your cluster:

```bash
# List all ephemeral PVCs (they contain pod names)
kubectl get pvc -A -o json | jq -r '.items[] |
  select(.metadata.ownerReferences[0].kind == "Pod") |
  "\(.metadata.namespace)/\(.metadata.name): \(.status.capacity.storage)"'

# Find pods using ephemeral volumes
kubectl get pods -A -o json | jq -r '.items[] |
  select(.spec.volumes[]?.ephemeral != null) |
  {
    pod: .metadata.name,
    namespace: .metadata.namespace,
    ephemeralVolumes: [.spec.volumes[] | select(.ephemeral != null) | .name]
  }'

# Total ephemeral storage used
kubectl get pvc -A -o json | jq -r '[.items[] |
  select(.metadata.ownerReferences[0].kind == "Pod") |
  .status.capacity.storage | gsub("[^0-9]";"") | tonumber] | add'
```

## Cleanup and Troubleshooting

Handle orphaned ephemeral volumes:

```bash
# Find PVCs without owner pods (orphaned)
kubectl get pvc -o json | jq -r '.items[] |
  select(.metadata.ownerReferences[0].kind == "Pod") |
  select(.metadata.ownerReferences[0].name as $pod |
    ([.metadata.namespace] | @sh) as $ns |
    (["kubectl get pod -n", $ns, $pod, "-o name 2>/dev/null"] |
    join(" ") | @sh | "test -z $(" + . + ")") | . == "test -z $()") |
  .metadata.name'

# Manually clean up orphaned ephemeral PVCs
kubectl delete pvc <orphaned-pvc-name>

# Force delete stuck ephemeral volumes
kubectl patch pvc <pvc-name> -p '{"metadata":{"finalizers":null}}'
kubectl delete pvc <pvc-name> --force --grace-period=0
```

Common issues:

```bash
# 1. Ephemeral volume creation fails
kubectl describe pod <pod-name>

# Look for events about PVC creation failure
# Common causes:
# - StorageClass doesn't exist
# - Insufficient quota
# - CSI driver not ready

# 2. Pod stuck terminating with ephemeral volume
# Check if volume is stuck detaching
kubectl describe pvc <ephemeral-pvc-name>

# Force delete the pod
kubectl delete pod <pod-name> --force --grace-period=0
```

## Comparing Ephemeral Volume Types

Choose the right ephemeral storage:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ephemeral-comparison
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: emptydir-volume
      mountPath: /emptydir
    - name: generic-ephemeral
      mountPath: /ephemeral
    - name: ephemeral-inline-csi
      mountPath: /inline-csi
  volumes:
  # emptyDir: Fastest, no features, node-local
  - name: emptydir-volume
    emptyDir:
      sizeLimit: 5Gi

  # Generic ephemeral: CSI features, slower, network-backed
  - name: generic-ephemeral
    ephemeral:
      volumeClaimTemplate:
        spec:
          accessModes:
            - ReadWriteOnce
          storageClassName: fast-ssd
          resources:
            requests:
              storage: 5Gi

  # CSI inline: For specific CSI drivers (e.g., secrets)
  - name: ephemeral-inline-csi
    csi:
      driver: secrets-store.csi.k8s.io
      readOnly: true
      volumeAttributes:
        secretProviderClass: "my-secrets"
```

## Best Practices

1. **Use generic ephemeral for features** - When you need CSI capabilities
2. **Stick with emptyDir for speed** - When performance is critical
3. **Set appropriate sizes** - Avoid over-provisioning temporary storage
4. **Use resource quotas** - Prevent runaway ephemeral volume creation
5. **Choose right StorageClass** - Match performance to workload needs
6. **Clean up failed jobs** - Don't let orphaned volumes accumulate
7. **Monitor usage patterns** - Right-size your ephemeral storage requests

Generic ephemeral volumes bridge the gap between emptyDir simplicity and persistent volume capabilities, providing the best of both worlds for temporary storage needs.

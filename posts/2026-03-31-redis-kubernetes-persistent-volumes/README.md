# How to Configure Redis Persistent Volumes in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Persistence

Description: Learn how to configure Redis persistent volumes in Kubernetes using PersistentVolumeClaims, StorageClasses, and volumeClaimTemplates in StatefulSets.

---

Redis persistence in Kubernetes requires PersistentVolumeClaims (PVCs) that survive pod restarts and rescheduling. This guide covers PVC configuration, StorageClass selection, and StatefulSet volume templates.

## StorageClass Selection

Choose the right StorageClass for Redis:

```bash
# List available StorageClasses
kubectl get storageclass

# Example output:
# NAME                PROVISIONER                  RECLAIMPOLICY
# standard (default)  kubernetes.io/gce-pd         Delete
# fast-ssd            kubernetes.io/gce-pd          Retain
# local-path          rancher.io/local-path         Delete
```

For Redis persistence, prefer:

```text
- SSD-backed storage (fast-ssd) for AOF
- RETAIN reclaim policy to prevent accidental data deletion
- ReadWriteOnce access mode (Redis is single-writer)
```

Create a dedicated StorageClass:

```yaml
# redis-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: redis-storage
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## PersistentVolumeClaim

For a standalone Redis pod:

```yaml
# redis-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-data
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: redis-storage
  resources:
    requests:
      storage: 20Gi
```

```yaml
# redis-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: redis
spec:
  containers:
    - name: redis
      image: redis:7-alpine
      command: ["redis-server", "--appendonly", "yes", "--save", "900", "1"]
      volumeMounts:
        - name: redis-data
          mountPath: /data
  volumes:
    - name: redis-data
      persistentVolumeClaim:
        claimName: redis-data
```

## VolumeClaimTemplates in StatefulSets

StatefulSets automatically create PVCs for each replica:

```yaml
# redis-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: redis
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          command:
            - redis-server
            - /etc/redis/redis.conf
          volumeMounts:
            - name: redis-config
              mountPath: /etc/redis
            - name: redis-data
              mountPath: /data
          ports:
            - containerPort: 6379
      volumes:
        - name: redis-config
          configMap:
            name: redis-config
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: redis-storage
        resources:
          requests:
            storage: 20Gi
```

Each pod gets its own PVC: `redis-data-redis-0`, `redis-data-redis-1`, `redis-data-redis-2`.

## Verifying Persistence

```bash
# Check PVCs are created and bound
kubectl get pvc -n redis

# Verify volume is mounted
kubectl exec -n redis redis-0 -- df -h /data

# Test persistence survives pod deletion
kubectl exec -n redis redis-0 -- redis-cli SET persistent-key "test-value"
kubectl delete pod -n redis redis-0
# Pod is recreated by StatefulSet
kubectl exec -n redis redis-0 -- redis-cli GET persistent-key
# Should return: test-value
```

## Expanding PVC Storage

```bash
# Edit PVC to request more storage (requires allowVolumeExpansion: true)
kubectl patch pvc redis-data-redis-0 -n redis \
  -p '{"spec":{"resources":{"requests":{"storage":"40Gi"}}}}'

# Verify expansion
kubectl get pvc redis-data-redis-0 -n redis
```

## Summary

Redis persistent volumes in Kubernetes use PersistentVolumeClaims backed by appropriate StorageClasses with SSD storage and RETAIN reclaim policies. StatefulSets with `volumeClaimTemplates` automatically provision per-replica PVCs that persist through pod restarts and rescheduling. Always test persistence by deleting a pod and verifying data survives on the recreated pod.

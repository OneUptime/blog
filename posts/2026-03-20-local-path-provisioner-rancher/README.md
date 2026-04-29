# How to Set Up Local Path Provisioner for Development in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Local Path Provisioner, Storage, Development, k3s, PersistentVolume

Description: Configure the Local Path Provisioner in Rancher for development clusters to provide automatic dynamic PVC provisioning using local node storage.

## Introduction

The Local Path Provisioner provides a lightweight dynamic provisioner for development and test environments where cloud storage is unavailable or overkill. It automatically creates local or hostPath-backed PersistentVolumes on the node selected for the workload-ideal for K3s-based development clusters.

## When to Use Local Path Provisioner

- Development and CI environments
- Single-node Rancher/K3s setups
- When you don't need storage replication

**Do not use in production** where data durability and node independence are required.

## Step 1: Install Local Path Provisioner

K3s includes Local Path Provisioner by default. For other clusters, install it manually:

```bash
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.35/deploy/local-path-storage.yaml
```

## Step 2: Verify Installation

```bash
# Check the provisioner pod is running

kubectl get pods -A -l app=local-path-provisioner

# Verify the StorageClass was created
kubectl get storageclass local-path
```

## Step 3: Set as Default StorageClass

In K3s, `local-path` is already the default StorageClass. If another StorageClass is currently the default, mark it non-default first, then mark `local-path` as default:

```bash
kubectl patch storageclass <current-default> \
  -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'

kubectl patch storageclass local-path \
  -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

## Step 4: Test with a PVC

Create a PVC and a Pod that uses it, then verify the claim is automatically bound:

```yaml
# test-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path    # Use the local path provisioner
  resources:
    requests:
      storage: 1Gi

---
apiVersion: v1
kind: Pod
metadata:
  name: test-pvc-pod
spec:
  containers:
    - name: volume-test
      image: nginx:stable-alpine
      volumeMounts:
        - mountPath: /data
          name: test-volume
  volumes:
    - name: test-volume
      persistentVolumeClaim:
        claimName: test-pvc
```

```bash
kubectl apply -f test-pvc.yaml
kubectl get pvc test-pvc        # Should show STATUS: Bound after the Pod is scheduled
kubectl get pod test-pvc-pod
```

## Step 5: Configure Storage Path

For the upstream manifest, data is stored at `/opt/local-path-provisioner` by default. In K3s, the bundled addon uses the server's default local storage path. Customize this via a ConfigMap:

```yaml
# local-path-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-path-config
  namespace: kube-system # Use local-path-storage if you installed the upstream manifest manually
data:
  config.json: |
    {
      "nodePathMap": [
        {
          "node": "DEFAULT_PATH_FOR_NON_LISTED_NODES",
          "paths": ["/data/local-path-provisioner"]
        }
      ]
    }
```

```bash
kubectl apply -f local-path-config.yaml
```

## Step 6: Use in Development Deployments

```yaml
# dev-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          env:
            - name: POSTGRES_PASSWORD
              value: devpassword
          volumeMounts:
            - mountPath: /var/lib/postgresql/data
              name: db-data
      volumes:
        - name: db-data
          persistentVolumeClaim:
            claimName: postgres-data

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: local-path
  resources:
    requests:
      storage: 5Gi
```

## Conclusion

Local Path Provisioner provides zero-configuration dynamic storage provisioning for Rancher development clusters. Since K3s ships with it enabled by default, development clusters are immediately storage-capable without additional setup. Remember to use a proper distributed StorageClass (Longhorn, Rook-Ceph) for production workloads.

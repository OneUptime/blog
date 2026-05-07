# How to Use PersistentVolumeClaims with podman kube play

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, PersistentVolumeClaim, Storage

Description: Learn how to use Kubernetes PersistentVolumeClaims in podman kube play to provide persistent storage to containers.

---

> PersistentVolumeClaims in podman kube play map to Podman named volumes, giving your containers durable storage that survives restarts.

When running stateful applications with `podman kube play`, you need storage that persists beyond the container lifecycle. Podman translates Kubernetes PersistentVolumeClaim resources into named volumes, so your database files, uploads, and application state survive pod restarts.

---

## Defining a PersistentVolumeClaim

```yaml
# postgres-pvc.yaml

apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      # Podman only requires the PVC name, but this keeps the manifest Kubernetes-compatible
      storage: 10Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: postgres
spec:
  containers:
    - name: db
      image: docker.io/library/postgres:16-alpine
      env:
        - name: POSTGRES_PASSWORD
          value: "mysecretpassword"
      volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: postgres-data
```

## Deploying with PVCs

```bash
# Deploy the pod; Podman creates a named volume for the PVC
podman kube play postgres-pvc.yaml

# Verify the named volume was created
podman volume ls
# Output includes: postgres-data

# Check the volume details
podman volume inspect postgres-data
```

## Verifying Data Persistence

```bash
# Write data to the database
podman exec postgres-db psql -U postgres -c "CREATE TABLE test (id serial, name text);"
podman exec postgres-db psql -U postgres -c "INSERT INTO test (name) VALUES ('persistent');"

# Tear down the pod
podman kube play --down postgres-pvc.yaml

# Re-deploy the pod - data is still there
podman kube play postgres-pvc.yaml

# Verify data survived the restart
podman exec postgres-db psql -U postgres -c "SELECT * FROM test;"
# Output: persistent
```

## Multiple PVCs in a Single Pod

```yaml
# app-multi-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-uploads
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-logs
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: webapp
spec:
  containers:
    - name: app
      image: docker.io/library/nginx:alpine
      volumeMounts:
        - name: uploads
          mountPath: /app/uploads
        - name: logs
          mountPath: /var/log/app
  volumes:
    - name: uploads
      persistentVolumeClaim:
        claimName: app-uploads
    - name: logs
      persistentVolumeClaim:
        claimName: app-logs
```

```bash
# Deploy and verify both volumes
podman kube play app-multi-pvc.yaml
podman volume ls | grep app-
# Output:
# app-uploads
# app-logs
```

## Cleaning Up Volumes

```bash
# Tear down the pod
podman kube play --down postgres-pvc.yaml

# Volumes persist after pod removal; delete them explicitly
podman volume rm postgres-data
```

## Summary

Podman maps Kubernetes PersistentVolumeClaims to named volumes when using `podman kube play`. This provides durable storage that persists across pod restarts. Define PVCs in your YAML, reference them in volume mounts, and Podman handles volume creation automatically.

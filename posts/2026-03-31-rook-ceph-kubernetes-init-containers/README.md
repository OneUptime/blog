# How to Use Ceph with Kubernetes Init Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Init Container, Storage, Volume

Description: Use Kubernetes init containers to pre-populate or validate Ceph-backed volumes before your main application containers start.

---

## Introduction

Init containers run before main application containers and are useful for pre-populating data, running migrations, or validating storage availability. When combined with Rook-Ceph volumes, init containers can seed databases, download initial datasets, or verify volume readiness before the application starts.

## Common Use Cases

- Downloading seed data into a Ceph-backed PVC
- Running database schema migrations before the app starts
- Verifying that required Ceph RGW buckets exist
- Changing volume ownership or permissions

## Example: Seeding Data from S3 to a Ceph Volume

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: seeded-app
spec:
  initContainers:
  - name: seed-data
    image: amazon/aws-cli:latest
    command:
    - /bin/sh
    - -c
    - |
      aws s3 sync s3://seed-bucket/initial-data/ /data/ \
        --endpoint-url http://rook-ceph-rgw-store.rook-ceph:80
    env:
    - name: AWS_ACCESS_KEY_ID
      valueFrom:
        secretKeyRef:
          name: ceph-rgw-creds
          key: access-key
    - name: AWS_SECRET_ACCESS_KEY
      valueFrom:
        secretKeyRef:
          name: ceph-rgw-creds
          key: secret-key
    volumeMounts:
    - name: app-data
      mountPath: /data
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: app-data
      mountPath: /data
  volumes:
  - name: app-data
    persistentVolumeClaim:
      claimName: app-data-pvc
```

## Example: Database Migration Init Container

```yaml
initContainers:
- name: db-migrate
  image: myapp-migrator:latest
  command: ["python", "manage.py", "migrate"]
  env:
  - name: DATABASE_URL
    value: "postgresql://db:5432/mydb"
  volumeMounts:
  - name: migration-lock
    mountPath: /var/lock
```

## Example: Fixing Volume Permissions

Some applications expect specific UID/GID ownership on mounted volumes:

```yaml
initContainers:
- name: fix-permissions
  image: busybox:latest
  command: ["sh", "-c", "chown -R 1000:1000 /data && chmod -R 750 /data"]
  securityContext:
    runAsUser: 0
  volumeMounts:
  - name: app-data
    mountPath: /data
```

## Verifying Init Container Execution

Monitor init container progress:

```bash
kubectl get pod seeded-app
# Status shows: Init:0/1, Init:1/1, then Running

kubectl logs seeded-app -c seed-data
```

View events if init containers fail:

```bash
kubectl describe pod seeded-app | grep -A20 Events
```

## Handling Init Container Failures

Init containers retry on failure based on the Pod's `restartPolicy`. Note that Kubernetes will not start any container (including init containers) until all volumes are successfully mounted - if the volume is unavailable, the Pod stays in `Pending` state. Once the Pod starts, you can verify the volume is writable before proceeding:

```yaml
initContainers:
- name: wait-for-volume
  image: busybox:latest
  command:
  - /bin/sh
  - -c
  - |
    until touch /data/.volume-check 2>/dev/null; do
      echo "Waiting for volume to be writable..."
      sleep 5
    done
    rm -f /data/.volume-check
    echo "Volume ready"
  volumeMounts:
  - name: app-data
    mountPath: /data
```

## Summary

Init containers complement Rook-Ceph volumes by enabling pre-population, permission fixing, and migration tasks before main application containers start. Since init containers share the same PVC as the main container, data written during init is immediately available, making them a clean pattern for stateful application bootstrapping on Kubernetes.

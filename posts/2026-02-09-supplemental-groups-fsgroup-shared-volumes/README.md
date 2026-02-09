# How to Configure supplementalGroups and fsGroup for Shared Volume Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Storage

Description: Learn how to use supplementalGroups and fsGroup in Kubernetes to manage file permissions on shared volumes and enable multiple containers to access the same persistent data securely.

---

When multiple containers in a pod need to share files, or when pods need to access persistent volumes with specific permissions, configuring Linux group IDs becomes essential. The `fsGroup` and `supplementalGroups` fields in the pod security context control which group owns files on volumes and which additional groups containers run with, enabling secure shared access patterns.

These settings are critical for applications that need shared storage, multi-container pods, and any workload dealing with file permissions on persistent volumes.

## Understanding fsGroup

The `fsGroup` field sets the group ID that owns volume files and runs the container processes with that group:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fsgroup-demo
spec:
  securityContext:
    fsGroup: 2000
  containers:
  - name: app
    image: busybox:1.36
    command: ["sh", "-c"]
    args:
    - |
      ls -la /data
      id
      echo "test" > /data/file.txt
      ls -la /data/file.txt
      sleep 3600
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    emptyDir: {}
```

When this pod runs, files in `/data` are owned by group 2000:

```bash
kubectl exec fsgroup-demo -- ls -la /data
# Shows: drwxrwsrwx  2 root 2000 ...

kubectl exec fsgroup-demo -- id
# Shows: uid=0(root) gid=0(root) groups=2000
```

## Using supplementalGroups

The `supplementalGroups` field adds additional group memberships to the container process:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: supplemental-groups-demo
spec:
  securityContext:
    supplementalGroups: [3000, 4000]
  containers:
  - name: app
    image: busybox:1.36
    command: ["sh", "-c", "id && sleep 3600"]
```

The container process runs with multiple groups:

```bash
kubectl exec supplemental-groups-demo -- id
# Output: uid=0(root) gid=0(root) groups=0(root),3000,4000
```

## Shared Volume Between Containers

Multiple containers accessing the same volume:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: shared-volume
spec:
  securityContext:
    fsGroup: 1000
  containers:
  - name: writer
    image: ubuntu:22.04
    command: ["/bin/bash"]
    args:
    - -c
    - |
      while true; do
        echo "$(date): Writer process" >> /shared/log.txt
        sleep 5
      done
    volumeMounts:
    - name: shared-data
      mountPath: /shared

  - name: reader
    image: ubuntu:22.04
    command: ["/bin/bash"]
    args:
    - -c
    - |
      while true; do
        if [ -f /shared/log.txt ]; then
          tail -n 5 /shared/log.txt
        fi
        sleep 10
      done
    volumeMounts:
    - name: shared-data
      mountPath: /shared

  volumes:
  - name: shared-data
    emptyDir: {}
```

Both containers can read and write to the shared volume because they're in group 1000.

## Database with Persistent Volume

PostgreSQL example with proper permissions:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      securityContext:
        fsGroup: 999  # PostgreSQL group ID
      containers:
      - name: postgres
        image: postgres:15
        securityContext:
          runAsUser: 999  # PostgreSQL user ID
          runAsGroup: 999
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        ports:
        - containerPort: 5432
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

The fsGroup ensures PostgreSQL can access its data directory regardless of the underlying storage permissions.

## Multi-Container Application with Shared Config

Application server with configuration manager:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-config-manager
spec:
  securityContext:
    fsGroup: 2000
  initContainers:
  - name: config-generator
    image: config-generator:1.0
    command: ["/bin/sh"]
    args:
    - -c
    - |
      # Generate configuration file
      cat > /config/app.yaml <<EOF
      database:
        host: postgres.default.svc.cluster.local
        port: 5432
      cache:
        host: redis.default.svc.cluster.local
      EOF
      chmod 640 /config/app.yaml
    volumeMounts:
    - name: config
      mountPath: /config

  containers:
  - name: app
    image: myapp:1.0
    command: ["/app/start.sh"]
    volumeMounts:
    - name: config
      mountPath: /etc/app
      readOnly: true
    ports:
    - containerPort: 8080

  - name: config-reloader
    image: config-reloader:1.0
    command: ["/bin/sh"]
    args:
    - -c
    - |
      # Watch for config changes and signal app
      while true; do
        inotifywait -e modify /etc/app/app.yaml
        echo "Config changed, reloading..."
        # Send SIGHUP to app container
        pkill -HUP -f start.sh
      done
    volumeMounts:
    - name: config
      mountPath: /etc/app

  volumes:
  - name: config
    emptyDir: {}
```

## Using with NFS Volumes

NFS requires special handling for group permissions:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
  - ReadWriteMany
  nfs:
    server: nfs-server.example.com
    path: /exports/data
  mountOptions:
  - vers=4.1
  - nolock
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nfs-pvc
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nfs-app
  template:
    metadata:
      labels:
        app: nfs-app
    spec:
      securityContext:
        fsGroup: 1000
        supplementalGroups: [2000, 3000]
      containers:
      - name: app
        image: myapp:1.0
        volumeMounts:
        - name: shared-data
          mountPath: /data
      volumes:
      - name: shared-data
        persistentVolumeClaim:
          claimName: nfs-pvc
```

All replicas can access the shared NFS volume with proper permissions.

## Debugging Permission Issues

Check actual file permissions:

```bash
# Exec into pod and check
kubectl exec -it <pod-name> -- ls -la /data

# Check process groups
kubectl exec -it <pod-name> -- id

# Check volume mount permissions
kubectl exec -it <pod-name> -- stat /data
```

Common issues and solutions:

```yaml
# Issue: Permission denied even with fsGroup
# Solution: Some volume types don't support fsGroup (hostPath, local)
# Use initContainer to set permissions:
apiVersion: v1
kind: Pod
metadata:
  name: permission-fix
spec:
  initContainers:
  - name: fix-permissions
    image: busybox:1.36
    command: ["sh", "-c"]
    args:
    - |
      chown -R 1000:1000 /data
      chmod -R 775 /data
    volumeMounts:
    - name: data
      mountPath: /data
    securityContext:
      runAsUser: 0  # initContainer runs as root

  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      runAsUser: 1000
      runAsGroup: 1000
    volumeMounts:
    - name: data
      mountPath: /data

  volumes:
  - name: data
    hostPath:
      path: /mnt/data
```

## Volume Types and fsGroup Support

Different volume types handle fsGroup differently:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volume-types-demo
spec:
  securityContext:
    fsGroup: 1000
  containers:
  - name: app
    image: busybox:1.36
    command: ["sleep", "3600"]
    volumeMounts:
    - name: empty
      mountPath: /empty      # fsGroup applies
    - name: config
      mountPath: /config     # fsGroup applies
    - name: secret
      mountPath: /secret     # fsGroup applies
    - name: pvc
      mountPath: /pvc        # fsGroup applies (most PVC types)
    - name: hostpath
      mountPath: /hostpath   # fsGroup does NOT apply

  volumes:
  - name: empty
    emptyDir: {}
  - name: config
    configMap:
      name: my-config
  - name: secret
    secret:
      secretName: my-secret
  - name: pvc
    persistentVolumeClaim:
      claimName: my-pvc
  - name: hostpath
    hostPath:
      path: /data
```

## Best Practices

Use fsGroup when possible instead of init containers for permission fixes. It's the Kubernetes-native way.

Choose group IDs that don't conflict with system groups. Use IDs above 1000.

Document why specific group IDs are used. This helps future maintainers understand permission requirements.

Test with actual volume backends. Not all storage systems handle group permissions identically.

Use supplementalGroups when containers need access to multiple shared resources with different group ownership.

Avoid running containers as root when using fsGroup. Combine with runAsUser and runAsNonRoot.

Set fsGroup at pod level, not container level. It applies to all containers and volumes in the pod.

Verify permissions in init containers before starting main containers:

```yaml
initContainers:
- name: verify-permissions
  image: busybox:1.36
  command: ["sh", "-c"]
  args:
  - |
    if [ ! -w /data ]; then
      echo "ERROR: Cannot write to /data"
      exit 1
    fi
    echo "Permissions OK"
  volumeMounts:
  - name: data
    mountPath: /data
```

Understanding fsGroup and supplementalGroups is essential for managing file permissions in Kubernetes, enabling secure shared access to persistent storage across containers and pods.

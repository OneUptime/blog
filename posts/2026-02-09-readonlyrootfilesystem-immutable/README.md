# How to configure readOnlyRootFilesystem for immutable container filesystems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Container Security, Immutable Infrastructure, Pod Security

Description: Master the implementation of read-only root filesystems in Kubernetes containers to create immutable infrastructure that prevents runtime modifications and enhances security posture.

---

Immutable infrastructure is a security best practice that prevents attackers from persisting changes within compromised containers. By configuring containers with read-only root filesystems, you eliminate a significant attack vector where malware or attackers modify system files, install backdoors, or change application binaries.

## Understanding readOnlyRootFilesystem

When you set `readOnlyRootFilesystem: true` in a container's security context, Kubernetes mounts the container's root filesystem as read-only. The container can read any file in its filesystem, but any attempt to write, modify, or delete files fails with a permission error.

This configuration forces you to design applications that treat their filesystem as immutable and use volumes for any necessary writable storage. While this requires additional planning, the security benefits are substantial.

## Basic Configuration

Here's how to configure a container with a read-only root filesystem:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: readonly-demo
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    securityContext:
      readOnlyRootFilesystem: true
    volumeMounts:
    - name: cache
      mountPath: /var/cache/nginx
    - name: run
      mountPath: /var/run
  volumes:
  - name: cache
    emptyDir: {}
  - name: run
    emptyDir: {}
```

This nginx container runs with a read-only root filesystem. However, nginx needs writable directories for cache and runtime files. We provide these through emptyDir volumes, which give the container writable storage while keeping the root filesystem immutable.

## Identifying Writable Paths Required by Applications

Most applications need some writable paths. You need to identify these before enabling read-only root filesystems. You can discover required writable paths by running the container normally and monitoring filesystem writes.

```bash
# Run a test container and observe file writes
kubectl run test-app --image=myapp:1.0 --rm -it -- sh

# Inside the container, monitor writes
# (This requires strace or similar tools in the image)
strace -e trace=open,openat,creat -f -o /tmp/trace.log myapp

# Analyze the trace to find write operations
grep -i "o_wronly\|o_rdwr\|o_creat" /tmp/trace.log
```

Common paths that applications write to include `/tmp`, `/var/log`, `/var/cache`, `/var/run`, and application-specific data directories. Create volume mounts for each of these paths.

## Configuring Applications with Multiple Writable Volumes

Complex applications often need several writable paths. You can mount multiple volumes to accommodate these requirements:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: complex-app
spec:
  containers:
  - name: app
    image: mycomplex-app:2.0
    securityContext:
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 1000
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: logs
      mountPath: /var/log/app
    - name: cache
      mountPath: /app/cache
    - name: pid
      mountPath: /var/run
    - name: config-override
      mountPath: /app/config-override
  volumes:
  - name: tmp
    emptyDir: {}
  - name: logs
    emptyDir: {}
  - name: cache
    emptyDir: {}
  - name: pid
    emptyDir: {}
  - name: config-override
    emptyDir: {}
```

Each volume provides writable storage for a specific purpose. Using emptyDir volumes means these directories exist only for the pod's lifetime and disappear when the pod terminates. This reinforces the immutability concept since no state persists beyond the pod's lifecycle.

## Using Persistent Volumes for Required State

Some applications genuinely need persistent writable storage for databases, user uploads, or application state. You can combine read-only root filesystems with persistent volumes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-readonly
spec:
  containers:
  - name: postgres
    image: postgres:13
    securityContext:
      readOnlyRootFilesystem: true
      runAsUser: 999
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: password
    - name: PGDATA
      value: /var/lib/postgresql/data/pgdata
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
    - name: run
      mountPath: /var/run/postgresql
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: postgres-pvc
  - name: run
    emptyDir: {}
  - name: tmp
    emptyDir: {}
```

The database files live on a persistent volume, but the root filesystem remains read-only. This means attackers cannot modify PostgreSQL binaries or system libraries, while legitimate database operations continue normally.

## Handling Init Containers with Read-Only Filesystems

Init containers often need to prepare the environment before the main container starts. With read-only root filesystems, init containers must write to shared volumes rather than the filesystem:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-readonly-demo
spec:
  initContainers:
  - name: setup
    image: busybox
    command:
    - sh
    - -c
    - |
      echo "Preparing environment..."
      cp /config/* /shared/config/
      chmod 644 /shared/config/*
    securityContext:
      readOnlyRootFilesystem: true
    volumeMounts:
    - name: source-config
      mountPath: /config
      readOnly: true
    - name: shared-config
      mountPath: /shared/config
    - name: tmp
      mountPath: /tmp
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      readOnlyRootFilesystem: true
    volumeMounts:
    - name: shared-config
      mountPath: /app/config
      readOnly: true
    - name: app-tmp
      mountPath: /tmp
  volumes:
  - name: source-config
    configMap:
      name: app-config
  - name: shared-config
    emptyDir: {}
  - name: tmp
    emptyDir: {}
  - name: app-tmp
    emptyDir: {}
```

The init container copies configuration from a ConfigMap to a shared volume, which the main container then mounts. Both containers run with read-only root filesystems.

## Dealing with Package Managers and System Updates

Read-only root filesystems prevent package managers from installing or updating software at runtime. This is actually a security feature, not a limitation. You should build all required software into your container images during the build process:

```dockerfile
# Dockerfile with all dependencies built in
FROM ubuntu:20.04

# Install everything during build
RUN apt-get update && \
    apt-get install -y \
        nginx \
        curl \
        ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create necessary directories that will be volume mounts
RUN mkdir -p /var/cache/nginx /var/run && \
    chown -R www-data:www-data /var/cache/nginx /var/run

# Application runs as non-root
USER www-data

CMD ["nginx", "-g", "daemon off;"]
```

This approach ensures your container images are complete and tested. Runtime package installation creates inconsistency and security risks. With immutable containers, what you tested is exactly what runs in production.

## Testing Read-Only Filesystem Configuration

Before deploying with read-only root filesystems, thoroughly test your applications. Create a test pod and verify functionality:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-readonly
spec:
  containers:
  - name: test
    image: myapp:1.0
    securityContext:
      readOnlyRootFilesystem: true
    command: ["/bin/sh"]
    args: ["-c", "while true; do sleep 30; done"]
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

Exec into the pod and test write operations:

```bash
# Connect to the test pod
kubectl exec -it test-readonly -- sh

# Try writing to root filesystem (should fail)
echo "test" > /test.txt
# Error: Read-only file system

# Try writing to mounted volume (should succeed)
echo "test" > /tmp/test.txt
ls -la /tmp/test.txt
```

Run your application's test suite within the pod to ensure all functionality works with the read-only filesystem.

## Enforcing Read-Only Filesystems with Pod Security Standards

Kubernetes Pod Security Standards can enforce read-only root filesystems across namespaces:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: secure-apps
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

The restricted Pod Security Standard requires `readOnlyRootFilesystem: true`, along with other security constraints. This ensures all pods in the namespace follow security best practices.

## Performance Considerations

Read-only root filesystems have minimal performance impact. In fact, they can improve performance slightly since the kernel can optimize read-only mounts. The emptyDir volumes you add for writable paths use tmpfs by default, which is extremely fast.

For I/O-intensive applications, you might want to configure emptyDir volumes explicitly:

```yaml
volumes:
- name: high-performance-cache
  emptyDir:
    medium: Memory
    sizeLimit: 1Gi
```

This creates an in-memory tmpfs volume, providing maximum I/O performance for temporary data.

## Conclusion

Read-only root filesystems transform containers into truly immutable infrastructure. This security measure prevents persistence of malware, blocks runtime modifications, and forces proper separation between application code and data. While implementing read-only filesystems requires identifying and mounting writable volumes for necessary paths, the security benefits far outweigh this additional complexity. Combined with other security context options like running as non-root and dropping capabilities, read-only root filesystems form a crucial part of container hardening strategies. Start applying this practice to new deployments and gradually migrate existing workloads as you identify their writable path requirements.

# How to implement ephemeral volume mount with restricted permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Ephemeral Volumes, Security, Volume Permissions

Description: Learn how to configure ephemeral volumes with restricted permissions in Kubernetes, implementing secure temporary storage for containers using emptyDir, CSI ephemeral volumes, and proper security context configuration.

---

Ephemeral volumes provide temporary storage that exists only for the pod's lifetime. While convenient, these volumes need proper permission configuration to prevent security issues. Combining ephemeral volumes with security context settings, fsGroup, and volume mount options creates secure temporary storage that follows least privilege principles.

## Understanding Ephemeral Volume Types

Kubernetes supports several ephemeral volume types. EmptyDir volumes are the most common, created empty when the pod starts and deleted when it terminates. CSI ephemeral volumes use storage drivers to provide temporary volumes. Generic ephemeral volumes use PersistentVolumeClaim templates for more sophisticated temporary storage.

Each type requires different security considerations. EmptyDir volumes can be memory-backed or disk-backed. CSI ephemeral volumes depend on driver capabilities. Generic ephemeral volumes inherit security from their PVC specifications.

## Basic EmptyDir with Restricted Permissions

Configure emptyDir with proper ownership:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: restricted-emptydir
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 2000
    runAsNonRoot: true
  containers:
  - name: app
    image: nginx:1.21
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: temp-storage
      mountPath: /tmp
      readOnly: false
    - name: cache
      mountPath: /var/cache/nginx
  volumes:
  - name: temp-storage
    emptyDir:
      sizeLimit: 100Mi
  - name: cache
    emptyDir:
      sizeLimit: 500Mi
```

The fsGroup ensures proper ownership of emptyDir volumes. Size limits prevent resource exhaustion.

## Memory-Backed EmptyDir

Use memory for high-performance temporary storage:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: memory-emptydir
spec:
  securityContext:
    runAsUser: 3000
    runAsGroup: 3000
    fsGroup: 3000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
    volumeMounts:
    - name: memory-tmp
      mountPath: /tmp
    resources:
      limits:
        memory: "2Gi"
      requests:
        memory: "1Gi"
  volumes:
  - name: memory-tmp
    emptyDir:
      medium: Memory
      sizeLimit: 500Mi
```

Memory-backed emptyDir counts against container memory limits. Set sizeLimit to prevent excessive memory usage.

## Multiple Ephemeral Volumes with Different Permissions

Configure various ephemeral volumes for different purposes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-ephemeral
spec:
  securityContext:
    runAsUser: 4000
    fsGroup: 4000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: logs
      mountPath: /var/log/app
    - name: cache
      mountPath: /app/cache
    - name: config-work
      mountPath: /app/config-work
  volumes:
  - name: tmp
    emptyDir:
      sizeLimit: 100Mi
  - name: logs
    emptyDir:
      sizeLimit: 1Gi
  - name: cache
    emptyDir:
      medium: Memory
      sizeLimit: 256Mi
  - name: config-work
    emptyDir:
      sizeLimit: 50Mi
```

Each volume serves a specific purpose with appropriate size limits.

## CSI Ephemeral Volumes

Use CSI drivers for ephemeral storage:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: csi-ephemeral
spec:
  securityContext:
    runAsUser: 5000
    fsGroup: 5000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
    volumeMounts:
    - name: scratch-volume
      mountPath: /scratch
  volumes:
  - name: scratch-volume
    csi:
      driver: inline.storage.kubernetes.io
      volumeAttributes:
        size: "1Gi"
        type: "ephemeral"
```

CSI ephemeral volumes provide driver-specific features while maintaining ephemeral behavior.

## Generic Ephemeral Volumes

Use PVC templates for sophisticated ephemeral storage:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: generic-ephemeral
spec:
  securityContext:
    runAsUser: 6000
    fsGroup: 6000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    ephemeral:
      volumeClaimTemplate:
        metadata:
          labels:
            app: myapp
        spec:
          accessModes:
          - ReadWriteOnce
          resources:
            requests:
              storage: 5Gi
          storageClassName: fast-ssd
```

Generic ephemeral volumes create a PVC automatically and delete it when the pod terminates.

## Read-Only Ephemeral Volume Mounts

Mount ephemeral volumes as read-only where appropriate:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: readonly-mounts
spec:
  securityContext:
    runAsUser: 7000
    fsGroup: 7000
    runAsNonRoot: true
  initContainers:
  - name: prepare
    image: busybox
    command: ["sh", "-c", "echo 'prepared' > /data/ready"]
    volumeMounts:
    - name: shared-data
      mountPath: /data
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
    volumeMounts:
    - name: shared-data
      mountPath: /data
      readOnly: true
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: shared-data
    emptyDir:
      sizeLimit: 100Mi
  - name: tmp
    emptyDir:
      sizeLimit: 100Mi
```

Init containers write to ephemeral volumes, then main containers mount them read-only.

## Shared Ephemeral Volumes Between Containers

Share ephemeral storage securely between containers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: shared-ephemeral
spec:
  securityContext:
    fsGroup: 8000
    runAsNonRoot: true
  containers:
  - name: writer
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      while true; do
        echo "$(date): Writer data" >> /shared/data.log
        sleep 5
      done
    securityContext:
      runAsUser: 8001
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
    volumeMounts:
    - name: shared-storage
      mountPath: /shared
  - name: reader
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      while true; do
        tail -n 5 /shared/data.log
        sleep 10
      done
    securityContext:
      runAsUser: 8002
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
    volumeMounts:
    - name: shared-storage
      mountPath: /shared
      readOnly: true
  volumes:
  - name: shared-storage
    emptyDir:
      sizeLimit: 1Gi
```

Both containers access the ephemeral volume through shared fsGroup membership.

## Resource Limits on Ephemeral Volumes

Prevent resource exhaustion with proper limits:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: limited-ephemeral
spec:
  securityContext:
    runAsUser: 9000
    fsGroup: 9000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: cache
      mountPath: /cache
    resources:
      limits:
        ephemeral-storage: "2Gi"
      requests:
        ephemeral-storage: "1Gi"
  volumes:
  - name: tmp
    emptyDir:
      sizeLimit: 500Mi
  - name: cache
    emptyDir:
      sizeLimit: 1Gi
```

Both container-level ephemeral-storage limits and volume-level sizeLimit protect against abuse.

## Monitoring Ephemeral Volume Usage

Track ephemeral volume consumption:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: monitored-ephemeral
spec:
  securityContext:
    runAsUser: 10000
    fsGroup: 10000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    volumeMounts:
    - name: data
      mountPath: /data
  - name: monitor
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      while true; do
        echo "Usage: $(du -sh /data)"
        sleep 60
      done
    volumeMounts:
    - name: data
      mountPath: /data
      readOnly: true
  volumes:
  - name: data
    emptyDir:
      sizeLimit: 5Gi
```

Monitoring sidecars track ephemeral volume usage.

## Security Best Practices

Follow these practices for ephemeral volumes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-ephemeral
spec:
  securityContext:
    runAsUser: 11000
    runAsGroup: 11000
    fsGroup: 11000
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: cache
      mountPath: /app/cache
    resources:
      limits:
        ephemeral-storage: "1Gi"
        memory: "512Mi"
        cpu: "500m"
  volumes:
  - name: tmp
    emptyDir:
      sizeLimit: 256Mi
  - name: cache
    emptyDir:
      sizeLimit: 512Mi
```

Combine read-only root filesystems, fsGroup, size limits, and resource constraints.

## Conclusion

Ephemeral volumes provide necessary temporary storage while maintaining security when properly configured. Use fsGroup to control ownership, set sizeLimit to prevent resource exhaustion, and combine with read-only root filesystems for defense in depth. Choose appropriate ephemeral volume types based on performance needs and security requirements. Memory-backed emptyDir offers speed for small temporary data, while disk-backed emptyDir and generic ephemeral volumes suit larger datasets. Always run containers as non-root users, drop unnecessary capabilities, and prevent privilege escalation. Monitor ephemeral volume usage to detect anomalies that might indicate security issues or application problems. Properly configured ephemeral volumes enable applications to function while maintaining strong security boundaries.

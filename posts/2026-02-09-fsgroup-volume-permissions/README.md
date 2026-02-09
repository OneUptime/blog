# How to configure fsGroup for managing volume permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Storage, Volume Permissions, Pod Security

Description: Master fsGroup configuration in Kubernetes to control volume ownership and permissions, enabling secure shared storage access across container processes with proper group-based access control.

---

Managing file permissions in containerized environments presents unique challenges. Containers run as specific users, but volumes might be created with different ownership. The `fsGroup` security context setting solves this problem by automatically setting group ownership on mounted volumes, ensuring containers can access their data regardless of the original file ownership.

## Understanding fsGroup Behavior

When you set `fsGroup` in a pod's security context, Kubernetes changes the group ownership of all files in mounted volumes to match the specified group ID. Additionally, the setgid bit is set on directories, ensuring new files inherit the group ownership.

This automatic permission management happens before containers start. The kubelet recursively walks through volume contents, changing ownership as needed. For large volumes, this initial setup can take significant time.

## Basic fsGroup Configuration

Here's a simple example demonstrating fsGroup usage:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fsgroup-demo
spec:
  securityContext:
    fsGroup: 2000
    runAsUser: 1000
    runAsNonRoot: true
  containers:
  - name: app
    image: busybox
    command: ["sh", "-c", "ls -la /data && sleep 3600"]
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    emptyDir: {}
```

In this configuration, the container runs as user 1000, but all files in `/data` will have group ownership of 2000. The running process belongs to this group and can read/write files accordingly.

## Verifying fsGroup Application

You can verify that fsGroup correctly applies by checking file ownership:

```bash
# Exec into the pod
kubectl exec -it fsgroup-demo -- sh

# Check the group ownership
ls -lan /data
# Shows: drwxrwsr-x 2 root 2000 ...

# Check process groups
id
# Shows: uid=1000 gid=0(root) groups=2000

# Create a file and verify its group
touch /data/test.txt
ls -lan /data/test.txt
# Shows: -rw-r--r-- 1 1000 2000 0 ... test.txt
```

Notice that new files automatically get group ID 2000 thanks to the setgid bit on the directory.

## Sharing Volumes Between Multiple Containers

fsGroup enables secure volume sharing between containers in the same pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: shared-volume
spec:
  securityContext:
    fsGroup: 3000
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
      runAsUser: 1000
      runAsNonRoot: true
    volumeMounts:
    - name: shared
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
      runAsUser: 2000
      runAsNonRoot: true
    volumeMounts:
    - name: shared
      mountPath: /shared
  volumes:
  - name: shared
    emptyDir: {}
```

Both containers run as different users (1000 and 2000) but can access the shared volume because both belong to group 3000.

## Using fsGroup with Persistent Volumes

fsGroup is particularly useful with persistent volumes where you might not control the initial file ownership:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
---
apiVersion: v1
kind: Pod
metadata:
  name: app-with-pv
spec:
  securityContext:
    fsGroup: 5000
    fsGroupChangePolicy: OnRootMismatch
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      runAsUser: 5000
      runAsNonRoot: true
    volumeMounts:
    - name: data
      mountPath: /app/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-data
```

The `fsGroupChangePolicy: OnRootMismatch` setting optimizes permission changes. Instead of recursively changing ownership every time, Kubernetes only modifies permissions when the root directory's group doesn't match fsGroup.

## fsGroupChangePolicy Options

Kubernetes offers two fsGroupChangePolicy values that control permission change behavior:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fsgroupchange-demo
spec:
  securityContext:
    fsGroup: 4000
    # Always: recursively change ownership every time (default for backward compatibility)
    # OnRootMismatch: only change if root dir group doesn't match
    fsGroupChangePolicy: OnRootMismatch
  containers:
  - name: app
    image: nginx:1.21
    volumeMounts:
    - name: web-content
      mountPath: /usr/share/nginx/html
  volumes:
  - name: web-content
    persistentVolumeClaim:
      claimName: web-pvc
```

Using `OnRootMismatch` dramatically improves pod startup time for volumes with many files. After the initial permission change, subsequent pod restarts skip the recursive walk.

## Combining fsGroup with runAsUser

The interaction between fsGroup and runAsUser determines effective permissions:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: user-group-demo
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 2000
    runAsNonRoot: true
  containers:
  - name: app
    image: busybox
    command: ["sh", "-c", "id && ls -la /data && sleep 3600"]
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    emptyDir: {}
```

The process runs as user 1000, primary group 1000, but also belongs to supplemental group 2000. Volume files have group 2000, so the process can access them through group permissions.

## Handling Permission Denied Errors

When applications fail with permission errors despite fsGroup configuration, debug systematically:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-permissions
spec:
  securityContext:
    fsGroup: 3000
    runAsUser: 3000
    runAsNonRoot: true
  containers:
  - name: debug
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      echo "=== Process Identity ==="
      id

      echo "=== Volume Permissions ==="
      ls -lan /data

      echo "=== Test Write Access ==="
      touch /data/test.txt && echo "Write successful" || echo "Write failed"

      echo "=== Check Mount Options ==="
      mount | grep /data

      sleep 3600
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: test-pvc
```

This debug pod helps identify whether the issue is with user/group mapping, volume mount options, or SELinux contexts.

## fsGroup with Different Volume Types

Different volume types interact with fsGroup in specific ways:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volume-types-demo
spec:
  securityContext:
    fsGroup: 5000
  containers:
  - name: app
    image: busybox
    command: ["sleep", "3600"]
    securityContext:
      runAsUser: 5000
      runAsNonRoot: true
    volumeMounts:
    - name: emptydir
      mountPath: /emptydir
    - name: configmap
      mountPath: /config
    - name: secret
      mountPath: /secret
  volumes:
  - name: emptydir
    emptyDir: {}  # fsGroup applies
  - name: configmap
    configMap:
      name: my-config  # fsGroup applies to directory, not individual files
  - name: secret
    secret:
      secretName: my-secret  # fsGroup applies to directory, not individual files
```

emptyDir volumes have their ownership fully controlled by fsGroup. ConfigMaps and Secrets have readonly files, but the mount directory gets the fsGroup ownership.

## Security Considerations with fsGroup

fsGroup affects security boundaries. Using the same fsGroup across multiple pods allows them to share data:

```yaml
# Pod 1 - writes data
apiVersion: v1
kind: Pod
metadata:
  name: writer-pod
spec:
  securityContext:
    fsGroup: 8000
  containers:
  - name: writer
    image: busybox
    command: ["sh", "-c", "echo sensitive > /data/file.txt && sleep 3600"]
    securityContext:
      runAsUser: 8001
    volumeMounts:
    - name: shared
      mountPath: /data
  volumes:
  - name: shared
    persistentVolumeClaim:
      claimName: shared-pvc

---
# Pod 2 - reads data
apiVersion: v1
kind: Pod
metadata:
  name: reader-pod
spec:
  securityContext:
    fsGroup: 8000  # Same fsGroup allows access
  containers:
  - name: reader
    image: busybox
    command: ["sh", "-c", "cat /data/file.txt && sleep 3600"]
    securityContext:
      runAsUser: 8002  # Different user, but same group
    volumeMounts:
    - name: shared
      mountPath: /data
  volumes:
  - name: shared
    persistentVolumeClaim:
      claimName: shared-pvc
```

Treat fsGroup as a shared secret. Pods with the same fsGroup can access each other's files on shared volumes.

## Performance Impact of fsGroup

For volumes with many files, fsGroup permission changes impact pod startup time:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: large-volume-pod
spec:
  securityContext:
    fsGroup: 9000
    # Use OnRootMismatch for better performance
    fsGroupChangePolicy: OnRootMismatch
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      runAsUser: 9000
    volumeMounts:
    - name: large-data
      mountPath: /data
  volumes:
  - name: large-data
    persistentVolumeClaim:
      claimName: large-pvc
```

Monitor pod startup times. If they are excessive, check if permission changes are the bottleneck. Consider pre-setting permissions or using CSI drivers that support fsGroup delegation.

## CSI Driver Support for fsGroup

Modern CSI drivers can delegate fsGroup management to the storage system rather than having kubelet change permissions:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: csi-fsgroup
provisioner: csi.example.com
volumeBindingMode: WaitForFirstConsumer
parameters:
  fsType: ext4
  # CSI driver handles fsGroup
  csi.storage.k8s.io/fsgroup-policy: "File"
```

When the CSI driver supports fsGroup delegation, it sets permissions at mount time rather than through recursive kubelet changes. This dramatically improves performance for large volumes.

## Conclusion

The fsGroup setting provides essential functionality for managing volume permissions in Kubernetes. By automatically configuring group ownership on mounted volumes, it enables secure data sharing between containers while maintaining proper access controls. Understanding fsGroup interaction with runAsUser, supplementalGroups, and different volume types helps you design secure multi-container applications. Use fsGroupChangePolicy to optimize performance for large volumes, and remember that fsGroup values act as shared credentials for volume access. Properly configured fsGroup settings ensure your applications can access their data while maintaining security boundaries appropriate for your environment.

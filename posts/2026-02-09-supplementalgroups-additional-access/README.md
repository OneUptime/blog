# How to implement supplementalGroups for additional group access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Access Control, Group Permissions, Pod Security

Description: Learn how to use supplementalGroups in Kubernetes to grant containers membership in multiple groups, enabling fine-grained access control for shared resources and volumes.

---

Linux systems support multiple group memberships for processes, allowing fine-grained access control without granting excessive privileges. In Kubernetes, `supplementalGroups` lets you add containers to additional groups beyond their primary group, enabling access to shared resources, volumes, and services that use group-based permissions.

## Understanding Supplemental Groups

Every process in Linux has a primary group ID (GID) and can belong to multiple supplemental groups. When the kernel checks file permissions, it verifies both the user ID and all group memberships. This allows sophisticated access control where different resources require different group memberships.

In Kubernetes, you set the primary group with `runAsGroup` and add supplemental groups with the `supplementalGroups` array. Containers in the pod automatically belong to all specified groups.

## Basic supplementalGroups Configuration

Here's a simple example showing how to configure supplemental groups:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: supplemental-demo
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
    supplementalGroups: [2000, 3000, 4000]
    runAsNonRoot: true
  containers:
  - name: app
    image: busybox
    command: ["sh", "-c", "id && sleep 3600"]
```

When you check the process identity, you'll see:

```bash
kubectl exec supplemental-demo -- id
# uid=1000 gid=1000 groups=1000,2000,3000,4000
```

The process runs as user 1000 with primary group 1000, but also belongs to groups 2000, 3000, and 4000.

## Multi-Resource Access Patterns

Supplemental groups enable access to multiple resources with different group requirements:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-resource-access
spec:
  securityContext:
    runAsUser: 5000
    runAsGroup: 5000
    fsGroup: 6000
    supplementalGroups: [7000, 8000]
    runAsNonRoot: true
  containers:
  - name: app
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      echo "Process identity:"
      id

      echo "Testing access to different volumes:"
      ls -la /data1 /data2 /data3

      sleep 3600
    volumeMounts:
    - name: data1
      mountPath: /data1  # Group 6000 (fsGroup)
    - name: data2
      mountPath: /data2  # Group 7000 (supplementalGroup)
    - name: data3
      mountPath: /data3  # Group 8000 (supplementalGroup)
  volumes:
  - name: data1
    emptyDir: {}
  - name: data2
    persistentVolumeClaim:
      claimName: group-7000-pvc
  - name: data3
    persistentVolumeClaim:
      claimName: group-8000-pvc
```

The container can access all three volumes because it belongs to groups 6000, 7000, and 8000 through fsGroup and supplementalGroups.

## Sharing Resources Between Different Pods

Supplemental groups enable controlled sharing between pods that run as different users:

```yaml
# Pod A - Database writer
apiVersion: v1
kind: Pod
metadata:
  name: db-writer
spec:
  securityContext:
    runAsUser: 10000
    runAsGroup: 10000
    supplementalGroups: [20000]  # Shared group
    runAsNonRoot: true
  containers:
  - name: writer
    image: postgres:13
    volumeMounts:
    - name: db-data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: db-data
    persistentVolumeClaim:
      claimName: database-pvc

---
# Pod B - Backup service
apiVersion: v1
kind: Pod
metadata:
  name: db-backup
spec:
  securityContext:
    runAsUser: 11000
    runAsGroup: 11000
    supplementalGroups: [20000]  # Same shared group
    runAsNonRoot: true
  containers:
  - name: backup
    image: backup-tool:1.0
    command: ["sh", "-c"]
    args:
    - |
      # Can read database files through group 20000
      tar czf /backups/db-$(date +%Y%m%d).tar.gz /data
    volumeMounts:
    - name: db-data
      mountPath: /data
      readOnly: true
    - name: backups
      mountPath: /backups
  volumes:
  - name: db-data
    persistentVolumeClaim:
      claimName: database-pvc
  - name: backups
    persistentVolumeClaim:
      claimName: backup-pvc
```

Both pods run as different users but share group 20000, allowing the backup pod to read database files.

## Combining with Host Path Volumes

When mounting host paths that have specific group ownership, supplemental groups provide access:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: host-access
spec:
  securityContext:
    runAsUser: 12000
    runAsGroup: 12000
    supplementalGroups: [44, 999]  # Common host groups
    runAsNonRoot: true
  containers:
  - name: monitoring
    image: monitoring-agent:1.0
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
      readOnly: true
    - name: logs
      mountPath: /var/log/host
      readOnly: true
  volumes:
  - name: docker-sock
    hostPath:
      path: /var/run/docker.sock
      type: Socket
  - name: logs
    hostPath:
      path: /var/log
      type: Directory
```

Group 44 might be required for accessing certain log files, and group 999 for the Docker socket. The container belongs to both groups and can access both resources.

## Limiting Supplemental Groups with Pod Security

Pod Security Standards restrict which supplemental groups pods can use:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: restricted-namespace
  labels:
    pod-security.kubernetes.io/enforce: restricted
---
apiVersion: v1
kind: Pod
metadata:
  name: compliant-supplemental
  namespace: restricted-namespace
spec:
  securityContext:
    runAsUser: 15000
    runAsGroup: 15000
    runAsNonRoot: true
    supplementalGroups: [15001, 15002]  # Must be > 0
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

Restricted standard requires all group IDs to be non-zero, preventing use of privileged groups.

## Dynamic Group Assignment with Init Containers

Init containers can prepare volumes with specific group ownership that main containers access through supplemental groups:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dynamic-groups
spec:
  initContainers:
  - name: setup
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      # Create directories with specific group ownership
      mkdir -p /data/group-30000 /data/group-31000
      chown 1000:30000 /data/group-30000
      chown 1000:31000 /data/group-31000
      chmod 770 /data/group-30000 /data/group-31000
    securityContext:
      runAsUser: 0  # Init container might run as root
    volumeMounts:
    - name: shared-data
      mountPath: /data
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      runAsUser: 1000
      runAsGroup: 1000
      supplementalGroups: [30000, 31000]
      runAsNonRoot: true
    volumeMounts:
    - name: shared-data
      mountPath: /data
  volumes:
  - name: shared-data
    emptyDir: {}
```

The init container creates directories with specific group ownership. The main container's supplemental groups allow it to access these directories.

## Troubleshooting Group Access Issues

When group-based access fails, debug systematically:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-groups
spec:
  securityContext:
    runAsUser: 16000
    runAsGroup: 16000
    supplementalGroups: [17000, 18000]
    runAsNonRoot: true
  containers:
  - name: debug
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      echo "=== Process Identity ==="
      id

      echo "=== Group Memberships ==="
      groups

      echo "=== Volume Permissions ==="
      ls -lan /data

      echo "=== Test Access ==="
      for dir in /data/*; do
        if [ -d "$dir" ]; then
          echo "Testing $dir:"
          touch "$dir/test.txt" 2>&1 && rm "$dir/test.txt" && echo "  Write: OK" || echo "  Write: FAILED"
        fi
      done

      sleep 3600
    volumeMounts:
    - name: test-data
      mountPath: /data
  volumes:
  - name: test-data
    emptyDir: {}
```

This debug pod helps identify mismatches between required groups and actual group memberships.

## Security Implications

Supplemental groups expand access permissions, so use them judiciously:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: minimal-groups
spec:
  securityContext:
    runAsUser: 19000
    runAsGroup: 19000
    # Only add supplemental groups that are truly needed
    supplementalGroups: [19100]  # Single additional group
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: app-data
      mountPath: /app/data
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: app-data
    emptyDir: {}
  - name: tmp
    emptyDir: {}
```

Follow the principle of least privilege. Only grant supplemental group membership when the application legitimately needs access to group-protected resources.

## Documentation and Audit

Document why pods need specific supplemental groups:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: documented-groups
  annotations:
    supplemental-groups/20000: "Database shared access group"
    supplemental-groups/20100: "Log aggregation group"
    security-review-date: "2026-01-15"
    security-reviewer: "security-team@company.com"
spec:
  securityContext:
    runAsUser: 21000
    runAsGroup: 21000
    supplementalGroups: [20000, 20100]
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    # ... container spec ...
```

Regular audits should review supplemental group assignments to ensure they remain necessary and appropriate.

## Conclusion

Supplemental groups provide fine-grained access control in Kubernetes environments where containers need to access multiple resources with different group requirements. By adding containers to multiple groups, you can share resources between pods securely while maintaining proper access boundaries. Use supplemental groups to implement shared access patterns, enable backup processes, and integrate with host resources that use group-based permissions. Remember that each supplemental group expands a container's permissions, so follow the principle of least privilege and regularly review group assignments. Combined with proper volume configuration and security context settings, supplemental groups enable sophisticated access control patterns that balance security with functionality.

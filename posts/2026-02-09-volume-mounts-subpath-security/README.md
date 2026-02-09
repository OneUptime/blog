# How to configure volume mounts with subPath and security considerations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Volume Mounts, Security, SubPath

Description: Learn how to safely use subPath in Kubernetes volume mounts to isolate data within shared volumes while understanding and mitigating security risks including symlink attacks and container escapes.

---

The subPath field in volume mounts lets containers access specific subdirectories within volumes rather than the entire volume. While useful for sharing volumes between containers or isolating data, subPath has security implications. Understanding these risks and implementing proper safeguards ensures secure volume mount configurations.

## Understanding subPath

SubPath specifies a path within the volume to mount. Instead of mounting the entire volume at a mount point, Kubernetes mounts only the specified subdirectory. This enables multiple containers to share a volume while accessing different paths within it.

The subPath feature uses bind mounts internally. Kubernetes resolves the subPath at pod startup and creates a bind mount. This resolution process has historically had security vulnerabilities related to symlink attacks.

## Basic subPath Usage

Mount specific subdirectories:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: subpath-demo
spec:
  securityContext:
    runAsUser: 1000
    fsGroup: 2000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    volumeMounts:
    - name: data
      mountPath: /app/logs
      subPath: app-logs
    - name: data
      mountPath: /app/cache
      subPath: app-cache
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: shared-data
```

Both mount points access the same volume but different subdirectories within it.

## Sharing Volumes Between Containers

Use subPath to isolate container data:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: shared-volume
spec:
  securityContext:
    fsGroup: 3000
    runAsNonRoot: true
  containers:
  - name: web
    image: nginx:1.21
    securityContext:
      runAsUser: 101
    volumeMounts:
    - name: shared
      mountPath: /usr/share/nginx/html
      subPath: web-content
  - name: content-updater
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      while true; do
        echo "Updated: $(date)" > /content/index.html
        sleep 60
      done
    securityContext:
      runAsUser: 1000
    volumeMounts:
    - name: shared
      mountPath: /content
      subPath: web-content
  volumes:
  - name: shared
    emptyDir: {}
```

Both containers access the same subdirectory for content sharing.

## Security Risks with subPath

SubPath has historical vulnerabilities related to symlink attacks:

```yaml
# VULNERABLE: subPath with writable parent directory
apiVersion: v1
kind: Pod
metadata:
  name: vulnerable-subpath
spec:
  containers:
  - name: app
    image: myapp:1.0
    volumeMounts:
    - name: data
      mountPath: /app/data
      subPath: user-data
      # Risk: If attacker can write to volume root, they can
      # create symlink at user-data pointing elsewhere
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: shared-pvc
```

Attackers who can modify the volume can create symlinks that escape the intended directory.

## Safer Alternative: subPathExpr

Use subPathExpr with downward API to avoid static paths:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: subpath-expr-demo
spec:
  securityContext:
    runAsUser: 4000
    fsGroup: 4000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    env:
    - name: POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name
    volumeMounts:
    - name: logs
      mountPath: /var/log/app
      subPathExpr: $(POD_NAME)/logs
  volumes:
  - name: logs
    persistentVolumeClaim:
      claimName: app-logs
```

SubPathExpr resolves environment variables, enabling dynamic paths.

## Read-Only Mounts with subPath

Reduce risk by mounting subPaths as read-only:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: readonly-subpath
spec:
  securityContext:
    runAsUser: 5000
    runAsNonRoot: true
  initContainers:
  - name: setup
    image: busybox
    command: ["sh", "-c", "echo 'config' > /data/config/app.conf"]
    volumeMounts:
    - name: data
      mountPath: /data
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
    volumeMounts:
    - name: data
      mountPath: /app/config
      subPath: config
      readOnly: true
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: data
    emptyDir: {}
  - name: tmp
    emptyDir: {}
```

Init container writes configuration, main container mounts it read-only.

## Avoiding subPath for Security-Critical Mounts

For sensitive data, avoid subPath entirely:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: no-subpath
spec:
  securityContext:
    runAsUser: 6000
    fsGroup: 6000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    volumeMounts:
    # Don't use subPath for secrets or sensitive config
    - name: secrets
      mountPath: /app/secrets
      readOnly: true
    # Use separate volumes instead of subPath
    - name: logs
      mountPath: /app/logs
    - name: cache
      mountPath: /app/cache
  volumes:
  - name: secrets
    secret:
      secretName: app-secrets
  - name: logs
    emptyDir: {}
  - name: cache
    emptyDir: {}
```

Separate volumes provide better isolation than subPath.

## Monitoring subPath Usage

Audit subPath configurations:

```bash
# Find all pods using subPath
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] |
    select(.spec.containers[].volumeMounts[]?.subPath != null) |
    "\(.metadata.namespace)/\(.metadata.name)"'

# Check for writable subPath mounts
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] |
    select(.spec.containers[].volumeMounts[] |
      .subPath != null and .readOnly != true) |
    "\(.metadata.namespace)/\(.metadata.name)"'
```

Regular audits identify potentially risky configurations.

## ConfigMap and Secret Mounts with subPath

SubPath with ConfigMaps and Secrets has specific considerations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: configmap-subpath
spec:
  securityContext:
    runAsUser: 7000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    volumeMounts:
    - name: config
      mountPath: /app/config/app.conf
      subPath: app.conf
      readOnly: true
    # Note: ConfigMap updates don't propagate to subPath mounts
  volumes:
  - name: config
    configMap:
      name: app-config
```

ConfigMap updates do not propagate to subPath mounts. The pod must restart to see changes.

## Projected Volumes Instead of subPath

Use projected volumes for safer multi-source mounting:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: projected-demo
spec:
  securityContext:
    runAsUser: 8000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    volumeMounts:
    - name: combined-config
      mountPath: /config
      readOnly: true
  volumes:
  - name: combined-config
    projected:
      sources:
      - configMap:
          name: app-config
      - secret:
          name: app-secret
      - downwardAPI:
          items:
          - path: "labels"
            fieldRef:
              fieldPath: metadata.labels
```

Projected volumes combine multiple sources without subPath risks.

## Best Practices

Follow these practices when using subPath:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: subpath-best-practices
  annotations:
    subpath-justification: "Required for multi-tenant log aggregation"
    security-review: "2026-02-09"
spec:
  securityContext:
    runAsUser: 9000
    runAsGroup: 9000
    fsGroup: 9000
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
    - name: logs
      mountPath: /app/logs
      subPathExpr: $(POD_NAME)
      # Use subPathExpr instead of subPath
      # Mount read-only when possible
      # Document why subPath is necessary
    - name: tmp
      mountPath: /tmp
    env:
    - name: POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name
  volumes:
  - name: logs
    persistentVolumeClaim:
      claimName: app-logs
  - name: tmp
    emptyDir: {}
```

Document subPath usage and prefer alternatives when possible.

## Testing subPath Security

Verify subPath configurations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-subpath
spec:
  containers:
  - name: test
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      # Check mounted path
      ls -la /app/data
      pwd

      # Verify cannot access parent
      cd /app/data/..  # Should fail or show isolation

      # Verify path is what we expect
      realpath /app/data

      sleep 3600
    volumeMounts:
    - name: data
      mountPath: /app/data
      subPath: test-data
  volumes:
  - name: data
    emptyDir: {}
```

Ensure subPath isolation works as expected.

## Migration Away from subPath

Move away from subPath when possible:

```yaml
# Instead of using subPath
# Old approach:
# volumeMounts:
# - name: shared
#   mountPath: /app/logs
#   subPath: logs

# New approach: Use separate volumes
volumeMounts:
- name: app-logs
  mountPath: /app/logs

volumes:
- name: app-logs
  emptyDir: {}
```

Separate volumes provide better security and clearer intent.

## Conclusion

While subPath enables useful volume sharing patterns, it introduces security risks including potential symlink attacks and container escape vectors. Use subPath only when necessary and prefer alternatives like separate volumes, projected volumes, or mounting entire volumes with application-level path management. When subPath is required, use subPathExpr instead of static subPath, mount as read-only whenever possible, and ensure strong isolation through security context settings. Regularly audit subPath usage and document justification for each use. Combine subPath mounts with other security measures like running as non-root, read-only root filesystems, and seccomp profiles. The safest approach is avoiding subPath entirely for security-critical data and using separate volumes to achieve isolation without the risks inherent in subPath resolution.

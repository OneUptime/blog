# How to Run Containers as Non-Root Users with runAsUser and runAsGroup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Docker

Description: Learn how to configure Kubernetes containers to run as non-root users using runAsUser and runAsGroup security context settings for enhanced container security.

---

Running containers as the root user is one of the most common security misconfigurations in Kubernetes deployments. When containers run as root, a vulnerability that allows container escape could grant an attacker root-level access to the host system. Configuring containers to run as non-root users through `runAsUser` and `runAsGroup` significantly reduces this risk.

This comprehensive guide covers how to implement non-root containers across various scenarios and application types.

## Why Non-Root Containers Matter

When a container runs as root (UID 0), any process inside the container has root privileges within the container's namespace. If an attacker exploits a vulnerability and escapes the container, they may gain elevated privileges on the host.

Running as non-root provides multiple security benefits:

- Limits the impact of container escape vulnerabilities
- Prevents accidental or malicious modification of system files
- Reduces the effectiveness of privilege escalation exploits
- Aligns with security compliance requirements and best practices

## Prerequisites

Before implementing non-root containers, ensure you have:

- A Kubernetes cluster (any recent version)
- kubectl configured with appropriate access
- Understanding of Linux users and file permissions
- Container images that support non-root execution

## Basic Non-Root Configuration

The simplest way to run a container as non-root is using `runAsUser`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: non-root-pod
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
  containers:
  - name: app
    image: nginx:1.25
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    emptyDir: {}
```

In this configuration:

- `runAsUser: 1000` runs the container process as UID 1000
- `runAsGroup: 3000` sets the primary group ID to 3000
- `fsGroup: 2000` sets the group ownership of mounted volumes to 2000

Any files created in `/data` will be owned by UID 1000 and GID 2000.

## Pod-Level vs Container-Level Settings

You can set security context at the pod level (applies to all containers) or per container:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mixed-security
spec:
  # Pod-level defaults
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
  containers:
  - name: app
    image: myapp:latest
    # Inherits pod-level settings

  - name: special-app
    image: specialapp:latest
    securityContext:
      runAsUser: 2000  # Override for this container
      runAsGroup: 2000
```

Container-level settings override pod-level settings, allowing flexibility when different containers need different user contexts.

## Enforcing Non-Root with runAsNonRoot

The `runAsNonRoot` field provides an additional safety check:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure
  template:
    metadata:
      labels:
        app: secure
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
      - name: app
        image: myapp:latest
```

With `runAsNonRoot: true`, Kubernetes will refuse to start the container if it would run as UID 0, even if the image's default user is root. This provides defense-in-depth by catching misconfigurations.

## Handling Images That Default to Root

Many container images default to running as root. You can override this:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: override-root
spec:
  containers:
  - name: nginx
    image: nginx:1.25  # Defaults to root
    securityContext:
      runAsUser: 101  # nginx user UID
      runAsGroup: 101
      allowPrivilegeEscalation: false
```

However, some images may not work correctly when run as non-root without modification. Check the image documentation or test thoroughly.

## Building Non-Root Compatible Images

To ensure images work properly as non-root, follow these practices in your Dockerfile:

```dockerfile
FROM node:20-alpine

# Create a non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set up application directory with correct permissions
WORKDIR /app
COPY --chown=appuser:appgroup package*.json ./
RUN npm ci --only=production

COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
```

This Dockerfile:

- Creates a dedicated non-root user and group
- Sets correct file ownership using `--chown`
- Switches to the non-root user with `USER`
- Exposes a non-privileged port (>1024)

For applications that need to bind to privileged ports (<1024), use capabilities instead:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    securityContext:
      runAsUser: 101
      runAsNonRoot: true
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE
```

## Managing File Permissions with fsGroup

The `fsGroup` field ensures that mounted volumes are accessible to non-root users:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volume-permissions
spec:
  securityContext:
    runAsUser: 1000
    fsGroup: 2000
  containers:
  - name: app
    image: busybox
    command: ["sh", "-c", "ls -la /data && sleep 3600"]
    volumeMounts:
    - name: storage
      mountPath: /data
  volumes:
  - name: storage
    persistentVolumeClaim:
      claimName: app-data
```

Kubernetes will change the group ownership of `/data` and its contents to GID 2000, and set the setgid bit so new files inherit this group.

Verify the permissions:

```bash
kubectl exec volume-permissions -- ls -la /data
# Output shows group ownership as 2000
```

## Handling Permission Issues

When transitioning to non-root, you may encounter permission errors:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-permissions
spec:
  securityContext:
    runAsUser: 1000
    fsGroup: 1000
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: config
      mountPath: /etc/app
    - name: cache
      mountPath: /var/cache/app
  volumes:
  - name: config
    configMap:
      name: app-config
      defaultMode: 0644  # Readable by user and group
  - name: cache
    emptyDir: {}
```

Common issues and solutions:

**Problem**: Application can't write to its own directories
**Solution**: Use `fsGroup` or init containers to set permissions

**Problem**: ConfigMaps/Secrets have restrictive permissions
**Solution**: Set `defaultMode` to allow group read access

**Problem**: Application tries to write to read-only locations
**Solution**: Mount writable emptyDir volumes for cache/temp directories

## Using Init Containers for Permission Setup

When you need to set specific permissions, use init containers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-permissions
spec:
  initContainers:
  - name: setup
    image: busybox
    command:
    - sh
    - -c
    - |
      chown -R 1000:1000 /data
      chmod -R 755 /data
    volumeMounts:
    - name: data
      mountPath: /data
    securityContext:
      runAsUser: 0  # Init container runs as root
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      runAsUser: 1000
      runAsNonRoot: true
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-data
```

The init container runs as root to set up permissions, then the application container runs as non-root.

## StatefulSet Considerations

StatefulSets with persistent volumes need careful permission handling:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      securityContext:
        runAsUser: 999  # postgres user
        runAsGroup: 999
        fsGroup: 999
      initContainers:
      - name: init-permissions
        image: busybox
        command:
        - sh
        - -c
        - |
          chown -R 999:999 /var/lib/postgresql/data
          chmod 700 /var/lib/postgresql/data
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        securityContext:
          runAsUser: 0
      containers:
      - name: postgres
        image: postgres:16
        securityContext:
          runAsUser: 999
          runAsNonRoot: true
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

## Policy Enforcement

Enforce non-root containers cluster-wide using admission policies:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-non-root
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["pods"]
  validations:
  - expression: |
      has(object.spec.securityContext.runAsNonRoot) &&
      object.spec.securityContext.runAsNonRoot == true ||
      object.spec.containers.all(c,
        has(c.securityContext.runAsNonRoot) &&
        c.securityContext.runAsNonRoot == true
      )
    message: "Containers must explicitly set runAsNonRoot: true"

  - expression: |
      object.spec.containers.all(c,
        has(c.securityContext.runAsUser) &&
        c.securityContext.runAsUser != 0
      )
    message: "Containers must not run as UID 0"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: require-non-root-binding
spec:
  policyName: require-non-root
  validationActions: ["Deny"]
```

## Testing Non-Root Configurations

Verify that containers are running with correct UIDs:

```bash
# Check running user in a pod
kubectl exec <pod-name> -- id

# Expected output:
# uid=1000 gid=1000 groups=2000

# Check process ownership
kubectl exec <pod-name> -- ps aux

# Verify file ownership on volumes
kubectl exec <pod-name> -- ls -la /data
```

## Common Pitfalls

**Mistake**: Setting `runAsUser` without verifying image compatibility
**Fix**: Test images thoroughly before deploying to production

**Mistake**: Forgetting to set `fsGroup` for shared volumes
**Fix**: Always specify `fsGroup` when using persistent volumes

**Mistake**: Init containers running as non-root can't set permissions
**Fix**: Init containers may need to run as root for permission setup

**Mistake**: ConfigMaps with mode 0600 are unreadable by application
**Fix**: Set appropriate `defaultMode` on ConfigMap volumes

## Conclusion

Running containers as non-root users is a fundamental security practice that significantly reduces the risk of container escape attacks. By properly configuring `runAsUser`, `runAsGroup`, and `fsGroup`, you can ensure that containers operate with minimal privileges while maintaining full functionality.

Start by building or selecting container images that support non-root execution, test thoroughly in development environments, and enforce non-root requirements through admission policies. Monitor your deployments with OneUptime to ensure containers maintain proper security contexts throughout their lifecycle.

# How to use runAsUser and runAsGroup for specific user context

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, User Context, Pod Security, Access Control

Description: Master runAsUser and runAsGroup configuration in Kubernetes to control the user and group context of container processes, preventing root access and implementing least privilege principles.

---

Running containers as root represents a significant security risk. If attackers compromise a container running as root, they have extensive privileges within the container and potentially on the host system. The `runAsUser` and `runAsGroup` security context fields let you explicitly specify the user and group context for container processes, enforcing least privilege principles.

## Understanding User and Group Context

In Linux, every process runs with a specific user ID (UID) and group ID (GID). These IDs determine what files the process can access, what operations it can perform, and what system resources it can use. By default, many container images run processes as root (UID 0), which grants unnecessary privileges.

Kubernetes lets you override the user and group at both pod and container levels. Container-level settings override pod-level settings, allowing different containers in the same pod to run as different users.

## Basic runAsUser Configuration

Here's how to run a container as a specific non-root user:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nonroot-demo
spec:
  securityContext:
    runAsUser: 1000
    runAsNonRoot: true
  containers:
  - name: app
    image: nginx:1.21
    command: ["sh", "-c", "whoami && id && nginx -g 'daemon off;'"]
```

This configuration forces the container to run as user 1000. The `runAsNonRoot: true` setting provides an additional safety check, refusing to start the container if it tries to run as root.

## Configuring Both User and Group

Specify both user and group for complete control over process identity:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: user-group-demo
spec:
  securityContext:
    runAsUser: 2000
    runAsGroup: 3000
    runAsNonRoot: true
  containers:
  - name: app
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      echo "Process identity:"
      id
      echo "Creating a file:"
      touch /tmp/test.txt
      ls -l /tmp/test.txt
      sleep 3600
```

The process runs as user 2000 with primary group 3000. Files created by the process are owned by user 2000 and group 3000.

## Per-Container User Configuration

Different containers in the same pod can run as different users:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-user-pod
spec:
  securityContext:
    runAsNonRoot: true
    fsGroup: 5000
  containers:
  - name: web-server
    image: nginx:1.21
    securityContext:
      runAsUser: 101  # nginx user
      runAsGroup: 101
    ports:
    - containerPort: 8080
  - name: log-processor
    image: busybox
    securityContext:
      runAsUser: 2000
      runAsGroup: 2000
    command: ["sh", "-c"]
    args:
    - |
      while true; do
        echo "Processing logs as $(id)"
        sleep 10
      done
```

The nginx container runs as user 101, while the log processor runs as user 2000. Both belong to the shared fsGroup 5000 for volume access.

## Verifying User Context

Always verify that containers run with the expected user context:

```bash
# Check the process user
kubectl exec multi-user-pod -c web-server -- id
# uid=101(nginx) gid=101(nginx) groups=5000

kubectl exec multi-user-pod -c log-processor -- id
# uid=2000 gid=2000 groups=5000

# Check file ownership
kubectl exec multi-user-pod -c web-server -- sh -c "touch /tmp/web.txt && ls -l /tmp/web.txt"
# -rw-r--r-- 1 101 101 0 ... /tmp/web.txt

# Verify the process cannot become root
kubectl exec multi-user-pod -c web-server -- su
# su: must be run from a terminal (or fails due to permissions)
```

These checks confirm the security context configuration is working correctly.

## Building Images for Non-Root Execution

Many official images expect to run as root. Build custom images designed for non-root execution:

```dockerfile
FROM node:18-alpine

# Create a non-root user
RUN addgroup -g 1000 appgroup && \
    adduser -D -u 1000 -G appgroup appuser

# Set up application directory
WORKDIR /app
COPY --chown=appuser:appgroup package*.json ./
RUN npm ci --only=production

COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

# Application listens on non-privileged port
EXPOSE 3000

CMD ["node", "server.js"]
```

This Dockerfile creates a dedicated user, sets proper file ownership, and explicitly switches to the non-root user before starting the application.

## Handling File Permissions

When running as non-root, ensure the user can access necessary files:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: permissions-demo
spec:
  initContainers:
  - name: setup
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      # Create directories and set ownership
      mkdir -p /data/app /data/logs
      chown -R 3000:3000 /data/app /data/logs
      chmod -R 755 /data/app /data/logs
    securityContext:
      runAsUser: 0  # Init container runs as root to set up permissions
    volumeMounts:
    - name: app-data
      mountPath: /data
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      runAsUser: 3000
      runAsGroup: 3000
      runAsNonRoot: true
    volumeMounts:
    - name: app-data
      mountPath: /data
  volumes:
  - name: app-data
    emptyDir: {}
```

The init container runs as root to prepare the filesystem, then the main container runs as the non-root user with properly set permissions.

## Read-Only Root Filesystem with Specific User

Combine user context with read-only root filesystem for enhanced security:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: readonly-user-demo
spec:
  securityContext:
    runAsUser: 4000
    runAsGroup: 4000
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
    - name: cache
      mountPath: /app/cache
  volumes:
  - name: tmp
    emptyDir: {}
  - name: cache
    emptyDir: {}
```

The container runs as user 4000 with a read-only root filesystem, significantly limiting what an attacker can do if they compromise the container.

## Pod Security Standard Compliance

Restricted Pod Security Standard requires specific user configurations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: restricted-compliant
spec:
  securityContext:
    runAsUser: 5000
    runAsGroup: 5000
    runAsNonRoot: true  # Required by restricted standard
    fsGroup: 5000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      runAsUser: 5000
      runAsGroup: 5000
      runAsNonRoot: true
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

This configuration meets all requirements of the restricted standard, including running as non-root.

## Handling UID Mapping in Different Environments

Different Kubernetes environments might have different UID restrictions:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: uid-aware-pod
  annotations:
    # Document the UID choice
    security.policy/uid: "6000"
    security.policy/rationale: "Matches host system app user"
spec:
  securityContext:
    runAsUser: 6000
    runAsGroup: 6000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      runAsUser: 6000
      runAsGroup: 6000
```

Use consistent UID ranges across your organization. Document why specific UIDs were chosen.

## Dynamic User Assignment

Some environments assign UIDs dynamically. Design applications to work with any non-root UID:

```dockerfile
FROM alpine:3.18

# Don't hardcode specific UIDs in the image
WORKDIR /app
COPY app.sh .

# Make application work with any user
RUN chmod +x app.sh && \
    chmod -R 777 /tmp

# Let Kubernetes set the user at runtime
# USER instruction omitted

CMD ["./app.sh"]
```

This image works regardless of which UID Kubernetes assigns at runtime.

## Troubleshooting User Context Issues

Debug permission problems systematically:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-user-context
spec:
  securityContext:
    runAsUser: 7000
    runAsGroup: 7000
    runAsNonRoot: true
  containers:
  - name: debug
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      echo "=== User Context ==="
      id
      echo "User: $(id -u), Group: $(id -g)"

      echo "=== File System Test ==="
      touch /tmp/test.txt && echo "Write to /tmp: OK" || echo "Write to /tmp: FAILED"

      echo "=== Capabilities ==="
      if command -v capsh > /dev/null; then
        capsh --print
      else
        echo "capsh not available"
      fi

      echo "=== Network Test ==="
      # Try to bind to privileged port
      nc -l -p 80 2>&1 && echo "Port 80: OK" || echo "Port 80: FAILED (expected)"
      # Try non-privileged port
      timeout 1 nc -l -p 8080 2>&1 && echo "Port 8080: OK" || echo "Port 8080: timed out"

      sleep 3600
```

This debug pod helps identify permission issues related to user context.

## Security Auditing

Regularly audit pods to ensure they run as non-root:

```bash
# Find pods running as root
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.securityContext.runAsNonRoot != true) |
  "\(.metadata.namespace)/\(.metadata.name)"'

# Check for missing runAsUser specifications
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.securityContext.runAsUser == null) |
  "\(.metadata.namespace)/\(.metadata.name)"'
```

Implement policies that require explicit user context configuration in all pods.

## Conclusion

Configuring runAsUser and runAsGroup is fundamental to container security. By explicitly setting user and group context, you prevent containers from running as root and enforce least privilege principles. Design container images for non-root execution from the start, use init containers to handle permission setup when needed, and always validate that containers run with the expected user context. Combined with other security measures like read-only root filesystems and capability dropping, proper user context configuration creates robust security boundaries that protect your applications and infrastructure. Make running as non-root the default for all workloads and require explicit security review for any exceptions.

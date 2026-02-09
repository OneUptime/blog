# How to Configure readOnlyRootFilesystem for Immutable Container Filesystems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Containers

Description: Learn how to implement read-only root filesystems in Kubernetes containers to prevent runtime modifications and enhance security through immutable infrastructure patterns.

---

Configuring containers with read-only root filesystems is a powerful security technique that prevents malicious actors from modifying binaries, injecting backdoors, or persisting changes within a compromised container. By making the root filesystem immutable, you enforce the principle that containers should be stateless and disposable.

This guide demonstrates how to implement read-only root filesystems effectively while handling the practical challenges that arise.

## Understanding Read-Only Root Filesystems

When you set `readOnlyRootFilesystem: true`, the container's entire root filesystem becomes read-only. Processes cannot write to any location except explicitly mounted volumes. This prevents:

- Modifying system binaries or libraries
- Installing malware or backdoors
- Creating persistent access mechanisms
- Tampering with application code
- Writing to unexpected locations

The container can still read files, execute binaries, and perform normal operations, but any write attempts to the root filesystem will fail with permission denied errors.

## Prerequisites

Before implementing read-only filesystems, ensure you have:

- Kubernetes cluster (any recent version)
- kubectl with appropriate access
- Understanding of your application's write requirements
- Knowledge of temporary file locations used by your apps

## Basic Read-Only Configuration

Here's a simple pod with a read-only root filesystem:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: readonly-pod
spec:
  containers:
  - name: app
    image: nginx:1.25
    securityContext:
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 101
```

When you try to deploy this nginx pod, it will fail because nginx needs to write to `/var/run/nginx.pid`, `/var/cache/nginx/`, and other locations.

Check the error:

```bash
kubectl logs readonly-pod
# Error: cannot write to /var/run/nginx.pid: Read-only file system
```

This is expected. We need to provide writable volumes for locations where the application needs to write.

## Providing Writable Volumes

Mount emptyDir volumes for directories that need write access:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-readonly
spec:
  containers:
  - name: nginx
    image: nginx:1.25
    securityContext:
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 101
    volumeMounts:
    - name: cache
      mountPath: /var/cache/nginx
    - name: run
      mountPath: /var/run
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: cache
    emptyDir: {}
  - name: run
    emptyDir: {}
  - name: tmp
    emptyDir: {}
```

Now nginx can write to its cache, runtime, and temporary directories while the rest of the filesystem remains immutable.

Verify it works:

```bash
kubectl apply -f nginx-readonly.yaml
kubectl get pods nginx-readonly
# Should show Running status

# Test that root filesystem is read-only
kubectl exec nginx-readonly -- touch /test
# Error: cannot touch '/test': Read-only file system

# But writable volumes work
kubectl exec nginx-readonly -- touch /tmp/test
# Success
```

## Common Writable Locations

Different applications need write access to different locations. Here are common patterns:

**Web applications:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: app
        image: mywebapp:latest
        securityContext:
          readOnlyRootFilesystem: true
          runAsUser: 1000
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /var/cache/app
        - name: logs
          mountPath: /var/log/app
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
      - name: logs
        emptyDir: {}
```

**Java applications:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: java-app
spec:
  containers:
  - name: app
    image: openjdk:17-slim
    command: ["java", "-jar", "/app/application.jar"]
    securityContext:
      readOnlyRootFilesystem: true
      runAsUser: 1000
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: java-tmp
      mountPath: /var/tmp
    env:
    - name: JAVA_TOOL_OPTIONS
      value: "-Djava.io.tmpdir=/tmp"
  volumes:
  - name: tmp
    emptyDir: {}
  - name: java-tmp
    emptyDir: {}
```

**Database containers:**

```yaml
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
      containers:
      - name: postgres
        image: postgres:16
        securityContext:
          readOnlyRootFilesystem: true
          runAsUser: 999
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        - name: run
          mountPath: /var/run/postgresql
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: run
        emptyDir: {}
      - name: tmp
        emptyDir: {}
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

## Discovering Write Requirements

To identify where your application needs write access, run it without read-only filesystem first and monitor file system writes:

```bash
# Deploy without read-only first
kubectl apply -f app-writable.yaml

# Monitor file system writes
kubectl exec -it <pod-name> -- sh -c '
  apt-get update && apt-get install -y strace
  strace -e trace=open,openat,creat -f -p 1 2>&1 | grep -E "O_WRONLY|O_RDWR|O_CREAT"
'
```

Or use tools like `inotify` to watch for write operations:

```bash
kubectl exec -it <pod-name> -- sh -c '
  apt-get install -y inotify-tools
  inotifywait -m -r -e modify,create,delete /
'
```

Once you identify the directories, add them as writable volumes.

## Optimizing Volume Usage with Medium

Use `emptyDir.medium: Memory` for frequently accessed temporary directories:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: high-performance-app
spec:
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      readOnlyRootFilesystem: true
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: cache
      mountPath: /var/cache/app
  volumes:
  - name: tmp
    emptyDir:
      medium: Memory  # RAM-backed, faster but limited
      sizeLimit: 1Gi
  - name: cache
    emptyDir: {}  # Disk-backed
```

This provides faster I/O for temporary files but consumes pod memory limits.

## Combining with Other Security Contexts

Read-only filesystems work best when combined with other security measures:

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
        fsGroup: 3000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        image: myapp:latest
        securityContext:
          readOnlyRootFilesystem: true
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: data
          mountPath: /data
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "200m"
      volumes:
      - name: tmp
        emptyDir: {}
      - name: data
        persistentVolumeClaim:
          claimName: app-data
```

## Handling Init Containers

Init containers might need different filesystem configurations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-init
spec:
  initContainers:
  - name: setup
    image: busybox
    command:
    - sh
    - -c
    - |
      cp /config/* /app-config/
      chmod 644 /app-config/*
    volumeMounts:
    - name: config-source
      mountPath: /config
    - name: app-config
      mountPath: /app-config
    # Init container does NOT have read-only filesystem
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      readOnlyRootFilesystem: true
      runAsUser: 1000
    volumeMounts:
    - name: app-config
      mountPath: /etc/app
      readOnly: true
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: config-source
    configMap:
      name: app-config
  - name: app-config
    emptyDir: {}
  - name: tmp
    emptyDir: {}
```

The init container can write to volumes to prepare them, then the main container runs with a read-only filesystem.

## Troubleshooting Common Issues

**Problem**: Application fails to start with permission denied errors

**Solution**: Identify the directory it's trying to write to and add an emptyDir volume:

```bash
# Check logs for the path
kubectl logs <pod-name>
# Error: cannot write to /var/lib/app: Read-only file system

# Add volume mount for that path
```

**Problem**: Application performance degrades

**Solution**: Use memory-backed emptyDir for frequently accessed temp directories:

```yaml
volumes:
- name: tmp
  emptyDir:
    medium: Memory
    sizeLimit: 512Mi
```

**Problem**: Logs aren't being written

**Solution**: Mount a writable volume for log directory or configure logging to stdout:

```yaml
# Option 1: Mount writable log directory
volumeMounts:
- name: logs
  mountPath: /var/log/app

# Option 2: Configure app to log to stdout (preferred)
env:
- name: LOG_TO_STDOUT
  value: "true"
```

## Enforcing Read-Only Root Filesystems

Use admission policies to enforce read-only filesystems cluster-wide:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-readonly-root-filesystem
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
      object.spec.containers.all(c,
        has(c.securityContext.readOnlyRootFilesystem) &&
        c.securityContext.readOnlyRootFilesystem == true
      )
    message: "All containers must have readOnlyRootFilesystem: true"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: require-readonly-binding
spec:
  policyName: require-readonly-root-filesystem
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchLabels:
        enforce-readonly: "true"
```

Label namespaces to enable enforcement:

```bash
kubectl label namespace production enforce-readonly=true
```

## Building Images for Read-Only Filesystems

Design container images to work with read-only filesystems from the start:

```dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    chown -R appuser:appgroup /app

# Copy application
COPY --chown=appuser:appgroup . .

# Pre-create writable directories (will be mounted as volumes)
RUN mkdir -p /tmp /var/cache/app /var/log/app && \
    chown -R appuser:appgroup /tmp /var/cache/app /var/log/app

USER appuser

# Configure app to use /tmp for temporary files
ENV TMPDIR=/tmp

EXPOSE 3000
CMD ["node", "server.js"]
```

Document required writable volumes in your image documentation:

```
# Required Volumes for Read-Only Root Filesystem
- /tmp - Temporary files
- /var/cache/app - Application cache
- /var/log/app - Application logs (or configure logging to stdout)
```

## Testing Read-Only Configurations

Create automated tests to verify read-only behavior:

```bash
#!/bin/bash
# Test read-only filesystem

POD_NAME="test-readonly-$$"

# Deploy test pod
kubectl run $POD_NAME \
  --image=nginx:1.25 \
  --dry-run=client -o yaml | \
  kubectl patch -f - --local --type=json -p='[
    {"op":"add","path":"/spec/containers/0/securityContext","value":{"readOnlyRootFilesystem":true}},
    {"op":"add","path":"/spec/containers/0/volumeMounts","value":[{"name":"tmp","mountPath":"/tmp"}]},
    {"op":"add","path":"/spec/volumes","value":[{"name":"tmp","emptyDir":{}}]}
  ]' -o yaml | kubectl apply -f -

# Wait for pod to be ready
kubectl wait --for=condition=ready pod/$POD_NAME --timeout=60s

# Test that root filesystem is read-only
if kubectl exec $POD_NAME -- touch /test 2>&1 | grep -q "Read-only file system"; then
  echo "✓ Root filesystem is correctly read-only"
else
  echo "✗ Root filesystem is writable - TEST FAILED"
  exit 1
fi

# Test that mounted volumes are writable
if kubectl exec $POD_NAME -- touch /tmp/test 2>&1; then
  echo "✓ Mounted volumes are correctly writable"
else
  echo "✗ Mounted volumes are not writable - TEST FAILED"
  exit 1
fi

# Cleanup
kubectl delete pod $POD_NAME

echo "All tests passed"
```

## Conclusion

Implementing read-only root filesystems is a crucial security hardening technique that prevents runtime modifications to containers. While it requires identifying and mounting writable volumes for necessary directories, the security benefits far outweigh the additional configuration effort.

Start by testing applications individually to identify write requirements, create standardized volume mount patterns for common application types, and gradually roll out enforcement through admission policies. Monitor with OneUptime to ensure containers maintain their read-only configurations and detect any runtime issues that arise.

Combined with non-root users and dropped capabilities, read-only filesystems form a robust security baseline for production Kubernetes deployments.

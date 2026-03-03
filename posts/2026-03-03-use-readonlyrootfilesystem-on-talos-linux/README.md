# How to Use ReadOnlyRootFilesystem on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, ReadOnlyRootFilesystem, Kubernetes, Container Security, Immutable Infrastructure

Description: A practical guide to implementing ReadOnlyRootFilesystem for containers on Talos Linux, including handling writable directories and troubleshooting common issues.

---

The ReadOnlyRootFilesystem setting in Kubernetes makes a container's root filesystem immutable. No process inside the container can write to the image filesystem, create new files, or modify existing binaries. This is a powerful security control that prevents attackers from writing malicious scripts, modifying configuration files, or installing backdoors even after gaining code execution inside a container. On Talos Linux, where the host OS itself is read-only, enabling ReadOnlyRootFilesystem for your containers extends that same immutability principle to the application layer.

This guide covers how to implement ReadOnlyRootFilesystem effectively, handle applications that need writable directories, and troubleshoot the issues that come up during adoption.

## Why ReadOnlyRootFilesystem Matters

When an attacker compromises a container, one of their first steps is usually to write files - downloading additional tools, creating reverse shells, or modifying application code to maintain persistence. With a read-only root filesystem, these actions fail immediately. The attacker cannot modify the container's binaries, libraries, or configuration files.

This control is especially valuable on Talos Linux because it creates consistency between the host and the containers. Talos itself is immutable, and with ReadOnlyRootFilesystem, your containers follow the same pattern. What you build into the image is what runs, period.

## Basic Configuration

Enable ReadOnlyRootFilesystem in the container's security context.

```yaml
# readonly-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  containers:
    - name: app
      image: myapp:latest
      securityContext:
        readOnlyRootFilesystem: true
        runAsNonRoot: true
        runAsUser: 1000
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
```

```bash
# Deploy the pod
kubectl apply -f readonly-pod.yaml

# Verify the filesystem is read-only
kubectl exec secure-app -- touch /test-file
# Expected error: touch: /test-file: Read-only file system

# Verify existing files are still readable
kubectl exec secure-app -- cat /etc/hostname
# Should work fine - reading is allowed
```

## Handling Writable Directories

Most applications need to write somewhere - temporary files, cache data, PID files, or log files. The solution is to mount writable volumes for these specific directories while keeping everything else read-only.

### Using emptyDir Volumes

EmptyDir volumes are the simplest way to provide writable directories. They exist for the lifetime of the pod and are stored either on disk or in memory.

```yaml
# app-with-writable-dirs.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
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
            # Temp directory for application use
            - name: tmp
              mountPath: /tmp
            # Application-specific data directory
            - name: app-data
              mountPath: /app/data
            # Log directory
            - name: logs
              mountPath: /var/log/app
      volumes:
        - name: tmp
          emptyDir:
            # Use memory-backed storage for temp files
            medium: Memory
            sizeLimit: 64Mi
        - name: app-data
          emptyDir:
            sizeLimit: 256Mi
        - name: logs
          emptyDir:
            sizeLimit: 100Mi
```

### Using tmpfs for Sensitive Temporary Data

For temporary data that should never touch disk (like processing credentials), use memory-backed emptyDir volumes.

```yaml
volumes:
  - name: secure-tmp
    emptyDir:
      # Memory medium stores data in RAM only
      medium: Memory
      # Set a reasonable limit to prevent OOM issues
      sizeLimit: 32Mi
```

## Common Applications and Their Writable Requirements

### Nginx

Nginx needs writable directories for its cache, PID file, and temporary uploads.

```yaml
# nginx-readonly.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 101
        fsGroup: 101
      containers:
        - name: nginx
          image: nginxinc/nginx-unprivileged:latest
          securityContext:
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
          volumeMounts:
            - name: cache
              mountPath: /var/cache/nginx
            - name: run
              mountPath: /var/run
            - name: tmp
              mountPath: /tmp
            - name: nginx-conf
              mountPath: /tmp/nginx
      volumes:
        - name: cache
          emptyDir: {}
        - name: run
          emptyDir: {}
        - name: tmp
          emptyDir: {}
        - name: nginx-conf
          emptyDir: {}
```

### Java Applications

Java applications need writable directories for JVM temporary files and potentially for logging frameworks.

```yaml
# java-app-readonly.yaml
containers:
  - name: java-app
    image: myapp-java:latest
    env:
      # Redirect Java temp directory
      - name: JAVA_TOOL_OPTIONS
        value: "-Djava.io.tmpdir=/tmp"
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      capabilities:
        drop:
          - ALL
    volumeMounts:
      - name: tmp
        mountPath: /tmp
      - name: java-tmp
        mountPath: /opt/java/.java
volumes:
  - name: tmp
    emptyDir:
      sizeLimit: 256Mi
  - name: java-tmp
    emptyDir:
      sizeLimit: 64Mi
```

### Python Applications

Python applications may need writable directories for compiled bytecode cache and temporary files.

```yaml
# python-app-readonly.yaml
containers:
  - name: python-app
    image: myapp-python:latest
    env:
      # Disable bytecode caching or redirect it
      - name: PYTHONDONTWRITEBYTECODE
        value: "1"
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      capabilities:
        drop:
          - ALL
    volumeMounts:
      - name: tmp
        mountPath: /tmp
volumes:
  - name: tmp
    emptyDir:
      sizeLimit: 128Mi
```

## Configuration Files with ConfigMaps

When your application needs configuration files that might change, use ConfigMaps mounted as volumes. These are read-only by default, which works perfectly with ReadOnlyRootFilesystem.

```yaml
containers:
  - name: app
    image: myapp:latest
    securityContext:
      readOnlyRootFilesystem: true
    volumeMounts:
      - name: config
        mountPath: /app/config
        readOnly: true
      - name: tmp
        mountPath: /tmp
volumes:
  - name: config
    configMap:
      name: app-config
  - name: tmp
    emptyDir: {}
```

## Troubleshooting ReadOnlyRootFilesystem

### Finding Write Paths

When a container fails to start with a read-only filesystem, you need to identify which paths it tries to write to.

```bash
# Run the container without readOnlyRootFilesystem first
# and trace file writes using strace or inotifywait

# Option 1: Check the application logs for "read-only filesystem" errors
kubectl logs <pod-name>

# Option 2: Run the image interactively to find write paths
kubectl run debug --image=myapp:latest --rm -it --restart=Never -- sh
# Then try running the application and note which paths fail
```

### Common Error Messages

```
Error: open /var/run/app.pid: read-only file system
# Solution: Mount an emptyDir at /var/run

Error: cannot create /tmp/session_xyz: read-only file system
# Solution: Mount an emptyDir at /tmp

Error: ENOENT: /app/node_modules/.cache
# Solution: Mount an emptyDir at /app/node_modules/.cache
```

### Debugging with a Temporary Writable Mount

If you need to debug an application with a read-only filesystem, temporarily add a writable mount.

```bash
# Create a debug pod with the same image but writable directories
kubectl run debug --image=myapp:latest --rm -it --restart=Never \
  --overrides='{
    "spec": {
      "containers": [{
        "name": "debug",
        "image": "myapp:latest",
        "command": ["sh"],
        "securityContext": {"readOnlyRootFilesystem": true},
        "volumeMounts": [{"name": "tmp", "mountPath": "/tmp"}]
      }],
      "volumes": [{"name": "tmp", "emptyDir": {}}]
    }
  }'
```

## Enforcing ReadOnlyRootFilesystem Cluster-Wide

Use Pod Security Standards on Talos Linux to enforce ReadOnlyRootFilesystem.

```bash
# The restricted standard does not strictly require readOnlyRootFilesystem
# but it is part of a comprehensive security policy

# Use OPA Gatekeeper or Kyverno for explicit enforcement
```

With Kyverno:

```yaml
# kyverno-readonly-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-readonly-rootfs
spec:
  validationFailureAction: Enforce
  rules:
    - name: validate-readonlyrootfilesystem
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "All containers must use readOnlyRootFilesystem"
        pattern:
          spec:
            containers:
              - securityContext:
                  readOnlyRootFilesystem: true
```

## Wrapping Up

ReadOnlyRootFilesystem is one of the simplest and most effective security controls you can apply to containers on Talos Linux. It prevents file modification attacks, stops persistence mechanisms, and aligns your containers with the same immutability principles that make Talos Linux secure. The main effort is identifying which directories your applications need to write to and providing them through emptyDir volumes. Once you have that figured out, every container in your cluster can run with an immutable filesystem, making it significantly harder for attackers to do anything useful even after gaining initial access.

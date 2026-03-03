# How to Configure Pod Security Contexts on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Pod Security, Kubernetes, Security Contexts, Container Security

Description: Learn how to properly configure pod security contexts on Talos Linux to enforce least-privilege access and harden your Kubernetes workloads.

---

Pod security contexts are one of the most important but frequently overlooked security controls in Kubernetes. They define the privilege and access settings for pods and containers, controlling everything from which user a process runs as to whether it can access the host network. On Talos Linux, where the operating system itself is locked down and immutable, configuring pod security contexts properly ensures that your containers follow the same security principles.

This guide covers pod security contexts in depth, with practical examples tailored for Talos Linux environments.

## What Are Pod Security Contexts

A security context in Kubernetes defines privilege and access control settings for a pod or container. There are two levels: pod-level settings that apply to all containers in a pod, and container-level settings that apply to individual containers. Container-level settings override pod-level settings when both are specified.

The key fields you can control include:

- The user and group IDs the process runs as
- Whether the container runs as root or non-root
- Whether the root filesystem is read-only
- Linux capabilities that are added or dropped
- SELinux and AppArmor labels
- Seccomp profiles
- Whether privilege escalation is allowed

## Why This Matters on Talos Linux

Talos Linux is designed to be as secure as possible at the OS level. But if you deploy containers that run as root with full capabilities and a writable filesystem, you are undermining that security from within. A compromised container with root access and full capabilities could potentially escape the container boundary, even on a hardened host. Pod security contexts are your mechanism for preventing this.

## Basic Pod Security Context

Start with a minimal security context that enforces non-root execution and drops all capabilities.

```yaml
# secure-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  namespace: default
spec:
  # Pod-level security context
  securityContext:
    # Run all containers as this user
    runAsUser: 1000
    runAsGroup: 1000
    # Set the filesystem group for mounted volumes
    fsGroup: 1000
    # Do not allow any container to run as root
    runAsNonRoot: true
  containers:
    - name: app
      image: myapp:latest
      # Container-level security context
      securityContext:
        # Make the root filesystem read-only
        readOnlyRootFilesystem: true
        # Do not allow privilege escalation
        allowPrivilegeEscalation: false
        # Drop all Linux capabilities
        capabilities:
          drop:
            - ALL
      # Provide a writable directory for temporary files
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: tmp
      emptyDir: {}
```

```bash
# Deploy the secure pod
kubectl apply -f secure-pod.yaml

# Verify the security settings are applied
kubectl exec secure-app -- id
# Should output: uid=1000 gid=1000 groups=1000

# Verify the filesystem is read-only
kubectl exec secure-app -- touch /test-file
# Should fail with: Read-only file system
```

## Understanding Each Security Field

Let us break down each field and why it matters.

### runAsUser and runAsGroup

These fields control the UID and GID that the container process runs as. Setting these to a non-zero value prevents the process from running as root inside the container.

```yaml
securityContext:
  # Run as a specific non-root user
  runAsUser: 65534
  runAsGroup: 65534
```

### runAsNonRoot

This is a validation flag. Kubernetes will refuse to start the container if the image is configured to run as root (UID 0). It acts as a safety net.

```yaml
securityContext:
  # Kubernetes will reject the pod if the image runs as root
  runAsNonRoot: true
```

### readOnlyRootFilesystem

This makes the container's root filesystem read-only. The container can still write to mounted volumes like emptyDir or persistent volumes, but it cannot modify the image filesystem. This prevents attackers from writing malicious binaries or modifying configuration files.

```yaml
securityContext:
  readOnlyRootFilesystem: true
```

### allowPrivilegeEscalation

When set to false, this prevents a process from gaining more privileges than its parent process. This blocks exploits that use setuid binaries or other privilege escalation techniques.

```yaml
securityContext:
  allowPrivilegeEscalation: false
```

### capabilities

Linux capabilities break root privileges into distinct units. By dropping ALL capabilities and only adding back the specific ones your application needs, you follow the principle of least privilege.

```yaml
securityContext:
  capabilities:
    drop:
      - ALL
    add:
      # Only add back what is needed
      - NET_BIND_SERVICE
```

## Practical Examples for Common Workloads

### Web Server

```yaml
# nginx-secure.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: default
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
        runAsUser: 101
        runAsGroup: 101
        fsGroup: 101
        runAsNonRoot: true
      containers:
        - name: nginx
          image: nginxinc/nginx-unprivileged:latest
          ports:
            - containerPort: 8080
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
              mountPath: /var/cache/nginx
            - name: run
              mountPath: /var/run
      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
        - name: run
          emptyDir: {}
```

### Database Sidecar

```yaml
# app-with-sidecar.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-metrics
spec:
  securityContext:
    runAsNonRoot: true
    fsGroup: 1000
  containers:
    - name: app
      image: myapp:latest
      securityContext:
        runAsUser: 1000
        readOnlyRootFilesystem: true
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
    - name: metrics-exporter
      image: prom/node-exporter:latest
      securityContext:
        runAsUser: 65534
        readOnlyRootFilesystem: true
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
```

## Enforcing Security Contexts Cluster-Wide

On Talos Linux, you should enforce security contexts using Pod Security Standards. Kubernetes provides built-in admission control through the PodSecurity admission controller.

```bash
# Label a namespace to enforce the restricted security standard
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

With this label, Kubernetes will reject any pod in the production namespace that does not meet the restricted security standard. This includes requirements like running as non-root, dropping all capabilities, and using a read-only root filesystem.

```bash
# Test by deploying a privileged pod to the labeled namespace
kubectl run test-privileged --image=nginx --namespace=production
# This should be rejected because the default nginx image runs as root
```

## Troubleshooting Security Context Issues

Common problems and their solutions when working with security contexts on Talos Linux.

```bash
# Check if a pod was rejected due to security context
kubectl describe pod <pod-name> | grep -A5 "Warning"

# Verify what user the container is actually running as
kubectl exec <pod-name> -- id

# Check if the filesystem is truly read-only
kubectl exec <pod-name> -- touch /test
```

If your application fails to start with a non-root user, the image may need to be rebuilt to support running as a non-root user. This usually involves changing file ownership in the Dockerfile.

## Wrapping Up

Pod security contexts are essential for maintaining the security posture that Talos Linux provides at the OS level. By configuring runAsNonRoot, readOnlyRootFilesystem, dropping all capabilities, and preventing privilege escalation, you ensure that every container in your cluster follows the principle of least privilege. Combine these settings with namespace-level Pod Security Standards enforcement to create a cluster where insecure containers simply cannot run. The effort to configure these settings properly pays off significantly in reducing your overall attack surface.

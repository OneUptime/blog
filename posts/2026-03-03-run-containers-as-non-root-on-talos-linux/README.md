# How to Run Containers as Non-Root on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Container Security, Non-Root, Kubernetes, Best Practices

Description: A hands-on guide to running containers as non-root users on Talos Linux, covering image configuration, Kubernetes settings, and troubleshooting common issues.

---

Running containers as root is one of the most common security mistakes in Kubernetes. When a container process runs as root (UID 0), a container escape vulnerability could give an attacker root access to the host. On Talos Linux, the OS itself is hardened against this kind of attack, but running non-root containers adds another critical layer of defense. It is defense in depth at its best.

This guide covers everything you need to know about running containers as non-root users on Talos Linux, from building images correctly to configuring Kubernetes and handling the common pitfalls.

## Why Non-Root Matters

Even on a hardened platform like Talos Linux, container escapes are a real threat. CVEs like CVE-2019-5736 (runc escape) and CVE-2022-0185 (kernel vulnerability) allowed containers running as root to break out of their isolation. If the container process is running as a non-root user, many of these exploits simply do not work because they require root privileges inside the container.

Beyond security, running as non-root is a best practice that forces you to think carefully about file permissions and process ownership. This leads to better-designed applications that are easier to audit and maintain.

## Building Non-Root Container Images

The first step is building container images that support non-root execution. Here is how to create a proper non-root Dockerfile.

```dockerfile
# Dockerfile for a non-root Node.js application
FROM node:20-alpine

# Create a non-root user and group
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Set the working directory
WORKDIR /app

# Copy dependency files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy application code
COPY --chown=appuser:appgroup . .

# Switch to the non-root user
USER appuser

# Expose a non-privileged port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
```

For applications that need to write to specific directories, make sure those directories are owned by the non-root user.

```dockerfile
# Dockerfile for a Python application with writable directories
FROM python:3.12-slim

# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app appuser

# Create necessary directories with correct ownership
RUN mkdir -p /app /app/data /app/logs && \
    chown -R appuser:appgroup /app

WORKDIR /app

# Install dependencies as root (before switching user)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code with correct ownership
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

EXPOSE 8000
CMD ["python", "app.py"]
```

## Kubernetes Configuration for Non-Root

Even if your image uses a USER directive, you should still enforce non-root at the Kubernetes level. This provides a safety net in case someone pushes an image without the USER directive.

```yaml
# non-root-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      # Pod-level security context
      securityContext:
        # Enforce non-root execution
        runAsNonRoot: true
        # Specify the user ID
        runAsUser: 1001
        runAsGroup: 1001
        # Set filesystem group for volume mounts
        fsGroup: 1001
      containers:
        - name: app
          image: myapp:latest
          ports:
            - containerPort: 3000
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: data
              mountPath: /app/data
      volumes:
        - name: tmp
          emptyDir: {}
        - name: data
          persistentVolumeClaim:
            claimName: myapp-data
```

## Handling Common Non-Root Challenges

### Binding to Privileged Ports

Non-root processes cannot bind to ports below 1024. Instead of trying to bind to port 80 or 443, configure your application to listen on a higher port and use a Kubernetes Service to map it.

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  ports:
    # External port 80 maps to container port 8080
    - name: http
      port: 80
      targetPort: 8080
    - name: https
      port: 443
      targetPort: 8443
```

### Writing to Temporary Files

Many applications need to write temporary files. With a read-only root filesystem, you need to provide writable directories through volume mounts.

```yaml
# Provide writable directories via emptyDir volumes
volumes:
  - name: tmp
    emptyDir:
      sizeLimit: 100Mi
  - name: cache
    emptyDir:
      sizeLimit: 500Mi
```

### File Permission Issues with Volumes

When a non-root container needs to write to a persistent volume, the fsGroup setting is critical. It ensures that the mounted volume's files are accessible to the specified group.

```yaml
securityContext:
  # This ensures all files in mounted volumes are owned by group 1001
  fsGroup: 1001
  # Controls how fsGroup is applied (OnRootMismatch is faster)
  fsGroupChangePolicy: OnRootMismatch
```

### Nginx as Non-Root

Nginx is a common case where running as non-root requires some changes. Use the official unprivileged image.

```yaml
# nginx-nonroot.yaml
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
        runAsGroup: 101
        fsGroup: 101
      containers:
        - name: nginx
          # Use the unprivileged variant
          image: nginxinc/nginx-unprivileged:1.25
          ports:
            - containerPort: 8080
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          volumeMounts:
            - name: cache
              mountPath: /var/cache/nginx
            - name: pid
              mountPath: /var/run
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: cache
          emptyDir: {}
        - name: pid
          emptyDir: {}
        - name: tmp
          emptyDir: {}
```

## Enforcing Non-Root Cluster-Wide on Talos Linux

Use Kubernetes Pod Security Standards to enforce non-root across namespaces.

```bash
# Apply the restricted standard to a namespace
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/audit=restricted

# Verify the labels
kubectl get namespace production --show-labels
```

You can also use the baseline standard as a stepping stone if the restricted standard is too aggressive for your current workloads.

```bash
# Apply baseline enforcement with restricted warnings
kubectl label namespace staging \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/warn=restricted
```

## Verifying Non-Root Execution

After deploying your workloads, verify they are actually running as non-root.

```bash
# Check the user ID inside a running container
kubectl exec myapp-pod -- id
# Expected output: uid=1001(appuser) gid=1001(appgroup)

# Verify the process is not running as root
kubectl exec myapp-pod -- ps aux
# The PID 1 process should show the non-root user

# Check that privilege escalation is blocked
kubectl exec myapp-pod -- cat /proc/1/status | grep NoNewPrivs
# Should show: NoNewPrivs: 1
```

## Migrating Existing Workloads

If you have existing containers running as root, here is a practical migration approach:

1. Start by adding `runAsNonRoot: false` explicitly to document which pods run as root
2. Test each workload with a non-root user in a staging environment
3. Fix file permission issues in the Dockerfile
4. Update the Kubernetes manifests with proper security contexts
5. Apply namespace-level enforcement in stages, starting with warn mode

```bash
# Find all pods currently running as root
kubectl get pods -A -o json | \
  jq '.items[] | select(.spec.securityContext.runAsNonRoot != true) | {namespace: .metadata.namespace, name: .metadata.name}'
```

## Wrapping Up

Running containers as non-root on Talos Linux is one of the simplest and most effective security measures you can implement. It requires some upfront work in building proper container images and configuring the right security contexts, but the result is a significantly reduced attack surface. Combined with Talos Linux's immutable OS design, non-root containers create a layered security model where even a successful container exploit has limited impact. Start enforcing non-root execution today, and make it a standard requirement for all new workloads in your cluster.

# How to implement securityContext with runAsNonRoot for rootless containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Containers

Description: Master the runAsNonRoot security context setting to enforce rootless container execution preventing privilege escalation and reducing attack surface in Kubernetes pods.

---

Running containers as root creates significant security risks. If an attacker compromises a root container, they gain full control within that container and may escalate privileges to affect the host system. The runAsNonRoot security context setting prevents containers from running as root, forcing them to use unprivileged user accounts instead.

Implementing runAsNonRoot is one of the most effective security hardening measures for Kubernetes workloads. Combined with dropping capabilities and read-only root filesystems, it creates defense-in-depth that makes container breakouts significantly more difficult.

## Understanding runAsNonRoot

The runAsNonRoot setting is a boolean that instructs Kubernetes to verify the container runs with a non-zero user ID. If a container attempts to start as root (UID 0), Kubernetes blocks it:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
spec:
  securityContext:
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:v1.0
```

This pod-level configuration applies to all containers in the pod. If the myapp image has USER 0 or USER root in its Dockerfile, Kubernetes prevents the container from starting.

## Specifying the user ID explicitly

Combine runAsNonRoot with runAsUser to explicitly set the user ID:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
  containers:
  - name: web
    image: nginx:alpine
```

The runAsUser: 1000 setting forces the container to run as UID 1000. The fsGroup: 1000 setting ensures volume files are accessible to that user. This configuration works even if the container image defaults to root.

## Building images for rootless execution

Create container images that run as non-root users by default:

```dockerfile
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1000 appgroup && \
    adduser -D -u 1000 -G appgroup appuser

# Set up application directory
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY --chown=appuser:appgroup . .

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

CMD ["node", "server.js"]
```

The USER appuser instruction ensures the container runs as the appuser account by default. When deploying this image with runAsNonRoot, it starts without issues.

## Container-level security context

Override pod-level settings for individual containers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  containers:
  - name: app
    image: app:v1.0
    # Inherits pod securityContext

  - name: helper
    image: helper:v1.0
    securityContext:
      runAsUser: 2000  # Override for this container
```

The app container runs as UID 1000 (inherited from pod), while the helper container runs as UID 2000 (explicit override). Both comply with runAsNonRoot.

## Handling file permissions

Non-root users need appropriate file permissions:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: data-processor
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
  containers:
  - name: processor
    image: processor:v1.0
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-data
```

The fsGroup setting changes the group ownership of mounted volumes to GID 1000, allowing the non-root container to read and write files. Without fsGroup, the container might lack permission to access volume files.

## Debugging permission issues

When rootless containers fail due to permission problems, check the error messages:

```
Error: EACCES: permission denied, open '/var/log/app.log'
```

This indicates the container user cannot write to /var/log. Solutions include:

1. Change the log directory to a writable location like /tmp
2. Mount an emptyDir volume at /var/log
3. Use stdout/stderr for logging instead of files

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: logger-app
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  containers:
  - name: app
    image: app:v1.0
    volumeMounts:
    - name: logs
      mountPath: /var/log
  volumes:
  - name: logs
    emptyDir: {}
```

The emptyDir volume gives the container a writable /var/log directory.

## Running databases as non-root

Many database images support non-root execution:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: postgres
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 999  # postgres user UID
    fsGroup: 999
  containers:
  - name: postgres
    image: postgres:15-alpine
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-credentials
          key: password
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: postgres-data
```

The official PostgreSQL image includes a postgres user with UID 999. Setting runAsUser to match enables rootless execution.

## Migrating existing workloads

Gradually migrate from root to rootless containers:

1. **Identify root requirement**: Check if containers actually need root
2. **Update images**: Add USER instruction to Dockerfiles
3. **Test**: Verify application works as non-root
4. **Add security context**: Set runAsNonRoot in pod specs
5. **Deploy**: Roll out changes environment by environment

For third-party images that run as root, override with runAsUser:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 999
        fsGroup: 999
      containers:
      - name: redis
        image: redis:7-alpine
```

Most applications work fine as non-root once file permissions are addressed.

## Combining with other security measures

Stack runAsNonRoot with additional hardening:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hardened-app
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: app:v1.0
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      readOnlyRootFilesystem: true
    volumeMounts:
    - name: tmp
      mountPath: /tmp
    - name: cache
      mountPath: /var/cache/app
  volumes:
  - name: tmp
    emptyDir: {}
  - name: cache
    emptyDir: {}
```

This configuration implements defense-in-depth: non-root execution, no capabilities, read-only root filesystem, and seccomp filtering.

## Stateful applications with initContainers

Use initContainers to set up permissions for stateful workloads:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      initContainers:
      - name: fix-permissions
        image: busybox
        command:
        - sh
        - -c
        - |
          chown -R 1000:1000 /usr/share/elasticsearch/data
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
        securityContext:
          runAsUser: 0  # Init container runs as root
      containers:
      - name: elasticsearch
        image: elasticsearch:8.7.0
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

The initContainer runs as root to fix permissions, then the main container runs as non-root. Pod-level runAsNonRoot is false since the init container needs root, but the main container's securityContext enforces runAsNonRoot.

## NetworkPolicies with non-root containers

Non-root containers cannot bind to privileged ports (below 1024):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: webserver
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  containers:
  - name: web
    image: nginx:alpine
    ports:
    - containerPort: 8080  # Non-privileged port
```

Configure services to route traffic appropriately:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: webserver
spec:
  selector:
    app: webserver
  ports:
  - port: 80
    targetPort: 8080  # Maps port 80 to container port 8080
```

The service exposes port 80 while the container listens on 8080.

## Enforcing runAsNonRoot cluster-wide

Use Pod Security Standards to enforce rootless containers:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: applications
  labels:
    pod-security.kubernetes.io/enforce: restricted
```

The restricted profile requires runAsNonRoot, preventing any root containers from deploying to the namespace.

## Monitoring compliance

Track rootless container adoption:

```bash
# Find pods running as root
kubectl get pods -A -o json | \
  jq -r '.items[] |
    select(.spec.securityContext.runAsUser == 0 or
           (.spec.securityContext.runAsUser == null and
            .spec.securityContext.runAsNonRoot != true)) |
    "\(.metadata.namespace)/\(.metadata.name)"'
```

Create alerts for root container violations:

```yaml
# PrometheusRule
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: security-alerts
spec:
  groups:
  - name: container-security
    rules:
    - alert: RootContainerDetected
      expr: |
        kube_pod_container_status_running{
          container!~"istio-proxy|linkerd-proxy"
        } * on(namespace,pod,container)
        kube_pod_container_info{
          container_id!="",
          container!~"istio-proxy|linkerd-proxy"
        } unless on(namespace,pod,container)
        kube_pod_spec_securitycontext_runasnonroot == 1
      annotations:
        summary: "Container running without runAsNonRoot"
```

## Best practices for rootless containers

Build images with USER instruction rather than relying on runtime overrides. Images should be secure by default.

Use numeric UIDs in runAsUser rather than usernames. Numeric IDs are more portable across different container runtimes.

Set fsGroup to match runAsUser for consistent file permissions on mounted volumes.

Test applications thoroughly as non-root before deploying to production. Some applications have hard-coded assumptions about running as root.

Document the UID/GID used by each application for troubleshooting permission issues.

## Conclusion

Implementing runAsNonRoot is a critical security measure that prevents containers from running with root privileges. This simple setting dramatically reduces the impact of container compromises by limiting what attackers can do even if they gain code execution.

Combined with other security contexts like dropping capabilities and read-only root filesystems, rootless containers form a strong foundation for secure Kubernetes deployments. While migrating existing workloads requires addressing file permissions and privileged port bindings, the security benefits make this effort worthwhile. Making rootless execution the default for all new workloads establishes secure-by-default practices that protect your infrastructure.

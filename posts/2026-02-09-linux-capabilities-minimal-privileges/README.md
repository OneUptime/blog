# How to use Linux capabilities to grant minimal privileges to containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Linux

Description: Master Linux capabilities to grant containers only the specific privileges they need reducing attack surface and implementing the principle of least privilege effectively.

---

Linux capabilities divide root privileges into distinct units that can be granted independently. Rather than running containers as root with all privileges or as non-root with none, capabilities let you grant only the specific privileges each container needs. This implements the principle of least privilege, where containers have just enough permissions to function but nothing more.

Understanding capabilities is essential for security-conscious Kubernetes deployments. By dropping unnecessary capabilities and adding only required ones, you minimize the damage an attacker can cause if they compromise a container.

## Understanding Linux capabilities

Traditional Unix systems have two privilege levels: root (UID 0) with all privileges, and non-root with minimal privileges. Linux capabilities break root privileges into 40+ distinct capabilities like CAP_NET_BIND_SERVICE (bind to ports below 1024) or CAP_SYS_ADMIN (perform system administration operations).

A process can have specific capabilities without being root. For example, a container might have CAP_NET_BIND_SERVICE to bind port 80 while lacking CAP_SYS_ADMIN, preventing it from modifying system settings.

## Dropping all capabilities by default

The most secure approach drops all capabilities and adds back only those needed:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp
spec:
  containers:
  - name: app
    image: webapp:v1.0
    securityContext:
      capabilities:
        drop:
        - ALL
```

This container has no capabilities beyond those available to unprivileged processes. Most applications work fine with zero capabilities.

## Adding required capabilities

When applications need specific capabilities, add them explicitly:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: webserver
spec:
  containers:
  - name: nginx
    image: nginx:alpine
    ports:
    - containerPort: 80
    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE
```

The CAP_NET_BIND_SERVICE capability allows the non-root container to bind port 80. Without this capability, non-root containers can only bind ports 1024 and above.

## Common capabilities and their use cases

**CAP_NET_BIND_SERVICE**: Bind ports below 1024
```yaml
securityContext:
  capabilities:
    drop: [ALL]
    add: [NET_BIND_SERVICE]
```
Use for web servers needing standard HTTP/HTTPS ports.

**CAP_NET_RAW**: Create raw network sockets
```yaml
securityContext:
  capabilities:
    drop: [ALL]
    add: [NET_RAW]
```
Use for network diagnostic tools like ping or traceroute.

**CAP_CHOWN**: Change file ownership
```yaml
securityContext:
  capabilities:
    drop: [ALL]
    add: [CHOWN, FOWNER]
```
Use when containers must change file ownership on mounted volumes.

**CAP_SYS_NICE**: Adjust process priority
```yaml
securityContext:
  capabilities:
    drop: [ALL]
    add: [SYS_NICE]
```
Use for performance-critical applications that need to set priority.

**CAP_SYS_TIME**: Modify system clock
```yaml
securityContext:
  capabilities:
    drop: [ALL]
    add: [SYS_TIME]
```
Use for NTP servers or time synchronization services.

## Dangerous capabilities to avoid

Never grant these capabilities unless absolutely necessary:

**CAP_SYS_ADMIN**: Catch-all for many administrative operations. Equivalent to root for many purposes. Avoid at all costs.

**CAP_SYS_PTRACE**: Trace other processes. Allows inspecting and modifying other containers.

**CAP_SYS_MODULE**: Load kernel modules. Gives kernel-level access.

**CAP_DAC_OVERRIDE**: Bypass file permission checks. Circumvents filesystem security.

**CAP_SYS_RAWIO**: Perform raw I/O operations. Access to physical devices.

These capabilities grant extensive power and should only be used in specialized system containers, never in application containers.

## Running Nginx as non-root with capabilities

Nginx traditionally runs as root to bind port 80, then drops privileges. With capabilities, it can run as non-root from the start:

```dockerfile
FROM nginx:alpine

# Create non-root user
RUN addgroup -g 1000 nginx-user && \
    adduser -D -u 1000 -G nginx-user nginx-user

# Configure nginx to run as non-root
RUN sed -i 's/user  nginx/user  nginx-user/' /etc/nginx/nginx.conf && \
    sed -i 's/listen       80/listen       8080/' /etc/nginx/conf.d/default.conf && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    chown -R nginx-user:nginx-user /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-user /var/run/nginx.pid

USER nginx-user
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: nginx
    image: nginx:rootless
    ports:
    - containerPort: 8080
    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop:
        - ALL
```

This configuration runs Nginx as non-root on port 8080 with no capabilities. Much more secure than the default configuration.

## Network monitoring with CAP_NET_RAW

Network diagnostic containers need CAP_NET_RAW:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: network-tools
spec:
  containers:
  - name: tools
    image: nicolaka/netshoot
    command: ["/bin/bash"]
    args: ["-c", "sleep infinity"]
    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop:
        - ALL
        add:
        - NET_RAW
        - NET_ADMIN  # For advanced networking tools
```

This pod can run ping, traceroute, and tcpdump while still dropping most capabilities.

## Database containers with minimal capabilities

Databases typically need no special capabilities:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: postgres
spec:
  containers:
  - name: postgres
    image: postgres:15-alpine
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-creds
          key: password
    securityContext:
      runAsNonRoot: true
      runAsUser: 999
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: postgres-data
```

PostgreSQL works perfectly with all capabilities dropped, running as a non-root user.

## Debugging capability issues

When containers fail due to missing capabilities, the error messages often indicate what's needed:

```
Error: bind: permission denied
```

This suggests the container needs CAP_NET_BIND_SERVICE to bind a privileged port.

```
Error: operation not permitted: setuid
```

This indicates the container needs capability to change user IDs, though you should question why this is necessary.

Use `capsh` to check capabilities in running containers:

```bash
kubectl exec -it pod-name -- capsh --print
```

This shows current capabilities, helping identify what's available.

## Pod Security Standards and capabilities

The Baseline and Restricted Pod Security profiles restrict capabilities:

**Baseline**: Allows any capabilities except those that enable privilege escalation.

**Restricted**: Requires dropping ALL capabilities. Can optionally add back NET_BIND_SERVICE.

```yaml
# Passes restricted profile
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  namespace: restricted
spec:
  securityContext:
    runAsNonRoot: true
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
```

This pod passes all restricted profile checks including capability restrictions.

## Enforcing capability restrictions with policy

Use admission controllers to enforce capability policies:

```yaml
# OPA policy
package kubernetes.admission

deny[msg] {
  input.request.kind.kind == "Pod"
  container := input.request.object.spec.containers[_]

  # Ensure ALL capabilities are dropped
  not drops_all_capabilities(container)

  msg := sprintf("Container %v must drop ALL capabilities", [container.name])
}

deny[msg] {
  input.request.kind.kind == "Pod"
  container := input.request.object.spec.containers[_]

  # Check for dangerous capabilities
  dangerous := {"SYS_ADMIN", "SYS_PTRACE", "SYS_MODULE", "DAC_OVERRIDE"}
  added := {cap | cap := container.securityContext.capabilities.add[_]}
  violations := dangerous & added

  count(violations) > 0

  msg := sprintf("Container %v adds dangerous capabilities: %v",
    [container.name, violations])
}

drops_all_capabilities(container) {
  container.securityContext.capabilities.drop[_] == "ALL"
}
```

This policy blocks pods that don't drop ALL capabilities or that add dangerous capabilities.

## Capabilities in init containers

Init containers can have different capabilities than main containers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-setup
spec:
  initContainers:
  - name: setup
    image: busybox
    command:
    - sh
    - -c
    - |
      # Perform setup requiring elevated privileges
      chown -R 1000:1000 /data
    volumeMounts:
    - name: data
      mountPath: /data
    securityContext:
      runAsUser: 0
      capabilities:
        drop:
        - ALL
        add:
        - CHOWN
        - FOWNER
  containers:
  - name: app
    image: app:v1.0
    securityContext:
      runAsNonRoot: true
      runAsUser: 1000
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    emptyDir: {}
```

The init container has CHOWN capability to fix permissions, while the main container runs with no capabilities.

## Auditing container capabilities

Track capability usage across your cluster:

```bash
# Find containers with added capabilities
kubectl get pods -A -o json | \
  jq -r '.items[] |
    .metadata as $meta |
    .spec.containers[] |
    select(.securityContext.capabilities.add != null) |
    "\($meta.namespace)/\($meta.name)/\(.name): \(.securityContext.capabilities.add)"'
```

Create reports showing which capabilities are in use and why. This helps identify opportunities to reduce privileges further.

## Testing applications with dropped capabilities

Before deploying to production, test applications with all capabilities dropped:

```bash
# Run container locally with no capabilities
docker run --rm -it \
  --cap-drop=ALL \
  --user 1000:1000 \
  myapp:v1.0

# Test specific functionality
# Add capabilities one at a time if issues arise
docker run --rm -it \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --user 1000:1000 \
  myapp:v1.0
```

This iterative approach helps identify the minimal set of capabilities needed.

## Best practices for capabilities

Always drop ALL capabilities first, then add back only those explicitly needed. This ensures you grant minimum necessary privileges.

Document why each added capability is required. Future maintainers need to understand the reasoning.

Regularly audit containers for unnecessary capabilities. Requirements change as applications evolve.

Avoid CAP_SYS_ADMIN at all costs. If you think you need it, find an alternative approach.

Use capabilities with other security measures like runAsNonRoot and read-only root filesystems for defense-in-depth.

## Conclusion

Linux capabilities provide fine-grained control over container privileges, enabling true least-privilege security. By dropping ALL capabilities by default and adding only those specifically needed, you dramatically reduce the attack surface of your containers.

Most applications require zero capabilities when properly configured to run as non-root and use unprivileged ports. For those few that do need elevated privileges, capabilities let you grant exactly what's necessary without the broad permissions that come with running as root. This surgical approach to privilege management is essential for maintaining secure Kubernetes environments.

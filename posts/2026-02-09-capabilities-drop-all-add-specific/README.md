# How to use securityContext with capabilities drop ALL and add specific

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Capabilities, Container Security, Least Privilege

Description: Master the pattern of dropping all Linux capabilities and selectively adding only required ones in Kubernetes containers, implementing true least privilege through fine-grained capability management.

---

Linux capabilities break root privileges into discrete units. Instead of running as root with all privileges, containers can run as non-root while holding specific capabilities. The security best practice is dropping all capabilities then adding back only what's needed, implementing true least privilege at the kernel level.

## Understanding Linux Capabilities

Linux capabilities divide root privileges into approximately 40 distinct units. Capabilities like CAP_NET_BIND_SERVICE allow binding to privileged ports, CAP_SYS_ADMIN provides extensive administrative access, and CAP_NET_RAW enables raw socket creation. Most applications need none or very few capabilities.

By default, container runtimes grant several capabilities to containers. Dropping all capabilities and adding specific ones ensures containers have minimal permissions necessary for their function.

## Basic Drop All Pattern

The fundamental security pattern:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: drop-all-demo
spec:
  securityContext:
    runAsUser: 1000
    runAsNonRoot: true
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
```

This configuration drops all capabilities. The container runs with no special privileges beyond its user permissions.

## Adding NET_BIND_SERVICE for Privileged Ports

Web servers binding to port 80 or 443 need NET_BIND_SERVICE:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
spec:
  securityContext:
    runAsUser: 101
    runAsNonRoot: true
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
    - containerPort: 443
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE
    volumeMounts:
    - name: cache
      mountPath: /var/cache/nginx
    - name: run
      mountPath: /var/run
  volumes:
  - name: cache
    emptyDir: {}
  - name: run
    emptyDir: {}
```

NET_BIND_SERVICE lets nginx bind to ports 80 and 443 without running as root.

## Multiple Specific Capabilities

Some applications need multiple capabilities:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: network-tool
spec:
  securityContext:
    runAsUser: 2000
    runAsNonRoot: true
  containers:
  - name: tool
    image: network-tool:1.0
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
        add:
        - NET_ADMIN
        - NET_RAW
```

NET_ADMIN enables network configuration, while NET_RAW allows raw packet access. Only add capabilities that applications genuinely require.

## Common Capability Requirements

Different application types need different capabilities:

```yaml
# Database requiring file capabilities
apiVersion: v1
kind: Pod
metadata:
  name: database
spec:
  securityContext:
    runAsUser: 999
    fsGroup: 999
  containers:
  - name: postgres
    image: postgres:13
    securityContext:
      capabilities:
        drop:
        - ALL
        add:
        - CHOWN
        - DAC_OVERRIDE
        - FOWNER
        - SETGID
        - SETUID
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: db-pvc

---
# Monitoring agent requiring system access
apiVersion: v1
kind: Pod
metadata:
  name: monitor
spec:
  securityContext:
    runAsUser: 3000
  containers:
  - name: agent
    image: monitoring-agent:1.0
    securityContext:
      capabilities:
        drop:
        - ALL
        add:
        - SYS_PTRACE
```

Document why each capability is necessary.

## Avoiding Dangerous Capabilities

Never add capabilities that grant near-root access:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: safe-app
spec:
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      capabilities:
        drop:
        - ALL
        # NEVER add these without extreme justification:
        # - SYS_ADMIN (almost equivalent to root)
        # - SYS_MODULE (kernel module loading)
        # - SYS_BOOT (system reboot)
        # - MAC_ADMIN (MAC policy changes)
        add:
        - NET_BIND_SERVICE
```

Capabilities like SYS_ADMIN essentially grant root privileges and should almost never be used.

## Testing Capability Requirements

Systematically determine which capabilities applications need:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: capability-test
spec:
  securityContext:
    runAsUser: 4000
    runAsNonRoot: true
  containers:
  - name: test
    image: myapp:1.0
    command: ["sh", "-c"]
    args:
    - |
      # Start the application and monitor for capability errors
      /app/start.sh 2>&1 | tee /tmp/startup.log

      # Check for operation not permitted errors
      if grep -i "operation not permitted" /tmp/startup.log; then
        echo "Capability errors detected"
      fi

      sleep 3600
    securityContext:
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

Application errors indicating "operation not permitted" suggest missing capabilities.

## Capability Auditing

Check container capabilities at runtime:

```bash
# Exec into container and check capabilities
kubectl exec -it pod-name -- sh -c "cat /proc/1/status | grep Cap"

# Decode capability bitmask
kubectl exec -it pod-name -- sh -c "capsh --decode=00000000a80425fb"
```

Verify containers run with only intended capabilities.

## Debugging Capability Issues

Debug permission errors:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-caps
spec:
  securityContext:
    runAsUser: 5000
    runAsNonRoot: true
  containers:
  - name: debug
    image: ubuntu:20.04
    command: ["bash", "-c"]
    args:
    - |
      # Install capsh if not available
      apt-get update && apt-get install -y libcap2-bin

      echo "=== Current Capabilities ==="
      capsh --print

      echo "=== Process Capabilities ==="
      cat /proc/self/status | grep Cap

      echo "=== Test Operations ==="
      # Try binding to privileged port
      nc -l 80 2>&1 || echo "Port 80 bind failed (expected without NET_BIND_SERVICE)"

      sleep 3600
    securityContext:
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE
```

This helps identify which capabilities are actually needed.

## Pod Security Standards Enforcement

Restricted Pod Security Standard requires dropping all capabilities:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: restricted-apps
  labels:
    pod-security.kubernetes.io/enforce: restricted
---
apiVersion: v1
kind: Pod
metadata:
  name: compliant-pod
  namespace: restricted-apps
spec:
  securityContext:
    runAsUser: 6000
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
        add:
        - NET_BIND_SERVICE
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

The restricted standard permits adding specific capabilities after dropping all.

## Capabilities in Init Containers

Init containers can have different capabilities:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-caps-demo
spec:
  initContainers:
  - name: setup
    image: busybox
    command: ["sh", "-c", "chown -R 7000:7000 /data"]
    securityContext:
      runAsUser: 0
      capabilities:
        drop:
        - ALL
        add:
        - CHOWN
    volumeMounts:
    - name: data
      mountPath: /data
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      runAsUser: 7000
      runAsNonRoot: true
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

Init containers can have elevated capabilities for setup tasks while main containers remain restricted.

## DaemonSet with Minimal Capabilities

Even privileged workloads should minimize capabilities:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: exporter
        image: node-exporter:1.0
        securityContext:
          capabilities:
            drop:
            - ALL
            add:
            - SYS_TIME
        ports:
        - containerPort: 9100
          hostPort: 9100
```

Even with host namespaces, drop all capabilities and add only required ones.

## Documenting Capability Decisions

Document why capabilities are needed:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: documented-caps
  annotations:
    capability/NET_BIND_SERVICE: "Required to bind to port 443"
    security-review-date: "2026-02-09"
    security-reviewer: "security-team@company.com"
spec:
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE
```

Regular reviews ensure capabilities remain justified.

## Conclusion

Dropping all capabilities and adding only specific required ones implements true least privilege in containers. This pattern prevents containers from using dangerous kernel features while allowing necessary operations. Start by dropping all capabilities, test your application, then add capabilities one by one until it functions correctly. Never add capabilities broadly or without justification, especially dangerous ones like SYS_ADMIN. Document why each capability is needed and review regularly. Combine capability dropping with other security measures like running as non-root, read-only root filesystems, and seccomp profiles. The drop-all-add-specific pattern should be standard in all production workloads, providing kernel-level enforcement of minimal privileges that significantly reduces container security risk.

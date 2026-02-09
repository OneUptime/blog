# How to use runtime/default seccomp profile for baseline security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Seccomp, Baseline Security, System Calls

Description: Learn how to implement the runtime/default seccomp profile in Kubernetes to establish baseline security by blocking dangerous system calls while maintaining application compatibility across container runtimes.

---

The runtime/default seccomp profile provides essential security without requiring custom profile development. This profile blocks obviously dangerous system calls while allowing common operations, making it ideal for baseline security across diverse applications. Understanding and implementing runtime/default is a quick win that significantly improves container security.

## What is runtime/default

The runtime/default profile is maintained by container runtime developers (containerd, CRI-O, Docker). It blocks system calls that normal applications never need, like mounting filesystems, loading kernel modules, or rebooting the system. The profile balances security with compatibility, working for most applications without modification.

Unlike custom profiles that require maintenance as applications change, runtime/default evolves with the container runtime. When security researchers discover new dangerous system calls, runtime maintainers update the default profile.

## Basic Configuration

Apply runtime/default to pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: runtime-default-demo
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: nginx:1.21
    securityContext:
      runAsUser: 101
      runAsNonRoot: true
      allowPrivilegeEscalation: false
```

This simple configuration provides significant security improvement over no seccomp profile.

## Container-Level Configuration

Apply profiles per container:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: per-container-seccomp
spec:
  containers:
  - name: web
    image: nginx:1.21
    securityContext:
      seccompProfile:
        type: RuntimeDefault
      runAsUser: 101
      runAsNonRoot: true

  - name: cache
    image: redis:6
    securityContext:
      seccompProfile:
        type: RuntimeDefault
      runAsUser: 999
      runAsNonRoot: true
```

Each container gets runtime/default protection independently.

## What runtime/default Blocks

The profile blocks dangerous system calls:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: blocked-operations
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: test
    image: ubuntu:20.04
    command: ["bash", "-c"]
    args:
    - |
      # These operations will fail with runtime/default

      # Mounting filesystems (blocked)
      mount /dev/sda1 /mnt 2>&1 || echo "mount: blocked by seccomp"

      # Loading kernel modules (blocked)
      insmod /lib/modules/mymodule.ko 2>&1 || echo "insmod: blocked by seccomp"

      # Rebooting system (blocked)
      reboot 2>&1 || echo "reboot: blocked by seccomp"

      # Creating namespaces (may be blocked)
      unshare --user 2>&1 || echo "unshare: may be blocked"

      # Normal operations still work
      echo "Writing files works"
      cat /etc/os-release
      curl https://example.com

      sleep 3600
```

Applications that don't use these dangerous syscalls work normally.

## Deployment-Wide Configuration

Apply runtime/default to all pods in a deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      securityContext:
        seccompProfile:
          type: RuntimeDefault
        runAsUser: 1000
        runAsNonRoot: true
        fsGroup: 2000
      containers:
      - name: app
        image: myapp:1.0
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: tmp
        emptyDir: {}
```

All pods in the deployment get consistent security configuration.

## StatefulSet with runtime/default

Apply to StatefulSets:

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
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      securityContext:
        seccompProfile:
          type: RuntimeDefault
        runAsUser: 999
        fsGroup: 999
      containers:
      - name: postgres
        image: postgres:13
        securityContext:
          allowPrivilegeEscalation: false
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
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

Databases work normally with runtime/default.

## DaemonSet Configuration

Apply to infrastructure pods:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      securityContext:
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: collector
        image: fluentd:v1.14
        securityContext:
          runAsUser: 0  # Needs root to read logs
          allowPrivilegeEscalation: false
        volumeMounts:
        - name: varlog
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
```

Even privileged infrastructure components benefit from runtime/default.

## Namespace-Wide Enforcement

Enforce runtime/default via Pod Security Standards:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: secure-apps
  labels:
    # Baseline and restricted both require seccomp
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

Baseline standard requires either runtime/default or localhost seccomp profiles.

## Combining with Other Security Measures

Layer security controls:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: defense-in-depth
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
    runAsUser: 5000
    runAsNonRoot: true
    fsGroup: 5000
    seLinuxOptions:
      level: "s0:c100,c200"
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
      procMount: Default
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

Runtime/default complements other security context settings.

## Testing Application Compatibility

Verify applications work with runtime/default:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: compatibility-test
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: test
    image: myapp:1.0
    command: ["sh", "-c"]
    args:
    - |
      # Run application test suite
      /app/run-tests.sh

      # Check for seccomp violations
      if [ $? -ne 0 ]; then
        echo "Tests failed - check for seccomp issues"
        exit 1
      fi

      echo "Application compatible with runtime/default"
      sleep 3600
```

Most applications work without changes.

## Migration Strategy

Gradually enable runtime/default:

```yaml
# Stage 1: Test in development
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
  annotations:
    stage: "testing-runtime-default"

---
# Stage 2: Enforce in staging
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    pod-security.kubernetes.io/enforce: baseline
  annotations:
    stage: "enforcing-runtime-default"

---
# Stage 3: Enforce in production
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: baseline
  annotations:
    stage: "runtime-default-enforced"
```

Progressive rollout minimizes risk.

## Monitoring for Violations

Track seccomp denials:

```bash
# Check kernel audit logs on nodes
sudo ausearch -m SECCOMP --start recent

# Example output shows blocked syscalls
type=SECCOMP msg=audit(1707501234.567:890): auid=4294967295 uid=1000 gid=1000
  ses=4294967295 pid=12345 comm="myapp" exe="/usr/bin/myapp" sig=31 arch=c000003e
  syscall=165 compat=0 ip=0x7f8a9b2c3d4e code=0x7ffc0000
```

Violations indicate either application issues or attacks.

## Performance Impact

Runtime/default has minimal performance overhead:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: performance-test
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: benchmark
    image: benchmark-tool:1.0
    command: ["sh", "-c"]
    args:
    - |
      # Run performance benchmarks
      echo "Testing with runtime/default..."
      /benchmark --syscall-intensive

      # Compare with no seccomp
      # (requires separate test without seccomp)
```

Performance impact is typically negligible for real applications.

## Default Configuration in Cluster

Set runtime/default as cluster default:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      enforce: baseline
      audit: restricted
      warn: restricted
```

Baseline standard requires seccomp, making runtime/default effectively mandatory.

## Conclusion

The runtime/default seccomp profile provides essential baseline security with minimal effort and excellent compatibility. It blocks dangerous system calls that enable container escapes and privilege escalation while allowing normal application operations. Apply runtime/default to all workloads as a starting point for container security, then consider custom profiles for applications with specialized requirements. The profile is maintained by container runtime developers and evolves with security best practices. Combine runtime/default with other security context settings like running as non-root, dropping capabilities, and read-only filesystems for defense in depth. Enable it cluster-wide through Pod Security Standards to ensure all workloads benefit from this protection. Runtime/default represents the minimum acceptable seccomp configuration for production Kubernetes workloads.

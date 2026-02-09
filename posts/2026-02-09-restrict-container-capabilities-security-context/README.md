# How to Restrict Container Capabilities Using securityContext in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Linux

Description: Learn how to use Kubernetes securityContext to drop unnecessary Linux capabilities and grant only the minimum required privileges to containers for enhanced security.

---

Linux capabilities divide the privileges traditionally associated with the root user into distinct units that can be independently enabled or disabled. In Kubernetes, properly managing capabilities through securityContext is essential for implementing the principle of least privilege and reducing the attack surface of containerized applications.

This guide explores how to identify, drop, and selectively grant Linux capabilities to achieve secure container configurations.

## Understanding Linux Capabilities

Linux capabilities break down root privileges into smaller pieces. Instead of running as root with all privileges, containers can run as non-root users with only the specific capabilities they need.

Common capabilities include:

- `CAP_NET_BIND_SERVICE`: Bind to ports below 1024
- `CAP_NET_RAW`: Use raw and packet sockets
- `CAP_SYS_ADMIN`: Perform various system administration operations
- `CAP_CHOWN`: Change file ownership
- `CAP_DAC_OVERRIDE`: Bypass file read, write, and execute permission checks
- `CAP_SETUID`/`CAP_SETGID`: Change user and group IDs

By default, Docker and containerd grant containers a set of capabilities that, while fewer than full root, still represent significant privileges.

## Prerequisites

Before configuring capabilities, ensure you have:

- A Kubernetes cluster with a recent version (1.20+)
- kubectl with appropriate access
- Understanding of your application's privilege requirements
- Familiarity with Linux capabilities

## Dropping All Capabilities

The most secure starting point is dropping all capabilities:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: no-capabilities
spec:
  containers:
  - name: app
    image: nginx:1.25
    securityContext:
      capabilities:
        drop:
        - ALL
```

This configuration removes all Linux capabilities from the container. Most applications will work fine without any capabilities when running as a non-root user.

Test this configuration:

```bash
kubectl apply -f no-capabilities.yaml
kubectl exec -it no-capabilities -- capsh --print
```

You'll see that the process has no capabilities in its effective, permitted, or inheritable sets.

## Granting Specific Capabilities

Some applications need specific capabilities to function. Add only what's required:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        ports:
        - containerPort: 80
        securityContext:
          runAsNonRoot: true
          runAsUser: 101  # nginx user
          capabilities:
            drop:
            - ALL
            add:
            - NET_BIND_SERVICE  # Allow binding to port 80
```

This configuration allows nginx to bind to port 80 while running as a non-root user, but grants no other elevated privileges.

## Common Capability Patterns

Different application types typically need different capability sets.

**Web servers (binding to privileged ports):**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server-privileged-port
spec:
  containers:
  - name: server
    image: myapp:latest
    securityContext:
      runAsUser: 1000
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE
```

**Network monitoring tools:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: network-monitor
spec:
  containers:
  - name: tcpdump
    image: nicolaka/netshoot
    command: ["tcpdump", "-i", "eth0"]
    securityContext:
      runAsUser: 1000
      capabilities:
        drop:
        - ALL
        add:
        - NET_RAW
        - NET_ADMIN
```

**File ownership management:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: file-manager
spec:
  containers:
  - name: app
    image: busybox
    command: ["chown", "-R", "1000:1000", "/data"]
    volumeMounts:
    - name: data
      mountPath: /data
    securityContext:
      capabilities:
        drop:
        - ALL
        add:
        - CHOWN
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-data
```

## Avoiding Dangerous Capabilities

Some capabilities are particularly dangerous and should almost never be granted:

```yaml
# DO NOT USE IN PRODUCTION
apiVersion: v1
kind: Pod
metadata:
  name: dangerous-example
spec:
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      capabilities:
        add:
        - SYS_ADMIN  # Equivalent to root for many purposes
        - SYS_MODULE # Can load kernel modules
        - SYS_RAWIO  # Can perform I/O port operations
        - DAC_OVERRIDE  # Bypass all file permission checks
```

If your application requires these capabilities, consider:

- Redesigning the application to avoid the requirement
- Running it as a separate privileged pod in an isolated namespace
- Using a service mesh or sidecar to handle privileged operations
- Implementing the functionality outside the container

## Analyzing Required Capabilities

To determine which capabilities your application needs, run it with all capabilities dropped and observe failures:

```bash
# Deploy with all capabilities dropped
kubectl apply -f drop-all.yaml

# Watch for capability-related errors
kubectl logs -f <pod-name>

# Common errors indicate missing capabilities:
# "bind: permission denied" -> Need NET_BIND_SERVICE
# "chown: operation not permitted" -> Need CHOWN
# "setuid: operation not permitted" -> Need SETUID
```

Alternatively, use tools like `pscap` to audit running containers:

```bash
# Install libcap on the host
apt-get install libcap2-bin

# Check capabilities of a running process
docker exec <container-id> sh -c 'cat /proc/1/status | grep Cap'
```

## Implementing Capabilities in DaemonSets

DaemonSets often need elevated privileges for system monitoring or networking tasks:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-monitor
spec:
  selector:
    matchLabels:
      app: monitor
  template:
    metadata:
      labels:
        app: monitor
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: monitor
        image: prometheus/node-exporter:latest
        securityContext:
          runAsNonRoot: true
          runAsUser: 65534
          capabilities:
            drop:
            - ALL
            add:
            - SYS_TIME  # Read system time
          readOnlyRootFilesystem: true
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
```

## Policy Enforcement with Pod Security Policies

Enforce capability restrictions cluster-wide using admission controllers:

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted-capabilities
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  allowedCapabilities:
  - NET_BIND_SERVICE
  volumes:
  - 'configMap'
  - 'emptyDir'
  - 'projected'
  - 'secret'
  - 'downwardAPI'
  - 'persistentVolumeClaim'
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
  readOnlyRootFilesystem: true
```

For newer Kubernetes versions, use ValidatingAdmissionPolicy:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: restrict-capabilities
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
        has(c.securityContext.capabilities.drop) &&
        'ALL' in c.securityContext.capabilities.drop
      )
    message: "All capabilities must be dropped"
  - expression: |
      object.spec.containers.all(c,
        !has(c.securityContext.capabilities.add) ||
        c.securityContext.capabilities.add.all(cap,
          cap in ['NET_BIND_SERVICE', 'CHOWN', 'SETUID', 'SETGID']
        )
      )
    message: "Only approved capabilities can be added"
```

## Init Containers and Capabilities

Init containers sometimes need different capabilities than application containers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-init
spec:
  initContainers:
  - name: setup
    image: busybox
    command: ['sh', '-c', 'chown -R 1000:1000 /data']
    volumeMounts:
    - name: data
      mountPath: /data
    securityContext:
      capabilities:
        drop:
        - ALL
        add:
        - CHOWN  # Only for init container
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: data
      mountPath: /data
    securityContext:
      runAsUser: 1000
      capabilities:
        drop:
        - ALL  # App needs no capabilities
  volumes:
  - name: data
    emptyDir: {}
```

## Testing Capability Restrictions

Create a test suite to verify capability restrictions:

```bash
#!/bin/bash
# Test capability restrictions

echo "Testing capability restrictions..."

# Test 1: Verify ALL capabilities are dropped
kubectl run test-drop-all --image=busybox --rm -it --restart=Never \
  --overrides='{"spec":{"containers":[{"name":"test","image":"busybox","command":["sh","-c","capsh --print"],"securityContext":{"capabilities":{"drop":["ALL"]}}}]}}' \
  -- sh -c "capsh --print | grep Current"

# Test 2: Verify specific capability is added
kubectl run test-net-bind --image=nginx --rm -it --restart=Never \
  --overrides='{"spec":{"containers":[{"name":"test","image":"nginx","securityContext":{"runAsUser":101,"capabilities":{"drop":["ALL"],"add":["NET_BIND_SERVICE"]}}}]}}' \
  -- sh -c "capsh --print | grep NET_BIND_SERVICE"

# Test 3: Verify dangerous capabilities are blocked
kubectl run test-dangerous --image=busybox --rm -it --restart=Never \
  --overrides='{"spec":{"containers":[{"name":"test","image":"busybox","securityContext":{"capabilities":{"add":["SYS_ADMIN"]}}}]}}' \
  2>&1 | grep -q "denied" && echo "Correctly blocked SYS_ADMIN"
```

## Monitoring Capability Usage

Set up monitoring to detect containers running with excessive capabilities:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-rules
data:
  custom-rules.yaml: |
    - rule: Container Running with Sensitive Capabilities
      desc: Detect containers running with dangerous capabilities
      condition: >
        container and
        (container.privileged=true or
         container.capability.sys_admin or
         container.capability.sys_module)
      output: >
        Container running with sensitive capabilities
        (user=%user.name container=%container.name
         image=%container.image.repository capabilities=%container.capabilities)
      priority: WARNING
```

## Conclusion

Properly restricting Linux capabilities is a fundamental aspect of container security. By dropping all capabilities by default and adding only those explicitly required, you minimize the potential impact of container compromises and enforce the principle of least privilege.

Start by auditing your existing workloads to understand their capability requirements, implement drop-all policies with selective additions, and enforce restrictions through admission control. Combined with running as non-root users and using read-only filesystems, capability restrictions form a critical layer of defense-in-depth for Kubernetes security.

Monitor capability usage through OneUptime to detect anomalies and ensure compliance with your security policies over time.

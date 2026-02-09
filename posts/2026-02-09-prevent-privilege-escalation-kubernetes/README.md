# How to Prevent Privilege Escalation with allowPrivilegeEscalation: false

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Linux

Description: Learn how to use allowPrivilegeEscalation security context setting in Kubernetes to prevent containers from gaining additional privileges beyond their initial configuration.

---

Privilege escalation occurs when a process gains more privileges than it was initially granted. In containerized environments, preventing privilege escalation is critical for maintaining security boundaries. The `allowPrivilegeEscalation` security context setting in Kubernetes provides a mechanism to block processes from gaining additional privileges through setuid binaries or other means.

This guide explains how privilege escalation works, why it's dangerous, and how to prevent it effectively in Kubernetes.

## Understanding Privilege Escalation

Privilege escalation in Linux containers can happen in several ways:

- Executing setuid/setgid binaries that run with elevated privileges
- Using capabilities to gain additional permissions
- Exploiting kernel vulnerabilities to bypass security restrictions
- Leveraging misconfigurations to access privileged resources

The `allowPrivilegeEscalation` setting controls whether a process can gain more privileges than its parent process. When set to `false`, the kernel's `no_new_privs` flag is enabled, preventing privilege escalation mechanisms from working.

## Prerequisites

Ensure you have:

- Kubernetes cluster (version 1.8 or later)
- kubectl with appropriate access
- Understanding of Linux privilege models
- Familiarity with Kubernetes security contexts

## Basic Configuration

Set `allowPrivilegeEscalation: false` in your pod security context:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: no-escalation
spec:
  containers:
  - name: app
    image: ubuntu:22.04
    command: ["sleep", "3600"]
    securityContext:
      allowPrivilegeEscalation: false
      runAsNonRoot: true
      runAsUser: 1000
```

With this configuration, even if the container has setuid binaries, they cannot escalate privileges.

Test this behavior:

```bash
kubectl apply -f no-escalation.yaml

# Try to use sudo (a setuid binary)
kubectl exec no-escalation -- sudo id
# Error: sudo: effective uid is not 0, is /usr/bin/sudo on a file system with the 'nosuid' option set or an NFS file system without root privileges?
```

The setuid mechanism is blocked, preventing the privilege escalation.

## How allowPrivilegeEscalation Works

When `allowPrivilegeEscalation: false` is set, Kubernetes configures the container runtime to set the `no_new_privs` bit on the container's init process. This bit is inherited by all child processes and prevents:

- Gaining capabilities through execve()
- Transitioning to a different SELinux context with more privileges
- Executing setuid/setgid programs with elevated privileges
- Using file capabilities to gain permissions

This provides defense-in-depth even if other security controls fail.

## Comparing Containers With and Without Protection

**Without protection (default behavior):**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: with-escalation
spec:
  containers:
  - name: app
    image: ubuntu:22.04
    command: ["sleep", "3600"]
    securityContext:
      runAsUser: 1000
      # allowPrivilegeEscalation defaults to true
```

This container can potentially escalate privileges if setuid binaries are available:

```bash
# If ping is setuid root (common on some systems)
kubectl exec with-escalation -- ping -c 1 8.8.8.8
# Works because ping can temporarily gain capabilities
```

**With protection:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: no-escalation
spec:
  containers:
  - name: app
    image: ubuntu:22.04
    command: ["sleep", "3600"]
    securityContext:
      runAsUser: 1000
      allowPrivilegeEscalation: false
```

Setuid binaries cannot gain privileges:

```bash
kubectl exec no-escalation -- ping -c 1 8.8.8.8
# May fail depending on whether ping needs elevated privileges
```

## Best Practice Configuration

Combine `allowPrivilegeEscalation: false` with other security settings:

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

This configuration provides comprehensive protection:

- Runs as non-root user
- Prevents privilege escalation
- Uses read-only filesystem
- Drops all capabilities
- Applies seccomp filtering

## Deployment-Wide Enforcement

Apply the setting to all containers in a deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 5
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: frontend
        image: frontend:v2
        securityContext:
          allowPrivilegeEscalation: false
          runAsUser: 1000

      - name: backend
        image: backend:v2
        securityContext:
          allowPrivilegeEscalation: false
          runAsUser: 1001

      - name: cache
        image: redis:7
        securityContext:
          allowPrivilegeEscalation: false
          runAsUser: 999
```

## Pod-Level vs Container-Level Settings

You can set security contexts at the pod level to apply defaults:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    # Pod-level doesn't support allowPrivilegeEscalation
  containers:
  - name: app1
    image: app1:latest
    securityContext:
      allowPrivilegeEscalation: false  # Must be set per-container

  - name: app2
    image: app2:latest
    securityContext:
      allowPrivilegeEscalation: false
```

The `allowPrivilegeEscalation` field must be set on each container individually, as it's not available at the pod level.

## StatefulSet Configuration

For StatefulSets, apply the same security settings:

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
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
      - name: postgres
        image: postgres:16
        securityContext:
          allowPrivilegeEscalation: false
          runAsUser: 999
          runAsNonRoot: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        - name: run
          mountPath: /var/run/postgresql
      volumes:
      - name: run
        emptyDir: {}
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
```

## DaemonSet Considerations

DaemonSets often run system-level workloads that might need privileges. Evaluate carefully:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
spec:
  selector:
    matchLabels:
      app: logs
  template:
    metadata:
      labels:
        app: logs
    spec:
      containers:
      - name: collector
        image: fluent-bit:latest
        securityContext:
          allowPrivilegeEscalation: false
          runAsUser: 0  # May need root for reading logs
          capabilities:
            drop:
            - ALL
            add:
            - DAC_READ_SEARCH  # Read any file
        volumeMounts:
        - name: varlog
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
```

Even when running as root, prevent privilege escalation to limit potential damage.

## Admission Policy Enforcement

Enforce `allowPrivilegeEscalation: false` cluster-wide:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: prevent-privilege-escalation
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
        has(c.securityContext.allowPrivilegeEscalation) &&
        c.securityContext.allowPrivilegeEscalation == false
      )
    message: "Containers must set allowPrivilegeEscalation: false"

  - expression: |
      !has(object.spec.initContainers) ||
      object.spec.initContainers.all(c,
        has(c.securityContext.allowPrivilegeEscalation) &&
        c.securityContext.allowPrivilegeEscalation == false
      )
    message: "Init containers must set allowPrivilegeEscalation: false"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: prevent-escalation-binding
spec:
  policyName: prevent-privilege-escalation
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchLabels:
        enforce-security: "true"
```

Apply to production namespaces:

```bash
kubectl label namespace production enforce-security=true
```

## Testing Privilege Escalation Protection

Verify that privilege escalation is blocked:

```bash
#!/bin/bash
# Test privilege escalation protection

POD_NAME="test-escalation-$$"

# Create test pod
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: $POD_NAME
spec:
  containers:
  - name: test
    image: ubuntu:22.04
    command: ["sleep", "3600"]
    securityContext:
      allowPrivilegeEscalation: false
      runAsUser: 1000
EOF

kubectl wait --for=condition=ready pod/$POD_NAME --timeout=60s

# Try to escalate privileges using sudo
echo "Testing sudo (should fail):"
kubectl exec $POD_NAME -- bash -c 'apt-get update && apt-get install -y sudo && sudo id' 2>&1 | grep -q "effective uid is not 0" && echo "✓ Privilege escalation blocked"

# Check no_new_privs flag
echo "Checking no_new_privs flag:"
kubectl exec $POD_NAME -- cat /proc/1/status | grep NoNewPrivs
# Should show: NoNewPrivs: 1

# Cleanup
kubectl delete pod $POD_NAME
```

## Common Exceptions

Some legitimate use cases might need privilege escalation:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: system-installer
  namespace: kube-system
spec:
  containers:
  - name: installer
    image: installer:latest
    securityContext:
      allowPrivilegeEscalation: true  # Needed for installation tasks
      runAsUser: 0
```

Document these exceptions and review them regularly. Use namespace-based policy exemptions:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: prevent-escalation-binding
spec:
  policyName: prevent-privilege-escalation
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchExpressions:
      - key: name
        operator: NotIn
        values: ["kube-system", "privileged-workloads"]
```

## Monitoring and Alerting

Monitor for containers that violate the policy:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: falco-rules
data:
  custom-rules.yaml: |
    - rule: Container Allows Privilege Escalation
      desc: Detect containers configured to allow privilege escalation
      condition: >
        container and
        k8s.pod.security.context.allow_privilege_escalation = true
      output: >
        Container allows privilege escalation
        (user=%user.name pod=%k8s.pod.name
         namespace=%k8s.ns.name image=%container.image.repository)
      priority: WARNING
```

## Conclusion

Setting `allowPrivilegeEscalation: false` is a simple but effective security control that prevents containers from gaining additional privileges beyond their initial configuration. By blocking setuid binaries and other escalation mechanisms, you create an additional security boundary that limits the potential damage from compromised containers.

Implement this setting on all production workloads, enforce it through admission policies, and create documented exceptions for the rare cases where privilege escalation is legitimately required. Monitor with OneUptime to ensure compliance and detect any violations in real-time.

Combined with running as non-root, dropping capabilities, and using read-only filesystems, preventing privilege escalation forms a core component of container security hardening.

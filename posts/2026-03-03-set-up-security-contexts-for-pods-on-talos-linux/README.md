# How to Set Up Security Contexts for Pods on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Security Context, Kubernetes, Pod Security, Container Hardening

Description: Comprehensive guide to setting up and managing security contexts for pods on Talos Linux, covering every field and practical deployment patterns.

---

Security contexts in Kubernetes give you fine-grained control over how pods and containers interact with the underlying system. They define user IDs, group IDs, filesystem permissions, Linux capabilities, and kernel-level security features. On Talos Linux, where the host OS is already locked down, security contexts let you extend that same level of control to every container running in your cluster.

This guide goes deep into security context configuration on Talos Linux, covering both pod-level and container-level settings with real-world examples.

## Pod-Level vs Container-Level Security Contexts

Kubernetes provides two places to set security contexts. Pod-level settings (under spec.securityContext) apply to all containers in the pod. Container-level settings (under spec.containers[].securityContext) apply to individual containers and override pod-level settings where they overlap.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
spec:
  # Pod-level - applies to all containers
  securityContext:
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 2000
    runAsNonRoot: true
  containers:
    - name: app
      image: myapp:latest
      # Container-level - overrides pod-level where applicable
      securityContext:
        readOnlyRootFilesystem: true
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
    - name: sidecar
      image: sidecar:latest
      # This container inherits pod-level runAsUser: 1000
      # but has its own container-level settings
      securityContext:
        readOnlyRootFilesystem: true
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
          add:
            - NET_BIND_SERVICE
```

## Essential Security Context Fields

### User and Group Identity

The runAsUser, runAsGroup, and supplementalGroups fields control the identity of the container processes.

```yaml
securityContext:
  # Process runs as UID 1000
  runAsUser: 1000
  # Primary group is GID 1000
  runAsGroup: 1000
  # Additional groups the process belongs to
  supplementalGroups:
    - 2000
    - 3000
```

This is important on Talos Linux because even though the OS prevents direct SSH access, a container running as root still has elevated privileges within its namespace. Setting explicit user and group IDs ensures processes run with the minimum required permissions.

### Filesystem Group

The fsGroup field is critical for pods that use persistent volumes. It sets the group ownership of all files in mounted volumes.

```yaml
securityContext:
  fsGroup: 1000
  # OnRootMismatch only changes ownership if the root directory
  # does not match the expected fsGroup - faster for large volumes
  fsGroupChangePolicy: OnRootMismatch
```

```bash
# Verify fsGroup is working
kubectl exec mypod -- ls -la /data
# Files should show group ownership matching fsGroup
```

### Seccomp Profiles

Seccomp filters restrict the system calls a container can make. The RuntimeDefault profile blocks dangerous syscalls while allowing normal application behavior.

```yaml
securityContext:
  seccompProfile:
    type: RuntimeDefault
```

For even tighter control, use a custom seccomp profile.

```yaml
securityContext:
  seccompProfile:
    type: Localhost
    localhostProfile: profiles/custom-profile.json
```

### SELinux Options

While Talos Linux does not use SELinux by default, if you have enabled it, you can set SELinux labels on pods.

```yaml
securityContext:
  seLinuxOptions:
    level: "s0:c123,c456"
    role: "system_r"
    type: "container_t"
```

## Building a Restricted Pod Template

Here is a comprehensive template that follows security best practices for Talos Linux.

```yaml
# restricted-pod-template.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: production
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
      # Prevent automounting of service account tokens unless needed
      automountServiceAccountToken: false

      # Pod-level security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        runAsGroup: 10001
        fsGroup: 10001
        fsGroupChangePolicy: OnRootMismatch
        seccompProfile:
          type: RuntimeDefault

      containers:
        - name: app
          image: myapp:v1.2.3
          ports:
            - containerPort: 8080
              protocol: TCP

          # Container-level security context
          securityContext:
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            privileged: false
            capabilities:
              drop:
                - ALL

          # Resource limits prevent resource exhaustion
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi

          # Writable directories via volume mounts
          volumeMounts:
            - name: tmp-dir
              mountPath: /tmp
            - name: app-data
              mountPath: /app/data

      volumes:
        - name: tmp-dir
          emptyDir:
            medium: Memory
            sizeLimit: 64Mi
        - name: app-data
          emptyDir:
            sizeLimit: 256Mi
```

## Multi-Container Pod Security Patterns

When pods have multiple containers, each needs its own security context, but they share the pod-level settings.

### Init Container Pattern

Init containers often need different permissions than the main application container.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-init
spec:
  securityContext:
    runAsNonRoot: true
    fsGroup: 1000

  initContainers:
    - name: setup-permissions
      image: busybox:latest
      command: ["sh", "-c", "cp /config-template/* /config/ && chmod 640 /config/*"]
      securityContext:
        runAsUser: 1000
        runAsGroup: 1000
        readOnlyRootFilesystem: true
        allowPrivilegeEscalation: false
        capabilities:
          drop:
            - ALL
      volumeMounts:
        - name: config-template
          mountPath: /config-template
          readOnly: true
        - name: config
          mountPath: /config

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
      volumeMounts:
        - name: config
          mountPath: /config
          readOnly: true

  volumes:
    - name: config-template
      configMap:
        name: app-config
    - name: config
      emptyDir: {}
```

### Sidecar Pattern

Sidecars like log collectors or proxies need carefully scoped security contexts.

```yaml
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

  - name: log-collector
    image: fluentbit:latest
    securityContext:
      runAsUser: 2000
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      capabilities:
        drop:
          - ALL
    volumeMounts:
      - name: app-logs
        mountPath: /var/log/app
        readOnly: true
```

## Namespace-Level Enforcement on Talos Linux

Apply Pod Security Standards at the namespace level to enforce security contexts across all workloads.

```bash
# Create a namespace with restricted enforcement
kubectl create namespace secure-apps

kubectl label namespace secure-apps \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

Test that enforcement is working.

```bash
# This should fail because it does not meet the restricted standard
kubectl run test-pod --image=nginx -n secure-apps
# Error: pods "test-pod" is forbidden: violates PodSecurity "restricted:latest"

# This should succeed with proper security context
kubectl apply -n secure-apps -f restricted-pod-template.yaml
```

## Auditing Security Contexts

Regularly audit your cluster to find pods with weak security settings.

```bash
# Find pods without security contexts
kubectl get pods -A -o json | jq '.items[] |
  select(.spec.securityContext == null or .spec.securityContext == {}) |
  {namespace: .metadata.namespace, name: .metadata.name}'

# Find containers running as root
kubectl get pods -A -o json | jq '.items[] |
  select(.spec.containers[].securityContext.runAsNonRoot != true) |
  {namespace: .metadata.namespace, name: .metadata.name}'
```

## Wrapping Up

Security contexts are the mechanism that extends Talos Linux's security model into the container layer. By properly configuring user identities, filesystem permissions, capabilities, and seccomp profiles, you ensure that every container follows the principle of least privilege. Start with the restricted pod template, enforce it at the namespace level using Pod Security Standards, and audit regularly to catch any workloads that slip through. On Talos Linux, the combination of an immutable OS and properly configured security contexts creates one of the most secure Kubernetes environments you can build.

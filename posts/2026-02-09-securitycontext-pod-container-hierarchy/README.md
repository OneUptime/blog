# How to use securityContext at pod and container level hierarchy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Security Context, Pod Security, Container Security

Description: Understand how security context settings interact between pod and container levels in Kubernetes, learning when settings override, merge, or complement each other for effective security configuration.

---

Kubernetes allows security context configuration at both pod and container levels. Understanding the hierarchy and interaction between these levels is crucial for implementing effective security policies. Some settings apply only at the pod level, others only at the container level, and some can be specified at both with container settings overriding pod settings.

## Pod-Level vs Container-Level Settings

Pod-level security context affects all containers in the pod and controls pod-wide settings like fsGroup and SELinux options. Container-level security context affects only that specific container and can override certain pod-level settings. This two-level system provides flexibility while maintaining sensible defaults.

Settings like fsGroup, supplementalGroups, and sysctls exist only at the pod level because they affect shared resources. Settings like readOnlyRootFilesystem and capabilities exist only at the container level. Settings like runAsUser and runAsGroup can exist at both levels with container settings taking precedence.

## Basic Hierarchy Example

Here's how pod and container security contexts interact:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hierarchy-demo
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 2000
    fsGroup: 3000
    runAsNonRoot: true
  containers:
  - name: container1
    image: nginx:1.21
    # Inherits pod settings: runAsUser=1000, runAsGroup=2000
  - name: container2
    image: busybox
    command: ["sleep", "3600"]
    securityContext:
      runAsUser: 4000
      # Overrides pod runAsUser
      # Inherits runAsGroup=2000 from pod
```

Container1 uses all pod-level settings. Container2 overrides runAsUser but inherits runAsGroup.

## Container-Specific Security Settings

Some settings only make sense at the container level:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: container-specific
spec:
  securityContext:
    runAsUser: 5000
    fsGroup: 5000
  containers:
  - name: web
    image: nginx:1.21
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE
    volumeMounts:
    - name: cache
      mountPath: /var/cache/nginx
  - name: sidecar
    image: busybox
    command: ["sleep", "3600"]
    securityContext:
      readOnlyRootFilesystem: false
      # Different from web container
  volumes:
  - name: cache
    emptyDir: {}
```

Each container has different readOnlyRootFilesystem and capabilities settings based on its requirements.

## Pod-Only Security Settings

Settings that affect the entire pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-only-settings
spec:
  securityContext:
    # Pod-only settings
    fsGroup: 6000
    fsGroupChangePolicy: OnRootMismatch
    supplementalGroups: [7000, 8000]
    sysctls:
    - name: net.ipv4.ip_local_port_range
      value: "32768 60999"
    seLinuxOptions:
      level: "s0:c100,c200"
  containers:
  - name: app
    image: myapp:1.0
    # Containers cannot override fsGroup or supplementalGroups
```

These settings apply to all containers because they affect shared pod resources.

## Override Patterns

Demonstrate different override scenarios:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: override-patterns
spec:
  securityContext:
    # Pod-level defaults
    runAsUser: 10000
    runAsGroup: 10000
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: fully-inherited
    image: app1:1.0
    # Uses all pod settings

  - name: user-override
    image: app2:1.0
    securityContext:
      runAsUser: 10001
      # Overrides user, inherits group and seccomp

  - name: fully-custom
    image: app3:1.0
    securityContext:
      runAsUser: 10002
      runAsGroup: 10002
      # Overrides both user and group
```

This demonstrates the flexibility of the hierarchy system.

## Combining Pod and Container Capabilities

Capabilities are container-only but interact with pod security:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: capabilities-demo
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 11000
    # Pod provides base security
  containers:
  - name: web-server
    image: nginx:1.21
    securityContext:
      capabilities:
        drop:
        - ALL
        add:
        - NET_BIND_SERVICE
      allowPrivilegeEscalation: false

  - name: metrics-collector
    image: prometheus:latest
    securityContext:
      capabilities:
        drop:
        - ALL
      # No added capabilities needed
      allowPrivilegeEscalation: false
```

Each container drops all capabilities then adds back only what it needs.

## Seccomp Profile Hierarchy

Seccomp profiles can be set at both levels:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: seccomp-hierarchy
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault
    # Default for all containers
  containers:
  - name: standard-app
    image: app1:1.0
    # Uses pod's RuntimeDefault

  - name: custom-app
    image: app2:1.0
    securityContext:
      seccompProfile:
        type: Localhost
        localhostProfile: profiles/custom.json
      # Overrides with custom profile
```

Container-level seccomp profiles override pod-level profiles.

## SELinux Context Hierarchy

SELinux options work at both levels:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: selinux-hierarchy
spec:
  securityContext:
    seLinuxOptions:
      level: "s0:c100,c200"
      type: "container_t"
  containers:
  - name: app1
    image: myapp:1.0
    # Inherits pod SELinux context

  - name: app2
    image: myapp:1.0
    securityContext:
      seLinuxOptions:
        level: "s0:c300,c400"
        # Different isolation level
```

Different containers can have different SELinux contexts for fine-grained isolation.

## Verifying Effective Security Context

Check the effective security context:

```bash
# Get effective security context
kubectl get pod hierarchy-demo -o jsonpath='{.spec.securityContext}' | jq

# Check container-specific settings
kubectl get pod hierarchy-demo -o jsonpath='{.spec.containers[*].securityContext}' | jq

# Verify at runtime
kubectl exec hierarchy-demo -c container1 -- id
kubectl exec hierarchy-demo -c container2 -- id
```

These commands show what actually applies to each container.

## Common Configuration Patterns

Standard patterns for different scenarios:

```yaml
# Pattern 1: Strict pod defaults with container overrides
apiVersion: v1
kind: Pod
metadata:
  name: strict-defaults
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 12000
    fsGroup: 12000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      capabilities:
        drop: [ALL]

---
# Pattern 2: Minimal pod config with detailed container config
apiVersion: v1
kind: Pod
metadata:
  name: minimal-pod
spec:
  securityContext:
    fsGroup: 13000
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      runAsUser: 13000
      runAsGroup: 13000
      runAsNonRoot: true
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      capabilities:
        drop: [ALL]
```

Choose patterns based on your security requirements.

## Init Container Considerations

Init containers follow the same hierarchy:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-container-security
spec:
  securityContext:
    fsGroup: 14000
    runAsUser: 14000
  initContainers:
  - name: setup
    image: busybox
    command: ["sh", "-c", "echo 'Setting up' && chmod 755 /data"]
    securityContext:
      runAsUser: 0
      # Runs as root for setup tasks
    volumeMounts:
    - name: data
      mountPath: /data
  containers:
  - name: app
    image: myapp:1.0
    # Uses pod's runAsUser: 14000
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    emptyDir: {}
```

Init containers can have different security contexts than main containers.

## Best Practices for Hierarchy

Follow these practices:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: best-practices
spec:
  securityContext:
    # Set restrictive defaults at pod level
    runAsNonRoot: true
    runAsUser: 15000
    fsGroup: 15000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      # Add container-specific restrictions
      readOnlyRootFilesystem: true
      allowPrivilegeEscalation: false
      capabilities:
        drop: [ALL]
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

Set secure defaults at the pod level and add specific restrictions at the container level.

## Troubleshooting Hierarchy Issues

Debug security context problems:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-hierarchy
spec:
  securityContext:
    runAsUser: 16000
    runAsGroup: 16000
  containers:
  - name: debug
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      echo "Effective UID: $(id -u)"
      echo "Effective GID: $(id -g)"
      echo "Groups: $(id -G)"
      echo "Full ID: $(id)"
      sleep 3600
    securityContext:
      runAsUser: 16001
```

This helps identify which settings are actually applied.

## Conclusion

Understanding security context hierarchy between pod and container levels enables effective security configuration. Set sensible defaults at the pod level for settings that affect all containers, then override or add container-specific settings as needed. Remember that fsGroup and supplementalGroups only exist at the pod level, while capabilities and readOnlyRootFilesystem only exist at the container level. Settings like runAsUser can be specified at both levels with container settings taking precedence. Use this flexibility to balance security and operational requirements, providing strict defaults while allowing containers to specify additional restrictions. Test configurations thoroughly to ensure the effective security context matches your expectations.

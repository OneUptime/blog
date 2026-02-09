# How to configure AppArmor annotations for per-container profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, AppArmor, Container Security, MAC

Description: Learn how to apply AppArmor profiles to individual containers in Kubernetes using per-container annotations, implementing mandatory access control policies tailored to each container's requirements.

---

AppArmor provides mandatory access control (MAC) that restricts program capabilities regardless of user privileges. Kubernetes supports AppArmor through annotations that can apply different profiles to different containers within the same pod. This granular control lets you tailor security policies to each container's specific needs.

## Understanding AppArmor in Kubernetes

AppArmor is a Linux kernel security module that confines programs according to predefined profiles. These profiles specify which files a program can access, which capabilities it can use, and which network operations it can perform. Unlike discretionary access control, AppArmor enforcement cannot be bypassed by privileged users.

Kubernetes applies AppArmor profiles through pod annotations. Each container can have its own profile, enabling fine-grained security policies within multi-container pods.

## Basic Per-Container AppArmor Configuration

Apply different AppArmor profiles to containers:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: apparmor-demo
  annotations:
    container.apparmor.security.beta.kubernetes.io/web: runtime/default
    container.apparmor.security.beta.kubernetes.io/sidecar: localhost/custom-sidecar
spec:
  containers:
  - name: web
    image: nginx:1.21
    # Uses runtime/default profile
  - name: sidecar
    image: busybox
    command: ["sleep", "3600"]
    # Uses custom-sidecar profile
```

The annotation format is `container.apparmor.security.beta.kubernetes.io/<container-name>: <profile>`.

## Available Profile Types

Kubernetes supports three AppArmor profile types:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: profile-types
  annotations:
    # runtime/default: Use default container profile
    container.apparmor.security.beta.kubernetes.io/default-container: runtime/default

    # unconfined: No AppArmor enforcement
    container.apparmor.security.beta.kubernetes.io/unconfined-container: unconfined

    # localhost/<profile>: Custom profile loaded on the node
    container.apparmor.security.beta.kubernetes.io/custom-container: localhost/my-custom-profile
spec:
  containers:
  - name: default-container
    image: myapp:1.0
  - name: unconfined-container
    image: debug-tool:1.0
  - name: custom-container
    image: sensitive-app:1.0
```

Use runtime/default for most containers, avoid unconfined except for debugging, and use custom profiles for specialized requirements.

## Creating Custom AppArmor Profiles

Custom profiles define specific restrictions:

```
#include <tunables/global>

profile custom-web-profile flags=(attach_disconnected) {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  # Allow network access
  network inet tcp,
  network inet udp,

  # Allow reading configuration
  /app/config/** r,

  # Allow writing to logs
  /var/log/app/** w,

  # Deny everything else by default
  deny /etc/shadow r,
  deny /etc/passwd w,
  deny /proc/sys/kernel/** w,
}
```

This profile allows specific operations while denying dangerous ones.

## Deploying Custom Profiles to Nodes

Use a DaemonSet to distribute profiles:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: apparmor-profiles
  namespace: kube-system
data:
  custom-web-profile: |
    #include <tunables/global>
    profile custom-web-profile flags=(attach_disconnected) {
      #include <abstractions/base>
      network inet tcp,
      /app/** r,
      /var/log/app/** w,
    }

---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: apparmor-loader
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: apparmor-loader
  template:
    metadata:
      labels:
        app: apparmor-loader
    spec:
      hostPID: true
      containers:
      - name: loader
        image: ubuntu:20.04
        command: ["bash", "-c"]
        args:
        - |
          apt-get update && apt-get install -y apparmor-utils
          # Load profiles from configmap
          for profile in /profiles/*; do
            apparmor_parser -r -W "$profile"
          done
          # Keep running
          while true; do sleep 3600; done
        securityContext:
          privileged: true
        volumeMounts:
        - name: profiles
          mountPath: /profiles
        - name: apparmor
          mountPath: /sys/kernel/security/apparmor
      volumes:
      - name: profiles
        configMap:
          name: apparmor-profiles
      - name: apparmor
        hostPath:
          path: /sys/kernel/security/apparmor
```

This DaemonSet loads custom profiles on all nodes.

## Multi-Container Pod with Different Profiles

Apply appropriate profiles to each container:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-profile-pod
  annotations:
    container.apparmor.security.beta.kubernetes.io/web: localhost/web-profile
    container.apparmor.security.beta.kubernetes.io/api: localhost/api-profile
    container.apparmor.security.beta.kubernetes.io/cache: runtime/default
spec:
  containers:
  - name: web
    image: nginx:1.21
    ports:
    - containerPort: 80
  - name: api
    image: api-server:1.0
    ports:
    - containerPort: 8080
  - name: cache
    image: redis:6
    ports:
    - containerPort: 6379
```

Each container gets a profile matching its security requirements.

## Verifying AppArmor Enforcement

Check that profiles are applied:

```bash
# Check if AppArmor is enabled on nodes
kubectl debug node/node-name -it --image=ubuntu -- sh -c "aa-status"

# Check pod's AppArmor profile
kubectl exec -it pod-name -- sh -c "cat /proc/1/attr/current"
# Should show the profile name

# Test profile enforcement
kubectl exec -it pod-name -- sh -c "cat /etc/shadow"
# Should be denied if profile blocks it
```

Verify that AppArmor actually enforces restrictions.

## AppArmor with Security Context

Combine AppArmor with other security measures:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hardened-pod
  annotations:
    container.apparmor.security.beta.kubernetes.io/app: localhost/strict-profile
spec:
  securityContext:
    runAsUser: 1000
    runAsNonRoot: true
    fsGroup: 2000
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
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

AppArmor adds mandatory access control to other security layers.

## Debugging AppArmor Denials

Diagnose AppArmor issues:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: apparmor-debug
  annotations:
    container.apparmor.security.beta.kubernetes.io/debug: runtime/default
spec:
  containers:
  - name: debug
    image: ubuntu:20.04
    command: ["bash", "-c"]
    args:
    - |
      # Check current profile
      cat /proc/1/attr/current

      # Try operations and observe denials
      cat /etc/shadow 2>&1 || echo "Denied"

      # Check kernel logs on node for denials
      # (requires privileged access)
      sleep 3600
```

Check node's `/var/log/syslog` or `dmesg` for AppArmor denial messages.

## Profile Development Workflow

Develop profiles iteratively:

```yaml
# Step 1: Run with complain mode initially
apiVersion: v1
kind: Pod
metadata:
  name: profile-dev
  annotations:
    # Note: complain mode requires profile to exist on node
    container.apparmor.security.beta.kubernetes.io/app: localhost/dev-profile-complain
spec:
  containers:
  - name: app
    image: myapp:1.0

# Step 2: Analyze denials and update profile
# Step 3: Switch to enforce mode
# container.apparmor.security.beta.kubernetes.io/app: localhost/dev-profile-enforce
```

Use complain mode to log denials without blocking, then refine the profile.

## Init Container AppArmor Profiles

Init containers can have different profiles:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-apparmor
  annotations:
    container.apparmor.security.beta.kubernetes.io/init-setup: localhost/init-profile
    container.apparmor.security.beta.kubernetes.io/app: localhost/app-profile
spec:
  initContainers:
  - name: init-setup
    image: busybox
    command: ["sh", "-c", "echo 'setup' > /data/ready"]
    volumeMounts:
    - name: data
      mountPath: /data
  containers:
  - name: app
    image: myapp:1.0
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    emptyDir: {}
```

Init containers can have elevated privileges for setup while main containers remain restricted.

## Node Selector for AppArmor Support

Ensure pods run on AppArmor-enabled nodes:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: apparmor-required
  annotations:
    container.apparmor.security.beta.kubernetes.io/app: localhost/custom-profile
spec:
  nodeSelector:
    security.apparmor.enabled: "true"
  containers:
  - name: app
    image: myapp:1.0
```

Label nodes that have AppArmor enabled and custom profiles loaded.

## Monitoring AppArmor Violations

Set up monitoring for AppArmor denials:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: apparmor-monitor
  annotations:
    container.apparmor.security.beta.kubernetes.io/monitor: runtime/default
spec:
  containers:
  - name: monitor
    image: monitoring-agent:1.0
  - name: log-collector
    image: busybox
    command: ["sh", "-c"]
    args:
    - |
      # Collect AppArmor logs
      while true; do
        # In production, forward to logging system
        echo "Checking AppArmor violations..."
        sleep 60
      done
```

Forward AppArmor denial logs to your security monitoring system.

## Conclusion

AppArmor annotations enable per-container mandatory access control policies in Kubernetes. Apply different profiles to different containers based on their specific requirements, using runtime/default for general workloads and custom profiles for specialized needs. Create custom profiles that permit necessary operations while blocking dangerous ones, test them in complain mode, then enforce them in production. Distribute custom profiles to nodes using DaemonSets or configuration management. Combine AppArmor with other security context settings like running as non-root, dropping capabilities, and read-only filesystems for defense in depth. Monitor for AppArmor denials that indicate either profile misconfiguration or security incidents. Per-container AppArmor profiles provide kernel-level mandatory access control that significantly strengthens container security boundaries.

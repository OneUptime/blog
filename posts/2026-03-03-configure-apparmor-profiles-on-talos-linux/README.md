# How to Configure AppArmor Profiles on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AppArmor, Kubernetes, Security, Container Hardening

Description: Learn how to configure and apply AppArmor profiles on Talos Linux to restrict container behavior and reduce your Kubernetes attack surface.

---

AppArmor is a Linux security module that restricts what programs can do based on profiles. It controls file access, network operations, and capability usage at the kernel level. On Talos Linux, AppArmor provides an additional layer of mandatory access control that works alongside the already hardened operating system. Even if a container process is compromised, an AppArmor profile can prevent it from accessing files, making network connections, or executing binaries that it should not touch.

This guide covers how to configure and deploy AppArmor profiles for containers running on Talos Linux.

## How AppArmor Works in Kubernetes

AppArmor profiles define a set of rules that constrain a process. There are three profile modes:

- **enforce** - The profile actively blocks any action that is not explicitly allowed
- **complain** - Violations are logged but not blocked (useful for testing)
- **unconfined** - No restrictions are applied

In Kubernetes, you apply AppArmor profiles to containers through annotations or the security context (in newer Kubernetes versions). The profile must be loaded on every node where the pod might be scheduled.

## AppArmor on Talos Linux

Talos Linux includes AppArmor support in its kernel. Since Talos is immutable, you cannot install AppArmor profiles the traditional way using apparmor_parser on the host. Instead, you need to load profiles through the Talos machine configuration or use a Kubernetes-native approach.

Check if AppArmor is enabled on your Talos nodes.

```bash
# Verify AppArmor is available on Talos nodes
kubectl run apparmor-check --image=busybox --rm -it --restart=Never -- \
  cat /sys/module/apparmor/parameters/enabled
# Should output: Y

# Check loaded AppArmor profiles
kubectl run apparmor-check --image=busybox --rm -it --restart=Never -- \
  cat /sys/kernel/security/apparmor/profiles
```

## Loading AppArmor Profiles via Talos Machine Config

You can load AppArmor profiles through the Talos machine configuration. This ensures they are available on every node at boot time.

```yaml
# Talos machine config snippet for AppArmor profiles
machine:
  files:
    - content: |
        #include <tunables/global>

        profile custom-nginx flags=(attach_disconnected,mediate_deleted) {
          #include <abstractions/base>
          #include <abstractions/nameservice>

          # Allow network access
          network inet tcp,
          network inet udp,
          network inet6 tcp,
          network inet6 udp,

          # Allow reading web content
          /usr/share/nginx/** r,
          /etc/nginx/** r,

          # Allow writing to specific directories
          /var/log/nginx/** w,
          /var/cache/nginx/** rw,
          /var/run/nginx.pid rw,
          /tmp/** rw,

          # Deny everything else
          deny /proc/** w,
          deny /sys/** w,
          deny /root/** rwx,
        }
      path: /etc/apparmor.d/custom-nginx
      permissions: 0644
      op: create
```

Apply the machine configuration.

```bash
# Apply the machine config patch to load the AppArmor profile
talosctl patch machineconfig \
  --nodes <node-ip> \
  --patch-file apparmor-patch.yaml
```

## Using the AppArmor Loader DaemonSet

A more Kubernetes-native approach is to use a DaemonSet that loads AppArmor profiles from ConfigMaps onto each node.

```yaml
# apparmor-profiles-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: apparmor-profiles
  namespace: kube-system
data:
  custom-nginx: |
    #include <tunables/global>

    profile custom-nginx flags=(attach_disconnected,mediate_deleted) {
      #include <abstractions/base>

      network inet tcp,
      network inet udp,

      /usr/share/nginx/** r,
      /etc/nginx/** r,
      /var/log/nginx/** w,
      /var/cache/nginx/** rw,
      /tmp/** rw,

      deny /proc/** w,
      deny /sys/** w,
    }

  custom-app: |
    #include <tunables/global>

    profile custom-app flags=(attach_disconnected,mediate_deleted) {
      #include <abstractions/base>

      network inet tcp,

      /app/** r,
      /app/data/** rw,
      /tmp/** rw,

      deny /proc/*/mem rw,
      deny /sys/** w,
      deny /root/** rwx,
    }
```

```yaml
# apparmor-loader-daemonset.yaml
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
      # Run on every node including control plane
      tolerations:
        - effect: NoSchedule
          operator: Exists
      containers:
        - name: apparmor-loader
          image: google/apparmor-loader:latest
          args:
            - /profiles
          securityContext:
            privileged: true
          volumeMounts:
            - name: profiles
              mountPath: /profiles
              readOnly: true
            - name: sys
              mountPath: /sys
              readOnly: true
            - name: apparmor
              mountPath: /etc/apparmor.d
      volumes:
        - name: profiles
          configMap:
            name: apparmor-profiles
        - name: sys
          hostPath:
            path: /sys
        - name: apparmor
          hostPath:
            path: /etc/apparmor.d
```

```bash
# Deploy the AppArmor profiles and loader
kubectl apply -f apparmor-profiles-configmap.yaml
kubectl apply -f apparmor-loader-daemonset.yaml

# Verify the DaemonSet is running on all nodes
kubectl get daemonset apparmor-loader -n kube-system
```

## Applying AppArmor Profiles to Pods

Once profiles are loaded on the nodes, apply them to your pods using annotations.

```yaml
# nginx-with-apparmor.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-secure
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-secure
  template:
    metadata:
      labels:
        app: nginx-secure
      annotations:
        # Apply the custom-nginx AppArmor profile to the nginx container
        container.apparmor.security.beta.kubernetes.io/nginx: localhost/custom-nginx
    spec:
      containers:
        - name: nginx
          image: nginxinc/nginx-unprivileged:latest
          ports:
            - containerPort: 8080
          securityContext:
            runAsUser: 101
            runAsGroup: 101
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
          volumeMounts:
            - name: cache
              mountPath: /var/cache/nginx
            - name: run
              mountPath: /var/run
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: cache
          emptyDir: {}
        - name: run
          emptyDir: {}
        - name: tmp
          emptyDir: {}
```

With Kubernetes 1.30 and later, you can use the native securityContext field instead of annotations.

```yaml
# Using the native AppArmor field (Kubernetes 1.30+)
securityContext:
  appArmorProfile:
    type: Localhost
    localhostProfile: custom-nginx
```

## Writing Effective AppArmor Profiles

A good AppArmor profile starts permissive and narrows down. Here is a process for creating profiles:

1. Start in complain mode to log what the application does
2. Analyze the logs to understand required permissions
3. Write a profile based on the observed behavior
4. Switch to enforce mode and test thoroughly

```yaml
# A general-purpose restrictive profile for microservices
data:
  restrictive-microservice: |
    #include <tunables/global>

    profile restrictive-microservice flags=(attach_disconnected,mediate_deleted) {
      #include <abstractions/base>

      # Allow TCP networking (most microservices need this)
      network inet tcp,
      network inet6 tcp,

      # Allow DNS resolution
      network inet udp,
      network inet6 udp,

      # Allow reading application files
      /app/** r,

      # Allow writing to temp and data directories
      /tmp/** rw,
      /app/data/** rw,
      /app/logs/** w,

      # Allow reading SSL certificates
      /etc/ssl/** r,
      /etc/ca-certificates/** r,

      # Deny dangerous operations
      deny /proc/*/mem rw,
      deny /proc/sysrq-trigger w,
      deny /sys/** w,
      deny /root/** rwx,
      deny /home/** rwx,
      deny /etc/shadow r,
      deny /etc/passwd w,
    }
```

## Verifying AppArmor Enforcement

After deploying workloads with AppArmor profiles, verify that the profiles are being enforced.

```bash
# Check what profile a running container is using
kubectl exec nginx-secure-pod -- cat /proc/1/attr/current
# Should output: custom-nginx (enforce)

# Test that the profile blocks unauthorized access
kubectl exec nginx-secure-pod -- cat /etc/shadow
# Should be denied by the AppArmor profile

# Check AppArmor deny logs on the node
kubectl logs -n kube-system -l app=apparmor-loader
```

## Troubleshooting

If a pod fails to start with AppArmor errors, check these common issues:

```bash
# Verify the profile is loaded on the node
kubectl run check --image=busybox --rm -it --restart=Never -- \
  cat /sys/kernel/security/apparmor/profiles | grep custom-nginx

# Check pod events for AppArmor errors
kubectl describe pod <pod-name>
# Look for events mentioning "apparmor profile not found"
```

## Wrapping Up

AppArmor profiles on Talos Linux add mandatory access control to your containers, complementing the OS-level hardening that Talos already provides. By defining exactly what each container can access at the kernel level, you limit the blast radius of any potential compromise. Start with a few critical workloads, develop profiles in complain mode, and gradually enforce them across your cluster. The combination of Talos Linux's immutable design and AppArmor's mandatory access control creates a strong security boundary that is difficult for attackers to bypass.

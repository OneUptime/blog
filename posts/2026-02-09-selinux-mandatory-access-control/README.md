# How to use SELinux labels for mandatory access control in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, SELinux, Container Security, Pod Security

Description: Learn how to implement SELinux labels for mandatory access control in Kubernetes pods, providing an additional layer of security through kernel-level access controls and policy enforcement.

---

Security Enhanced Linux (SELinux) provides mandatory access control (MAC) that can significantly enhance the security posture of your Kubernetes workloads. Unlike discretionary access control (DAC), which relies on file permissions, SELinux enforces policies at the kernel level, making it much harder for compromised containers to escape or access unauthorized resources.

## Understanding SELinux in Kubernetes Context

SELinux uses labels to control access between processes and system resources. In Kubernetes, you can assign SELinux labels to pods and containers, which the kernel enforces regardless of the user permissions within the container. This creates a robust security boundary that operates independently of container-level security mechanisms.

When a pod runs with SELinux enabled, the kernel checks every system call against the active policy. Even if an attacker gains root access inside a container, SELinux policies can prevent them from accessing sensitive files, mounting volumes, or executing certain operations.

## Configuring SELinux Options in Pod Security Context

You configure SELinux labels through the `securityContext` field in your pod or container specification. The SELinux context consists of four components: user, role, type, and level. In Kubernetes, you typically focus on the type and level fields.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: selinux-demo
spec:
  securityContext:
    seLinuxOptions:
      level: "s0:c123,c456"
      type: "container_t"
  containers:
  - name: app
    image: nginx:1.21
    securityContext:
      seLinuxOptions:
        level: "s0:c789,c012"
```

The `level` field uses Multi-Category Security (MCS) to isolate containers. Each container gets a unique category pair, ensuring that even containers running as the same user cannot access each other's resources.

## Implementing Volume Access Control with SELinux

One of the most powerful uses of SELinux in Kubernetes involves controlling volume access. By default, containers might struggle to access volumes due to SELinux restrictions. You can solve this by setting appropriate labels on volumes.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: volume-selinux-demo
spec:
  securityContext:
    seLinuxOptions:
      level: "s0:c100,c200"
  containers:
  - name: writer
    image: busybox
    command: ["sh", "-c", "echo 'data' > /data/test.txt && sleep 3600"]
    volumeMounts:
    - name: shared-data
      mountPath: /data
    securityContext:
      seLinuxOptions:
        level: "s0:c100,c200"
  volumes:
  - name: shared-data
    emptyDir: {}
```

When Kubernetes mounts the volume, it automatically applies the SELinux label from the pod's security context. This ensures the container can read and write to the volume while preventing other pods from accessing it.

## Using SELinux with Persistent Volumes

Persistent volumes require special consideration with SELinux. You need to ensure that the volume's SELinux context matches what your pods expect. Kubernetes can automatically relabel volumes, but this process has implications.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: pv-selinux-demo
spec:
  securityContext:
    seLinuxOptions:
      level: "s0:c300,c400"
  containers:
  - name: database
    image: postgres:13
    volumeMounts:
    - name: postgres-storage
      mountPath: /var/lib/postgresql/data
    env:
    - name: POSTGRES_PASSWORD
      value: "securepassword"
    securityContext:
      seLinuxOptions:
        level: "s0:c300,c400"
  volumes:
  - name: postgres-storage
    persistentVolumeClaim:
      claimName: postgres-pvc
```

Kubernetes recursively relabels all files on the volume to match the pod's SELinux context. For large volumes, this relabeling can take significant time during pod startup. You can avoid this delay by pre-labeling volumes or using `FSGroup` policies.

## Combining SELinux with Other Security Mechanisms

SELinux works best when combined with other Kubernetes security features. You can create a defense-in-depth strategy by layering multiple security controls.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hardened-pod
spec:
  securityContext:
    seLinuxOptions:
      level: "s0:c500,c600"
      type: "container_t"
    runAsNonRoot: true
    runAsUser: 1000
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
      seLinuxOptions:
        level: "s0:c500,c600"
    volumeMounts:
    - name: temp
      mountPath: /tmp
  volumes:
  - name: temp
    emptyDir: {}
```

This configuration combines SELinux with running as non-root, dropping capabilities, using a read-only root filesystem, and applying seccomp profiles. Each layer provides protection against different attack vectors.

## Troubleshooting SELinux Issues

SELinux denials can be cryptic. When a pod fails to start or containers cannot access resources, SELinux might be blocking the operation. You can diagnose issues by examining audit logs on the nodes.

```bash
# Check SELinux denials on the node
sudo ausearch -m avc -ts recent

# View SELinux context of pod processes
ps -eZ | grep container_t

# Check volume labels
ls -Z /var/lib/kubelet/pods/
```

Common issues include mismatched labels between pods and volumes, restrictive default policies, or conflicts with PodSecurityPolicies. Understanding the denial messages helps you adjust labels appropriately.

## Creating Custom SELinux Policies

For advanced use cases, you might need custom SELinux policies. While Kubernetes does not directly manage SELinux policies, you can deploy custom policies to nodes using DaemonSets or configuration management tools.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: selinux-policy-installer
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: selinux-policy
  template:
    metadata:
      labels:
        name: selinux-policy
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: policy-installer
        image: policy-installer:1.0
        securityContext:
          privileged: true
        volumeMounts:
        - name: selinux-policies
          mountPath: /etc/selinux/targeted/policy
      volumes:
      - name: selinux-policies
        hostPath:
          path: /etc/selinux/targeted/policy
```

This approach ensures all nodes have consistent SELinux policies that match your workload requirements. You can version control your policies and roll them out systematically across your cluster.

## SELinux in Multi-Tenant Environments

Multi-tenant Kubernetes clusters benefit enormously from SELinux. By assigning different MCS levels to different tenants, you create strong isolation even if containers run with the same user ID.

```yaml
# Tenant A Pod
apiVersion: v1
kind: Pod
metadata:
  name: tenant-a-app
  namespace: tenant-a
spec:
  securityContext:
    seLinuxOptions:
      level: "s0:c1,c2"
  containers:
  - name: app
    image: tenant-app:1.0

---
# Tenant B Pod
apiVersion: v1
kind: Pod
metadata:
  name: tenant-b-app
  namespace: tenant-b
spec:
  securityContext:
    seLinuxOptions:
      level: "s0:c3,c4"
  containers:
  - name: app
    image: tenant-app:1.0
```

The different MCS levels ensure that tenant A cannot access tenant B's files, sockets, or other resources, even if both run identical applications with the same user permissions.

## Conclusion

SELinux provides mandatory access control that operates at the kernel level, offering protection that persists even when container-level security is compromised. By properly configuring SELinux labels in your Kubernetes pods, you add a critical security layer that complements other security mechanisms. Start with the default container type and MCS levels, then customize policies as you understand your workload's specific requirements. Combined with other security context options, SELinux helps build truly hardened Kubernetes environments that can resist sophisticated attacks.

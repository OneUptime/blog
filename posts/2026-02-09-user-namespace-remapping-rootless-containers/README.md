# How to Enable User Namespace Remapping in Kubernetes for Rootless Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Container

Description: Learn how to configure user namespace remapping in Kubernetes to run containers as non-root users at the kernel level, enhancing security through privilege isolation.

---

User namespaces map container user IDs to different host user IDs, allowing processes that appear to run as root inside containers to run as unprivileged users on the host. This security feature reduces the impact of container breakouts that rely on host-level root privileges. While containers might run as UID 0 internally, the host kernel sees them as an unprivileged UID/GID range chosen by the kubelet, eliminating many privilege escalation attack vectors.

## Understanding User Namespace Remapping

Without user namespaces, a process running as UID 0 (root) inside a container runs as UID 0 on the host. If the container breaks out of its isolation, the attacker has root privileges on the host system.

User namespaces create a mapping between container UIDs and host UIDs. A process appearing as UID 0 in the container actually runs as an unprivileged UID on the host. Breaking out of the container gives the attacker only the privileges of that mapped UID, typically an unprivileged user with no system access.

## Checking User Namespace Support

Verify your kernel supports user namespaces:

```bash
# Check kernel support

ssh node01 "cat /proc/sys/user/max_user_namespaces"
# Should return a positive number

# Check if user namespaces are enabled
ssh node01 "unshare --user --pid --fork echo YES"
# Should output: YES

# Verify runtime versions. Kubernetes user namespaces require
# containerd 2.0+ or CRI-O 1.25+, and runc 1.2+ or crun 1.9+.
ssh node01 "containerd --version"
ssh node01 "runc --version"
```

Kubernetes pods that use user namespaces also require Linux idmap mount support on the filesystems used by `/var/lib/kubelet/pods/` and pod volumes. In practice, Linux 6.3 or later is the safest baseline because tmpfs idmap mounts are commonly needed for projected service account tokens, Secrets, and ConfigMaps.

## Configuring Containerd for User Namespaces

Use a container runtime version that supports Kubernetes user namespaces. Current Kubernetes user namespace support works with containerd 2.0 or later and a compatible OCI runtime such as runc 1.2 or later:

```toml
# /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri"]
  [plugins."io.containerd.grpc.v1.cri".containerd]
    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
      runtime_type = "io.containerd.runc.v2"
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
        SystemdCgroup = true
```

Restart containerd after configuration:

```bash
ssh node01 "sudo systemctl restart containerd"
ssh node01 "sudo systemctl status containerd"
```

## Setting Up Subordinate UIDs and GIDs

Configure subordinate user and group IDs on each node:

```bash
# Add a custom subordinate UID range for kubelet
ssh node01 "echo 'kubelet:65536:7208960' | sudo tee -a /etc/subuid"

# Add the matching subordinate GID range
ssh node01 "echo 'kubelet:65536:7208960' | sudo tee -a /etc/subgid"

# Verify configuration
ssh node01 "cat /etc/subuid /etc/subgid"
```

This custom range allocates enough IDs for the default 110 pods per node, with 65,536 IDs per pod. Kubernetes can also use its default allocation above the host's normal 0-65535 range without this custom range; configure `/etc/subuid` and `/etc/subgid` only when you need to control the allocation explicitly.

## RuntimeClass and User Namespaces

RuntimeClass selects a runtime handler, but it does not enable Kubernetes user namespaces by itself. If you already use RuntimeClass for another reason, keep it configured as usual:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: runc
handler: runc
```

Apply the RuntimeClass if your cluster uses this handler:

```bash
kubectl apply -f runtimeclass-runc.yaml
kubectl get runtimeclass
```

## Using User Namespaces in Pods

Set `hostUsers: false` in pod specifications:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-userns
spec:
  hostUsers: false
  containers:
  - name: nginx
    image: nginx:1.27
    ports:
    - containerPort: 80
    securityContext:
      runAsUser: 0
      runAsGroup: 0
```

Despite `runAsUser: 0`, this container runs as a non-root mapped UID on the host.

## Verifying User Namespace Remapping

Check the actual host UID of the container process:

```bash
# Get the pod's node
NODE=$(kubectl get pod nginx-userns -o jsonpath='{.spec.nodeName}')

# Get the container process on the host
ssh $NODE "ps aux | grep 'nginx: master' | grep -v grep"

# Output shows a non-root mapped UID instead of 0:
# 833617920   12345  0.0  0.1  nginx: master process
```

Inspect the process namespace:

```bash
# Check UID mapping
ssh $NODE "cat /proc/12345/uid_map"
# Output is similar to: 0     833617920    65536

# This means:
# Container UID 0 = Host UID 833617920
# Container UID 1 = Host UID 833617921
# ... and so on for 65536 UIDs
```

## Deployment with User Namespaces

Create a deployment using user namespace isolation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app-secure
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      hostUsers: false
      securityContext:
        runAsNonRoot: false  # Can be false because of user namespace
        fsGroup: 2000
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
        securityContext:
          allowPrivilegeEscalation: false
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

The application can run as root inside the container with reduced host risk because user namespaces remap it to an unprivileged UID on the host.

## Combining with Other Security Features

Layer user namespaces with additional security:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: defense-in-depth
spec:
  hostUsers: false
  securityContext:
    seccompProfile:
      type: RuntimeDefault
    appArmorProfile:
      type: RuntimeDefault
    seLinuxOptions:
      level: "s0:c100,c200"
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      runAsUser: 0
      runAsGroup: 0
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
```

This configuration combines:
- User namespace remapping
- Seccomp filtering
- SELinux labels
- AppArmor profiles
- Capability dropping
- Read-only root filesystem

## Handling Volume Permissions

User namespaces affect volume ownership:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-volume
spec:
  hostUsers: false
  securityContext:
    fsGroup: 2000
    fsGroupChangePolicy: "OnRootMismatch"
  containers:
  - name: app
    image: myapp:latest
    securityContext:
      runAsUser: 1000
      runAsGroup: 2000
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-pvc
```

The `fsGroup` setting refers to the group inside the container. With Kubernetes user namespaces and idmap mounts, host UID/GID values do not need to match the container's volume ownership.

## Limitations and Considerations

User namespaces have some limitations:

**Host-level privileged workloads incompatible**: Workloads that need real host privileges, such as loading kernel modules or managing host resources, are not good candidates for user namespaces.

**Host namespace restrictions**: Pods using `hostNetwork: true`, `hostPID: true`, or `hostIPC: true` cannot use user namespaces.

**Volume and filesystem support**: Pod volumes need filesystem support for idmap mounts. NFS volumes cannot currently be mounted in user-namespace pods because the Linux NFS client does not support idmap mounts.

**Raw block volume restrictions**: Pods using user namespaces cannot use `volumeDevices` raw block volumes.

## Testing User Namespace Security

Create a test to demonstrate privilege isolation:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: userns-test
spec:
  hostUsers: false
  containers:
  - name: test
    image: ubuntu:22.04
    command:
    - /bin/bash
    - -c
    - |
      echo "Testing user namespace security"

      echo "Inside container UID:"
      id

      echo "UID map inside container:"
      cat /proc/self/uid_map

      echo "Attempting to change system time (should fail):"
      date -s "2025-01-01" 2>&1 || echo "Permission denied (expected)"

      echo "Test complete - user namespace working correctly"
      sleep 3600
    securityContext:
      runAsUser: 0
```

Even though the container runs as UID 0, its capabilities apply inside the user namespace and do not grant host-level privileges.

## Monitoring User Namespace Usage

Track which pods use user namespaces:

```bash
#!/bin/bash
# check-userns-usage.sh

echo "Pods using user namespaces:"
echo "==========================="

kubectl get pods --all-namespaces -o json | jq -r '
  .items[] |
  select(.spec.hostUsers == false) |
  {
    namespace: .metadata.namespace,
    pod: .metadata.name,
    node: .spec.nodeName
  } |
  "\(.namespace)/\(.pod) on \(.node)"
'
```

## Troubleshooting User Namespace Issues

Common problems and solutions:

```bash
# Check if unprivileged user namespaces are enabled, on distributions that expose this sysctl
ssh node01 "cat /proc/sys/kernel/unprivileged_userns_clone"
# Should be 1

# Verify subordinate UID/GID configuration
ssh node01 "cat /etc/subuid /etc/subgid"

# Check for overlapping UID ranges
ssh node01 "cat /etc/subuid | awk -F: '{print \$2, \$2+\$3}' | sort -n"

# View the container's UID map
kubectl exec nginx-userns -- cat /proc/self/uid_map
```

If volumes show permission errors:

```bash
# The volume or backing filesystem might not support idmap mounts
# Check pod events and fix fsGroup or storage configuration as needed
```

## Best Practices

Enable user namespaces for all non-privileged workloads. The security benefit outweighs the minimal overhead.

Test thoroughly before production deployment. Some applications assume they run as actual root and may fail with user namespaces.

Document which workloads should set `hostUsers: false`. Create guidelines for your development teams.

Monitor for pods running as real root. Alert when eligible pods don't set `hostUsers: false`.

Plan any custom kubelet subordinate UID/GID range carefully to avoid overlaps.

Combine user namespaces with other security features for defense in depth. No single security mechanism is sufficient.

## Conclusion

User namespace remapping provides strong isolation between containers and the host system. By mapping container root to unprivileged host users, you eliminate many privilege escalation attack vectors. While not suitable for all workloads, user namespaces should be the default for most applications, significantly improving your cluster's security posture.

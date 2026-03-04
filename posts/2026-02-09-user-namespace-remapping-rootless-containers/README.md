# How to Enable User Namespace Remapping in Kubernetes for Rootless Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Containers

Description: Learn how to configure user namespace remapping in Kubernetes to run containers as non-root users at the kernel level, enhancing security through privilege isolation.

---

User namespaces map container user IDs to different host user IDs, allowing processes that appear to run as root inside containers to run as unprivileged users on the host. This security feature prevents container breakouts from gaining root access to the host system. While containers might run as UID 0 internally, the host kernel sees them as UID 100000, eliminating many privilege escalation attack vectors.

## Understanding User Namespace Remapping

Without user namespaces, a process running as UID 0 (root) inside a container runs as UID 0 on the host. If the container breaks out of its isolation, the attacker has root privileges on the host system.

User namespaces create a mapping between container UIDs and host UIDs. A process appearing as UID 0 in the container actually runs as UID 100000 on the host. Breaking out of the container gives the attacker only the privileges of UID 100000, typically an unprivileged user with no system access.

## Checking User Namespace Support

Verify your kernel supports user namespaces:

```bash
# Check kernel support
ssh node01 "cat /proc/sys/user/max_user_namespaces"
# Should return a positive number

# Check if user namespaces are enabled
ssh node01 "unshare --user --pid --fork echo YES"
# Should output: YES

# Verify containerd/CRI-O supports user namespaces
ssh node01 "containerd config default | grep -i userns"
```

Most modern Linux kernels (3.8+) support user namespaces, but some distributions disable them by default for security reasons.

## Configuring Containerd for User Namespaces

Enable user namespace support in containerd:

```toml
# /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri"]
  # Enable user namespace support
  [plugins."io.containerd.grpc.v1.cri".containerd]
    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
      runtime_type = "io.containerd.runc.v2"
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
        SystemdCgroup = true

    # Add user namespace runtime
    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc-userns]
      runtime_type = "io.containerd.runc.v2"
      [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc-userns.options]
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
# Add subordinate UID range for kubelet user
ssh node01 "echo 'root:100000:65536' | sudo tee -a /etc/subuid"

# Add subordinate GID range
ssh node01 "echo 'root:100000:65536' | sudo tee -a /etc/subgid"

# Verify configuration
ssh node01 "cat /etc/subuid /etc/subgid"
```

This allocates UIDs 100000-165535 on the host for use by containers. Container UID 0 maps to host UID 100000, container UID 1 maps to host UID 100001, and so on.

## Creating a RuntimeClass for User Namespaces

Define a RuntimeClass that enables user namespaces:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: userns
handler: runc-userns
```

Apply the RuntimeClass:

```bash
kubectl apply -f runtimeclass-userns.yaml
kubectl get runtimeclass
```

## Using User Namespaces in Pods

Reference the RuntimeClass in pod specifications:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-userns
spec:
  runtimeClassName: userns
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
    securityContext:
      runAsUser: 0
      runAsGroup: 0
```

Despite `runAsUser: 0`, this container runs as UID 100000 on the host.

## Verifying User Namespace Remapping

Check the actual host UID of the container process:

```bash
# Get the pod's node
NODE=$(kubectl get pod nginx-userns -o jsonpath='{.spec.nodeName}')

# Get the container process on the host
ssh $NODE "ps aux | grep 'nginx: master' | grep -v grep"

# Output shows UID 100000 instead of 0:
# 100000   12345  0.0  0.1  nginx: master process
```

Inspect the process namespace:

```bash
# Check UID mapping
ssh $NODE "cat /proc/12345/uid_map"
# Output: 0     100000    65536

# This means:
# Container UID 0 = Host UID 100000
# Container UID 1 = Host UID 100001
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
      runtimeClassName: userns
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

The application can run as root inside the container without security concerns because user namespaces remap it to an unprivileged UID on the host.

## Combining with Other Security Features

Layer user namespaces with additional security:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: defense-in-depth
  annotations:
    container.apparmor.security.beta.kubernetes.io/app: runtime/default
spec:
  runtimeClassName: userns
  securityContext:
    seccompProfile:
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
  runtimeClassName: userns
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

The fsGroup setting ensures volume files have the correct group ownership for the remapped user.

## Limitations and Considerations

User namespaces have some limitations:

**Privileged containers incompatible**: Containers requiring privileged mode cannot use user namespaces. The combination is contradictory.

**Host networking restrictions**: Pods using `hostNetwork: true` typically cannot use user namespaces due to network capability requirements.

**Volume driver support**: Some volume drivers don't properly handle user namespace UID remapping. Test your storage before deploying.

**Performance overhead**: Minimal but measurable overhead exists for UID/GID mapping on every filesystem operation.

## Testing User Namespace Security

Create a test to demonstrate privilege isolation:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: userns-test
spec:
  runtimeClassName: userns
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

      echo "Attempting to access /etc/shadow on host (should fail):"
      cat /etc/shadow 2>&1 || echo "Access denied (expected)"

      echo "Attempting to change system time (should fail):"
      date -s "2025-01-01" 2>&1 || echo "Permission denied (expected)"

      echo "Test complete - user namespace working correctly"
      sleep 3600
    securityContext:
      runAsUser: 0
```

Even though the container runs as UID 0, it cannot access sensitive host files or perform privileged operations.

## Monitoring User Namespace Usage

Track which pods use user namespaces:

```bash
#!/bin/bash
# check-userns-usage.sh

echo "Pods using user namespaces:"
echo "==========================="

kubectl get pods --all-namespaces -o json | jq -r '
  .items[] |
  select(.spec.runtimeClassName == "userns") |
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
# Check if user namespaces are enabled in kernel
ssh node01 "cat /proc/sys/kernel/unprivileged_userns_clone"
# Should be 1

# Verify subordinate UID/GID configuration
ssh node01 "cat /etc/subuid /etc/subgid"

# Check for overlapping UID ranges
ssh node01 "cat /etc/subuid | awk -F: '{print \$2, \$2+\$3}' | sort -n"

# View container process namespaces
kubectl exec nginx-userns -- cat /proc/1/uid_map
```

If volumes show permission errors:

```bash
# The volume might have ownership issues
# Fix by setting correct fsGroup in pod securityContext
# Or manually adjust volume ownership to match mapped UIDs
```

## Best Practices

Enable user namespaces for all non-privileged workloads. The security benefit outweighs the minimal overhead.

Test thoroughly before production deployment. Some applications assume they run as actual root and may fail with user namespaces.

Document which RuntimeClass to use for different workload types. Create guidelines for your development teams.

Monitor for pods running as real root. Alert when pods don't use the user namespace RuntimeClass.

Plan your UID range allocation carefully to avoid overlaps between different tenants or teams.

Combine user namespaces with other security features for defense in depth. No single security mechanism is sufficient.

## Conclusion

User namespace remapping provides strong isolation between containers and the host system. By mapping container root to unprivileged host users, you eliminate many privilege escalation attack vectors. While not suitable for all workloads, user namespaces should be the default for most applications, significantly improving your cluster's security posture.

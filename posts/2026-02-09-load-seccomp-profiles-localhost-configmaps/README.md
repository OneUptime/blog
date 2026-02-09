# How to Load Seccomp Profiles from Localhost and ConfigMaps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Operations

Description: Learn multiple methods to load and manage seccomp profiles in Kubernetes using localhost files and ConfigMaps for flexible security policy deployment.

---

Kubernetes supports loading seccomp profiles from different sources. Understanding how to deploy profiles using localhost files and ConfigMaps helps you choose the right approach for your cluster's security architecture and operational needs.

## Understanding Seccomp Profile Sources

Kubernetes provides three ways to specify seccomp profiles:

**RuntimeDefault**: Uses the container runtime's default profile, typically provided by containerd or CRI-O. This profile blocks dangerous system calls while allowing common operations.

**Localhost**: Loads profiles from files on each node's filesystem, typically under `/var/lib/kubelet/seccomp/`. This approach gives you full control over profile content and versioning.

**Unconfined**: Runs containers without seccomp filtering. Never use this in production environments.

Each approach has trade-offs in terms of deployment complexity, update procedures, and operational overhead.

## Setting Up Localhost Profiles

First, create your seccomp profile:

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": [
    "SCMP_ARCH_X86_64"
  ],
  "syscalls": [
    {
      "names": [
        "accept", "accept4", "access", "arch_prctl",
        "bind", "brk", "chdir", "chmod", "chown",
        "close", "connect", "dup", "dup2", "dup3",
        "epoll_create", "epoll_create1", "epoll_ctl",
        "epoll_wait", "exit", "exit_group", "fcntl",
        "fstat", "futex", "getcwd", "getdents", "getdents64",
        "getegid", "geteuid", "getgid", "getpid", "getppid",
        "getuid", "listen", "lseek", "mmap", "mprotect",
        "munmap", "open", "openat", "pipe", "pipe2",
        "poll", "read", "readlink", "recvfrom", "recvmsg",
        "rt_sigaction", "rt_sigprocmask", "rt_sigreturn",
        "select", "sendmsg", "sendto", "set_robust_list",
        "set_tid_address", "setgid", "setgroups", "setuid",
        "socket", "stat", "write"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

Save this as `web-app-profile.json`.

## Deploying Profiles via DaemonSet

Create a DaemonSet to deploy profiles to all nodes:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: seccomp-profiles
  namespace: kube-system
data:
  web-app-profile.json: |
    {
      "defaultAction": "SCMP_ACT_ERRNO",
      "architectures": ["SCMP_ARCH_X86_64"],
      "syscalls": [
        {
          "names": ["accept", "bind", "close", "connect", "exit", "read", "write", "socket"],
          "action": "SCMP_ACT_ALLOW"
        }
      ]
    }
  database-profile.json: |
    {
      "defaultAction": "SCMP_ACT_ERRNO",
      "architectures": ["SCMP_ARCH_X86_64"],
      "syscalls": [
        {
          "names": ["accept", "bind", "close", "fsync", "read", "write", "socket"],
          "action": "SCMP_ACT_ALLOW"
        }
      ]
    }
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: seccomp-profile-installer
  namespace: kube-system
  labels:
    app: seccomp-installer
spec:
  selector:
    matchLabels:
      app: seccomp-installer
  template:
    metadata:
      labels:
        app: seccomp-installer
    spec:
      initContainers:
      - name: installer
        image: busybox:latest
        command:
        - /bin/sh
        - -c
        - |
          #!/bin/sh
          set -e

          # Create profile directory
          mkdir -p /host-seccomp/profiles

          # Copy all profiles from ConfigMap
          for profile in /profiles/*; do
            if [ -f "$profile" ]; then
              filename=$(basename "$profile")
              echo "Installing profile: $filename"
              cp "$profile" "/host-seccomp/profiles/$filename"
            fi
          done

          echo "Seccomp profiles installed successfully"
        volumeMounts:
        - name: host-seccomp
          mountPath: /host-seccomp
        - name: profiles
          mountPath: /profiles
      containers:
      - name: sleep
        image: busybox:latest
        command: ['sleep', 'infinity']
        resources:
          requests:
            cpu: 10m
            memory: 20Mi
          limits:
            cpu: 50m
            memory: 50Mi
      volumes:
      - name: host-seccomp
        hostPath:
          path: /var/lib/kubelet/seccomp
          type: DirectoryOrCreate
      - name: profiles
        configMap:
          name: seccomp-profiles
```

Deploy the DaemonSet:

```bash
kubectl apply -f seccomp-installer.yaml

# Verify installation on all nodes
kubectl get pods -n kube-system -l app=seccomp-installer

# Check profile files on a node
kubectl exec -n kube-system -it seccomp-profile-installer-<pod-id> -- ls -la /host-seccomp/profiles/
```

## Using Localhost Profiles in Pods

Reference the installed profile in your pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
  namespace: default
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/web-app-profile.json
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "256Mi"
        cpu: "200m"
```

The path is relative to `/var/lib/kubelet/seccomp/`.

## Container-Specific Seccomp Profiles

Apply different profiles to different containers in the same pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-container-app
spec:
  containers:
  - name: web
    image: nginx:1.21
    securityContext:
      seccompProfile:
        type: Localhost
        localhostProfile: profiles/web-app-profile.json
    ports:
    - containerPort: 80

  - name: database
    image: postgres:14
    securityContext:
      seccompProfile:
        type: Localhost
        localhostProfile: profiles/database-profile.json
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: password
```

Each container gets its own tailored seccomp profile.

## Dynamic Profile Updates

Update profiles without restarting pods using a versioning strategy:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: seccomp-profiles-v2
  namespace: kube-system
data:
  web-app-profile-v2.json: |
    {
      "defaultAction": "SCMP_ACT_ERRNO",
      "architectures": ["SCMP_ARCH_X86_64"],
      "syscalls": [
        {
          "names": [
            "accept", "bind", "close", "connect", "exit",
            "read", "write", "socket", "sendfile"
          ],
          "action": "SCMP_ACT_ALLOW"
        }
      ]
    }
```

Deploy the new version:

```bash
# Update ConfigMap with new version
kubectl apply -f seccomp-profiles-v2.yaml

# The DaemonSet automatically picks up changes
kubectl rollout restart daemonset/seccomp-profile-installer -n kube-system

# Update pod to use new profile
kubectl patch deployment web-app -p '
{
  "spec": {
    "template": {
      "spec": {
        "securityContext": {
          "seccompProfile": {
            "type": "Localhost",
            "localhostProfile": "profiles/web-app-profile-v2.json"
          }
        }
      }
    }
  }
}'
```

## Managing Profiles with Helm

Create a Helm chart for seccomp profile management:

```yaml
# templates/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-seccomp-profiles
  namespace: {{ .Release.Namespace }}
data:
{{- range $name, $profile := .Values.seccompProfiles }}
  {{ $name }}.json: |
{{ $profile | indent 4 }}
{{- end }}
---
# templates/daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: {{ .Release.Name }}-seccomp-installer
  namespace: {{ .Release.Namespace }}
spec:
  selector:
    matchLabels:
      app: {{ .Release.Name }}-seccomp-installer
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}-seccomp-installer
    spec:
      initContainers:
      - name: installer
        image: {{ .Values.installer.image }}
        command:
        - /bin/sh
        - -c
        - |
          mkdir -p /host-seccomp/profiles
          cp /profiles/* /host-seccomp/profiles/
        volumeMounts:
        - name: host-seccomp
          mountPath: /host-seccomp
        - name: profiles
          mountPath: /profiles
      containers:
      - name: pause
        image: {{ .Values.installer.image }}
        command: ['sleep', 'infinity']
      volumes:
      - name: host-seccomp
        hostPath:
          path: /var/lib/kubelet/seccomp
      - name: profiles
        configMap:
          name: {{ .Release.Name }}-seccomp-profiles
```

values.yaml:

```yaml
installer:
  image: busybox:latest

seccompProfiles:
  web-app-profile: |
    {
      "defaultAction": "SCMP_ACT_ERRNO",
      "architectures": ["SCMP_ARCH_X86_64"],
      "syscalls": [
        {
          "names": ["accept", "bind", "close", "read", "write"],
          "action": "SCMP_ACT_ALLOW"
        }
      ]
    }
  database-profile: |
    {
      "defaultAction": "SCMP_ACT_ERRNO",
      "architectures": ["SCMP_ARCH_X86_64"],
      "syscalls": [
        {
          "names": ["fsync", "read", "write", "close"],
          "action": "SCMP_ACT_ALLOW"
        }
      ]
    }
```

## Validating Profile Deployment

Create a validation script:

```bash
#!/bin/bash
# validate-seccomp-profiles.sh

EXPECTED_PROFILES=(
  "web-app-profile.json"
  "database-profile.json"
)

echo "Validating seccomp profile deployment..."
echo "========================================"

# Get all nodes
nodes=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')

for node in $nodes; do
  echo ""
  echo "Checking node: $node"

  # Get a pod running on this node
  pod=$(kubectl get pods -n kube-system -l app=seccomp-installer \
    --field-selector spec.nodeName=$node -o jsonpath='{.items[0].metadata.name}')

  if [ -z "$pod" ]; then
    echo "  ERROR: No installer pod found on node"
    continue
  fi

  # Check each expected profile
  for profile in "${EXPECTED_PROFILES[@]}"; do
    if kubectl exec -n kube-system $pod -- test -f /host-seccomp/profiles/$profile; then
      echo "  ✓ $profile exists"
    else
      echo "  ✗ $profile missing"
    fi
  done
done
```

## Troubleshooting Profile Loading

Debug profile loading issues:

```bash
# Check if profile exists on node
NODE_NAME="worker-01"
POD=$(kubectl get pods -n kube-system -l app=seccomp-installer \
  --field-selector spec.nodeName=$NODE_NAME -o name | head -1)

kubectl exec -n kube-system $POD -- ls -la /host-seccomp/profiles/

# Verify profile JSON syntax
kubectl exec -n kube-system $POD -- cat /host-seccomp/profiles/web-app-profile.json | jq .

# Check pod events for seccomp errors
kubectl describe pod web-app | grep -i seccomp

# View kubelet logs for seccomp-related errors
ssh $NODE_NAME "journalctl -u kubelet | grep -i seccomp"
```

Common issues and solutions:

**Profile not found**: Verify the profile path is correct and the file exists on the node. **Permission denied**: Ensure the profile file has read permissions for the kubelet user. **Invalid JSON**: Validate profile JSON syntax using jq or a JSON validator. **Wrong architecture**: Match the profile architecture to your node's CPU architecture.

## Profile Versioning Strategy

Implement version tracking in profile metadata:

```json
{
  "_comment": "Version: 1.2.0, Updated: 2026-02-09, Author: security-team",
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": ["accept", "bind", "close"],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

Track versions in Git:

```bash
# Initialize Git repository for profiles
mkdir seccomp-profiles
cd seccomp-profiles
git init

# Add profiles
cp /path/to/web-app-profile.json .
git add web-app-profile.json
git commit -m "Add web-app seccomp profile v1.0.0"
git tag v1.0.0

# Update profile
# Edit web-app-profile.json
git commit -am "Allow sendfile syscall for performance"
git tag v1.1.0
```

## Monitoring Profile Usage

Track which pods use which profiles:

```bash
# List all pods with seccomp profiles
kubectl get pods --all-namespaces -o json | jq -r '
  .items[] |
  select(.spec.securityContext.seccompProfile != null) |
  {
    namespace: .metadata.namespace,
    pod: .metadata.name,
    profileType: .spec.securityContext.seccompProfile.type,
    profilePath: .spec.securityContext.seccompProfile.localhostProfile
  }
'

# Count profile usage
kubectl get pods --all-namespaces -o json | jq -r '
  [.items[].spec.securityContext.seccompProfile.localhostProfile] |
  group_by(.) |
  map({profile: .[0], count: length})
'
```

## Best Practices

Use ConfigMaps to centralize profile management. This makes updates easier and ensures consistency across the cluster.

Deploy profiles via DaemonSet to guarantee availability on all nodes before scheduling workloads that need them.

Version your profiles and use semantic versioning. Track changes in Git and document why syscalls were added or removed.

Test profile updates in development environments before deploying to production. Incorrect profiles can break applications.

Implement monitoring to detect when pods fail to start due to missing or invalid seccomp profiles.

Use descriptive profile names that indicate their purpose, such as `nginx-web-server-v2.json` rather than `profile-1.json`.

## Conclusion

Loading seccomp profiles from localhost and ConfigMaps provides flexible security policy management in Kubernetes. By using DaemonSets to deploy profiles and ConfigMaps to centralize configuration, you create a maintainable system for distributing security policies across your cluster. Choose the approach that best fits your operational model and security requirements.

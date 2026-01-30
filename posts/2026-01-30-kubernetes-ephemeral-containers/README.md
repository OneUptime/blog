# How to Implement Kubernetes Ephemeral Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, Debugging, Troubleshooting, DevOps

Description: Use ephemeral containers in Kubernetes for debugging running pods without modifying deployments or restarting containers.

---

## Introduction

Debugging containers in production has always been challenging. Traditional approaches require either baking debugging tools into your images (increasing attack surface and image size) or restarting pods with modified configurations. Kubernetes ephemeral containers solve this problem by letting you attach a temporary debugging container to a running pod.

Ephemeral containers were introduced as a stable feature in Kubernetes 1.25. Unlike regular containers, they cannot be added at pod creation time and have no resource guarantees. They exist solely for interactive troubleshooting.

## Prerequisites

Before getting started, ensure you have:

- Kubernetes cluster version 1.25 or later
- kubectl configured with cluster access
- Permissions to create and debug pods

Verify your cluster version supports ephemeral containers:

```bash
# Check Kubernetes version
kubectl version --short

# Expected output should show v1.25.0 or higher
# Client Version: v1.28.0
# Server Version: v1.28.0
```

## Understanding Ephemeral Containers

Ephemeral containers differ from regular containers in several key ways:

| Feature | Regular Container | Ephemeral Container |
|---------|------------------|---------------------|
| Added at pod creation | Yes | No |
| Resource limits/requests | Supported | Not enforced |
| Probes (liveness, readiness) | Supported | Not supported |
| Ports | Supported | Not supported |
| Lifecycle hooks | Supported | Not supported |
| Restart policy | Respected | Never restarts |
| Can be removed | No | No (once added) |

Ephemeral containers share the pod's namespaces (network, PID, IPC) when configured properly, giving you full visibility into the running application.

## Basic Usage with kubectl debug

The `kubectl debug` command provides a straightforward way to add ephemeral containers. Let's start with a simple example.

First, create a sample deployment to debug:

```yaml
# sample-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-app
  labels:
    app: sample-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sample-app
  template:
    metadata:
      labels:
        app: sample-app
    spec:
      containers:
      - name: app
        image: nginx:alpine
        ports:
        - containerPort: 80
        resources:
          limits:
            memory: "128Mi"
            cpu: "100m"
```

Apply the deployment and wait for it to be ready:

```bash
# Create the deployment
kubectl apply -f sample-app.yaml

# Wait for the pod to be running
kubectl wait --for=condition=ready pod -l app=sample-app --timeout=60s

# Get the pod name for debugging
POD_NAME=$(kubectl get pods -l app=sample-app -o jsonpath='{.items[0].metadata.name}')
echo "Pod name: $POD_NAME"
```

Now attach an ephemeral container for debugging:

```bash
# Attach a busybox container for basic debugging
kubectl debug -it $POD_NAME --image=busybox:latest --target=app

# The --target flag specifies which container's namespaces to share
# This drops you into an interactive shell in the ephemeral container
```

Once inside the ephemeral container, you can run diagnostic commands:

```bash
# Check network connectivity
wget -qO- localhost:80

# View environment variables from the target container's perspective
env

# Check DNS resolution
nslookup kubernetes.default.svc.cluster.local

# Exit the ephemeral container
exit
```

## Process Namespace Sharing

Process namespace sharing allows the ephemeral container to see processes running in other containers within the same pod. This is critical for debugging application behavior.

Enable process namespace sharing in your pod specification:

```yaml
# shared-process-namespace.yaml
apiVersion: v1
kind: Pod
metadata:
  name: shared-ns-pod
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: nginx:alpine
    resources:
      limits:
        memory: "128Mi"
        cpu: "100m"
  - name: sidecar
    image: busybox:latest
    command: ["sleep", "infinity"]
    resources:
      limits:
        memory: "64Mi"
        cpu: "50m"
```

Create the pod and attach a debugger:

```bash
# Create the pod with shared process namespace
kubectl apply -f shared-process-namespace.yaml

# Wait for the pod to be ready
kubectl wait --for=condition=ready pod/shared-ns-pod --timeout=60s

# Attach an ephemeral container with process tools
kubectl debug -it shared-ns-pod --image=busybox:latest --target=app -- sh
```

Inside the ephemeral container, inspect processes:

```bash
# List all processes in the pod
ps aux

# Output shows processes from all containers:
# PID   USER     TIME  COMMAND
#   1   root     0:00  /pause
#   7   root     0:00  nginx: master process nginx -g daemon off;
#  37   nginx    0:00  nginx: worker process
#  38   root     0:00  sleep infinity
#  45   root     0:00  sh
#  51   root     0:00  ps aux

# Inspect a specific process
cat /proc/7/status

# Check open file descriptors for nginx
ls -la /proc/7/fd

# View the command line arguments
cat /proc/7/cmdline | tr '\0' ' '
```

## Debugging Distroless Containers

Distroless containers contain only your application and its runtime dependencies, with no shell, package manager, or debugging tools. This makes them secure but difficult to debug. Ephemeral containers solve this problem.

Create a distroless application pod:

```yaml
# distroless-app.yaml
apiVersion: v1
kind: Pod
metadata:
  name: distroless-app
spec:
  shareProcessNamespace: true
  containers:
  - name: app
    image: gcr.io/distroless/python3-debian12
    command: ["python3", "-c", "import http.server; http.server.HTTPServer(('', 8080), http.server.SimpleHTTPRequestHandler).serve_forever()"]
    ports:
    - containerPort: 8080
    resources:
      limits:
        memory: "256Mi"
        cpu: "200m"
```

Deploy and debug the distroless container:

```bash
# Create the distroless pod
kubectl apply -f distroless-app.yaml

# Wait for it to be ready
kubectl wait --for=condition=ready pod/distroless-app --timeout=60s

# Attach a full-featured debugging container
kubectl debug -it distroless-app \
  --image=nicolaka/netshoot:latest \
  --target=app \
  -- bash
```

The netshoot image includes comprehensive networking tools. Inside the container:

```bash
# Check network connectivity
curl localhost:8080

# Trace network connections
ss -tulpn

# Check the Python process
ps aux | grep python

# Examine the process memory map
cat /proc/$(pgrep python)/maps

# Capture network traffic
tcpdump -i any port 8080 -c 10

# Check DNS resolution
dig kubernetes.default.svc.cluster.local

# Test connectivity to other services
curl -v http://kubernetes.default.svc.cluster.local:443
```

## Using Copy Debugging

Copy debugging creates a duplicate of your pod with modifications, leaving the original pod untouched. This is useful when you need to:

- Add debugging tools to a container image
- Change the container command
- Run the same container with different configurations

Create a copy of a pod with a different image:

```bash
# Get the pod name
POD_NAME=$(kubectl get pods -l app=sample-app -o jsonpath='{.items[0].metadata.name}')

# Create a copy with a debug image
kubectl debug $POD_NAME -it \
  --copy-to=debug-copy \
  --image=nginx:alpine \
  --container=app \
  --share-processes \
  -- sh
```

The `--copy-to` flag creates a new pod named `debug-copy` with the same specification as the original but allows you to override the image and command.

For more control, replace the container command entirely:

```bash
# Create a copy with a custom command
kubectl debug $POD_NAME -it \
  --copy-to=debug-copy-2 \
  --container=app \
  --share-processes \
  -- sh -c "while true; do echo 'debugging'; sleep 5; done"
```

After debugging, clean up the copied pods:

```bash
# List debug copies
kubectl get pods | grep debug-copy

# Delete the debug copies
kubectl delete pod debug-copy debug-copy-2
```

## Adding Ephemeral Containers via API

For automation and scripting, you can add ephemeral containers directly through the Kubernetes API. This provides more control than kubectl debug.

Create a JSON patch to add an ephemeral container:

```bash
# Define the ephemeral container specification
cat << 'EOF' > ephemeral-patch.json
{
  "spec": {
    "ephemeralContainers": [
      {
        "name": "debugger",
        "image": "busybox:latest",
        "command": ["sh"],
        "stdin": true,
        "tty": true,
        "targetContainerName": "app"
      }
    ]
  }
}
EOF

# Apply the patch using kubectl
POD_NAME=$(kubectl get pods -l app=sample-app -o jsonpath='{.items[0].metadata.name}')
kubectl patch pod $POD_NAME \
  --subresource=ephemeralcontainers \
  --type=strategic \
  --patch-file=ephemeral-patch.json
```

Alternatively, use kubectl replace with the full pod specification:

```bash
# Get the current pod specification
kubectl get pod $POD_NAME -o json > pod.json

# Add the ephemeral container using jq
jq '.spec.ephemeralContainers += [{
  "name": "debugger-2",
  "image": "nicolaka/netshoot:latest",
  "command": ["bash"],
  "stdin": true,
  "tty": true,
  "targetContainerName": "app"
}]' pod.json > pod-patched.json

# Replace the pod specification
kubectl replace --raw /api/v1/namespaces/default/pods/$POD_NAME/ephemeralcontainers \
  -f pod-patched.json
```

Attach to the ephemeral container you created:

```bash
# Attach to the debugger container
kubectl attach -it $POD_NAME -c debugger

# Or attach to debugger-2
kubectl attach -it $POD_NAME -c debugger-2
```

## Node Debugging

Sometimes the issue lies at the node level rather than the pod level. Kubernetes allows you to debug nodes using ephemeral containers in a special debugging pod.

Debug a node directly:

```bash
# List available nodes
kubectl get nodes

# Debug a specific node (replace with your node name)
NODE_NAME=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
kubectl debug node/$NODE_NAME -it --image=busybox:latest
```

The node debugging pod runs with host namespaces and mounts the node's root filesystem at /host:

```bash
# Inside the node debug pod

# Access the host filesystem
ls /host

# Check host processes
chroot /host ps aux

# View host network interfaces
chroot /host ip addr

# Check kubelet logs
chroot /host journalctl -u kubelet --no-pager | tail -50

# Inspect container runtime
chroot /host crictl ps

# Check disk usage on the node
chroot /host df -h

# View system resource usage
chroot /host top -b -n 1 | head -20

# Check kernel messages
chroot /host dmesg | tail -50

# Exit when done
exit
```

For more comprehensive node debugging, use a specialized image:

```bash
# Debug with a full-featured image
kubectl debug node/$NODE_NAME -it \
  --image=ubuntu:22.04 \
  -- bash

# Inside the container, install additional tools if needed
apt-get update && apt-get install -y \
  procps \
  net-tools \
  strace \
  tcpdump \
  htop
```

## Advanced Debugging Scenarios

### Debugging CrashLoopBackOff Pods

When a pod is in CrashLoopBackOff, you cannot attach to it normally. Use copy debugging with a modified command:

```yaml
# crashing-app.yaml
apiVersion: v1
kind: Pod
metadata:
  name: crashing-app
spec:
  containers:
  - name: app
    image: busybox:latest
    command: ["sh", "-c", "exit 1"]
    resources:
      limits:
        memory: "64Mi"
        cpu: "50m"
```

Debug the crashing pod:

```bash
# Create the crashing pod
kubectl apply -f crashing-app.yaml

# Wait a moment for it to crash
sleep 10

# Check the pod status
kubectl get pod crashing-app

# Create a debug copy that keeps running
kubectl debug crashing-app -it \
  --copy-to=crash-debug \
  --container=app \
  -- sh -c "sleep infinity"
```

Inside the debug copy, investigate the crash:

```bash
# Check environment variables
env

# Look for configuration files
ls -la /

# Check if required files exist
cat /etc/hosts

# Test the original command manually
sh -c "exit 1"
echo "Exit code: $?"
```

### Debugging Init Container Failures

When init containers fail, the main containers never start. Debug by copying the pod and modifying init container behavior:

```yaml
# init-container-app.yaml
apiVersion: v1
kind: Pod
metadata:
  name: init-app
spec:
  initContainers:
  - name: init
    image: busybox:latest
    command: ["sh", "-c", "wget -qO- http://nonexistent-service/config"]
  containers:
  - name: app
    image: nginx:alpine
    resources:
      limits:
        memory: "128Mi"
        cpu: "100m"
```

Debug the init container:

```bash
# Create the pod with failing init container
kubectl apply -f init-container-app.yaml

# Check the pod status
kubectl get pod init-app

# The pod will be stuck in Init:0/1

# Create a debug copy without init containers
kubectl debug init-app -it \
  --copy-to=init-debug \
  --container=app \
  --share-processes \
  -- sh

# Or manually test the init container command
kubectl run init-test --rm -it --image=busybox:latest -- sh -c "wget -qO- http://nonexistent-service/config"
```

### Debugging Network Policies

Test network connectivity from inside a pod when network policies might be blocking traffic:

```bash
# Create a debug pod with network tools
kubectl debug $POD_NAME -it \
  --image=nicolaka/netshoot:latest \
  --target=app \
  -- bash
```

Inside the debugger:

```bash
# Test TCP connectivity
nc -zv other-service.namespace.svc.cluster.local 80

# Trace route to a service
traceroute other-service.namespace.svc.cluster.local

# Check if DNS is working
nslookup other-service.namespace.svc.cluster.local

# Test HTTP connectivity
curl -v http://other-service.namespace.svc.cluster.local:80

# Capture packets to see what is being blocked
tcpdump -i any host other-service.namespace.svc.cluster.local -c 20

# Check iptables rules (if accessible)
iptables -L -n -v
```

### Memory and CPU Profiling

Debug resource issues using specialized tools:

```bash
# Attach a container with profiling tools
kubectl debug $POD_NAME -it \
  --image=ubuntu:22.04 \
  --target=app \
  -- bash
```

Inside the container:

```bash
# Install profiling tools
apt-get update && apt-get install -y \
  linux-tools-generic \
  strace \
  sysstat

# Monitor process resource usage
top -b -n 1 -p $(pgrep nginx)

# Trace system calls
strace -p $(pgrep nginx) -c -f &
sleep 10
kill %1

# Check memory details
cat /proc/$(pgrep nginx)/status | grep -E 'VmSize|VmRSS|VmSwap'

# Monitor I/O
iostat -x 1 5
```

## Best Practices

### Security Considerations

Ephemeral containers can access sensitive information in the pod. Follow these guidelines:

```yaml
# Restrict ephemeral container creation with RBAC
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: debug-pods
  namespace: default
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["pods/ephemeralcontainers"]
  verbs: ["update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: debug-pods-binding
  namespace: default
subjects:
- kind: User
  name: developer
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: debug-pods
  apiGroup: rbac.authorization.k8s.io
```

### Choosing the Right Debug Image

Different scenarios require different debug images. Here is a comparison:

| Image | Size | Use Case | Included Tools |
|-------|------|----------|----------------|
| busybox:latest | ~1MB | Basic debugging | sh, wget, nc, vi |
| alpine:latest | ~5MB | General purpose | sh, apk package manager |
| nicolaka/netshoot | ~300MB | Network debugging | curl, dig, tcpdump, iperf |
| ubuntu:22.04 | ~77MB | Full debugging | apt package manager, bash |
| gcr.io/k8s-staging-cri-tools/debug | ~40MB | Container runtime | crictl, ctr |

### Cleanup Procedures

Ephemeral containers cannot be removed from pods. To clean up:

```bash
# List pods with ephemeral containers
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.spec.ephemeralContainers[*].name}{"\n"}{end}'

# For non-critical workloads, delete and recreate the pod
kubectl delete pod $POD_NAME

# For deployments, the controller will recreate the pod automatically
kubectl rollout restart deployment/sample-app
```

### Audit Logging

Enable audit logging for ephemeral container operations:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: RequestResponse
  resources:
  - group: ""
    resources: ["pods/ephemeralcontainers"]
  verbs: ["update", "patch"]
```

## Troubleshooting Common Issues

### Ephemeral Container Not Starting

Check the pod events for errors:

```bash
# Describe the pod to see events
kubectl describe pod $POD_NAME

# Check ephemeral container status
kubectl get pod $POD_NAME -o jsonpath='{.status.ephemeralContainerStatuses}' | jq .
```

Common causes:
- Image pull errors: verify the image name and registry access
- Security context conflicts: check pod security policies or standards
- Resource constraints: ensure the node has available resources

### Cannot See Target Container Processes

Verify process namespace sharing is enabled:

```bash
# Check if shareProcessNamespace is set
kubectl get pod $POD_NAME -o jsonpath='{.spec.shareProcessNamespace}'

# Should return "true"
```

If the pod was created without process namespace sharing, you need to recreate it with the setting enabled.

### Permission Denied Errors

Check your RBAC permissions:

```bash
# Verify you can update ephemeral containers
kubectl auth can-i update pods/ephemeralcontainers

# Check for pod security admission restrictions
kubectl get namespace default -o jsonpath='{.metadata.labels}' | grep pod-security
```

## Cleanup

Remove all resources created in this tutorial:

```bash
# Delete all test resources
kubectl delete deployment sample-app
kubectl delete pod shared-ns-pod distroless-app crashing-app init-app
kubectl delete pod crash-debug init-debug debug-copy debug-copy-2 2>/dev/null

# Remove generated files
rm -f sample-app.yaml shared-process-namespace.yaml distroless-app.yaml
rm -f crashing-app.yaml init-container-app.yaml
rm -f ephemeral-patch.json pod.json pod-patched.json
```

## Summary

Ephemeral containers provide a powerful mechanism for debugging running pods without modifying deployments or restarting workloads. Key takeaways:

- Use `kubectl debug` for quick, interactive debugging sessions
- Enable `shareProcessNamespace: true` to see processes across containers
- Copy debugging allows testing configuration changes without affecting production
- Node debugging provides access to host-level troubleshooting
- Choose appropriate debug images based on your debugging needs
- Implement proper RBAC controls to restrict ephemeral container creation

Ephemeral containers have become an essential tool for Kubernetes operators and developers working with production workloads. They bridge the gap between secure, minimal container images and the practical need for debugging capabilities.

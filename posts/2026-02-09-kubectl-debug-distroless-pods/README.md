# How to Configure kubectl debug to Attach Debug Containers to Distroless Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, Security

Description: Learn how to use kubectl debug with distroless and minimal container images to troubleshoot production workloads while maintaining security best practices.

---

Distroless containers contain only your application and its runtime dependencies, without package managers, shells, or debugging tools. This minimizes attack surface and reduces image size, but creates challenges when you need to debug issues. The kubectl debug command solves this by attaching temporary debug containers with full tooling to your minimal production pods.

Distroless images from Google, Chainguard, and other vendors are increasingly popular for production workloads because they dramatically reduce security vulnerabilities. However, when issues arise, you need debugging capabilities without compromising your security posture.

## Understanding Distroless Challenges

Distroless containers typically lack shells like bash or sh, have no package managers like apt or yum, contain no debugging tools like curl, wget, or netstat, and have minimal filesystem contents. This makes traditional debugging approaches impossible since you cannot exec into the container or install tools.

## Setting Up kubectl debug

Ensure you have kubectl 1.18 or later:

```bash
# Check kubectl version
kubectl version --client

# Verify debug command availability
kubectl debug --help
```

## Debugging a Distroless Pod

Create a test distroless application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: distroless-app
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: distroless-app
  template:
    metadata:
      labels:
        app: distroless-app
    spec:
      containers:
      - name: app
        image: gcr.io/distroless/nodejs:18
        ports:
        - containerPort: 3000
        workingDir: /app
        command: ["node"]
        args: ["server.js"]
```

Debug the distroless pod:

```bash
# Get pod name
POD_NAME=$(kubectl get pod -n production -l app=distroless-app -o jsonpath='{.items[0].metadata.name}')

# Attach debug container with full tooling
kubectl debug -n production $POD_NAME -it \
  --image=nicolaka/netshoot \
  --target=app \
  --share-processes

# You now have a shell with full debugging capabilities
# while the distroless container continues running
```

## Using Different Debug Images

Choose appropriate debug images for different scenarios:

```bash
# For network debugging - nicolaka/netshoot
kubectl debug distroless-pod -it \
  --image=nicolaka/netshoot \
  --target=app

# For general Linux debugging - ubuntu
kubectl debug distroless-pod -it \
  --image=ubuntu:22.04 \
  --target=app

# For minimal debugging - busybox
kubectl debug distroless-pod -it \
  --image=busybox:1.36 \
  --target=app

# For Go application debugging
kubectl debug distroless-go-pod -it \
  --image=golang:1.21 \
  --target=app \
  --share-processes

# For Java application debugging
kubectl debug distroless-java-pod -it \
  --image=openjdk:17-slim \
  --target=app \
  --share-processes
```

## Accessing Distroless Container Filesystem

Mount the distroless container's filesystem in your debug container:

```bash
# Debug with process namespace sharing
kubectl debug distroless-pod -it \
  --image=ubuntu \
  --target=app \
  --share-processes

# Inside the debug container, access the distroless filesystem
ls -la /proc/1/root/

# Read files from the distroless container
cat /proc/1/root/app/config.json

# Check environment variables
cat /proc/1/environ | tr '\0' '\n'

# View file descriptors
ls -la /proc/1/fd/

# Check current working directory
ls -la /proc/1/cwd/
```

## Network Debugging Distroless Pods

Comprehensive network troubleshooting:

```bash
# Attach network debugging tools
kubectl debug distroless-pod -it \
  --image=nicolaka/netshoot \
  --target=app

# Inside the debug container:

# Test connectivity to external services
curl -v https://api.example.com

# Check DNS resolution
nslookup database-service
dig database-service.production.svc.cluster.local

# Verify service connectivity
nc -zv database-service 5432

# Capture network traffic
tcpdump -i any -nn 'port 3000'

# Check network interfaces and routes
ip addr show
ip route show

# Test pod-to-pod connectivity
ping other-pod-ip

# Check listening ports (from host perspective)
ss -tulpn

# View iptables rules affecting the pod
iptables -L -n -v

# Check connection tracking
conntrack -L
```

## Process and Application Debugging

Debug application behavior without modifying the image:

```bash
# Debug with process access
kubectl debug nodejs-distroless-pod -it \
  --image=ubuntu \
  --target=app \
  --share-processes

# Inside the debug container:

# Find the application process
ps aux | grep node

# Get the main process PID
PID=$(ps aux | grep 'node server.js' | grep -v grep | awk '{print $2}')

# Trace system calls
strace -p $PID

# View process memory maps
cat /proc/$PID/maps

# Check open files
lsof -p $PID

# Monitor process resources
top -p $PID

# Send signals to the process
kill -USR1 $PID  # Trigger heap dump in Node.js
kill -USR2 $PID  # Trigger CPU profile in Node.js

# Check process limits
cat /proc/$PID/limits

# View process status
cat /proc/$PID/status
```

## Copying Distroless Pods for Investigation

Create a modified copy for extensive debugging:

```bash
# Copy the pod with a different image for debugging
kubectl debug distroless-pod \
  --copy-to=distroless-pod-debug \
  --set-image=app=ubuntu:22.04 \
  --share-processes \
  -- bash

# The original pod continues running
# The debug copy uses ubuntu instead of distroless

# Install any tools you need
apt-get update
apt-get install -y \
  curl \
  wget \
  strace \
  tcpdump \
  vim \
  netcat \
  dnsutils

# Now debug the application
# Note: The application might fail due to missing dependencies
# This is more useful for filesystem/config inspection
```

## Debugging Distroless Init Containers

Debug init containers that use distroless images:

```bash
# If init container fails, create a debug pod
kubectl debug pod-with-distroless-init \
  --copy-to=debug-init \
  --container=init-container \
  --image=ubuntu \
  -- sleep infinity

# Then exec into it
kubectl exec -it debug-init -c init-container -- bash

# Manually run the init container's command
# to see what fails
```

## Creating a Debug Profile

Create a reusable debug profile:

```bash
# Save as ~/.kube/debug-profiles.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: debug-profiles
data:
  netshoot: |
    image: nicolaka/netshoot
    shareProcesses: true
  ubuntu-full: |
    image: ubuntu:22.04
    shareProcesses: true
    command: ["bash", "-c", "apt-get update && apt-get install -y curl wget strace tcpdump && bash"]
  minimal: |
    image: busybox:1.36
    shareProcesses: false
```

Use it with a wrapper script:

```bash
#!/bin/bash
# Save as kubectl-debug-distroless

POD_NAME=$1
PROFILE=${2:-netshoot}

case $PROFILE in
  netshoot)
    IMAGE="nicolaka/netshoot"
    SHARE_PROC="--share-processes"
    ;;
  ubuntu)
    IMAGE="ubuntu:22.04"
    SHARE_PROC="--share-processes"
    ;;
  busybox)
    IMAGE="busybox:1.36"
    SHARE_PROC=""
    ;;
  *)
    echo "Unknown profile: $PROFILE"
    exit 1
    ;;
esac

kubectl debug "$POD_NAME" -it \
  --image="$IMAGE" \
  --target=$(kubectl get pod "$POD_NAME" -o jsonpath='{.spec.containers[0].name}') \
  $SHARE_PROC

# Usage:
# kubectl-debug-distroless my-pod netshoot
# kubectl-debug-distroless my-pod ubuntu
```

## Debugging Distroless Security Context

Investigate security settings and capabilities:

```bash
# Debug with capability inspection
kubectl debug distroless-pod -it \
  --image=ubuntu \
  --target=app \
  --share-processes

# Check capabilities
apt-get update && apt-get install -y libcap2-bin
capsh --print

# View process capabilities
cat /proc/1/status | grep Cap

# Check SELinux/AppArmor status
cat /proc/1/attr/current

# View seccomp profile
cat /proc/1/status | grep Seccomp

# Check user context
ps aux | grep "^\S\+\s\+1\s"
```

## Automated Distroless Debugging Workflow

Create an automated debugging script:

```bash
#!/bin/bash
# Save as debug-distroless.sh

POD_NAME=$1
NAMESPACE=${2:-default}

echo "=== Debugging Distroless Pod: $POD_NAME in namespace: $NAMESPACE ==="

# Check if pod exists
if ! kubectl get pod -n "$NAMESPACE" "$POD_NAME" &>/dev/null; then
    echo "Error: Pod $POD_NAME not found in namespace $NAMESPACE"
    exit 1
fi

# Get container name
CONTAINER=$(kubectl get pod -n "$NAMESPACE" "$POD_NAME" -o jsonpath='{.spec.containers[0].name}')

echo "Container: $CONTAINER"
echo "Creating debug session..."

# Launch debug container
kubectl debug -n "$NAMESPACE" "$POD_NAME" -it \
  --image=nicolaka/netshoot \
  --target="$CONTAINER" \
  --share-processes \
  -- bash -c "
echo '=== Debug Container Ready ==='
echo 'Available commands:'
echo '  ps aux          - View all processes'
echo '  tcpdump         - Capture network traffic'
echo '  curl/wget       - Test HTTP connectivity'
echo '  nslookup/dig    - DNS debugging'
echo '  /proc/1/root/   - Access distroless filesystem'
echo ''
bash
"
```

## Best Practices

Always use specific image tags for debug containers to ensure consistency. Prefer minimal debug images when possible to reduce attack surface. Use process sharing only when necessary to inspect application processes. Document debug sessions for audit and compliance purposes. Remove debug containers by deleting pods after investigation. Consider using debug profiles for team consistency. Test debug procedures in non-production first.

## Troubleshooting Common Issues

If you cannot attach to a distroless pod, ensure your Kubernetes version supports ephemeral containers (1.23+). Check that the feature gate EphemeralContainers is enabled (default in 1.25+). Verify RBAC permissions allow creating ephemeral containers. Confirm the pod is running and not in CrashLoopBackOff state.

kubectl debug makes debugging distroless containers practical, allowing you to maintain security best practices in production while retaining powerful debugging capabilities when needed.

# How to Use Ephemeral Containers to Debug Running Pods Without Restart

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Debugging, Troubleshooting

Description: Learn how to use ephemeral containers in Kubernetes to debug running pods without restarting them, perfect for troubleshooting production issues without disruption.

---

Debugging production pods often requires tools that aren't included in minimal container images. Traditionally, you would need to rebuild images with debugging tools or restart pods with modified configurations. Ephemeral containers solve this by allowing you to inject temporary debugging containers into running pods without modifying the pod spec or restarting existing containers.

This capability is essential when debugging distroless or minimal images, investigating production issues without service disruption, accessing networking tools not present in application containers, and analyzing running processes without redeployment.

## Understanding Ephemeral Containers

Ephemeral containers are temporary containers that can be added to an existing pod. They share the pod's network namespace and can optionally share process and filesystem namespaces with other containers. Unlike regular containers, they don't have resource guarantees, restart policies, or readiness probes.

Ephemeral containers were introduced as alpha in Kubernetes 1.16 and reached stable status in 1.25.

## Checking Ephemeral Container Support

Verify your cluster supports ephemeral containers:

```bash
# Check Kubernetes version
kubectl version --short

# Check feature gate (not needed in 1.25+)
kubectl get --raw /metrics | grep ephemeral

# Try creating an ephemeral container (will fail if unsupported)
kubectl debug --help | grep ephemeral
```

## Basic Ephemeral Container Usage

Add a debug container to a running pod:

```bash
# Create a test pod with minimal image
kubectl run minimal-pod --image=gcr.io/distroless/static:nonroot

# Wait for pod to be ready
kubectl wait --for=condition=Ready pod/minimal-pod

# Add ephemeral debug container
kubectl debug minimal-pod -it --image=busybox --target=minimal-pod

# This drops you into a shell in the debug container
# You can now use debugging tools like:
ps aux
netstat -tulpn
ls -la /proc/1/root/
```

## Debugging Without Targeting a Container

Create a debug container that doesn't share process namespace:

```bash
# Debug without targeting specific container
kubectl debug minimal-pod -it --image=nicolaka/netshoot

# This gives you a full networking toolkit
# Tools available: curl, wget, tcpdump, nslookup, dig, etc.

# Test connectivity from the pod's perspective
curl -I http://service-name:8080

# Capture network traffic
tcpdump -i eth0 -w /tmp/capture.pcap

# Analyze DNS resolution
nslookup service-name
dig service-name.namespace.svc.cluster.local
```

## Sharing Process Namespace

Debug with access to all processes in the pod:

```bash
# Create debug container with shared process namespace
kubectl debug my-app-pod -it \
  --image=busybox \
  --target=my-app-pod \
  --share-processes

# Now you can see all processes in the pod
ps aux

# Attach to running process with strace
strace -p <pid>

# Send signals to processes
kill -USR1 <pid>

# Check process file descriptors
ls -la /proc/<pid>/fd/
```

## Copying a Pod for Debugging

Create a copy of a pod with debugging tools:

```bash
# Create a copy of the pod with a debug container
kubectl debug my-app-pod -it \
  --copy-to=my-app-pod-debug \
  --container=debug \
  --image=ubuntu

# The original pod continues running
# The copied pod has the debug container

# Install tools in the debug container
apt-get update && apt-get install -y \
  curl \
  tcpdump \
  strace \
  net-tools \
  procps

# Debug the application
ps aux | grep app
netstat -tulpn
```

## Debugging CrashLoopBackOff Pods

Debug pods that crash immediately:

```bash
# Change command to keep container alive
kubectl debug failing-pod -it \
  --copy-to=failing-pod-debug \
  --container=app \
  --image=same-image:tag \
  -- sh -c "sleep infinity"

# Now investigate why it was crashing
kubectl exec -it failing-pod-debug -- sh

# Check logs from previous crashes
kubectl logs failing-pod --previous

# Test the failing command manually
/app/binary --config /etc/config/app.conf
```

## Advanced Ephemeral Container Scenarios

Debug with custom capabilities:

```bash
# Create debug container with additional capabilities
kubectl debug my-pod -it \
  --image=nicolaka/netshoot \
  --target=my-pod \
  --profile=netadmin

# This adds NET_ADMIN and NET_RAW capabilities
# allowing for advanced network debugging

# Capture network packets
tcpdump -i any -w /tmp/capture.pcap 'port 80 or port 443'

# Analyze network interfaces
ip link show
ip addr show
ip route show
```

## Debugging with Custom Images

Create ephemeral containers with specialized debugging images:

```bash
# Debug with full Linux tools
kubectl debug my-pod -it --image=ubuntu --target=my-pod
apt-get update
apt-get install -y vim strace ltrace gdb

# Debug with Go debugging tools
kubectl debug go-app-pod -it --image=golang:1.21 --target=go-app-pod
go tool pprof http://localhost:6060/debug/pprof/heap

# Debug with Python debugging tools
kubectl debug python-app-pod -it --image=python:3.11 --target=python-app-pod
python -m pdb /app/main.py
```

## Automating Ephemeral Container Creation

Create a helper script for common debugging scenarios:

```bash
#!/bin/bash
# Save as kubectl-debug-pod

POD_NAME=$1
NAMESPACE=${2:-default}
IMAGE=${3:-nicolaka/netshoot}

if [ -z "$POD_NAME" ]; then
    echo "Usage: kubectl debug-pod <pod-name> [namespace] [image]"
    exit 1
fi

echo "Creating ephemeral debug container in pod: $POD_NAME"
echo "Namespace: $NAMESPACE"
echo "Image: $IMAGE"

kubectl debug -n "$NAMESPACE" "$POD_NAME" -it \
  --image="$IMAGE" \
  --target="$POD_NAME" \
  --share-processes

# Usage:
# kubectl debug-pod my-app-pod
# kubectl debug-pod my-app-pod production
# kubectl debug-pod my-app-pod production ubuntu
```

## Viewing Ephemeral Containers

List ephemeral containers in a pod:

```bash
# View pod specification including ephemeral containers
kubectl get pod my-pod -o yaml | grep -A 20 ephemeralContainers

# View ephemeral containers in JSON format
kubectl get pod my-pod -o jsonpath='{.spec.ephemeralContainers[*].name}'

# Describe pod to see ephemeral containers
kubectl describe pod my-pod | grep -A 10 "Ephemeral Containers"
```

## Cleaning Up Ephemeral Containers

Ephemeral containers cannot be removed once added:

```bash
# Ephemeral containers remain until pod deletion
# They don't automatically restart or get removed

# To clean up, you must delete the pod
kubectl delete pod my-pod

# If using a deployment, delete the pod to get a fresh one
kubectl delete pod -n myapp <pod-name>
# The deployment controller will create a new pod without ephemeral containers
```

## Best Practices for Ephemeral Containers

Use minimal debug images when possible to reduce download time. Share process namespace only when necessary for security. Create pod copies for invasive debugging to avoid affecting running workloads. Document which ephemeral containers were added for audit purposes. Clean up debug pods after investigation is complete. Use namespace-specific debug images tailored to your application stack.

## Debugging Strategies

For application crashes, copy the pod and change the command. For network issues, use netshoot without process sharing. For performance investigation, use shared process namespace with strace. For security investigation, copy the pod to preserve state.

## Limitations and Considerations

Ephemeral containers cannot be removed without deleting the pod. They don't support resource limits or requests. They don't have restart policies. They cannot be defined in pod specs, only added at runtime. Some features require specific Kubernetes versions.

## Real-World Example

Debug a production API that's timing out:

```bash
# Add network debugging container
kubectl debug api-pod-xyz -it \
  --image=nicolaka/netshoot \
  --target=api-pod-xyz

# Inside the debug container:
# Check DNS resolution
nslookup database-service

# Test connectivity to database
timeout 5 bash -c '</dev/tcp/database-service/5432' && echo "Port open" || echo "Port closed"

# Capture traffic to see actual requests
tcpdump -i eth0 -A 'dst port 5432'

# Check if the application is actually making requests
netstat -an | grep 5432

# Exit and check application logs
exit

kubectl logs api-pod-xyz
```

Ephemeral containers provide a powerful, non-disruptive way to debug running Kubernetes pods, making them essential for modern production troubleshooting workflows.

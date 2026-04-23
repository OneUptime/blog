# How to Use Ephemeral Containers in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Ephemeral Container, Debugging, Troubleshooting

Description: Master ephemeral containers in Rancher Kubernetes clusters to debug distroless and minimal containers without modifying the original pod specification.

## Introduction

Ephemeral containers are a special type of container that can be added to a running pod for debugging purposes. Unlike regular containers, they cannot be restarted automatically and are added through the pod's `ephemeralcontainers` subresource rather than the original pod manifest. This makes them ideal for debugging minimal or distroless containers that lack debugging tools. This guide covers working with ephemeral containers in Rancher.

## Prerequisites

- Kubernetes 1.25+ (ephemeral containers are stable)
- kubectl 1.25+
- Appropriate RBAC permissions (pods/ephemeralcontainers)
- Rancher-managed cluster

## Step 1: Verify Ephemeral Container Support

```bash
# Check Kubernetes version
kubectl version

# Verify ephemeral container RBAC
kubectl auth can-i update pods --subresource=ephemeralcontainers -n production

# List running pods to debug
kubectl get pods -n production
```

## Step 2: Attach an Ephemeral Container

```bash
# Basic ephemeral container attachment
kubectl debug -it \
  --image=busybox \
  pod/my-distroless-app-xyz \
  -n production

# Target the application container's namespaces so you can inspect its processes
kubectl debug -it \
  --image=busybox \
  --target=my-app \
  pod/my-distroless-app-xyz \
  -n production

# The --target flag asks the container runtime to place the ephemeral
# container in the target container's namespaces
ps aux
ls /proc/1/root/  # View target container's filesystem
```

## Step 3: Debug Distroless Containers

```bash
# Distroless containers have no shell or tools
# Ephemeral containers are the solution

# Example: debug a distroless Go application
kubectl debug -it \
  --image=registry.example.com/debug-tools:latest \
  --target=go-app \
  pod/go-app-pod-xyz \
  -n production

# Inside the ephemeral container, access the Go app's filesystem
ls /proc/1/root/
cat /proc/1/root/etc/config.yaml

# Check what binary is running
cat /proc/1/cmdline | tr '\0' ' '

# Inspect environment variables
cat /proc/1/environ | tr '\0' '\n'
```

## Step 4: Inspect Running Process State

```bash
# After attaching to a pod with --target flag
# View all processes in the shared namespace
ps aux

# Attach to the running process (if it's a Go or Python app)
# Find the PID first
ps aux | grep myapp

# Strace the process (requires debug image with strace)
# The ephemeral container needs SYS_PTRACE capability
strace -p 1 -e trace=network

# Check open file descriptors
ls -la /proc/1/fd/

# Check network connections
cat /proc/1/net/tcp
```

## Step 5: Configure Ephemeral Container with Security Context

```bash
# Use a built-in debug profile when the ephemeral container needs elevated privileges
kubectl debug -it \
  pod/my-app-pod \
  --image=registry.example.com/debug-tools:latest \
  -n production \
  --target=my-app \
  --profile=sysadmin \
  -- sh

# On Kubernetes v1.32+, use a custom profile for fine-grained capabilities
cat <<EOF > custom-profile.yaml
securityContext:
  capabilities:
    add:
      - SYS_PTRACE
EOF

kubectl debug -it \
  pod/my-app-pod \
  --image=registry.example.com/debug-tools:latest \
  -n production \
  --target=my-app \
  --profile=general \
  --custom=custom-profile.yaml \
  -- sh
```

## Step 6: Network Debugging with Ephemeral Containers

```bash
# Debug network issues using netshoot
# Use a privileged debug profile if you need packet capture tools such as tcpdump
kubectl debug -it \
  pod/my-app-pod \
  --image=nicolaka/netshoot \
  --target=my-app \
  --profile=sysadmin \
  -n production \
  -- bash

# Inside netshoot ephemeral container
# Check if target service is accessible
curl -v http://backend-service:8080/health

# DNS lookup
dig backend-service.production.svc.cluster.local

# Check network interfaces
ip addr show

# Trace route to service
traceroute backend-service.production.svc.cluster.local

# Capture packets
tcpdump -i any port 8080 -w /tmp/debug.pcap
```

## Step 7: View Ephemeral Container Status

```bash
# Check ephemeral container status in pod
kubectl describe pod my-app-pod -n production | grep -A 20 "Ephemeral Containers"

# Get pod JSON to see ephemeral container status details
kubectl get pod my-app-pod -n production -o json | \
  jq '.status.ephemeralContainerStatuses'

# Get logs from an ephemeral container
# Replace debugger with the actual ephemeral container name if you did not set one explicitly
kubectl logs my-app-pod -c debugger -n production

# Ephemeral containers cannot be removed; after they exit, their status
# remains on the pod until the pod is deleted
```

## Step 8: RBAC Configuration for Ephemeral Containers

```yaml
# ephemeral-container-rbac.yaml - RBAC for ephemeral container access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: ephemeral-container-user
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/ephemeralcontainers"]
    verbs: ["update", "get"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["pods/attach"]
    verbs: ["create", "get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: developers-ephemeral
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ephemeral-container-user
subjects:
  - kind: Group
    name: platform-engineers
    apiGroup: rbac.authorization.k8s.io
```

## Conclusion

Ephemeral containers are essential for debugging distroless and minimal containers in production Kubernetes environments. By injecting a fully-equipped debug container with process namespace sharing, you can investigate running applications without modifying their deployment manifests or images. In Rancher, proper RBAC configuration ensures that only authorized personnel can attach ephemeral containers, maintaining security while enabling efficient troubleshooting.

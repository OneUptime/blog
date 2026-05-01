# How to Use Ephemeral Containers in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Ephemeral Container, Kubernetes, Debugging, Distroless, Troubleshooting

Description: Use Kubernetes ephemeral containers to debug running pods in Rancher without restarting them, enabling live debugging of distroless and minimal container images.

## Introduction

Ephemeral containers are temporary containers added to a running pod for debugging purposes. Unlike regular containers, they cannot be restarted, and once added they remain listed on the pod until the pod itself is deleted. They are specifically designed for debugging minimal production images that lack shells and diagnostic tools.

## Prerequisites

- Kubernetes 1.25+ (ephemeral containers are stable since 1.25)
- Rancher with a compatible cluster

## Basic Usage

```bash
# Add an ephemeral debug container to a running pod

kubectl debug -it pod/myapp-7d4f9b6c-xkv8p \
  -n production \
  --image=busybox:latest \
  --target=myapp    # Target the 'myapp' container's process namespace

# Inside the ephemeral container, inspect the main process
ps    # Shows processes visible from the targeted container's process namespace

# Access the main container filesystem via /proc using a PID from 'ps'
ls /proc/<PID>/root/etc/    # View the target container's /etc directory
```

## Debugging Distroless Images

Distroless images contain only the application binary and its dependencies-no shell, no package manager. Ephemeral containers let you attach debug tools:

```bash
# Distroless debug images include a BusyBox shell
kubectl debug -it pod/api-server-abc123 \
  -n production \
  --image=gcr.io/distroless/base-debian12:debug \
  --target=api-server

# Or use a more feature-rich debug image
kubectl debug -it pod/api-server-abc123 \
  -n production \
  --image=ubuntu:22.04 \
  --target=api-server
```

## Investigating Memory Issues

```bash
# Attach a debug container with memory analysis tools
kubectl debug -it pod/myapp-abc123 \
  -n production \
  --image=nicolaka/netshoot \
  --target=myapp

# Inside the ephemeral container

# Identify the target process PID
ps

# Sum proportional set size (PSS) for the target process
awk '/^Pss:/ {sum += $2} END {print sum " kB"}' /proc/<PID>/smaps

# Check the process memory summary
grep -E 'VmRSS|VmSize|VmSwap' /proc/<PID>/status
```

## Investigating Network Issues

```bash
# Add a network-focused debug container
kubectl debug -it pod/service-abc123 \
  -n production \
  --image=nicolaka/netshoot \
  --container=net-debugger \
  --profile=sysadmin

# Capture network traffic
tcpdump -i any -n port 8080 -w /tmp/capture.pcap &
TCPDUMP_PID=$!
sleep 30
kill "$TCPDUMP_PID"

# From another terminal, copy capture to local machine
kubectl cp production/service-abc123:/tmp/capture.pcap ./capture.pcap -c net-debugger
```

## Viewing Ephemeral Container Status

```bash
# List ephemeral containers on a pod
kubectl get pod myapp-7d4f9b6c-xkv8p \
  -n production \
  -o jsonpath='{.spec.ephemeralContainers[*].name}'

# Check ephemeral container state
kubectl get pod myapp-7d4f9b6c-xkv8p \
  -n production \
  -o jsonpath='{.status.ephemeralContainerStatuses[*].state}'

# Check ephemeral container logs
kubectl logs myapp-7d4f9b6c-xkv8p \
  -n production \
  -c debugger-xxx    # Name assigned to the ephemeral container
```

## Automating Debug Session Setup

```bash
#!/bin/bash
# debug-pod.sh - Quick debug session with standard tools
POD_NAME=$1
NAMESPACE=${2:-default}
CONTAINER_NAME=$(kubectl get pod "${POD_NAME}" \
  --namespace="${NAMESPACE}" \
  -o jsonpath='{.spec.containers[0].name}')

kubectl debug -it "pod/${POD_NAME}" \
  --namespace="${NAMESPACE}" \
  --image=nicolaka/netshoot:latest \
  --container=debugger \
  --target="${CONTAINER_NAME}"    # Default to the pod's first container
```

## Conclusion

Ephemeral containers in Rancher fill the gap left by minimal production images. The `--target` flag lets the debug container join the target container's process namespace when the container runtime supports it, while the pod network namespace is already shared. You can inspect the target filesystem through `/proc/<PID>/root` without restarting the pod or modifying the production image. This is a practical way to debug production issues in real time.

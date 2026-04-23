# How to Set Up Debug Containers in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Debug Containers, Troubleshooting, Development

Description: Use debug containers in Rancher to troubleshoot running pods without modifying production images, using kubectl debug and custom sidecar approaches.

## Introduction

Debug containers allow you to troubleshoot running pods by injecting a container with debugging tools into an existing pod, without modifying or rebuilding the production image. Kubernetes 1.23 introduced beta support for ephemeral containers via `kubectl debug`, and Kubernetes 1.25 made the feature stable. This guide covers multiple approaches to debug containers in Rancher-managed clusters.

## Prerequisites

- Rancher-managed cluster with Kubernetes 1.25+ or Kubernetes 1.23-1.24 with the `EphemeralContainers` feature enabled
- kubectl with debug capabilities
- Appropriate RBAC permissions for ephemeral containers

## Step 1: Check Ephemeral Container Support

```bash
# Ephemeral containers are stable in Kubernetes 1.25+
# In Kubernetes 1.23-1.24, the feature is beta and enabled by default unless disabled

# Check the cluster version
kubectl get --raw /version | jq .gitVersion

# Verify you can patch the ephemeralcontainers subresource used by kubectl debug
kubectl auth can-i patch pods --subresource=ephemeralcontainers -n production
```

## Step 2: Debug a Running Pod

```bash
# Attach a debug container to a running pod
kubectl debug -it \
  -n production \
  pod/my-app-pod-xyz \
  --image=busybox \
  --target=my-app

# Use a more feature-rich debug image
kubectl debug -it \
  -n production \
  pod/my-app-pod-xyz \
  --image=nicolaka/netshoot \
  --target=my-app

# The --target flag targets the process namespace of the target container
# so you can inspect its processes when the container runtime supports it
```

## Step 3: Create a Debug Image

```dockerfile
# Dockerfile.debug - Comprehensive debug image
FROM alpine:3.23

RUN apk add --no-cache \
    bash \
    curl \
    wget \
    tcpdump \
    netcat-openbsd \
    nmap \
    bind-tools \
    strace \
    ltrace \
    gdb \
    jq \
    vim \
    procps \
    lsof \
    htop \
    iperf3 \
    openssl \
    postgresql-client \
    mysql-client \
    redis \
    python3 \
    py3-pip \
    && pip3 install httpie

CMD ["/bin/bash"]
```

```bash
# Build and push the debug image
docker build -t registry.example.com/debug-tools:latest -f Dockerfile.debug .
docker push registry.example.com/debug-tools:latest

# Use your custom debug image
kubectl debug -it \
  pod/my-app-pod \
  --image=registry.example.com/debug-tools:latest \
  -n production
```

## Step 4: Debug a Node

```bash
# Debug a node directly with a privileged debug profile
kubectl debug node/worker-node-01 \
  -it \
  --profile=sysadmin \
  --image=registry.example.com/debug-tools:latest

# Access the node filesystem at /host
ls /host/etc/
cat /host/var/log/syslog

# Check node processes
chroot /host ps aux

# Check kubelet logs on the node
chroot /host journalctl -u kubelet -f
```

## Step 5: Copy-and-Debug Pattern

```bash
# Create a copy of the pod and add a debug container
# This creates a new pod with the same spec plus an interactive debug shell
kubectl debug \
  -n production \
  pod/my-app-pod \
  --copy-to=my-app-debug \
  --container=debugger \
  -it \
  --image=registry.example.com/debug-tools:latest \
  -- bash

# Copy pod and override the entrypoint
kubectl debug \
  -n production \
  pod/my-app-pod \
  --copy-to=my-app-debug-shell \
  --set-image=my-app=registry.example.com/app:debug \
  --container=my-app \
  -it \
  -- /bin/sh
```

## Step 6: Sidecar Debug Pattern for Production

```yaml
# deployment-with-debug-sidecar.yaml - Conditional debug sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
  annotations:
    debug-mode: "false"
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: registry.example.com/app:v1.0
          ports:
            - containerPort: 8080
        # Debug sidecar (only add when needed)
        # - name: debug-sidecar
        #   image: registry.example.com/debug-tools:latest
        #   command: ["sleep", "infinity"]
        #   securityContext:
        #     capabilities:
        #       add: ["SYS_PTRACE"]
```

## Step 7: Configure RBAC for Debug Access

```yaml
# debug-rbac.yaml - Allow developers to use debug containers
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: debug-pods
  namespace: development
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/attach", "pods/exec"]
    verbs: ["create"]
  - apiGroups: [""]
    resources: ["pods/ephemeralcontainers"]
    verbs: ["patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developers-debug
  namespace: development
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: debug-pods
subjects:
  - kind: Group
    name: developers
    apiGroup: rbac.authorization.k8s.io
```

## Step 8: Debug Network Issues

```bash
# Use netshoot for network debugging
kubectl debug --profile=sysadmin -it \
  pod/my-app-pod \
  --container=debugger \
  --image=nicolaka/netshoot \
  -n production \
  -- bash

# Inside netshoot container
# Check DNS resolution
dig my-service.production.svc.cluster.local

# Check connectivity
curl -v http://other-service:8080/health

# Capture traffic
tcpdump -i any -w /tmp/capture.pcap port 8080

# Analyze with Wireshark locally
kubectl cp -c debugger production/my-app-pod:/tmp/capture.pcap ./capture.pcap
```

## Conclusion

Debug containers in Rancher provide a powerful way to investigate issues in running applications without modifying production images. The `kubectl debug` command is the recommended approach for Kubernetes 1.25+, with beta ephemeral container support also available in Kubernetes 1.23-1.24, offering both ephemeral container injection and pod copy patterns. Combined with a well-equipped debug image and appropriate RBAC policies, debug containers enable efficient production troubleshooting while maintaining security boundaries.

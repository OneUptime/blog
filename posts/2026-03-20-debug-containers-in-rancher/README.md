# How to Set Up Debug Containers in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Debugging, Kubernetes, Kubectl debug, Ephemeral Container, Troubleshooting

Description: Use kubectl debug, ephemeral containers, and debug sidecars to troubleshoot running applications in Rancher clusters without modifying production images.

## Introduction

Production container images are often minimal (distroless, scratch-based) and lack debugging tools like `curl`, `tcpdump`, `strace`, and shell access. Kubernetes provides several mechanisms to attach debug tooling to running pods without modifying the production image.

## Method 1: kubectl debug (Copy-based Debugging)

The simplest approach creates a copy of the pod with a debug container image:

```bash
# Create a copy of the pod with a debug container

# --copy-to creates a new pod with the same spec plus your debug container
kubectl debug pod/myapp-7d4f9b6c-xkv8p \
  -n production \
  --copy-to=myapp-debug \
  --image=busybox:latest \
  -it \
  --share-processes   # Share process namespace with the original container

# Inside the debug container
# See all processes from the main container
ps aux

# Inspect filesystem of the main container
ls /proc/1/root/    # View main container filesystem via /proc
```

## Method 2: Ephemeral Containers (No Pod Copy)

Ephemeral containers attach to a running pod without creating a copy:

```bash
# Add a debug container to a running pod (non-destructive, no restart)
# --image=nicolaka/netshoot: networking debug image
# --target=myapp: share the main container's process namespace
kubectl debug -it pod/myapp-7d4f9b6c-xkv8p \
  -n production \
  --image=nicolaka/netshoot \
  --target=myapp

# nicolaka/netshoot has: curl, tcpdump, dig, netstat, traceroute, nmap, etc.
```

## Method 3: Network Debugging

```bash
# Start a debug pod in the same namespace for network testing
kubectl run netdebug \
  --image=nicolaka/netshoot \
  --namespace=production \
  --rm -it \
  --restart=Never \
  -- bash

# Inside the debug pod
# Test DNS resolution
nslookup myservice.production.svc.cluster.local

# Test TCP connectivity
nc -zv myservice.production.svc.cluster.local 8080

# Capture network traffic to a service
tcpdump -i eth0 host 10.96.100.50 -w /tmp/capture.pcap

# Test HTTP endpoints
curl -v http://myapi.production.svc.cluster.local/health
```

## Method 4: Debug Sidecar Container

For persistent debugging, add a sidecar to your deployment:

```yaml
# deployment.yaml (dev version only)
spec:
  containers:
    - name: myapp
      image: myregistry/myapp
    - name: debugger
      image: busybox
      command: ["sh", "-c", "while true; do sleep 3600; done"]   # Keep alive
      volumeMounts:
        - name: shared-data
          mountPath: /shared
  volumes:
    - name: shared-data
      emptyDir: {}
```

```bash
# Connect to the debug sidecar
kubectl exec -it myapp-pod -c debugger -n production -- sh
```

## Method 5: Remote Debugging with Node.js

```yaml
# Debug deployment with inspector port exposed
spec:
  containers:
    - name: myapp
      command: ["node", "--inspect=0.0.0.0:9229", "server.js"]
      ports:
        - containerPort: 9229
          name: debug
```

```bash
# Port-forward the debug port
kubectl port-forward pod/myapp-pod 9229:9229 -n production

# Attach VS Code debugger to localhost:9229
```

## Conclusion

Rancher's Kubernetes foundation provides multiple debug approaches for different scenarios. `kubectl debug` with copy mode is safest for production pods, ephemeral containers are ideal for quick diagnosis, and network debug pods (nicolaka/netshoot) cover connectivity issues.

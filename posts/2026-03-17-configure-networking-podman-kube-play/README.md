# How to Configure Networking for podman kube play

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kubernetes, Networking, YAML

Description: Learn how to configure networking options when deploying pods with podman kube play including port mapping and custom networks.

---

> Podman kube play supports port publishing, custom networks, and static IPs to give you full control over pod networking.

By default, `podman kube play` creates pods with their own network namespace. You can expose ports, attach pods to custom Podman networks, assign static IPs, and connect multiple pods together. This guide covers the networking options available.

---

## Port Mapping in YAML

Define port mappings in the Pod spec using `hostPort`.

```yaml
# web-pod.yaml

apiVersion: v1
kind: Pod
metadata:
  name: webserver
spec:
  containers:
    - name: nginx
      image: docker.io/library/nginx:alpine
      ports:
        - containerPort: 80
          hostPort: 8080
          protocol: TCP
```

```bash
# Deploy and access the web server on host port 8080
podman kube play web-pod.yaml
curl http://localhost:8080
```

## Using a Custom Network

```bash
# Create a custom Podman network first
podman network create app-network

# Deploy the pod on the custom network
podman kube play --network app-network web-pod.yaml

# Verify the pod is on the correct network
podman pod inspect webserver | grep -A5 network
```

## Assigning a Static IP

```bash
# Create a network with a defined subnet
podman network create --subnet 10.90.0.0/24 static-net

# Deploy with a static IP using the --ip flag
podman kube play --network static-net --ip 10.90.0.100 web-pod.yaml

# Verify the assigned IP
podman inspect webserver-nginx --format '{{.NetworkSettings.Networks}}'
```

## Connecting Multiple Pods

```yaml
# multi-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: frontend
spec:
  containers:
    - name: web
      image: docker.io/library/nginx:alpine
      ports:
        - containerPort: 80
          hostPort: 8080
---
apiVersion: v1
kind: Pod
metadata:
  name: backend
spec:
  containers:
    - name: api
      image: docker.io/library/python:3.12-slim
      command: ["python", "-m", "http.server", "5000"]
```

```bash
# Deploy both pods on the same network so they can communicate
podman kube play --network app-network multi-pod.yaml

# The frontend can reach the backend by pod name
podman exec frontend-web wget -qO- http://backend:5000
```

## Using Host Network

```bash
# Deploy with host networking - no network isolation
podman kube play --network host web-pod.yaml

# The container binds directly to host interfaces
curl http://localhost:80
```

## Publishing Ports at Deploy Time

```bash
# Override or add port mappings from the command line
podman kube play --publish 9090:80 web-pod.yaml

# Access on the CLI-specified port
curl http://localhost:9090
```

## Summary

Podman kube play provides flexible networking through YAML port definitions, custom networks via `--network`, static IPs, and host networking. Deploy multiple pods on a shared network so containers can communicate by pod name.

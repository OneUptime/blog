# How to Create a Pod with Network Sharing in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Networking, Namespace

Description: Learn how network namespace sharing works in Podman pods and how to configure it.

---

> Network sharing is the cornerstone of pod functionality, allowing all containers to communicate over localhost.

When containers in a pod share the network namespace, they share the same IP address, the same set of network interfaces, and the same port space. This means a web server and its sidecar proxy can communicate over localhost without any network hops. Network sharing is enabled by default in Podman pods.

---

## How Network Sharing Works

```bash
# Create a pod - network sharing is on by default

podman pod create --name web-pod -p 8080:80

# Run two containers in the pod
podman run -d --pod web-pod --name nginx docker.io/library/nginx:alpine
podman run -d --pod web-pod --name sidecar docker.io/library/alpine sleep 3600

# Both containers share the same IP and can reach each other on localhost
podman exec sidecar wget -qO- http://localhost:80
```

## Verifying Shared Network Interfaces

```bash
# Both containers see the same network interfaces
podman exec nginx ip addr show
podman exec sidecar ip addr show

# The IP addresses will be identical
NGINX_IP=$(podman exec nginx hostname -i)
SIDECAR_IP=$(podman exec sidecar hostname -i)
echo "nginx: $NGINX_IP, sidecar: $SIDECAR_IP"
# Both will show the same IP
```

## Port Conflicts in Shared Networks

```bash
# Since containers share the port space, two containers cannot bind the same port
podman pod create --name conflict-pod
podman run -d --pod conflict-pod --name web1 docker.io/library/nginx:alpine

# This container will exit because port 80 is already taken by web1
podman run -d --pod conflict-pod --name web2 docker.io/library/nginx:alpine
podman logs web2
# nginx reports that bind() to port 80 failed because the address is already in use

# Use different ports for each service
podman run -d --pod conflict-pod --name api docker.io/library/alpine \
  sh -c "while true; do printf 'HTTP/1.1 200 OK\r\n\r\nAPI\n' | nc -l -p 3000; done"
```

## Placing a Pod on a Specific Network

```bash
# Create a custom network
podman network create my-app-net --subnet 10.50.0.0/24

# Create a pod on that network
podman pod create --name net-pod --network my-app-net -p 8080:80

# All containers in the pod use the custom network
podman run -d --pod net-pod --name web docker.io/library/nginx:alpine
podman exec web ip addr show eth0
# Shows an IP in the 10.50.0.0/24 range
```

## Disabling Network Sharing

```bash
# Create a pod without network sharing
podman pod create --name no-net-share --share ipc,uts

# Each container gets its own network namespace
podman run -d --pod no-net-share --name c1 docker.io/library/alpine sleep 3600
podman run -d --pod no-net-share --name c2 docker.io/library/alpine sleep 3600

# Containers have different IP addresses
podman exec c1 hostname -i
podman exec c2 hostname -i
```

## Summary

Network sharing is the default and most important namespace sharing in Podman pods. All containers share one IP address and port space, enabling localhost communication. Place pods on custom networks for specific subnet requirements. If containers need separate networking, remove `net` from the `--share` flag.

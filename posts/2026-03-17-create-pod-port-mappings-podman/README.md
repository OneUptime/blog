# How to Create a Pod with Port Mappings in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Networking, Port

Description: Learn how to publish ports when creating a Podman pod so that containers inside are accessible from the host.

---

> Port mappings on a pod are defined at pod creation time and apply to all containers within the pod.

In Podman, port publishing for containers in a pod is configured at the pod level, not on individual containers. This is because all containers in a pod share the same network namespace. When you map a host port to a pod port, any container in the pod that listens on that port becomes accessible from the host.

---

## Creating a Pod with Published Ports

```bash
# Create a pod that maps host port 8080 to pod port 80

podman pod create --name web-pod -p 8080:80

# Run a web server inside the pod
podman run -d --pod web-pod --name nginx docker.io/library/nginx:alpine

# Access the web server from the host
curl http://localhost:8080
```

## Publishing Multiple Ports

```bash
# Create a pod with multiple port mappings
podman pod create --name multi-pod \
  -p 8080:80 \
  -p 8443:443 \
  -p 9090:9090

# Run containers that listen on these ports
podman run -d --pod multi-pod --name web docker.io/library/nginx:alpine
podman run -d --pod multi-pod --name metrics docker.io/library/alpine \
  sh -c "while true; do echo 'HTTP/1.1 200 OK\n\nOK' | nc -l -p 9090; done"
```

## Publishing a Port Range

```bash
# Map a range of ports
podman pod create --name range-pod -p 5000-5010:5000-5010

# Any container in the pod can listen on ports 5000 through 5010
podman run -d --pod range-pod --name app docker.io/library/alpine sleep 3600
```

## Binding to a Specific Host Interface

```bash
# Bind to localhost only so the port is not accessible externally
podman pod create --name local-pod -p 127.0.0.1:3000:3000

# Run an application server
podman run -d --pod local-pod --name api docker.io/library/node:20-alpine \
  sh -c "node -e \"require('http').createServer((req,res)=>{res.end('ok')}).listen(3000)\""

# Accessible on localhost but not from external machines
curl http://127.0.0.1:3000
```

## Publishing UDP Ports

```bash
# Specify the protocol for non-TCP ports
podman pod create --name dns-pod -p 5353:53/udp -p 5353:53/tcp

podman run -d --pod dns-pod --name dns docker.io/library/alpine sleep 3600
```

## Verifying Port Mappings

```bash
# Inspect the pod to see port mappings
podman pod inspect web-pod --format '{{.InfraConfig.PortBindings}}'

# List running containers with their pod names and published ports
podman ps --pod --format "{{.PodName}} {{.Names}} {{.Ports}}"
```

## Summary

Port mappings in Podman pods are set at creation time with the `-p` flag on `podman pod create`. All containers in the pod share these ports through the common network namespace. Bind to specific interfaces for security and use protocol suffixes for UDP ports.

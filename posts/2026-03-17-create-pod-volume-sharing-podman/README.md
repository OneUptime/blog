# How to Create a Pod with Volume Sharing in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Volumes, Storage

Description: Learn how to share volumes between containers in a Podman pod for data exchange and persistence.

---

> Sharing volumes between containers in a pod enables them to read and write the same files for configuration, logs, and data exchange.

While pods share network and IPC namespaces by default, filesystem sharing requires explicit volume mounts. By mounting the same volume into multiple containers, they can exchange data through the filesystem. This is common for sidecar patterns where one container writes logs and another ships them.

---

## Creating a Shared Volume

```bash
# Create a named volume

podman volume create shared-data

# Create a pod
podman pod create --name vol-pod -p 8080:80
```

## Mounting the Volume in Multiple Containers

```bash
# Run a web server that serves files from the shared volume
podman run -d --pod vol-pod --name web \
  -v shared-data:/usr/share/nginx/html:ro \
  docker.io/library/nginx:alpine

# Run a content generator that writes to the shared volume
podman run -d --pod vol-pod --name generator \
  -v shared-data:/output \
  docker.io/library/alpine \
  sh -c "while true; do echo '<h1>Updated at $(date)</h1>' > /output/index.html; sleep 10; done"

# The web server serves content written by the generator
curl http://localhost:8080
```

## Using Bind Mounts for Host Directory Sharing

```bash
# Create a host directory
mkdir -p /tmp/pod-shared

# Mount the host directory into multiple containers
podman pod create --name bind-pod

podman run -d --pod bind-pod --name writer \
  -v /tmp/pod-shared:/data \
  docker.io/library/alpine \
  sh -c "while true; do date >> /data/log.txt; sleep 5; done"

podman run -d --pod bind-pod --name reader \
  -v /tmp/pod-shared:/data:ro \
  docker.io/library/alpine \
  sh -c "while true; do tail -1 /data/log.txt; sleep 5; done"
```

## Sidecar Log Shipping Pattern

```bash
# Create a pod for an application with a log shipper sidecar
podman pod create --name log-pod
podman volume create app-logs

# Application container writes logs to the shared volume
podman run -d --pod log-pod --name app \
  -v app-logs:/var/log/app \
  docker.io/library/alpine \
  sh -c "while true; do echo \"$(date) INFO request processed\" >> /var/log/app/access.log; sleep 2; done"

# Log shipper sidecar reads and processes logs
podman run -d --pod log-pod --name shipper \
  -v app-logs:/var/log/app:ro \
  docker.io/library/alpine \
  sh -c "tail -f /var/log/app/access.log"

# View the shipper output
podman logs -f shipper
```

## Sharing Configuration Files

```bash
# Init container writes config, app container reads it
podman pod create --name config-pod
podman volume create app-config

podman create --pod config-pod --init-ctr always --name init \
  -v app-config:/config \
  docker.io/library/alpine \
  sh -c "printf 'port=3000\nhost=0.0.0.0\n' > /config/app.conf"

podman create --pod config-pod --name app \
  -v app-config:/config:ro \
  docker.io/library/alpine \
  sh -c "cat /config/app.conf && sleep 3600"

podman pod start config-pod
```

## Summary

Share data between containers in a Podman pod by mounting the same named volume or bind mount into multiple containers. Use read-only mounts (`:ro`) for consumers and read-write for producers. This pattern supports log shipping, content generation, and configuration sharing.

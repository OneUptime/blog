# How to Configure Resource Limits in Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Resource Limit, Cgroups

Description: Learn how to set CPU, memory, and other resource limits in Podman Quadlet container files to control container resource usage.

---

> Prevent containers from consuming excessive host resources by configuring CPU, memory, and I/O limits in your Quadlet container files.

Resource limits ensure that no single container can monopolize host resources. Quadlet exposes some Podman resource limit options as dedicated keys, and you can use the `PodmanArgs` directive for Podman flags that do not have a dedicated Quadlet key.

---

## Setting Memory Limits

```ini
# ~/.config/containers/systemd/myapp.container

[Unit]
Description=Application with memory limits

[Container]
Image=docker.io/myorg/myapp:latest
PublishPort=3000:3000

# Limit container memory to 512MB
Memory=512m
# Set memory + swap limit to 1GB
PodmanArgs=--memory-swap=1g

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Setting CPU Limits

```ini
# ~/.config/containers/systemd/worker.container
[Unit]
Description=Worker with CPU limits

[Container]
Image=docker.io/myorg/worker:latest

# Limit to 1.5 CPUs
PodmanArgs=--cpus=1.5
# Or use CPU shares for relative weighting
# PodmanArgs=--cpu-shares=512

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Combining CPU and Memory Limits

```ini
# ~/.config/containers/systemd/api-server.container
[Unit]
Description=API server with resource limits

[Container]
Image=docker.io/myorg/api:latest
PublishPort=8080:8080

# Memory limits
Memory=1g
PodmanArgs=--memory-swap=2g
PodmanArgs=--memory-reservation=256m

# CPU limits
PodmanArgs=--cpus=2.0
PodmanArgs=--cpu-shares=1024

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Setting PIDs Limit

Limit the number of processes a container can create:

```ini
[Container]
Image=docker.io/myorg/myapp:latest
# Limit to 200 processes
PidsLimit=200
```

## Setting Block I/O Limits

```ini
[Container]
Image=docker.io/myorg/myapp:latest
# Limit read bandwidth to 10MB/s
PodmanArgs=--device-read-bps=/dev/sda:10mb
# Limit write bandwidth to 5MB/s
PodmanArgs=--device-write-bps=/dev/sda:5mb
```

## Verify Resource Limits

```bash
# Reload and start
systemctl --user daemon-reload
systemctl --user start myapp.service worker.service

# Check resource limits
podman inspect systemd-myapp --format '{{.HostConfig.Memory}}'
podman inspect systemd-myapp --format '{{.HostConfig.MemorySwap}}'
podman inspect systemd-worker --format '{{.HostConfig.NanoCpus}}'

# Monitor resource usage in real time
podman stats systemd-myapp --no-stream
```

## Summary

Resource limits in Quadlet container files are configured through dedicated keys such as `Memory=` and `PidsLimit=`, or through `PodmanArgs` directives that pass standard Podman flags. Set memory limits, CPU constraints, PIDs limits, and I/O bandwidth controls to prevent containers from consuming excessive resources. Use `podman stats` to monitor usage in real time.

# How to Create a Quadlet Pod Unit File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, Pod

Description: Learn how to create a Quadlet .pod unit file to group related containers into a Podman pod managed by systemd.

---

> Quadlet pod unit files group containers that share network and IPC namespaces, just like Kubernetes pods, all managed through systemd.

A Podman pod groups containers that share the same network namespace, meaning they communicate over localhost. Quadlet `.pod` files define these pods declaratively, and containers reference the pod to join it. This is ideal for sidecar patterns, multi-container applications, and Kubernetes-style pod layouts.

---

## Basic Pod Unit File

```ini
# ~/.config/containers/systemd/webapp.pod

[Pod]
PublishPort=8080:80
PublishPort=5432:5432
```

## Containers Joining the Pod

```ini
# ~/.config/containers/systemd/webapp.pod
[Pod]
PublishPort=8080:80

# ~/.config/containers/systemd/web.container
[Container]
Image=docker.io/library/nginx:alpine
Pod=webapp.pod

[Service]
Restart=always

[Install]
WantedBy=default.target

# ~/.config/containers/systemd/app.container
[Container]
Image=docker.io/library/python:3.12-slim
Pod=webapp.pod
Exec=python -m http.server 5000

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
# Reload and start the pod containers
systemctl --user daemon-reload
systemctl --user start web
systemctl --user start app

# Both containers share the same network namespace
# app can reach web via localhost
podman exec systemd-app python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:80').status)"
```

## Pod with Shared Volumes

```ini
# ~/.config/containers/systemd/shared.volume
[Volume]

# ~/.config/containers/systemd/dataproc.pod
[Pod]
PublishPort=8080:80

# ~/.config/containers/systemd/writer.container
[Container]
Image=docker.io/library/busybox:latest
Pod=dataproc.pod
Volume=shared.volume:/data
Exec=sh -c "while true; do date >> /data/log.txt; sleep 5; done"

[Service]
Restart=always

[Install]
WantedBy=default.target

# ~/.config/containers/systemd/server.container
[Container]
Image=docker.io/library/nginx:alpine
Pod=dataproc.pod
Volume=shared.volume:/usr/share/nginx/html:ro

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Application with Sidecar Pattern

```ini
# ~/.config/containers/systemd/myapp.pod
[Pod]
PublishPort=8080:80
PublishPort=9090:9090

# Main application container
# ~/.config/containers/systemd/main-app.container
[Container]
Image=docker.io/library/nginx:alpine
Pod=myapp.pod

[Service]
Restart=always

[Install]
WantedBy=default.target

# Metrics sidecar
# ~/.config/containers/systemd/metrics-sidecar.container
[Container]
Image=docker.io/library/python:3.12-slim
Pod=myapp.pod
Exec=python -m http.server 9090

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Managing the Pod

```bash
# Start all containers in the pod
systemctl --user start web app

# Check the pod
podman pod ls
podman pod inspect systemd-webapp

# View all containers in the pod
podman ps --filter pod=systemd-webapp

# Stop the containers in the pod
systemctl --user stop web app
```

## Summary

Quadlet `.pod` files group containers that share a network namespace, enabling localhost communication between sidecars and main applications. Define the pod with ports and have containers join it with `Pod=name.pod`. Systemd manages the pod and container unit lifecycles together.

# How to Create a Quadlet Kube Unit File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, Kubernetes, YAML

Description: Learn how to create a Quadlet .kube unit file to run Kubernetes YAML manifests as systemd services using podman kube play.

---

> Quadlet kube unit files let you run Kubernetes YAML manifests as systemd services, bridging Kubernetes definitions and systemd management.

Quadlet `.kube` files point to Kubernetes YAML manifests and run them with `podman kube play` through systemd. This means you can write standard Kubernetes Pod, ConfigMap, and Secret definitions and have them managed as systemd services with automatic startup and restart.

---

## Basic Kube Unit File

```ini
# ~/.config/containers/systemd/webapp.kube

[Kube]
Yaml=webapp.yaml

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## The Kubernetes YAML

```yaml
# ~/.config/containers/systemd/webapp.yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp
spec:
  containers:
    - name: web
      image: docker.io/library/nginx:alpine
      ports:
        - containerPort: 80
          hostPort: 8080
```

```bash
# Place both files in the Quadlet directory
# ~/.config/containers/systemd/webapp.kube
# ~/.config/containers/systemd/webapp.yaml

# Reload and start
systemctl --user daemon-reload
systemctl --user start webapp

# Check the status
systemctl --user status webapp
```

## Kube with ConfigMap

```yaml
# ~/.config/containers/systemd/app-full.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: production
  LOG_LEVEL: info
---
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: app
      image: docker.io/library/python:3.12-slim
      command: ["python", "-m", "http.server", "8080"]
      envFrom:
        - configMapRef:
            name: app-config
      ports:
        - containerPort: 8080
          hostPort: 8080
```

```ini
# ~/.config/containers/systemd/app-full.kube
[Kube]
Yaml=app-full.yaml

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Kube with Network

```ini
# ~/.config/containers/systemd/backend.network
[Network]
Subnet=10.90.0.0/24

# ~/.config/containers/systemd/backend-app.kube
[Kube]
Yaml=backend-app.yaml
Network=backend.network

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Kube with Auto-Update

```ini
# ~/.config/containers/systemd/custom-app.kube
[Kube]
Yaml=custom-app.yaml
# Enable Podman auto-update for registry-backed images
AutoUpdate=registry

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Multi-Pod YAML

```yaml
# ~/.config/containers/systemd/fullstack.yaml
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

```ini
# ~/.config/containers/systemd/fullstack.kube
[Kube]
Yaml=fullstack.yaml

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Managing the Service

```bash
# Start the Kubernetes-defined pods
systemctl --user start webapp

# View logs
journalctl --user -u webapp -f

# Restart
systemctl --user restart webapp

# Stop (tears down the pods)
systemctl --user stop webapp
```

## Summary

Quadlet `.kube` files run Kubernetes YAML manifests through `podman kube play` as systemd services. Place the `.kube` and `.yaml` files in the Quadlet directory, reload systemd, and manage them with `systemctl`. This lets you use Kubernetes pod definitions with systemd lifecycle management.

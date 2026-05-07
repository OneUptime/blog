# How to Use Quadlet with Kubernetes YAML Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Kubernetes, YAML

Description: Learn how to use Kubernetes YAML files with Podman Quadlet to run Kubernetes-style workloads managed by systemd.

---

> Run Kubernetes Pod and Deployment YAML files as systemd services using Quadlet's .kube unit files, bridging the gap between Kubernetes and local container management.

Quadlet supports `.kube` files that reference Kubernetes YAML manifests, allowing you to run Kubernetes-compatible workloads through systemd. This is useful for local development, testing Kubernetes configurations, or running Kubernetes-style deployments on standalone hosts.

---

## Creating a Kubernetes YAML File

First, create a standard Kubernetes Pod manifest:

```yaml
# ~/.config/containers/systemd/webapp-pod.yaml

apiVersion: v1
kind: Pod
metadata:
  name: webapp
  labels:
    app: webapp
spec:
  containers:
    - name: nginx
      image: docker.io/library/nginx:latest
      ports:
        - containerPort: 80
          hostPort: 8080
      volumeMounts:
        - name: html
          mountPath: /usr/share/nginx/html
  volumes:
    - name: html
      hostPath:
        path: /home/user/website
        type: Directory
```

## Creating a Quadlet .kube File

Reference the YAML file in a `.kube` Quadlet file:

```ini
# ~/.config/containers/systemd/webapp.kube
[Unit]
Description=Web application from Kubernetes YAML

[Kube]
# Path to the Kubernetes YAML file
Yaml=webapp-pod.yaml

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Multi-Container Pod Example

```yaml
# ~/.config/containers/systemd/app-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: app
      image: docker.io/myorg/app:latest
      ports:
        - containerPort: 3000
          hostPort: 3000
      env:
        - name: DATABASE_HOST
          value: "localhost"
        - name: DATABASE_PORT
          value: "5432"
      envFrom:
        - configMapRef:
            name: app-config
    - name: database
      image: docker.io/library/postgres:16
      env:
        - name: POSTGRES_PASSWORD
          value: "secret"
      volumeMounts:
        - name: pgdata
          mountPath: /var/lib/postgresql/data
  volumes:
    - name: pgdata
      persistentVolumeClaim:
        claimName: pgdata
```

```ini
# ~/.config/containers/systemd/myapp.kube
[Unit]
Description=Multi-container app pod

[Kube]
Yaml=app-pod.yaml

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Using ConfigMaps

Supply configuration through ConfigMap YAML:

```yaml
# ~/.config/containers/systemd/app-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  APP_ENV: production
  LOG_LEVEL: info
```

Reference it in the .kube file:

```ini
[Kube]
Yaml=app-pod.yaml
# Load ConfigMap data
ConfigMap=app-config.yaml
```

## Reload and Start

```bash
# Reload systemd
systemctl --user daemon-reload

# Start the Kubernetes workload
systemctl --user start webapp.service

# Check status
systemctl --user status webapp.service

# View running pods
podman pod ls
podman ps --pod
```

## Summary

Quadlet `.kube` files let you run Kubernetes YAML manifests as systemd services using Podman. Create standard Pod or Deployment YAML files, reference them in `.kube` Quadlet files, and manage them with systemctl. This approach is ideal for local development and testing of Kubernetes configurations without a full cluster.

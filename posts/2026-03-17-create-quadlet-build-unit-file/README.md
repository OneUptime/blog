# How to Create a Quadlet Build Unit File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, Build, Image

Description: Learn how to create a Quadlet .build unit file to build container images from Containerfiles as part of the systemd service lifecycle.

---

> Quadlet build unit files compile container images from Containerfiles, integrating the build step into your systemd service workflow.

Quadlet `.build` files define how to build a container image from a Containerfile. When a container unit file references a build unit, the image is built automatically before the container starts. This keeps your deployment self-contained within the systemd lifecycle.

---

## Basic Build Unit File

```ini
# ~/.config/containers/systemd/myapp.build

[Build]
ImageTag=localhost/myapp:latest
File=Containerfile
SetWorkingDirectory=unit
```

Place the Containerfile in the same directory as the unit file.

## The Containerfile

```dockerfile
# ~/.config/containers/systemd/Containerfile
FROM docker.io/library/python:3.12-slim
WORKDIR /app
COPY app.py .
EXPOSE 8080
CMD ["python", "app.py"]
```

## Referencing Build in a Container Unit

```ini
# ~/.config/containers/systemd/myapp.build
[Build]
ImageTag=localhost/myapp:latest
File=Containerfile
SetWorkingDirectory=unit

# ~/.config/containers/systemd/myapp.container
[Container]
Image=myapp.build

PublishPort=8080:8080

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
# Reload systemd
systemctl --user daemon-reload

# Start - the image is built first, then the container runs
systemctl --user start myapp

# Verify the image was built
podman images | grep myapp
```

## Build with Custom Context

```ini
# ~/.config/containers/systemd/webapp.build
[Build]
ImageTag=localhost/webapp:latest
File=/home/user/projects/webapp/Containerfile
SetWorkingDirectory=/home/user/projects/webapp
```

## Build with Arguments

```ini
# ~/.config/containers/systemd/custom.build
[Build]
ImageTag=localhost/custom-app:latest
File=Containerfile
SetWorkingDirectory=unit
BuildArg=PYTHON_VERSION=3.12
BuildArg=APP_ENV=production
```

```dockerfile
# Containerfile
ARG PYTHON_VERSION=3.12
FROM docker.io/library/python:${PYTHON_VERSION}-slim
ARG APP_ENV=development
ENV APP_ENV=${APP_ENV}
WORKDIR /app
COPY . .
CMD ["python", "app.py"]
```

## Build with Labels

```ini
# ~/.config/containers/systemd/labeled-app.build
[Build]
ImageTag=localhost/labeled-app:latest
File=Containerfile
SetWorkingDirectory=unit
Label=maintainer=team@example.com
Label=version=1.0
```

## Multi-Stage Build

```dockerfile
# Containerfile - multi-stage
FROM docker.io/library/node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM docker.io/library/nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

```ini
# ~/.config/containers/systemd/frontend.build
[Build]
ImageTag=localhost/frontend:latest
File=Containerfile
SetWorkingDirectory=/home/user/projects/frontend

# ~/.config/containers/systemd/frontend.container
[Container]
Image=frontend.build
PublishPort=8080:80

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Rebuilding the Image

```bash
# Stop the container
systemctl --user stop myapp

# Remove the old image to force a rebuild
podman rmi localhost/myapp:latest

# Start again - Quadlet triggers a fresh build
systemctl --user start myapp
```

## Summary

Quadlet `.build` files define image builds from Containerfiles with support for build arguments, labels, and custom contexts. Reference the build unit in a `.container` file, and systemd handles building the image before starting the container. This keeps your entire deployment workflow within the systemd lifecycle.

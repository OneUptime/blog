# How to Create a Pod with Infra Container Settings in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Infra Container, Configuration

Description: Learn how to customize the infra container in a Podman pod for specific networking and namespace requirements.

---

> The infra container is the foundation of every pod, holding shared namespaces alive even when all other containers stop.

By default, every Podman pod has an infra container that runs a minimal pause process. This container owns the shared namespaces (network, IPC, UTS) and keeps them alive for the lifetime of the pod. You can customize the infra container's image and command, and set pod-level resource limits.

---

## Understanding the Infra Container

```bash
# Create a pod and observe the infra container

podman pod create --name my-pod

# List all containers including the infra container
podman ps -a --filter pod=my-pod --format "table {{.Names}}\t{{.Image}}\t{{.Command}}"

# By default, Podman builds a local pause image for the infra container
```

## Using a Custom Infra Image

```bash
# Specify a custom infra container image
podman pod create --name custom-infra-pod \
  --infra-image registry.k8s.io/pause:3.10

# The infra container uses the specified image
podman ps -a --filter pod=custom-infra-pod --format "{{.Names}} {{.Image}}"
```

## Setting a Custom Infra Command

```bash
# Override the infra container's command
podman pod create --name cmd-pod \
  --infra-image docker.io/library/busybox:latest \
  --infra-command /bin/top

# The infra container runs top instead of the default pause
```

## Disabling the Infra Container

```bash
# Create a pod without an infra container
podman pod create --name no-infra-pod --infra=false

# Without an infra container, namespaces are not preserved
# when containers stop and restart
podman pod ls --filter name=no-infra-pod
```

## Configuring Infra Container Networking

```bash
# Port mappings are applied to the infra container
podman pod create --name web-pod \
  -p 8080:80 \
  -p 8443:443

# The infra container owns these port bindings
INFRA_ID=$(podman pod inspect web-pod --format '{{.InfraContainerID}}')
podman inspect "$INFRA_ID" --format '{{.HostConfig.PortBindings}}'
```

## Setting Pod Resource Limits

```bash
# Set CPU and memory limits for the pod
podman pod create --name limited-pod \
  --cpus=2 \
  --memory=512m

# Inspect pod resource usage
podman pod stats --no-stream limited-pod
```

## Inspecting the Infra Container

```bash
# Get the infra container ID
podman pod inspect my-pod --format '{{.InfraContainerID}}'

# Inspect the infra container in detail
INFRA_ID=$(podman pod inspect my-pod --format '{{.InfraContainerID}}')
podman inspect "$INFRA_ID" | jq '{
  Image: .Config.Image,
  Cmd: .Config.Cmd,
  NetworkMode: .HostConfig.NetworkMode,
  Namespaces: .HostConfig.NamespaceOptions
}'
```

## Summary

The infra container is the backbone of a default Podman pod, maintaining shared namespaces for all member containers. Customize it with `--infra-image` for a different base image, `--infra-command` for a different entry process, or `--infra=false` to disable it entirely. Port mappings and namespace configuration all flow through the infra container.

# How to Inspect a Pod with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Debugging

Description: Learn how to inspect Podman pods to view their configuration, network settings, and container details.

---

> The podman pod inspect command reveals the full configuration and runtime state of a pod.

When you need to debug networking issues, verify port mappings, or understand a pod's structure, `podman pod inspect` is the tool to reach for. It returns detailed JSON data about the pod's configuration, infra container, and member containers.

---

## Basic Pod Inspection

```bash
# Create a pod with some configuration

podman pod create --name my-pod -p 8080:80

# Inspect the pod
podman pod inspect my-pod
```

This outputs a JSON document with the pod's complete configuration.

## Extracting Specific Fields

```bash
# Get the pod ID
podman pod inspect my-pod --format '{{.ID}}'

# Get the pod name
podman pod inspect my-pod --format '{{.Name}}'

# Get the number of containers
podman pod inspect my-pod --format '{{.NumContainers}}'

# Get the pod status
podman pod inspect my-pod --format '{{.State}}'
```

## Inspecting Network Configuration

```bash
# Get the pod's infra container network settings
podman pod inspect my-pod --format '{{.InfraConfig.PortBindings}}'

# Get the network name
podman pod inspect my-pod --format '{{.InfraConfig.Networks}}'
```

## Listing Containers in the Pod

```bash
# Get all container IDs in the pod
podman pod inspect my-pod --format '{{range .Containers}}{{.Id}}{{"\n"}}{{end}}'

# List container names and IDs
podman pod inspect my-pod --format '{{range .Containers}}{{.Name}} ({{.Id}}){{"\n"}}{{end}}'
```

## Inspecting the Infra Container

```bash
# Get the infra container ID
INFRA_ID=$(podman pod inspect my-pod --format '{{.InfraContainerID}}')

# Inspect the infra container directly
podman inspect "$INFRA_ID" --format '{{.NetworkSettings.IPAddress}}'
```

## Using JSON Output with jq

```bash
# Pipe the full inspection to jq for structured queries
podman pod inspect my-pod | jq '.InfraConfig'

# Get port bindings
podman pod inspect my-pod | jq '.InfraConfig.PortBindings'

# List all container names
podman pod inspect my-pod | jq '[.Containers[].Name]'
```

## Comparing Two Pods

```bash
# Inspect two pods and compare their configurations
diff <(podman pod inspect pod-a | jq '.InfraConfig') \
     <(podman pod inspect pod-b | jq '.InfraConfig')
```

## Summary

Use `podman pod inspect` to view the full configuration and state of any pod. Extract specific fields with `--format` or pipe JSON to `jq` for structured queries. This command is invaluable for debugging pod networking, verifying port mappings, and understanding pod composition.

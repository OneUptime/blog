# How to Create a Pod with Shared Namespaces in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Pod, Namespace, Linux

Description: Learn how to configure namespace sharing between containers in a Podman pod.

---

> Shared namespaces let containers in a pod see each other's processes, network interfaces, and IPC resources.

By default, Podman pods share the network, UTS, and IPC namespaces. You can control exactly which namespaces are shared using the `--share` flag. This determines how tightly coupled the containers within a pod are. When you pass `--share` without a leading `+`, it replaces the default list.

---

## Default Shared Namespaces

```bash
# Create a pod with default namespace sharing

podman pod create --name default-pod

# By default, the following namespaces are shared:
# - ipc: Inter-process communication
# - net: Network interfaces and routing
# - uts: Hostname
```

## Specifying Which Namespaces to Share

```bash
# Share only the network namespace
podman pod create --name net-only-pod --share net

# Share network and PID namespaces
podman pod create --name net-pid-pod --share net,pid

# Share all common namespaces
podman pod create --name full-share-pod --share ipc,net,uts,pid
```

## Verifying Namespace Sharing

```bash
# Create a pod with PID sharing
podman pod create --name pid-pod --share pid,net
podman run -d --pod pid-pod --name app1 docker.io/library/alpine sleep 3600
podman run -d --pod pid-pod --name app2 docker.io/library/alpine sleep 3600

# From app2, you can see app1's processes
podman exec app2 ps aux
# Both containers' processes are visible

# Without PID sharing, each container only sees its own processes
podman pod create --name no-pid-pod --share net
podman run -d --pod no-pid-pod --name app3 docker.io/library/alpine sleep 3600
podman run -d --pod no-pid-pod --name app4 docker.io/library/alpine sleep 3600
podman exec app4 ps aux
# Only app4's processes are visible
```

## Sharing the UTS Namespace

```bash
# When UTS is shared, all containers have the same hostname
podman pod create --name uts-pod --share net,uts --hostname my-pod-host

podman run -d --pod uts-pod --name svc1 docker.io/library/alpine sleep 3600
podman run -d --pod uts-pod --name svc2 docker.io/library/alpine sleep 3600

# Both containers report the same hostname
podman exec svc1 hostname  # my-pod-host
podman exec svc2 hostname  # my-pod-host
```

## Disabling All Namespace Sharing

```bash
# Create a pod with no shared namespaces
podman pod create --name isolated-pod --share ""

# Containers are grouped but fully isolated
podman run -d --pod isolated-pod --name a docker.io/library/alpine sleep 3600
podman run -d --pod isolated-pod --name b docker.io/library/alpine sleep 3600
```

## Inspecting Pod Namespace Configuration

```bash
# Check which namespaces are shared
podman pod inspect pid-pod --format '{{.SharedNamespaces}}'
# Output: [pid net]
```

## Summary

Podman pods share IPC, network, and UTS namespaces by default. Use the `--share` flag to enable PID sharing for cross-container process visibility, or restrict sharing for tighter isolation. This flexibility lets you match Kubernetes pod semantics or create custom grouping behavior.

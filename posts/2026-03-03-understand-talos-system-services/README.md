# How to Understand Talos System Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, System Services, Kubernetes, Architecture, Operations

Description: A deep dive into Talos Linux system services, their roles, dependencies, and how they work together to run your Kubernetes cluster reliably.

---

Talos Linux runs a minimal set of system services that together provide everything needed for a Kubernetes cluster. Unlike traditional Linux distributions that have hundreds of services managed by systemd, Talos has a carefully curated set of services managed by its own init system called machined. Understanding these services is essential for troubleshooting problems, optimizing performance, and knowing what is happening under the hood on your nodes.

## The Talos Service Architecture

Talos Linux does not use systemd. Instead, it has its own lightweight init system that manages services in a specific order with well-defined dependencies. This is one of the things that makes Talos different from every other Linux distribution.

The init process in Talos is called `machined`. It is responsible for:

- Managing the lifecycle of all system services
- Handling the Talos API
- Processing machine configuration
- Coordinating upgrades and reboots

```bash
# List all services running on a node
talosctl services -n <node-ip>

# You will see something like:
# SERVICE     STATE     HEALTH
# apid        Running   OK
# containerd  Running   OK
# cri         Running   OK
# etcd        Running   OK
# kubelet     Running   OK
# machined    Running   OK
# trustd      Running   OK
# udevd       Running   OK
```

## Core System Services

### machined

This is the primary service in Talos. It runs as PID 1 and manages everything else. It provides the Talos API, handles machine configuration, and orchestrates the boot process.

```bash
# Check machined status
talosctl service machined -n <node-ip>

# machined is always running - if it stops, the node is dead
```

The Talos API that `talosctl` connects to is served by machined. When you run any `talosctl` command, you are talking to machined.

### apid

The API daemon provides the gRPC API that `talosctl` communicates with. It handles authentication, authorization, and routing of API requests.

```bash
# Check apid status
talosctl service apid -n <node-ip>

# View apid logs
talosctl logs apid -n <node-ip>
```

Apid listens on port 50000 by default. All `talosctl` commands go through this service.

### containerd

Containerd is the container runtime. It manages container images, creates and runs containers, and handles container lifecycle. In Talos, containerd runs both system containers (Kubernetes components) and user workload containers.

```bash
# Check containerd status
talosctl service containerd -n <node-ip>

# View containerd logs
talosctl logs containerd -n <node-ip>
```

Talos uses two separate containerd instances:
- One for system services (Kubernetes components)
- One for pod workloads (CRI)

This separation prevents workload issues from affecting the system.

### CRI (Container Runtime Interface)

The CRI service is the containerd instance that serves as the container runtime for Kubernetes pods. The kubelet communicates with this service to run pods.

```bash
# Check CRI service
talosctl service cri -n <node-ip>

# View CRI logs
talosctl logs cri -n <node-ip>
```

### etcd

The etcd service runs on control plane nodes only. It is the distributed key-value store that Kubernetes uses to store all cluster state.

```bash
# Check etcd status (control plane only)
talosctl service etcd -n <control-plane-ip>

# View etcd logs
talosctl logs etcd -n <control-plane-ip>

# Check etcd cluster health
talosctl etcd status -n <control-plane-ip>

# List etcd members
talosctl etcd members -n <control-plane-ip>
```

etcd is arguably the most critical service in the cluster. If etcd goes down, the Kubernetes control plane cannot function.

### kubelet

The kubelet is the Kubernetes node agent. It runs on every node and is responsible for starting pods, reporting node status, and managing the node's containers.

```bash
# Check kubelet status
talosctl service kubelet -n <node-ip>

# View kubelet logs
talosctl logs kubelet -n <node-ip>

# Check kubelet configuration
talosctl get kubeletconfig -n <node-ip> -o yaml
```

### trustd

Trustd manages the trust relationships between nodes in the cluster. It handles the distribution of certificates and secrets between nodes.

```bash
# Check trustd status
talosctl service trustd -n <node-ip>

# View trustd logs
talosctl logs trustd -n <node-ip>
```

### udevd

The device manager handles hardware device discovery and management. It processes udev events and makes devices available to the system.

```bash
# Check udevd status
talosctl service udevd -n <node-ip>
```

## Service Dependencies

Services in Talos start in a specific order based on their dependencies:

```text
machined (PID 1)
  -> udevd (hardware detection)
  -> containerd (container runtime)
  -> apid (Talos API)
  -> trustd (certificate distribution)
  -> etcd (control plane only)
  -> kubelet (Kubernetes node agent)
    -> CRI (container runtime for pods)
```

If a service fails to start, all services that depend on it will also fail.

```bash
# Check the dependency chain for a specific service
talosctl service kubelet -n <node-ip>
# The output shows the service state and any dependencies
```

## Service States

Each service can be in one of several states:

- **Waiting** - The service is waiting for its dependencies to be ready
- **Preparing** - The service is initializing
- **Pre** - The service is running pre-start tasks
- **Running** - The service is active and healthy
- **Stopping** - The service is shutting down
- **Finished** - The service completed (for one-shot services)
- **Failed** - The service encountered an error

```bash
# Get detailed service status including state history
talosctl service <service-name> -n <node-ip>
```

## Service Health Checks

Talos runs health checks on its services. You can see the health status:

```bash
# Quick health overview of all services
talosctl services -n <node-ip>

# Detailed health check
talosctl health -n <node-ip>

# The health check verifies:
# - All services are running
# - etcd is healthy (on control plane)
# - Kubelet is ready
# - API server is responsive
```

## Control Plane vs Worker Node Services

Not all services run on every node:

**Control plane nodes run:**
- machined
- apid
- containerd
- CRI
- etcd
- kubelet
- trustd
- udevd

**Worker nodes run:**
- machined
- apid
- containerd
- CRI
- kubelet
- trustd
- udevd

The key difference is that worker nodes do not run etcd.

```bash
# Compare services on control plane vs worker
echo "Control plane services:"
talosctl services -n <control-plane-ip>

echo "Worker services:"
talosctl services -n <worker-ip>
```

## Kubernetes Components as Static Pods

In addition to the Talos system services, the Kubernetes control plane components run as static pods managed by the kubelet:

- kube-apiserver
- kube-controller-manager
- kube-scheduler
- kube-proxy (as DaemonSet)

These are not Talos services but are managed by the kubelet:

```bash
# View static pod manifests
talosctl list /etc/kubernetes/manifests -n <control-plane-ip>

# View kube-apiserver logs
talosctl logs kube-apiserver -n <control-plane-ip>

# View kube-controller-manager logs
talosctl logs kube-controller-manager -n <control-plane-ip>

# View kube-scheduler logs
talosctl logs kube-scheduler -n <control-plane-ip>
```

## Extensions and Additional Services

Talos supports system extensions that add additional services. Common extensions include:

- **iscsi-tools** - iSCSI support for storage
- **qemu-guest-agent** - VM guest agent for QEMU/KVM
- **nvidia-container-toolkit** - NVIDIA GPU support
- **tailscale** - Tailscale VPN

```bash
# List installed extensions
talosctl get extensions -n <node-ip>
```

Extensions are installed as part of the Talos image. You cannot install extensions at runtime because the filesystem is immutable.

## The Boot Process

Understanding the boot process helps you troubleshoot startup issues:

1. BIOS/UEFI loads the bootloader
2. Bootloader loads the Talos kernel and initramfs
3. machined starts as PID 1
4. machined reads the machine configuration
5. System services start in dependency order
6. Hardware is detected (udevd)
7. Networking is configured
8. containerd starts
9. apid starts (Talos API becomes available)
10. etcd starts (on control plane nodes)
11. kubelet starts
12. Kubernetes components start as static pods

```bash
# View the kernel messages to see boot progress
talosctl dmesg -n <node-ip>

# Check boot time
talosctl dmesg -n <node-ip> | tail -20
```

## Conclusion

Talos Linux's service architecture is deliberately minimal. Each service has a specific purpose, and together they provide exactly what is needed to run a Kubernetes cluster, nothing more. Understanding these services, their roles, and their dependencies is fundamental to operating and troubleshooting Talos Linux clusters. When something goes wrong, knowing which service to investigate first saves you significant time. Start from the bottom of the dependency chain and work your way up when diagnosing issues.

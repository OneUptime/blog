# How to Understand machined and Talos Components

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Machined, System Architecture, Kubernetes, Init System

Description: A detailed look at machined and the core system components that make Talos Linux work as a Kubernetes-focused operating system.

---

Every operating system needs an init system - the first process that starts when the machine boots and the parent of all other processes. On traditional Linux, this is usually systemd or, on older systems, SysVinit. On Talos Linux, it is machined. Understanding machined and the other Talos components helps you grasp how the system works at a fundamental level and makes troubleshooting much easier.

## machined: PID 1

machined is the init process on Talos Linux. It runs as PID 1, which means it is the first userspace process started by the kernel and the last one to stop during shutdown. Every other process on the system is either a child of machined or managed by it.

But machined is not just an init system. It is also the configuration manager, the API server host, and the controller runtime. It is the brain of the Talos node.

When a Talos node boots, machined follows a well-defined sequence:

1. Mount essential filesystems (proc, sys, dev, tmpfs)
2. Read and validate the machine configuration
3. Set up networking
4. Initialize the disk (on first boot)
5. Start system services in dependency order
6. Enter the controller reconciliation loop

```bash
# Check machined status

talosctl -n 10.0.0.11 service machined

# View machined logs
talosctl -n 10.0.0.11 logs machined

# Check PID 1
talosctl -n 10.0.0.11 processes | head -5
```

## The Boot Sequence in Detail

Let us trace what happens from power-on to a fully running Kubernetes node.

The BIOS or UEFI firmware loads the bootloader. On current Talos releases, GRUB is used for legacy BIOS systems and systemd-boot with Unified Kernel Images is used for new UEFI installations. The bootloader loads the Talos kernel and initramfs, the kernel initializes hardware, and machined becomes PID 1.

machined's first job is to bring up the root filesystem. Talos uses a read-only SquashFS root filesystem with tmpfs mounts for runtime-specific paths and a persistent EPHEMERAL volume mounted at /var.

Next, machined reads the machine configuration. The configuration can come from several sources:

- The STATE partition on the disk (most common for installed systems)
- Platform metadata, including cloud provider metadata or a URL specified with the `talos.config` kernel argument on bare metal
- Configuration documents provided directly with kernel arguments such as `talos.config.early` or `talos.config.inline`
- An embedded configuration in the bootable image

```bash
# View the current machine configuration resource
talosctl -n 10.0.0.11 get machineconfig v1alpha1 -o yaml

# View the kernel command line (may contain config URL)
talosctl -n 10.0.0.11 read /proc/cmdline
```

## Core System Components

### apid - The API Daemon

apid is the front door to the Talos node. It listens on port 50000 and handles all gRPC API requests. When you run a talosctl command, you are talking to apid.

apid handles authentication using mutual TLS. Every client must present a valid certificate signed by the cluster's Certificate Authority. Different certificates can have different roles, allowing you to create read-only or restricted access clients.

apid also handles request routing. In a cluster, you can send a request to any control plane node, and if it needs to reach a different node, apid will proxy the request.

```bash
# Check apid status
talosctl -n 10.0.0.11 service apid

# View apid logs (useful for debugging auth issues)
talosctl -n 10.0.0.11 logs apid
```

### trustd - The Trust Daemon

trustd helps establish trust within the Talos cluster. It is involved in sensitive trust and PKI distribution operations used by the control plane.

When nodes boot and apply their configuration, Talos and Kubernetes both rely on certificates. The kubelet gets its Kubernetes client certificate through the normal Kubernetes bootstrap flow via the control plane endpoint, while `trustd` provides Talos' root-of-trust services for operations that require trusted communication between nodes.

```bash
# Check trustd status (only on control plane nodes)
talosctl -n 10.0.0.11 service trustd

# View trustd logs
talosctl -n 10.0.0.11 logs trustd
```

### containerd - The Container Runtime

Talos uses containerd as its container runtime. All containers on a Talos node, including Kubernetes pods and Talos system containers, run through containerd.

Talos configures containerd with two namespaces. The "system" namespace is for Talos internal containers (like etcd). The "k8s.io" namespace is for Kubernetes pods managed by the kubelet.

```bash
# Check containerd status
talosctl -n 10.0.0.11 service containerd

# View containerd logs
talosctl -n 10.0.0.11 logs containerd

# List containers running on the node
talosctl -n 10.0.0.11 containers

# List containers in the Kubernetes namespace
talosctl -n 10.0.0.11 containers -k
```

### etcd - Distributed Key-Value Store

etcd runs only on control plane nodes. It stores all Kubernetes cluster state, including pod definitions, service configurations, secrets, and config maps.

Talos manages etcd as a system service rather than as a static pod (which is the approach used by kubeadm). This gives machined direct control over etcd lifecycle, which is important for operations like upgrades and disaster recovery.

```bash
# Check etcd status
talosctl -n 10.0.0.11 service etcd

# List etcd cluster members
talosctl -n 10.0.0.11 etcd members

# Take an etcd snapshot for backup
talosctl -n 10.0.0.11 etcd snapshot db.snapshot

# Check etcd health
talosctl -n 10.0.0.11 etcd status
```

### kubelet - The Kubernetes Agent

kubelet runs on every node in the cluster. It is the Kubernetes agent that communicates with the API server, manages pods, and reports node status.

Talos configures kubelet through the machine configuration. You can pass extra arguments, mount extra volumes, and configure kubelet features through the config.

```bash
# Check kubelet status
talosctl -n 10.0.0.11 service kubelet

# View kubelet logs
talosctl -n 10.0.0.11 logs kubelet

# View kubelet configuration
talosctl -n 10.0.0.11 get machineconfig v1alpha1 -o yaml
```

```yaml
# Kubelet configuration in machine config
machine:
  kubelet:
    image: ghcr.io/siderolabs/kubelet:v1.35.0
    extraArgs:
      rotate-server-certificates: "true"
    extraMounts:
      - destination: /var/local-storage
        type: bind
        source: /var/local-storage
        options:
          - bind
          - rshared
          - rw
```

## The Controller Runtime

One of the most important components inside machined is the controller runtime. This is a reconciliation engine that continuously ensures the node's actual state matches the desired state defined in the configuration.

The controller runtime works with resources, similar to how Kubernetes controllers reconcile resources. Each controller watches specific resource types and takes action when they change.

For example, the network controller watches for changes to network configuration resources and updates the actual network interfaces to match. The time controller watches time server configuration and ensures NTP is synchronized.

```bash
# View Talos resources (the state the controller runtime manages)
talosctl -n 10.0.0.11 get members
talosctl -n 10.0.0.11 get addresses
talosctl -n 10.0.0.11 get routes
talosctl -n 10.0.0.11 get links
talosctl -n 10.0.0.11 get nodename
talosctl -n 10.0.0.11 get hostname
```

The controller runtime is what makes Talos self-healing at the OS level. If a network configuration drifts (because of a DHCP lease change, for example), the controller detects the drift and corrects it.

## Service Dependencies and Ordering

Talos starts services in a specific order based on their dependencies. Here is the typical startup sequence:

1. machined starts and mounts filesystems
2. networkd configures host networking
3. containerd starts for system and Kubernetes containers
4. apid starts and begins accepting Talos API connections
5. trustd starts on control plane nodes
6. etcd starts on control plane nodes
7. kubelet starts; after etcd is bootstrapped, Talos renders the Kubernetes control plane static pods and kubelet starts them

If a service fails to start, machined will retry it with exponential backoff. You can see the service state and any errors through the Talos API.

```bash
# View all services and their states
talosctl -n 10.0.0.11 services

# Restart a specific service
talosctl -n 10.0.0.11 service etcd restart
```

## Debugging Component Issues

When something goes wrong, understanding these components helps you narrow down the problem quickly.

If kubelet is not starting, check its logs and the containerd logs. Kubelet depends on containerd.

If nodes cannot join the cluster, check kubelet logs, the Kubernetes control plane, and apid connectivity on both sides. Certificate bootstrap or API connectivity issues are common causes.

If etcd is unhealthy, check etcd member status and logs. etcd problems cascade into Kubernetes API server issues.

```bash
# Comprehensive debugging workflow
talosctl -n 10.0.0.11 services                # Overview of all services
talosctl -n 10.0.0.11 logs machined --tail 50  # Recent machined activity
talosctl -n 10.0.0.11 dmesg | tail -50         # Kernel messages
talosctl -n 10.0.0.11 health                   # Cluster health check
```

## Conclusion

machined and the Talos system components form a tightly integrated system designed for one purpose: running Kubernetes reliably. machined as PID 1 provides a clean boot sequence, configuration management, and a controller runtime that keeps the node in its desired state. Each component - apid, trustd, containerd, etcd, and kubelet - has a clear responsibility and well-defined interactions with the others. Understanding this component model is the key to operating and troubleshooting Talos Linux clusters effectively.

# How to Compare Talos Linux vs CoreOS/Flatcar

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CoreOS, Flatcar Linux, Kubernetes, Operating System Comparison

Description: An honest comparison of Talos Linux and Flatcar Container Linux for running Kubernetes clusters in production.

---

CoreOS was a pioneer in the container-optimized operating system space. When Red Hat acquired CoreOS and eventually ended its development, Flatcar Container Linux picked up where it left off as a community-maintained fork. Today, Flatcar and Talos Linux represent two distinct philosophies for running container workloads. Both are designed for containers, but they take very different approaches.

This comparison helps you understand the trade-offs between the two so you can make an informed decision for your infrastructure.

## History and Lineage

CoreOS was launched in 2013 as one of the first Linux distributions designed specifically for running containers. It introduced concepts like automatic updates, a read-only root filesystem, and cluster-level management. Red Hat acquired CoreOS in 2018 and eventually rolled its technology into Red Hat CoreOS (RHCOS) for OpenShift. The original CoreOS Container Linux reached end of life in 2020.

Flatcar Container Linux is a direct fork of CoreOS Container Linux, maintained by Kinvolk (later acquired by Microsoft). It preserves the CoreOS approach while continuing active development.

Talos Linux was started by Sidero Labs (originally Talos Systems) in 2019 with a clean-sheet design. Rather than forking an existing distribution, Talos was built from scratch specifically for Kubernetes.

## Access Model

This is where the two systems diverge most sharply.

**Flatcar** provides SSH access. You can log in to a node, run commands, and use standard Linux tools. The system comes with a limited set of tools by default, but you can install more through its toolbox container.

```bash
# Flatcar: SSH access is available
ssh core@flatcar-node
systemctl status docker
journalctl -u kubelet
```

**Talos** has no SSH access. There is no shell, no login capability, and no way to run arbitrary commands on the host. Everything goes through the Talos gRPC API.

```bash
# Talos: API-only access
talosctl -n 10.0.0.11 version
talosctl -n 10.0.0.11 logs kubelet
talosctl -n 10.0.0.11 services
```

The Flatcar approach is more familiar and flexible. The Talos approach is more secure but requires learning new tools and workflows.

## Configuration

**Flatcar** uses Ignition (or Container Linux Config/Butane) for initial provisioning and cloud-init for cloud environments. You write a JSON or YAML document that describes users, files, systemd units, and other system configuration. Ignition runs once during first boot.

```yaml
# Flatcar Butane configuration
variant: flatcar
version: 1.0.0
passwd:
  users:
    - name: core
      ssh_authorized_keys:
        - ssh-rsa AAAA...
systemd:
  units:
    - name: kubelet.service
      enabled: true
      contents: |
        [Unit]
        Description=Kubelet
        [Service]
        ExecStart=/opt/bin/kubelet
        [Install]
        WantedBy=multi-user.target
storage:
  files:
    - path: /etc/hostname
      contents:
        inline: worker-01
```

**Talos** uses its own machine configuration format. The configuration is applied at boot time and can be updated at runtime through the API. Unlike Ignition, the Talos configuration is continuously reconciled.

```yaml
# Talos machine configuration
version: v1alpha1
machine:
  type: worker
  network:
    hostname: worker-01
  kubelet:
    extraArgs:
      rotate-server-certificates: "true"
cluster:
  controlPlane:
    endpoint: https://10.0.0.10:6443
```

The key difference is that Flatcar's Ignition runs once. If you need to change something later, you use SSH or other tools. Talos's configuration is continuously applied, meaning changes through the API are automatically reconciled.

## Filesystem Immutability

**Flatcar** has a dual-partition A/B update scheme. The root filesystem is ext4 (or btrfs) mounted read-only during normal operation. However, the filesystem format itself supports writes, so it can be remounted as read-write if needed.

**Talos** uses SquashFS for the root filesystem. SquashFS is read-only at the format level and cannot be remounted as read-write. This provides a stronger immutability guarantee.

Both systems have writable areas for runtime data (logs, container images, etc.).

## Container Runtime

**Flatcar** traditionally used Docker but has been transitioning to containerd. Both runtimes are available.

**Talos** uses containerd exclusively. There is no Docker daemon on Talos nodes.

If you have workflows that depend on Docker (like using docker build on nodes), Flatcar is more accommodating. If you are purely running Kubernetes, containerd is sufficient for both.

## Update Mechanism

**Flatcar** uses Nebraska (an update server similar to the original CoreOS update system) with A/B partition swapping. Updates download a new OS image to the inactive partition and reboot into it. If the update fails, the system rolls back to the previous partition.

```bash
# Flatcar update commands
sudo update_engine_client -check_for_update
sudo update_engine_client -status
```

**Talos** also uses an image-based update model. The new OS image is written to a standby partition and the node reboots. Rollback is automatic if the new image fails to boot.

```bash
# Talos upgrade
talosctl -n 10.0.0.11 upgrade --image ghcr.io/siderolabs/installer:v1.7.0
```

Both approaches provide atomic updates with rollback. The mechanisms are similar in practice.

## Kubernetes Integration

**Flatcar** does not ship with Kubernetes. You need to install and manage Kubernetes yourself using tools like kubeadm, Kubespray, or a managed Kubernetes service. Flatcar is a general-purpose container OS that works with Kubernetes but is not exclusively designed for it.

**Talos** ships with Kubernetes components (kubelet, etcd) as part of the OS. The machine configuration includes all Kubernetes settings, and Talos manages the Kubernetes lifecycle (bootstrapping, upgrades, certificate rotation).

```bash
# Flatcar: Install Kubernetes separately
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# Talos: Kubernetes is built in
talosctl gen config my-cluster https://10.0.0.10:6443
talosctl -n 10.0.0.11 apply-config --insecure --file controlplane.yaml
talosctl -n 10.0.0.11 bootstrap
```

## Security Comparison

Both systems prioritize security, but they achieve it differently.

**Flatcar** security:
- Read-only root filesystem (can be remounted rw)
- Automatic security updates
- SELinux support
- SSH access with key-based authentication
- Standard Linux security tools available

**Talos** security:
- Read-only root filesystem (SquashFS, cannot be remounted)
- No SSH, no shell
- Mutual TLS for all API access
- No package manager or development tools
- Disk encryption support
- Secure Boot support
- Minimal attack surface

Talos has a smaller attack surface because there is simply less on the system that could be exploited. Flatcar has more tools available for security auditing and monitoring.

## Community and Ecosystem

**Flatcar** has a mature ecosystem inherited from CoreOS. It works with all the tooling that CoreOS supported. Microsoft (through the Kinvolk acquisition) provides commercial support and contributes to development.

**Talos** has a growing but smaller community. Sidero Labs provides commercial support through Omni, their cluster management platform. The project is active on GitHub with regular releases.

Both are open source. Flatcar is under the Apache 2.0 license. Talos is under the Mozilla Public License 2.0.

## When to Choose Flatcar

Choose Flatcar when your team needs SSH access for debugging and troubleshooting, when you are running non-Kubernetes container workloads, when you need Docker compatibility, when you want a familiar Linux environment with container optimizations, or when you are migrating from CoreOS and want minimal disruption.

## When to Choose Talos

Choose Talos when security is your top priority, when you want tight integration between the OS and Kubernetes, when you prefer API-driven management over SSH, when you want the strongest possible filesystem immutability, or when you are building a new Kubernetes platform from scratch.

## Performance and Resource Usage

Both systems are lightweight compared to general-purpose distributions. Flatcar has a larger footprint because it includes more userspace tools. Talos is extremely minimal with a root filesystem under 120 MB.

For boot times, Talos typically boots faster due to its smaller image size and simpler init process. Flatcar's boot time is comparable to other lightweight distributions.

Runtime resource usage is similar for both when running Kubernetes workloads, as the majority of CPU and memory goes to Kubernetes components and application pods.

## Conclusion

Flatcar and Talos represent two valid approaches to container-optimized operating systems. Flatcar preserves the flexibility of traditional Linux while adding container-specific optimizations. Talos strips away everything except what Kubernetes needs and replaces traditional management with an API. If you value familiarity and flexibility, Flatcar is the better choice. If you value security and simplicity, Talos is worth the learning curve. Both are solid options for production Kubernetes clusters.

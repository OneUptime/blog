# How to Understand Talos Linux Declarative Configuration Model

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Declarative Configuration, Infrastructure as Code, Kubernetes, DevOps

Description: Explore how the declarative configuration model in Talos Linux works and how it enables consistent, reproducible infrastructure.

---

Talos Linux takes a strongly declarative approach to system configuration. Instead of running a sequence of commands to set up a node (install this package, create that user, edit this file), you describe the desired state in a single YAML document. Talos then makes the system match that description.

This is the same principle that drives Kubernetes itself, where you declare what you want and controllers reconcile the actual state to match. Talos applies this concept at the operating system level.

## What Is Declarative Configuration?

In imperative configuration, you tell the system what to do step by step:

```bash
# Imperative approach (traditional Linux)
hostnamectl set-hostname worker-01
ip addr add 10.0.0.11/24 dev eth0
ip route add default via 10.0.0.1
echo "nameserver 8.8.8.8" > /etc/resolv.conf
systemctl enable kubelet
systemctl start kubelet
```

In declarative configuration, you describe what the system should look like:

```yaml
# Declarative approach (Talos Linux)
machine:
  network:
    hostname: worker-01
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.0.11/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
    nameservers:
      - 8.8.8.8
```

The difference might seem subtle, but it has profound implications. With the imperative approach, the result depends on the current state of the system and the order of operations. With the declarative approach, the result is always the same regardless of the starting state.

## The Machine Configuration Document

The machine configuration is the single source of truth for a Talos node. It covers everything:

**Machine section** - node type, network, storage, kernel parameters, kubelet settings, system extensions, and disk encryption.

**Cluster section** - cluster name, control plane endpoint, certificates, networking, and etcd configuration.

```yaml
# Complete machine configuration structure
version: v1alpha1
debug: false
persist: true
machine:
  type: controlplane  # controlplane or worker
  token: <machine-token>
  ca:
    crt: <base64-certificate>
    key: <base64-key>
  certSANs: []
  kubelet:
    image: ghcr.io/siderolabs/kubelet:v1.29.0
    extraArgs:
      rotate-server-certificates: "true"
    extraMounts: []
  network:
    hostname: cp-01
    interfaces:
      - interface: eth0
        dhcp: true
    nameservers:
      - 8.8.8.8
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
    extensions: []
  sysctls:
    net.core.somaxconn: "65535"
    vm.overcommit_memory: "1"
  time:
    servers:
      - time.cloudflare.com
cluster:
  clusterName: my-cluster
  controlPlane:
    endpoint: https://10.0.0.10:6443
  network:
    cni:
      name: flannel
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
  token: <cluster-token>
  ca:
    crt: <base64-certificate>
    key: <base64-key>
```

## Generating Configuration

Talos provides tools to generate configuration documents. The `talosctl gen config` command creates a set of configuration files for your cluster.

```bash
# Generate configuration for a new cluster
talosctl gen config my-cluster https://10.0.0.10:6443

# This creates:
# controlplane.yaml - Configuration for control plane nodes
# worker.yaml       - Configuration for worker nodes
# talosconfig       - Client configuration for talosctl

# Generate with specific options
talosctl gen config my-cluster https://10.0.0.10:6443 \
  --install-disk /dev/sda \
  --install-image ghcr.io/siderolabs/installer:v1.6.0 \
  --kubernetes-version 1.29.0 \
  --with-secrets secrets.yaml
```

You can also generate configurations from an existing secrets bundle, which is useful for recreating or expanding clusters.

```bash
# Save the cluster secrets
talosctl gen secrets -o secrets.yaml

# Generate configs from saved secrets
talosctl gen config my-cluster https://10.0.0.10:6443 \
  --with-secrets secrets.yaml
```

## Applying Configuration

Configuration can be applied in several ways, depending on the stage of the node's lifecycle.

### During Initial Boot

When a node boots for the first time, it needs its configuration. This can come from:

- A kernel command line parameter pointing to a URL
- Cloud provider metadata service
- A configuration server discovered via DHCP
- Manual application via talosctl

```bash
# Apply config to a new node that has booted in maintenance mode
talosctl -n 10.0.0.11 apply-config --insecure --file worker.yaml
```

### Updating Running Nodes

Once a node is running, you can update its configuration through the Talos API.

```bash
# Apply a complete new configuration
talosctl -n 10.0.0.11 apply-config --file updated-worker.yaml

# Apply a patch to the existing configuration
talosctl -n 10.0.0.11 patch machineconfig --patch '[
  {
    "op": "replace",
    "path": "/machine/network/hostname",
    "value": "new-hostname"
  }
]'

# Apply a patch from a file
talosctl -n 10.0.0.11 patch machineconfig --patch @patch.yaml
```

## Configuration Validation

Talos validates configuration before applying it. If the configuration is invalid, it is rejected, and the current configuration continues to be used.

```bash
# Validate a configuration file locally
talosctl validate --config worker.yaml --mode metal

# Validate for different deployment modes
talosctl validate --config worker.yaml --mode cloud
talosctl validate --config worker.yaml --mode container
```

Validation checks include YAML syntax, required fields, certificate validity, network configuration consistency, and Kubernetes parameter validation.

## Configuration Changes and Their Effects

Not all configuration changes are equal. Some take effect immediately, while others require a reboot. Talos tells you what is needed after each configuration change.

**Immediate changes** (no reboot needed):
- Network interface configuration
- DNS servers
- NTP servers
- Hostname
- Kubelet extra arguments (in some cases)

**Reboot required**:
- Disk configuration
- Kernel parameters
- System extensions
- Install image changes
- Machine type changes

```bash
# After applying config, check if reboot is needed
talosctl -n 10.0.0.11 get machineconfig -o yaml

# If reboot is required
talosctl -n 10.0.0.11 reboot
```

## Configuration Diff and Dry Run

Before applying changes, you can compare the new configuration with the current one.

```bash
# View the current machine configuration
talosctl -n 10.0.0.11 get machineconfig -o yaml > current-config.yaml

# Diff against the new configuration
diff current-config.yaml new-config.yaml

# Apply in dry-run mode (validate without applying)
talosctl -n 10.0.0.11 apply-config --file new-config.yaml --dry-run
```

## Configuration Templating and Customization

For larger clusters, you often need slightly different configurations for each node (different hostnames, IP addresses, disk devices). You can use configuration patches to customize a base configuration for each node.

```yaml
# Base configuration: worker.yaml
# Patches per node:

# worker-01-patch.yaml
machine:
  network:
    hostname: worker-01
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.0.21/24

# worker-02-patch.yaml
machine:
  network:
    hostname: worker-02
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.0.22/24
```

```bash
# Generate config with patches
talosctl gen config my-cluster https://10.0.0.10:6443 \
  --config-patch-worker @worker-01-patch.yaml \
  --output worker-01.yaml
```

## The Reconciliation Loop

After configuration is applied, the Talos controller runtime continuously reconciles the system state to match the configuration. This is not a one-time operation. The controllers keep watching for drift and correcting it.

If DHCP changes an IP address that conflicts with a static assignment, the controller corrects it. If a network interface goes down, the controller brings it back up according to the configuration. If kubelet crashes, machined restarts it.

```bash
# Watch resources to see reconciliation in action
talosctl -n 10.0.0.11 get addresses --watch
talosctl -n 10.0.0.11 get routes --watch
talosctl -n 10.0.0.11 get links --watch
```

This continuous reconciliation means the system is self-healing at the OS level. Configuration drift is not just detected - it is automatically corrected.

## Version Control and GitOps

Since the entire configuration is a YAML file, it fits naturally into version control. You can store your machine configurations in Git, track changes over time, require code reviews for configuration changes, and automate deployments through CI/CD.

```bash
# Example GitOps workflow for Talos configuration
git add clusters/production/worker-01.yaml
git commit -m "Update worker-01 network configuration"
git push

# CI/CD pipeline applies the change
talosctl -n 10.0.0.21 apply-config --file clusters/production/worker-01.yaml
```

This approach gives you audit trails, rollback capability, and collaborative management of your infrastructure configuration.

## Conclusion

The declarative configuration model in Talos Linux eliminates the complexity and inconsistency of imperative system management. By expressing the entire node configuration in a single YAML document, Talos makes infrastructure reproducible, version-controllable, and self-healing. The configuration is validated before application, changes are reconciled continuously, and the system always converges toward the desired state. This model works well for small clusters managed by hand and scales to large deployments managed through GitOps pipelines. Understanding how to work with the machine configuration is the most important skill for operating Talos Linux.

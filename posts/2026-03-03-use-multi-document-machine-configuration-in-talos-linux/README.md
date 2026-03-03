# How to Use Multi-Document Machine Configuration in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Machine Configuration, Kubernetes, Infrastructure, DevOps

Description: Learn how to use multi-document machine configuration in Talos Linux to build modular and reusable cluster configurations.

---

One of the challenges with managing Talos Linux clusters is keeping machine configurations clean and organized. When you have a single monolithic YAML file that covers everything from network settings to Kubernetes API server flags, things get unwieldy fast. Multi-document machine configuration solves this problem by letting you split your configuration into separate YAML documents that Talos merges together at apply time.

This post covers what multi-document configs are, why they matter, and how to use them effectively in your Talos Linux deployments.

## The Problem with Monolithic Configs

A typical Talos machine configuration file can easily reach hundreds of lines. It covers machine-level settings (disks, network interfaces, time servers), cluster-level settings (API server flags, etcd configuration, CNI), and everything in between. When you manage multiple node types - control plane nodes, GPU workers, storage workers - you end up duplicating large sections of configuration across files.

This duplication creates maintenance headaches. Change the NTP server? You need to update every config file. Add a new certificate? Same thing. Multi-document configs let you factor out the common pieces and compose them together.

## How Multi-Document Configuration Works

Talos supports YAML multi-document syntax, where you separate documents with the standard `---` delimiter. Each document is a complete or partial configuration that gets merged in order. Later documents override earlier ones when there are conflicts.

Here is a simple example with two documents:

```yaml
# Base machine configuration
version: v1alpha1
machine:
  type: controlplane
  network:
    hostname: cp-node-1
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
cluster:
  clusterName: my-cluster
  controlPlane:
    endpoint: https://192.168.1.100:6443
---
# Override document - adds extra settings
version: v1alpha1
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
  time:
    servers:
      - time.cloudflare.com
```

When Talos processes this, it merges both documents. The result is a single configuration that has the hostname, install disk, cluster settings from the first document, plus the nameservers and time servers from the second document.

## Using Config Patches as Separate Documents

The practical way to use multi-document configs is through config patches. You create a base configuration and then layer patches on top of it. Each patch is a separate file that addresses a specific concern.

```bash
# Generate the base config
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --output-dir ./configs

# Apply multiple patches when configuring a node
talosctl apply-config --nodes 192.168.1.10 \
  --file ./configs/controlplane.yaml \
  --config-patch @patches/common.yaml \
  --config-patch @patches/network-prod.yaml \
  --config-patch @patches/monitoring.yaml
```

Each patch file is a focused piece of configuration:

```yaml
# patches/common.yaml
# Common settings for all nodes
machine:
  time:
    servers:
      - time.cloudflare.com
      - pool.ntp.org
  logging:
    destinations:
      - endpoint: "udp://10.0.0.50:514"
        format: json_lines
```

```yaml
# patches/network-prod.yaml
# Production network settings
machine:
  network:
    nameservers:
      - 10.0.0.2
      - 10.0.0.3
  env:
    http_proxy: "http://proxy.corp.internal:3128"
    https_proxy: "http://proxy.corp.internal:3128"
```

```yaml
# patches/monitoring.yaml
# Enable metrics and tracing
cluster:
  apiServer:
    extraArgs:
      enable-admission-plugins: PodSecurity
  coreDNS:
    disabled: false
```

## Merge Behavior and Ordering

Understanding how Talos merges documents is important. The merge strategy works like this:

- **Maps (objects)** are merged recursively. Keys from later documents override keys from earlier ones.
- **Lists (arrays)** are replaced entirely, not appended. If your base config has two nameservers and your patch specifies three different nameservers, you get the three from the patch.
- **Scalar values** (strings, numbers, booleans) are replaced by later documents.

This means you need to be careful with list-type fields. If you want to add an item to a list, you need to include the full list in your patch:

```yaml
# This patch replaces the entire nameservers list
# Make sure to include all the nameservers you want
machine:
  network:
    nameservers:
      - 10.0.0.2
      - 10.0.0.3
      - 8.8.8.8
```

## Organizing Patches by Concern

A good pattern is to organize your patches into categories. Here is a directory structure that works well for medium-to-large deployments:

```
configs/
  controlplane.yaml        # Base control plane config
  worker.yaml              # Base worker config
patches/
  common/
    time-servers.yaml       # NTP configuration
    logging.yaml            # Log forwarding
    dns.yaml                # DNS nameservers
  network/
    prod-network.yaml       # Production network settings
    staging-network.yaml    # Staging network settings
  roles/
    gpu-worker.yaml         # GPU-specific settings
    storage-worker.yaml     # Storage node settings
  security/
    admission-control.yaml  # Pod security admission
    audit-policy.yaml       # API server audit policy
```

When you configure a node, you compose the relevant patches:

```bash
# Configure a GPU worker in production
talosctl apply-config --nodes 192.168.1.50 \
  --file ./configs/worker.yaml \
  --config-patch @patches/common/time-servers.yaml \
  --config-patch @patches/common/logging.yaml \
  --config-patch @patches/common/dns.yaml \
  --config-patch @patches/network/prod-network.yaml \
  --config-patch @patches/roles/gpu-worker.yaml
```

## Inline Multi-Document Format

You can also combine everything into a single file using YAML document separators. This is useful when you want to ship a single file but still keep logical sections separated:

```yaml
# All-in-one config with clear separation
version: v1alpha1
machine:
  type: worker
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
cluster:
  clusterName: my-cluster
  controlPlane:
    endpoint: https://192.168.1.100:6443
---
# Network layer
version: v1alpha1
machine:
  network:
    hostname: worker-1
    interfaces:
      - interface: eth0
        dhcp: true
    nameservers:
      - 10.0.0.2
---
# Operational settings
version: v1alpha1
machine:
  time:
    servers:
      - time.cloudflare.com
  logging:
    destinations:
      - endpoint: "udp://10.0.0.50:514"
        format: json_lines
```

## Validating Merged Configuration

Before applying a multi-document config to a live node, you should validate the merged result. Talos provides a way to do this:

```bash
# Validate config before applying
talosctl validate --config controlplane.yaml --mode metal

# You can also view the merged config on a running node
talosctl get machineconfig --nodes 192.168.1.10 -o yaml
```

This shows you exactly what Talos sees after merging all documents together, which is helpful for debugging merge issues.

## Practical Tips

A few things I have learned from working with multi-document configs in production:

First, keep your base configs minimal. Only include what is absolutely required - the machine type, install image, and cluster endpoint. Push everything else into patches.

Second, name your patch files descriptively. When you are debugging a node configuration at 2 AM, you want to know exactly what each patch does without opening it.

Third, version control your patches alongside your infrastructure code. Treat them like any other configuration artifact. Review changes in pull requests, tag releases, and keep a changelog.

Fourth, test your merge results in a staging environment before rolling changes to production. A misplaced key in a patch can break things in subtle ways.

## Conclusion

Multi-document machine configuration in Talos Linux is a practical tool for keeping your cluster configs organized. Instead of maintaining massive monolithic YAML files with lots of duplication, you can break things down into focused, reusable patches. The merge behavior is straightforward once you understand that lists are replaced and maps are merged. Combined with good directory organization and validation before applying, this approach scales well from small home labs to large production deployments.

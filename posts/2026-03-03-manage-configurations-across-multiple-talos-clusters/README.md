# How to Manage Configurations Across Multiple Talos Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Configuration Management, GitOps, Multi-Cluster

Description: Practical strategies for managing and synchronizing Talos Linux configurations across multiple clusters while preventing drift and maintaining consistency.

---

Talos Linux is configured entirely through its machine configuration API. There are no config files to edit on disk, no SSH sessions to tweak settings. This is a huge advantage for managing multiple clusters because it means configuration is declarative and versionable. But as your fleet of Talos clusters grows, keeping configurations consistent and manageable requires a deliberate strategy.

This guide covers practical approaches to managing Talos configurations across many clusters.

## The Configuration Challenge

Every Talos cluster starts with a machine configuration that defines everything from disk layout to network settings to Kubernetes parameters. When you have one cluster, you generate this config once and apply it. When you have ten clusters across different environments and regions, you face several challenges:

- Shared settings need to be consistent everywhere
- Environment-specific settings need to vary predictably
- Changes need to propagate reliably
- You need to track what is deployed where

## Layered Configuration with Patches

Talos supports configuration patches, which let you build configurations in layers. Start with a base configuration and apply environment-specific patches on top.

Create a base configuration that captures your organization's standards:

```yaml
# base/machine-config.yaml
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
    wipe: false
  time:
    servers:
      - time.cloudflare.com
      - time.google.com
  sysctls:
    net.core.somaxconn: "65535"
    net.ipv4.ip_forward: "1"
  kubelet:
    extraArgs:
      rotate-server-certificates: true
      event-qps: "5"
    nodeIP:
      validSubnets:
        - 10.0.0.0/8
  logging:
    destinations:
      - endpoint: "udp://logs.example.com:514"
        format: json_lines
cluster:
  network:
    cni:
      name: none  # We deploy Cilium separately
    dnsDomain: cluster.local
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
  proxy:
    disabled: true  # Using Cilium kube-proxy replacement
  etcd:
    extraArgs:
      quota-backend-bytes: "8589934592"
```

Then create patches for each environment:

```yaml
# patches/dev.yaml
machine:
  install:
    image: ghcr.io/siderolabs/installer:v1.6.0
cluster:
  controlPlane:
    endpoint: https://dev-cp.internal:6443
  allowSchedulingOnControlPlanes: true  # Save resources in dev
```

```yaml
# patches/prod.yaml
machine:
  install:
    image: ghcr.io/siderolabs/installer:v1.6.0
  features:
    kubePrism:
      enabled: true
      port: 7445
cluster:
  controlPlane:
    endpoint: https://prod-cp.example.com:6443
  allowSchedulingOnControlPlanes: false
  adminKubeconfig:
    certLifetime: 8h  # Shorter cert lifetime for prod
```

And region-specific patches:

```yaml
# patches/us-east.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: false
        addresses:
          - 10.1.0.0/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.1.0.1
    nameservers:
      - 10.1.0.2
      - 10.1.0.3
```

Generate the final configuration by stacking patches:

```bash
# Generate prod US-East control plane config
talosctl gen config prod-us-east https://prod-cp.example.com:6443 \
  --config-patch @base/machine-config.yaml \
  --config-patch @patches/prod.yaml \
  --config-patch @patches/us-east.yaml \
  --config-patch-control-plane @patches/control-plane.yaml \
  --config-patch-worker @patches/worker.yaml \
  --output-dir ./generated/prod-us-east/
```

## Git Repository Structure

Organize your configuration repository to make the layering clear:

```text
talos-configs/
  base/
    machine-config.yaml      # Shared across all clusters
  patches/
    environments/
      dev.yaml
      staging.yaml
      prod.yaml
    regions/
      us-east.yaml
      us-west.yaml
      eu-west.yaml
    roles/
      control-plane.yaml
      worker.yaml
      worker-gpu.yaml
  clusters/
    dev/
      cluster.yaml           # Cluster-specific overrides
      nodes.yaml             # Node inventory
    prod-us-east/
      cluster.yaml
      nodes.yaml
    prod-eu-west/
      cluster.yaml
      nodes.yaml
  scripts/
    generate.sh              # Config generation script
    apply.sh                 # Config application script
  Makefile
```

The generation script combines the right patches for each cluster:

```bash
#!/bin/bash
# scripts/generate.sh

CLUSTER=$1
ENV=$(yq '.environment' "clusters/$CLUSTER/cluster.yaml")
REGION=$(yq '.region' "clusters/$CLUSTER/cluster.yaml")
ENDPOINT=$(yq '.endpoint' "clusters/$CLUSTER/cluster.yaml")

echo "Generating config for cluster: $CLUSTER (env=$ENV, region=$REGION)"

talosctl gen config "$CLUSTER" "$ENDPOINT" \
  --config-patch @base/machine-config.yaml \
  --config-patch @"patches/environments/$ENV.yaml" \
  --config-patch @"patches/regions/$REGION.yaml" \
  --config-patch-control-plane @patches/roles/control-plane.yaml \
  --config-patch-worker @patches/roles/worker.yaml \
  --output-dir "./generated/$CLUSTER/" \
  --force
```

## Drift Detection

Even with good configuration management, drift happens. Someone applies an emergency patch directly. A cluster misses an update. You need to detect this.

Write a script that compares the running configuration against the expected configuration:

```bash
#!/bin/bash
# scripts/check-drift.sh

CLUSTER=$1
NODE=$2

# Get the running config
talosctl -n "$NODE" get machineconfig -o yaml > /tmp/running-config.yaml

# Get the expected config
EXPECTED="./generated/$CLUSTER/controlplane.yaml"

# Compare key sections
diff <(yq '.machine.kubelet' "$EXPECTED") \
     <(yq '.spec.machine.kubelet' /tmp/running-config.yaml)

diff <(yq '.cluster.etcd' "$EXPECTED") \
     <(yq '.spec.cluster.etcd' /tmp/running-config.yaml)

# Report differences
if [ $? -ne 0 ]; then
  echo "DRIFT DETECTED on $CLUSTER/$NODE"
  exit 1
fi

echo "No drift detected on $CLUSTER/$NODE"
```

Run this as a scheduled CI job that alerts your team when drift is detected.

## Applying Configuration Changes

When you need to update a setting across all clusters, the process should be:

1. Update the relevant patch file in Git
2. Regenerate configurations for affected clusters
3. Apply changes to dev first, validate, then roll forward

```bash
#!/bin/bash
# scripts/apply.sh - Apply config changes to a cluster

CLUSTER=$1

# Get nodes from inventory
CONTROL_PLANES=$(yq '.controlPlanes[]' "clusters/$CLUSTER/nodes.yaml")
WORKERS=$(yq '.workers[]' "clusters/$CLUSTER/nodes.yaml")

# Apply to control planes first
for node in $CONTROL_PLANES; do
  echo "Applying config to control plane: $node"
  talosctl apply-config \
    --nodes "$node" \
    --file "./generated/$CLUSTER/controlplane.yaml" \
    --mode auto

  # Wait for the node to be ready
  talosctl health --nodes "$node" --wait-timeout 300s
done

# Then apply to workers
for node in $WORKERS; do
  echo "Applying config to worker: $node"
  talosctl apply-config \
    --nodes "$node" \
    --file "./generated/$CLUSTER/worker.yaml" \
    --mode auto

  talosctl health --nodes "$node" --wait-timeout 300s
done
```

The `--mode auto` flag lets Talos decide whether a reboot is needed based on the changes. Some changes can be applied live, while others require a reboot.

## Secrets Management

Machine configurations contain secrets like cluster certificates and encryption keys. Never commit these to Git in plain text. Use a tool like SOPS, Sealed Secrets, or Vault to encrypt secrets before storing them:

```bash
# Encrypt the generated configs with SOPS
sops --encrypt --age $(cat keys.txt) \
  generated/prod-us-east/controlplane.yaml > \
  generated/prod-us-east/controlplane.enc.yaml

# Decrypt when needed
sops --decrypt generated/prod-us-east/controlplane.enc.yaml > /tmp/controlplane.yaml
talosctl apply-config --nodes 10.1.0.10 --file /tmp/controlplane.yaml
rm /tmp/controlplane.yaml
```

## Validation

Before applying any configuration, validate it:

```bash
# Validate the generated config
talosctl validate --config generated/prod-us-east/controlplane.yaml --mode metal

# Check for common issues
talosctl validate --config generated/prod-us-east/worker.yaml --mode metal
```

Build this into your CI pipeline so broken configurations never get applied.

## Summary

Managing Talos configurations across multiple clusters comes down to three things: layer your configs with a clear hierarchy, keep everything in Git, and automate the generation and application process. Talos makes this easier than traditional Linux configuration management because there is only one config file per node role, and it covers everything. No Ansible playbooks, no Chef recipes, no scattered config files. One YAML document per node role, layered from shared base to cluster-specific overrides. That simplicity scales well.

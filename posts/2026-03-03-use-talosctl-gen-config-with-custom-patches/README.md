# How to Use talosctl gen config with Custom Patches

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Configuration, Kubernetes, Automation

Description: Master the talosctl gen config command with custom patches to generate tailored Talos Linux cluster configurations efficiently.

---

The `talosctl gen config` command is the starting point for every Talos Linux cluster. It generates the machine configuration files that define how your control plane and worker nodes should be set up. Out of the box, it produces a working configuration with sensible defaults. But real-world clusters need customization, and that is where custom patches come in.

This post dives into how to use `talosctl gen config` with patches to produce customized configurations that match your infrastructure requirements from the start.

## The Basic Command

At its simplest, `talosctl gen config` takes a cluster name and an endpoint:

```bash
# Generate default configs
talosctl gen config my-cluster https://192.168.1.100:6443 --output-dir ./configs
```

This creates several files:
- `controlplane.yaml` - Configuration for control plane nodes
- `worker.yaml` - Configuration for worker nodes
- `talosconfig` - Client configuration for `talosctl`

These files contain everything needed to bootstrap a cluster, but they use default values for everything.

## Adding Patches

Patches modify the generated configuration. There are three ways to specify patches:

### Inline JSON Patches

For quick, single-value changes:

```bash
# Change the install disk
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch '[{"op": "add", "path": "/machine/install/disk", "value": "/dev/nvme0n1"}]'
```

### Inline YAML Patches (Strategic Merge)

For small changes that are easier to read in YAML:

```bash
# Add nameservers using inline YAML
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch '{"machine": {"network": {"nameservers": ["8.8.8.8", "8.8.4.4"]}}}'
```

### File-Based Patches

For anything more than a couple of fields, use patch files:

```bash
# Apply a patch from a file
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @my-patch.yaml
```

The `@` prefix tells `talosctl` to read the patch from a file instead of treating the argument as inline content.

## Patch Targeting

Not all patches should apply to all node types. `talosctl gen config` provides three patch flags:

```bash
# Patches that apply to ALL nodes (both control plane and worker)
--config-patch @common-settings.yaml

# Patches that only apply to control plane nodes
--config-patch-control-plane @cp-settings.yaml

# Patches that only apply to worker nodes
--config-patch-worker @worker-settings.yaml
```

This is extremely useful. Here is a practical example:

```bash
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @patches/common.yaml \
  --config-patch-control-plane @patches/controlplane.yaml \
  --config-patch-worker @patches/worker.yaml \
  --output-dir ./configs
```

Where the patch files contain:

```yaml
# patches/common.yaml
# Settings for all nodes
machine:
  time:
    servers:
      - time.cloudflare.com
  network:
    nameservers:
      - 10.0.0.2
      - 10.0.0.3
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
```

```yaml
# patches/controlplane.yaml
# Settings only for control plane nodes
cluster:
  apiServer:
    certSANs:
      - my-cluster.company.internal
    extraArgs:
      enable-admission-plugins: PodSecurity
  etcd:
    extraArgs:
      quota-backend-bytes: "8589934592"
```

```yaml
# patches/worker.yaml
# Settings only for worker nodes
machine:
  kubelet:
    extraArgs:
      max-pods: "200"
      system-reserved: "cpu=500m,memory=1Gi"
```

## Multiple Patches

You can specify multiple patches of each type. They are applied in order:

```bash
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @patches/network.yaml \
  --config-patch @patches/security.yaml \
  --config-patch @patches/logging.yaml \
  --config-patch @patches/proxy.yaml \
  --output-dir ./configs
```

Later patches override earlier ones when they affect the same field. This lets you build up your configuration in logical layers.

## Useful gen config Flags

Beyond patches, `talosctl gen config` has several other flags worth knowing:

```bash
# Specify the Kubernetes version
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --kubernetes-version 1.29.0

# Set the install image
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --install-image ghcr.io/siderolabs/installer:v1.6.0

# Set the install disk directly (shorthand for a patch)
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --install-disk /dev/nvme0n1

# Output to a specific directory
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --output-dir ./my-configs

# Generate configs with specific DNS domain
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --dns-domain cluster.local
```

## A Complete Real-World Example

Here is a full example of how you might generate configs for a production cluster:

```bash
# Directory structure
# patches/
#   common.yaml
#   controlplane.yaml
#   worker.yaml
#   network-prod.yaml
#   security.yaml

# Generate the configs
talosctl gen config prod-cluster https://k8s.company.internal:6443 \
  --kubernetes-version 1.29.0 \
  --install-image ghcr.io/siderolabs/installer:v1.6.0 \
  --config-patch @patches/common.yaml \
  --config-patch @patches/network-prod.yaml \
  --config-patch @patches/security.yaml \
  --config-patch-control-plane @patches/controlplane.yaml \
  --config-patch-worker @patches/worker.yaml \
  --output-dir ./configs/prod
```

```yaml
# patches/common.yaml
machine:
  install:
    disk: /dev/sda
  time:
    servers:
      - ntp1.company.internal
      - ntp2.company.internal
  logging:
    destinations:
      - endpoint: "tcp://logstash.company.internal:5044"
        format: json_lines
  network:
    nameservers:
      - 10.0.0.2
      - 10.0.0.3
  env:
    http_proxy: "http://proxy.company.internal:3128"
    https_proxy: "http://proxy.company.internal:3128"
    no_proxy: "localhost,127.0.0.1,.company.internal,10.0.0.0/8"
```

```yaml
# patches/security.yaml
cluster:
  apiServer:
    admissionControl:
      - name: PodSecurity
        configuration:
          apiVersion: pod-security.admission.config.k8s.io/v1
          kind: PodSecurityConfiguration
          defaults:
            enforce: "baseline"
            enforce-version: "latest"
            audit: "restricted"
            audit-version: "latest"
            warn: "restricted"
            warn-version: "latest"
          exemptions:
            namespaces:
              - kube-system
```

## Validating Generated Configs

After generating your configs, always validate them before applying to real machines:

```bash
# Validate control plane config
talosctl validate --config ./configs/prod/controlplane.yaml --mode metal

# Validate worker config
talosctl validate --config ./configs/prod/worker.yaml --mode metal

# For cloud deployments, use the appropriate mode
talosctl validate --config ./configs/prod/controlplane.yaml --mode cloud
```

The `--mode` flag tells the validator what kind of environment the config is for. Use `metal` for bare metal, `cloud` for cloud providers, and `container` for Docker-based Talos.

## Automating Config Generation

In CI/CD pipelines, you can script the entire config generation process:

```bash
#!/bin/bash
# generate-configs.sh
# Generates Talos configs for all environments

set -euo pipefail

TALOS_VERSION="v1.6.0"
K8S_VERSION="1.29.0"

for ENV in staging production; do
  echo "Generating configs for ${ENV}..."

  talosctl gen config "${ENV}-cluster" \
    "https://k8s-${ENV}.company.internal:6443" \
    --kubernetes-version "${K8S_VERSION}" \
    --install-image "ghcr.io/siderolabs/installer:${TALOS_VERSION}" \
    --config-patch "@patches/common.yaml" \
    --config-patch "@patches/network-${ENV}.yaml" \
    --config-patch "@patches/security.yaml" \
    --config-patch-control-plane "@patches/controlplane.yaml" \
    --config-patch-worker "@patches/worker.yaml" \
    --output-dir "./configs/${ENV}" \
    --force

  # Validate generated configs
  talosctl validate --config "./configs/${ENV}/controlplane.yaml" --mode metal
  talosctl validate --config "./configs/${ENV}/worker.yaml" --mode metal

  echo "Configs for ${ENV} generated and validated successfully."
done
```

## Tips for Managing Patches

Keep patches small and focused. Each patch file should address one concern - networking, security, logging, or a specific node role.

Name your patch files descriptively. When you come back to this in six months, `network-prod.yaml` is much more helpful than `patch3.yaml`.

Store patches in version control. Changes to your cluster configuration should go through the same review process as code changes.

Document non-obvious patches with comments in the YAML. Explain why a value was chosen, not just what it is.

Test patches in a development environment before using them in production. A typo in a patch can produce a valid but broken configuration.

## Conclusion

The `talosctl gen config` command combined with custom patches gives you a powerful and repeatable way to generate Talos Linux cluster configurations. By separating concerns into different patch files and using targeted patches for different node types, you can maintain clean, modular configurations that are easy to understand and modify. Start with the defaults, layer on your customizations through patches, validate the result, and you have a production-ready configuration every time.

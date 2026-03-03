# How to Use Machine Configuration Patches in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Machine Configuration, Patches, Kubernetes, DevOps

Description: A complete guide to using machine configuration patches in Talos Linux to customize and manage cluster settings without modifying base configurations.

---

Machine configuration patches are one of the most important features in Talos Linux for day-to-day operations. Instead of editing full configuration files directly, patches let you describe only the changes you want to make. This keeps your base configuration clean while giving you the flexibility to customize settings for different environments, roles, and individual nodes. This guide covers everything you need to know about using patches effectively.

## What Are Configuration Patches

A configuration patch is a YAML document that describes modifications to a Talos machine configuration. Rather than providing the complete configuration, you only specify the fields you want to add or change. Talos merges the patch with the base configuration to produce the final result.

There are two types of patches in Talos:

1. **Strategic merge patches** - The default type. You provide a partial configuration document, and Talos merges it with the existing configuration. This is the most intuitive and commonly used approach.

2. **JSON patches (RFC 6902)** - A more precise patch format that uses explicit operations like add, remove, and replace. This is useful when you need fine-grained control over the merge behavior.

This guide focuses primarily on strategic merge patches, which cover the vast majority of use cases.

## Applying Patches During Config Generation

The most common time to apply patches is when generating your initial configurations:

```bash
# Apply a patch to all generated configs (both controlplane and worker)
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch @common-settings.yaml

# Apply patches only to control plane configs
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch-control-plane @cp-settings.yaml

# Apply patches only to worker configs
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch-worker @worker-settings.yaml

# Combine multiple patches
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch @common-settings.yaml \
    --config-patch-control-plane @cp-settings.yaml \
    --config-patch-worker @worker-settings.yaml
```

## Applying Patches to Running Nodes

You can also apply patches to nodes that are already running:

```bash
# Apply a patch to a specific node
talosctl apply-config --nodes 10.0.1.10 --patch @my-patch.yaml

# Apply a patch without rebooting (if the change supports it)
talosctl apply-config --nodes 10.0.1.10 --patch @my-patch.yaml --mode no-reboot

# Apply patches from multiple files
talosctl apply-config --nodes 10.0.1.10 \
    --patch @patch-network.yaml \
    --patch @patch-kubelet.yaml
```

When applying patches to a running node, Talos reads the current machine configuration, applies the patches, and then applies the resulting configuration. If any patch conflicts with the existing config in a way that cannot be resolved, the operation fails with an error.

## Common Patch Examples

Here are patches for the most frequently needed customizations.

### Setting the Hostname

```yaml
# hostname-patch.yaml
machine:
  network:
    hostname: my-worker-node
```

### Configuring NTP Servers

```yaml
# ntp-patch.yaml
machine:
  time:
    servers:
      - time.cloudflare.com
      - time.google.com
```

### Adding Kubelet Labels

```yaml
# labels-patch.yaml
machine:
  kubelet:
    nodeLabels:
      environment: production
      team: platform
      topology.kubernetes.io/zone: us-east-1a
```

### Configuring Network Interfaces

```yaml
# network-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: false
        addresses:
          - 10.0.1.20/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
```

### Disabling Kube-Proxy (for Cilium)

```yaml
# no-kube-proxy-patch.yaml
cluster:
  proxy:
    disabled: true
```

### Adding Extra Manifests

```yaml
# manifests-patch.yaml
cluster:
  inlineManifests:
    - name: namespace-monitoring
      contents: |
        apiVersion: v1
        kind: Namespace
        metadata:
          name: monitoring
```

### Configuring Pod Security Admission

```yaml
# pod-security-patch.yaml
cluster:
  apiServer:
    admissionControl:
      - name: PodSecurity
        configuration:
          apiVersion: pod-security.admission.config.k8s.io/v1
          kind: PodSecurityConfiguration
          defaults:
            enforce: restricted
            enforce-version: latest
            audit: restricted
            audit-version: latest
            warn: restricted
            warn-version: latest
```

## Inline Patches vs File Patches

Patches can be specified inline on the command line or loaded from files. Inline patches are useful for quick one-off changes:

```bash
# Inline JSON patch
talosctl apply-config --nodes 10.0.1.10 \
    --patch '[{"op": "add", "path": "/machine/network/hostname", "value": "worker-1"}]'

# Inline strategic merge patch (using YAML)
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch '{"machine": {"network": {"hostname": "my-node"}}}'
```

For anything more than a trivial change, use files. They are easier to read, version control, and share:

```bash
# File-based patch (the @ prefix reads from a file)
talosctl apply-config --nodes 10.0.1.10 --patch @patches/worker-1.yaml
```

## Layering Multiple Patches

Patches are applied in order, and later patches can override earlier ones. This lets you build a layered configuration system:

```bash
# Layer 1: Common settings for all nodes
# Layer 2: Role-specific settings
# Layer 3: Node-specific settings
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch @patches/common.yaml \
    --config-patch-worker @patches/worker-role.yaml \
    --config-patch @patches/nodes/worker-1.yaml
```

If `common.yaml` sets the MTU to 1500 and `worker-1.yaml` sets it to 9000, the final configuration will use 9000 because it was applied last.

## Patch Merging Behavior

Understanding how strategic merge patches work is important for avoiding surprises.

**Scalar values** are simply replaced:

```yaml
# Patch
machine:
  network:
    hostname: new-name
# Result: hostname is set to "new-name"
```

**Maps** are merged recursively:

```yaml
# Existing config has:
machine:
  kubelet:
    nodeLabels:
      existing-label: "true"

# Patch adds:
machine:
  kubelet:
    nodeLabels:
      new-label: "true"

# Result: both labels are present
machine:
  kubelet:
    nodeLabels:
      existing-label: "true"
      new-label: "true"
```

**Lists** behave differently depending on the field. Some lists are replaced entirely, while others are merged based on a key field. For network interfaces, the `interface` field is used as the merge key:

```yaml
# Existing config has eth0 configured
# Patch adds eth1 configuration
machine:
  network:
    interfaces:
      - interface: eth1
        addresses:
          - 192.168.100.20/24

# Result: both eth0 and eth1 are configured
```

## Validating Patches

Always validate your patches before applying them to production nodes:

```bash
# Generate a config with the patch and validate it
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch @my-patch.yaml \
    --output /tmp/test-config

talosctl validate --config /tmp/test-config/controlplane.yaml --mode metal
```

You can also use `talosctl machineconfig patch` to preview the result of applying a patch to an existing configuration:

```bash
# Preview the patch result without applying
talosctl machineconfig patch controlplane.yaml --patch @my-patch.yaml -o patched-config.yaml

# Then validate
talosctl validate --config patched-config.yaml --mode metal
```

## Managing Patches in Version Control

A well-organized patch repository makes cluster management much easier:

```text
cluster-config/
  Makefile                    # Automation for config generation
  secrets.enc.yaml            # Encrypted secrets
  patches/
    common/
      ntp.yaml                # NTP configuration
      dns.yaml                # DNS settings
      registry-mirrors.yaml   # Container registry mirrors
    controlplane/
      etcd.yaml               # etcd settings
      api-server.yaml         # API server customization
    workers/
      kubelet.yaml            # Worker kubelet settings
    environments/
      production.yaml         # Production-specific overrides
      staging.yaml            # Staging-specific overrides
    nodes/
      cp-1.yaml               # Per-node patches
      cp-2.yaml
      worker-1.yaml
```

With a Makefile to tie it together:

```makefile
# Makefile for Talos config management
CLUSTER_NAME := my-cluster
ENDPOINT := https://10.0.1.100:6443
SECRETS := secrets.yaml

.PHONY: generate
generate: decrypt-secrets
	talosctl gen config $(CLUSTER_NAME) $(ENDPOINT) \
		--from-secrets $(SECRETS) \
		--config-patch @patches/common/ntp.yaml \
		--config-patch @patches/common/dns.yaml \
		--config-patch-control-plane @patches/controlplane/etcd.yaml \
		--config-patch-worker @patches/workers/kubelet.yaml \
		--config-patch @patches/environments/production.yaml
	@rm -f $(SECRETS)
```

## Debugging Patch Issues

When a patch does not produce the expected result, here are some debugging steps:

```bash
# View the current machine config on a node
talosctl get machineconfig --nodes 10.0.1.10 -o yaml > current.yaml

# Apply the patch locally to see the result
talosctl machineconfig patch current.yaml --patch @my-patch.yaml -o result.yaml

# Compare the result with what you expected
diff current.yaml result.yaml
```

If the patch seems to have no effect, check that the YAML structure matches what Talos expects. A common mistake is nesting fields at the wrong level.

## Conclusion

Machine configuration patches are the standard way to customize Talos Linux clusters. They keep your base configuration clean, make changes trackable in version control, and support a layered approach from common settings down to individual node overrides. Whether you are setting up a new cluster or maintaining an existing one, mastering patches will make your Talos operations significantly smoother. Start with simple patches for common settings, and as your needs grow, build a structured patch hierarchy that keeps your cluster configuration organized and maintainable.

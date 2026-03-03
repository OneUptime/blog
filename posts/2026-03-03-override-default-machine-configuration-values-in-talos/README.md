# How to Override Default Machine Configuration Values in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Machine Configuration, Customization, Kubernetes, DevOps

Description: Learn how to override default machine configuration values in Talos Linux to customize cluster behavior without starting from scratch.

---

Talos Linux ships with sensible defaults for most configuration options. The default settings work well for basic deployments, but production clusters almost always need adjustments. Maybe you need to change the pod CIDR, increase the kubelet resource limits, or tweak the API server flags. The question is how to do this cleanly without maintaining a massive custom configuration file from scratch.

This post explains how to override specific default values in Talos Linux machine configuration using patches, strategic merge patches, and JSON patches.

## Understanding Talos Defaults

When you generate a Talos configuration using `talosctl gen config`, the resulting files contain a complete configuration with all the defaults filled in. These defaults cover everything from the Kubernetes version and CNI provider to kubelet settings and etcd parameters.

```bash
# Generate a default config to see all the defaults
talosctl gen config my-cluster https://192.168.1.100:6443 --output-dir ./defaults
```

Looking at the generated `controlplane.yaml`, you will see hundreds of lines of configuration. Most of these are defaults that you do not need to change. The goal is to override only the specific values you need to customize.

## Method 1 - Config Patches (Strategic Merge)

The simplest way to override defaults is with config patches. A config patch is a partial YAML document that gets merged with the base configuration. You only need to specify the fields you want to change:

```yaml
# override-patch.yaml
# Override just the fields you need
cluster:
  network:
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
  apiServer:
    extraArgs:
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
machine:
  kubelet:
    extraArgs:
      max-pods: "150"
```

Apply this patch when generating your config:

```bash
# Generate config with overrides
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @override-patch.yaml
```

The patch is merged with the defaults. Fields you specify override the defaults; fields you do not specify keep their default values.

## Method 2 - JSON Patches (RFC 6902)

For more precise control, you can use JSON patches. These follow the RFC 6902 standard and support operations like add, remove, replace, move, copy, and test:

```bash
# Replace a specific value
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch '[{"op": "replace", "path": "/cluster/network/podSubnets", "value": ["10.244.0.0/16"]}]'

# Add a new field
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch '[{"op": "add", "path": "/machine/kubelet/extraArgs/max-pods", "value": "150"}]'

# Remove a field (reverts to built-in default)
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch '[{"op": "remove", "path": "/cluster/coreDNS"}]'
```

JSON patches are particularly useful when you need to remove a field or when the merge behavior of strategic patches does not do what you want.

## Method 3 - Applying Overrides to Running Nodes

If your cluster is already running, you can override configuration values on live nodes:

```bash
# Override kubelet settings on a running node
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"machine": {"kubelet": {"extraArgs": {"max-pods": "150"}}}}'

# Override API server settings (control plane nodes only)
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"cluster": {"apiServer": {"extraArgs": {"audit-log-maxage": "30"}}}}'
```

After patching, Talos will apply the changes. Some changes take effect immediately (like kubelet extra args after a kubelet restart), while others require a node reboot or upgrade (like kernel arguments or install disk changes).

## Common Overrides

Here are the most frequently overridden settings in production Talos deployments:

### Cluster Networking

```yaml
cluster:
  network:
    # Custom pod CIDR
    podSubnets:
      - 10.244.0.0/16
    # Custom service CIDR
    serviceSubnets:
      - 10.96.0.0/12
    # Custom cluster domain
    dnsDomain: cluster.local
```

### API Server Configuration

```yaml
cluster:
  apiServer:
    extraArgs:
      # Enable admission plugins
      enable-admission-plugins: PodSecurity,NodeRestriction
      # Audit log settings
      audit-log-maxage: "30"
      audit-log-maxbackup: "10"
      audit-log-maxsize: "100"
      # OIDC authentication
      oidc-issuer-url: "https://auth.company.internal"
      oidc-client-id: "kubernetes"
    certSANs:
      - my-cluster.company.internal
      - 10.0.0.100
```

### Kubelet Settings

```yaml
machine:
  kubelet:
    extraArgs:
      max-pods: "150"
      system-reserved: "cpu=500m,memory=512Mi"
      kube-reserved: "cpu=500m,memory=512Mi"
    extraConfig:
      serverTLSBootstrap: true
```

### etcd Configuration

```yaml
cluster:
  etcd:
    extraArgs:
      election-timeout: "5000"
      heartbeat-interval: "500"
      quota-backend-bytes: "8589934592"
```

### Scheduler and Controller Manager

```yaml
cluster:
  scheduler:
    extraArgs:
      bind-address: "0.0.0.0"
  controllerManager:
    extraArgs:
      bind-address: "0.0.0.0"
      terminated-pod-gc-threshold: "100"
```

## Layering Multiple Overrides

You can apply multiple override patches, and they are processed in order. This lets you build up your configuration in layers:

```bash
# Layer multiple patches
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @patches/network.yaml \
  --config-patch @patches/security.yaml \
  --config-patch @patches/monitoring.yaml \
  --config-patch @patches/node-specific.yaml
```

Later patches override earlier ones for the same fields. This means you can have a general patch for all nodes and then a more specific patch that overrides certain values for particular node types.

## Control Plane vs Worker Overrides

Some overrides only apply to control plane nodes, and some only to workers. Talos provides separate patch flags for this:

```bash
# Patches for control plane nodes only
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch-control-plane @patches/controlplane-overrides.yaml \
  --config-patch-worker @patches/worker-overrides.yaml
```

Control plane patches might include API server flags and etcd settings, while worker patches might include kubelet limits and GPU configuration.

## Viewing Effective Configuration

After applying overrides, you can view the final merged configuration on a running node:

```bash
# View the full effective configuration
talosctl get machineconfig --nodes 192.168.1.10 -o yaml

# Check a specific section
talosctl get machineconfig --nodes 192.168.1.10 -o yaml | grep -A 20 "apiServer"
```

This shows you exactly what Talos is using, after all patches and merges have been applied. It is invaluable for debugging when something does not work as expected.

## Resetting Overrides

If you want to revert an override back to the default value, you have two options. First, you can use a JSON patch to remove the override:

```bash
# Remove an override
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '[{"op": "remove", "path": "/machine/kubelet/extraArgs/max-pods"}]'
```

Second, you can regenerate the configuration from scratch and reapply it, omitting the override you no longer want.

## Practical Tips

When managing overrides, keep them organized. Create separate patch files for different concerns (networking, security, performance) and document why each override exists.

Test overrides in a staging environment first. Some combinations of settings can conflict in non-obvious ways. For example, changing the pod CIDR on a running cluster requires careful migration.

Keep track of which overrides are applied to which nodes. In a cluster with multiple node types, it is easy to lose track of what configuration each node is running.

Use version control for your patch files. When something breaks, being able to diff against the previous known-good configuration is extremely valuable.

## Conclusion

Overriding default configuration values in Talos Linux is a fundamental skill for anyone managing production clusters. Whether you use strategic merge patches for simplicity or JSON patches for precision, the process is clean and predictable. Start with the defaults, identify what needs to change for your environment, and apply targeted overrides. Keep your patches organized, version-controlled, and well-documented, and you will have a maintainable configuration that is easy to reason about.

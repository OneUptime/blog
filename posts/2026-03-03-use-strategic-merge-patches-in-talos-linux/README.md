# How to Use Strategic Merge Patches in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Strategic Merge Patch, Configuration, Kubernetes, DevOps

Description: A hands-on guide to using strategic merge patches in Talos Linux for intuitive and maintainable configuration management.

---

Strategic merge patches are the easiest and most commonly used patching method in Talos Linux. They let you describe configuration changes using the same YAML structure as the machine configuration itself, making them intuitive to write and easy to understand. Instead of specifying operations like "add this field" or "replace that value," you simply provide the partial configuration you want, and Talos merges it with the existing config. This guide covers how strategic merge patches work in Talos, their merging rules, and practical patterns for using them effectively.

The examples below use the traditional single-document machine configuration format where it keeps the examples focused on patching behavior. In Talos v1.12 and later, several `machine.network` fields such as `hostname`, `interfaces`, and `nameservers`, along with legacy `.machine.registries`, are deprecated in favor of multi-document configuration, but the strategic merge patch behavior is the same.

## What Makes a Strategic Merge Patch

A strategic merge patch is just a YAML document that looks like a subset of a Talos machine configuration. If you want to set the hostname, your patch looks like this:

```yaml
machine:
  network:
    hostname: my-worker-node
```

That is it. No special syntax, no operation types, no JSON Pointer paths. You provide the part of the configuration you care about, and Talos handles the rest.

Compare this with a JSON Patch (RFC 6902) that does the same thing when the field is not already present:

```json
[{"op": "add", "path": "/machine/network/hostname", "value": "my-worker-node"}]
```

If the field already exists, the JSON Patch operation would be `replace` instead. The strategic merge patch is more readable, easier to review in pull requests, and less error-prone to write.

## How Merging Works

The merging behavior depends on the type of the field being patched.

### Scalar Values (Strings, Numbers, Booleans)

Scalar values are simply replaced:

```yaml
# Base config has:

machine:
  network:
    hostname: old-name

# Patch:
machine:
  network:
    hostname: new-name

# Result:
machine:
  network:
    hostname: new-name
```

### Maps (Objects)

Maps are merged recursively. Fields in the patch are added to or override fields in the base, but fields not mentioned in the patch are preserved:

```yaml
# Base config has:
machine:
  nodeLabels:
    environment: staging
    team: platform

# Patch adds a new label:
machine:
  nodeLabels:
    region: us-east

# Result - all three labels are present:
machine:
  nodeLabels:
    environment: staging
    team: platform
    region: us-east
```

This is one of the most useful behaviors of strategic merge patches. You can add labels, sysctls, or other map entries without having to repeat the existing values.

### Lists with Merge Keys

Some lists in the Talos configuration have merge keys, which means items in the list are matched by a specific field and merged individually. The most important example is network interfaces, which use the `interface` or `deviceSelector` field as the merge key:

```yaml
# Base config has eth0:
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.1.20/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1

# Patch adds eth1 without affecting eth0:
machine:
  network:
    interfaces:
      - interface: eth1
        addresses:
          - 192.168.100.20/24

# Result - both interfaces are present:
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.1.20/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
      - interface: eth1
        addresses:
          - 192.168.100.20/24
```

### Lists without Merge Keys

Most lists without merge keys are appended to the existing list:

```yaml
# Base config has two nameservers:
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 8.8.4.4

# Patch adds one nameserver:
machine:
  network:
    nameservers:
      - 1.1.1.1

# Result - all three nameservers are present:
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
      - 1.1.1.1
```

There are important exceptions: `cluster.network.podSubnets`, `cluster.network.serviceSubnets`, and `cluster.apiServer.auditPolicy` are replaced on merge. When patching those fields, include the complete value you want in the result.

## Practical Patch Examples

### Adding Kubelet Extra Arguments

```yaml
# kubelet-args-patch.yaml
machine:
  kubelet:
    extraArgs:
      rotate-server-certificates: "true"
      event-qps: "50"
      max-pods: "200"
```

```bash
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch @kubelet-args-patch.yaml
```

### Configuring Registry Mirrors

```yaml
# registry-patch.yaml
apiVersion: v1alpha1
kind: RegistryMirrorConfig
name: docker.io
endpoints:
  - url: https://mirror.internal:5000
---
apiVersion: v1alpha1
kind: RegistryMirrorConfig
name: ghcr.io
endpoints:
  - url: https://ghcr-mirror.internal:5000
```

### Setting Up System Extensions

```yaml
# installer-patch.yaml
machine:
  install:
    image: factory.talos.dev/installer/<schematic-id>:v1.12.1
```

The older `.machine.install.extensions` field is deprecated. For current Talos releases, build or select a boot asset or installer image that already includes the extensions you need, then point `machine.install.image` at that installer image.

### Configuring the API Server

```yaml
# api-server-patch.yaml
cluster:
  apiServer:
    certSANs:
      - api.production.example.com
      - 10.0.1.100
    extraArgs:
      audit-log-path: /var/log/audit/kube-apiserver-audit.log
      audit-log-maxsize: "100"
      audit-log-maxbackup: "3"
      enable-admission-plugins: "NodeRestriction,PodSecurity"
```

### Disabling Default CNI for Custom Installation

```yaml
# custom-cni-patch.yaml
cluster:
  network:
    cni:
      name: none
  proxy:
    disabled: true
```

## Layering Patches

Strategic merge patches can be layered. Each patch is applied on top of the result of the previous one:

```bash
# Layer 1: Common settings
# Layer 2: Environment-specific settings
# Layer 3: Role-specific settings
# Layer 4: Node-specific settings
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch @patches/common.yaml \
    --config-patch @patches/production.yaml \
    --config-patch-control-plane @patches/controlplane.yaml \
    --config-patch @patches/nodes/cp-1.yaml
```

The order matters for conflicting values. If `common.yaml` sets the hostname and `cp-1.yaml` also sets the hostname, the value from `cp-1.yaml` wins because it is applied last.

### A Practical Layering Example

```yaml
# patches/common.yaml - Applied to all nodes
apiVersion: v1alpha1
kind: TimeSyncConfig
ntp:
  servers:
    - time.cloudflare.com
    - time.google.com
---
apiVersion: v1alpha1
kind: RegistryMirrorConfig
name: docker.io
endpoints:
  - url: https://registry-mirror.internal:5000
```

```yaml
# patches/production.yaml - Applied to production clusters
machine:
  kubelet:
    extraArgs:
      system-reserved: "cpu=500m,memory=1Gi"
      kube-reserved: "cpu=500m,memory=1Gi"
  sysctls:
    net.core.somaxconn: "65535"
```

```yaml
# patches/controlplane.yaml - Applied to control plane nodes
cluster:
  etcd:
    advertisedSubnets:
      - 10.0.1.0/24
    extraArgs:
      quota-backend-bytes: "8589934592"
```

```yaml
# patches/nodes/cp-1.yaml - Applied to a specific node
machine:
  network:
    hostname: cp-1
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
```

## Previewing Patch Results

Always preview the result of your patches before applying:

```bash
# Generate configs with patches and inspect the result
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch @patches/common.yaml \
    --config-patch @patches/production.yaml \
    -o /tmp/preview/

# Inspect specific sections
cat /tmp/preview/controlplane.yaml | yq '.machine.kubelet'
cat /tmp/preview/controlplane.yaml | yq 'select(.kind == "RegistryMirrorConfig")'
```

Or use `machineconfig patch` for existing configurations:

```bash
talosctl machineconfig patch existing.yaml \
    --patch @my-patch.yaml \
    -o preview.yaml

# Compare
diff existing.yaml preview.yaml
```

## Common Pitfalls

### Accidentally Duplicating Lists

The most common mistake is forgetting that most lists are appended, so repeating an existing item can duplicate it:

```yaml
# Base config already has this SAN:
machine:
  certSANs:
    - existing-endpoint.example.com

# Patch repeats it and adds another one:
machine:
  certSANs:
    - existing-endpoint.example.com
    - new-endpoint.example.com

# Result - the repeated SAN appears twice:
machine:
  certSANs:
    - existing-endpoint.example.com
    - existing-endpoint.example.com
    - new-endpoint.example.com
```

### Incorrect Nesting

YAML indentation errors can cause fields to end up at the wrong level:

```yaml
# WRONG - nodeLabels is nested incorrectly
machine:
kubelet:
  nodeLabels:
    env: prod

# RIGHT - proper nesting
machine:
  nodeLabels:
    env: prod
```

### Removing Fields

Strategic merge patches can remove fields with `$patch: delete`:

```yaml
machine:
  nodeLabels:
    old-label:
      $patch: delete
```

You can also use a JSON Patch (RFC 6902) for removals:

```json
[{"op": "remove", "path": "/machine/nodeLabels/old-label"}]
```

## When to Use Strategic Merge vs JSON Patches

Use strategic merge patches when:
- Adding new fields or values
- Changing existing values
- The change is straightforward and readable as YAML

Use JSON patches when:
- Removing fields or list items with explicit JSON Pointer paths
- Replacing entire lists with precise control
- The strategic merge behavior does not give you the result you need

In practice, strategic merge patches cover about 90% of configuration changes.

## Conclusion

Strategic merge patches are the most natural way to customize Talos Linux configurations. They use the same YAML structure as the machine configuration, making them easy to write, review, and maintain. The key to using them effectively is understanding the merging rules: maps merge recursively, keyed lists merge by their key field, most unkeyed lists append, and a few special list fields are replaced. Build your configuration management around layered strategic merge patches for a clean, maintainable system that scales from single-node test clusters to large production deployments.

# How to Use JSON Patches (RFC6902) in Talos Linux Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, JSON Patch, RFC6902, Configuration, DevOps

Description: Learn how to use JSON Patches (RFC 6902) in Talos Linux for precise configuration modifications including adding, removing, and replacing values.

---

While strategic merge patches handle most Talos Linux configuration changes, there are situations where you need more precise control. JSON Patches, defined by RFC 6902, give you explicit operations to add, remove, replace, move, copy, and test values at specific paths in the configuration. This guide covers when and how to use JSON Patches effectively in Talos Linux.

## When JSON Patches Are Needed

Strategic merge patches are great for adding and modifying configuration, but they cannot do everything. You need JSON Patches when:

- **Removing a field or list item** - Strategic merge patches cannot express deletion
- **Inserting at a specific position in a list** - Strategic merge replaces or appends
- **Testing a value before patching** - JSON Patches support conditional operations
- **Performing complex list manipulation** - Replacing specific items by index

## JSON Patch Format

A JSON Patch is an array of operations. Each operation has an `op` (operation type), a `path` (JSON Pointer to the target), and usually a `value`:

```json
[
    {"op": "add", "path": "/machine/network/hostname", "value": "worker-1"},
    {"op": "remove", "path": "/machine/kubelet/nodeLabels/old-label"},
    {"op": "replace", "path": "/cluster/clusterName", "value": "production"}
]
```

The path uses JSON Pointer syntax (RFC 6901), where each segment is separated by `/`. Array indices are zero-based numbers.

## The Six Operations

### add

Adds a value at the specified path. If the path does not exist, it creates it. For arrays, it inserts at the specified index:

```json
[
    {"op": "add", "path": "/machine/kubelet/nodeLabels/new-label", "value": "true"},
    {"op": "add", "path": "/machine/certSANs/-", "value": "new.example.com"}
]
```

The `-` at the end of an array path means "append to the end."

### remove

Removes the value at the specified path:

```json
[
    {"op": "remove", "path": "/machine/kubelet/nodeLabels/deprecated-label"},
    {"op": "remove", "path": "/machine/network/interfaces/1"}
]
```

Removing from an array shifts subsequent elements down.

### replace

Replaces the value at the specified path. The path must already exist:

```json
[
    {"op": "replace", "path": "/machine/network/hostname", "value": "new-hostname"},
    {"op": "replace", "path": "/cluster/network/podSubnets/0", "value": "10.244.0.0/16"}
]
```

### move

Moves a value from one path to another:

```json
[
    {"op": "move", "from": "/machine/kubelet/nodeLabels/old-name", "path": "/machine/kubelet/nodeLabels/new-name"}
]
```

### copy

Copies a value from one path to another:

```json
[
    {"op": "copy", "from": "/machine/network/nameservers/0", "path": "/machine/network/nameservers/-"}
]
```

### test

Verifies that a value matches. The patch fails if the test does not pass:

```json
[
    {"op": "test", "path": "/cluster/clusterName", "value": "staging"},
    {"op": "replace", "path": "/cluster/clusterName", "value": "production"}
]
```

This is useful for safety: only apply the rename if the current cluster name is "staging."

## Using JSON Patches with talosctl

JSON Patches can be passed inline or from files:

```bash
# Inline JSON Patch
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch '[{"op": "add", "path": "/machine/network/hostname", "value": "cp-1"}]'

# From a file (file must contain a JSON array)
talosctl gen config my-cluster https://10.0.1.100:6443 \
    --config-patch @patches/json-patch.json
```

When applying to running nodes:

```bash
talosctl apply-config --nodes 10.0.1.10 \
    --patch '[{"op": "remove", "path": "/machine/kubelet/nodeLabels/old-label"}]'
```

With `machineconfig patch`:

```bash
talosctl machineconfig patch controlplane.yaml \
    --patch '[{"op": "replace", "path": "/machine/network/hostname", "value": "new-name"}]' \
    -o patched.yaml
```

## Practical Examples

### Removing a Node Label

This is the most common use case for JSON Patches because strategic merge patches cannot remove fields:

```json
[
    {"op": "remove", "path": "/machine/kubelet/nodeLabels/deprecated-feature"}
]
```

### Removing a Specific Network Interface

```json
[
    {"op": "test", "path": "/machine/network/interfaces/1/interface", "value": "eth1"},
    {"op": "remove", "path": "/machine/network/interfaces/1"}
]
```

The test operation first verifies that we are removing the right interface. If the order of interfaces changed, the test would fail instead of accidentally removing the wrong one.

### Replacing a Nameserver

```json
[
    {"op": "replace", "path": "/machine/network/nameservers/0", "value": "1.1.1.1"}
]
```

### Adding an Extra Manifest URL

```json
[
    {"op": "add", "path": "/cluster/extraManifests/-", "value": "https://example.com/manifests/monitoring.yaml"}
]
```

### Disabling Kube-Proxy

```json
[
    {"op": "add", "path": "/cluster/proxy/disabled", "value": true}
]
```

### Changing the Install Disk

```json
[
    {"op": "replace", "path": "/machine/install/disk", "value": "/dev/nvme0n1"}
]
```

### Adding a Sysctl

```json
[
    {"op": "add", "path": "/machine/sysctls/vm.max_map_count", "value": "262144"}
]
```

## Combining JSON Patches with Strategic Merge Patches

You can use both patch types in the same command. Talos distinguishes between them by format: if the patch is a JSON array starting with `[`, it is treated as a JSON Patch. If it is a YAML object, it is a strategic merge patch:

```bash
# Strategic merge patch for additions, JSON Patch for removal
talosctl apply-config --nodes 10.0.1.10 \
    --patch @additions.yaml \
    --patch '[{"op": "remove", "path": "/machine/kubelet/nodeLabels/old-label"}]'
```

This combination gives you the best of both worlds: the readability of strategic merge for most changes and the precision of JSON Patches for deletions and complex operations.

## Handling Paths with Special Characters

JSON Pointer has escape sequences for special characters:

- `~0` represents `~`
- `~1` represents `/`

So if you have a label with a slash (like `kubernetes.io/role`), the path would be:

```json
[
    {"op": "add", "path": "/machine/kubelet/nodeLabels/kubernetes.io~1role", "value": "worker"}
]
```

And if you have a field with a tilde:

```json
[
    {"op": "add", "path": "/machine/kubelet/nodeLabels/prefix~0suffix", "value": "true"}
]
```

## Error Handling

JSON Patches fail atomically. If any operation in the array fails, none of the operations are applied. Common failure reasons:

**Path does not exist (for replace and remove):**
```json
[{"op": "remove", "path": "/machine/kubelet/nodeLabels/nonexistent"}]
```
This fails because the path does not exist. Use `test` to check first, or handle the error in your script.

**Test operation fails:**
```json
[
    {"op": "test", "path": "/machine/network/hostname", "value": "expected-name"},
    {"op": "replace", "path": "/machine/network/hostname", "value": "new-name"}
]
```
If the hostname is not "expected-name", the entire patch is rejected.

**Array index out of bounds:**
```json
[{"op": "replace", "path": "/machine/network/nameservers/5", "value": "1.1.1.1"}]
```
This fails if there are fewer than 6 nameservers.

## Writing JSON Patches in YAML

Since Talos configuration files are YAML, you might find it more natural to write JSON Patches in YAML format (YAML is a superset of JSON):

```yaml
# patches/remove-old-labels.yaml
- op: remove
  path: /machine/kubelet/nodeLabels/old-label-1
- op: remove
  path: /machine/kubelet/nodeLabels/old-label-2
- op: add
  path: /machine/kubelet/nodeLabels/new-label
  value: "true"
```

This file can be used with `--patch @patches/remove-old-labels.yaml` and Talos will recognize it as a JSON Patch because it is a YAML array (which is equivalent to a JSON array).

## Building a Cleanup Patch

A common use case is cleaning up configurations during upgrades or migrations:

```yaml
# cleanup-patch.yaml
# Remove deprecated features and old labels
- op: remove
  path: /machine/kubelet/nodeLabels/beta.kubernetes.io~1arch
- op: remove
  path: /machine/kubelet/nodeLabels/beta.kubernetes.io~1os
- op: remove
  path: /machine/kubelet/extraArgs/feature-gates
- op: replace
  path: /machine/install/image
  value: "ghcr.io/siderolabs/installer:v1.7.0"
```

```bash
# Apply cleanup to all nodes
for node in 10.0.1.10 10.0.1.11 10.0.1.12 10.0.1.21 10.0.1.22; do
    echo "Cleaning up $node..."
    talosctl apply-config --nodes "$node" --patch @cleanup-patch.yaml --mode no-reboot
done
```

## Validating JSON Patches Before Applying

Preview the result of JSON Patches before applying to production:

```bash
# Apply the patch to a copy and inspect
talosctl machineconfig patch controlplane.yaml \
    --patch @my-json-patch.yaml \
    -o /tmp/patched.yaml

# Validate the result
talosctl validate --config /tmp/patched.yaml --mode metal

# Compare with the original
diff controlplane.yaml /tmp/patched.yaml
```

## Conclusion

JSON Patches (RFC 6902) fill the gaps that strategic merge patches leave, particularly around removing fields and performing precise list operations. While they are more verbose than strategic merge patches, they give you explicit control over exactly what changes are made to the configuration. The best approach is to use strategic merge patches for everyday changes and JSON Patches for deletions and complex operations. Together, they give you complete control over Talos Linux machine configuration management.

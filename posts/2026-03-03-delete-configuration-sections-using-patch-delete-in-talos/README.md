# How to Delete Configuration Sections Using patch delete in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Configuration, JSON Patch, Delete, Operations

Description: Learn how to remove configuration sections from Talos Linux machine configs using JSON Patch delete operations and strategic merge techniques.

---

Adding configuration to Talos Linux is straightforward, but removing it is less obvious. Strategic merge patches, the default patching method, cannot express deletion. When you need to remove a label, drop a network interface, or clear an unwanted configuration section, you need a different approach. This guide covers the methods for deleting configuration in Talos Linux, from simple field removal to cleaning up complex nested structures.

## Why Deletion Is Different

Strategic merge patches work by merging your patch document with the existing configuration. If you want to set a field, you include it in the patch. But there is no way to say "remove this field" in a strategic merge patch. Setting a field to `null`, empty string, or empty array does not reliably remove it.

For deletion, you need JSON Patches (RFC 6902), which have an explicit `remove` operation.

## Removing a Single Field

The most common deletion task is removing a single field like a node label:

```json
[
    {"op": "remove", "path": "/machine/kubelet/nodeLabels/deprecated-label"}
]
```

Apply it with talosctl:

```bash
# Remove a single label from a node
talosctl apply-config --nodes 10.0.1.10 \
    --patch '[{"op": "remove", "path": "/machine/kubelet/nodeLabels/deprecated-label"}]' \
    --mode no-reboot
```

You can write this in YAML format for readability:

```yaml
# remove-label.yaml
- op: remove
  path: /machine/kubelet/nodeLabels/deprecated-label
```

```bash
talosctl apply-config --nodes 10.0.1.10 --patch @remove-label.yaml --mode no-reboot
```

## Removing Multiple Fields

To remove several fields in one operation, include multiple remove operations in the same patch:

```yaml
# remove-multiple.yaml
- op: remove
  path: /machine/kubelet/nodeLabels/old-label-1
- op: remove
  path: /machine/kubelet/nodeLabels/old-label-2
- op: remove
  path: /machine/kubelet/nodeLabels/temp-label
```

```bash
talosctl apply-config --nodes 10.0.1.10 --patch @remove-multiple.yaml --mode no-reboot
```

All operations in a JSON Patch are atomic. If any one fails (for example, a path does not exist), none of the operations are applied.

## Removing a Network Interface

To remove a network interface from the configuration, you need to know its index in the interfaces array:

```bash
# First, check the current interfaces and their indices
talosctl get machineconfig --nodes 10.0.1.10 -o yaml | \
    yq '.machine.network.interfaces[] | .interface'
```

If the output shows:
```
eth0
eth1
```

And you want to remove eth1 (index 1):

```yaml
# remove-interface.yaml
# Safety check: verify we're removing the right interface
- op: test
  path: /machine/network/interfaces/1/interface
  value: eth1
# Remove it
- op: remove
  path: /machine/network/interfaces/1
```

The `test` operation is a safety net. If the order of interfaces changed and index 1 is no longer eth1, the patch fails instead of removing the wrong interface.

## Removing a VLAN

To remove a specific VLAN from an interface:

```yaml
# remove-vlan.yaml
# Assuming the VLAN is at index 0 of the vlans array on interface 0
- op: test
  path: /machine/network/interfaces/0/vlans/0/vlanId
  value: 100
- op: remove
  path: /machine/network/interfaces/0/vlans/0
```

## Removing Extra Kernel Arguments

```yaml
# remove-kernel-arg.yaml
# Remove a specific kernel argument by index
- op: test
  path: /machine/install/extraKernelArgs/0
  value: "net.core.somaxconn=65535"
- op: remove
  path: /machine/install/extraKernelArgs/0
```

When you remove an item from an array, subsequent indices shift down. Be aware of this when removing multiple items from the same array.

## Removing Sysctls

```yaml
# remove-sysctl.yaml
- op: remove
  path: /machine/sysctls/vm.max_map_count
```

## Removing Entire Sections

You can remove entire configuration sections:

```yaml
# remove-registries.yaml
# Remove all registry mirror configuration
- op: remove
  path: /machine/registries/mirrors
```

```yaml
# remove-extra-manifests.yaml
# Remove all extra manifests
- op: remove
  path: /cluster/extraManifests
```

Be careful with section-level removal. Removing a required section (like `cluster.controlPlane`) will cause validation to fail.

## Removing Certificate SANs

If you need to remove a specific SAN from the list:

```yaml
# remove-san.yaml
# First find the index of the SAN to remove
# Assuming "old-lb.example.com" is at index 2
- op: test
  path: /machine/certSANs/2
  value: old-lb.example.com
- op: remove
  path: /machine/certSANs/2
```

## Safe Deletion Pattern

The safest pattern for deletion combines `test` and `remove`:

```yaml
# safe-delete.yaml
# Step 1: Verify the value exists and is what we expect
- op: test
  path: /machine/kubelet/nodeLabels/temporary-flag
  value: "true"
# Step 2: Remove it
- op: remove
  path: /machine/kubelet/nodeLabels/temporary-flag
```

If the `test` fails (the field does not exist or has a different value), the entire patch is rejected and nothing changes. This prevents accidental deletion of the wrong data.

## Handling "Path Not Found" Errors

If you try to remove a path that does not exist, the patch fails:

```
error applying configuration: remove operation does not apply:
doc is missing path: /machine/kubelet/nodeLabels/nonexistent
```

To handle this gracefully in scripts, check for the field before attempting removal:

```bash
#!/bin/bash
# safe-remove-label.sh

NODE="10.0.1.10"
LABEL="deprecated-label"

# Check if the label exists
current_config=$(talosctl get machineconfig --nodes "$NODE" -o yaml)
if echo "$current_config" | yq ".machine.kubelet.nodeLabels.\"$LABEL\"" | grep -q null; then
    echo "Label '$LABEL' does not exist on $NODE, skipping"
else
    echo "Removing label '$LABEL' from $NODE"
    talosctl apply-config --nodes "$NODE" \
        --patch "[{\"op\": \"remove\", \"path\": \"/machine/kubelet/nodeLabels/$LABEL\"}]" \
        --mode no-reboot
fi
```

## Replacing Instead of Removing

Sometimes what you actually want is not to remove a field but to replace a list with a shorter one. In that case, a `replace` operation is more appropriate:

```yaml
# replace-nameservers.yaml
# Replace the nameservers list (removing the third one by providing only two)
- op: replace
  path: /machine/network/nameservers
  value:
    - 1.1.1.1
    - 8.8.8.8
```

This is more predictable than trying to remove individual items by index, especially when the list order might vary.

## Cleaning Up After Migration

A common use case for deletion is cleaning up configuration after a migration or upgrade. Here is a comprehensive cleanup patch:

```yaml
# post-migration-cleanup.yaml
# Remove deprecated labels
- op: remove
  path: /machine/kubelet/nodeLabels/beta.kubernetes.io~1arch
- op: remove
  path: /machine/kubelet/nodeLabels/beta.kubernetes.io~1os
# Remove old registry mirror
- op: remove
  path: /machine/registries/mirrors/old-registry.internal:5000
# Remove unused extra manifest
- op: test
  path: /cluster/extraManifests/0
  value: "https://old-server.example.com/manifests/deprecated.yaml"
- op: remove
  path: /cluster/extraManifests/0
```

Apply this across the cluster:

```bash
for node in 10.0.1.10 10.0.1.11 10.0.1.12 10.0.1.21 10.0.1.22; do
    echo "Cleaning up $node..."
    talosctl apply-config --nodes "$node" --patch @post-migration-cleanup.yaml --mode no-reboot || true
done
```

The `|| true` ensures the script continues even if a node does not have all the fields being removed (which is expected if cleanup was already partially done).

## Previewing Deletions

Always preview deletions before applying:

```bash
# Get the current config
talosctl get machineconfig --nodes 10.0.1.10 -o yaml > before.yaml

# Apply the delete patch to a copy
talosctl machineconfig patch before.yaml --patch @remove-patch.yaml -o after.yaml

# See what will be removed
diff before.yaml after.yaml
```

The diff clearly shows which lines are removed, giving you confidence before applying to a live node.

## Using machineconfig patch for Offline Deletion

For CI/CD pipelines where you build configurations offline:

```bash
# Start with the base config
talosctl gen config my-cluster https://10.0.1.100:6443 -o base/

# Apply additions with strategic merge
talosctl machineconfig patch base/controlplane.yaml \
    --patch @additions.yaml \
    -o staged/controlplane.yaml

# Apply deletions with JSON patch
talosctl machineconfig patch staged/controlplane.yaml \
    --patch @deletions.yaml \
    -o final/controlplane.yaml

# Validate the final result
talosctl validate --config final/controlplane.yaml --mode metal
```

## Resetting a Configuration Section to Default

If you want to reset a section to its default value rather than removing it entirely, use `replace` with the default value:

```yaml
# reset-kubelet-args.yaml
- op: replace
  path: /machine/kubelet/extraArgs
  value: {}
```

This clears all custom kubelet arguments without removing the `extraArgs` field itself.

## Conclusion

Deleting configuration sections in Talos Linux requires JSON Patches because strategic merge patches cannot express removal. The key operations are `remove` for deletion and `test` for safety verification. Always preview deletions before applying them, use `test` operations as safety nets, and handle the case where the field might not exist. For bulk cleanup operations, build a patch file with all the removals and apply it across the cluster. With these techniques, you have complete control over every aspect of your Talos configuration, including the ability to clean up and simplify as your cluster evolves.

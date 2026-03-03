# How to Roll Back a Failed Upgrade in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Rollback, Upgrade Failure, Recovery, Kubernetes Operations

Description: A practical guide to rolling back failed upgrades in Talos Linux, covering automatic rollback, manual recovery, and strategies for restoring cluster health.

---

Upgrades do not always go smoothly. Hardware incompatibilities, kernel regressions, extension conflicts, or unexpected configuration issues can cause a Talos Linux upgrade to fail. The good news is that Talos has built-in rollback capabilities and several recovery paths. This guide covers everything you need to know about rolling back from a failed upgrade.

## How Automatic Rollback Works

Talos Linux uses an A/B boot scheme that provides automatic rollback protection. When you upgrade a node, Talos writes the new version to the inactive boot slot while keeping the current working version in the active slot. After rebooting, the bootloader tries the new version. If the new version fails to boot successfully, the bootloader automatically reverts to the previous version on the next reboot.

```text
Before Upgrade:
  Slot A: v1.6.0 (active - working)
  Slot B: v1.5.0 (inactive - previous)

After Upgrade Initiated:
  Slot A: v1.6.0 (still active)
  Slot B: v1.7.0 (new version written here)

On Reboot - New Version Attempted:
  Slot B: v1.7.0 (trying to boot)

If Boot Fails:
  Slot A: v1.6.0 (automatically reverted to this)
```

This automatic rollback happens at the bootloader level, so it works even if the new kernel panics or the Talos init system fails to start.

## Detecting a Failed Upgrade

After initiating an upgrade, monitor the node to see if it succeeds:

```bash
# Check the version after the node reboots
talosctl version --nodes 192.168.1.10

# If the version is still the OLD version, automatic rollback happened
# Expected: v1.7.0 (new)
# Actual: v1.6.0 (old) = rollback occurred
```

Other signs of a failed upgrade:

```bash
# Node takes longer than expected to come back
# Try pinging or connecting after a few minutes
talosctl health --nodes 192.168.1.10 --wait-timeout 10m

# Check system events for boot errors
talosctl dmesg --nodes 192.168.1.10

# Check for machine status events
talosctl get events --nodes 192.168.1.10
```

If the node comes back on the old version, the automatic rollback worked. If the node does not come back at all, you may need manual intervention.

## Common Upgrade Failure Causes

Understanding why an upgrade failed helps you plan your next steps:

### Kernel Driver Incompatibility

A new Talos version may include a different kernel that lacks a driver your hardware needs:

```bash
# Check kernel logs for driver errors
talosctl dmesg --nodes 192.168.1.10 | grep -i "error\|fail\|missing"
```

### Extension Conflicts

If you use custom system extensions, a new Talos version might be incompatible with the extension version you are using:

```bash
# Check installed extensions
talosctl get extensions --nodes 192.168.1.10
```

### Configuration Incompatibility

New Talos versions sometimes change or deprecate configuration options:

```bash
# Validate your configuration against the new version
talosctl validate --config controlplane.yaml --mode metal
```

### Network Configuration Issues

The new version might handle network configuration differently, leaving the node unreachable:

```bash
# If the node is unreachable, you may need console access
# Check if the node got a different IP address
# or if the network interface naming changed
```

## Manual Rollback Procedures

### Rolling Back a Running Node

If the node booted the new version but has issues (services not starting, Kubernetes not working, etc.), you can manually roll back by upgrading to the previous version:

```bash
# Roll back to the previous Talos version
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.6.0

# Wait for the node to reboot and come back on the old version
talosctl version --nodes 192.168.1.10
```

This is the simplest manual rollback. You are essentially "upgrading" to an older version, which writes the old version to the inactive slot and reboots into it.

### Rolling Back an Unreachable Node

If the node is completely unreachable (no network, no Talos API), you need physical or console access:

**Option 1: Wait for automatic rollback**

If the node keeps trying to boot the new version and failing, the bootloader should eventually revert to the old version. This may take a few reboot cycles.

**Option 2: Boot from ISO**

If automatic rollback does not work, boot the node from a Talos ISO:

```bash
# Boot from ISO (via virtual console, IPMI, or physical access)
# The node will enter maintenance mode

# Apply the machine configuration to reinstall the old version
talosctl apply-config --nodes 192.168.1.10 \
  --file controlplane.yaml --insecure
```

**Option 3: Reset and reinstall**

As a last resort, reset the node and start fresh:

```bash
# If you can reach the node via talosctl
talosctl reset --nodes 192.168.1.10 --graceful=false

# Then boot from ISO and apply configuration
talosctl apply-config --nodes 192.168.1.10 \
  --file controlplane.yaml --insecure
```

## Rolling Back a Kubernetes Upgrade

If you upgraded Kubernetes (not Talos OS) and it failed, roll back the Kubernetes version:

```bash
# Roll back Kubernetes to the previous version
talosctl upgrade-k8s --nodes 192.168.1.10 \
  --to 1.29.0  # Previous Kubernetes version
```

This rolls back the API server, controller manager, scheduler, and kubelet to the previous version.

If the API server is completely down and `talosctl upgrade-k8s` cannot connect:

```bash
# Manually patch the machine config to revert the Kubernetes version
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '[{"op": "replace", "path": "/cluster/apiServer/image", "value": "registry.k8s.io/kube-apiserver:v1.29.0"}]'
```

## Rolling Back Control Plane Nodes

Control plane rollbacks are more sensitive because of etcd:

```bash
# Step 1: Check etcd health
talosctl etcd status --nodes 192.168.1.10
talosctl etcd members --nodes 192.168.1.10

# Step 2: If etcd is healthy, roll back the node
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.6.0

# Step 3: After the rollback, verify etcd
talosctl etcd status --nodes 192.168.1.10
```

If etcd lost quorum during the failed upgrade:

```bash
# Restore etcd from a snapshot (if you took one before upgrading)
talosctl etcd recover --nodes 192.168.1.10 \
  --snapshot /tmp/etcd-pre-upgrade.snapshot

# Or bootstrap a new etcd cluster on the recovered node
talosctl bootstrap --nodes 192.168.1.10
```

This is why taking etcd snapshots before every upgrade is so important.

## Recovery When Multiple Nodes Failed

If you were doing a rolling upgrade and multiple nodes failed:

```bash
# Step 1: Assess the situation
kubectl get nodes  # See which nodes are still healthy
talosctl etcd members --nodes <healthy-cp-node>

# Step 2: Roll back failed nodes one at a time
for NODE in 192.168.1.10 192.168.1.20 192.168.1.21; do
  echo "Rolling back $NODE..."
  talosctl upgrade --nodes "$NODE" \
    --image ghcr.io/siderolabs/installer:v1.6.0

  echo "Waiting for $NODE..."
  talosctl health --nodes "$NODE" --wait-timeout 10m

  echo "$NODE recovered"
done

# Step 3: Verify full cluster health
kubectl get nodes
talosctl etcd status --nodes 192.168.1.10
```

## Preventing Upgrade Failures

While rollback capabilities are essential, preventing failures in the first place is better:

1. **Always test upgrades in staging first.** Maintain a staging cluster that mirrors your production hardware and configuration.

2. **Read release notes thoroughly.** Breaking changes and known issues are documented.

3. **Use the staged upgrade approach.** Stage the upgrade without rebooting, then reboot during a maintenance window:

```bash
# Stage the upgrade
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --stage

# Node will upgrade on next reboot
# Reboot when ready
talosctl reboot --nodes 192.168.1.10
```

4. **Upgrade one node at a time.** Never upgrade all nodes simultaneously. A rolling approach limits the blast radius.

5. **Take backups before every upgrade.** etcd snapshots and machine configuration backups are your safety net.

```bash
# Pre-upgrade backup script
talosctl etcd snapshot /tmp/etcd-$(date +%Y%m%d).snapshot --nodes 192.168.1.10
talosctl get machineconfig --nodes 192.168.1.10 -o yaml > cp-01-$(date +%Y%m%d).yaml
```

6. **Validate extension compatibility.** If you use custom extensions, check that they have versions compatible with the target Talos version before upgrading.

## Creating an Upgrade Runbook

Document your upgrade and rollback procedures in a runbook that your team can follow:

```markdown
Upgrade Runbook:
  Pre-Upgrade:
    - [ ] Read release notes for target version
    - [ ] Test upgrade in staging
    - [ ] Take etcd snapshot
    - [ ] Backup machine configurations
    - [ ] Verify cluster health
    - [ ] Notify team of maintenance window

  During Upgrade:
    - [ ] Upgrade CP nodes one at a time
    - [ ] Verify health between each CP node
    - [ ] Upgrade worker nodes one at a time
    - [ ] Monitor for issues throughout

  Rollback Triggers:
    - Node does not come back within 10 minutes
    - etcd loses quorum
    - Kubernetes API becomes unresponsive
    - More than 2 nodes fail

  Rollback Procedure:
    - Stop upgrading further nodes
    - Roll back failed nodes to previous version
    - Verify cluster recovers
    - Investigate root cause before retrying
```

## Conclusion

Talos Linux provides strong rollback capabilities through its A/B boot scheme and the ability to "upgrade" to a previous version. Automatic rollback handles the most common failure scenario where the new kernel or initramfs fails to boot. For more complex failures, manual rollback procedures using `talosctl upgrade` with the old version or reinstalling from an ISO give you paths to recovery. The best strategy, though, is prevention: test upgrades in staging, take backups, read release notes, and always upgrade one node at a time.

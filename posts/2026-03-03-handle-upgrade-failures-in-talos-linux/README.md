# How to Handle Upgrade Failures in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Upgrade Failure, Troubleshooting, Recovery, Kubernetes Operations

Description: A comprehensive guide to diagnosing, recovering from, and preventing upgrade failures in Talos Linux, including automatic rollback, manual recovery, and root cause analysis.

---

Upgrade failures in Talos Linux can be stressful, but they are manageable if you know what to look for and how to respond. Talos has built-in safety mechanisms that handle many failure scenarios automatically, and for the cases that need manual intervention, there are clear recovery paths. This guide covers the full spectrum of upgrade failures and how to handle each one.

## Types of Upgrade Failures

Upgrade failures generally fall into a few categories:

**Pre-reboot failures** - The upgrade command fails before the node reboots. The node continues running the old version normally.

**Boot failures** - The node reboots but the new version fails to start. Automatic rollback kicks in.

**Post-boot failures** - The new version boots but services fail to start properly (Kubernetes, etcd, networking).

**Partial cluster failures** - Some nodes upgrade successfully while others fail, leaving the cluster in a mixed state.

Each type requires a different response strategy.

## Handling Pre-Reboot Failures

These are the easiest to handle because the node never left its working state.

### Image Pull Failure

```bash
# Symptom: upgrade command returns an error about pulling the image
# Error: failed to pull installer image

# Diagnosis:
# Check if the image exists
crane manifest ghcr.io/siderolabs/installer:v1.7.0

# Check network connectivity from the node
talosctl get addresses --nodes 192.168.1.10
talosctl get resolvers --nodes 192.168.1.10

# Fix: Use the correct image reference or fix network issues
# Then retry the upgrade
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

### Insufficient Disk Space

```bash
# Symptom: upgrade fails because there is not enough space
# to download and stage the new image

# Diagnosis:
talosctl get mounts --nodes 192.168.1.10

# Fix: Free up space first
# Configure more aggressive image garbage collection
# or drain the node and reset the EPHEMERAL partition
```

### Validation Errors

```bash
# Symptom: upgrade command rejects the operation
# due to configuration validation failures

# Diagnosis:
talosctl validate --config controlplane.yaml --mode metal

# Fix: Address the validation errors in your configuration
# before retrying the upgrade
```

## Handling Boot Failures (Automatic Rollback)

When the new version fails to boot, Talos automatically rolls back to the previous working version. This is the most common type of upgrade failure and is handled gracefully.

### Detecting Automatic Rollback

```bash
# After the upgrade, check which version is running
talosctl version --nodes 192.168.1.10

# If the version is the OLD version, rollback happened
# Expected: v1.7.0 (new)
# Actual:   v1.6.0 (old) = automatic rollback

# The node is running normally on the old version
```

### Investigating the Failure

```bash
# Check boot logs for errors
talosctl dmesg --nodes 192.168.1.10 | grep -i "error\|panic\|fail"

# Check machine status
talosctl get machinestatus --nodes 192.168.1.10

# Check system events
talosctl get events --nodes 192.168.1.10
```

Common reasons for boot failures:
- Kernel driver missing for critical hardware (storage controller, network adapter)
- Extension incompatibility with the new kernel version
- Firmware incompatibility

### Recovery Actions

Since the node rolled back automatically, no immediate recovery is needed. The node is running fine on the old version. To address the root cause:

```bash
# If it is a missing driver issue, build a custom image with the needed extension
docker run --rm -t -v /tmp/out:/out \
  ghcr.io/siderolabs/imager:v1.7.0 \
  installer \
  --system-extension-image ghcr.io/siderolabs/some-driver-extension:v1.7.0

# Push and retry with the custom image
crane push /tmp/out/installer-amd64.tar myregistry.com/talos-installer:v1.7.0-custom
talosctl upgrade --nodes 192.168.1.10 \
  --image myregistry.com/talos-installer:v1.7.0-custom
```

## Handling Post-Boot Failures

Sometimes the new version boots successfully (kernel starts, network comes up) but higher-level services fail. This is trickier because the automatic boot-level rollback has already passed.

### Kubernetes Fails to Start

```bash
# Check kubelet status
talosctl get services --nodes 192.168.1.10

# Check kubelet logs
talosctl logs kubelet --nodes 192.168.1.10

# Common issues:
# - kubelet version incompatible with API server
# - CNI plugin not compatible with new Talos version
# - Certificate issues
```

### etcd Fails on Control Plane Node

```bash
# Check etcd status
talosctl etcd status --nodes 192.168.1.10

# Check etcd logs
talosctl logs etcd --nodes 192.168.1.10

# Check etcd member list from a healthy node
talosctl etcd members --nodes 192.168.1.11

# If etcd cannot start, check for data directory issues
talosctl get events --nodes 192.168.1.10 | grep etcd
```

### Network Connectivity Issues

```bash
# Check network interface status
talosctl get addresses --nodes 192.168.1.10
talosctl get links --nodes 192.168.1.10
talosctl get routes --nodes 192.168.1.10

# If the node got a different IP, update your talosctl endpoint
# Check if the network interface names changed in the new version
```

### Manual Rollback for Post-Boot Failures

If the new version booted but services are broken, manually roll back:

```bash
# Roll back to the previous version
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.6.0

# Wait for the rollback to complete
sleep 30
talosctl health --nodes 192.168.1.10 --wait-timeout 10m

# Verify the old version is running
talosctl version --nodes 192.168.1.10
```

## Handling Partial Cluster Failures

During a rolling upgrade, some nodes may succeed while others fail. This leaves the cluster in a mixed-version state.

### Assessing the Situation

```bash
# Check which nodes are on which version
for NODE in 192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21; do
  VER=$(talosctl version --nodes "$NODE" --short 2>/dev/null | grep "Tag:" | tail -1 | awk '{print $2}')
  echo "$NODE: $VER"
done

# Check cluster health
kubectl get nodes
talosctl etcd members --nodes 192.168.1.10
```

### Decision: Forward or Back?

You have two options:

**Option A: Fix failed nodes and continue upgrading**

```bash
# If only a few nodes failed, investigate and fix the issue
# Then retry the upgrade on those specific nodes
talosctl upgrade --nodes 192.168.1.12 \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

**Option B: Roll back all nodes to the old version**

```bash
# Roll back the nodes that were already upgraded
for NODE in 192.168.1.10 192.168.1.11; do
  talosctl upgrade --nodes "$NODE" \
    --image ghcr.io/siderolabs/installer:v1.6.0
  sleep 30
  talosctl health --nodes "$NODE" --wait-timeout 10m
done
```

The choice depends on the nature of the failure. If it is a known issue with a workaround, continue forward. If the cause is unknown, rolling back is safer.

## etcd Quorum Loss Recovery

The most serious upgrade failure is losing etcd quorum. This can happen if two or more control plane nodes fail simultaneously.

```bash
# Check if etcd has quorum
talosctl etcd status --nodes 192.168.1.10

# If quorum is lost, you need to recover from a snapshot
# or bootstrap a new etcd cluster

# Option 1: Recover from snapshot (preferred)
talosctl etcd recover --nodes 192.168.1.10 \
  --snapshot /tmp/etcd-pre-upgrade.snapshot

# Option 2: Bootstrap new cluster (last resort)
# This requires resetting all control plane nodes
# and starting fresh with the etcd cluster
talosctl bootstrap --nodes 192.168.1.10
```

This is why you should always take an etcd snapshot before upgrading and never upgrade multiple control plane nodes simultaneously.

## Building an Upgrade Failure Runbook

Document your failure handling procedures so your team can respond quickly:

```text
Upgrade Failure Response Runbook:

1. Identify the failure type:
   a. Pre-reboot failure -> Fix the issue and retry
   b. Boot failure (auto-rollback) -> Investigate, build custom image if needed
   c. Post-boot service failure -> Manual rollback, investigate
   d. Partial cluster failure -> Assess and decide forward/back
   e. etcd quorum loss -> Recover from snapshot

2. Immediate actions:
   - Stop upgrading further nodes
   - Check cluster health (kubectl get nodes, etcd status)
   - Check the failed node (talosctl version, dmesg, logs)

3. Collect diagnostic information:
   - talosctl dmesg
   - talosctl get events
   - talosctl logs <service>
   - talosctl get services

4. Recovery:
   - For auto-rollback: Investigate and retry with fixes
   - For post-boot failure: talosctl upgrade --image <old-version>
   - For etcd quorum loss: talosctl etcd recover

5. Post-recovery:
   - Verify all nodes are healthy
   - Verify workloads are running
   - Document the failure and root cause
   - Update the upgrade procedure if needed
```

## Preventing Upgrade Failures

The best way to handle upgrade failures is to prevent them:

### Test in Staging

```bash
# Maintain a staging cluster that mirrors production
# Always test upgrades there first
talosctl upgrade --nodes staging-cp-01 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Run your full test suite against the staging cluster
# before touching production
```

### Read Release Notes

Check for breaking changes, deprecated features, and known issues in the release notes. Pay special attention to:
- Kernel version changes (may affect hardware drivers)
- API changes (may affect your automation)
- Extension compatibility changes

### Verify Extension Compatibility

```bash
# Before upgrading, check that your extensions have versions
# compatible with the target Talos version
crane ls ghcr.io/siderolabs/nvidia-container-toolkit | grep v1.7

# Build and test the custom image before using it for upgrades
```

### Use Staged Upgrades

```bash
# Stage the upgrade first
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --stage

# This downloads and stages the image without rebooting
# You can then reboot at a controlled time
```

### Maintain Backups

```bash
# Always take backups before upgrading
talosctl etcd snapshot /tmp/etcd-$(date +%Y%m%d-%H%M).snapshot \
  --nodes 192.168.1.10

# Backup machine configurations
for NODE in 192.168.1.10 192.168.1.11 192.168.1.12; do
  talosctl get machineconfig --nodes "$NODE" -o yaml > \
    "config-$(echo $NODE | tr '.' '-')-$(date +%Y%m%d).yaml"
done
```

## Conclusion

Upgrade failures in Talos Linux range from simple image pull errors to complex scenarios like etcd quorum loss. The key to handling them well is understanding the failure type, having a clear response procedure, and maintaining good backups. Talos's automatic rollback handles the most common failure scenario (boot failures) without any intervention. For everything else, a combination of diagnostic commands, manual rollback capabilities, and a well-documented runbook will get you through any upgrade challenge.

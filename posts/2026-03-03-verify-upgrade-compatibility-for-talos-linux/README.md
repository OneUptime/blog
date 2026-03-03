# How to Verify Upgrade Compatibility for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Upgrade Compatibility, Version Management, Cluster Operations

Description: A thorough guide to verifying compatibility before upgrading Talos Linux to prevent breakages and ensure smooth transitions.

---

Verifying upgrade compatibility before pulling the trigger on a Talos Linux upgrade is one of those steps that separates smooth upgrades from painful rollbacks. Talos Linux tightly couples the OS layer with Kubernetes, and each version has specific compatibility requirements. Getting this wrong can leave you with broken clusters, failed workloads, or worse - data loss. Let us walk through everything you need to check.

## The Compatibility Matrix

Talos Linux has three major compatibility dimensions:

1. Talos OS version to Kubernetes version mapping
2. Talos OS version to version upgrade path (which versions you can upgrade from)
3. System extensions compatibility with the target Talos version

Each of these needs to be verified independently.

## Checking Talos to Kubernetes Version Compatibility

Every Talos release supports a specific range of Kubernetes versions. Running an unsupported Kubernetes version on a given Talos release can cause subtle or not-so-subtle failures.

```bash
# Check your current Talos and Kubernetes versions
talosctl version --nodes <node-ip>

# The output will show both the Talos version and the
# Kubernetes version running on the node
```

Visit the Talos release notes or documentation to confirm that your current Kubernetes version is supported by the target Talos version. If you need to upgrade Kubernetes as well, plan that as a separate step - either before or after the Talos upgrade, depending on the compatibility matrix.

```bash
# Check the Kubernetes version on the cluster
kubectl version --short

# List what Kubernetes versions the current Talos supports
# This information is in the release notes and documentation
```

As a general rule, Talos version N supports Kubernetes versions from the previous few minor releases. For example, Talos v1.7 might support Kubernetes v1.28 through v1.30.

## Verifying the Upgrade Path

Talos supports upgrading one minor version at a time. You cannot jump from v1.5 to v1.7 directly - you need to go through v1.6 first.

```bash
# Check your current version
talosctl version --nodes <node-ip>

# Example output:
# Tag:         v1.6.4
# If you want to reach v1.7.0, this is a valid single-step upgrade
# If you want to reach v1.8.0, you need v1.7.x first
```

Patch version upgrades within the same minor version (e.g., v1.6.3 to v1.6.7) are always safe and straightforward.

For the upgrade path verification:

```bash
# Document all node versions in your cluster
talosctl version --nodes <node1>,<node2>,<node3>,<node4>,<node5>

# All nodes should be on the same minor version before
# beginning an upgrade to the next minor version
```

If some nodes are on different versions, bring them all to the same version first.

## Checking Machine Configuration Compatibility

The machine configuration schema evolves between Talos versions. Fields get added, deprecated, or restructured. If your machine config uses deprecated fields, the upgrade might fail or behave unexpectedly.

```bash
# Retrieve current machine configs
talosctl get machineconfig --nodes <node-ip> -o yaml > current-config.yaml

# Validate the config against the target version's schema
# Use talosctl from the target version to validate
talosctl validate --config current-config.yaml --mode metal
```

Pay attention to:

- Deprecated fields that will be removed in the target version
- New required fields that need to be added
- Changed field formats or value types
- Renamed or relocated configuration sections

```bash
# Compare config schemas between versions
# Download talosctl for both versions and validate
# the same config with each

# Current version validation
./talosctl-v1.6 validate --config current-config.yaml --mode metal

# Target version validation
./talosctl-v1.7 validate --config current-config.yaml --mode metal
```

If the target version validation fails, update your machine configuration before attempting the upgrade.

## Verifying System Extension Compatibility

System extensions are version-locked to specific Talos releases. An extension built for Talos v1.6 will not work on Talos v1.7.

```bash
# List currently installed extensions
talosctl get extensions --nodes <node-ip>

# Example output:
# NODE          NAMESPACE   TYPE              ID                VERSION
# 10.0.0.1      runtime     ExtensionStatus   iscsi-tools       1
# 10.0.0.1      runtime     ExtensionStatus   qemu-guest-agent  1
```

For each extension, verify that a compatible version exists for the target Talos release. Check the Talos Extensions repository or Image Factory.

```bash
# Check available extensions for the target version
# Visit https://factory.talos.dev or check
# https://github.com/siderolabs/extensions

# Generate a new installer image with compatible extensions
# using Image Factory if needed
```

If an extension you depend on does not yet have a compatible version for the target Talos release, you have two options:

1. Wait for the extension to be updated
2. Proceed without that extension (if it is not critical)

## Checking Hardware and Platform Compatibility

Talos runs on various platforms - bare metal, VMware, AWS, GCP, Azure, and others. Each platform may have specific considerations:

```bash
# Check which platform your Talos installation uses
talosctl get machineconfig --nodes <node-ip> -o yaml | grep -A5 "install:"

# Check for platform-specific changes in the release notes
# Some upgrades may require new disk layouts, driver changes,
# or platform-specific configurations
```

For bare metal specifically, check:

- Kernel module compatibility for your hardware
- Network driver support in the new kernel
- Storage controller driver support
- Firmware requirements

## Validating etcd Compatibility

The bundled etcd version changes between Talos releases. While etcd upgrades are generally backward-compatible, it is worth checking.

```bash
# Check current etcd version
talosctl etcd status --nodes <control-plane-ip>

# Check etcd health before upgrade
talosctl etcd members --nodes <control-plane-ip>
```

Make sure etcd is healthy before starting any upgrade. An unhealthy etcd cluster going into an upgrade is a recipe for disaster.

## Running a Compatibility Pre-Check Script

You can automate these checks with a simple script:

```bash
#!/bin/bash
# pre-upgrade-compatibility-check.sh

TARGET_VERSION="v1.7.0"
NODES="10.0.0.1,10.0.0.2,10.0.0.3,10.0.0.4"
CP_NODE="10.0.0.1"

echo "=== Current Versions ==="
talosctl version --nodes ${NODES}

echo ""
echo "=== etcd Health ==="
talosctl etcd status --nodes ${CP_NODE}
talosctl etcd members --nodes ${CP_NODE}

echo ""
echo "=== Installed Extensions ==="
talosctl get extensions --nodes ${CP_NODE}

echo ""
echo "=== Machine Config Validation ==="
talosctl get machineconfig --nodes ${CP_NODE} -o yaml > /tmp/config-check.yaml
talosctl validate --config /tmp/config-check.yaml --mode metal

echo ""
echo "=== Kubernetes Version ==="
kubectl version --short

echo ""
echo "=== Node Status ==="
kubectl get nodes -o wide

echo ""
echo "=== Pod Health ==="
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

echo ""
echo "Pre-upgrade compatibility check complete."
echo "Target version: ${TARGET_VERSION}"
echo "Review the output above for any issues."
```

## Creating a Compatibility Checklist

Before every upgrade, walk through this checklist:

- [ ] Current Talos version is within one minor version of target
- [ ] Target Talos version supports current Kubernetes version
- [ ] Machine configuration validates against target version schema
- [ ] All system extensions have compatible versions available
- [ ] etcd cluster is healthy with all members present
- [ ] All nodes are Ready in Kubernetes
- [ ] No pods in error states that could be confused with upgrade issues
- [ ] Release notes reviewed for breaking changes
- [ ] Backup of etcd and machine configs taken

## Summary

Compatibility verification is the most important pre-upgrade step for Talos Linux. Check the version upgrade path, Kubernetes compatibility, machine config schema changes, system extension availability, and platform-specific requirements. Run these checks methodically and do not skip any of them. The 15 minutes you spend verifying compatibility can save you hours of troubleshooting a broken cluster.

# Rolling Back Safely After Using calicoctl node checksystem

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, System Requirements, Rollback, Kubernetes

Description: Understand that calicoctl node checksystem is read-only and learn how to revert system changes made to satisfy its requirements if those changes cause problems.

---

## Introduction

The `calicoctl node checksystem` command is entirely read-only. It inspects the system but does not modify anything. However, the remediation steps you take after running checksystem, such as loading kernel modules, changing sysctl parameters, or installing packages, can potentially cause issues.

This guide covers how to safely revert system changes made to satisfy Calico's requirements, in case those changes cause unintended side effects on your host.

## Prerequisites

- A host where system changes were made based on checksystem output
- Root access
- Knowledge of what was changed

## Reverting Kernel Module Loading

If a loaded module causes issues:

```bash
# Check if a module is in use
lsmod | grep <module-name>

# Unload a module (only if not in use)
sudo modprobe -r <module-name>

# Remove from persistent loading
sudo rm /etc/modules-load.d/calico.conf
# Or edit to remove specific modules
sudo vi /etc/modules-load.d/calico.conf
```

Note: Unloading kernel modules while Calico is running is dangerous and will break networking.

## Reverting sysctl Changes

```bash
# Remove Calico sysctl configuration
sudo rm /etc/sysctl.d/99-calico.conf

# Restore previous IP forwarding setting
sudo sysctl -w net.ipv4.ip_forward=0

# Reload all sysctl from remaining config files
sudo sysctl --system
```

## Reverting Package Installations

```bash
# Remove kernel-modules-extra if it was installed
# Ubuntu/Debian
sudo apt remove linux-modules-extra-$(uname -r)

# RHEL/CentOS
sudo yum remove kernel-modules-extra
```

## Safe Rollback Procedure

```bash
#!/bin/bash
# rollback-system-changes.sh
# Reverts system changes made for Calico prerequisites
# WARNING: Only run this if you are removing Calico from the node

echo "WARNING: This will revert system changes made for Calico."
echo "Calico will stop functioning correctly after this."
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Stop Calico first
echo "Stopping Calico..."
docker stop calico-node 2>/dev/null || kubectl delete pod -n calico-system -l k8s-app=calico-node --field-selector spec.nodeName=$(hostname) 2>/dev/null

# Remove persistent module loading
echo "Removing module persistence..."
sudo rm -f /etc/modules-load.d/calico.conf

# Remove sysctl settings
echo "Removing sysctl settings..."
sudo rm -f /etc/sysctl.d/99-calico.conf
sudo sysctl --system

echo "System changes reverted. Reboot recommended."
```

## Verification

After reverting:

```bash
# Verify sysctl is reverted
sysctl net.ipv4.ip_forward

# Verify module loading config is removed
ls /etc/modules-load.d/

# Note: loaded modules remain in memory until reboot
lsmod | grep ip_tables
```

## Troubleshooting

- **Cannot unload module: "module is in use"**: Stop Calico and any other services using the module first. In some cases, a reboot is required.
- **System behaves differently after revert**: Some modules may have been needed by other services. Check what else depends on the removed configuration.
- **IP forwarding revert breaks other services**: If you run containers or VMs, they likely need IP forwarding enabled regardless of Calico.

## Conclusion

Since `calicoctl node checksystem` is read-only, rollback is only needed for the system changes you made in response to its output. Always understand the broader implications before reverting kernel modules or sysctl settings, as other services on the host may depend on them.

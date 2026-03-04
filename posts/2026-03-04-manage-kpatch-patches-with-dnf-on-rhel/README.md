# How to Manage kpatch Patches with DNF on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, kpatch, DNF, Patching, Security

Description: Use DNF to search, install, update, and manage kpatch kernel live patches on RHEL, integrating live patching into your standard package management workflow.

---

On RHEL, kpatch modules are delivered as standard RPM packages through the live patching repository. This means you can manage them with DNF just like any other package, making live patching easy to integrate into existing workflows.

## Enable the Live Patching Repository

```bash
# Register the system if not already done
sudo subscription-manager register --username=your_user --password=your_pass
sudo subscription-manager attach --auto

# Enable the live patching repository for RHEL 9
sudo subscription-manager repos --enable=rhel-9-for-x86_64-livepatch-rpms

# Verify the repo is active
sudo dnf repolist | grep livepatch
```

## Search for Available kpatch Packages

```bash
# List all kpatch packages available
sudo dnf list available 'kpatch-patch*'

# Search for patches matching your kernel version
KVER=$(uname -r | sed 's/\.[^.]*$//' | sed 's/\./_/g' | sed 's/-/_/g')
sudo dnf list available "kpatch-patch-${KVER}*"

# Show detailed info about a specific kpatch package
sudo dnf info kpatch-patch-5_14_0-362_8_1-el9_3
```

## Install kpatch Patches

```bash
# Install the kpatch module for your running kernel
sudo dnf install -y kpatch-patch-5_14_0-362_8_1-el9_3

# The module is loaded automatically after installation
# Verify it is active
kpatch list
```

## Update kpatch Patches

kpatch updates are cumulative. Each new release includes all previous fixes:

```bash
# Check for kpatch updates
sudo dnf check-update 'kpatch-patch*'

# Update all kpatch packages
sudo dnf update -y 'kpatch-patch*'

# Verify the updated patch is loaded
kpatch list
```

## List Installed kpatch Packages

```bash
# Show all installed kpatch packages
sudo dnf list installed 'kpatch-patch*'

# Show changelog to see which CVEs are fixed
rpm -q --changelog kpatch-patch-5_14_0-362_8_1-el9_3 | head -30
```

## Remove kpatch Packages

```bash
# Remove a kpatch package (unloads the module)
sudo dnf remove kpatch-patch-5_14_0-362_8_1-el9_3

# Verify it was unloaded
kpatch list
```

## Automate with dnf-automatic

Set up automatic kpatch installation:

```bash
# Install dnf-automatic
sudo dnf install -y dnf-automatic

# Configure for security updates only
sudo vi /etc/dnf/automatic.conf
```

```ini
[commands]
upgrade_type = security
apply_updates = yes

[emitters]
emit_via = stdio
```

```bash
# Enable the timer
sudo systemctl enable --now dnf-automatic.timer

# Check the timer status
systemctl status dnf-automatic.timer
```

## Track kpatch History

```bash
# View DNF history for kpatch transactions
sudo dnf history list | head -20

# Get details of a specific transaction
sudo dnf history info <transaction_id>
```

## Clean Up Old kpatch Packages

After rebooting to a new kernel, old kpatch packages for the previous kernel are no longer needed:

```bash
# Find kpatch packages for kernels no longer installed
sudo dnf list installed 'kpatch-patch*'

# Remove patches for old kernels
sudo dnf remove kpatch-patch-5_14_0-284_11_1-el9_2
```

Managing kpatch through DNF keeps live patching consistent with your existing RHEL package management practices and enables straightforward automation.

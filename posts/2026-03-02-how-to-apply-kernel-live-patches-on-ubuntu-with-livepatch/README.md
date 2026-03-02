# How to Apply Kernel Live Patches on Ubuntu with Livepatch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Linux Kernel, Canonical Livepatch, System Administration

Description: Learn how to enable Canonical Livepatch on Ubuntu to apply kernel security patches without rebooting, reducing maintenance windows and keeping production systems protected between scheduled reboots.

---

Kernel security vulnerabilities require patching the running kernel, which traditionally means a reboot. For production systems with strict availability requirements, rebooting to apply a kernel patch means either accepting risk during the delay or incurring downtime. Canonical Livepatch solves this by applying patches directly to the running kernel without requiring a reboot.

## What Livepatch Does

Livepatch applies patches to the live kernel in memory. It handles critical security vulnerabilities - the kind that would otherwise require an emergency reboot. It doesn't replace regular kernel updates; it buys time between scheduled maintenance windows.

After a Livepatch is applied:
- The running kernel has the fix without a reboot
- A full kernel update and reboot is still needed eventually (usually scheduled)
- Systems stay protected during the window between detecting a vulnerability and the next maintenance window

## Requirements and Pricing

Canonical Livepatch is:
- **Free** for personal use (up to 3 machines with an Ubuntu One account)
- Included with **Ubuntu Pro** subscriptions
- Available for Ubuntu LTS releases on the generic and aws/azure/gcp kernels

Ubuntu Pro is free for personal and small commercial use (up to 5 machines). Larger deployments require a paid subscription.

## Setting Up Ubuntu Pro and Livepatch

### Getting an Ubuntu Pro Token

1. Create or log in to an Ubuntu One account at https://ubuntu.com/pro
2. Go to your Pro dashboard
3. Copy your token (starts with `C1...`)

### Attaching Ubuntu Pro

```bash
# Install the ubuntu-advantage-tools package (likely already installed)
sudo apt install ubuntu-advantage-tools -y

# Attach to Ubuntu Pro with your token
sudo pro attach <your-token>
```

You'll see output confirming which services are available:

```
Attaching the machine...
Enabling default service esm-apps
Ubuntu Pro: ESM Apps enabled
Enabling default service esm-infra
Ubuntu Pro: ESM Infra enabled
This machine is now attached to 'Ubuntu Pro (personal)'
```

### Enabling Livepatch

```bash
# Enable the Livepatch service
sudo pro enable livepatch
```

Output:

```
One moment, checking your subscription first
Updating package lists
Installing snap 'canonical-livepatch'
Canonical Livepatch enabled.
```

## Checking Livepatch Status

```bash
# Status of the livepatch daemon
sudo canonical-livepatch status

# Detailed status with verbose output
sudo canonical-livepatch status --verbose
```

Status output:

```
last check: 2 minutes ago
kernel: 5.15.0-91-generic
server check-in: succeeded
patch state: nothing to apply
```

When a patch is available and applied:

```
last check: 5 minutes ago
kernel: 5.15.0-91-generic
server check-in: succeeded
patch state: applied
patches:
  CVE-2024-0001: Applied
  CVE-2024-0002: Applied
```

Check through Ubuntu Pro tools:

```bash
# Overall Pro status including Livepatch
sudo pro status

# Check specifically for Livepatch
sudo pro status | grep livepatch
```

## How Livepatch Works Technically

When a security vulnerability is identified:

1. Canonical's kernel team creates a patch for the running kernel version
2. The patch is compiled into a kernel module
3. The module is signed with Canonical's key
4. The Livepatch daemon on your system downloads the module
5. The module is loaded and modifies the running kernel's code in memory using kernel function patching (`ftrace` hooks)

Check which patches have been applied:

```bash
# See applied patches and their CVEs
sudo canonical-livepatch status --verbose | grep -A 20 "patches:"
```

## Checking if a Specific CVE is Covered

```bash
# Check if a specific CVE is covered by Livepatch
sudo canonical-livepatch status --verbose | grep "CVE-2024-"

# Or check the kernel patching dashboard
# https://ubuntu.com/security/livepatch
```

## Managing the Livepatch Service

```bash
# Manually trigger a check for new patches
sudo canonical-livepatch check

# Restart the Livepatch daemon
sudo snap restart canonical-livepatch

# Check the snap service status
sudo snap services canonical-livepatch

# View Livepatch logs
sudo snap logs canonical-livepatch

# Follow logs in real time
sudo snap logs -n 100 -f canonical-livepatch
```

## Disabling and Re-enabling Livepatch

```bash
# Disable Livepatch (does not remove applied patches from running kernel)
sudo pro disable livepatch

# Re-enable
sudo pro enable livepatch
```

## Livepatch in Automated Environments

For servers managed via configuration management (Ansible, Puppet, etc.):

### Ansible Playbook Example

```yaml
---
- name: Enable Ubuntu Pro and Livepatch
  hosts: ubuntu_servers
  become: yes
  tasks:
    - name: Install ubuntu-advantage-tools
      apt:
        name: ubuntu-advantage-tools
        state: present
        update_cache: yes

    - name: Attach Ubuntu Pro
      command: pro attach {{ ubuntu_pro_token }}
      args:
        creates: /var/lib/ubuntu-advantage/private/machine-token.json

    - name: Enable Livepatch
      command: pro enable livepatch
      register: livepatch_enable
      changed_when: "'already enabled' not in livepatch_enable.stdout"

    - name: Verify Livepatch status
      command: canonical-livepatch status
      register: livepatch_status

    - name: Show Livepatch status
      debug:
        msg: "{{ livepatch_status.stdout }}"
```

### Shell Script for Fleet Setup

```bash
#!/bin/bash
# setup-livepatch.sh - enable Livepatch on a fresh Ubuntu server

UBUNTU_PRO_TOKEN="${1:-}"

if [ -z "$UBUNTU_PRO_TOKEN" ]; then
    echo "Usage: $0 <ubuntu-pro-token>"
    exit 1
fi

# Ensure package is installed
apt-get update -qq
apt-get install -y ubuntu-advantage-tools

# Attach Pro
pro attach "$UBUNTU_PRO_TOKEN"

# Enable Livepatch
pro enable livepatch

# Verify
canonical-livepatch status
```

## Livepatch Coverage and Limitations

Livepatch does not cover everything:

- It patches **high-priority security vulnerabilities** in the running kernel
- It does **not** provide all kernel bug fixes
- It does **not** add new features
- It works only for the **exact kernel version** that Canonical has built a patch for
- Eventually a reboot is still required for comprehensive updates

Check which kernel versions are supported:

```bash
# The running kernel version
uname -r

# Livepatch supports Ubuntu LTS generic kernels
# For cloud VMs: AWS, Azure, GCP kernels are also supported
```

## Monitoring Livepatch Across Multiple Systems

For fleet monitoring, check Livepatch status across systems:

```bash
#!/bin/bash
# check-livepatch-fleet.sh - check Livepatch status on multiple hosts

HOSTS=("server1" "server2" "server3")

for host in "${HOSTS[@]}"; do
    echo "=== $host ==="
    ssh "$host" "sudo canonical-livepatch status 2>/dev/null || echo 'Livepatch not active'"
    echo ""
done
```

## Understanding the Reboot-Free Window

Even with Livepatch, plan for regular kernel reboots. The typical recommendation:
- Livepatch covers the **current LTS kernel** for critical CVEs
- Schedule reboots quarterly or semi-annually to apply full kernel updates
- Use Livepatch to safely defer emergency reboots until the next maintenance window

```bash
# See how long since last reboot (Livepatch uptime benefit)
uptime -p

# See pending kernel update (the version you'd boot into after reboot)
apt list --upgradable 2>/dev/null | grep linux-image
```

Livepatch is most valuable in environments where availability is critical and reboots require change management approval, coordination with other systems, or brief service interruption. The time savings from deferring even a few emergency reboots per year justifies the setup effort.

# How to Install and Enable SELinux on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SELinux, Security, Linux Security, Mandatory Access Control

Description: A practical guide to installing, configuring, and enabling SELinux on Ubuntu servers for mandatory access control and enhanced system security.

---

Ubuntu ships with AppArmor as its default mandatory access control (MAC) system. SELinux, developed originally by the NSA, takes a different and arguably more comprehensive approach to confining processes. If your organization mandates SELinux - perhaps due to RHEL/CentOS background, compliance requirements, or just preference - this guide walks through getting it running on Ubuntu.

Fair warning: SELinux on Ubuntu is not a first-class experience. Canonical supports AppArmor natively, and SELinux support is community-maintained. That said, it does work, and many shops run it successfully in production.

## Why SELinux Over AppArmor

SELinux uses a label-based model where every process, file, port, and socket carries a security context. Access is only granted when the policy explicitly allows it. AppArmor uses path-based profiles which are simpler but less fine-grained.

SELinux enforces the principle of least privilege at a deeper level - even root processes can be confined. For environments with strict compliance requirements (DoD STIGs, certain banking regulations), SELinux is often mandated.

## Prerequisites

- Ubuntu 22.04 LTS or 24.04 LTS
- Root or sudo access
- Comfort with command-line troubleshooting (SELinux will break things initially)

## Step 1: Disable AppArmor

You cannot run both AppArmor and SELinux simultaneously in a meaningful way. Disable AppArmor first.

```bash
# Stop the AppArmor service
sudo systemctl stop apparmor

# Disable it from starting at boot
sudo systemctl disable apparmor

# Unload all AppArmor profiles from the kernel
sudo aa-teardown

# Verify no profiles are loaded
sudo aa-status
```

If `aa-status` still shows loaded profiles, reboot and check again.

## Step 2: Install SELinux Packages

Ubuntu provides SELinux packages in the main repository, though they lag behind Fedora/RHEL distributions.

```bash
# Update package index
sudo apt update

# Install core SELinux packages
sudo apt install -y \
    selinux-basics \
    selinux-policy-default \
    auditd

# The selinux-activate script handles initial setup
sudo selinux-activate
```

The `selinux-activate` command does several things:
- Installs the bootloader parameter `security=selinux`
- Creates the `/.autorelabel` file to trigger filesystem relabeling on next boot
- Modifies the kernel command line

```bash
# Verify the activation
cat /etc/default/grub | grep GRUB_CMDLINE_LINUX
# Should show security=selinux selinux=1
```

## Step 3: Initial Reboot and Filesystem Relabeling

After running `selinux-activate`, a reboot is required. During the first reboot, SELinux will relabel the entire filesystem - this takes time depending on disk size.

```bash
# Reboot to apply changes
sudo reboot
```

The relabeling process runs automatically. On a system with a few hundred GB of files, expect 5-20 minutes. The system will reboot a second time automatically when relabeling completes.

## Step 4: Verify SELinux is Running

After the system comes back up, check the SELinux status.

```bash
# Check SELinux status
sestatus

# Expected output:
# SELinux status:                 enabled
# SELinuxfs mount:                /sys/fs/selinux
# SELinux mount point:            /sys/fs/selinux
# Loaded policy name:             default
# Current mode:                   permissive
# Mode from config file:          permissive
# Policy MLS status:              enabled
# Policy deny_unknown status:     denied
# Memory protection checking:     actual (secure)
# Max kernel policy version:      33
```

Note that the default mode after initial setup is `permissive`. In permissive mode, SELinux logs policy violations but does not block them. This is intentional - you need to review logs and fix issues before switching to enforcing mode.

```bash
# Check current mode with getenforce
getenforce
# Returns: Permissive
```

## Step 5: Review AVC Denials

With SELinux in permissive mode, run your normal workloads and check what would have been blocked.

```bash
# View SELinux denial messages from the audit log
sudo ausearch -m avc -ts recent

# Use audit2why to explain denials in plain English
sudo ausearch -m avc -ts recent | audit2why

# Generate a policy module from denials
sudo ausearch -m avc -ts recent | audit2allow -M mylocalpolicy
sudo semodule -i mylocalpolicy.pp
```

This workflow - run in permissive, review denials, generate and load policy modules - is the standard way to tune SELinux before enforcing.

## Step 6: Configure SELinux Mode

The configuration file controls the default mode at boot.

```bash
# View the config file
cat /etc/selinux/config
```

```ini
# This file controls the state of SELinux on the system.
# SELINUX= can take one of these three values:
#     enforcing - SELinux security policy is enforced.
#     permissive - SELinux prints warnings instead of enforcing.
#     disabled - No SELinux policy is loaded.
SELINUX=permissive

# SELINUXTYPE= can take one of these two values:
#     default - equivalent to targeted policy
#     mls     - Multi-level security policy
SELINUXTYPE=default
```

To switch to enforcing mode after you are satisfied with permissive testing:

```bash
# Change mode at runtime (no reboot needed)
sudo setenforce 1

# Verify
getenforce
# Returns: Enforcing

# Then update the config file to persist across reboots
sudo sed -i 's/SELINUX=permissive/SELINUX=enforcing/' /etc/selinux/config
```

## Step 7: Working with Security Contexts

SELinux tags everything with a context in the format `user:role:type:level`.

```bash
# View file contexts
ls -Z /var/www/html/

# View process contexts
ps -eZ | grep nginx

# View your own context
id -Z

# Change file context
sudo chcon -t httpd_sys_content_t /var/www/html/myfile.html

# Restore default context for a path
sudo restorecon -v /var/www/html/myfile.html
```

## Useful SELinux Commands Reference

```bash
# List all boolean settings
getsebool -a

# Enable a boolean (e.g., allow httpd to connect to network)
sudo setsebool -P httpd_can_network_connect on

# List all loaded policy modules
semodule -l

# Check port contexts
semanage port -l | grep http

# Add a custom port to a service context
sudo semanage port -a -t http_port_t -p tcp 8080
```

## Common Issues

**SSH breaks after enabling enforcing mode**: The `sshd_t` domain needs proper labels on your SSH config and key files. Check `ausearch -m avc -c sshd` for specifics.

**Web server cannot read files**: Files created outside the web root might have wrong contexts. Use `restorecon -Rv /var/www/` to relabel recursively.

**System won't boot**: Boot with `enforcing=0` on the kernel command line to enter permissive mode temporarily. Fix the issue, then re-enable enforcing.

## Monitoring with auditd

```bash
# Start and enable auditd
sudo systemctl enable --now auditd

# Real-time monitoring of SELinux events
sudo tail -f /var/log/audit/audit.log | grep AVC

# Generate a human-readable report
sudo aureport --avc
```

SELinux takes patience to configure correctly. Start in permissive mode, tune policies for your actual workloads, then switch to enforcing. Rushing to enforcing mode on an untuned system will cause service outages.

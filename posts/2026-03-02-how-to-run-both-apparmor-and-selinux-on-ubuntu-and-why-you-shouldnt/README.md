# How to Run Both AppArmor and SELinux on Ubuntu (and Why You Shouldn't)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AppArmor, SELinux, Security, Linux Security

Description: An exploration of why running AppArmor and SELinux simultaneously on Ubuntu is technically impossible in a useful way, what actually happens when you try, and how Linux LSM stacking works.

---

The question comes up regularly: can you run both AppArmor and SELinux at the same time for extra security? The answer, practically speaking, is no - not in any way that provides the dual protection you might be imagining. Understanding why requires understanding how the Linux Security Module (LSM) framework works and what each system actually does.

## How the Linux Security Module Framework Works

AppArmor and SELinux are both implementations of Linux Security Modules (LSM). LSM is a kernel framework that provides hooks at various points in the kernel - when a file is opened, when a network connection is made, when a capability is checked, etc. Security modules register handlers for these hooks.

For most of Linux's history, only one LSM could be loaded at a time for the major security functions (the "exclusive" hooks). The kernel enforced this with a `CONFIG_DEFAULT_SECURITY` compile-time setting that could be overridden at boot.

### Modern LSM Stacking

Since Linux kernel 4.15, a limited form of LSM stacking is supported. Multiple LSMs can be loaded simultaneously, but only in specific combinations:

- **Stacked LSMs**: Integrity modules (IMA, EVM) and capability modules (capabilities, Yama) can stack with the "exclusive" security modules
- **Exclusive LSMs**: AppArmor and SELinux are both "exclusive" LSMs for most security decisions. Only one can be the primary LSM for most access control decisions.

```bash
# See what LSMs are active
cat /sys/kernel/security/lsm

# On a default Ubuntu system with AppArmor:
# lockdown,capability,landlock,yama,apparmor

# The output shows all active LSMs
# You can see multiple are loaded, but apparmor is the MAC system
```

## What Happens if You Try to Load Both

```bash
# On Ubuntu with AppArmor, try to also enable SELinux
sudo apt install selinux-basics selinux-policy-default
sudo selinux-activate
sudo reboot
```

After rebooting, check what happened:

```bash
# Check which security modules are loaded
cat /sys/kernel/security/lsm

# Check AppArmor status
sudo apparmor_status

# Check SELinux status
sestatus
```

The result depends on how the kernel was compiled and what boot parameters are set:

- If `security=selinux` is on the kernel command line, SELinux becomes the primary MAC
- AppArmor becomes inactive or disabled
- The kernel does not run both as parallel access control systems for file/process decisions

```bash
# Check kernel command line
cat /proc/cmdline
# Example with SELinux activated:
# BOOT_IMAGE=/boot/vmlinuz-5.15.0-91-generic root=/dev/sda1 ro quiet splash
# security=selinux selinux=1

# The security= parameter selects ONE MAC system
```

## The Technical Reality of Running Both

You can have both installed and configured without either being active:

```bash
# Install both
sudo apt install apparmor selinux-basics selinux-policy-default

# Boot without either being active
# Add to kernel command line: apparmor=0 selinux=0
# Result: no mandatory access control at all
# This is worse than running one
```

You can load AppArmor profiles while SELinux is running, but AppArmor's enforcement is not active when SELinux is the primary LSM:

```bash
# With SELinux as the primary LSM
cat /proc/cmdline | grep security
# security=selinux

# AppArmor commands may run but have no effect
sudo apparmor_status
# AppArmor filesystem not mounted (or similar error)
```

## What LSM Stacking Actually Allows

What modern kernels do support is combining the exclusive MAC module (AppArmor OR SELinux) with other security modules:

```bash
# Typical Ubuntu stacking
cat /sys/kernel/security/lsm
# lockdown,capability,landlock,yama,apparmor

# lockdown: restricts root from bypassing kernel protections
# capability: POSIX capabilities enforcement
# landlock: process-based sandboxing (independent of AppArmor/SELinux)
# yama: additional ptrace restrictions
# apparmor: the primary MAC system
```

Landlock is particularly interesting because it can be used alongside AppArmor or SELinux:

```bash
# Landlock can add per-process sandboxing on top of AppArmor
# Applications opt into Landlock restriction at startup
# It works as a complement, not a replacement

# Example: a web server can restrict itself with Landlock
# (requires application support)
```

## Why Running Both Would Not Make You More Secure

Even if you could run both simultaneously in a meaningful way, the security benefit would be marginal and the operational cost would be enormous:

**Policy complexity doubles**: Every service would need both a working AppArmor profile and a working SELinux context/policy module. Any change to service configuration would need updates in both systems.

**Debugging becomes a nightmare**: When an application fails, you now need to determine if AppArmor denied it, SELinux denied it, or something else entirely. The interaction between two label-based policies adds a combinatorial complexity to troubleshooting.

**One policy weaker means both are needed**: Security is only as strong as the more restrictive policy. If your SELinux policy allows something dangerous and AppArmor blocks it, that is useful. But if your AppArmor policy is wrong, SELinux might catch it - except that you then need SELinux to be correct for every scenario AppArmor might miss. You have not doubled your security; you have doubled your maintenance burden.

**Resource usage increases**: Both systems add kernel overhead for every system call. The combined overhead of two MAC frameworks (even if one is mostly inactive) is more than one.

## The Right Approach: One MAC System, Properly Configured

Instead of trying to run both:

```bash
# Pick one and configure it properly

# Option 1: Optimize AppArmor (Ubuntu's default)
# Install additional profiles
sudo apt install apparmor-profiles apparmor-utils

# Put profiles in enforce mode
sudo aa-enforce /etc/apparmor.d/*

# Generate profiles for custom applications
sudo aa-genprof /usr/local/bin/myapp

# Option 2: Properly configure SELinux
# Install and run in permissive mode first
# Tune policy for your applications
# Switch to enforcing mode

# In both cases: complement with additional tools
sudo apt install -y auditd  # Audit logging
# Configure Landlock at the application level
# Use seccomp profiles (Docker/container deployments)
# Enable kernel hardening features via sysctl
```

## Defense in Depth Without Dual MAC

A more effective security posture uses a well-configured MAC system plus complementary controls:

```bash
# 1. Primary MAC: AppArmor in enforce mode for all services
sudo aa-enforce /etc/apparmor.d/usr.sbin.nginx

# 2. Network filtering: nftables/iptables
sudo ufw enable
sudo ufw default deny incoming

# 3. Privilege reduction: run services as minimal users
# Use systemd User= and CapabilityBoundingSet=

# 4. Filesystem hardening
# Mount /tmp noexec,nosuid
# Mount /var nosuid

# 5. Kernel hardening
sudo tee -a /etc/sysctl.d/99-hardening.conf <<'EOF'
# Prevent kernel pointer leaks
kernel.kptr_restrict = 2
# Restrict ptrace
kernel.yama.ptrace_scope = 2
# Disable sysrq
kernel.sysrq = 0
EOF
sudo sysctl -p /etc/sysctl.d/99-hardening.conf

# 6. Audit logging
sudo systemctl enable --now auditd
```

## Checking What LSMs Are Available

```bash
# LSMs compiled into your kernel
cat /boot/config-$(uname -r) | grep CONFIG_SECURITY

# LSMs available at runtime
cat /sys/kernel/security/lsm

# Change active LSMs (requires reboot)
# Edit /etc/default/grub and add to GRUB_CMDLINE_LINUX:
# lsm=lockdown,capability,yama,apparmor (for AppArmor)
# lsm=lockdown,capability,yama,selinux (for SELinux)
sudo update-grub
```

The bottom line: running both AppArmor and SELinux simultaneously as dual enforcement systems is not possible in practice on Ubuntu. The kernel's LSM framework selects one primary MAC system. Pick the one that fits your team's expertise and compliance requirements, configure it properly, and complement it with other security controls rather than trying to layer MAC systems on top of each other.

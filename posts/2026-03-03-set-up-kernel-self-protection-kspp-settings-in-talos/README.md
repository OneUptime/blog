# How to Set Up Kernel Self-Protection (KSPP) Settings in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KSPP, Kernel Security, Linux Hardening, Kubernetes

Description: Understand how Talos Linux implements Kernel Self-Protection Project settings and how to verify and extend kernel hardening on your cluster nodes.

---

The Kernel Self-Protection Project (KSPP) is a Linux kernel initiative that aims to eliminate entire classes of security vulnerabilities through kernel-level protections. Talos Linux ships with many KSPP recommendations enabled by default, which is one of the reasons it is considered a security-focused operating system. This guide explains what KSPP settings are, which ones Talos enables, and how you can verify and extend kernel hardening on your nodes.

## What Is KSPP?

The Kernel Self-Protection Project focuses on making the Linux kernel protect itself from bugs in both the kernel and in userspace programs. Rather than trying to find and fix individual vulnerabilities, KSPP implements broad protections that make whole categories of attacks impossible or significantly harder.

Some examples of what KSPP protections do:

- Prevent the kernel from executing code in data regions (NX/XD protection)
- Randomize the kernel address space layout (KASLR)
- Detect and prevent stack buffer overflows
- Restrict access to kernel memory from userspace
- Limit the information leaked to unprivileged users

## KSPP Settings Enabled by Default in Talos

Talos Linux comes with a comprehensive set of kernel security options. Here are the key KSPP-related settings that are active out of the box:

### Memory Protection

```bash
# Verify kernel address space layout randomization (KASLR)
talosctl read /proc/sys/kernel/randomize_va_space --nodes <node-ip>
# Expected value: 2 (full randomization)

# Verify kernel pointer restriction
talosctl read /proc/sys/kernel/kptr_restrict --nodes <node-ip>
# Expected value: 1 (hide kernel pointers from non-root)

# Verify dmesg restriction
talosctl read /proc/sys/kernel/dmesg_restrict --nodes <node-ip>
# Expected value: 1 (restrict dmesg to privileged users)
```

### Stack Protection

The Talos kernel is built with stack canary protection (CONFIG_STACKPROTECTOR_STRONG), which adds guard values to the stack that are checked before function returns. If a buffer overflow corrupts the canary, the kernel panics instead of allowing code execution:

```bash
# Verify stack protection is enabled by checking kernel config
talosctl read /proc/config.gz --nodes <node-ip> | gunzip | grep STACKPROTECTOR
# Expected: CONFIG_STACKPROTECTOR_STRONG=y
```

### Hardened Usercopy

Talos enables CONFIG_HARDENED_USERCOPY, which adds bounds checking when data is copied between kernel space and user space. This prevents a large class of vulnerabilities where a bug in a system call could leak kernel memory to userspace or allow userspace to overwrite kernel memory:

```bash
# Verify hardened usercopy
talosctl read /proc/config.gz --nodes <node-ip> | gunzip | grep HARDENED_USERCOPY
# Expected: CONFIG_HARDENED_USERCOPY=y
```

## Verifying All KSPP Settings

You can do a comprehensive check of KSPP settings on a Talos node. Here is a script that checks the most important settings:

```bash
#!/bin/bash
# kspp-check.sh
# Verify KSPP kernel settings on a Talos Linux node

NODE_IP="$1"

echo "Checking KSPP settings on node: ${NODE_IP}"
echo "================================================"

# Sysctl settings
echo ""
echo "--- Sysctl Settings ---"

echo -n "kernel.randomize_va_space: "
talosctl read /proc/sys/kernel/randomize_va_space --nodes ${NODE_IP}

echo -n "kernel.kptr_restrict: "
talosctl read /proc/sys/kernel/kptr_restrict --nodes ${NODE_IP}

echo -n "kernel.dmesg_restrict: "
talosctl read /proc/sys/kernel/dmesg_restrict --nodes ${NODE_IP}

echo -n "kernel.perf_event_paranoid: "
talosctl read /proc/sys/kernel/perf_event_paranoid --nodes ${NODE_IP}

echo -n "kernel.yama.ptrace_scope: "
talosctl read /proc/sys/kernel/yama/ptrace_scope --nodes ${NODE_IP}

echo -n "kernel.unprivileged_bpf_disabled: "
talosctl read /proc/sys/kernel/unprivileged_bpf_disabled --nodes ${NODE_IP}

echo -n "net.core.bpf_jit_harden: "
talosctl read /proc/sys/net/core/bpf_jit_harden --nodes ${NODE_IP}

# Kernel config settings
echo ""
echo "--- Kernel Config Settings ---"
CONFIG=$(talosctl read /proc/config.gz --nodes ${NODE_IP} | gunzip)

for setting in CONFIG_STACKPROTECTOR_STRONG CONFIG_HARDENED_USERCOPY \
  CONFIG_FORTIFY_SOURCE CONFIG_INIT_ON_ALLOC_DEFAULT_ON \
  CONFIG_INIT_ON_FREE_DEFAULT_ON CONFIG_RANDOMIZE_BASE \
  CONFIG_RANDOMIZE_MEMORY CONFIG_SLAB_FREELIST_RANDOM; do
  echo -n "${setting}: "
  echo "${CONFIG}" | grep "^${setting}=" || echo "NOT SET"
done
```

## Customizing Kernel Parameters with Talos

While Talos ships with strong defaults, you may need to adjust some kernel parameters. Talos allows you to set sysctl values through the machine configuration:

```yaml
# machine-config-sysctl.yaml
# Customize kernel security parameters
machine:
  sysctls:
    # Restrict ptrace to parent processes only
    kernel.yama.ptrace_scope: "1"
    # Disable unprivileged BPF
    kernel.unprivileged_bpf_disabled: "1"
    # Harden BPF JIT
    net.core.bpf_jit_harden: "2"
    # Restrict performance events
    kernel.perf_event_paranoid: "3"
    # Restrict kernel log access
    kernel.dmesg_restrict: "1"
    # Disable SysRq key
    kernel.sysrq: "0"
    # Randomize virtual address space
    kernel.randomize_va_space: "2"
    # Restrict core dumps
    fs.suid_dumpable: "0"
```

Apply this configuration:

```bash
# Apply sysctl settings to a node
talosctl apply-config --nodes <node-ip> \
  --config-patch @machine-config-sysctl.yaml
```

## Network-Related KSPP Settings

In addition to memory and process protections, KSPP includes network hardening settings that are relevant for Kubernetes:

```yaml
# machine-config-network-hardening.yaml
# Network-level kernel hardening
machine:
  sysctls:
    # Ignore ICMP redirects (prevent MITM attacks)
    net.ipv4.conf.all.accept_redirects: "0"
    net.ipv4.conf.default.accept_redirects: "0"
    net.ipv6.conf.all.accept_redirects: "0"
    net.ipv6.conf.default.accept_redirects: "0"
    # Do not send ICMP redirects
    net.ipv4.conf.all.send_redirects: "0"
    net.ipv4.conf.default.send_redirects: "0"
    # Ignore source-routed packets
    net.ipv4.conf.all.accept_source_route: "0"
    net.ipv4.conf.default.accept_source_route: "0"
    # Enable TCP SYN cookies (protect against SYN floods)
    net.ipv4.tcp_syncookies: "1"
    # Log martian packets
    net.ipv4.conf.all.log_martians: "1"
```

## Understanding What Talos Cannot Change

Because Talos uses a pre-built kernel, you cannot change compile-time kernel configuration options. Settings like CONFIG_STACKPROTECTOR_STRONG are baked into the kernel binary and cannot be toggled at runtime. However, Talos includes all the important KSPP compile-time options by default.

If you need a custom kernel configuration, Talos supports building custom kernel images through the Image Factory or by building from source. This is an advanced use case:

```bash
# Building a custom Talos kernel is done through the pkgs repository
# This is only necessary if you need kernel config changes that
# cannot be achieved through sysctl
git clone https://github.com/siderolabs/pkgs.git
cd pkgs

# Modify the kernel config
# Then build the custom package
make kernel
```

## Monitoring Kernel Security Events

Once your KSPP settings are in place, you should monitor for security-relevant kernel events. These can indicate attempted exploits or misconfigurations:

```bash
# Watch for kernel security events in dmesg
talosctl dmesg --nodes <node-ip> --follow | grep -iE "segfault|panic|oops|exploit|overflow"

# Check for any processes that triggered stack protector
talosctl dmesg --nodes <node-ip> | grep "stack-protector"

# Look for usercopy violations
talosctl dmesg --nodes <node-ip> | grep "usercopy"
```

You can forward these events to your monitoring system. Talos supports kernel log forwarding through its logging configuration:

```yaml
# machine-config-logging.yaml
# Forward kernel logs to an external system for security monitoring
machine:
  logging:
    destinations:
      - endpoint: "udp://syslog.example.com:514"
        format: json_lines
```

## Comparing Talos to Other Distributions

One of the advantages of Talos Linux is that these settings are part of the base system rather than something you add later. On a traditional distribution like Ubuntu or CentOS, you would need to:

1. Install and configure a hardening framework like CIS-CAT or OpenSCAP
2. Write Ansible playbooks or similar automation to apply sysctl settings
3. Rebuild the kernel if you need compile-time KSPP options
4. Continuously audit for configuration drift

With Talos, the immutable nature of the system guarantees that these settings persist and cannot be changed by a compromised workload or misconfigured automation. The read-only filesystem prevents any modification to the kernel parameters outside of the Talos API.

## Conclusion

Talos Linux takes kernel self-protection seriously by shipping with a comprehensively hardened kernel out of the box. Most KSPP recommendations are enabled by default, both at compile time and through runtime sysctl settings. Your job is primarily to verify these settings meet your requirements, add any additional sysctl values your security policy demands, and monitor for security events. The immutable design of Talos ensures that once configured, these protections cannot be weakened without going through the Talos API, which provides its own authentication and audit trail.

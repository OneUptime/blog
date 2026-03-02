# How to Enable and Configure Address Space Layout Randomization (ASLR) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Hardening, Kernel, Memory Protection

Description: Guide to verifying, enabling, and tuning Address Space Layout Randomization on Ubuntu to mitigate memory exploitation attacks, including compatibility considerations.

---

Address Space Layout Randomization (ASLR) is a memory protection technique that randomizes the locations of key data regions in a process's address space: the stack, heap, shared libraries, and executable base (when combined with Position Independent Executables). This randomization defeats attacks that depend on knowing the exact memory address of specific code or data - which most memory exploitation techniques require.

ASLR is enabled by default on Ubuntu, but it is worth understanding how to verify the setting, what the levels mean, and how to configure it appropriately for different environments.

## How ASLR Works

When a process starts without ASLR, memory regions load at predictable addresses. An attacker who can write arbitrary data to memory (via a buffer overflow, for example) can craft a payload targeting known addresses of system functions or return addresses.

With ASLR, the kernel randomizes these base addresses on each process invocation. An attacker trying to jump to a hardcoded address will jump to random memory instead, causing a crash rather than a successful exploit.

ASLR has three levels in the Linux kernel, controlled via `randomize_va_space`:

- **0**: ASLR disabled. All regions load at fixed addresses.
- **1**: Partial ASLR. Stack, VDSO, and shared libraries are randomized. Heap is not.
- **2**: Full ASLR. Stack, heap, VDSO, shared libraries, and mmap base are all randomized. This is the recommended setting.

## Checking the Current ASLR Setting

```bash
# Read the current ASLR level
cat /proc/sys/kernel/randomize_va_space

# Expected output for a properly configured system:
# 2

# Alternative method
sysctl kernel.randomize_va_space
```

## Enabling Full ASLR

If ASLR is not set to 2, enable it:

```bash
# Enable full ASLR immediately (no reboot required)
sudo sysctl -w kernel.randomize_va_space=2

# Verify the change
cat /proc/sys/kernel/randomize_va_space

# Make it persistent across reboots
echo 'kernel.randomize_va_space = 2' | \
  sudo tee /etc/sysctl.d/99-aslr.conf

# Apply via sysctl.conf system
sudo sysctl --system
```

## Verifying ASLR is Working

You can observe ASLR in action by checking where the stack and shared libraries load across different invocations of the same process:

```bash
# Check the memory map of a process - addresses should differ each run
cat /proc/self/maps | head -20

# Run the same command twice and compare stack addresses
cat /proc/self/maps | grep -E 'stack|heap|libc'
cat /proc/self/maps | grep -E 'stack|heap|libc'

# A simple one-liner to compare addresses across two runs
for i in 1 2; do
    cat /proc/self/maps | grep 'stack' | awk '{print $1}'
done
# Output should show different addresses each time
```

More conclusive test using a small C program:

```bash
# Write a test program
cat > /tmp/aslr-test.c <<'EOF'
#include <stdio.h>
#include <stdlib.h>

int main() {
    int stack_var = 0;
    void *heap_ptr = malloc(16);
    printf("Stack: %p\n", (void*)&stack_var);
    printf("Heap:  %p\n", heap_ptr);
    printf("LibC:  %p\n", (void*)printf);
    free(heap_ptr);
    return 0;
}
EOF

# Compile it
gcc -o /tmp/aslr-test /tmp/aslr-test.c

# Run it three times - addresses should differ each run
for i in 1 2 3; do
    /tmp/aslr-test
    echo "---"
done
```

With ASLR=2, the stack, heap, and library addresses will be different each run. With ASLR=0, they will be identical.

## Complementary Memory Protections

ASLR is most effective when combined with other mitigations:

### Position Independent Executables (PIE)

ASLR only randomizes the executable's base address if it is compiled as a Position Independent Executable. Without PIE, the main executable always loads at the same address regardless of ASLR.

Check if a binary is PIE:

```bash
# Check if a binary is PIE
file /usr/sbin/sshd
# Output: ELF 64-bit LSB pie executable, x86-64 ...

# The 'pie executable' part confirms PIE is enabled

# For a non-PIE binary:
file /bin/ls  # May show 'pie executable' on modern Ubuntu

# Use readelf for definitive check
readelf -h /usr/sbin/sshd | grep 'Type:'
# Type: DYN (Position-Independent Executable file) -> PIE
# Type: EXEC (Executable file) -> Not PIE
```

Ubuntu's compilers enable PIE by default for most packages since Ubuntu 17.10. Old custom-compiled binaries may not have it.

### Stack Canaries

Stack canaries place a random value before the return address on the stack. Buffer overflows that overwrite the return address also overwrite the canary, and the value is checked before function return:

```bash
# Check if a binary has stack canaries
readelf -s /usr/sbin/sshd | grep '__stack_chk_fail'
# If this symbol exists, the binary has stack canary protection
```

### NX / DEP (No-Execute Stack)

The NX bit marks the stack as non-executable, preventing shellcode injected onto the stack from running:

```bash
# Check if the stack has the NX protection
readelf -l /usr/sbin/sshd | grep -A1 'GNU_STACK'
# The flags should show 'RW' not 'RWE'
# RWE would mean executable stack - bad
# RW means non-executable stack - good
```

### RELRO (Read-Only Relocations)

RELRO makes portions of the program's data segment read-only after startup, protecting function pointers from being overwritten:

```bash
# Check RELRO status of a binary
readelf -l /usr/sbin/sshd | grep 'GNU_RELRO'
# Full RELRO is best, partial RELRO is acceptable

# checksec tool provides a summary of all these protections
sudo apt-get install -y checksec
checksec --file=/usr/sbin/sshd
```

Output from checksec:

```
RELRO           STACK CANARY    NX          PIE         RPATH     RUNPATH
Full RELRO      Canary found    NX enabled  PIE enabled  No RPATH  No RUNPATH
```

## Testing ASLR Bypass Resistance

To understand your system's ASLR entropy (how unpredictable the addresses are):

```bash
# On 64-bit systems, ASLR should have high entropy
# Check the entropy for mmap randomization
cat /proc/sys/vm/mmap_rnd_bits
# Should be 28 (higher = more random)

# Check stack randomization entropy
cat /proc/sys/vm/mmap_rnd_compat_bits
# 8 for 32-bit compat processes (lower, 32-bit address space limitation)
```

On 32-bit systems, ASLR entropy is much lower (fewer bits available), making brute force feasible. On 64-bit systems, brute forcing ASLR is computationally infeasible.

## Application Compatibility

Rarely, an application may not work with ASLR enabled (typically very old or poorly written software):

```bash
# Run a specific application with ASLR disabled (without changing the system setting)
setarch $(uname -m) -R /path/to/application

# Or set ASLR for a specific process via personality
# This requires writing a small wrapper
```

For Java applications, ASLR interacts with the JVM's own memory management. Modern JVMs work correctly with ASLR=2.

## Kernel Protection Settings Related to ASLR

Additional kernel parameters complement ASLR:

```bash
sudo nano /etc/sysctl.d/99-memory-protection.conf
```

```ini
# Full ASLR
kernel.randomize_va_space = 2

# Restrict /proc/kallsyms to root only - prevents attackers from reading
# kernel symbol addresses to defeat KASLR (kernel ASLR)
kernel.kptr_restrict = 2

# Hide kernel pointers in /proc and /sys from unprivileged users
kernel.perf_event_paranoid = 3

# Disable core dumps for setuid programs (they could expose memory layout)
fs.suid_dumpable = 0

# Harden BPF JIT compiler (additional mitigation for JIT spraying)
net.core.bpf_jit_harden = 2
```

```bash
sudo sysctl --system
```

## ASLR in Containers

When running applications in Docker or LXC on Ubuntu, the kernel's ASLR setting applies to all containers (since they share the host kernel):

```bash
# ASLR setting is visible from inside a container
docker run --rm ubuntu cat /proc/sys/kernel/randomize_va_space
# Shows the host's setting (2 if properly configured)

# Containers cannot increase ASLR beyond the host setting
# They can disable it for their namespace with --security-opt systctl=kernel.randomize_va_space=0
# Avoid this unless absolutely necessary

# For Kubernetes, the same principle applies - containers inherit the node's ASLR setting
```

## Monitoring

ASLR itself does not produce logs, but signs of attempted memory exploits appear in:

```bash
# Segmentation faults often indicate failed exploit attempts
sudo journalctl -k | grep -i 'segfault\|killed process\|protection fault'

# Kernel protection messages
sudo dmesg | grep -i 'protection fault\|kernel panic\|oom'

# Core dumps with unusual patterns
ls -la /var/crash/  # Ubuntu saves crash reports here
```

ASLR is a kernel-level control that requires no application changes and has essentially no performance overhead for most workloads. It should always be set to 2 on production Ubuntu systems, combined with PIE compilation, stack canaries, and NX protection for a defense-in-depth approach to memory security.

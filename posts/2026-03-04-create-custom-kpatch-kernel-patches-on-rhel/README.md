# How to Create Custom kpatch Kernel Patches on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kpatch, Kernel, Development, Patching

Description: Build custom kpatch kernel live patches on RHEL from source-level diffs, enabling you to apply your own kernel fixes without rebooting.

---

While Red Hat provides official kpatch modules for critical CVEs, you can also build custom live patches from your own kernel source patches. This is useful for applying targeted fixes or backports that have not yet been released as official kpatch modules.

## Install Build Dependencies

```bash
# Install kpatch build tools and kernel development packages
sudo dnf install -y kpatch kpatch-build

# Install kernel source and build dependencies
sudo dnf install -y kernel-devel kernel-debuginfo rpm-build \
    elfutils-libelf-devel gcc make pesign yum-utils

# Install the source RPM for the running kernel
sudo dnf download --source kernel-$(uname -r | sed 's/\.x86_64//')
sudo rpm -ivh kernel-*.src.rpm
```

## Prepare the Kernel Source

```bash
# Install build dependencies for the kernel
sudo dnf builddep -y ~/rpmbuild/SPECS/kernel.spec

# Prepare the kernel source tree
cd ~/rpmbuild/SPECS
rpmbuild -bp kernel.spec
```

## Create a Patch File

Write a unified diff that describes your kernel change:

```bash
# Example: Create a simple patch file
cat > /tmp/my-fix.patch << 'EOF'
--- a/net/core/sock.c
+++ b/net/core/sock.c
@@ -1234,6 +1234,8 @@ static void sock_def_readable(struct sock *sk)
 {
 	struct socket_wq *wq;

+	/* Fix: add missing rcu read lock */
+	rcu_read_lock();
 	wq = rcu_dereference(sk->sk_wq);
 	if (skwq_has_sleeper(wq))
 		wake_up_interruptible_sync_poll(&wq->wait, EPOLLIN | EPOLLPRI |
EOF
```

## Build the kpatch Module

```bash
# Build the live patch module from the diff
# This compares the original and patched kernel objects to generate the kpatch module
sudo kpatch-build -s ~/rpmbuild/BUILD/kernel-*/linux-*/ \
    -c /boot/config-$(uname -r) \
    -v $(uname -r) \
    /tmp/my-fix.patch

# The output module will be in the current directory
ls *.ko
# Example: livepatch-my-fix.ko
```

## Load the Custom kpatch Module

```bash
# Load the kpatch module
sudo kpatch load livepatch-my-fix.ko

# Verify it loaded
kpatch list

# Check the kernel log
sudo dmesg | tail -5
```

## Install for Persistence Across Reboots

```bash
# Install the module so it loads on boot
sudo kpatch install livepatch-my-fix.ko

# Installed modules go to /var/lib/kpatch/
ls /var/lib/kpatch/$(uname -r)/
```

## Unload the Patch

```bash
# Remove the live patch
sudo kpatch unload livepatch-my-fix

# Remove from persistent installation
sudo kpatch uninstall livepatch-my-fix
```

## Troubleshooting Build Failures

```bash
# If kpatch-build fails, check the build log
cat /tmp/kpatch-build-*/build.log

# Common issues:
# - Changed functions are too large or touch inline functions
# - The patch modifies data structures (not supported by live patching)
# - Missing debuginfo packages
```

## Limitations

Keep in mind that live patching has restrictions:
- Cannot change data structures or function signatures
- Cannot patch functions that are always inlined
- Cannot modify init-only code that runs once at boot
- Each new patch replaces the previous one

Custom kpatch modules give you the flexibility to apply targeted kernel fixes on RHEL when official patches are not yet available.

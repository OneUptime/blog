# How to Debug Extension Loading Issues on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, System Extensions, Debugging, Troubleshooting, Kubernetes, Infrastructure

Description: A comprehensive troubleshooting guide for diagnosing and fixing system extension loading issues on Talos Linux, covering common failure modes and diagnostic techniques.

---

System extensions are supposed to work seamlessly - install the right image, reboot, and the extension is available. But when they do not work as expected, debugging can be challenging because Talos does not give you a shell to poke around. You cannot just SSH in and check file permissions or run lsmod manually. Instead, you need to use the Talos API and a systematic approach to figure out what went wrong. This guide covers the most common extension loading problems and how to diagnose them.

## The Extension Loading Process

Understanding how extensions are loaded helps you debug failures. Here is what happens during boot:

```
1. Bootloader loads the Talos kernel and initramfs
2. machined starts and reads the machine configuration
3. The installer image is unpacked, including extensions
4. Extension layers are overlaid onto the root filesystem
5. Kernel modules from extensions are made available
6. Extension services are registered and started
7. Normal service startup continues (containerd, kubelet, etc.)
```

Problems can occur at any of these stages. The diagnostic approach depends on which stage failed.

## Quick Diagnostic Checklist

When an extension is not working, run through these checks in order:

```bash
# 1. Is the extension listed as installed?
talosctl -n 192.168.1.10 get extensions

# 2. Are there any extension-related errors in dmesg?
talosctl -n 192.168.1.10 dmesg | grep -i "extension\|module\|error"

# 3. Is the extension service running?
talosctl -n 192.168.1.10 services

# 4. What do the extension service logs say?
talosctl -n 192.168.1.10 logs ext-<extension-name>

# 5. What does machined say about the boot process?
talosctl -n 192.168.1.10 logs machined | grep -i "extension"

# 6. Check the overall node health
talosctl -n 192.168.1.10 version
talosctl -n 192.168.1.10 services
```

## Common Issue 1: Extension Not Showing in List

If `talosctl get extensions` does not show your extension at all, it was not included in the installer image.

### Diagnosis

```bash
# Check what extensions are installed
talosctl -n 192.168.1.10 get extensions -o yaml

# Check the current installer image
talosctl -n 192.168.1.10 version
```

### Causes

1. **Wrong installer image** - The image you used to install or upgrade does not include the extension.

2. **Image Factory schematic error** - The schematic you generated did not include the extension you expected.

3. **Upgrade did not take effect** - The upgrade might have rolled back due to a boot failure.

### Fix

Verify your schematic includes the extension and upgrade again:

```bash
# Check the schematic content
# If using Image Factory, verify the schematic includes your extension

# Create the correct schematic
curl -X POST https://factory.talos.dev/schematics \
  -H "Content-Type: application/json" \
  -d '{
    "customization": {
      "systemExtensions": {
        "officialExtensions": [
          "siderolabs/iscsi-tools",
          "siderolabs/qemu-guest-agent"
        ]
      }
    }
  }'

# Upgrade with the correct image
talosctl -n 192.168.1.10 upgrade \
  --image factory.talos.dev/installer/<correct-schematic>:v1.7.0
```

## Common Issue 2: Extension Listed but Service Not Running

The extension appears in `get extensions` but its service is not running or is in an error state.

### Diagnosis

```bash
# Check service status
talosctl -n 192.168.1.10 services

# Look for the specific extension service
talosctl -n 192.168.1.10 service ext-<name>

# Check service logs
talosctl -n 192.168.1.10 logs ext-<name>

# Check system logs for startup errors
talosctl -n 192.168.1.10 dmesg | grep -i "<extension-name>\|error"
```

### Causes

1. **Missing configuration** - The extension requires configuration files that have not been provided through machine config.

2. **Dependency failure** - A service the extension depends on is not healthy.

3. **Permission issues** - The extension binary cannot access required resources.

4. **Port conflict** - Another service is already using a port the extension needs.

### Fix

Check the extension's documentation for required configuration. For example, Tailscale needs an auth key:

```yaml
machine:
  files:
    - content: |
        TS_AUTHKEY=tskey-auth-xxxxx
      path: /var/etc/tailscale/auth.env
      permissions: 0600
      op: create
```

## Common Issue 3: Kernel Module Not Loading

The extension includes a kernel module, but it is not loaded.

### Diagnosis

```bash
# Check if the module file exists
talosctl -n 192.168.1.10 ls /lib/modules/

# Check loaded modules
talosctl -n 192.168.1.10 read /proc/modules | grep <module-name>

# Check dmesg for module loading errors
talosctl -n 192.168.1.10 dmesg | grep -i "module\|<module-name>"

# Check if the module is configured to load
talosctl -n 192.168.1.10 get machineconfig -o yaml | grep -A5 "modules"
```

### Causes

1. **Module not in kernel config** - The module needs to be explicitly listed in the machine configuration.

2. **Version mismatch** - The module was compiled for a different kernel version than what is running.

3. **Missing dependencies** - The module depends on other modules that are not available.

4. **Firmware missing** - The module requires firmware files that are not included.

### Fix

Add the module to the kernel configuration:

```bash
talosctl -n 192.168.1.10 patch machineconfig -p '[
  {
    "op": "add",
    "path": "/machine/kernel/modules/-",
    "value": {"name": "my_module"}
  }
]'
```

If there is a version mismatch, you need to rebuild the extension for your Talos version:

```bash
# Check the running kernel version
talosctl -n 192.168.1.10 read /proc/version

# Ensure the extension matches this version
crane ls ghcr.io/siderolabs/<extension-name>
```

## Common Issue 4: Extension Causes Boot Failure

If the node fails to boot after adding an extension, Talos will automatically roll back to the previous image.

### Diagnosis

After rollback, the node will be running the old image:

```bash
# Check if the node rolled back
talosctl -n 192.168.1.10 version

# Check dmesg for boot failure information
talosctl -n 192.168.1.10 dmesg | grep -i "error\|fail\|panic"

# Check machined logs
talosctl -n 192.168.1.10 logs machined | grep -i "rollback\|error"
```

### Causes

1. **Incompatible kernel module** - A kernel module from the extension causes a kernel panic.

2. **Filesystem corruption** - The extension's overlay conflicts with the base filesystem.

3. **Resource exhaustion** - The extension consumes too much memory during early boot.

### Fix

If you cannot determine the cause remotely, try:

1. Test the extension on a separate test node first
2. Check the extension's compatibility with your Talos version
3. Look for known issues in the extension's GitHub repository
4. Try a different version of the extension

## Common Issue 5: Extension Works on Some Nodes but Not Others

### Diagnosis

```bash
# Compare extensions across nodes
for node in 192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20; do
  echo "=== $node ==="
  talosctl -n "$node" get extensions
  talosctl -n "$node" version
done

# Compare hardware/dmesg
talosctl -n 192.168.1.10 dmesg | grep -i "pci\|usb\|net\|gpu"
talosctl -n 192.168.1.20 dmesg | grep -i "pci\|usb\|net\|gpu"
```

### Causes

1. **Different Talos versions** - Nodes running different Talos versions may have different extension compatibility.

2. **Different hardware** - Hardware-specific extensions (GPU drivers, NIC drivers) only work with the right hardware.

3. **Different configuration** - Machine config differences can affect extension behavior.

4. **Different installer images** - Nodes may have been upgraded with different schematics.

### Fix

Ensure all nodes use the same installer image and configuration:

```bash
# Check installer image on each node
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  echo "$node:"
  talosctl -n "$node" version
done
```

## Advanced Debugging Techniques

### Reading Extension Files

You can inspect what files an extension placed on the system:

```bash
# List files in common extension directories
talosctl -n 192.168.1.10 ls /usr/local/bin/
talosctl -n 192.168.1.10 ls /usr/local/etc/containers/
talosctl -n 192.168.1.10 ls /lib/modules/
talosctl -n 192.168.1.10 ls /lib/firmware/
```

### Checking Extension Image Content

Before deploying, inspect the extension image to understand what it contains:

```bash
# Using crane to inspect the extension
crane export ghcr.io/siderolabs/iscsi-tools:v1.7.0 - | tar -tf -

# Check the manifest
crane manifest ghcr.io/siderolabs/iscsi-tools:v1.7.0 | jq .
```

### Monitoring Boot Process

For intermittent boot issues, watch the boot process in real time:

```bash
# If you have console access (through hypervisor or IPMI),
# watch the boot messages

# From the API, check boot-time logs
talosctl -n 192.168.1.10 dmesg | head -100
talosctl -n 192.168.1.10 logs machined | head -50
```

### Comparing Working and Non-Working Nodes

```bash
# Create diagnostic reports for comparison
for node in 192.168.1.10 192.168.1.20; do
  echo "===== $node =====" > diag-$node.txt
  talosctl -n "$node" version >> diag-$node.txt 2>&1
  talosctl -n "$node" get extensions -o yaml >> diag-$node.txt 2>&1
  talosctl -n "$node" services >> diag-$node.txt 2>&1
  talosctl -n "$node" dmesg >> diag-$node.txt 2>&1
done

# Then diff the outputs
diff diag-192.168.1.10.txt diag-192.168.1.20.txt
```

## Building a Debug Workflow

When you encounter an extension issue, follow this structured workflow:

```
1. IDENTIFY: What extension is affected?
   - talosctl get extensions

2. SCOPE: Is it all nodes or specific ones?
   - Check multiple nodes

3. LOCATE: At what stage did it fail?
   - Not installed -> Image issue
   - Installed but service not running -> Config issue
   - Service running but not working -> Functional issue

4. DIAGNOSE: What do the logs say?
   - talosctl logs ext-<name>
   - talosctl dmesg
   - talosctl logs machined

5. FIX: Apply the appropriate fix
   - Wrong image -> Upgrade with correct image
   - Missing config -> Add configuration
   - Version mismatch -> Use matching versions

6. VERIFY: Confirm the fix worked
   - talosctl get extensions
   - talosctl services
   - Test the extension functionality
```

## Getting Help

If you cannot resolve the issue:

```bash
# Collect diagnostic information to share
talosctl -n 192.168.1.10 get extensions -o yaml > extensions.yaml
talosctl -n 192.168.1.10 dmesg > dmesg.log
talosctl -n 192.168.1.10 logs machined > machined.log
talosctl -n 192.168.1.10 version > version.txt

# Share these with the Talos community:
# - GitHub Issues: github.com/siderolabs/talos
# - Slack: kubernetes.slack.com #talos
```

Debugging extension loading issues on Talos Linux requires patience and a methodical approach. The API-driven model means you cannot just poke around the filesystem, but the structured logging and resource APIs provide all the information you need to identify and resolve problems. Build familiarity with the diagnostic commands covered here, and you will be able to handle any extension issue that comes your way.

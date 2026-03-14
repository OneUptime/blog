# Mounting BPF Filesystem with systemd for Cilium: Configure, Troubleshoot, Validate, and Monitor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, eBPF, systemd, Linux

Description: Learn how to persistently mount the BPF filesystem using systemd for Cilium deployments, ensuring eBPF maps survive node reboots and preventing Cilium initialization failures on fresh nodes.

---

## Introduction

Cilium relies on the BPF filesystem (`bpffs`) mounted at `/sys/fs/bpf` to store eBPF maps that persist across Cilium agent restarts. These maps contain the current state of network policies, connection tracking tables, and load balancing rules. If the BPF filesystem is not mounted when Cilium starts, the agent will fail to initialize, leaving nodes with non-functional networking.

While the Cilium DaemonSet can mount the BPF filesystem via an init container, this approach is fragile: if the init container fails or the mount is lost, subsequent Cilium restarts will fail. The recommended approach is to mount the BPF filesystem persistently via systemd before any container runtime or Kubernetes components start. This ensures the mount point is always available, regardless of Cilium's init container state.

This guide covers how to configure a persistent BPF filesystem mount using systemd, troubleshoot mount failures, validate correct mounting, and monitor mount health.

## Prerequisites

- Linux nodes running systemd (Ubuntu 18.04+, CentOS 7+, Fedora, Debian)
- Node access via SSH or `kubectl debug`
- `kubectl` with cluster admin access
- Basic familiarity with systemd units

## Configure BPF Filesystem Mount with systemd

Create a systemd mount unit for the BPF filesystem:

```bash
# Create the systemd mount unit
sudo tee /etc/systemd/system/sys-fs-bpf.mount <<EOF
[Unit]
Description=BPF mounts
Documentation=https://docs.cilium.io/
DefaultDependencies=no
Before=local-fs.target umount.target
After=swap.target

[Mount]
What=bpffs
Where=/sys/fs/bpf
Type=bpf
Options=rw,nosuid,nodev,noexec,relatime,mode=700

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the mount
sudo systemctl daemon-reload
sudo systemctl enable sys-fs-bpf.mount
sudo systemctl start sys-fs-bpf.mount

# Verify the mount
mount | grep /sys/fs/bpf
```

Configure via /etc/fstab as an alternative:

```bash
# Add to /etc/fstab for persistent mount
echo "none /sys/fs/bpf bpf rw,nosuid,nodev,noexec,relatime,mode=700 0 0" | \
  sudo tee -a /etc/fstab

# Mount immediately
sudo mount /sys/fs/bpf

# Verify
mountpoint /sys/fs/bpf
```

For nodes provisioned with cloud-init:

```yaml
# cloud-init configuration for auto-mounting BPF FS
# Add to user-data or cloud-init scripts
runcmd:
  - |
    cat > /etc/systemd/system/sys-fs-bpf.mount <<'EOF'
    [Unit]
    Description=BPF mounts
    DefaultDependencies=no
    Before=local-fs.target
    After=swap.target
    [Mount]
    What=bpffs
    Where=/sys/fs/bpf
    Type=bpf
    Options=rw,nosuid,nodev,noexec,relatime,mode=700
    [Install]
    WantedBy=multi-user.target
    EOF
    systemctl daemon-reload
    systemctl enable sys-fs-bpf.mount
    systemctl start sys-fs-bpf.mount
```

## Troubleshoot BPF Filesystem Issues

Diagnose BPF mount failures:

```bash
# Check if BPF FS is currently mounted
mount | grep bpf
mountpoint /sys/fs/bpf

# Check systemd mount unit status
systemctl status sys-fs-bpf.mount

# View mount unit logs
journalctl -u sys-fs-bpf.mount --no-pager

# Check if kernel supports BPF FS
grep CONFIG_BPF_SYSCALL /boot/config-$(uname -r) 2>/dev/null || \
  grep CONFIG_BPF_SYSCALL /proc/config.gz 2>/dev/null || \
  echo "Check /boot/config-$(uname -r)"

# Check Cilium init container logs for BPF mount errors
kubectl -n kube-system describe pod <cilium-pod> | grep -A 5 "mount-bpf-fs"
kubectl -n kube-system logs <cilium-pod> -c mount-bpf-fs
```

Fix common BPF mount errors:

```bash
# Issue: Mount fails with "unknown filesystem type 'bpf'"
# Kernel module needs to be loaded
modprobe bpf 2>/dev/null || echo "BPF built-in to kernel"
# Check: CONFIG_BPF=y in kernel config

# Issue: Permission denied on /sys/fs/bpf
ls -la /sys/fs/
# Fix permissions
chmod 700 /sys/fs/bpf
chown root:root /sys/fs/bpf

# Issue: Mount lost after reboot (unit not enabled)
systemctl is-enabled sys-fs-bpf.mount
systemctl enable sys-fs-bpf.mount

# Issue: Cilium init container mounting but mount lost
# Check if mount propagation is correct
kubectl -n kube-system get ds cilium -o yaml | grep mountPropagation
# Should be: mountPropagation: Bidirectional
```

## Validate BPF Filesystem

Confirm the BPF filesystem is correctly mounted and functional:

```bash
# Validate mount exists and is correct type
mount | grep /sys/fs/bpf
# Expected: bpffs on /sys/fs/bpf type bpf (rw,nosuid,nodev,noexec,relatime,mode=700)

# Validate Cilium can create BPF maps
kubectl -n kube-system exec ds/cilium -- \
  cilium bpf ct list global | head -5
# If this fails, BPF FS is not working

# Check BPF maps exist
kubectl -n kube-system exec ds/cilium -- ls /sys/fs/bpf/tc/globals/

# Verify across all nodes
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  STATUS=$(kubectl debug node/$node --image=ubuntu -q -- \
    mountpoint /sys/fs/bpf && echo "MOUNTED" || echo "NOT MOUNTED" 2>/dev/null)
  echo "$node: $STATUS"
done
```

## Monitor BPF Filesystem Health

```mermaid
graph TD
    A[Node Boot] -->|systemd| B[sys-fs-bpf.mount]
    B -->|Mounts| C[/sys/fs/bpf]
    C -->|Available| D[Cilium Agent starts]
    D -->|Creates| E[eBPF Maps in /sys/fs/bpf]
    E -->|Persist across| F[Cilium restarts]
    G[Monitor] -->|Check mount| H{Mounted?}
    H -->|No| I[Alert + Auto-mount]
    H -->|Yes| J[Healthy]
```

Set up BPF mount monitoring:

```bash
# Monitor systemd mount unit status
systemctl status sys-fs-bpf.mount --no-pager

# Create a node monitoring script
cat > /usr/local/bin/check-bpf-mount.sh <<'EOF'
#!/bin/bash
if ! mountpoint -q /sys/fs/bpf; then
  logger -t cilium "BPF filesystem not mounted, attempting to mount"
  mount -t bpf bpffs /sys/fs/bpf -o rw,nosuid,nodev,noexec,relatime,mode=700
  if [ $? -eq 0 ]; then
    logger -t cilium "BPF filesystem mounted successfully"
  else
    logger -t cilium "ERROR: Failed to mount BPF filesystem"
    exit 1
  fi
fi
EOF
chmod +x /usr/local/bin/check-bpf-mount.sh

# Run as a systemd service with periodic check
# or add to node monitoring (Prometheus node-exporter textfile collector)
```

## Conclusion

Persistently mounting the BPF filesystem via systemd is a best practice for production Cilium deployments. The systemd mount unit ensures the BPF filesystem is available before any container runtime or Kubernetes components start, eliminating a common class of Cilium initialization failures. Validate BPF mount presence on all nodes after any infrastructure maintenance and include it in your node provisioning automation to prevent issues on newly added nodes.

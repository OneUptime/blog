# How to Use Modular libvirt Daemons (virtqemud) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, libvirt, virtqemud, Virtualization, Daemons, Linux

Description: Learn how to use the modular libvirt daemon architecture on RHEL 9, where virtqemud and other specialized daemons replace the monolithic libvirtd.

---

RHEL 9 introduces modular libvirt daemons as the default architecture, replacing the monolithic `libvirtd`. Instead of a single daemon handling everything, individual daemons handle specific drivers. The primary daemon for KVM is `virtqemud`. This improves security, isolation, and resource management.

## Understanding the Modular Architecture

The monolithic `libvirtd` is replaced by several specialized daemons:

```bash
# Key modular daemons:
# virtqemud    - QEMU/KVM virtual machine management
# virtnetworkd - Virtual network management
# virtstoraged - Storage pool and volume management
# virtnodedevd - Host device management (USB, PCI passthrough)
# virtsecretd  - Secret/credential management
# virtinterfaced - Host network interface management
# virtproxyd   - Proxy daemon for remote connections
```

## Checking Which Architecture is Active

```bash
# Check if the monolithic libvirtd is running
sudo systemctl status libvirtd

# Check if modular daemons are running
sudo systemctl status virtqemud
sudo systemctl status virtnetworkd
sudo systemctl status virtstoraged

# On RHEL 9, modular daemons should be the default
```

## Switching from Monolithic to Modular Daemons

```bash
# Stop the monolithic daemon
sudo systemctl stop libvirtd
sudo systemctl stop libvirtd.socket
sudo systemctl stop libvirtd-ro.socket
sudo systemctl stop libvirtd-admin.socket

# Disable it
sudo systemctl disable libvirtd

# Enable and start the modular daemons
sudo systemctl enable --now virtqemud.socket
sudo systemctl enable --now virtnetworkd.socket
sudo systemctl enable --now virtstoraged.socket
sudo systemctl enable --now virtnodedevd.socket
sudo systemctl enable --now virtsecretd.socket

# Enable the proxy daemon for remote connections
sudo systemctl enable --now virtproxyd.socket
```

## Verifying the Modular Daemons

```bash
# Check all virtualization daemons
sudo systemctl list-units 'virt*' --all

# Verify VM management works
sudo virsh list --all

# Test creating a storage pool
sudo virsh pool-list --all

# Test network management
sudo virsh net-list --all
```

## Configuring virtqemud

```bash
# The configuration file for virtqemud
sudo cat /etc/libvirt/virtqemud.conf

# Common settings to adjust:
# max_clients - maximum number of client connections
# max_workers - number of worker threads
# log_level - logging verbosity (1=debug, 2=info, 3=warning, 4=error)

# Edit the configuration
sudo vi /etc/libvirt/virtqemud.conf

# Restart after changes
sudo systemctl restart virtqemud
```

## Logging and Troubleshooting

```bash
# Check virtqemud logs
sudo journalctl -u virtqemud --since "1 hour ago"

# Check virtual network daemon logs
sudo journalctl -u virtnetworkd --since "1 hour ago"

# Enable debug logging for troubleshooting
sudo tee /etc/libvirt/virtqemud.conf.d/debug.conf << 'EOF'
log_level = 1
log_outputs = "1:file:/var/log/libvirt/virtqemud-debug.log"
EOF

sudo systemctl restart virtqemud
```

## Reverting to Monolithic libvirtd

```bash
# If needed, you can revert to the monolithic daemon
sudo systemctl stop virtqemud.socket virtnetworkd.socket virtstoraged.socket
sudo systemctl disable virtqemud.socket virtnetworkd.socket virtstoraged.socket

sudo systemctl enable --now libvirtd
```

The modular daemon architecture is the recommended approach on RHEL 9. It provides better security through isolation - a bug in the storage daemon cannot affect the QEMU daemon, and each daemon can be restarted independently without impacting running VMs.

# How to Use Modular libvirt Daemons (virtqemud) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Libvirt, Virtqemud, Virtualization, Daemon, Linux

Description: Learn how to use the modular libvirt daemon architecture on RHEL, where virtqemud and other specialized daemons replace the monolithic libvirtd.

---

RHEL 9 uses modular libvirt daemons by default on fresh installations, replacing the monolithic `libvirtd`. If you upgraded from RHEL 8, the host may still use `libvirtd`. Instead of a single daemon handling everything, individual daemons handle specific drivers. The primary daemon for KVM is `virtqemud`. This improves isolation and resource management.

## Understanding the Modular Architecture

The monolithic `libvirtd` is replaced by several specialized daemons:

```bash
# Key modular daemons:

# virtqemud    - QEMU/KVM virtual machine management
# virtnetworkd - Virtual network management
# virtstoraged - Storage pool and volume management
# virtnodedevd - Host device management (USB, PCI passthrough)
# virtnwfilterd - Network filter management
# virtsecretd  - Secret/credential management
# virtinterfaced - Host network interface management
# virtproxyd   - Proxy daemon for remote connections
```

## Checking Which Architecture is Active

```bash
# Check if the monolithic libvirtd is running
sudo systemctl is-active libvirtd.service
sudo systemctl is-active libvirtd.socket

# Check if modular daemons are running
sudo systemctl is-active virtqemud.service
sudo systemctl is-active virtqemud.socket
sudo systemctl is-active virtnetworkd.socket
sudo systemctl is-active virtstoraged.socket

# On a fresh RHEL 9 installation, modular daemons should be the default
```

## Switching from Monolithic to Modular Daemons

```bash
# Shut down or live migrate running VMs before switching daemon modes

# Stop the monolithic daemon
sudo systemctl stop libvirtd.service
sudo systemctl stop libvirtd{,-ro,-admin,-tcp,-tls}.socket

# Disable it
sudo systemctl disable libvirtd.service
sudo systemctl disable libvirtd{,-ro,-admin,-tcp,-tls}.socket

# Enable and start the modular daemons
for drv in qemu interface network nodedev nwfilter secret storage; do
  sudo systemctl unmask virt${drv}d.service
  sudo systemctl unmask virt${drv}d{,-ro,-admin}.socket
  sudo systemctl enable virt${drv}d.service
  sudo systemctl enable virt${drv}d{,-ro,-admin}.socket
  sudo systemctl start virt${drv}d{,-ro,-admin}.socket
done

# Enable the proxy daemon for remote connections
# If libvirtd-tls.socket was enabled, include virtproxyd-tls.socket as well
sudo grep listen_tls /etc/libvirt/libvirtd.conf
sudo systemctl unmask virtproxyd.service
sudo systemctl unmask virtproxyd{,-ro,-admin}.socket
sudo systemctl enable virtproxyd.service
sudo systemctl enable virtproxyd{,-ro,-admin}.socket
sudo systemctl start virtproxyd{,-ro,-admin}.socket

# If listen_tls is set to 1, also enable the TLS socket
if sudo grep -Eq '^[[:space:]]*listen_tls[[:space:]]*=[[:space:]]*1' /etc/libvirt/libvirtd.conf; then
  sudo systemctl unmask virtproxyd-tls.socket
  sudo systemctl enable virtproxyd-tls.socket
  sudo systemctl start virtproxyd-tls.socket
fi
```

## Verifying the Modular Daemons

```bash
# Check all virtualization daemons
sudo systemctl list-units 'virt*' --all

# Verify VM management works
sudo virsh list --all

# List storage pools
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
# log_filters and log_outputs - logging verbosity and destinations

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

# Enable temporary debug logging for troubleshooting
sudo virt-admin -c virtqemud:///system daemon-log-outputs "3:journald 1:file:/var/log/libvirt/virtqemud-debug.log"
sudo virt-admin -c virtqemud:///system daemon-log-filters "3:remote 4:event 3:util.json 3:util.object 3:util.dbus 3:util.netlink 3:node_device 3:rpc 3:access 1:*"

# For persistent logging changes, edit /etc/libvirt/virtqemud.conf
```

## Reverting to Monolithic libvirtd

```bash
# If needed, you can revert to the monolithic daemon
for drv in qemu interface network nodedev nwfilter secret storage; do
  sudo systemctl stop virt${drv}d.service
  sudo systemctl stop virt${drv}d{,-ro,-admin}.socket
  sudo systemctl disable virt${drv}d.service
  sudo systemctl disable virt${drv}d{,-ro,-admin}.socket
done

sudo systemctl stop virtproxyd.service
sudo systemctl stop virtproxyd{,-ro,-admin}.socket
sudo systemctl stop virtproxyd-tls.socket
sudo systemctl disable virtproxyd.service
sudo systemctl disable virtproxyd{,-ro,-admin}.socket
sudo systemctl disable virtproxyd-tls.socket

sudo systemctl enable libvirtd.service
sudo systemctl enable --now libvirtd{,-ro,-admin}.socket
```

The modular daemon architecture is the recommended approach on RHEL 9. It provides better isolation - a daemon failure in the storage daemon does not necessarily take down the QEMU daemon, and each daemon can be restarted independently. Restarting `virtqemud` does not interrupt running VMs, although it is still best to avoid daemon restarts while VMs are running when practical.

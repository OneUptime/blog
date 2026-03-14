# How to Use Modular libvirt Daemons (virtqemud) on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Libvirt, Virtqemud, Virtualization, KVM, Linux

Description: Learn how to use the modular libvirt daemon architecture on RHEL 9, including virtqemud, for improved security and resource isolation.

---

RHEL 9 introduces a modular daemon architecture for libvirt, replacing the monolithic `libvirtd` with specialized daemons for each virtualization driver. The primary daemon for KVM/QEMU is `virtqemud`. This modular approach provides better security isolation and allows running only the components you need.

## Monolithic vs Modular Architecture

### Monolithic (libvirtd)

- Single daemon handling all drivers
- All functionality in one process
- Traditional approach from RHEL 8

### Modular (RHEL 9 default)

- Separate daemons per driver: `virtqemud`, `virtnetworkd`, `virtstoraged`, etc.
- Better security isolation
- Smaller attack surface per daemon
- Independent restart without affecting other components

## Modular Daemons

| Daemon | Function |
|--------|----------|
| virtqemud | QEMU/KVM VM management |
| virtnetworkd | Virtual network management |
| virtstoraged | Storage pool/volume management |
| virtnodedevd | Node device management (PCI, USB) |
| virtsecretd | Secret management |
| virtnwfilterd | Network filter management |
| virtinterfaced | Host network interface management |
| virtproxyd | Proxy for remote connections |

## Checking Current Configuration

See which daemons are running:

```bash
systemctl list-units 'virt*' --type=service
```

Check if monolithic or modular:

```bash
systemctl is-active libvirtd
systemctl is-active virtqemud
```

## Switching from Monolithic to Modular

If your system is still using libvirtd:

```bash
# Stop and disable the monolithic daemon
sudo systemctl stop libvirtd
sudo systemctl disable libvirtd
sudo systemctl stop libvirtd.socket
sudo systemctl disable libvirtd.socket

# Enable modular daemons
for drv in qemu network storage nodedev secret nwfilter interface proxy; do
    sudo systemctl enable --now virt${drv}d.socket
    sudo systemctl enable --now virt${drv}d-ro.socket
done
```

## Configuring virtqemud

The main configuration file:

```bash
sudo vi /etc/libvirt/virtqemud.conf
```

Key settings:

```text
# Maximum number of clients
max_clients = 5000

# Maximum queued clients
max_queued_clients = 1000

# Logging
log_level = 3
log_outputs = "3:syslog:virtqemud"
```

## Managing Modular Daemons

```bash
# Restart only the QEMU daemon (VMs continue running)
sudo systemctl restart virtqemud

# Restart only the network daemon
sudo systemctl restart virtnetworkd

# Check status
sudo systemctl status virtqemud
```

One key advantage: restarting `virtqemud` does not affect running VMs because QEMU processes are independent.

## Socket Activation

Modular daemons use socket activation by default:

```bash
systemctl status virtqemud.socket
```

The daemon starts on demand when a connection arrives, saving resources on idle systems.

## Remote Connections

For remote management, `virtproxyd` handles incoming connections and routes them to the appropriate modular daemon:

```bash
sudo systemctl enable --now virtproxyd.socket
```

Connect remotely:

```bash
virsh -c qemu+ssh://host/system list
```

## Logging

View daemon logs:

```bash
journalctl -u virtqemud -f
```

## Reverting to Monolithic Mode

If needed:

```bash
for drv in qemu network storage nodedev secret nwfilter interface proxy; do
    sudo systemctl stop virt${drv}d.socket
    sudo systemctl disable virt${drv}d.socket
done

sudo systemctl enable --now libvirtd.socket
```

## Summary

RHEL 9 uses modular libvirt daemons by default, with virtqemud handling QEMU/KVM operations. This architecture provides better security isolation, independent component management, and socket activation for resource efficiency. Each daemon manages its specific area, allowing you to restart components without affecting others or disrupting running VMs.

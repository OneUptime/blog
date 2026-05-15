# How to Install and Run QEMU as a Standalone Hypervisor on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, QEMU, Virtualization, Linux

Description: Learn how to install and Run QEMU as a Standalone Hypervisor on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to install and run QEMU/KVM virtualization on RHEL. On RHEL, QEMU is normally managed through libvirt instead of running `qemu-*` commands directly. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A registered RHEL system with hardware virtualization support enabled in the firmware

## Overview

Installing and running QEMU/KVM virtualization requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Verify that the system can support virtualization:

```bash
lscpu | grep Virtualization
```

## Step 2: Install Required Packages

```bash
sudo dnf install -y qemu-kvm libvirt virt-install virt-viewer
```

Verify the installation:

```bash
rpm -qi qemu-kvm libvirt virt-install virt-viewer
```

## Step 3: Configure the Service

Create or edit the main QEMU libvirt daemon configuration file if you need to make persistent daemon changes:

```bash
sudo vi /etc/libvirt/virtqemud.conf
```

Apply the recommended settings for your environment. Start with the defaults and adjust based on your workload and hardware.

## Step 4: Start the Virtualization Services

```bash
for drv in qemu network nodedev nwfilter secret storage interface; do
    sudo systemctl start virt${drv}d{,-ro,-admin}.socket
done
```

Confirm that the QEMU libvirt daemon is available:

```bash
systemctl status virtqemud.socket
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo virt-host-validate
```

Check that libvirt can connect to the local QEMU/KVM hypervisor:

```bash
sudo virsh list --all
```

Check the logs for any errors:

```bash
journalctl -u virtqemud.service -f
```

## Step 6: Configure Firewall Rules

For basic outbound-only VM networking with the default libvirt NAT network, no additional firewall rule is usually needed. If you expose a graphical VNC console for a VM, open the VNC port you configured:

```bash
sudo firewall-cmd --add-port 5901/tcp
```

If the default libvirt network is not active, enable and start it:

```bash
sudo virsh net-autostart default
sudo virsh net-start default
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload. For RHEL virtualization hosts, use the `virtual-host` TuneD profile:

```bash
sudo tuned-adm profile virtual-host
tuned-adm active
```

Check running VMs and host processes when troubleshooting performance:

```bash
sudo virsh list
top
```

## Security Considerations

- Use libvirt tools such as `virsh` and `virt-install` instead of running `qemu-*` commands directly on RHEL
- Use SSH or TLS for remote libvirt connections when remote administration is required
- Restrict externally exposed VM console and network ports with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Virtualization validation fails**: Check `sudo virt-host-validate` and follow the displayed instructions
2. **Default network not found**: Verify the default network with `sudo virsh net-list --all` and start it with `sudo virsh net-start default`
3. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
4. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured QEMU/KVM virtualization on RHEL through libvirt. Monitor the host regularly and keep it updated to maintain security and performance.

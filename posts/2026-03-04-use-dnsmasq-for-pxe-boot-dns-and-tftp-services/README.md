# How to Use dnsmasq for PXE Boot DNS and TFTP Services on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, Dnsmasq, PXE Boot, Linux

Description: Learn how to use dnsmasq for PXE Boot DNS and TFTP Services on RHEL with step-by-step instructions, configuration examples, and best practices.

---

dnsmasq can serve as a PXE boot server by combining its DNS, DHCP, and builRHELFTP capabilities. This is ideal for automated OS installation across a neRHELwithout needing separate DHCP and TFTP servers.

## Prerequisites

- RHEL
- Root or sudo access
- PXE boot images (kernel and initrd)
- Network boot-capable client machines

## Step 1: Install dnsmasq

```bash
sudo dnf install -y dnsmasq
```

## Step 2: Configure DHCP with PXE Options

```bash
sudo vi /etc/dnsmasq.conf
```

```ini
interface=eth0
bind-interfaces

# DHCP range
dhcp-range=192.168.1.100,192.168.1.200,12h

# PXE boot options
dhcp-boot=pxelinux.0
enable-tftp
tftp-root=/var/lib/tftpboot

# DNS
server=8.8.8.8
domain=lab.local
```

## Step 3: Prepare TFTP Boot Files

```bash
sudo mkdir -p /var/lib/tftpboot/pxelinux.cfg
sudo dnf install -y syslinux-tftpboot
sudo cp /tftpboot/pxelinux.0 /var/lib/tftpboot/
sudo cp /tftpboot/ldlinux.c32 /var/lib/tftpboot/
```

## Step 4: Create PXE Boot Menu

```bash
sudo vi /var/lib/tftpboot/pxelinux.cfg/default
```

```bash
DEFAULT menu.c32
PROMPT 0
TIMEOUT 300

LABEL rhel9
  MENU LABEL Install RHEL 9
  KERNEL images/rhel9/vmlinuz
  APPEND initrd=images/rhel9/initrd.img inst.repo=http://192.168.1.10/rhel9 ip=dhcp
```

## Step 5: Copy Kernel and Initrd

```bash
sudo mkdir -p /var/lib/tftpboot/images/rhel9
sudo cp /path/to/vmlinuz /var/lib/tftpboot/images/rhel9/
sudo cp /path/to/initrd.img /var/lib/tftpboot/images/rhel9/
```

## Step 6: Configure Firewall

```bash
sudo firewall-cmd --permanent --add-service=dns
sudo firewall-cmd --permanent --add-service=dhcp
sudo firewall-cmd --permanent --add-service=tftp
sudo firewall-cmd --reload
```

## Step 7: Start dnsmasq

```bash
sudo systemctl enable --now dnsmasq
```

## Step 8: Test PXE Boot

Boot a client machine from the network. It should:
1. Get an IP address from dnsmasq DHCP
2. Download pxelinux.0 via TFTP
3. Display the boot menu
4. Load the RHEL 9 installer

## Conclusion

dnsmasq provides a simple all-in-one PXE boot solution on RHEL 9 by combining DNS, DHCP, and TFTP in a single service. This approach is much simpler than configuring separate daemons for each protocol.
RHEL
# How to Install Ubuntu Server Without a Monitor (Headless Install)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Headless, Installation, Server, Remote

Description: Learn how to install Ubuntu Server on hardware without a monitor using serial console, automated Autoinstall, or pre-configured cloud images for fully headless deployments.

---

Running a server installation without a connected monitor is a common scenario: rack servers in a datacenter, Raspberry Pi devices in a closet, remote machines, or hardware where a monitor is unavailable. Ubuntu Server supports several methods for headless installation, ranging from serial console access to fully automated installs that require no interaction at all.

## Method 1: Serial Console Installation

Most server hardware has a serial port (UART) or a BMC (Baseboard Management Controller) with KVM-over-IP or serial-over-LAN. These give you a console session without a physical monitor.

### Connecting via Serial Port

Connect a USB-to-serial adapter or straight serial cable from your workstation to the server's serial port (usually DB-9 or RJ-45 labeled "Console" or "Serial").

On your workstation, use `screen`, `minicom`, or `picocom` to connect:

```bash
# Find the serial device
ls /dev/ttyUSB* /dev/ttyS*

# Connect with screen (115200 baud is common for servers)
screen /dev/ttyUSB0 115200

# Or with minicom
minicom -D /dev/ttyUSB0 -b 115200

# Or with picocom (simpler)
picocom -b 115200 /dev/ttyUSB0
```

### Enabling Serial Console in Ubuntu Installer

The Ubuntu Server live installer does not automatically redirect to serial. You need to tell the kernel to use the serial console by appending kernel parameters at boot.

At the GRUB menu (on the machine's physical video output), press `e` to edit the boot entry. Add to the `linux` line:

```text
console=tty0 console=ttyS0,115200n8
```

The full modified line looks like:

```text
linux   /casper/vmlinuz  console=tty0 console=ttyS0,115200n8 quiet ---
```

When two `console=` parameters are given, the last one listed becomes the primary console where interactive prompts appear. So `ttyS0` receives the installer output.

Press F10 to boot. The installer will appear on your serial connection.

### IPMI / iDRAC / iLO / BMC Console

Enterprise servers have BMC chips that provide out-of-band management without depending on the main CPU or OS:

- **Dell**: iDRAC (Integrated Dell Remote Access Controller)
- **HP/HPE**: iLO (Integrated Lights-Out)
- **Supermicro**: IPMI with IPMI web interface
- **Generic**: IPMI 2.0 with SOL (Serial Over LAN)

Access the BMC via its dedicated network port and web interface, then use the virtual console to install Ubuntu as if you had a physical monitor.

For IPMI Serial Over LAN (SOL):

```bash
# Access console via IPMI SOL
ipmitool -I lanplus -H 192.168.1.10 -U admin -P password sol activate

# Access BIOS/UEFI setup
ipmitool -I lanplus -H 192.168.1.10 -U admin -P password chassis bootdev cdrom
ipmitool -I lanplus -H 192.168.1.10 -U admin -P password power reset
```

### SSH During Installation (Subiquity Feature)

The Ubuntu Server live installer exposes SSH on port 22 during installation, allowing you to complete the installation over SSH after a minimal physical interaction to start networking:

1. Boot the installer (you need a display to get past GRUB, or configure PXE boot)
2. The installer will print an IP address and a connection token when network is configured
3. From another machine: `ssh installer@<ip-address>`
4. Enter the token when prompted
5. Complete the installation remotely through the SSH session

## Method 2: Fully Automated (Autoinstall)

The cleanest headless approach requires zero interaction. Using Ubuntu's Autoinstall feature, the machine installs itself without any prompts.

### Setting Up the Autoinstall Configuration

Create an `autoinstall.yaml` file:

```yaml
#cloud-config
autoinstall:
  version: 1
  locale: en_US.UTF-8
  keyboard:
    layout: us
  network:
    network:
      version: 2
      ethernets:
        enp0s3:
          dhcp4: true
  storage:
    layout:
      name: lvm
  identity:
    hostname: headless-server
    username: admin
    # Generate with: openssl passwd -6 "YourPassword"
    password: "$6$rounds=4096$salt$hashedpassword"
  ssh:
    install-server: true
    authorized-keys:
      - "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... your_key"
    allow-pw: false
  packages:
    - curl
    - htop
  late-commands:
    - curtin in-target -- bash -c "ufw allow ssh && ufw --force enable"
```

### Serving the Config via HTTP

```bash
# Host on a simple Python HTTP server
mkdir /tmp/autoinstall-server
cp user-data /tmp/autoinstall-server/
touch /tmp/autoinstall-server/meta-data   # Required, can be empty

cd /tmp/autoinstall-server
python3 -m http.server 8080
```

### Modifying the ISO to Boot Automatically

Extract and modify the ISO to pass the autoinstall parameters without manual intervention at GRUB:

```bash
# Install tools
sudo apt install xorriso isolinux

# Extract ISO
mkdir /tmp/ubuntu-iso
sudo mount -o loop ubuntu-24.04-live-server-amd64.iso /mnt
sudo cp -rT /mnt /tmp/ubuntu-iso
sudo umount /mnt
sudo chmod -R u+w /tmp/ubuntu-iso

# Modify GRUB configuration to automatically boot with autoinstall
sudo nano /tmp/ubuntu-iso/boot/grub/grub.cfg
```

Find the default menu entry and add autoinstall parameters:

```text
# In grub.cfg, find the linux line and add:
linux /casper/vmlinuz autoinstall ds=nocloud-net\;s=http://192.168.1.10:8080/ quiet ---
```

The `\;` escapes the semicolon in GRUB syntax.

Set the timeout to 0 for immediate boot:

```text
set timeout=0
```

Repack the ISO:

```bash
sudo xorriso -as mkisofs \
    -r -V "Ubuntu Autoinstall" \
    -cache-inodes -J -l \
    -isohybrid-mbr /usr/lib/ISOLINUX/isohdpfx.bin \
    -partition_offset 16 \
    -b isolinux/isolinux.bin \
    -c isolinux/boot.cat \
    -no-emul-boot -boot-load-size 4 -boot-info-table \
    -eltorito-alt-boot \
    -e boot/grub/efi.img \
    -no-emul-boot \
    -isohybrid-gpt-basdat \
    -o ubuntu-autoinstall.iso /tmp/ubuntu-iso
```

Write the custom ISO to a USB drive and plug it into the headless machine. It will install without any interaction.

## Method 3: Cloud Images for Virtual Machines

For headless VM deployment, Ubuntu cloud images (pre-installed) with cloud-init are far faster than running the installer:

```bash
# Download the cloud image
wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img

# Resize if needed (cloud image defaults to 2 GB)
qemu-img resize noble-server-cloudimg-amd64.img 40G

# Create a cloud-init seed ISO
cat > user-data << 'EOF'
#cloud-config
hostname: vm-server
users:
  - name: admin
    groups: sudo
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-ed25519 AAAA... your_key
ssh_pwauth: false
package_update: true
packages:
  - vim
  - htop
EOF

touch meta-data
genisoimage -output seed.iso -volid cidata -joliet -rock user-data meta-data

# Launch the VM headlessly
qemu-system-x86_64 \
    -enable-kvm \
    -m 2048 \
    -smp 2 \
    -drive file=noble-server-cloudimg-amd64.img,if=virtio \
    -drive file=seed.iso,media=cdrom \
    -netdev user,id=net0,hostfwd=tcp::2222-:22 \
    -device virtio-net-pci,netdev=net0 \
    -daemonize \
    -display none

# Wait for boot and SSH in
sleep 30
ssh -p 2222 admin@127.0.0.1
```

## Method 4: PXE Network Boot for Large Deployments

PXE (Preboot Execution Environment) boots machines from the network, serving the Ubuntu installer kernel, initrd, and autoinstall configuration automatically. Every machine that boots from the network gets Ubuntu installed without any physical media.

### Set Up the PXE Server

```bash
# Install dnsmasq (DHCP + TFTP server)
sudo apt install dnsmasq -y

# Configure dnsmasq for PXE
sudo tee /etc/dnsmasq.d/pxe.conf << 'EOF'
# DHCP range
dhcp-range=192.168.1.100,192.168.1.200,12h

# PXE boot file
dhcp-boot=pxelinux.0

# TFTP root
enable-tftp
tftp-root=/srv/tftp
EOF

# Create TFTP directory structure
sudo mkdir -p /srv/tftp/ubuntu-24.04
```

Copy Ubuntu netboot files to the TFTP server:

```bash
# Extract netboot kernel and initrd from the ISO
sudo mount ubuntu-24.04-live-server-amd64.iso /mnt
sudo cp /mnt/casper/vmlinuz /srv/tftp/ubuntu-24.04/
sudo cp /mnt/casper/initrd /srv/tftp/ubuntu-24.04/
sudo umount /mnt
```

Create PXE boot configuration:

```bash
sudo mkdir -p /srv/tftp/pxelinux.cfg
sudo tee /srv/tftp/pxelinux.cfg/default << 'EOF'
DEFAULT ubuntu-autoinstall
LABEL ubuntu-autoinstall
  KERNEL ubuntu-24.04/vmlinuz
  INITRD ubuntu-24.04/initrd
  APPEND autoinstall ds=nocloud-net;s=http://192.168.1.10:8080/ ip=dhcp quiet ---
EOF
```

Any machine set to PXE boot first will receive the Ubuntu installer and configuration automatically.

## Verifying Headless Installation Success

Since you cannot see the screen, verify the install completed:

```bash
# Attempt SSH connection to the expected IP
ssh admin@192.168.1.x

# Or scan for the new server's SSH port
nmap -p 22 192.168.1.0/24 --open | grep "Nmap scan report"

# Check the server is responding to pings
ping -c 3 192.168.1.x
```

For automated deployments, have the `late-commands` section in autoinstall POST a signal to a monitoring URL when installation completes:

```yaml
late-commands:
  - curtin in-target -- bash -c "curl -s https://your-monitor.example.com/installed/$(hostname)"
```

This gives you a notification that the install finished, visible before the machine reboots.

Headless Ubuntu installation is a fully supported and commonly used workflow. The key is choosing the right method for your environment: serial console for one-off installs on physical hardware, Autoinstall with a custom ISO for batch deployments, and cloud images with cloud-init for virtual environments.

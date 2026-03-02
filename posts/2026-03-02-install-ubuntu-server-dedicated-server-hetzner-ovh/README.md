# How to Install Ubuntu Server on a Dedicated Server from Hetzner/OVH

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Hetzner, OVH, Dedicated Server, Hosting

Description: A practical guide to installing Ubuntu Server on dedicated servers from Hetzner and OVH, covering rescue mode installation, their automated setup systems, and post-install hardening.

---

Dedicated server providers like Hetzner and OVH offer bare-metal servers at competitive prices, often with Ubuntu Server as a supported OS option. Both providers have automated installation systems, but knowing how to install Ubuntu manually via their rescue environments gives you much more control and is necessary when you need a custom partition layout, encrypted drives, or a specific Ubuntu version not offered by their automation tools.

## Hetzner Dedicated Servers

Hetzner provides two ways to install Ubuntu on dedicated servers:

1. **installimage**: Hetzner's own automated installation tool available in rescue mode
2. **Manual rescue install**: Full manual installation via the rescue system

### Method 1: Hetzner installimage

This is the fastest approach. Boot into rescue mode from the Hetzner Robot panel:

1. Log into robot.hetzner.com
2. Select your server
3. Go to "Rescue" tab
4. Select "Linux 64-bit" as the rescue system
5. Set a temporary root password
6. Click "Activate rescue system"
7. Reset the server (using the "Reset" tab)

SSH into the rescue system:

```bash
ssh root@<server-ip>
# Use the temporary password set in the rescue tab
```

Run installimage:

```bash
installimage
```

The TUI (text interface) presents configuration options. Edit the generated config file to customize the installation. Here is a typical Hetzner installimage config for Ubuntu Server with LVM:

```bash
# After running installimage, it opens a config file editor
# Key sections to modify:

# OS to install
DRIVE1 /dev/sda
DRIVE2 /dev/sdb     # Add if you have multiple drives for RAID

# Software RAID (comment out if single disk)
# SWRAID 1
# SWRAIDLEVEL 1

# Bootloader
BOOTLOADER grub

# Hostname
HOSTNAME ubuntu-server

# Partitions
PART /boot ext3 1G
PART lvm vg0 all

# Logical Volumes
LV vg0 root / ext4 30G
LV vg0 swap swap swap 4G
LV vg0 var /var ext4 20G
LV vg0 tmp /tmp ext4 5G

# Ubuntu version
IMAGE /root/.oldroot/nfs/install/../images/Ubuntu-2404-noble-amd64-base.tar.gz
```

Save and exit the editor. installimage downloads and installs Ubuntu. The server reboots into the fresh installation.

### Method 2: Hetzner Manual Installation via Rescue

For full control, install Ubuntu manually from the rescue environment. This is useful for encrypted disks or unusual configurations.

Boot into rescue mode as above, then:

```bash
# Install debootstrap if not present
apt-get update && apt-get install -y debootstrap

# Partition the disks
parted /dev/sda mklabel gpt
parted /dev/sda mkpart ESP fat32 1MiB 513MiB
parted /dev/sda set 1 esp on
parted /dev/sda mkpart boot ext4 513MiB 1.5GiB
parted /dev/sda mkpart lvm 1.5GiB 100%

# Format
mkfs.fat -F32 /dev/sda1
mkfs.ext4 /dev/sda2
pvcreate /dev/sda3
vgcreate vg0 /dev/sda3
lvcreate -L 40G -n root vg0
lvcreate -L 4G -n swap vg0
mkfs.ext4 /dev/vg0/root
mkswap /dev/vg0/swap

# Mount
mount /dev/vg0/root /mnt
mkdir -p /mnt/boot
mount /dev/sda2 /mnt/boot
mkdir -p /mnt/boot/efi
mount /dev/sda1 /mnt/boot/efi

# Bootstrap
debootstrap noble /mnt http://archive.ubuntu.com/ubuntu

# Chroot and configure (same process as the debootstrap guide)
mount --bind /dev /mnt/dev
mount --bind /dev/pts /mnt/dev/pts
mount -t proc proc /mnt/proc
mount -t sysfs sysfs /mnt/sys
mount --bind /sys/firmware/efi/efivars /mnt/sys/firmware/efi/efivars
cp /etc/resolv.conf /mnt/etc/resolv.conf

chroot /mnt bash
```

Inside the chroot:

```bash
apt update
apt install -y linux-image-generic grub-efi-amd64 openssh-server sudo vim netplan.io

# User setup
useradd -m -s /bin/bash -G sudo admin
mkdir -p /home/admin/.ssh
echo "YOUR_SSH_KEY" >> /home/admin/.ssh/authorized_keys
chown -R admin:admin /home/admin/.ssh
chmod 700 /home/admin/.ssh && chmod 600 /home/admin/.ssh/authorized_keys

# fstab
cat > /etc/fstab << EOF
/dev/vg0/root  /         ext4  defaults  0  1
/dev/vg0/swap  none      swap  sw        0  0
/dev/sda2      /boot     ext4  defaults  0  2
/dev/sda1      /boot/efi vfat  umask=0077 0 2
EOF

# GRUB
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu
update-grub

# Network (get the interface name from the rescue system)
IFACE=$(ip link | grep -v 'lo:' | grep -E '^[0-9]+:' | awk -F': ' '{print $2}' | head -1)
cat > /etc/netplan/00-server.yaml << EOF
network:
  version: 2
  ethernets:
    ${IFACE}:
      dhcp4: true
EOF

# Hostname
echo "ubuntu-hetzner" > /etc/hostname
systemctl enable ssh

exit
# Unmount and reboot
```

### Hetzner Cloud Servers (VPS)

For Hetzner Cloud (not dedicated), Ubuntu installation is through the cloud console:

```bash
# Using hcloud CLI
hcloud server create \
    --name my-server \
    --type cx21 \
    --image ubuntu-24.04 \
    --ssh-key your-key-name \
    --location nbg1

# With cloud-init user-data
hcloud server create \
    --name my-server \
    --type cx21 \
    --image ubuntu-24.04 \
    --ssh-key your-key-name \
    --user-data-from-file cloud-init.yaml
```

## OVH / OVHcloud Dedicated Servers

OVH's approach differs from Hetzner's. OVH provides a web-based OS installation system through their manager panel, or you can use rescue mode for manual installs.

### Method 1: OVH Automated Installation

From the OVH Manager:

1. Go to Bare Metal Cloud - Dedicated Servers - select your server
2. Click "Install" (or "Reinstall")
3. Select "Install from an OVH template"
4. Choose "Ubuntu 24.04 LTS (Noble)" from the OS list
5. Select the server profile (basic, personal, customer)
6. Configure options:
   - Partition scheme (guided or custom)
   - Hostname
   - SSH key
7. Click Install

OVH's automated install handles RAID configuration if your server has multiple disks. Choose RAID level in the partition configuration screen.

### Method 2: OVH Rescue Mode

For custom configurations, use rescue mode:

1. In OVH Manager, go to your server
2. Click "Boot" - "Rescue"
3. Select "rescue-customer-linux" (or the latest available)
4. Confirm and reboot
5. OVH sends the rescue password to your registered email

SSH into the rescue system:

```bash
ssh root@<server-ip>
# Use the password from the email
```

OVH rescue systems may present the disks differently. Check available devices:

```bash
# List block devices
lsblk

# OVH servers with SoftRAID often show as /dev/md0
# Check current RAID status
cat /proc/mdstat

# Or standard NVMe drives
ls /dev/nvme*
ls /dev/sd*
```

Manual installation from OVH rescue:

```bash
# Assuming a clean dual-NVMe server set up as software RAID 1
# First, clean any existing RAID
mdadm --stop /dev/md*
mdadm --zero-superblock /dev/nvme0n1
mdadm --zero-superblock /dev/nvme1n1

# Partition both drives identically
for disk in nvme0n1 nvme1n1; do
    parted /dev/${disk} mklabel gpt
    parted /dev/${disk} mkpart ESP fat32 1MiB 513MiB
    parted /dev/${disk} set 1 esp on
    parted /dev/${disk} mkpart boot ext4 513MiB 1.5GiB
    parted /dev/${disk} mkpart lvm 1.5GiB 100%
done

# Create software RAID 1 for boot
mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/nvme0n1p2 /dev/nvme1n1p2

# Create software RAID 1 for main data
mdadm --create /dev/md1 --level=1 --raid-devices=2 /dev/nvme0n1p3 /dev/nvme1n1p3

# Format
mkfs.fat -F32 /dev/nvme0n1p1    # EFI on disk 1 (mirrored manually)
mkfs.fat -F32 /dev/nvme1n1p1    # EFI on disk 2
mkfs.ext4 /dev/md0               # /boot on RAID 1
pvcreate /dev/md1
vgcreate vg0 /dev/md1
lvcreate -L 40G -n root vg0
lvcreate -L 8G -n swap vg0
mkfs.ext4 /dev/vg0/root
mkswap /dev/vg0/swap

# Continue with debootstrap installation as above...
```

## Post-Install Hardening for Dedicated Servers

After installation on either platform, apply these security configurations before exposing the server to the internet:

```bash
# Update immediately
sudo apt update && sudo apt upgrade -y

# Firewall - restrict to only what is needed
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw enable

# Fail2ban
sudo apt install fail2ban -y
sudo systemctl enable --now fail2ban

# Disable root login and password auth
sudo tee /etc/ssh/sshd_config.d/hardening.conf << 'EOF'
PasswordAuthentication no
PermitRootLogin no
MaxAuthTries 3
EOF
sudo systemctl restart ssh

# Check for and remove any password from root
sudo passwd -l root

# Enable automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## Hetzner-Specific Post-Install Notes

```bash
# Install Hetzner's RAID monitoring tool if using software RAID
sudo apt install mdadm -y
echo "MAILADDR root" | sudo tee -a /etc/mdadm/mdadm.conf
sudo update-initramfs -u

# Hetzner's network - servers often have multiple interfaces
# Check which is the public interface
ip route show default

# Check for private network interface (Hetzner dedicated servers often have one)
ip addr show
```

## OVH-Specific Post-Install Notes

```bash
# OVH servers may have the vRack network interface (private networking)
# List interfaces
ip link show

# OVH provides a monitoring IP they use to check server health
# Do not block it in UFW: OVH uses 167.114.37.0/24 for monitoring
sudo ufw allow from 167.114.37.0/24

# Install OVH RTM (Real Time Monitoring) if required by your OVH SLA
# Check OVH documentation for the latest RTM installation commands
```

## Automating with Hetzner API

For repeatable server deployments:

```bash
# Install hcloud CLI
wget https://github.com/hetznercloud/cli/releases/latest/download/hcloud-linux-amd64.tar.gz
tar xzf hcloud-linux-amd64.tar.gz
sudo mv hcloud /usr/local/bin/

# Configure CLI
hcloud context create my-project
export HCLOUD_TOKEN="your-api-token"

# Create server
hcloud server create \
    --name prod-server-01 \
    --type cx31 \
    --image ubuntu-24.04 \
    --datacenter nbg1-dc3 \
    --ssh-key your-key \
    --user-data-from-file cloud-init.yaml

# View server info
hcloud server describe prod-server-01
```

Both Hetzner and OVH are excellent dedicated server providers for Ubuntu deployments. Hetzner's installimage is particularly well-thought-out and handles most common configurations automatically, while OVH's web-based installer is straightforward. For either provider, the rescue mode manual installation approach gives you complete flexibility when you need something their automation does not support.

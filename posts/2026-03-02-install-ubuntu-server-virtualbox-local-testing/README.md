# How to Install Ubuntu Server on VirtualBox for Local Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VirtualBox, Virtualization, Installation, Testing

Description: Step-by-step guide to running Ubuntu Server in VirtualBox for local development and testing, covering VM creation, network modes, shared folders, and snapshots.

---

VirtualBox is a free, open-source hypervisor that runs on Windows, macOS, and Linux. It is a popular choice for running Ubuntu Server locally because it costs nothing, works across all major host operating systems, and has enough features for serious development and testing work. The performance is not quite as good as VMware Workstation, but for most server testing purposes - web servers, databases, CI/CD, containerized workloads - it is more than sufficient.

## What You Need

- VirtualBox 7.x or later (download from virtualbox.org)
- VirtualBox Extension Pack (for USB 3.0, NVMe, RDP - download separately from the same page)
- Ubuntu Server 24.04 LTS ISO
- Host machine with at least 8 GB RAM (you will share this with the VM)

## Installing VirtualBox

### On Windows

Download the Windows installer from virtualbox.org and run it. Install the Extension Pack afterward:
- Open VirtualBox
- File - Tools - Extension Pack Manager
- Click the + icon and select the downloaded `.vbox-extpack` file

### On macOS

```bash
# Install via Homebrew
brew install --cask virtualbox
brew install --cask virtualbox-extension-pack
```

### On Ubuntu Host

```bash
# Add VirtualBox repository
wget -O- https://www.virtualbox.org/download/oracle_vbox_2016.asc | sudo gpg --dearmor --yes --output /usr/share/keyrings/oracle-virtualbox-2016.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/oracle-virtualbox-2016.gpg] https://download.virtualbox.org/virtualbox/debian $(lsb_release -cs) contrib" | sudo tee /etc/apt/sources.list.d/virtualbox.list
sudo apt update
sudo apt install virtualbox-7.0
```

## Creating the Virtual Machine

Open VirtualBox and click "New".

### Name and Operating System

- Name: `ubuntu-server-test` (or something descriptive)
- Folder: where you want to store VM files
- ISO Image: Browse to your Ubuntu Server ISO
- Type: Linux
- Version: Ubuntu (64-bit)

Check "Skip Unattended Installation" to control the install yourself.

### Hardware

- Base Memory: 2048 MB minimum, 4096 MB recommended
- Processors: 2 (enable "Enable EFI" if you want UEFI boot mode)

### Hard Disk

- Create a Virtual Hard Disk now
- Size: 40 GB minimum (80 GB if you will install databases or large apps)
- Pre-allocate Full Size: leave unchecked (dynamically allocated is fine)

Click Finish to create the VM.

## Adjusting VM Settings Before First Boot

Right-click the VM and go to Settings:

### System Tab

- Motherboard: Boot Order: move Optical first
- Processor: Enable "Enable PAE/NX" and "Enable VT-x/AMD-V" if available

### Storage Tab

Verify the Ubuntu ISO is attached to the virtual optical drive. If not:
- Click the CD icon under Controller: IDE or SATA
- Click the CD icon on the right side
- Choose File and select your ISO

### Network Tab

VirtualBox offers several network modes:

**NAT (default)**: VM shares host's internet connection. VM can reach the internet but is not reachable from the local network by default. Fine for basic testing.

**Bridged Adapter**: VM gets its own IP from your local router. Reachable from other machines on your network. Best for servers you want to access from multiple machines.

**Host-only Adapter**: VM can only communicate with the host. Good for isolated testing. Create a host-only network first: File - Tools - Network Manager.

**Internal Network**: Multiple VMs can communicate with each other but not with the host or internet. Good for simulating isolated network segments.

For a development server you SSH into from your host, either NAT or Host-only works. For Host-only, you need to add a second NAT adapter for internet access.

### Adding a Host-only Adapter for SSH + Internet

1. In Settings - Network - Adapter 1: NAT (for internet)
2. Adapter 2: Host-only Adapter (for SSH from host)
3. Select the host-only network (create one first in File - Network Manager if needed)

The VM gets two interfaces: one with internet access (NAT) and one with a stable IP for SSH from your host.

## Installing Ubuntu Server

Start the VM. It will boot from the ISO.

Complete the Ubuntu Server installation with default settings:
- Language, keyboard, network (DHCP is fine)
- Storage: Use entire disk with LVM
- Profile: set username and password
- SSH: enable OpenSSH server

When installation completes, the installer will ask you to remove the installation medium. In VirtualBox, the virtual optical drive is automatically unmounted on restart in most configurations. Click "Reboot now" and proceed.

## First Boot and SSH Access

After reboot, log in at the console and find your IP:

```bash
# Show all IP addresses
ip addr show

# If using NAT only - find the NAT IP
ip addr show enp0s3

# If using Host-only - find the host-only IP
ip addr show enp0s8
```

SSH from your host machine:

```bash
ssh username@192.168.56.x   # Host-only network IP
# or
ssh username@10.0.2.15       # NAT IP (if port-forwarding is configured)
```

### NAT Port Forwarding for SSH

If using only NAT, set up port forwarding to reach the VM via SSH:

```bash
# From host: VirtualBox command line port forwarding
VBoxManage modifyvm "ubuntu-server-test" --natpf1 "ssh,tcp,,2222,,22"
```

Then SSH using the forwarded port:

```bash
ssh -p 2222 username@127.0.0.1
```

Or configure it in the GUI: Settings - Network - Adapter 1 - Advanced - Port Forwarding.

## Installing Guest Additions

VirtualBox Guest Additions improve performance and enable shared folders. On Ubuntu Server:

```bash
# Install dependencies
sudo apt update
sudo apt install -y build-essential linux-headers-$(uname -r)

# Mount Guest Additions ISO (in VirtualBox: Devices - Insert Guest Additions CD Image)
sudo mount /dev/cdrom /mnt

# Run the installer
sudo /mnt/VBoxLinuxAdditions.run

# Or install from Ubuntu repositories (easier, usually slightly older version)
sudo apt install virtualbox-guest-utils
```

Reboot after installation:

```bash
sudo reboot
```

Verify Guest Additions are loaded:

```bash
lsmod | grep vbox
# You should see vboxguest and vboxsf
```

## Shared Folders

Shared folders let you exchange files between your host and the VM without SCP or SFTP:

1. In VM Settings - Shared Folders, click the + icon
2. Set Folder Path to a directory on your host
3. Set Folder Name (e.g., `shared`)
4. Check "Auto-mount" and "Make Permanent"

After Guest Additions are installed, the shared folder appears at `/media/sf_shared/` or mount it manually:

```bash
# Mount shared folder manually
sudo mount -t vboxsf shared /mnt/shared

# Add your user to vboxsf group for access without sudo
sudo usermod -aG vboxsf $USER
# Log out and back in for the group change to take effect
```

## Taking and Restoring Snapshots

Snapshots are invaluable for testing. Take one before any experiment:

```bash
# From host command line
VBoxManage snapshot "ubuntu-server-test" take "clean-install" --description "Fresh install, nothing configured"

# List snapshots
VBoxManage snapshot "ubuntu-server-test" list

# Restore a snapshot (VM must be powered off)
VBoxManage snapshot "ubuntu-server-test" restore "clean-install"
```

In the GUI: Machine - Take Snapshot while the VM is running or paused.

## Cloning a VM

Cloning creates a new independent VM from an existing one:

```bash
# Full clone (independent copy)
VBoxManage clonevm "ubuntu-server-test" --name "ubuntu-nginx-test" --register

# Linked clone (shares disk with parent, saves space)
VBoxManage clonevm "ubuntu-server-test" --name "ubuntu-linked-clone" --snapshot "clean-install" --options Link --register
```

Linked clones share the base disk image with the parent and only store differences, making them much faster to create and saving significant disk space.

## Headless Operation

Run the VM in the background without a visible window:

```bash
# Start VM headlessly
VBoxManage startvm "ubuntu-server-test" --type headless

# Stop the VM gracefully (ACPI shutdown)
VBoxManage controlvm "ubuntu-server-test" acpipowerbutton

# Force stop
VBoxManage controlvm "ubuntu-server-test" poweroff
```

Headless operation is ideal when you just want the server running in the background and SSH-ing in to work with it.

## Troubleshooting

### VT-x/AMD-V Not Available

Enable hardware virtualization in BIOS/UEFI settings. On Windows 11, also ensure Hyper-V and Windows Sandbox are disabled (they can conflict with VirtualBox).

### Shared Folders Permission Denied

```bash
# Add user to vboxsf group
sudo adduser $USER vboxsf
# Then log out and back in
```

### Slow Disk Performance

Enable the NVMe or SATA AHCI controller instead of IDE. In Settings - Storage, click the Controller, change to "SATA" type, then move the disk to it.

VirtualBox provides a solid free platform for Ubuntu Server testing. The combination of snapshots, cloning, and multiple network modes makes it versatile for simulating real server scenarios on your local machine.

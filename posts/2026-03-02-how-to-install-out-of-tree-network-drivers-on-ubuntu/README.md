# How to Install Out-of-Tree Network Drivers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Kernel, Drivers, DKMS

Description: Step-by-step guide to installing out-of-tree network drivers on Ubuntu, covering source compilation, DKMS integration, and troubleshooting common driver issues.

---

Out-of-tree network drivers are kernel modules that are not part of the mainline Linux kernel source. They come up when you have a network card with a newer driver than what shipped with your kernel, or when the vendor provides an enhanced version with features not yet merged upstream. Common examples include certain Realtek WiFi adapters, Intel network cards with newer firmware requirements, and various 10GbE/25GbE cards from smaller vendors.

## Checking Current Driver Status

Before installing a new driver, identify what is currently loaded and whether the existing driver is working.

```bash
# List network interfaces and their status
ip link show

# Identify which driver each interface uses
for iface in $(ls /sys/class/net/); do
    driver=$(readlink /sys/class/net/$iface/device/driver 2>/dev/null | awk -F/ '{print $NF}')
    echo "$iface: ${driver:-no driver}"
done

# Get detailed info about a specific interface (e.g., eth0)
ethtool -i eth0

# Find the PCI ID of a network card
lspci -k | grep -A3 -i network
```

## Finding the Right Driver

```bash
# Get the PCI vendor and device ID
lspci -nn | grep -i ethernet

# Example output:
# 03:00.0 Ethernet controller [0200]: Realtek Semiconductor Co., Ltd. RTL8111/8168 [10ec:8168] (rev 15)
# The numbers in brackets are [vendor_id:device_id]

# Search the kernel module database for your PCI ID
modinfo $(lspci -k | grep -A2 "Ethernet" | grep "Kernel driver" | awk '{print $NF}')
```

## Installing Drivers from Distribution Packages

Many out-of-tree drivers are packaged in Ubuntu's repositories or in the hardware-enablement stack.

```bash
# Search for driver packages
apt-cache search realtek | grep -i driver
apt-cache search rtl | grep -i kernel

# Install a common out-of-tree Realtek driver
sudo apt install r8168-dkms

# Install Intel network drivers (e1000e, igb, ixgbe)
sudo apt install linux-modules-extra-$(uname -r)

# Some drivers are in the restricted or hardware-enablement packages
sudo ubuntu-drivers list

# Install all recommended drivers
sudo ubuntu-drivers install
```

## Compiling a Driver from Vendor Source

When the packaged version is too old or the vendor provides their own source.

```bash
# Install build dependencies
sudo apt install build-essential dkms linux-headers-$(uname -r) git

# Example: Installing the Realtek r8125 driver (2.5GbE)
git clone https://github.com/awesometic/realtek-r8125-dkms.git
cd realtek-r8125-dkms

# Many vendor drivers include a makefile with an install target
sudo make install

# Or install via the provided install script
sudo ./dkms-install.sh
```

For drivers that do not include a DKMS install script, set it up manually.

```bash
# Example: Manual DKMS setup for a driver in /tmp/r8125-9.013.02/
DRIVER_NAME="r8125"
DRIVER_VERSION="9.013.02"
SRC_DIR="/tmp/r8125-9.013.02"

# Copy source to DKMS directory
sudo mkdir -p /usr/src/${DRIVER_NAME}-${DRIVER_VERSION}
sudo cp -r ${SRC_DIR}/src/* /usr/src/${DRIVER_NAME}-${DRIVER_VERSION}/

# Create a dkms.conf
sudo tee /usr/src/${DRIVER_NAME}-${DRIVER_VERSION}/dkms.conf << EOF
PACKAGE_NAME="${DRIVER_NAME}"
PACKAGE_VERSION="${DRIVER_VERSION}"
BUILT_MODULE_NAME[0]="${DRIVER_NAME}"
DEST_MODULE_LOCATION[0]="/kernel/drivers/net/ethernet/realtek"
AUTOINSTALL="yes"
EOF

# Add, build, and install
sudo dkms add -m ${DRIVER_NAME} -v ${DRIVER_VERSION}
sudo dkms build -m ${DRIVER_NAME} -v ${DRIVER_VERSION}
sudo dkms install -m ${DRIVER_NAME} -v ${DRIVER_VERSION}
```

## Unloading the Old Driver Before Loading the New One

If the kernel already has a built-in driver for your card, unload it before loading the new one.

```bash
# Check what is currently loaded
lsmod | grep r8169  # old Realtek driver

# Unload the old driver
sudo modprobe -r r8169

# Load the new driver
sudo modprobe r8125

# Verify the new driver is active
lsmod | grep r8125
ethtool -i eth0
```

## Blacklisting the Old Driver

To permanently prevent the kernel from loading the old driver, blacklist it.

```bash
# Create a blacklist file
sudo tee /etc/modprobe.d/blacklist-r8169.conf << 'EOF'
# Blacklist the old r8169 driver to use the vendor r8125 driver instead
blacklist r8169
EOF

# Update initramfs to apply the blacklist at boot
sudo update-initramfs -u

# Reboot for changes to take effect
sudo reboot
```

## Verifying Driver Installation

After reboot, confirm the correct driver is loaded.

```bash
# Check which driver is in use
ethtool -i eth0
# Look for "driver: r8125" in the output

# Check DKMS status
dkms status

# Verify the module info
modinfo r8125

# Check kernel messages for driver initialization
dmesg | grep -i r8125
```

## Setting Up Priority for the New Driver

If both the old and new driver are present, you may need to set module loading priority.

```bash
# Create a modprobe configuration to alias the old name to the new driver
sudo tee /etc/modprobe.d/r8125-alias.conf << 'EOF'
# Use r8125 wherever r8169 is requested
install r8169 modprobe r8125
EOF

sudo update-initramfs -u
```

## Installing Wireless Network Drivers

Wireless adapters often need out-of-tree drivers more frequently than wired cards.

```bash
# Identify the wireless card
lspci -k | grep -A3 "Network controller"
# or for USB wireless adapters
lsusb

# Common wireless driver packages
sudo apt install rtl8812au-dkms      # Realtek 802.11ac USB adapters
sudo apt install rtl8821ce-dkms      # Realtek 8821CE PCIe
sudo apt install mt7921u-firmware    # MediaTek 7921

# For Broadcom wireless (common in laptops)
sudo apt install bcmwl-kernel-source
sudo modprobe wl
```

## Handling Secure Boot

On systems with Secure Boot enabled, unsigned kernel modules cannot be loaded.

```bash
# Check if Secure Boot is enabled
mokutil --sb-state

# Sign a module for Secure Boot
# First, create a signing key (one-time setup)
openssl req -new -x509 -newkey rsa:2048 -keyout /root/signing.key \
  -out /root/signing.crt -days 3650 -subj "/CN=Module Signing/"

# Sign the compiled module
sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file \
  sha256 \
  /root/signing.key \
  /root/signing.crt \
  /lib/modules/$(uname -r)/updates/dkms/r8125.ko

# Enroll the certificate in the MOK (Machine Owner Key) database
sudo mokutil --import /root/signing.crt
# You will be prompted to set a password, then reboot to enroll
```

## Troubleshooting Driver Issues

```bash
# Module fails to load - check for missing dependencies
modinfo r8125 | grep depends
sudo modprobe -v r8125

# Check for kernel errors
sudo journalctl -k | grep -i "r8125\|error\|fail" | tail -20

# Rebuild the module if it shows as "built" but not "installed"
dkms status
sudo dkms install -m r8125 -v 9.013.02 --force

# If the interface does not appear after loading the module
ip link show
sudo udevadm trigger
```

Once your out-of-tree driver is installed via DKMS, kernel upgrades will trigger automatic recompilation, so the driver stays functional without manual intervention.

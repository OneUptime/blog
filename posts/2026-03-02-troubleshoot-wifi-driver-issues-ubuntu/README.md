# How to Troubleshoot WiFi Driver Issues on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, WiFi, Drivers, Troubleshooting, Networking

Description: Learn how to diagnose and fix WiFi driver issues on Ubuntu, including identifying hardware, installing firmware, and resolving common wireless connectivity problems.

---

WiFi driver problems are among the most common headaches when setting up Ubuntu on new hardware. The issue ranges from the wireless card not being detected at all, to connecting but having poor performance, to randomly dropping connections. This guide walks through the diagnostic process systematically.

## Step 1: Identify Your WiFi Hardware

Start by determining exactly what WiFi hardware you have:

```bash
# List all PCI devices - covers most laptop and desktop WiFi cards
lspci | grep -i wireless
lspci | grep -i network

# List USB devices - covers USB WiFi adapters
lsusb

# More detailed output for the WiFi device
lspci -vvv | grep -A 20 -i wireless

# Get the exact hardware ID (vendor:device format)
lspci -nn | grep -i wireless
# Example output: 02:00.0 Network controller [0280]: Intel Corporation Wi-Fi 6 AX200 [8086:2723]
```

Write down the vendor and device IDs (the numbers in brackets like `[8086:2723]`). These identify the exact chip and help find the correct driver.

## Step 2: Check if the Driver is Loaded

```bash
# List loaded kernel modules related to WiFi
lsmod | grep -E "iwl|ath|rtl|brcm|mt76|wl"

# Check if your specific driver is loaded
# Common driver names:
# Intel WiFi: iwlwifi
# Atheros/Qualcomm: ath9k, ath10k, ath11k
# Realtek: rtl8192ce, rtl8723be, rtlwifi
# Broadcom: brcmfmac, wl
# Ralink/MediaTek: rt2800usb, mt7601u

# Check kernel messages for driver loading
dmesg | grep -E "wifi|wireless|wlan|firmware"
dmesg | tail -50

# Check for the wireless interface
ip link show
iw dev
```

If `iw dev` shows no wireless interfaces, the driver is either not loaded or not installed.

## Step 3: Check for Missing Firmware

Many WiFi drivers require binary firmware files that are separate from the driver itself:

```bash
# Check for firmware loading errors in kernel messages
dmesg | grep -i firmware
dmesg | grep -i "failed to load"

# Check what firmware files are installed
ls /lib/firmware/ | grep -E "iwl|ath|rtl|brcm"

# For Intel WiFi, check for iwlwifi firmware
ls /lib/firmware/iwlwifi-*.ucode 2>/dev/null

# Install firmware packages
# Ubuntu provides firmware through several packages:
sudo apt install firmware-linux-free -y  # Free firmware
sudo apt install firmware-linux-nonfree -y 2>/dev/null || true
sudo apt install linux-firmware -y  # Common firmware files

# For Intel WiFi specifically
sudo apt install firmware-iwlwifi -y 2>/dev/null || sudo apt install linux-firmware -y
```

After installing firmware, reload the driver:

```bash
# Find the driver module name from dmesg
dmesg | grep "Direct firmware load"

# Unload and reload the driver (replace iwlwifi with your driver)
sudo modprobe -r iwlwifi
sudo modprobe iwlwifi

# Check if it worked
dmesg | tail -30
iw dev
```

## Step 4: Broadcom-Specific Fixes

Broadcom cards are notoriously problematic on Linux. They have multiple driver options:

```bash
# Identify Broadcom chip
lspci -nn | grep -i broadcom
lsusb | grep -i broadcom

# Check the hardware ID against known Broadcom chips
# Common BCM4313, BCM43xx series need special handling

# Install Broadcom drivers (try in order)
# Option 1: Open-source brcmfmac driver (preferred)
sudo apt install firmware-brcm80211 -y 2>/dev/null || sudo apt install linux-firmware -y

# Option 2: Proprietary Broadcom driver (if brcmfmac doesn't work)
sudo apt install bcmwl-kernel-source -y

# If using proprietary driver, blacklist the open-source one
echo "blacklist brcmsmac" | sudo tee /etc/modprobe.d/blacklist-brcm.conf
echo "blacklist bcma" | sudo tee -a /etc/modprobe.d/blacklist-brcm.conf
sudo update-initramfs -u
sudo reboot
```

## Step 5: Realtek Driver Issues

Realtek USB adapters often need out-of-tree drivers:

```bash
# Check your Realtek chip
lsusb | grep -i realtek
lspci | grep -i realtek

# Install build tools for compiling drivers
sudo apt install build-essential dkms git linux-headers-$(uname -r) -y

# For rtl8812au (common USB adapter chipset)
git clone https://github.com/aircrack-ng/rtl8812au.git
cd rtl8812au
sudo make dkms_install

# For rtl8821ce (common laptop WiFi chip)
git clone https://github.com/tomaspinho/rtl8821ce.git
cd rtl8821ce
sudo make dkms_install
```

## Step 6: Check for RF Kill (Hardware or Software Disable)

```bash
# List all rfkill devices
rfkill list all

# Output example:
# 0: phy0: Wireless LAN
#     Soft blocked: yes
#     Hard blocked: no

# Unblock software kill switch
sudo rfkill unblock wifi

# Or unblock everything
sudo rfkill unblock all

# If hard blocked, check for a physical WiFi switch on the laptop
# or a function key combination (Fn+F2, etc.)
```

## Step 7: Debug Connection Issues

If the driver loads and the interface appears but connections fail:

```bash
# Check signal strength and connected AP
iw dev wlan0 link

# View detailed connection information
iw dev wlan0 station dump

# Watch wpa_supplicant logs for authentication issues
sudo journalctl -u wpa_supplicant -f

# Check NetworkManager logs
sudo journalctl -u NetworkManager -f

# Try connecting manually to isolate the issue
sudo ip link set wlan0 up
sudo wpa_supplicant -D nl80211 -i wlan0 -c /etc/wpa_supplicant/wpa_supplicant.conf -d
```

## Step 8: Power Management Issues

WiFi power management can cause dropped connections and poor performance:

```bash
# Check current power management setting
iwconfig wlan0 | grep "Power Management"
# or
cat /sys/class/net/wlan0/device/power/control

# Disable power management for the interface
sudo iwconfig wlan0 power off

# Disable via NetworkManager (more reliable)
sudo tee /etc/NetworkManager/conf.d/wifi-pm-off.conf << 'EOF'
[connection]
wifi.powersave = 2
EOF
# wifi.powersave values: 0=default, 1=ignore, 2=disable, 3=enable

sudo systemctl restart NetworkManager
```

Make the power management setting persistent:

```bash
# Create a udev rule to disable power management on boot
sudo tee /etc/udev/rules.d/70-wifi-pm-off.rules << 'EOF'
ACTION=="add", SUBSYSTEM=="net", KERNEL=="wlan*", RUN+="/usr/sbin/iwconfig %k power off"
EOF
```

## Step 9: Kernel Driver Parameters

Some drivers accept parameters that can fix issues:

```bash
# For iwlwifi (Intel), disable hardware encryption if there are issues
sudo tee /etc/modprobe.d/iwlwifi.conf << 'EOF'
# Disable hardware encryption (fixes some firmware bugs)
options iwlwifi swcrypto=1

# Disable 11n if 802.11n causes instability
# options iwlwifi 11n_disable=1
EOF

# Reload the driver to apply
sudo modprobe -r iwlwifi
sudo modprobe iwlwifi

# For ath9k (Atheros), disable ASPM if you have disconnects
sudo tee /etc/modprobe.d/ath9k.conf << 'EOF'
options ath9k nohwcrypt=1
EOF
```

## Step 10: Install Proprietary Drivers via ubuntu-drivers

```bash
# Ubuntu's built-in driver manager can find appropriate drivers
sudo ubuntu-drivers devices

# Auto-install recommended drivers
sudo ubuntu-drivers autoinstall

# Or install a specific driver
sudo apt install nvidia-driver-535  # Example for GPU, similar process for WiFi
```

## Collecting Information for Bug Reports

If nothing works, gather information to report the bug or seek help:

```bash
# Comprehensive system information
sudo apt install lshw -y
sudo lshw -class network -short

# Detailed hardware info
sudo lshw -class network

# Full kernel log
dmesg > /tmp/dmesg-wifi.txt
cat /tmp/dmesg-wifi.txt | grep -i -E "wifi|wireless|wlan|firmware|iwl|ath|rtl|brcm"

# Driver and module information
modinfo iwlwifi 2>/dev/null || modinfo ath9k 2>/dev/null

# Kernel and Ubuntu version
uname -a
lsb_release -a
```

Post this information to the Ubuntu forums, Ask Ubuntu, or the relevant kernel mailing list. Include the hardware IDs from `lspci -nn` as that is the most reliable way to identify the exact chip.

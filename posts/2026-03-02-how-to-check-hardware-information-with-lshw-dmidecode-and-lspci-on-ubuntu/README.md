# How to Check Hardware Information with lshw, dmidecode, and lspci on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Hardware, Lshw, Dmidecode, System Administration

Description: Learn how to use lshw, dmidecode, and lspci on Ubuntu to gather detailed hardware information including CPU, memory, disks, network cards, and PCI devices.

---

When troubleshooting hardware issues, verifying a server configuration, or writing documentation for your infrastructure, you need reliable ways to query what hardware is actually present. Ubuntu includes several tools that read directly from hardware identification interfaces, giving you accurate information about what's installed rather than relying on labels or documentation that may be out of date.

## lshw - List Hardware

`lshw` provides a comprehensive hardware inventory by reading from multiple sources: DMI tables, PCI bus, USB bus, and kernel interfaces.

```bash
# Install lshw
sudo apt install -y lshw

# Full hardware listing
sudo lshw

# Shorter, more readable output
sudo lshw -short

# Output in HTML format (good for documentation)
sudo lshw -html > hardware-report.html

# Output in XML format
sudo lshw -xml > hardware.xml

# Output in JSON format
sudo lshw -json > hardware.json
```

### Filtering by Class

```bash
# Show only network devices
sudo lshw -class network

# Show only disk/storage devices
sudo lshw -class disk
sudo lshw -class storage

# Show only memory information
sudo lshw -class memory

# Show CPU information
sudo lshw -class processor

# Show display/GPU information
sudo lshw -class display

# Multiple classes at once
sudo lshw -class disk -class storage -class volume
```

Example output for a network interface:

```text
*-network
     description: Ethernet interface
     product: I210 Gigabit Network Connection
     vendor: Intel Corporation
     physical id: 0
     bus info: pci@0000:02:00.0
     logical name: eth0
     version: 03
     serial: aa:bb:cc:dd:ee:ff
     size: 1Gbit/s
     capacity: 1Gbit/s
     width: 32 bits
     clock: 33MHz
     capabilities: bus_master cap_list ethernet physical tp 10bt 10bt-fd 100bt 100bt-fd 1000bt-fd autonegotiation
```

### Checking for Disabled Hardware

```bash
# Show disabled/unclaimed hardware
sudo lshw | grep -i DISABLED
sudo lshw | grep -i UNCLAIMED

# Show hardware without drivers
sudo lshw -short | grep -v "\-"
```

## dmidecode - DMI Table Decoder

`dmidecode` reads SMBIOS/DMI data from the BIOS firmware tables. This gives you accurate information about the system board, CPU sockets, memory slots, and installed components as reported by the BIOS.

```bash
# Install dmidecode
sudo apt install -y dmidecode

# Show everything (very verbose)
sudo dmidecode

# Show specific DMI types
sudo dmidecode -t bios      # BIOS information
sudo dmidecode -t system    # System information
sudo dmidecode -t baseboard # Motherboard information
sudo dmidecode -t chassis   # Chassis information
sudo dmidecode -t processor # CPU information
sudo dmidecode -t memory    # Memory information
sudo dmidecode -t cache     # Cache information
sudo dmidecode -t port      # Port connectors
sudo dmidecode -t slot      # Expansion slots

# Get system serial number
sudo dmidecode -t system | grep Serial

# Get chassis type
sudo dmidecode -t chassis | grep Type
```

### Memory Information

`dmidecode` is particularly useful for memory details - it shows actual installed DIMMs vs. empty slots:

```bash
# Detailed memory information
sudo dmidecode -t memory

# Quick summary of installed RAM
sudo dmidecode -t memory | grep -E "Size|Type|Speed|Manufacturer|Part"

# Count occupied slots
sudo dmidecode -t memory | grep Size | grep -v "No Module"

# Full DIMM inventory
sudo dmidecode -t memory | grep -A5 "Memory Device" | \
    grep -E "Size:|Speed:|Type:|Manufacturer:|Part Number:|Serial Number:"
```

### CPU Information

```bash
# Detailed processor information
sudo dmidecode -t processor

# Get physical CPU count
sudo dmidecode -t processor | grep "Socket Designation" | wc -l

# Check CPU capabilities
sudo dmidecode -t processor | grep -E "Status|Core Count|Thread Count|Max Speed"
```

### BIOS and System Information

```bash
# Get full system information for asset tracking
sudo dmidecode -t bios | grep -E "Version|Release Date|Vendor"
sudo dmidecode -t system | grep -E "Manufacturer|Product Name|Serial Number|UUID"
sudo dmidecode -t baseboard | grep -E "Manufacturer|Product Name|Serial Number"

# Check if system is a VM
sudo dmidecode -t system | grep "Product Name"
# VMware Virtual Platform, VirtualBox, etc.
```

## lspci - List PCI Devices

`lspci` reads the PCI bus and lists all PCI and PCIe devices. This covers most major components: network cards, storage controllers, GPUs, and expansion cards.

```bash
# Install pciutils
sudo apt install -y pciutils

# List all PCI devices
lspci

# Verbose output (one level)
lspci -v

# More verbose (two levels)
lspci -vv

# Show device IDs (vendor:product)
lspci -n

# Numeric and text combined
lspci -nn

# Show kernel driver in use
lspci -k
```

### Finding Specific Devices

```bash
# Find network cards
lspci | grep -i ethernet
lspci | grep -i network

# Find storage controllers
lspci | grep -i storage
lspci | grep -i SATA
lspci | grep -i NVMe
lspci | grep -i RAID

# Find GPU
lspci | grep -i vga
lspci | grep -i display
lspci | grep -i 3D
lspci | grep -i NVIDIA
lspci | grep -i AMD

# Find USB controllers
lspci | grep -i USB

# Detailed info for a specific device
lspci -vvv -s 02:00.0
```

### Checking PCI Slots

```bash
# Show which PCIe slots are populated
lspci -vv | grep -E "^[0-9a-f]|Slot"

# Find devices without drivers
lspci -k | grep -A2 "Kernel driver" | grep -v "Kernel driver"

# Check bandwidth/speed of PCIe devices
lspci -vv | grep -E "^[0-9a-f]|LnkSta:"
```

## lsusb - USB Devices

```bash
# Install usbutils
sudo apt install -y usbutils

# List USB devices
lsusb

# Verbose output
lsusb -v

# Show device tree
lsusb -t

# Show specific device
lsusb -d 046d:c52b  # Logitech receiver
```

## Practical Use Cases

### Complete Hardware Inventory Script

```bash
#!/bin/bash
# hardware-inventory.sh - Generate hardware inventory report

OUTPUT_FILE="/tmp/hardware-inventory-$(hostname)-$(date +%Y%m%d).txt"

{
    echo "=== Hardware Inventory: $(hostname) ==="
    echo "Generated: $(date)"
    echo ""

    echo "=== System Information ==="
    sudo dmidecode -t system | grep -E "Manufacturer|Product Name|Serial Number|UUID"
    echo ""

    echo "=== BIOS Information ==="
    sudo dmidecode -t bios | grep -E "Vendor|Version|Release Date"
    echo ""

    echo "=== CPU Information ==="
    sudo dmidecode -t processor | grep -E "Socket|Family|Version|Max Speed|Core Count|Thread Count"
    echo ""

    echo "=== Memory Modules ==="
    sudo dmidecode -t memory | grep -E "Size|Speed|Type:|Manufacturer|Part Number" | \
        grep -v "No Module"
    echo ""

    echo "=== Network Interfaces ==="
    sudo lshw -class network | grep -E "description|product|vendor|serial|size"
    echo ""

    echo "=== Storage Devices ==="
    sudo lshw -class disk | grep -E "description|product|vendor|size"
    echo ""

    echo "=== PCI Devices ==="
    lspci -k
    echo ""

} | tee "$OUTPUT_FILE"

echo "Inventory saved to: $OUTPUT_FILE"
```

### Checking Available vs. Used Memory Slots

```bash
# Total memory slots
TOTAL_SLOTS=$(sudo dmidecode -t memory | grep "Memory Device" | wc -l)

# Occupied slots
OCCUPIED_SLOTS=$(sudo dmidecode -t memory | \
    grep "Size:" | grep -v "No Module" | wc -l)

echo "Memory slots: ${OCCUPIED_SLOTS} used of ${TOTAL_SLOTS} total"
sudo dmidecode -t memory | \
    grep -E "Locator:|Size:|Speed:|Manufacturer:" | \
    paste - - - -
```

### Identifying Unknown Hardware

```bash
# Find PCI devices with no driver loaded
lspci -k | grep -B2 "Kernel driver in use" | grep -v "Kernel driver" | grep "^[0-9]"

# Get vendor/device ID for unknown hardware
lspci -nn | grep -v "Linux Foundation"

# Look up the vendor/device ID in the PCI database
update-pciids  # update local PCI ID database
lspci -nn | grep "0000:0000"  # unknown devices show 0000:0000
```

### Verifying Hardware After Maintenance

After adding memory, replacing drives, or installing expansion cards:

```bash
# Quick check that new hardware is recognized
lspci | grep -i new-device-type
sudo lshw -short | grep -i storage

# Verify all expected memory is recognized
free -h
sudo dmidecode -t memory | grep "Size:" | grep -v "No Module"

# Confirm disk is visible
lsblk
sudo lshw -class disk
```

These three tools cover virtually every hardware identification need on Ubuntu. `lshw` for a comprehensive overview, `dmidecode` for BIOS-level details like serial numbers and memory slots, and `lspci` when you need to know what's on the PCI bus. Run them as root to get complete information since some interfaces require elevated privileges.

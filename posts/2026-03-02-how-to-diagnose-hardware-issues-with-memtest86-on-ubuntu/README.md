# How to Diagnose Hardware Issues with memtest86+ on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Memtest86, Memory Testing, Hardware Diagnostics, Troubleshooting

Description: A practical guide to using memtest86+ on Ubuntu to diagnose faulty RAM, understand test results, and troubleshoot memory-related system stability issues.

---

Random crashes, kernel panics, application segfaults, and data corruption can all stem from faulty RAM. Memory errors are insidious because they're intermittent - a machine might run fine for hours before a bad memory cell causes a crash. `memtest86+` is the standard tool for isolating RAM problems. It boots independently of the OS and performs exhaustive testing of all system memory.

## What memtest86+ Does

memtest86+ writes specific data patterns to every memory address it can access, then reads back and verifies those values. It tests each memory cell multiple times with different patterns designed to expose different fault types:

- **Stuck bits** - bits that always read 0 or always read 1
- **Transition faults** - bits that fail to transition between states
- **Coupling faults** - writing to one address affects another
- **Address faults** - accessing one address actually reads/writes a different address
- **Pattern sensitivity** - cells that fail with specific data patterns

Tests run multiple passes to catch intermittent faults that only appear occasionally.

## Installing memtest86+ on Ubuntu

Ubuntu's default installation typically includes memtest86+:

```bash
# Install memtest86+
sudo apt update
sudo apt install -y memtest86+

# Check if it's installed
dpkg -l memtest86+

# Verify the bootloader entry was created
grep -i memtest /boot/grub/grub.cfg
```

After installation, GRUB automatically adds memtest86+ as a boot option.

## Accessing memtest86+ Through GRUB

Reboot the system and access the GRUB menu:

```bash
# If GRUB menu doesn't appear, reboot while holding Shift (BIOS) or Esc (UEFI)
sudo reboot
```

At the GRUB menu, look for an entry like:
- "Memory test (memtest86+)"
- "Memory test (memtest86+, serial console 115200)"

Select it and press Enter. The system boots into memtest86+ and testing begins automatically.

## Running memtest86+ via USB

For systems where the OS can't boot, or when you want to use the standalone version with more features:

```bash
# Download memtest86+ ISO
wget https://www.memtest86.com/downloads/memtest86-usb.tar.gz
tar xf memtest86-usb.tar.gz

# Write to USB drive (replace sdX with your USB drive)
# WARNING: This destroys data on the USB drive
sudo dd if=memtest86-usb.img of=/dev/sdX bs=4M status=progress
sync
```

Boot from the USB drive. memtest86 (the commercial variant) has a more modern interface with pass/fail results and detailed error reporting.

## Understanding the memtest86+ Display

During testing, the screen shows:

```text
Pass: X%  |  Test #Y  |  Testing: xxxxxxxx - xxxxxxxx
Errors: 0
```

Key fields:
- **Pass** - percentage through the current test pass
- **Test** - which of the 13+ tests is currently running
- **Testing** - memory address range being tested
- **Errors** - count of detected errors (should be 0)

The test runs continuously until you stop it. One pass through all tests takes 15-30 minutes on a typical system. Multiple passes increase confidence in the results.

## Reading Test Results

### No Errors

If memtest86+ runs through multiple passes with 0 errors, the RAM is almost certainly healthy. Two full passes is usually sufficient to rule out RAM as the cause of issues.

### Errors Found

When errors appear, the display shows:

```text
ERROR: Failing address: 0x12345678 - 0x12345679
Bit: 6
Expected: 0x00000040
Found:     0x00000000
```

This tells you:
- The failing memory address (maps to a physical DIMM location)
- Which bit failed
- What value was written vs. what was read back

### Identifying the Faulty DIMM

When errors are found, you need to identify which physical DIMM is bad:

```bash
# After booting back into Ubuntu, check memory topology
sudo dmidecode -t memory | grep -E "Locator:|Size:|Bank" | paste - - -

# This shows which slot has which capacity
# Match the failing address range to a specific DIMM
```

The failing address translates to a physical location based on your memory controller's mapping. Generally:
- Remove all but one DIMM
- Run memtest86+
- If errors persist on that DIMM, it's faulty
- If no errors, that DIMM is fine
- Swap in each removed DIMM one at a time until errors reappear

## Testing Individual DIMMs

For systematic testing:

```bash
# Power down the system first
sudo shutdown -h now

# Physical steps:
# 1. Remove all DIMMs except the first one
# 2. Boot into memtest86+
# 3. Run for at least 20 minutes
# 4. Note pass/fail result
# 5. Repeat for each DIMM in isolation
```

If a DIMM passes individually but the system fails with multiple DIMMs installed, you might have:
- A compatibility issue between DIMM modules
- A memory controller limitation
- Two DIMMs that work individually but not together

## Checking Memory Speed and Configuration

memtest86+ shows the current memory configuration at the top of the screen:

```text
Memory Speed: 3200 MHz
Memory Size:  32768 MB
...
SPD Information for slot 0:
  DIMM: 16384 MB
  Type: DDR4
  Speed: 3200 MHz
  Manufacturer: SK Hynix
```

This information is useful for verifying that XMP/DOCP profiles are applied correctly and memory is running at the intended speed.

## When to Run memtest86+

Run memory tests when:
- System crashes randomly without kernel panic
- Kernel panic shows memory-related error messages (`general protection fault`, `kernel BUG at`)
- Applications segfault unexpectedly
- `dmesg` shows EDAC (Error Detection and Correction) errors
- After adding or replacing RAM
- During initial server commissioning

```bash
# Check for EDAC errors in running system
dmesg | grep -i "EDAC\|edac\|memory error"

# Check EDAC sysfs interface
ls /sys/devices/system/edac/mc/
cat /sys/devices/system/edac/mc/mc0/ue_count  # uncorrected errors
cat /sys/devices/system/edac/mc/mc0/ce_count  # corrected errors

# Install mcelog for machine check exception logging
sudo apt install -y mcelog
journalctl -u mcelog
```

## Server ECC Memory

Enterprise servers with ECC (Error Correcting Code) memory can detect and automatically correct single-bit errors:

```bash
# Check if ECC is enabled
sudo dmidecode -t memory | grep "Error Correction Type"

# Monitor ECC errors
sudo apt install -y edac-utils
sudo edac-util -s 0

# Detailed EDAC report
sudo edac-util -r

# Watch for ECC events
sudo edac-util -m -s 0
```

Even with ECC memory, a high rate of corrected errors indicates a failing DIMM that needs replacement soon - before it starts generating uncorrectable double-bit errors.

## memtest86+ Test Coverage

The tests included in memtest86+:

1. **Address test** - verifies that each address is unique
2. **Own address test** - each location holds its own address
3. **Moving inversions (8-bit)** - moving bit pattern tests
4. **Moving inversions (random)** - random pattern variations
5. **Block move** - tests memory bandwidth
6. **Moving inversions (64-bit)** - 64-bit pattern tests
7. **Random number sequence** - pseudo-random values
8. **PRBS** - Pseudo-Random Binary Sequence test
9. **Modulo 20** - tests at specific intervals
10. **Bit fade** - checks if bits change state without being written

More passes = more confidence. For production servers, running overnight (many passes) before declaring memory healthy is reasonable practice.

## Interpreting Results for Common Failure Patterns

**Errors at the same address every pass:** The specific memory cell is physically damaged. Replace the DIMM.

**Random errors scattered across addresses:** Could indicate overheating, poor power supply, or multiple failing cells. Check temperatures and power delivery before replacing RAM.

**Errors only appear after extended testing:** Thermal sensitivity - the DIMM fails when it warms up. Check airflow and cooling.

**Errors only with specific test patterns:** Pattern sensitivity faults. The DIMM fails specific data patterns but works with others. Replace the DIMM.

**Errors disappear after reseating DIMMs:** Poor contact in the slot. Clean the slot contacts and DIMM edge connector with isopropyl alcohol.

A clean run of 2+ passes through all memtest86+ tests is strong evidence that RAM is not the cause of your system issues, pointing investigation toward other components like storage, CPU, or software.

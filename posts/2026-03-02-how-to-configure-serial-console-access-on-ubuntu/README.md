# How to Configure Serial Console Access on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Server Management, Console Access, Hardware

Description: Set up serial console access on Ubuntu for out-of-band server management, remote troubleshooting, and headless hardware access via UART or USB serial.

---

Serial console access gives you a way to manage a Linux server when the network is down, the display is unavailable, or the system is not booting correctly. On embedded hardware, single-board computers, and network equipment, it is often the primary management interface. On rack servers, serial console servers (like Cyclades or Digi) aggregate serial ports from many machines, providing centralized out-of-band management. Even on cloud virtual machines, many providers expose a serial console as a recovery mechanism.

Getting serial console working on Ubuntu involves two parts: configuring the kernel to send boot messages to the serial port, and configuring a getty process to present a login prompt on that port.

## Understanding Serial Console Components

### The Serial Device

On most x86 hardware, serial ports appear as:

- `/dev/ttyS0` - First UART (COM1 on Windows)
- `/dev/ttyS1` - Second UART (COM2)
- `/dev/ttyUSB0` - USB-to-serial adapter
- `/dev/ttyAMA0` - ARM UART (Raspberry Pi and similar)

### Default Parameters

The conventional settings for serial console access:

- **Baud rate**: 115200 (modern standard), 9600 (legacy)
- **Data bits**: 8
- **Parity**: None
- **Stop bits**: 1
- **Flow control**: None

This is written as `115200n8` or "8N1 at 115200 baud".

## Step 1: Enable Serial Console in GRUB

GRUB needs to be told to send output to the serial port during boot.

```bash
sudo nano /etc/default/grub
```

Find and modify these lines:

```bash
# Set the serial terminal as the GRUB display
GRUB_TERMINAL="serial console"

# Configure the serial port parameters
GRUB_SERIAL_COMMAND="serial --speed=115200 --unit=0 --word=8 --parity=no --stop=1"

# Pass serial console to the Linux kernel as well
# console=ttyS0,115200n8 - serial console
# console=tty0 - keep the VGA console as well (order matters - last one gets kernel panics)
GRUB_CMDLINE_LINUX="console=tty0 console=ttyS0,115200n8"
```

The `GRUB_CMDLINE_LINUX` line with two `console=` entries means kernel messages go to both VGA and serial. The last `console=` entry receives kernel panics and oops messages.

Apply the changes:

```bash
sudo update-grub
```

## Step 2: Enable a Serial Getty Service

After the system boots, a login prompt needs to run on the serial port. systemd provides `getty@.service` for this:

```bash
# Enable and start serial getty on ttyS0 at 115200 baud
sudo systemctl enable serial-getty@ttyS0.service
sudo systemctl start serial-getty@ttyS0.service

# Verify the status
sudo systemctl status serial-getty@ttyS0.service
```

The `serial-getty@.service` template is already installed on Ubuntu and handles the correct baud rate when the port name follows the `ttyS0` pattern.

### Specifying the Baud Rate

If you need a non-default baud rate, create an override:

```bash
sudo systemctl edit serial-getty@ttyS0.service
```

Add in the editor:

```ini
[Service]
# Override the default baud rate
ExecStart=
ExecStart=-/sbin/agetty --keep-baud 115200,38400,9600 ttyS0 $TERM
```

## Step 3: Verify Serial Port Hardware

Before connecting, confirm the serial port is recognized:

```bash
# List serial ports
ls -la /dev/ttyS*

# Check if the UART is present in hardware
dmesg | grep -i ttyS
sudo setserial -g /dev/ttyS0
```

For USB serial adapters:

```bash
# List USB serial devices
ls -la /dev/ttyUSB*

# Check what was detected
dmesg | grep -i "usb.*serial\|ch341\|pl2303\|cp210x\|ftdi"
```

Install driver support if needed:

```bash
# Common USB serial adapter modules
sudo modprobe cp210x    # Silicon Labs CP210x
sudo modprobe ch341     # WinChipHead CH341
sudo modprobe pl2303    # Prolific PL2303
sudo modprobe ftdi_sio  # FTDI FT232
```

## Step 4: Connecting to the Serial Console

### From Another Linux System

`minicom` and `screen` are the most common terminal emulators for serial connections:

```bash
# Install minicom
sudo apt install minicom -y

# Connect to ttyS0 at 115200 baud
sudo minicom -b 115200 -o -D /dev/ttyS0

# Or use screen (simpler, no configuration file needed)
sudo screen /dev/ttyS0 115200

# Or use picocom (lightweight alternative)
sudo apt install picocom -y
sudo picocom -b 115200 /dev/ttyS0
```

To exit `screen`, press `Ctrl+A` then `K`. To exit `minicom`, press `Ctrl+A` then `X`.

### From macOS

On macOS, the serial device appears as `/dev/tty.usbserial-*` or `/dev/tty.usbmodem*`:

```bash
# List serial ports on macOS
ls /dev/tty.*

# Connect with screen
screen /dev/tty.usbserial-0001 115200

# Or use minicom installed via Homebrew
brew install minicom
minicom -b 115200 -D /dev/tty.usbserial-0001
```

### From Windows

Use PuTTY, configure it for "Serial" connection type, set the COM port, and set the baud rate to 115200.

## Configuring autologin on Serial Console (Kiosk or Embedded Use)

For embedded systems or kiosk setups where the serial console should automatically log in as a specific user:

```bash
sudo systemctl edit serial-getty@ttyS0.service
```

```ini
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin kiosk-user --noclear ttyS0 115200 xterm-256color
```

Use this only in physically secure environments - autologin means anyone with serial access gets a shell.

## Raspberry Pi and ARM Serial Console

On Raspberry Pi, the default serial console is on `/dev/ttyAMA0` (the hardware UART) or `/dev/ttyS0` (the mini UART). Ubuntu Server for Raspberry Pi uses the same systemd approach:

```bash
# Enable serial getty on the ARM UART
sudo systemctl enable serial-getty@ttyAMA0.service
sudo systemctl start serial-getty@ttyAMA0.service
```

For Raspberry Pi, also check `/boot/firmware/cmdline.txt` (Ubuntu) or `/boot/cmdline.txt` (Raspberry Pi OS):

```text
console=serial0,115200 console=tty1 root=... rootfstype=ext4 ...
```

## Serial Console for Network Switches and Routers

If you are managing network equipment via serial console from an Ubuntu server, set up a serial console server:

```bash
# Install conserver for multi-port console server
sudo apt install conserver-server -y

# Or use ser2net to expose serial ports over TCP
sudo apt install ser2net -y
sudo nano /etc/ser2net.conf
```

```ini
# ser2net.conf - expose ttyS0 on TCP port 7000
2000:telnet:600:/dev/ttyS0:115200 8DATABITS NONE 1STOPBIT banner
```

```bash
sudo systemctl enable --now ser2net
```

Then connect from anywhere on your network:

```bash
telnet your-console-server 2000
```

## Debugging Serial Console Issues

### No Output on Serial Port

```bash
# Check if serial port is in use by another process
sudo fuser /dev/ttyS0

# Test sending data to the serial port directly
echo "test" > /dev/ttyS0

# Verify GRUB configuration was applied
grep -i serial /boot/grub/grub.cfg | head -5

# Check kernel command line - should include console=ttyS0
cat /proc/cmdline
```

### Garbled Characters

Garbled text means the baud rates do not match. Verify both ends are set to the same rate. Common mismatches occur when the BIOS uses 9600 baud and Ubuntu is configured for 115200.

### Login Prompt Appears but Login Fails

```bash
# Check if ttyS0 is listed in /etc/securetty (required for root login on older systems)
grep ttyS0 /etc/securetty

# Add it if missing
echo "ttyS0" | sudo tee -a /etc/securetty
```

On modern Ubuntu with PAM, `/etc/securetty` may not be used. Check `/etc/pam.d/login` for `pam_securetty.so`.

## Security Hardening

Serial console access bypasses network-layer security controls. Harden accordingly:

```bash
# Ensure the serial port device has correct permissions
ls -la /dev/ttyS0
# Should be: crw-rw---- 1 root dialout

# Remove non-admin users from dialout group
# Only users in the 'dialout' group can access serial ports without root
getent group dialout

# For root-only access, restrict with a custom getty that requires root password
sudo systemctl edit serial-getty@ttyS0.service
```

Combine serial console with [OneUptime](https://oneuptime.com) monitoring so you are alerted when serial console logins occur outside expected maintenance windows.

## Testing the Full Configuration

After configuration, reboot and watch what happens on the serial line:

```bash
# Initiate a reboot and watch the serial console from another machine
sudo reboot
```

On the serial terminal you should see:

1. GRUB menu (sent to serial)
2. Kernel boot messages with `console=ttyS0`
3. systemd boot sequence
4. Login prompt from `serial-getty@ttyS0.service`

## Summary

Serial console access on Ubuntu is configured through two mechanisms: GRUB sends early boot output to the serial port, and `serial-getty@ttyS0.service` provides the post-boot login prompt. Once configured, the serial console provides reliable out-of-band access that works even when SSH is down, the network is misconfigured, or the system will not boot past a certain point. For large-scale deployments, aggregate serial consoles through a console server like `conserver` or `ser2net` for centralized management.

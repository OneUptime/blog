# How to Transfer Files Between Android and Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Android, File Transfer, MTP, ADB

Description: Multiple methods for transferring files between Android devices and Ubuntu, covering USB MTP, ADB, KDE Connect, SSH, and wireless solutions.

---

Transferring files between Android and Ubuntu is not always as frictionless as on other operating systems. Android uses the Media Transfer Protocol (MTP) over USB, which Linux handles through user-space libraries. Beyond USB, there are wireless options through ADB, SSH, and tools like KDE Connect. Each method has tradeoffs in terms of speed, convenience, and setup complexity.

## Method 1: USB with MTP (go-mtpfs or libmtp)

Connect your Android phone via USB and set the connection mode to "File Transfer" (MTP) on the phone.

```bash
# Install the MTP filesystem tools
sudo apt update
sudo apt install mtp-tools jmtpfs -y

# Check if your device is recognized
mtp-detect

# Create a mount point for the phone
mkdir -p ~/phone

# Mount the phone filesystem
jmtpfs ~/phone

# List files on the phone
ls ~/phone/

# Copy files to the phone
cp ~/Documents/report.pdf ~/phone/Documents/

# Copy files from the phone
cp ~/phone/DCIM/Camera/*.jpg ~/Pictures/

# Unmount when done
fusermount -u ~/phone
```

If `jmtpfs` does not work, try `go-mtpfs`:

```bash
# Install go-mtpfs
sudo apt install golang -y
go install github.com/hanwen/go-mtpfs@latest

# Mount using go-mtpfs
~/go/bin/go-mtpfs ~/phone &
```

### Troubleshooting MTP Permission Errors

```bash
# Add yourself to the plugdev group for device access
sudo usermod -a -G plugdev $USER

# Create a udev rule for your device
# First, find the vendor and product ID
lsusb | grep -i android

# Create a udev rule (replace 18d1 and 4ee2 with your device's IDs)
echo 'SUBSYSTEM=="usb", ATTR{idVendor}=="18d1", ATTR{idProduct}=="4ee2", MODE="0664", GROUP="plugdev"' | \
    sudo tee /etc/udev/rules.d/51-android.rules

sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Method 2: ADB (Android Debug Bridge)

ADB is more reliable than MTP and supports scripting. You need to enable USB Debugging on the phone.

### Enabling ADB on Android

1. Go to Settings > About Phone
2. Tap "Build Number" seven times to enable Developer Options
3. Go to Settings > Developer Options > Enable USB Debugging

### Installing ADB on Ubuntu

```bash
# Install ADB from the Ubuntu repositories
sudo apt install adb -y

# Verify ADB can see the phone
adb devices
```

You should see your device listed. If it shows "unauthorized," check the phone for a pairing dialog and accept it.

### Transferring Files with ADB

```bash
# Copy a file from Ubuntu to the phone
adb push ~/Documents/file.pdf /sdcard/Documents/

# Copy a file from the phone to Ubuntu
adb pull /sdcard/DCIM/Camera/photo.jpg ~/Pictures/

# Copy an entire directory from the phone
adb pull /sdcard/DCIM/Camera ~/Pictures/

# Push an entire directory to the phone
adb push ~/Music/album /sdcard/Music/

# List files on the phone
adb shell ls /sdcard/

# Delete a file on the phone
adb shell rm /sdcard/unwanted_file.txt
```

### ADB over Wi-Fi

```bash
# Connect the phone via USB first, then enable wireless ADB
adb tcpip 5555

# Disconnect USB, find the phone's IP address
# On the phone: Settings > Wi-Fi > tap connected network > IP address

# Connect wirelessly
adb connect 192.168.1.105:5555

# Verify connection
adb devices

# Now all adb commands work over Wi-Fi
adb push ~/file.txt /sdcard/
```

Android 11 and later support wireless ADB pairing without USB:

```bash
# On the phone: Developer Options > Wireless Debugging > Pair device with pairing code
# Note the IP, port, and pairing code shown

# Pair using the code
adb pair 192.168.1.105:PAIRING_PORT PAIRING_CODE

# Then connect
adb connect 192.168.1.105:5555
```

## Method 3: KDE Connect or GSConnect

Once KDE Connect is paired (see the KDE Connect setup guide), file transfers are straightforward:

```bash
# Send a file to the paired phone
kdeconnect-cli --device DEVICE_ID --share /home/user/document.pdf

# Get your device ID
kdeconnect-cli --list-devices
```

From the phone, open KDE Connect, tap the connected PC, and use "Send Files" to push files to the Ubuntu machine. They land in `~/Downloads` by default.

## Method 4: SSH with SSHFS

If your phone runs an SSH server (via Termux or a dedicated SSH app), you can mount the phone filesystem over SSH:

```bash
# Install SSHFS on Ubuntu
sudo apt install sshfs -y

# Mount the phone filesystem (phone running SSH on port 8022 via Termux)
mkdir -p ~/phone_ssh
sshfs user@192.168.1.105:/ ~/phone_ssh -p 8022

# Work with files normally
ls ~/phone_ssh/
cp ~/phone_ssh/sdcard/DCIM/Camera/*.jpg ~/Pictures/

# Unmount
fusermount -u ~/phone_ssh
```

Setting up Termux for SSH on Android:

```bash
# Install in Termux on the phone
pkg install openssh -y

# Start the SSH server
sshd

# The default port is 8022 in Termux
```

## Method 5: FTP or SFTP with a Phone App

Several Android apps provide FTP/SFTP servers:

- **Solid Explorer** - built-in FTP/SFTP server
- **FTP Server** (Apache License)
- **SFTP Server** apps on Google Play

Once the app is running and you know the IP and port:

```bash
# Connect via SFTP using sftp command
sftp -P 2222 user@192.168.1.105

# Or mount with SSHFS
sshfs -p 2222 user@192.168.1.105:/ ~/phone_ftp/

# Transfer via lftp (better for large transfers)
sudo apt install lftp -y
lftp -u user,password sftp://192.168.1.105:2222
```

## Method 6: Syncthing for Continuous Sync

Syncthing keeps folders synchronized between devices without a server in between:

```bash
# Install Syncthing on Ubuntu
sudo apt install syncthing -y

# Start Syncthing
systemctl --user enable syncthing
systemctl --user start syncthing

# Open the web UI
xdg-open http://localhost:8384
```

Install Syncthing on Android from F-Droid or Google Play. Add the Ubuntu machine as a remote device using its device ID (shown in the Syncthing web UI), then share folders between the two.

## Comparing the Methods

| Method | Speed | Setup | Best Use Case |
|---|---|---|---|
| MTP over USB | Moderate | Easy | Occasional transfers, photos |
| ADB pull/push | Fast | Moderate | Scripted transfers, debugging |
| ADB over Wi-Fi | Moderate | Moderate | Wireless without extra apps |
| KDE Connect | Moderate | Easy | Daily use, notifications too |
| SSHFS | Fast | Moderate | Large file sets |
| Syncthing | Background | Easy | Automatic folder sync |

## Batch Downloading Photos with ADB

A common task is pulling all new photos from the phone:

```bash
#!/bin/bash
# sync_photos.sh - Pull new photos from Android to Ubuntu

PHONE_DIR="/sdcard/DCIM/Camera"
LOCAL_DIR="$HOME/Pictures/Phone"
LAST_SYNC_FILE="$HOME/.last_phone_sync"

# Create local directory if needed
mkdir -p "$LOCAL_DIR"

# Get the last sync timestamp (default to 0 if first run)
LAST_SYNC=$(cat "$LAST_SYNC_FILE" 2>/dev/null || echo "0")

# Pull files modified after the last sync
adb shell find "$PHONE_DIR" -newer /sdcard/Android -name "*.jpg" -o -name "*.mp4" | \
while read -r file; do
    local_file="$LOCAL_DIR/$(basename "$file")"
    if [ ! -f "$local_file" ]; then
        echo "Pulling: $file"
        adb pull "$file" "$LOCAL_DIR/"
    fi
done

# Update last sync timestamp
date +%s > "$LAST_SYNC_FILE"
echo "Sync complete"
```

For most day-to-day transfers, KDE Connect offers the best balance of convenience and capability. For scripted or large-batch transfers, ADB with pull/push commands is more reliable and faster.

# How to Use AppImage Applications on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AppImage, Linux, Package Management

Description: A practical guide to downloading, running, and managing AppImage applications on Ubuntu, including desktop integration, updates, and the AppImageLauncher tool.

---

AppImage takes a different approach to application distribution than snap or Flatpak. An AppImage is a single executable file that contains the entire application and all its dependencies. You download the file, make it executable, and run it - no installation required, no root privileges needed, no package manager involved. This guide covers everything you need to use AppImage applications effectively on Ubuntu.

## How AppImage Works

An AppImage file is a compressed filesystem image (SquashFS format) that contains:
- The application executable
- All libraries and dependencies the app needs
- Desktop integration files (icons, .desktop file)
- Runtime environment

When you run an AppImage, it mounts itself as a filesystem using FUSE (Filesystem in Userspace) and executes from there. The application thinks it's running with a full set of dependencies, but they're all contained within the single file.

The key characteristics:
- No installation required
- No root privileges required
- No system-wide changes
- Can run multiple versions side by side
- Portable across different Linux distributions

## Installing Required Dependencies

AppImages need FUSE to mount themselves:

```bash
# For Ubuntu 22.04 and later (uses FUSE 3 by default, but AppImages often need FUSE 2)
sudo apt install libfuse2

# Verify FUSE is available
ls -la /dev/fuse
# Should show: crw-rw-rw- 1 root fuse ... /dev/fuse
```

If FUSE is properly installed, most AppImages will work. Some newer AppImages use FUSE 3:

```bash
# For FUSE 3 support
sudo apt install fuse3
```

## Downloading and Running an AppImage

```bash
# Create a directory for your AppImages
mkdir -p ~/Applications

# Download an AppImage (example: Kdenlive)
cd ~/Applications
wget https://download.kde.org/stable/kdenlive/23.08/linux/kdenlive-23.08.5-x86_64.AppImage

# Make it executable (required before first run)
chmod +x kdenlive-23.08.5-x86_64.AppImage

# Run it
./kdenlive-23.08.5-x86_64.AppImage
```

That's the complete process. The application runs from the AppImage file without touching the rest of your system.

## Inspecting an AppImage Before Running

When downloading AppImages from the internet, inspect them before executing:

```bash
# Check the file type
file myapp.AppImage

# Extract and inspect contents without running
./myapp.AppImage --appimage-extract

# This creates a squashfs-root directory with all the contents
ls squashfs-root/
ls squashfs-root/usr/
cat squashfs-root/myapp.desktop   # Check the desktop entry

# Clean up the extraction
rm -rf squashfs-root/
```

## Verifying AppImage Integrity

Many AppImages are distributed with GPG signatures or checksums:

```bash
# Download the AppImage and its checksum file
wget https://example.com/myapp.AppImage
wget https://example.com/myapp.AppImage.sha256sum

# Verify the checksum
sha256sum -c myapp.AppImage.sha256sum

# If a GPG signature is provided
wget https://example.com/myapp.AppImage.asc
gpg --verify myapp.AppImage.asc myapp.AppImage
```

## Desktop Integration with AppImageLauncher

By default, AppImages don't appear in your application launcher. AppImageLauncher integrates AppImages into your desktop environment by creating `.desktop` entries and managing them:

```bash
# Install AppImageLauncher
# Download the .deb from GitHub releases
wget https://github.com/TheAssassin/AppImageLauncher/releases/download/v2.2.0/appimagelauncher_2.2.0-travis995.0f91801.bionic_amd64.deb
sudo dpkg -i appimagelauncher_*.deb
sudo apt install -f  # Fix any dependency issues

# Or install via PPA
sudo add-apt-repository ppa:appimagelauncher-team/stable
sudo apt update
sudo apt install appimagelauncher
```

After installing AppImageLauncher, the next time you run any AppImage, it will prompt you to integrate it into your system (creates a desktop entry and moves it to `~/Applications/`) or run it just once.

## Manual Desktop Integration

Without AppImageLauncher, create desktop entries manually:

```bash
# First, extract the icon from the AppImage
./myapp.AppImage --appimage-extract usr/share/icons/hicolor/256x256/apps/myapp.png
# Or find the icon in the squashfs-root:
./myapp.AppImage --appimage-extract
find squashfs-root/ -name "*.png" | head -5

# Copy the icon
mkdir -p ~/.local/share/icons/
cp squashfs-root/usr/share/icons/hicolor/256x256/apps/myapp.png ~/.local/share/icons/
rm -rf squashfs-root/

# Create a .desktop file
mkdir -p ~/.local/share/applications/
cat > ~/.local/share/applications/myapp.desktop << 'EOF'
[Desktop Entry]
Name=MyApp
Exec=/home/username/Applications/myapp.AppImage
Icon=myapp
Type=Application
Categories=Utility;
Terminal=false
EOF

# Update the desktop database
update-desktop-database ~/.local/share/applications/
```

## Managing Multiple AppImage Versions

One of AppImage's practical advantages is running multiple versions simultaneously:

```bash
ls ~/Applications/
# blender-3.6.1-x86_64.AppImage
# blender-4.0.0-x86_64.AppImage
# kdenlive-23.08.5-x86_64.AppImage
# kdenlive-24.02.0-x86_64.AppImage

# Run a specific version
~/Applications/blender-3.6.1-x86_64.AppImage  # For existing projects
~/Applications/blender-4.0.0-x86_64.AppImage   # Testing new version
```

This is particularly useful for creative applications where a new version might break compatibility with existing project files.

## Keeping AppImages Updated

AppImages don't update automatically. The `appimageupdatetool` can update AppImages that have update information embedded:

```bash
# Install appimageupdatetool
wget https://github.com/AppImage/AppImageUpdate/releases/download/continuous/appimageupdatetool-x86_64.AppImage
chmod +x appimageupdatetool-x86_64.AppImage

# Check if an AppImage has update info
./appimageupdatetool-x86_64.AppImage --check-for-update ~/Applications/myapp.AppImage

# Update an AppImage
./appimageupdatetool-x86_64.AppImage ~/Applications/myapp.AppImage

# Many AppImages also have a built-in update flag
~/Applications/myapp.AppImage --update
```

For AppImages without embedded update info, check the project's website or GitHub releases page for new versions and download manually.

## Sandboxing AppImages

By default, AppImages run without any sandbox - the application has the same access to your system as you do. For untrusted AppImages, you can run them in a Firejail sandbox:

```bash
# Install Firejail
sudo apt install firejail

# Run an AppImage in a sandbox
firejail ./myapp.AppImage

# Sandbox with more restrictions
firejail --net=none --private ~/Applications/myapp.AppImage

# Create a persistent profile for an app
# Profile file: ~/.config/firejail/myapp.profile
firejail --profile=~/.config/firejail/myapp.profile ~/Applications/myapp.AppImage
```

## Organizing AppImages

```bash
# Create a structured AppImage directory
mkdir -p ~/Applications/{graphics,audio,video,productivity,utilities}

# Move AppImages into categories
mv kdenlive*.AppImage ~/Applications/video/
mv blender*.AppImage ~/Applications/graphics/
mv audacity*.AppImage ~/Applications/audio/

# Create a simple launcher script
cat > ~/bin/launch-appimage << 'EOF'
#!/bin/bash
# List and launch AppImages
find ~/Applications -name "*.AppImage" | sort | while read img; do
    echo "$(basename $img)"
done
EOF
chmod +x ~/bin/launch-appimage
```

## Troubleshooting

```bash
# AppImage won't run - check FUSE
ls /dev/fuse
# If missing: sudo modprobe fuse

# Sandbox conflicts
# Try running with --no-sandbox flag (Chrome-based apps)
./myapp.AppImage --no-sandbox

# Missing library errors
# Extract the AppImage and check what it needs
./myapp.AppImage --appimage-extract
ldd squashfs-root/usr/bin/myapp | grep "not found"

# Fix by installing the missing library
sudo apt install libmissing-library

# Permission denied
chmod +x myapp.AppImage  # Always make executable first

# FUSE version mismatch
sudo apt install libfuse2  # AppImages often need FUSE 2 even on Ubuntu 22.04+
```

AppImage's no-installation model makes it the right tool for testing new software, running unsupported versions, or using applications that don't have packaging for your distribution. Its simplicity is also its limitation - you get no automatic updates and no system-wide integration without extra tooling, but for the right use case, those trade-offs are worth it.

# How to Set Up Steam and Proton for Gaming on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Steam, Proton, Gaming, Linux Gaming, Tutorial

Description: Complete guide to setting up Steam with Proton for playing Windows games on Ubuntu.

---

Linux gaming has come a long way. With Valve's Proton compatibility layer built into Steam, you can now play thousands of Windows games on Ubuntu without dual-booting. This guide walks you through the complete setup, from installing Steam to optimizing performance and troubleshooting common issues.

## 1. Installing Steam on Ubuntu

Steam is available through multiple installation methods. The recommended approach uses the official `.deb` package for the best integration with Ubuntu.

### Method 1: Using APT (Ubuntu Repository)

```bash
# Update package index to ensure you get the latest version information
sudo apt update

# Install Steam from Ubuntu's multiverse repository
# This pulls in 32-bit libraries automatically (i386 architecture)
sudo apt install steam
```

### Method 2: Official Valve .deb Package

```bash
# Download the official Steam installer from Valve
# This is the most up-to-date version directly from Valve
wget https://cdn.cloudflare.steamstatic.com/client/installer/steam.deb

# Install the package with automatic dependency resolution
# dpkg -i installs the package; apt --fix-broken install resolves missing deps
sudo dpkg -i steam.deb
sudo apt --fix-broken install
```

### Method 3: Flatpak (Sandboxed Installation)

```bash
# Install Flatpak if not already present
sudo apt install flatpak

# Add Flathub repository (largest Flatpak app store)
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# Install Steam as a Flatpak application
# Flatpak provides sandboxing but may have minor compatibility quirks
flatpak install flathub com.valvesoftware.Steam
```

After installation, launch Steam, log in to your account, and let it update.

## 2. Installing GPU Drivers

Proper GPU drivers are critical for gaming performance. The setup differs between NVIDIA and AMD.

### NVIDIA Drivers

```bash
# Check your current GPU model
lspci | grep -i nvidia

# Add the official NVIDIA PPA for the latest drivers
# ubuntu-drivers provides a convenient way to manage driver versions
sudo add-apt-repository ppa:graphics-drivers/ppa
sudo apt update

# List recommended drivers for your hardware
# This shows all available driver versions compatible with your GPU
ubuntu-drivers devices

# Install the recommended driver automatically
# This selects the best stable driver for your specific GPU
sudo ubuntu-drivers autoinstall

# Or install a specific version (e.g., 550 series for RTX 40xx)
# Use this if you need a particular driver version for compatibility
sudo apt install nvidia-driver-550

# Reboot to load the new driver
sudo reboot
```

After rebooting, verify the installation:

```bash
# Check driver version and GPU status
# nvidia-smi shows GPU utilization, memory usage, and driver version
nvidia-smi

# Expected output shows your GPU model, driver version, and CUDA version
```

### AMD Drivers (AMDGPU - Open Source)

AMD GPUs work out of the box with Ubuntu's built-in AMDGPU driver. For the latest features and performance, install the Mesa drivers:

```bash
# Add the Kisak Mesa PPA for the latest open-source drivers
# This provides newer Mesa versions than Ubuntu's default repositories
sudo add-apt-repository ppa:kisak/kisak-mesa
sudo apt update

# Upgrade all Mesa packages to the latest versions
# This includes OpenGL, Vulkan, and video acceleration drivers
sudo apt upgrade

# Install Vulkan support for AMD (required for DXVK/Proton)
# vulkan-tools provides vulkaninfo for verification
sudo apt install mesa-vulkan-drivers vulkan-tools

# For older GCN 1.0-3.0 GPUs, also install AMDVLK
sudo apt install amdvlk
```

Verify AMD driver installation:

```bash
# Check Vulkan support (required for Proton/DXVK)
# You should see your AMD GPU listed with Vulkan 1.3+ support
vulkaninfo | grep -i "GPU id"

# Check OpenGL version
glxinfo | grep "OpenGL version"
```

### Intel Integrated Graphics

```bash
# Intel GPUs use the i915 driver included in the kernel
# Install Vulkan support for Intel (required for Proton)
sudo apt install mesa-vulkan-drivers intel-media-va-driver
```

## 3. Enabling Steam Play and Proton

Steam Play allows you to run Windows games on Linux using Proton. Here is how to enable it:

1. Open Steam and go to **Steam > Settings** (or press `Ctrl+,`)
2. Navigate to **Compatibility** in the left sidebar
3. Check **Enable Steam Play for supported titles** (games Valve has tested)
4. Check **Enable Steam Play for all other titles** (untested games)
5. Select a Proton version from the dropdown (Proton Experimental is recommended)
6. Click **OK** and restart Steam when prompted

### Command Line Configuration

You can also configure Steam Play via the configuration file:

```bash
# Steam stores user configuration in this directory
# ~/.steam/steam/config/config.vdf contains Steam settings

# View current Proton settings
grep -A 5 "CompatToolMapping" ~/.steam/steam/config/config.vdf
```

## 4. Understanding Proton Versions

Proton comes in several versions, each with different characteristics:

| Version | Description | Best For |
|---------|-------------|----------|
| **Proton Stable** (e.g., 9.0) | Tested, stable releases | Most games |
| **Proton Experimental** | Latest features, frequent updates | New games, testing |
| **Proton Hotfix** | Urgent fixes between releases | Specific game fixes |
| **Proton-GE** | Community build with extra patches | Games with issues |

### Installing Different Proton Versions

```bash
# Steam downloads Proton versions to this directory
ls ~/.steam/steam/steamapps/common/ | grep -i proton

# Proton compatibility tools are also stored here
ls ~/.steam/steam/compatibilitytools.d/
```

### Selecting Proton Version Per Game

1. Right-click a game in your Steam Library
2. Select **Properties**
3. Go to the **Compatibility** tab
4. Check **Force the use of a specific Steam Play compatibility tool**
5. Select your preferred Proton version from the dropdown

## 5. Checking Game Compatibility with ProtonDB

Before purchasing or installing a game, check [ProtonDB](https://www.protondb.com) for compatibility reports from the community.

### Rating System

- **Platinum**: Runs perfectly out of the box
- **Gold**: Runs perfectly with minor tweaks
- **Silver**: Runs with some issues
- **Bronze**: Runs with significant issues
- **Borked**: Does not run

### ProtonDB Tips

```bash
# Install ProtonDB browser extension for Steam integration
# Available for Firefox and Chrome

# Search ProtonDB from the command line using the Steam App ID
# Find the App ID in the game's Steam URL (e.g., store.steampowered.com/app/1245620)
xdg-open "https://www.protondb.com/app/1245620"
```

## 6. Installing Proton-GE (GloriousEggroll)

Proton-GE is a community fork of Proton with additional patches, fixes, and features not yet in official Proton. It often makes problematic games playable.

### Automatic Installation with ProtonUp-Qt

```bash
# Install ProtonUp-Qt for easy Proton-GE management
# This GUI tool handles downloads and installation automatically
flatpak install flathub net.davidotek.pupgui2

# Launch ProtonUp-Qt
flatpak run net.davidotek.pupgui2
```

### Manual Installation

```bash
# Create the compatibility tools directory if it doesn't exist
mkdir -p ~/.steam/steam/compatibilitytools.d

# Download the latest Proton-GE release
# Check https://github.com/GloriousEggroll/proton-ge-custom/releases for latest version
cd /tmp
wget https://github.com/GloriousEggroll/proton-ge-custom/releases/download/GE-Proton9-20/GE-Proton9-20.tar.gz

# Extract to Steam's compatibility tools directory
# This makes it available in Steam's Proton dropdown menu
tar -xf GE-Proton9-20.tar.gz -C ~/.steam/steam/compatibilitytools.d/

# Verify installation
ls ~/.steam/steam/compatibilitytools.d/
# Output: GE-Proton9-20

# Restart Steam to detect the new Proton version
```

After restarting Steam, Proton-GE appears in the compatibility tool dropdown for any game.

## 7. Launch Options for Game Optimization

Steam launch options allow you to pass environment variables and parameters to games. Right-click a game, select **Properties**, and enter options in the **Launch Options** field.

### Common Launch Options

```bash
# Force a specific Proton version (useful for testing)
PROTON_VERSION=GE-Proton9-20 %command%

# Enable DXVK async shader compilation (reduces stuttering)
# Compiles shaders in the background instead of blocking gameplay
DXVK_ASYNC=1 %command%

# Use NVIDIA's DLSS Frame Generation (RTX 40+ series)
PROTON_ENABLE_NVAPI=1 DXVK_ENABLE_NVAPI=1 %command%

# Force Vulkan renderer in games that support multiple APIs
# Vulkan often performs better than OpenGL on Linux
PROTON_USE_WINED3D=0 %command%

# Enable Esync (improved multithreading, enabled by default)
PROTON_NO_ESYNC=0 %command%

# Enable Fsync (better than Esync, requires kernel 5.16+)
PROTON_NO_FSYNC=0 %command%

# Disable fullscreen optimizations for borderless windowed
PROTON_USE_WINED3D=1 %command%

# Set custom resolution (useful for ultrawide or HiDPI)
# Forces the game to use specific resolution
gamemoderun %command% -w 2560 -h 1440

# Enable mangohud overlay (shows FPS, GPU/CPU usage)
mangohud %command%

# Enable gamemode (CPU governor optimization)
gamemoderun %command%

# Combine multiple options
DXVK_ASYNC=1 mangohud gamemoderun %command%
```

### Debugging Launch Options

```bash
# Enable Proton logging for troubleshooting
# Logs are written to /tmp/proton_<user>/
PROTON_LOG=1 %command%

# Enable Wine debugging output
WINEDEBUG=+all %command%

# Disable DXVK (use WineD3D instead for compatibility testing)
PROTON_USE_WINED3D=1 %command%
```

## 8. Performance Optimization

### Install Feral GameMode

GameMode optimizes system performance while gaming by adjusting CPU governor, I/O priority, and GPU settings.

```bash
# Install GameMode and the GNOME Shell extension
sudo apt install gamemode

# Verify GameMode is working
gamemoded -t
# Output: gamemode request succeeded

# Add to Steam launch options
gamemoderun %command%
```

### Configure CPU Governor

```bash
# Install cpupower for CPU frequency management
sudo apt install linux-tools-common linux-tools-$(uname -r)

# Set CPU governor to performance mode (maximum frequency)
# Use this before gaming sessions for best performance
sudo cpupower frequency-set -g performance

# Check current governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Return to powersave mode after gaming to save energy
sudo cpupower frequency-set -g powersave
```

### NVIDIA-Specific Optimizations

```bash
# Enable ForceCompositionPipeline for tear-free gaming
# Add to /etc/X11/xorg.conf.d/20-nvidia.conf
sudo mkdir -p /etc/X11/xorg.conf.d

# Create NVIDIA configuration
sudo tee /etc/X11/xorg.conf.d/20-nvidia.conf << 'EOF'
Section "Device"
    Identifier "NVIDIA Card"
    Driver "nvidia"
    Option "TripleBuffer" "True"
EndSection

Section "Screen"
    Identifier "Default Screen"
    Option "metamodes" "nvidia-auto-select +0+0 {ForceCompositionPipeline=On, ForceFullCompositionPipeline=On}"
EndSection
EOF

# Set NVIDIA PowerMizer to maximum performance mode
# 0 = Adaptive, 1 = Maximum Performance
nvidia-settings -a "[gpu:0]/GpuPowerMizerMode=1"
```

### AMD-Specific Optimizations

```bash
# Enable AMD FidelityFX Super Resolution (FSR) in Proton
# Add to Steam launch options - upscales lower resolutions
WINE_FULLSCREEN_FSR=1 %command%

# Set FSR sharpness (0-5, default is 2)
WINE_FULLSCREEN_FSR_STRENGTH=2 WINE_FULLSCREEN_FSR=1 %command%

# Enable ACO shader compiler (usually default, but ensure it's active)
RADV_PERFTEST=aco %command%
```

### System-Wide Optimizations

```bash
# Increase file descriptor limits for games with many assets
# Add to /etc/security/limits.conf
sudo tee -a /etc/security/limits.conf << 'EOF'
# Increase limits for gaming
* soft nofile 1048576
* hard nofile 1048576
EOF

# Enable huge pages for better memory performance (optional)
# Add to /etc/sysctl.conf
echo "vm.nr_hugepages=512" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 9. Gamepad Configuration

Steam has excellent built-in controller support, but some controllers need extra configuration.

### Steam Input Configuration

1. Open Steam and go to **Steam > Settings > Controller**
2. Click **General Controller Settings**
3. Enable the appropriate driver for your controller:
   - **PlayStation Configuration Support** for DualShock/DualSense
   - **Xbox Configuration Support** for Xbox controllers
   - **Nintendo Button Layout** for Switch Pro Controller
   - **Generic Gamepad Support** for other controllers

### Xbox Controller Setup

```bash
# Xbox controllers work out of the box with xpad driver
# For Xbox One/Series controllers via Bluetooth, install xpadneo
sudo apt install dkms git

# Clone and install xpadneo driver
git clone https://github.com/atar-axis/xpadneo.git
cd xpadneo
sudo ./install.sh

# Pair your controller via Bluetooth settings
# The controller should now work with improved features
```

### PlayStation Controller Setup

```bash
# DualShock 4 and DualSense work via Bluetooth or USB
# Install ds4drv for additional features (optional, Steam handles most cases)
pip install ds4drv

# For DualSense haptics and adaptive triggers, ensure Steam is updated
# Steam's built-in support is generally sufficient
```

### Generic Controller Calibration

```bash
# Install joystick utilities for testing and calibration
sudo apt install joystick jstest-gtk

# List connected controllers
ls /dev/input/js*

# Test controller input
jstest /dev/input/js0

# Launch graphical calibration tool
jstest-gtk
```

### Per-Game Controller Configuration

1. In your Steam Library, right-click a game and select **Properties**
2. Go to **Controller** tab
3. Choose from:
   - **Use default settings**: Uses your global controller configuration
   - **Enable Steam Input**: Forces Steam's controller layer
   - **Disable Steam Input**: Uses the game's native controller support

## 10. MangoHud and Gamescope

### MangoHud - Performance Overlay

MangoHud displays real-time performance metrics like FPS, frame time, CPU/GPU usage, and temperatures.

```bash
# Install MangoHud from the official PPA
sudo add-apt-repository ppa:flexiondotorg/mangohud
sudo apt update
sudo apt install mangohud

# Or install via Flatpak
flatpak install flathub org.freedesktop.Platform.VulkanLayer.MangoHud
```

#### Configuring MangoHud

```bash
# Create MangoHud configuration directory
mkdir -p ~/.config/MangoHud

# Create configuration file with common settings
cat > ~/.config/MangoHud/MangoHud.conf << 'EOF'
# MangoHud Configuration
# Full documentation: https://github.com/flightlessmango/MangoHud

# Position: top-left, top-right, bottom-left, bottom-right
position=top-left

# Display settings
fps                    # Show current FPS
frametime              # Show frame time graph
cpu_stats              # Show CPU usage percentage
cpu_temp               # Show CPU temperature
gpu_stats              # Show GPU usage percentage
gpu_temp               # Show GPU temperature
gpu_mem                # Show GPU memory usage
ram                    # Show RAM usage
vram                   # Show VRAM usage

# Visual settings
font_size=24           # Overlay font size
background_alpha=0.5   # Background transparency (0.0-1.0)
round_corners=5        # Rounded corner radius

# Frame timing
frame_timing=1         # Show frame timing graph
histogram              # Show frame time histogram

# Logging (press F2 to toggle logging)
output_folder=/home/$USER/mangohud_logs
log_duration=60        # Log for 60 seconds
EOF

# Use MangoHud with Steam games
# Add to launch options:
mangohud %command%

# Or set environment variable for all Vulkan games
MANGOHUD=1 %command%
```

### Gamescope - Valve's Gaming Compositor

Gamescope is a micro-compositor that provides features like resolution scaling, frame limiting, and improved fullscreen behavior.

```bash
# Install Gamescope
sudo apt install gamescope

# Basic usage - run a game at 1080p upscaled to native resolution
gamescope -w 1920 -h 1080 -W 2560 -H 1440 -- %command%

# Common Gamescope options explained:
# -w, -h: Internal (render) resolution
# -W, -H: Output (display) resolution
# -r: Frame rate limit
# -f: Start in fullscreen
# -e: Enable Steam integration
# -F: Upscaling filter (linear, nearest, fsr, nis)
```

#### Gamescope Launch Options

```bash
# 1080p internal, upscaled to 1440p with FSR, 60 FPS cap
gamescope -w 1920 -h 1080 -W 2560 -H 1440 -r 60 -F fsr -- %command%

# Integer scaling for pixel-art games (nearest neighbor)
gamescope -w 1280 -h 720 -W 2560 -H 1440 -F nearest -- %command%

# HDR support (requires compatible display and driver)
gamescope --hdr-enabled -w 1920 -h 1080 -f -- %command%

# Combine with MangoHud
gamescope -w 1920 -h 1080 -r 60 -- mangohud %command%

# Combine everything: MangoHud, GameMode, Gamescope with FSR
gamescope -w 1920 -h 1080 -W 2560 -H 1440 -F fsr -r 60 -- mangohud gamemoderun %command%
```

## 11. Troubleshooting Common Game Issues

### Game Won't Launch

```bash
# Check Proton logs for errors
# Replace APPID with the game's Steam App ID
cat /tmp/proton_$USER/steam-APPID.log

# View DXVK shader cache issues
ls ~/.local/share/Steam/steamapps/shadercache/

# Clear shader cache for a specific game (forces recompilation)
rm -rf ~/.local/share/Steam/steamapps/shadercache/APPID

# Verify game files in Steam
# Right-click game > Properties > Installed Files > Verify integrity

# Delete Proton prefix to reset Wine configuration
# This removes all game-specific settings and saved configurations
rm -rf ~/.local/share/Steam/steamapps/compatdata/APPID
```

### Performance Issues

```bash
# Check if Vulkan is working correctly
vulkaninfo | head -50

# Monitor GPU usage during gameplay
# For NVIDIA:
watch -n 1 nvidia-smi

# For AMD:
watch -n 1 cat /sys/class/drm/card0/device/gpu_busy_percent

# Check for thermal throttling
# NVIDIA:
nvidia-smi -q -d TEMPERATURE

# AMD:
sensors | grep -i edge

# Disable compositor while gaming (KDE)
# Ctrl+Shift+F12 toggles compositing

# For GNOME, disable animations
gsettings set org.gnome.desktop.interface enable-animations false
```

### Audio Issues

```bash
# Check PipeWire/PulseAudio status
pactl info

# List audio output devices
pactl list sinks short

# Set default audio device
pactl set-default-sink <sink_name>

# For games with no audio, try forcing PulseAudio backend
PULSE_LATENCY_MSEC=60 %command%

# Install Wine audio dependencies
sudo apt install libsdl2-2.0-0 libsdl2-mixer-2.0-0
```

### Controller Not Detected

```bash
# Check if controller is recognized by the system
cat /proc/bus/input/devices | grep -A 5 -i gamepad

# Verify Steam can see the controller
# Steam > Settings > Controller > General Controller Settings

# For permission issues, add user to input group
sudo usermod -aG input $USER
# Log out and back in for changes to take effect

# Check udev rules for controller
ls /etc/udev/rules.d/ | grep -i controller
```

### Game Crashes at Launch

```bash
# Try different Proton versions
# Start with Proton Experimental, then try Proton-GE

# Force older DirectX version
# Add to launch options:
PROTON_USE_WINED3D=1 %command%

# Disable DXVK (use OpenGL instead)
PROTON_USE_WINED3D=1 %command%

# Enable virtual desktop (helps with fullscreen issues)
# In Protontricks:
protontricks APPID winecfg
# Then enable "Emulate a virtual desktop" in Graphics tab
```

### Installing Protontricks for Advanced Fixes

```bash
# Install Protontricks (Wine tricks for Proton)
flatpak install flathub com.github.Matoking.protontricks

# Or via pip
pip install protontricks

# List installed games
protontricks -l

# Install Windows components for a specific game
# Replace APPID with the game's Steam App ID
protontricks APPID vcrun2019    # Visual C++ 2019
protontricks APPID dotnet48     # .NET Framework 4.8
protontricks APPID dxvk         # Force DXVK reinstall
protontricks APPID win10        # Set Windows 10 mode

# Open Wine configuration for a game
protontricks APPID winecfg
```

### Enabling Logging for Bug Reports

```bash
# Enable comprehensive logging for troubleshooting
# Add these to your launch options:
PROTON_LOG=1 WINEDEBUG=+all DXVK_LOG_LEVEL=debug %command%

# Logs are written to:
# - /tmp/proton_$USER/ (Proton logs)
# - Steam game directory (DXVK logs)

# Share logs when reporting issues on ProtonDB or GitHub
```

## 12. Best Practices Summary

Here is a quick reference for optimal Steam gaming on Ubuntu:

```bash
# Complete optimized launch options template
# Combines GameMode, MangoHud, and common optimizations
DXVK_ASYNC=1 mangohud gamemoderun %command%

# For FSR upscaling (AMD and NVIDIA)
WINE_FULLSCREEN_FSR=1 WINE_FULLSCREEN_FSR_STRENGTH=2 mangohud gamemoderun %command%

# For Gamescope with FSR (better isolation and control)
gamescope -w 1920 -h 1080 -W 2560 -H 1440 -F fsr -r 60 -- mangohud gamemoderun %command%

# NVIDIA with DLSS support (RTX cards)
PROTON_ENABLE_NVAPI=1 DXVK_ENABLE_NVAPI=1 mangohud gamemoderun %command%
```

### Checklist Before Playing

1. GPU drivers are up to date
2. Steam Play is enabled for all titles
3. Vulkan is working (`vulkaninfo`)
4. GameMode is installed and functioning
5. Check ProtonDB for game-specific tweaks
6. Have Proton-GE available for problematic games

---

Gaming on Linux has never been better. With Steam, Proton, and the tools covered in this guide, the majority of Windows games are now playable on Ubuntu. The community continues to improve compatibility daily, and checking ProtonDB before purchasing ensures you know what to expect.

For teams running game servers or online services, monitoring uptime and performance is crucial. **[OneUptime](https://oneuptime.com)** provides comprehensive monitoring for your game servers, APIs, and infrastructure. Set up alerts for server downtime, track response times, and get notified before your players notice issues. Whether you are running a small community server or a large multiplayer service, OneUptime helps ensure your gaming infrastructure stays online and performs optimally.

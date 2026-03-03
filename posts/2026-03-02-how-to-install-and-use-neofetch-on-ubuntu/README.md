# How to Install and Use Neofetch on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, System Information, Terminal, Customization

Description: Complete guide to installing, configuring, and customizing Neofetch on Ubuntu to display system information with ASCII art in the terminal.

---

Neofetch is a command-line tool that prints a snapshot of your system's hardware and software configuration alongside an ASCII art logo of your distribution. While it is often associated with desktop Linux setups and screenshots shared online, it also has genuine utility on servers - it provides a quick visual summary of the machine you just logged into, including OS version, kernel, CPU, RAM, and uptime. For teams managing many Ubuntu machines, adding neofetch to the login process gives everyone immediate context about the system they are on.

## Installation

### From the Ubuntu Repository

Neofetch is in the official Ubuntu repositories:

```bash
sudo apt update
sudo apt install neofetch -y
```

This installs neofetch along with any needed dependencies. The version in Ubuntu's repository may lag slightly behind the latest GitHub release, but it is adequate for most uses.

### From the GitHub Repository (Latest Version)

If you need the latest features:

```bash
# Clone the repository
git clone https://github.com/dylanaraps/neofetch.git
cd neofetch

# Install system-wide
sudo make install

# Or install for current user only (to ~/.local/bin)
make PREFIX=~/.local install
```

Note: As of 2025, the original neofetch repository is archived. The community maintains forks such as `fastfetch` and `hyfetch` that are actively developed. The package in Ubuntu's repos continues to function, however.

## Basic Usage

Running neofetch without arguments uses auto-detection for everything:

```bash
neofetch
```

On an Ubuntu server, output looks something like:

```text
            .-/+oossssoo+/-.               user@hostname
        `:+ssssssssssssssssss+:`           -----------------
      -+ssssssssssssssssssyyssss+-         OS: Ubuntu 22.04.3 LTS x86_64
    .ossssssssssssssssssdMMMNysssso.       Host: KVM Virtual Machine
   /ssssssssssshdmmNNmmyNMMMMhssssss/      Kernel: 5.15.0-91-generic
  +ssssssssshmydMMMMMMMNddddyssssssss+     Uptime: 47 days, 3 hours, 22 mins
 /sssssssshNMMMyhhyyyyhmNMMMNhssssssss/    Packages: 523 (dpkg)
.ssssssssdMMMNhsssssssssshNMMMdssssssss.   Shell: bash 5.1.16
+sssshhhyNMMNyssssssssssssyNMMMysssssss+   Terminal: /dev/pts/0
ossyNMMMNyMMhsssssssssssssshmmmhssssssso   CPU: Intel Xeon E5-2680 v4 (4) @ 2.400GHz
ossyNMMMNyMMhsssssssssssssshmmmhssssssso   GPU: N/A
+sssshhhyNMMNyssssssssssssyNMMMysssssss+   Memory: 1823MiB / 7953MiB
.ssssssssdMMMNhsssssssssshNMMMdssssssss.
 /sssssssshNMMMyhhyyyyhmNMMMNhssssssss/
  +ssssssssshmydMMMMMMMNddddyssssssss+
   /ssssssssssshdmmNNmmyNMMMMhssssss/
    .ossssssssssssssssssdMMMNysssso.
      -+sssssssssssssssssyyyssss+-
        `:+ssssssssssssssssss+:`
            .-/+oossssoo+/-.
```

## Commonly Used Flags

### Show Specific Information

Show only certain fields to reduce noise:

```bash
# Show only OS, kernel, uptime, and memory
neofetch --os_arch off --cpu_brand off --gpu_type all
```

### Display Without ASCII Art

For scripts or environments where the ASCII logo is not useful:

```bash
# Text-only output, no ASCII art
neofetch --off
```

### Specify an ASCII Art Source

Use a different distribution's logo:

```bash
# Use the Debian logo instead of Ubuntu
neofetch --ascii_distro Debian

# Use a plain block art style
neofetch --ascii_distro block
```

### Control Output Width

The ASCII art width can cause wrapping issues in narrow terminals:

```bash
# Reduce the ASCII art size
neofetch --ascii_bold off
```

### Print to a File

```bash
# Save output to a file (without ANSI color codes)
neofetch --off 2>/dev/null > /tmp/system-info.txt
```

## Configuration File

Neofetch stores its configuration at `~/.config/neofetch/config.conf`. Running neofetch once creates it automatically with all options documented:

```bash
# Run once to create the config file
neofetch

# Edit the config
nano ~/.config/neofetch/config.conf
```

The config file is a bash script. Key settings:

```bash
# config.conf

# Choose which information to display and in what order
print_info() {
    info title
    info underline

    info "OS" distro
    info "Host" model
    info "Kernel" kernel
    info "Uptime" uptime
    info "Packages" packages
    info "Shell" shell
    info "CPU" cpu
    info "Memory" memory

    # Comment out or remove lines to hide those fields
    # info "GPU" gpu
    # info "Disk" disk
    # info "Local IP" local_ip
    # info "Public IP" public_ip  # Note: requires curl, slow on servers
}

# CPU settings
cpu_brand="on"          # Show brand (Intel/AMD)
cpu_speed="on"          # Show clock speed
cpu_cores="logical"     # Show core count (physical/logical/off)

# Memory display
memory_percent="on"     # Show memory as percentage

# Disk display
disk_show=('/')         # Show disk usage for root partition
disk_subtitle="dir"     # Show directory as subtitle

# ASCII art color
ascii_colors=(distro)   # Use distro's default colors
```

## Creating a System-Wide Configuration

For servers where you want all users to see the same information, create a system-wide config:

```bash
sudo mkdir -p /etc/neofetch
sudo cp ~/.config/neofetch/config.conf /etc/neofetch/config.conf
sudo nano /etc/neofetch/config.conf
```

Users can then run:

```bash
neofetch --config /etc/neofetch/config.conf
```

Or set an alias in `/etc/bash.bashrc`:

```bash
echo "alias neofetch='neofetch --config /etc/neofetch/config.conf'" | sudo tee -a /etc/bash.bashrc
```

## Adding Neofetch to the Login Process

To display system info on every SSH login, add neofetch to the MOTD system:

```bash
sudo nano /etc/update-motd.d/01-neofetch
```

```bash
#!/bin/bash
# Run neofetch as the logging-in user for MOTD display

# Use the system-wide config to ensure consistent output
neofetch \
    --config /etc/neofetch/config.conf \
    --off \
    2>/dev/null || true
```

```bash
sudo chmod +x /etc/update-motd.d/01-neofetch
```

Using `--off` skips the ASCII art in the MOTD since it often does not render well in all terminal emulators. If you want the full colored ASCII output in the MOTD, remove the `--off` flag.

Alternatively, add it to `~/.bashrc` for interactive shells only:

```bash
# Add to ~/.bashrc - runs neofetch on every new interactive shell
# Only run if stdout is a terminal (not in scripts)
if [[ $- == *i* ]]; then
    neofetch
fi
```

## Server-Appropriate Configuration

For a server context, disable noisy or slow fields. Here is a minimal config focused on useful server information:

```bash
# Minimal server-focused neofetch config
print_info() {
    info title
    info underline

    info "OS" distro
    info "Kernel" kernel
    info "Uptime" uptime
    info "Packages" packages
    info "Shell" shell
    info "CPU" cpu
    info "Memory" memory
    info "Disk" disk
    info "Local IP" local_ip
}

# Disable slow lookups
public_ip_host="off"

# Show disk usage for root and any mounted data volumes
disk_show=('/' '/data' '/var')

# Do not show CPU brand or speed (less relevant for VMs)
cpu_brand="off"
cpu_speed="off"
cpu_cores="logical"

# Show memory as percentage
memory_percent="on"
memory_unit="gib"
```

## Alternative: fastfetch

If you find neofetch's performance sluggish (it is a bash script and can be slow), `fastfetch` is a C-based replacement that is significantly faster and actively maintained:

```bash
# Install from the Ubuntu PPA or snap
sudo apt install fastfetch -y

# Basic usage is the same
fastfetch
```

fastfetch uses a JSON configuration file and produces similar output with much faster execution, making it better suited for MOTD use where every millisecond of login delay matters.

## Scripting with Neofetch Output

Since neofetch can output without ANSI color codes, you can parse it in scripts:

```bash
# Get specific fields using --off for clean output
CPU=$(neofetch --off cpu 2>/dev/null | grep "CPU" | cut -d: -f2 | xargs)
MEMORY=$(neofetch --off memory 2>/dev/null | grep "Memory" | cut -d: -f2 | xargs)
UPTIME=$(neofetch --off uptime 2>/dev/null | grep "Uptime" | cut -d: -f2 | xargs)

echo "CPU: $CPU"
echo "Memory: $MEMORY"
echo "Uptime: $UPTIME"
```

For production monitoring and alerting, use dedicated tools like [OneUptime](https://oneuptime.com) rather than parsing neofetch output, but for quick status scripts neofetch provides a convenient aggregation layer.

## Summary

Neofetch provides an instant visual overview of an Ubuntu system's configuration. While it originated in the desktop Linux community, it works well on servers as part of the login MOTD or as a quick diagnostic command. Configure it through `~/.config/neofetch/config.conf` to show only relevant fields, disable slow lookups like public IP, and if performance matters, consider switching to `fastfetch` for faster execution.

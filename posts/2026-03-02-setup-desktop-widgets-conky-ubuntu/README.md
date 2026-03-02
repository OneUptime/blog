# How to Set Up Desktop Widgets with Conky on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GNOME, Desktop, Conky, Customization

Description: Learn how to install and configure Conky on Ubuntu to display system information widgets on your desktop, including CPU, memory, disk, network stats, and weather data.

---

Conky is a highly configurable system monitor that displays information directly on the desktop background. Unlike taskbar indicators or terminal monitors, Conky renders its output as part of the wallpaper - always visible without taking up window space. You can display CPU usage, RAM consumption, disk I/O, network throughput, weather, battery status, top processes, and anything else you can script.

The configuration flexibility is Conky's defining feature. A Conky configuration is effectively a template file that mixes text, variables, colors, and conditional logic to produce exactly the display you want.

## Installing Conky

```bash
sudo apt update
sudo apt install conky-all -y
```

The `conky-all` package includes support for X11 compositing, Lua scripting, Cairo graphics, and network interfaces. The base `conky` package has fewer features.

Verify the installation:

```bash
conky --version
```

## Running Conky with the Default Configuration

Start Conky to see the default configuration:

```bash
conky &
```

The default display appears in the top-right corner of the screen showing basic system info. Press `Ctrl+C` in the terminal to stop it, or kill it by name:

```bash
pkill conky
```

## Creating a Custom Configuration

Conky uses a Lua-based configuration format. The default configuration file location is:

```bash
~/.config/conky/conky.conf
```

Create the directory and start a configuration file:

```bash
mkdir -p ~/.config/conky
nano ~/.config/conky/conky.conf
```

Here is a complete example configuration that displays a clean system monitor:

```lua
-- ~/.config/conky/conky.conf
-- System monitor widget for Ubuntu desktop

conky.config = {
    -- Behavior settings
    update_interval = 1,           -- Update every second
    total_run_times = 0,           -- Run indefinitely (0 = forever)
    cpu_avg_samples = 2,           -- Average CPU over 2 samples
    net_avg_samples = 2,           -- Average network over 2 samples

    -- Window settings
    own_window = true,
    own_window_type = 'desktop',   -- Render on desktop background
    own_window_transparent = true, -- Transparent background
    own_window_hints = 'undecorated,below,sticky,skip_taskbar,skip_pager',
    double_buffer = true,          -- Prevent flickering

    -- Position (top-right corner with 20px margin)
    alignment = 'top_right',
    gap_x = 20,
    gap_y = 50,

    -- Size
    minimum_width = 250,
    maximum_width = 250,

    -- Font settings
    use_xft = true,
    font = 'Ubuntu Mono:size=10',
    xftalpha = 0.8,

    -- Colors
    default_color = 'white',
    default_shade_color = 'black',
    draw_shades = false,
    draw_outline = false,

    -- Network interface to monitor
    -- Change 'eth0' to your actual interface name
    -- Run: ip route get 1.1.1.1 | awk '{print $5; exit}'
}

conky.text = [[
# ━━━━━━━━━━━━━━━━━━━━━━━━━
${color #ff9500}SYSTEM${color}
Hostname: ${nodename}
Uptime:   ${uptime}
Kernel:   ${kernel}

# ━━━━━━━━━━━━━━━━━━━━━━━━━
${color #ff9500}CPU${color}
Load:  ${loadavg 1} ${loadavg 5} ${loadavg 15}
Usage: ${cpu cpu0}%  ${cpubar cpu0 8,200}
Temp:  ${hwmon 0 temp 1}°C

${color #ff9500}Top Processes${color}
${top name 1}  ${top pid 1}  ${top cpu 1}%
${top name 2}  ${top pid 2}  ${top cpu 2}%
${top name 3}  ${top pid 3}  ${top cpu 3}%

# ━━━━━━━━━━━━━━━━━━━━━━━━━
${color #ff9500}MEMORY${color}
RAM:  ${mem} / ${memmax}  ${membar 8,200}
Swap: ${swap} / ${swapmax}  ${swapbar 8,200}

# ━━━━━━━━━━━━━━━━━━━━━━━━━
${color #ff9500}DISK${color}
Root: ${fs_used /} / ${fs_size /}  ${fs_bar 8,200 /}
I/O Read:  ${diskio_read /dev/sda}
I/O Write: ${diskio_write /dev/sda}

# ━━━━━━━━━━━━━━━━━━━━━━━━━
${color #ff9500}NETWORK${color}
Interface: ${if_up enp0s3}UP${else}DOWN${endif}
IP:   ${addr enp0s3}
Down: ${downspeed enp0s3}  Total: ${totaldown enp0s3}
Up:   ${upspeed enp0s3}    Total: ${totalup enp0s3}

# ━━━━━━━━━━━━━━━━━━━━━━━━━
${color #ff9500}DATE & TIME${color}
${alignc}${color #ffffff}${time %A, %B %d %Y}
${alignc}${color #ff9500}${time %H:%M:%S}
]]
```

Apply the configuration:

```bash
# Kill any running conky instance
pkill conky

# Start with new config
conky -c ~/.config/conky/conky.conf &
```

## Finding Your Interface and Disk Names

Several configuration values depend on your hardware:

```bash
# Find the active network interface
ip route get 1.1.1.1 | awk '{print $5; exit}'

# List all disk devices
lsblk | grep disk

# Find temperature sensors
cat /sys/class/hwmon/hwmon*/name
sensors
```

Update the `enp0s3`, `/dev/sda`, and hwmon index in the configuration to match your system.

## Useful Conky Variables

A reference of commonly used variables:

| Variable | Description |
|----------|-------------|
| `${cpu}` | Total CPU usage percentage |
| `${mem}` | Used RAM |
| `${memperc}` | RAM usage percentage |
| `${swap}` | Used swap |
| `${fs_used /}` | Used space on filesystem |
| `${downspeed eth0}` | Current download speed |
| `${upspeed eth0}` | Current upload speed |
| `${top name 1}` | Name of top CPU-using process |
| `${time %H:%M}` | Current time |
| `${uptime}` | System uptime |
| `${battery}` | Battery status |
| `${loadavg 1}` | 1-minute load average |
| `${execi 300 command}` | Run command every 300 seconds |

## Adding Weather Data

Use the `execi` variable to run a script that fetches weather:

```bash
# Create a weather script
cat > ~/.config/conky/weather.sh << 'EOF'
#!/bin/bash
# Requires curl and jq
# Replace 'London' with your city
CITY="London"
API_KEY="your_openweathermap_api_key"

curl -sf "https://api.openweathermap.org/data/2.5/weather?q=${CITY}&units=metric&appid=${API_KEY}" | \
  jq -r '"\(.main.temp | round)°C \(.weather[0].description)"' 2>/dev/null || \
  echo "Weather unavailable"
EOF
chmod +x ~/.config/conky/weather.sh
```

Add to the Conky template:

```lua
-- Add inside conky.text:
${color #ff9500}WEATHER${color}
${execi 600 ~/.config/conky/weather.sh}
```

The `600` means the script runs every 600 seconds (10 minutes) to avoid API rate limits.

## Running Conky at Login

Create a desktop autostart entry:

```bash
mkdir -p ~/.config/autostart

cat > ~/.config/autostart/conky.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Conky
Comment=System Monitor Widget
Exec=bash -c "sleep 5 && conky -c /home/YOUR_USERNAME/.config/conky/conky.conf"
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF
```

The `sleep 5` delay lets the desktop environment fully load before Conky starts, which prevents rendering issues where Conky appears on top of the wallpaper rather than behind windows.

Replace `YOUR_USERNAME` with your actual username, or use `$HOME`:

```bash
sed -i "s|YOUR_USERNAME|$USER|g" ~/.config/autostart/conky.desktop
```

## Multiple Conky Instances

You can run multiple Conky instances, each with a different configuration file. This is useful for displaying different widgets in different corners:

```bash
# Run system info in top-right
conky -c ~/.config/conky/system.conf &

# Run network monitor in bottom-left
conky -c ~/.config/conky/network.conf &
```

Give each a different `alignment` setting (`top_right`, `bottom_left`, `top_left`, `bottom_right`).

## Troubleshooting Common Issues

**Conky appears on top of windows instead of on the desktop:**

Set `own_window_type = 'desktop'` and ensure `own_window_hints` includes `below`.

**Flickering display:**

Enable `double_buffer = true`.

**Text appears blurry:**

Set `use_xft = true` and specify a clear font with `font = 'Ubuntu Mono:size=10'`.

**Hardware temperature not showing:**

Install lm-sensors and find the correct hwmon index:

```bash
sudo apt install lm-sensors -y
sudo sensors-detect --auto
sensors
ls /sys/class/hwmon/
```

## Summary

Conky provides a highly customizable desktop monitoring overlay that requires no ongoing window management - it sits on the desktop and updates continuously. The configuration file acts as a template mixing variables, colors, and Lua logic to produce exactly the display you want. Start with a simple configuration showing CPU, memory, and network stats, then expand with weather data, disk I/O, and top process lists. Add it to the autostart directory with a brief delay to ensure it renders correctly at login.

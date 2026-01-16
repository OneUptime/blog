# How to Install and Configure i3 Window Manager on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, i3, Window Manager, Tiling, Tutorial

Description: Complete guide to installing and configuring i3 tiling window manager on Ubuntu.

---

The i3 window manager is a powerful, lightweight tiling window manager that has gained immense popularity among Linux power users and developers. Unlike traditional desktop environments like GNOME or KDE, i3 organizes windows in a non-overlapping layout, maximizing screen real estate and boosting productivity through keyboard-driven navigation. This comprehensive guide will walk you through installing, configuring, and customizing i3 on Ubuntu.

## Understanding Tiling Window Managers

Before diving into the installation, it is essential to understand what makes tiling window managers different from traditional desktop environments.

### What is a Tiling Window Manager?

A tiling window manager automatically arranges windows in a non-overlapping manner, filling your entire screen. Instead of manually resizing and positioning windows, the window manager handles this automatically using predefined layouts.

### Benefits of Tiling Window Managers

- **Efficient Screen Usage**: Every pixel of your screen is utilized effectively
- **Keyboard-Centric Workflow**: Navigate and manage windows without touching the mouse
- **Low Resource Usage**: Minimal memory and CPU consumption compared to full desktop environments
- **Highly Customizable**: Configure every aspect to match your workflow
- **Distraction-Free**: Focus on your work without window clutter
- **Reproducible Setup**: Configuration files can be version-controlled and shared

### Why Choose i3?

i3 stands out among tiling window managers for several reasons:

- **Well-documented**: Excellent official documentation and active community
- **Easy to configure**: Human-readable configuration file
- **Stable**: Rarely crashes and handles edge cases gracefully
- **IPC interface**: Powerful inter-process communication for scripting
- **Multi-monitor support**: First-class support for multiple displays

## Installing i3 on Ubuntu

i3 is available in Ubuntu's official repositories, making installation straightforward.

### Prerequisites

Ensure your system is up to date before installing i3:

```bash
# Update package lists
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y
```

### Installing i3 Window Manager

Install i3 along with essential companion tools:

```bash
# Install i3 window manager and related packages
sudo apt install -y i3 i3status i3lock dmenu

# Optional: Install i3-gaps for window gaps (if available)
# Note: On newer Ubuntu versions, i3-gaps may be merged into i3
sudo apt install -y i3-gaps
```

The packages installed include:

- **i3**: The core window manager
- **i3status**: Default status bar program
- **i3lock**: Screen locker
- **dmenu**: Application launcher

### Installing Additional Recommended Packages

```bash
# Terminal emulator (choose one)
sudo apt install -y alacritty
# or
sudo apt install -y kitty
# or
sudo apt install -y rxvt-unicode

# Notification daemon
sudo apt install -y dunst

# Compositor for transparency and effects
sudo apt install -y picom

# Application launcher (alternative to dmenu)
sudo apt install -y rofi

# Network manager applet
sudo apt install -y nm-applet

# Volume control
sudo apt install -y pavucontrol pulseaudio-utils

# Brightness control
sudo apt install -y brightnessctl

# Screenshot tool
sudo apt install -y maim

# Wallpaper setter
sudo apt install -y feh nitrogen

# File manager
sudo apt install -y thunar

# Image viewer
sudo apt install -y feh
```

### Logging into i3

After installation, log out of your current session. At the login screen (GDM, LightDM, or SDDM), select "i3" from the session menu before entering your password.

On first login, i3 will prompt you to generate a configuration file and choose your modifier key (Mod key). The common choices are:

- **Super (Windows key)**: Recommended for most users
- **Alt**: Traditional choice, may conflict with some applications

## Basic Keybindings

Understanding i3's default keybindings is crucial for effective usage. Throughout this guide, `$mod` refers to your chosen modifier key.

### Essential Navigation

| Keybinding | Action |
|------------|--------|
| `$mod+Enter` | Open terminal |
| `$mod+d` | Open application launcher (dmenu) |
| `$mod+j/k/l/;` | Focus left/down/up/right window |
| `$mod+Left/Down/Up/Right` | Focus window using arrow keys |
| `$mod+Shift+j/k/l/;` | Move window left/down/up/right |
| `$mod+Shift+q` | Close focused window |
| `$mod+f` | Toggle fullscreen |
| `$mod+Shift+Space` | Toggle floating mode |
| `$mod+Space` | Toggle between tiling and floating focus |

### Layout Control

| Keybinding | Action |
|------------|--------|
| `$mod+h` | Split horizontally |
| `$mod+v` | Split vertically |
| `$mod+s` | Stacking layout |
| `$mod+w` | Tabbed layout |
| `$mod+e` | Toggle split layout |

### Workspace Navigation

| Keybinding | Action |
|------------|--------|
| `$mod+1-9,0` | Switch to workspace 1-10 |
| `$mod+Shift+1-9,0` | Move window to workspace 1-10 |

### Session Management

| Keybinding | Action |
|------------|--------|
| `$mod+Shift+c` | Reload configuration |
| `$mod+Shift+r` | Restart i3 in-place |
| `$mod+Shift+e` | Exit i3 |

### Resize Mode

| Keybinding | Action |
|------------|--------|
| `$mod+r` | Enter resize mode |
| `j/k/l/;` or arrows | Resize in resize mode |
| `Escape` or `Enter` | Exit resize mode |

## Configuration File

The i3 configuration file is where you customize every aspect of your window manager. By default, it is located at `~/.config/i3/config`.

### Creating the Configuration Directory

```bash
# Create i3 config directory
mkdir -p ~/.config/i3

# Copy default config if it exists
cp /etc/i3/config ~/.config/i3/config
```

### Basic Configuration Structure

Here is a well-commented example configuration file:

```bash
# ~/.config/i3/config
# i3 Configuration File
# Documentation: https://i3wm.org/docs/userguide.html

#==============================================================================
# BASIC SETTINGS
#==============================================================================

# Set modifier key (Mod1=Alt, Mod4=Super/Windows)
set $mod Mod4

# Font for window titles and bar
font pango:JetBrains Mono 10

# Use Mouse+$mod to drag floating windows
floating_modifier $mod

# Focus follows mouse (disable if you prefer click-to-focus)
focus_follows_mouse no

# Window border settings
default_border pixel 2
default_floating_border pixel 2

# Hide edge borders when there's only one window
hide_edge_borders smart

# Disable window titlebars (required for i3-gaps)
for_window [class=".*"] border pixel 2

#==============================================================================
# GAPS CONFIGURATION (requires i3-gaps)
#==============================================================================

# Inner gaps (space between windows)
gaps inner 10

# Outer gaps (space between windows and screen edge)
gaps outer 5

# Only enable gaps when there are multiple windows
smart_gaps on

#==============================================================================
# COLORS AND APPEARANCE
#==============================================================================

# Define colors
set $bg-color            #2E3440
set $inactive-bg-color   #3B4252
set $text-color          #ECEFF4
set $inactive-text-color #88C0D0
set $urgent-bg-color     #BF616A
set $indicator-color     #5E81AC
set $border-color        #4C566A

# Window colors
#                       border              background         text                 indicator
client.focused          $bg-color           $bg-color          $text-color          $indicator-color
client.unfocused        $inactive-bg-color  $inactive-bg-color $inactive-text-color $indicator-color
client.focused_inactive $inactive-bg-color  $inactive-bg-color $inactive-text-color $indicator-color
client.urgent           $urgent-bg-color    $urgent-bg-color   $text-color          $indicator-color

#==============================================================================
# KEYBINDINGS - APPLICATIONS
#==============================================================================

# Terminal
bindsym $mod+Return exec alacritty

# Application launcher
bindsym $mod+d exec --no-startup-id rofi -show drun -show-icons

# Window switcher
bindsym $mod+Tab exec --no-startup-id rofi -show window -show-icons

# File manager
bindsym $mod+e exec thunar

# Web browser
bindsym $mod+b exec firefox

# Lock screen
bindsym $mod+Escape exec --no-startup-id i3lock -c 2E3440

# Screenshot (full screen)
bindsym Print exec --no-startup-id maim ~/Pictures/screenshot-$(date +%Y%m%d-%H%M%S).png

# Screenshot (selection)
bindsym $mod+Print exec --no-startup-id maim -s ~/Pictures/screenshot-$(date +%Y%m%d-%H%M%S).png

#==============================================================================
# KEYBINDINGS - WINDOW MANAGEMENT
#==============================================================================

# Kill focused window
bindsym $mod+Shift+q kill

# Change focus (vim-style)
bindsym $mod+h focus left
bindsym $mod+j focus down
bindsym $mod+k focus up
bindsym $mod+l focus right

# Change focus (arrow keys)
bindsym $mod+Left focus left
bindsym $mod+Down focus down
bindsym $mod+Up focus up
bindsym $mod+Right focus right

# Move focused window (vim-style)
bindsym $mod+Shift+h move left
bindsym $mod+Shift+j move down
bindsym $mod+Shift+k move up
bindsym $mod+Shift+l move right

# Move focused window (arrow keys)
bindsym $mod+Shift+Left move left
bindsym $mod+Shift+Down move down
bindsym $mod+Shift+Up move up
bindsym $mod+Shift+Right move right

# Split orientation
bindsym $mod+backslash split h
bindsym $mod+minus split v

# Toggle fullscreen
bindsym $mod+f fullscreen toggle

# Change container layout
bindsym $mod+s layout stacking
bindsym $mod+w layout tabbed
bindsym $mod+t layout toggle split

# Toggle floating
bindsym $mod+Shift+space floating toggle

# Change focus between tiling and floating windows
bindsym $mod+space focus mode_toggle

# Focus parent container
bindsym $mod+a focus parent

# Focus child container
bindsym $mod+c focus child

#==============================================================================
# KEYBINDINGS - WORKSPACES
#==============================================================================

# Define workspace names
set $ws1 "1"
set $ws2 "2"
set $ws3 "3"
set $ws4 "4"
set $ws5 "5"
set $ws6 "6"
set $ws7 "7"
set $ws8 "8"
set $ws9 "9"
set $ws10 "10"

# Switch to workspace
bindsym $mod+1 workspace number $ws1
bindsym $mod+2 workspace number $ws2
bindsym $mod+3 workspace number $ws3
bindsym $mod+4 workspace number $ws4
bindsym $mod+5 workspace number $ws5
bindsym $mod+6 workspace number $ws6
bindsym $mod+7 workspace number $ws7
bindsym $mod+8 workspace number $ws8
bindsym $mod+9 workspace number $ws9
bindsym $mod+0 workspace number $ws10

# Move focused container to workspace
bindsym $mod+Shift+1 move container to workspace number $ws1
bindsym $mod+Shift+2 move container to workspace number $ws2
bindsym $mod+Shift+3 move container to workspace number $ws3
bindsym $mod+Shift+4 move container to workspace number $ws4
bindsym $mod+Shift+5 move container to workspace number $ws5
bindsym $mod+Shift+6 move container to workspace number $ws6
bindsym $mod+Shift+7 move container to workspace number $ws7
bindsym $mod+Shift+8 move container to workspace number $ws8
bindsym $mod+Shift+9 move container to workspace number $ws9
bindsym $mod+Shift+0 move container to workspace number $ws10

# Move workspace to another monitor
bindsym $mod+Ctrl+Left move workspace to output left
bindsym $mod+Ctrl+Right move workspace to output right
bindsym $mod+Ctrl+Up move workspace to output up
bindsym $mod+Ctrl+Down move workspace to output down

#==============================================================================
# KEYBINDINGS - MEDIA AND FUNCTION KEYS
#==============================================================================

# Audio controls (PulseAudio)
bindsym XF86AudioRaiseVolume exec --no-startup-id pactl set-sink-volume @DEFAULT_SINK@ +5%
bindsym XF86AudioLowerVolume exec --no-startup-id pactl set-sink-volume @DEFAULT_SINK@ -5%
bindsym XF86AudioMute exec --no-startup-id pactl set-sink-mute @DEFAULT_SINK@ toggle
bindsym XF86AudioMicMute exec --no-startup-id pactl set-source-mute @DEFAULT_SOURCE@ toggle

# Brightness controls
bindsym XF86MonBrightnessUp exec --no-startup-id brightnessctl set +5%
bindsym XF86MonBrightnessDown exec --no-startup-id brightnessctl set 5%-

# Media player controls
bindsym XF86AudioPlay exec --no-startup-id playerctl play-pause
bindsym XF86AudioPause exec --no-startup-id playerctl play-pause
bindsym XF86AudioNext exec --no-startup-id playerctl next
bindsym XF86AudioPrev exec --no-startup-id playerctl previous

#==============================================================================
# KEYBINDINGS - i3 MANAGEMENT
#==============================================================================

# Reload configuration file
bindsym $mod+Shift+c reload

# Restart i3 in-place (preserves layout)
bindsym $mod+Shift+r restart

# Exit i3 (with confirmation)
bindsym $mod+Shift+e exec "i3-nagbar -t warning -m 'Exit i3? This will end your X session.' -B 'Yes, exit i3' 'i3-msg exit'"

#==============================================================================
# RESIZE MODE
#==============================================================================

mode "resize" {
    # Resize with vim keys
    bindsym h resize shrink width 10 px or 10 ppt
    bindsym j resize grow height 10 px or 10 ppt
    bindsym k resize shrink height 10 px or 10 ppt
    bindsym l resize grow width 10 px or 10 ppt

    # Resize with arrow keys
    bindsym Left resize shrink width 10 px or 10 ppt
    bindsym Down resize grow height 10 px or 10 ppt
    bindsym Up resize shrink height 10 px or 10 ppt
    bindsym Right resize grow width 10 px or 10 ppt

    # Fine-grained resize with Shift
    bindsym Shift+h resize shrink width 2 px or 2 ppt
    bindsym Shift+j resize grow height 2 px or 2 ppt
    bindsym Shift+k resize shrink height 2 px or 2 ppt
    bindsym Shift+l resize grow width 2 px or 2 ppt

    # Exit resize mode
    bindsym Return mode "default"
    bindsym Escape mode "default"
    bindsym $mod+r mode "default"
}

bindsym $mod+r mode "resize"

#==============================================================================
# WINDOW RULES
#==============================================================================

# Floating windows
for_window [window_role="pop-up"] floating enable
for_window [window_role="task_dialog"] floating enable
for_window [class="Pavucontrol"] floating enable
for_window [class="Nm-connection-editor"] floating enable
for_window [class="Blueman-manager"] floating enable
for_window [class="Gnome-calculator"] floating enable
for_window [class="Gpick"] floating enable
for_window [class="File-roller"] floating enable
for_window [title="Picture-in-Picture"] floating enable, sticky enable

# Assign applications to specific workspaces
assign [class="Firefox"] $ws1
assign [class="Code"] $ws2
assign [class="Slack"] $ws3
assign [class="discord"] $ws4
assign [class="Spotify"] $ws5
assign [class="Thunderbird"] $ws6

# Focus urgent windows automatically
focus_on_window_activation focus

#==============================================================================
# STATUS BAR
#==============================================================================

bar {
    status_command i3status
    position top
    font pango:JetBrains Mono 10

    colors {
        background $bg-color
        statusline $text-color
        separator  $inactive-text-color

        #                  border             background         text
        focused_workspace  $bg-color          $bg-color          $text-color
        inactive_workspace $inactive-bg-color $inactive-bg-color $inactive-text-color
        urgent_workspace   $urgent-bg-color   $urgent-bg-color   $text-color
    }
}

#==============================================================================
# AUTOSTART APPLICATIONS
#==============================================================================

# Compositor
exec_always --no-startup-id picom -b

# Wallpaper
exec_always --no-startup-id feh --bg-fill ~/Pictures/wallpaper.jpg

# Network manager applet
exec --no-startup-id nm-applet

# Notification daemon
exec --no-startup-id dunst

# PolicyKit authentication agent
exec --no-startup-id /usr/lib/polkit-gnome/polkit-gnome-authentication-agent-1

# Clipboard manager
exec --no-startup-id clipit

# Auto-lock after inactivity
exec --no-startup-id xautolock -time 10 -locker "i3lock -c 2E3440"

# Set keyboard layout
exec --no-startup-id setxkbmap -layout us

# Restore screen brightness
exec --no-startup-id brightnessctl set 80%
```

## Customizing Appearance

Creating a visually appealing i3 setup involves configuring several components.

### Window Borders and Gaps

Modern i3 setups often use gaps between windows for a cleaner look:

```bash
# Install i3-gaps if not already installed
sudo apt install -y i3-gaps

# In your config file:
# Remove window title bars
for_window [class=".*"] border pixel 2

# Configure gaps
gaps inner 15
gaps outer 10

# Smart gaps - only show gaps when multiple windows
smart_gaps on

# Smart borders - hide border when single window
smart_borders on
```

### GTK Theme Configuration

Configure GTK applications to match your i3 theme:

```bash
# Install LXAppearance for GTK theme management
sudo apt install -y lxappearance

# Install popular themes
sudo apt install -y arc-theme papirus-icon-theme

# Install fonts
sudo apt install -y fonts-jetbrains-mono fonts-font-awesome
```

Create or edit `~/.config/gtk-3.0/settings.ini`:

```ini
[Settings]
gtk-theme-name=Arc-Dark
gtk-icon-theme-name=Papirus-Dark
gtk-font-name=JetBrains Mono 10
gtk-cursor-theme-name=Adwaita
gtk-application-prefer-dark-theme=1
```

### Compositor Configuration (Picom)

Picom adds transparency, shadows, and animations. Create `~/.config/picom/picom.conf`:

```bash
# ~/.config/picom/picom.conf

# Backend (use glx for better performance)
backend = "glx";
glx-no-stencil = true;
glx-copy-from-front = false;

# Shadows
shadow = true;
shadow-radius = 12;
shadow-offset-x = -12;
shadow-offset-y = -12;
shadow-opacity = 0.7;
shadow-exclude = [
    "class_g = 'i3-frame'",
    "_GTK_FRAME_EXTENTS@:c"
];

# Fading
fading = true;
fade-delta = 4;
fade-in-step = 0.03;
fade-out-step = 0.03;
fade-exclude = [];

# Transparency / Opacity
inactive-opacity = 0.95;
active-opacity = 1.0;
frame-opacity = 1.0;
inactive-opacity-override = false;

# Window type specific settings
wintypes:
{
    tooltip = { fade = true; shadow = false; opacity = 0.9; };
    dock = { shadow = false; };
    dnd = { shadow = false; };
};

# Focus detection
detect-client-opacity = true;
detect-transient = true;
detect-client-leader = true;

# VSync
vsync = true;

# Other
mark-wmwin-focused = true;
mark-ovredir-focused = true;
use-ewmh-active-win = true;
```

## Status Bar Configuration

### i3status Configuration

The default i3status is lightweight and efficient. Create `~/.config/i3status/config`:

```bash
# ~/.config/i3status/config
# i3status configuration file

general {
    output_format = "i3bar"
    colors = true
    color_good = "#A3BE8C"
    color_degraded = "#EBCB8B"
    color_bad = "#BF616A"
    interval = 5
}

order += "wireless _first_"
order += "ethernet _first_"
order += "battery all"
order += "disk /"
order += "cpu_usage"
order += "memory"
order += "volume master"
order += "tztime local"

wireless _first_ {
    format_up = "W: %essid %quality"
    format_down = "W: down"
}

ethernet _first_ {
    format_up = "E: %ip"
    format_down = "E: down"
}

battery all {
    format = "BAT: %status %percentage %remaining"
    format_down = "No battery"
    status_chr = "CHR"
    status_bat = "BAT"
    status_unk = "UNK"
    status_full = "FULL"
    path = "/sys/class/power_supply/BAT%d/uevent"
    low_threshold = 20
}

disk "/" {
    format = "DISK: %avail"
}

cpu_usage {
    format = "CPU: %usage"
    max_threshold = 75
    degraded_threshold = 25
}

memory {
    format = "MEM: %percentage_used"
    threshold_degraded = "10%"
    threshold_critical = "5%"
}

volume master {
    format = "VOL: %volume"
    format_muted = "VOL: muted"
    device = "pulse"
}

tztime local {
    format = "%Y-%m-%d %H:%M"
}
```

### Polybar Configuration (Alternative Status Bar)

Polybar offers more customization options. Install and configure:

```bash
# Install Polybar
sudo apt install -y polybar

# Create config directory
mkdir -p ~/.config/polybar

# Create launch script
cat > ~/.config/polybar/launch.sh << 'EOF'
#!/bin/bash

# Terminate already running bar instances
killall -q polybar

# Wait until the processes have been shut down
while pgrep -u $UID -x polybar >/dev/null; do sleep 1; done

# Launch Polybar
polybar main 2>&1 | tee -a /tmp/polybar.log & disown

echo "Polybar launched..."
EOF

chmod +x ~/.config/polybar/launch.sh
```

Create `~/.config/polybar/config.ini`:

```ini
;=============================================================================
; POLYBAR CONFIGURATION
;=============================================================================

[colors]
background = #2E3440
background-alt = #3B4252
foreground = #ECEFF4
foreground-alt = #D8DEE9
primary = #88C0D0
secondary = #81A1C1
alert = #BF616A
success = #A3BE8C
warning = #EBCB8B

[bar/main]
width = 100%
height = 28
radius = 0
fixed-center = true

background = ${colors.background}
foreground = ${colors.foreground}

line-size = 3
line-color = ${colors.primary}

border-size = 0
border-color = #00000000

padding-left = 2
padding-right = 2

module-margin-left = 1
module-margin-right = 1

font-0 = JetBrains Mono:size=10;2
font-1 = Font Awesome 6 Free Solid:size=10;2
font-2 = Font Awesome 6 Brands:size=10;2

modules-left = i3 xwindow
modules-center = date
modules-right = pulseaudio memory cpu wlan battery

tray-position = right
tray-padding = 2

cursor-click = pointer
cursor-scroll = ns-resize

enable-ipc = true

[module/i3]
type = internal/i3
format = <label-state> <label-mode>
index-sort = true
wrapping-scroll = false

label-mode-padding = 2
label-mode-foreground = ${colors.foreground}
label-mode-background = ${colors.primary}

; focused = Active workspace on focused monitor
label-focused = %index%
label-focused-background = ${colors.background-alt}
label-focused-underline= ${colors.primary}
label-focused-padding = 2

; unfocused = Inactive workspace on any monitor
label-unfocused = %index%
label-unfocused-padding = 2

; visible = Active workspace on unfocused monitor
label-visible = %index%
label-visible-background = ${self.label-focused-background}
label-visible-underline = ${self.label-focused-underline}
label-visible-padding = ${self.label-focused-padding}

; urgent = Workspace with urgency hint set
label-urgent = %index%
label-urgent-background = ${colors.alert}
label-urgent-padding = 2

[module/xwindow]
type = internal/xwindow
label = %title:0:50:...%

[module/cpu]
type = internal/cpu
interval = 2
format-prefix = "CPU "
format-prefix-foreground = ${colors.foreground-alt}
label = %percentage:2%%

[module/memory]
type = internal/memory
interval = 2
format-prefix = "MEM "
format-prefix-foreground = ${colors.foreground-alt}
label = %percentage_used%%

[module/wlan]
type = internal/network
interface-type = wireless
interval = 3.0

format-connected = <label-connected>
label-connected = %essid%

format-disconnected = <label-disconnected>
label-disconnected = disconnected
label-disconnected-foreground = ${colors.foreground-alt}

[module/date]
type = internal/date
interval = 1

date = %Y-%m-%d
time = %H:%M

label = %date% %time%

[module/pulseaudio]
type = internal/pulseaudio

format-volume = <label-volume>
label-volume = VOL %percentage%%
label-volume-foreground = ${root.foreground}

label-muted = muted
label-muted-foreground = ${colors.foreground-alt}

[module/battery]
type = internal/battery
battery = BAT0
adapter = AC
full-at = 98

format-charging = <label-charging>
label-charging = CHR %percentage%%

format-discharging = <label-discharging>
label-discharging = BAT %percentage%%

format-full-prefix = "FULL "
format-full-prefix-foreground = ${colors.foreground-alt}

[settings]
screenchange-reload = true

[global/wm]
margin-top = 5
margin-bottom = 5
```

To use Polybar instead of i3bar, update your i3 config:

```bash
# Comment out the i3bar section and add:
exec_always --no-startup-id ~/.config/polybar/launch.sh
```

## Workspaces

Workspaces in i3 provide virtual desktops for organizing your applications.

### Named Workspaces

Use meaningful names with icons:

```bash
# Define named workspaces with Font Awesome icons
set $ws1 "1: Terminal"
set $ws2 "2: Code"
set $ws3 "3: Web"
set $ws4 "4: Chat"
set $ws5 "5: Music"
set $ws6 "6: Mail"
set $ws7 "7: Files"
set $ws8 "8"
set $ws9 "9"
set $ws10 "10: System"
```

### Workspace Assignment

Assign applications to specific workspaces:

```bash
# Web browsers
assign [class="Firefox"] $ws3
assign [class="Chromium"] $ws3
assign [class="Google-chrome"] $ws3

# Development
assign [class="Code"] $ws2
assign [class="jetbrains-idea"] $ws2
assign [class="Emacs"] $ws2

# Communication
assign [class="Slack"] $ws4
assign [class="discord"] $ws4
assign [class="TelegramDesktop"] $ws4

# Media
assign [class="Spotify"] $ws5
for_window [class="Spotify"] move to workspace $ws5

# Email
assign [class="Thunderbird"] $ws6

# File management
assign [class="Thunar"] $ws7
assign [class="Nautilus"] $ws7
```

### Workspace Navigation

Additional workspace navigation keybindings:

```bash
# Switch to next/previous workspace
bindsym $mod+period workspace next
bindsym $mod+comma workspace prev

# Switch to previously focused workspace
bindsym $mod+grave workspace back_and_forth

# Move container to next/previous workspace
bindsym $mod+Shift+period move container to workspace next
bindsym $mod+Shift+comma move container to workspace prev
```

## Window Rules

Window rules allow you to customize how specific applications behave.

### Floating Windows

```bash
# System utilities
for_window [class="Pavucontrol"] floating enable
for_window [class="Nm-connection-editor"] floating enable
for_window [class="Blueman-manager"] floating enable
for_window [class="Arandr"] floating enable

# Dialogs and popups
for_window [window_role="pop-up"] floating enable
for_window [window_role="bubble"] floating enable
for_window [window_role="task_dialog"] floating enable
for_window [window_role="Preferences"] floating enable
for_window [window_role="dialog"] floating enable
for_window [window_type="dialog"] floating enable
for_window [window_type="menu"] floating enable

# File dialogs
for_window [title="Open File"] floating enable
for_window [title="Save File"] floating enable
for_window [title="Open Folder"] floating enable

# Calculators and small utilities
for_window [class="Gnome-calculator"] floating enable
for_window [class="Galculator"] floating enable
for_window [class="Gpick"] floating enable

# Image viewers
for_window [class="feh"] floating enable
for_window [class="Eog"] floating enable

# Video players (Picture-in-Picture)
for_window [title="Picture-in-Picture"] floating enable, sticky enable, resize set 400 225, move position 1500 800
```

### Window Size and Position

```bash
# Set default size for floating windows
for_window [class="Pavucontrol"] floating enable, resize set 800 600, move position center

# Center specific windows
for_window [class="Gnome-calculator"] floating enable, move position center

# Sticky windows (visible on all workspaces)
for_window [class="Conky"] floating enable, sticky enable

# Specific window positions
for_window [title="dropdown_terminal"] floating enable, resize set 1200 600, move position center
```

### Focus and Urgency

```bash
# Focus urgent windows immediately
focus_on_window_activation focus

# Don't steal focus
no_focus [class="Firefox"]

# Disable urgency hint for specific apps
for_window [class="Spotify"] urgent=never
```

## Application Launchers

### dmenu Configuration

dmenu is the default launcher. Customize it with options:

```bash
# Basic dmenu
bindsym $mod+d exec --no-startup-id dmenu_run

# Customized dmenu with colors
bindsym $mod+d exec --no-startup-id dmenu_run -i -nb '#2E3440' -nf '#ECEFF4' -sb '#88C0D0' -sf '#2E3440' -fn 'JetBrains Mono-10'
```

### Rofi Configuration

Rofi is a more feature-rich alternative. Create `~/.config/rofi/config.rasi`:

```css
/* ~/.config/rofi/config.rasi */

configuration {
    modi: "drun,run,window,ssh";
    font: "JetBrains Mono 11";
    show-icons: true;
    icon-theme: "Papirus-Dark";
    terminal: "alacritty";
    drun-display-format: "{name}";
    location: 0;
    disable-history: false;
    hide-scrollbar: true;
    sidebar-mode: false;
}

@theme "nord"

/* Custom theme overrides */
* {
    background-color: #2E3440;
    text-color: #ECEFF4;
    border-color: #4C566A;
}

window {
    width: 50%;
    border: 2px;
    border-radius: 8px;
    padding: 20px;
}

mainbox {
    spacing: 10px;
}

inputbar {
    background-color: #3B4252;
    border-radius: 5px;
    padding: 10px;
    children: [prompt, entry];
}

prompt {
    text-color: #88C0D0;
    padding: 0 10px 0 0;
}

entry {
    placeholder: "Search...";
    placeholder-color: #4C566A;
}

listview {
    lines: 10;
    columns: 1;
    fixed-height: true;
    spacing: 5px;
}

element {
    padding: 10px;
    border-radius: 5px;
}

element selected {
    background-color: #88C0D0;
    text-color: #2E3440;
}

element-icon {
    size: 24px;
    padding: 0 10px 0 0;
}
```

Add Rofi keybindings to i3 config:

```bash
# Application launcher
bindsym $mod+d exec --no-startup-id rofi -show drun

# Window switcher
bindsym $mod+Tab exec --no-startup-id rofi -show window

# Run command
bindsym $mod+Shift+d exec --no-startup-id rofi -show run

# SSH connections
bindsym $mod+Shift+s exec --no-startup-id rofi -show ssh

# Power menu
bindsym $mod+Shift+p exec --no-startup-id ~/.config/rofi/scripts/powermenu.sh
```

Create a power menu script at `~/.config/rofi/scripts/powermenu.sh`:

```bash
#!/bin/bash

options="Lock\nLogout\nSuspend\nReboot\nShutdown"

chosen=$(echo -e "$options" | rofi -dmenu -i -p "Power Menu")

case $chosen in
    Lock)
        i3lock -c 2E3440
        ;;
    Logout)
        i3-msg exit
        ;;
    Suspend)
        systemctl suspend
        ;;
    Reboot)
        systemctl reboot
        ;;
    Shutdown)
        systemctl poweroff
        ;;
esac
```

Make it executable:

```bash
chmod +x ~/.config/rofi/scripts/powermenu.sh
```

## Autostart Applications

### Using exec and exec_always

In i3 config, use `exec` for applications that should start once and `exec_always` for those that should restart when i3 restarts:

```bash
#==============================================================================
# AUTOSTART APPLICATIONS
#==============================================================================

# exec_always: Runs on i3 start AND restart
# exec: Runs only on i3 start (not restart)

# Desktop composition
exec_always --no-startup-id picom -b

# Wallpaper
exec_always --no-startup-id feh --bg-fill ~/Pictures/wallpaper.jpg
# Alternative: nitrogen --restore

# Polybar (if using instead of i3bar)
# exec_always --no-startup-id ~/.config/polybar/launch.sh

# System tray applications (exec only - don't restart)
exec --no-startup-id nm-applet
exec --no-startup-id blueman-applet
exec --no-startup-id pasystray

# Notification daemon
exec --no-startup-id dunst

# Clipboard manager
exec --no-startup-id clipit
# or
exec --no-startup-id parcellite

# Authentication agent
exec --no-startup-id /usr/lib/polkit-gnome/polkit-gnome-authentication-agent-1

# Screen locker
exec --no-startup-id xss-lock -- i3lock -c 2E3440

# Auto-lock after 10 minutes
exec --no-startup-id xautolock -time 10 -locker "i3lock -c 2E3440" -detectsleep

# Set display settings
exec --no-startup-id xrandr --output HDMI-1 --mode 1920x1080 --rate 60

# Keyboard settings
exec --no-startup-id setxkbmap -layout us -option caps:escape
exec --no-startup-id xset r rate 300 50

# Touchpad settings (if applicable)
exec --no-startup-id xinput set-prop "SynPS/2 Synaptics TouchPad" "libinput Tapping Enabled" 1

# Restore brightness
exec --no-startup-id brightnessctl set 80%

# Start essential applications
exec --no-startup-id firefox
exec --no-startup-id slack

# Conky system monitor (optional)
exec --no-startup-id conky -c ~/.config/conky/conky.conf
```

### XDG Autostart

For applications that follow XDG standards:

```bash
# Install dex for XDG autostart support
sudo apt install -y dex

# Add to i3 config
exec --no-startup-id dex --autostart --environment i3
```

## Multi-Monitor Setup

i3 provides excellent multi-monitor support out of the box.

### Detecting Monitors

```bash
# List connected monitors
xrandr --query

# Use arandr for graphical configuration
sudo apt install -y arandr
```

### Configuring Monitors in i3

```bash
# Set monitor layout on startup
exec --no-startup-id xrandr --output HDMI-1 --primary --mode 1920x1080 --pos 0x0 --output eDP-1 --mode 1920x1080 --pos 1920x0

# Alternative: Use autorandr for automatic configuration
sudo apt install -y autorandr

# Save current configuration
autorandr --save home

# Load configuration automatically
exec --no-startup-id autorandr --change
```

### Workspace-Monitor Assignment

Assign specific workspaces to specific monitors:

```bash
# Define monitor outputs (find names with xrandr)
set $monitor_primary HDMI-1
set $monitor_secondary eDP-1

# Assign workspaces to monitors
workspace $ws1 output $monitor_primary
workspace $ws2 output $monitor_primary
workspace $ws3 output $monitor_primary
workspace $ws4 output $monitor_secondary
workspace $ws5 output $monitor_secondary
workspace $ws6 output $monitor_secondary
```

### Moving Between Monitors

```bash
# Focus next/previous monitor
bindsym $mod+Ctrl+h focus output left
bindsym $mod+Ctrl+l focus output right

# Move workspace to monitor
bindsym $mod+Ctrl+Shift+h move workspace to output left
bindsym $mod+Ctrl+Shift+l move workspace to output right

# Move container to monitor
bindsym $mod+Shift+greater move container to output right
bindsym $mod+Shift+less move container to output left
```

## Useful Tools

### i3lock - Screen Locker

Configure a stylish lock screen:

```bash
# Install i3lock-color for more customization
sudo apt install -y i3lock-color

# Create lock script at ~/.config/i3/scripts/lock.sh
mkdir -p ~/.config/i3/scripts
```

Create `~/.config/i3/scripts/lock.sh`:

```bash
#!/bin/bash

# Colors
BG_COLOR=2E3440
RING_COLOR=88C0D0
TEXT_COLOR=ECEFF4
WRONG_COLOR=BF616A
VERIF_COLOR=A3BE8C

i3lock \
    --color=$BG_COLOR \
    --inside-color=00000000 \
    --ring-color=$RING_COLOR \
    --line-uses-inside \
    --keyhl-color=$VERIF_COLOR \
    --bshl-color=$WRONG_COLOR \
    --separator-color=00000000 \
    --insidever-color=00000000 \
    --insidewrong-color=00000000 \
    --ringver-color=$VERIF_COLOR \
    --ringwrong-color=$WRONG_COLOR \
    --ind-pos="x+w/2:y+h/2" \
    --radius=120 \
    --ring-width=10 \
    --verif-text="Verifying..." \
    --wrong-text="Wrong!" \
    --noinput-text="No Input" \
    --lock-text="Locking..." \
    --lockfailed-text="Lock Failed" \
    --time-color=$TEXT_COLOR \
    --date-color=$TEXT_COLOR \
    --clock \
    --time-str="%H:%M" \
    --date-str="%A, %B %d" \
    --time-font="JetBrains Mono" \
    --date-font="JetBrains Mono" \
    --time-size=48 \
    --date-size=24 \
    --blur 5
```

Make executable and add keybinding:

```bash
chmod +x ~/.config/i3/scripts/lock.sh

# In i3 config
bindsym $mod+Escape exec --no-startup-id ~/.config/i3/scripts/lock.sh
```

### Dunst - Notification Daemon

Create `~/.config/dunst/dunstrc`:

```ini
# ~/.config/dunst/dunstrc

[global]
    # Display settings
    monitor = 0
    follow = mouse

    # Geometry
    width = 350
    height = 150
    origin = top-right
    offset = 20x50

    # Progress bar
    progress_bar = true
    progress_bar_height = 10
    progress_bar_frame_width = 1
    progress_bar_min_width = 150
    progress_bar_max_width = 300

    # Notification appearance
    transparency = 0
    padding = 15
    horizontal_padding = 15
    frame_width = 2
    gap_size = 5
    separator_height = 2
    separator_color = frame

    # Sorting
    sort = yes

    # Text
    font = JetBrains Mono 10
    line_height = 0
    markup = full
    format = "<b>%s</b>\n%b"
    alignment = left
    vertical_alignment = center
    show_age_threshold = 60
    ellipsize = middle
    ignore_newline = no
    stack_duplicates = true
    hide_duplicate_count = false
    show_indicators = yes

    # Icons
    enable_recursive_icon_lookup = true
    icon_theme = Papirus-Dark
    icon_position = left
    min_icon_size = 32
    max_icon_size = 48

    # History
    sticky_history = yes
    history_length = 20

    # Misc
    browser = /usr/bin/firefox
    always_run_script = true
    title = Dunst
    class = Dunst
    corner_radius = 8

    # Mouse actions
    mouse_left_click = close_current
    mouse_middle_click = do_action, close_current
    mouse_right_click = close_all

[urgency_low]
    background = "#2E3440"
    foreground = "#ECEFF4"
    frame_color = "#4C566A"
    timeout = 5

[urgency_normal]
    background = "#2E3440"
    foreground = "#ECEFF4"
    frame_color = "#88C0D0"
    timeout = 10

[urgency_critical]
    background = "#2E3440"
    foreground = "#ECEFF4"
    frame_color = "#BF616A"
    timeout = 0
```

### Additional Useful Tools

```bash
# Screenshot tool
sudo apt install -y flameshot
# Keybinding: bindsym Print exec --no-startup-id flameshot gui

# Color picker
sudo apt install -y gpick

# System monitor
sudo apt install -y htop btop

# Disk usage analyzer
sudo apt install -y ncdu

# Clipboard manager with history
sudo apt install -y copyq

# Better terminal file manager
sudo apt install -y ranger

# PDF viewer
sudo apt install -y zathura

# Image viewer
sudo apt install -y nsxiv
```

## Complete Configuration Example

Here is a comprehensive i3 configuration combining all the concepts:

```bash
# ~/.config/i3/config
# Complete i3 Configuration
# Author: Your Name
# Last Updated: 2026-01-15

#==============================================================================
# VARIABLES
#==============================================================================

# Modifier key (Mod4 = Super/Windows key)
set $mod Mod4

# Direction keys (vim-style)
set $left h
set $down j
set $up k
set $right l

# Terminal emulator
set $term alacritty

# Application launcher
set $menu rofi -show drun -show-icons

# Colors (Nord theme)
set $nord0  #2E3440
set $nord1  #3B4252
set $nord2  #434C5E
set $nord3  #4C566A
set $nord4  #D8DEE9
set $nord5  #E5E9F0
set $nord6  #ECEFF4
set $nord7  #8FBCBB
set $nord8  #88C0D0
set $nord9  #81A1C1
set $nord10 #5E81AC
set $nord11 #BF616A
set $nord12 #D08770
set $nord13 #EBCB8B
set $nord14 #A3BE8C
set $nord15 #B48EAD

# Workspace names
set $ws1 "1"
set $ws2 "2"
set $ws3 "3"
set $ws4 "4"
set $ws5 "5"
set $ws6 "6"
set $ws7 "7"
set $ws8 "8"
set $ws9 "9"
set $ws10 "10"

# Monitor outputs (adjust to your setup)
set $monitor_primary HDMI-1
set $monitor_secondary eDP-1

#==============================================================================
# GENERAL SETTINGS
#==============================================================================

# Font
font pango:JetBrains Mono 10

# Floating window modifier
floating_modifier $mod

# Focus behavior
focus_follows_mouse no
focus_wrapping no
focus_on_window_activation smart

# Mouse behavior
mouse_warping output

# Window borders
default_border pixel 2
default_floating_border pixel 2
hide_edge_borders smart

# Remove title bars
for_window [class=".*"] border pixel 2

#==============================================================================
# GAPS (requires i3-gaps)
#==============================================================================

gaps inner 10
gaps outer 5
smart_gaps on
smart_borders on

#==============================================================================
# COLORS
#==============================================================================

# Class                 Border   Background  Text     Indicator  Child Border
client.focused          $nord8   $nord0      $nord6   $nord8     $nord8
client.focused_inactive $nord3   $nord0      $nord4   $nord3     $nord3
client.unfocused        $nord1   $nord0      $nord4   $nord1     $nord1
client.urgent           $nord11  $nord11     $nord6   $nord11    $nord11
client.placeholder      $nord0   $nord0      $nord6   $nord0     $nord0
client.background       $nord0

#==============================================================================
# KEYBINDINGS - APPLICATIONS
#==============================================================================

# Terminal
bindsym $mod+Return exec $term

# Application launcher
bindsym $mod+d exec --no-startup-id $menu

# Window switcher
bindsym $mod+Tab exec --no-startup-id rofi -show window -show-icons

# File manager
bindsym $mod+e exec thunar

# Web browser
bindsym $mod+b exec firefox

# Lock screen
bindsym $mod+Escape exec --no-startup-id ~/.config/i3/scripts/lock.sh

# Screenshots
bindsym Print exec --no-startup-id flameshot gui
bindsym $mod+Print exec --no-startup-id flameshot full -p ~/Pictures/

# Power menu
bindsym $mod+Shift+p exec --no-startup-id ~/.config/rofi/scripts/powermenu.sh

#==============================================================================
# KEYBINDINGS - WINDOW MANAGEMENT
#==============================================================================

# Kill window
bindsym $mod+Shift+q kill

# Change focus
bindsym $mod+$left focus left
bindsym $mod+$down focus down
bindsym $mod+$up focus up
bindsym $mod+$right focus right
bindsym $mod+Left focus left
bindsym $mod+Down focus down
bindsym $mod+Up focus up
bindsym $mod+Right focus right

# Move window
bindsym $mod+Shift+$left move left
bindsym $mod+Shift+$down move down
bindsym $mod+Shift+$up move up
bindsym $mod+Shift+$right move right
bindsym $mod+Shift+Left move left
bindsym $mod+Shift+Down move down
bindsym $mod+Shift+Up move up
bindsym $mod+Shift+Right move right

# Split orientation
bindsym $mod+backslash split h
bindsym $mod+minus split v

# Fullscreen
bindsym $mod+f fullscreen toggle

# Layout
bindsym $mod+s layout stacking
bindsym $mod+w layout tabbed
bindsym $mod+t layout toggle split

# Floating
bindsym $mod+Shift+space floating toggle
bindsym $mod+space focus mode_toggle

# Focus parent/child
bindsym $mod+a focus parent
bindsym $mod+c focus child

# Scratchpad
bindsym $mod+Shift+minus move scratchpad
bindsym $mod+equal scratchpad show

#==============================================================================
# KEYBINDINGS - WORKSPACES
#==============================================================================

# Switch workspace
bindsym $mod+1 workspace number $ws1
bindsym $mod+2 workspace number $ws2
bindsym $mod+3 workspace number $ws3
bindsym $mod+4 workspace number $ws4
bindsym $mod+5 workspace number $ws5
bindsym $mod+6 workspace number $ws6
bindsym $mod+7 workspace number $ws7
bindsym $mod+8 workspace number $ws8
bindsym $mod+9 workspace number $ws9
bindsym $mod+0 workspace number $ws10

# Move to workspace
bindsym $mod+Shift+1 move container to workspace number $ws1
bindsym $mod+Shift+2 move container to workspace number $ws2
bindsym $mod+Shift+3 move container to workspace number $ws3
bindsym $mod+Shift+4 move container to workspace number $ws4
bindsym $mod+Shift+5 move container to workspace number $ws5
bindsym $mod+Shift+6 move container to workspace number $ws6
bindsym $mod+Shift+7 move container to workspace number $ws7
bindsym $mod+Shift+8 move container to workspace number $ws8
bindsym $mod+Shift+9 move container to workspace number $ws9
bindsym $mod+Shift+0 move container to workspace number $ws10

# Navigate workspaces
bindsym $mod+period workspace next
bindsym $mod+comma workspace prev
bindsym $mod+grave workspace back_and_forth

# Move workspace to monitor
bindsym $mod+Ctrl+$left move workspace to output left
bindsym $mod+Ctrl+$right move workspace to output right

#==============================================================================
# KEYBINDINGS - MEDIA
#==============================================================================

# Volume
bindsym XF86AudioRaiseVolume exec --no-startup-id pactl set-sink-volume @DEFAULT_SINK@ +5%
bindsym XF86AudioLowerVolume exec --no-startup-id pactl set-sink-volume @DEFAULT_SINK@ -5%
bindsym XF86AudioMute exec --no-startup-id pactl set-sink-mute @DEFAULT_SINK@ toggle
bindsym XF86AudioMicMute exec --no-startup-id pactl set-source-mute @DEFAULT_SOURCE@ toggle

# Brightness
bindsym XF86MonBrightnessUp exec --no-startup-id brightnessctl set +5%
bindsym XF86MonBrightnessDown exec --no-startup-id brightnessctl set 5%-

# Media
bindsym XF86AudioPlay exec --no-startup-id playerctl play-pause
bindsym XF86AudioNext exec --no-startup-id playerctl next
bindsym XF86AudioPrev exec --no-startup-id playerctl previous

#==============================================================================
# KEYBINDINGS - i3 MANAGEMENT
#==============================================================================

bindsym $mod+Shift+c reload
bindsym $mod+Shift+r restart
bindsym $mod+Shift+e exec "i3-nagbar -t warning -m 'Exit i3?' -B 'Yes' 'i3-msg exit'"

#==============================================================================
# RESIZE MODE
#==============================================================================

mode "resize" {
    bindsym $left resize shrink width 10 px or 10 ppt
    bindsym $down resize grow height 10 px or 10 ppt
    bindsym $up resize shrink height 10 px or 10 ppt
    bindsym $right resize grow width 10 px or 10 ppt

    bindsym Left resize shrink width 10 px or 10 ppt
    bindsym Down resize grow height 10 px or 10 ppt
    bindsym Up resize shrink height 10 px or 10 ppt
    bindsym Right resize grow width 10 px or 10 ppt

    bindsym Shift+$left resize shrink width 2 px or 2 ppt
    bindsym Shift+$down resize grow height 2 px or 2 ppt
    bindsym Shift+$up resize shrink height 2 px or 2 ppt
    bindsym Shift+$right resize grow width 2 px or 2 ppt

    bindsym Return mode "default"
    bindsym Escape mode "default"
    bindsym $mod+r mode "default"
}

bindsym $mod+r mode "resize"

#==============================================================================
# WINDOW RULES
#==============================================================================

# Floating windows
for_window [window_role="pop-up"] floating enable
for_window [window_role="task_dialog"] floating enable
for_window [window_type="dialog"] floating enable
for_window [class="Pavucontrol"] floating enable, resize set 800 600
for_window [class="Nm-connection-editor"] floating enable
for_window [class="Blueman-manager"] floating enable
for_window [class="Arandr"] floating enable
for_window [class="Gnome-calculator"] floating enable
for_window [class="Gpick"] floating enable
for_window [class="File-roller"] floating enable
for_window [title="Picture-in-Picture"] floating enable, sticky enable

# Workspace assignments
assign [class="Firefox"] $ws1
assign [class="Code"] $ws2
assign [class="Slack"] $ws3
assign [class="discord"] $ws4
for_window [class="Spotify"] move to workspace $ws5

# Focus handling
focus_on_window_activation focus

#==============================================================================
# WORKSPACE ASSIGNMENTS
#==============================================================================

workspace $ws1 output $monitor_primary
workspace $ws2 output $monitor_primary
workspace $ws3 output $monitor_secondary
workspace $ws4 output $monitor_secondary

#==============================================================================
# STATUS BAR
#==============================================================================

bar {
    status_command i3status
    position top
    font pango:JetBrains Mono 10
    separator_symbol "  "
    tray_output primary
    tray_padding 4

    colors {
        background $nord0
        statusline $nord6
        separator  $nord3

        focused_workspace  $nord8 $nord8 $nord0
        active_workspace   $nord3 $nord3 $nord6
        inactive_workspace $nord1 $nord1 $nord4
        urgent_workspace   $nord11 $nord11 $nord6
    }
}

#==============================================================================
# AUTOSTART
#==============================================================================

# Display settings
exec --no-startup-id autorandr --change

# Compositor
exec_always --no-startup-id picom -b

# Wallpaper
exec_always --no-startup-id feh --bg-fill ~/Pictures/wallpaper.jpg

# System tray
exec --no-startup-id nm-applet
exec --no-startup-id blueman-applet

# Notifications
exec --no-startup-id dunst

# Authentication
exec --no-startup-id /usr/lib/polkit-gnome/polkit-gnome-authentication-agent-1

# Screen lock
exec --no-startup-id xss-lock -- ~/.config/i3/scripts/lock.sh

# Clipboard
exec --no-startup-id copyq

# Keyboard
exec --no-startup-id setxkbmap -layout us -option caps:escape
exec --no-startup-id xset r rate 300 50
```

## Troubleshooting Common Issues

### i3 Does Not Start

Check the X server logs:

```bash
cat ~/.local/share/xorg/Xorg.0.log | grep -i error
```

### Missing Keybindings

Verify your configuration syntax:

```bash
i3 -C
```

### Applications Not Assigned to Workspaces

Check the window class:

```bash
xprop | grep WM_CLASS
```

### Multi-Monitor Issues

Reset display configuration:

```bash
xrandr --auto
```

## Conclusion

The i3 window manager offers a powerful, efficient, and highly customizable computing experience. While the learning curve may seem steep initially, the productivity gains and satisfaction of a perfectly tailored desktop environment make it worthwhile. Start with the basic configuration and gradually add customizations as you become more comfortable with the workflow.

Key takeaways:

- i3 maximizes screen efficiency through automatic tiling
- The configuration file is human-readable and well-documented
- Extensive customization is possible through window rules, modes, and scripts
- Tools like rofi, polybar, and picom enhance the experience
- Multi-monitor support is excellent out of the box

Remember that the best configuration is one that evolves with your workflow. Do not hesitate to experiment and iterate on your setup.

---

**Note**: If you are managing servers or infrastructure alongside your i3 setup, consider using [OneUptime](https://oneuptime.com) for comprehensive monitoring. OneUptime provides real-time alerting, status pages, and incident management to ensure your systems remain healthy and your users stay informed. With OneUptime, you can monitor your servers, services, and applications from a single dashboard, receiving instant notifications when issues arise. This is particularly valuable for developers and system administrators who want to maintain high availability while working in an efficient environment like i3.

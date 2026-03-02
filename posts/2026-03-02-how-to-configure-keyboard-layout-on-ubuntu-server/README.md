# How to Configure Keyboard Layout on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Keyboard Layout, System Administration, localectl, Console

Description: Configure keyboard layout on Ubuntu Server for both the console and X11 environments, including setting up non-US layouts, key mappings, and resolving layout issues over SSH.

---

On Ubuntu Server, keyboard layout configuration affects console sessions (direct TTY access, IPMI/iDRAC console) and local logins. While SSH sessions inherit the keyboard layout from the connecting client, direct console access relies on the server's configured layout. Getting this right matters most when troubleshooting without SSH access.

## Checking the Current Keyboard Layout

```bash
# Check current keyboard configuration
localectl status

# Example output:
#    System Locale: LANG=en_US.UTF-8
#        VC Keymap: us
#       X11 Layout: us
#      X11 Variant:
#      X11 Options: terminate:ctrl_alt_bksp

# Check via the keyboard configuration file
cat /etc/default/keyboard

# Check what layout is active on the console
dumpkeys | head -10   # Shows current console key mappings
```

## Setting Keyboard Layout with localectl

`localectl` manages keyboard configuration alongside locale settings:

```bash
# List available keyboard layouts
localectl list-keymaps | less

# Search for a specific layout
localectl list-keymaps | grep us
localectl list-keymaps | grep gb
localectl list-keymaps | grep de
localectl list-keymaps | grep fr
localectl list-keymaps | grep es

# Set the console (virtual console) keyboard layout
sudo localectl set-keymap us          # US QWERTY
sudo localectl set-keymap gb          # UK keyboard
sudo localectl set-keymap de-latin1   # German
sudo localectl set-keymap fr          # French AZERTY
sudo localectl set-keymap dvorak      # Dvorak

# Set X11 and console layout simultaneously
sudo localectl set-x11-keymap us
sudo localectl set-x11-keymap gb pc105 "" ""

# Verify
localectl status
```

## Setting Keyboard Layout via /etc/default/keyboard

The `/etc/default/keyboard` file is the underlying configuration that both X11 and console tools read:

```bash
sudo nano /etc/default/keyboard
```

```bash
# /etc/default/keyboard

# Keyboard model - affects special keys
XKBMODEL="pc105"   # Standard 105-key PC keyboard
# XKBMODEL="pc104"  # Standard 104-key US keyboard
# XKBMODEL="apple_laptop"  # Apple laptop keyboard

# Keyboard layout
XKBLAYOUT="us"     # US QWERTY
# XKBLAYOUT="gb"   # UK
# XKBLAYOUT="de"   # German
# XKBLAYOUT="fr"   # French
# XKBLAYOUT="us,de" # Multiple layouts (switch with key combo)

# Keyboard variant (layout-specific options)
XKBVARIANT=""
# XKBVARIANT="dvorak"    # US Dvorak
# XKBVARIANT="colemak"   # Colemak
# XKBVARIANT="intl"      # US International (accents with dead keys)
# XKBVARIANT="mac"       # Mac-style layout variant

# Keyboard options
XKBOPTIONS=""
# XKBOPTIONS="grp:alt_shift_toggle"   # Toggle layouts with Alt+Shift
# XKBOPTIONS="ctrl:nocaps"            # Make CapsLock a Ctrl key
# XKBOPTIONS="caps:escape"            # Make CapsLock an Escape key
# XKBOPTIONS="compose:ralt"           # Use Right Alt as compose key
```

After editing, apply the changes:

```bash
# Apply keyboard configuration to the console
sudo setupcon --force --save-only 2>/dev/null || sudo dpkg-reconfigure keyboard-configuration

# Apply via setupcon (applies immediately)
sudo setupcon

# Verify
localectl status
```

## Interactive Configuration with dpkg-reconfigure

For a guided interactive setup:

```bash
# Interactive keyboard configuration
sudo dpkg-reconfigure keyboard-configuration
```

This walks through:
1. Keyboard model selection
2. Country of origin / layout
3. Layout variant
4. Key to function as AltGr
5. Key to function as Compose

For automated/scripted environments:

```bash
# Set keyboard layout non-interactively
sudo DEBIAN_FRONTEND=noninteractive dpkg-reconfigure keyboard-configuration

# Or manually write the config and apply
cat << 'EOF' | sudo tee /etc/default/keyboard
XKBMODEL="pc105"
XKBLAYOUT="us"
XKBVARIANT=""
XKBOPTIONS=""
BACKSPACE="guess"
EOF

sudo setupcon
```

## Configuring Multiple Keyboard Layouts

For systems where you need to switch between layouts:

```bash
sudo nano /etc/default/keyboard
```

```bash
# Two layouts: US and German, switch with Alt+Shift
XKBMODEL="pc105"
XKBLAYOUT="us,de"
XKBVARIANT=","
XKBOPTIONS="grp:alt_shift_toggle"
```

Other switching key combinations:
- `grp:alt_shift_toggle` - Alt+Shift
- `grp:ctrl_shift_toggle` - Ctrl+Shift
- `grp:win_space_toggle` - Windows+Space
- `grp:caps_toggle` - CapsLock
- `grp:menu_toggle` - Menu key

## Console-Only Keyboard Configuration

For console (TTY) without X11, the keymap is configured separately:

```bash
# List available console keymaps
ls /usr/share/keymaps/ -R | grep "\.gz$" | head -20

# Or use loadkeys to see options
ls /usr/share/kbd/keymaps/ 2>/dev/null || ls /usr/share/keymaps/

# Load a keymap immediately (doesn't persist)
sudo loadkeys us
sudo loadkeys uk
sudo loadkeys de-latin1
sudo loadkeys fr

# Persist the console keymap
# Edit /etc/vconsole.conf (systemd approach)
sudo nano /etc/vconsole.conf
```

```bash
# /etc/vconsole.conf
KEYMAP=us
KEYMAP_TOGGLE=
FONT=
FONT_MAP=
FONT_UNIMAP=
```

```bash
# Apply immediately
sudo systemctl restart console-setup

# Or use localectl which updates vconsole.conf
sudo localectl set-keymap us
```

## Remapping Specific Keys

For custom key remapping without changing the whole layout:

```bash
# Show current key mapping for a key (press Ctrl+V then the key)
cat -v  # Then press the key to see its escape code

# Remap CapsLock to Escape (useful for vim users)
# One-time (doesn't persist):
# Using xdotool or setxkbmap for X11:
setxkbmap -option caps:escape   # X11

# Console remap (persistent in vconsole.conf or /etc/default/keyboard)
sudo nano /etc/default/keyboard
# XKBOPTIONS="caps:escape"

# Make CapsLock an additional Ctrl key
# XKBOPTIONS="ctrl:nocaps"

sudo setupcon
```

## Keyboard Layout Over Remote Console (IPMI/iDRAC)

When accessing servers via IPMI/iDRAC/ILO remote console:

- The remote console typically sends raw key codes
- The server's keyboard layout determines character output
- If your workstation has a different keyboard layout than the server expects, you'll get wrong characters

Solution: Match server keyboard layout to your physical keyboard, or use a US keyboard when typing in remote console sessions.

```bash
# If you're having issues with key mappings over IPMI console:
# 1. Set server to US layout (easiest to work with remotely)
sudo localectl set-keymap us

# 2. Or set to match your physical keyboard
sudo localectl set-keymap gb  # If you have a UK keyboard
```

## Keyboard Layout in Cloud Instances

Cloud instances typically use US keyboard layout by default, which matches the hardware the host server uses:

```bash
# For AWS/GCP/Azure instances - check the layout
localectl status

# If you're connecting via SSH, your local keyboard layout works fine
# Only matters for VNC/remote console access
```

## Testing Your Keyboard Layout

After setting the layout, test it:

```bash
# Switch to a virtual console to test
# (Ctrl+Alt+F2 to switch, then log in)

# Test special characters relevant to your layout
# For US layout, test: ~ ` @ # $ % ^ & * ( ) - _ = + [ ] { } \ | ; : ' " , . < > / ?

# For UK layout, test: £ @ # ~ \

# For German layout, test: ä ö ü Ä Ö Ü ß € @

# Return to main console: Ctrl+Alt+F1
```

## Applying Layout Immediately Without Reboot

```bash
# Apply to virtual consoles immediately
sudo systemctl restart keyboard-setup.service 2>/dev/null
sudo setupcon

# Or reload console configuration
sudo loadkeys $(grep XKBLAYOUT /etc/default/keyboard | cut -d= -f2 | tr -d '"')

# Check systemd service status
systemctl status keyboard-setup.service 2>/dev/null
```

## Verifying the Configuration Persists

```bash
# Check all configuration files are consistent
echo "=== localectl status ===" && localectl status
echo ""
echo "=== /etc/default/keyboard ===" && cat /etc/default/keyboard
echo ""
echo "=== /etc/vconsole.conf ===" && cat /etc/vconsole.conf 2>/dev/null || echo "Not present"

# Test after reboot by checking the layout on a virtual console
# Reboot and log in via console (not SSH) to verify
```

For most Ubuntu server installations with remote SSH access, the keyboard layout rarely needs attention since SSH clients handle keyboard input directly. The layout configuration matters primarily for:

1. Physical console access during initial setup
2. IPMI/iDRAC/ILO remote console access
3. Recovery situations where SSH is unavailable

Setting it to match your physical keyboard model and layout prevents surprises when you need console access at a critical moment.

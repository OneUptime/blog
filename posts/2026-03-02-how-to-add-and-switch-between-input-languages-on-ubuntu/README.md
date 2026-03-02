# How to Add and Switch Between Input Languages on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Localization, Desktop, GNOME, Keyboard

Description: A complete guide to adding multiple input languages and keyboard layouts on Ubuntu, including switching shortcuts and IBus configuration.

---

Working in multiple languages on Ubuntu involves adding the right keyboard layouts and input methods. Whether you need to switch between English and French, or between Latin-script languages and complex script languages like Arabic or Japanese, Ubuntu has the tools to handle it. This guide covers both simple keyboard layout switching and more advanced input method frameworks.

## Adding Keyboard Layouts via GNOME Settings

For Latin-script languages, adding a keyboard layout is the simplest approach.

1. Open **Settings** and navigate to **Keyboard**.
2. Under **Input Sources**, click the **+** button.
3. Select your language from the list, then choose the specific layout variant.
4. Click **Add**.

Once you have multiple layouts added, a language indicator appears in the top bar. Click it to switch, or use the keyboard shortcut.

## Configuring Input Sources via gsettings

You can also manage input sources from the terminal, which is useful for scripting or remote configuration.

```bash
# View current input sources
gsettings get org.gnome.desktop.input-sources sources

# Add English (US) and French layouts
gsettings set org.gnome.desktop.input-sources sources "[('xkb', 'us'), ('xkb', 'fr')]"

# Use US English with Dvorak variant and standard French
gsettings set org.gnome.desktop.input-sources sources "[('xkb', 'us+dvorak'), ('xkb', 'fr')]"
```

The format for each entry is `('xkb', 'layout+variant')` where the variant is optional.

## Setting the Keyboard Shortcut for Switching

By default, `Super + Space` switches between input sources. You can change this.

```bash
# View current switch shortcut
gsettings get org.gnome.desktop.wm.keybindings switch-input-source

# Change to Alt+Shift (common in many setups)
gsettings set org.gnome.desktop.wm.keybindings switch-input-source "['<Alt>Shift_L']"

# Or use the GNOME Settings > Keyboard > Keyboard Shortcuts > Typing section
# to configure it graphically
```

## Listing Available Keyboard Layouts

Before adding a layout, you may want to browse what is available.

```bash
# List all available layouts
localectl list-x11-keymap-layouts

# List variants for a specific layout (e.g., 'us')
localectl list-x11-keymap-variants us

# List variants for German layout
localectl list-x11-keymap-variants de
```

## Using IBus for Complex Script Input

For languages that require an input method engine (IME) - such as Chinese, Japanese, Korean, or Thai - IBus is the standard framework on Ubuntu.

```bash
# Install IBus
sudo apt install ibus

# Install IBus for a specific language (e.g., Pinyin for Chinese)
sudo apt install ibus-pinyin

# Install IBus for Japanese (Anthy)
sudo apt install ibus-anthy

# Install IBus for Korean (Hangul)
sudo apt install ibus-hangul

# Start the IBus daemon
ibus-daemon -drx
```

After installing, run `ibus-setup` to configure it and add input methods.

```bash
# Open IBus preferences
ibus-setup
```

In the IBus preferences window, go to the **Input Method** tab and add your desired methods.

## Setting IBus as the Default Input Method

```bash
# Set IBus as the default input method framework
im-config -n ibus

# Verify the setting
cat ~/.config/im-config/70_user.conf
```

Log out and back in after changing this setting for it to take effect.

## Using Fcitx5 as an Alternative

Fcitx5 is another popular input method framework, particularly well-regarded for CJK input.

```bash
# Install Fcitx5 and common components
sudo apt install fcitx5 fcitx5-chinese-addons fcitx5-frontend-gtk3

# Set Fcitx5 as the default input method
im-config -n fcitx5
```

## Switching Input Methods at Login

You can configure which input method framework launches at session start by editing the environment.

```bash
# Add to ~/.profile or ~/.xprofile for X11 sessions
export GTK_IM_MODULE=ibus
export QT_IM_MODULE=ibus
export XMODIFIERS=@im=ibus
```

For Wayland sessions (which is the default in Ubuntu 22.04+), these environment variables may behave differently. Check the GNOME Settings input source configuration instead, as GNOME handles Wayland input natively.

## Checking Current Keyboard Layout via Command Line

```bash
# Show current keyboard layout
setxkbmap -query

# Output example:
# rules:      evdev
# model:      pc105
# layout:     us,fr
# variant:    ,
# options:    grp:super_space_toggle
```

## Using localectl for System-Wide Layout

The `localectl` command sets the keyboard layout at the system level, which affects the console and display manager login screen.

```bash
# Set system keyboard layout to US English
sudo localectl set-x11-keymap us

# Set layout with a specific model and variant
sudo localectl set-x11-keymap us pc105 dvorak

# Set multiple layouts with toggle option
sudo localectl set-x11-keymap "us,de" pc105 "" "grp:alt_shift_toggle"

# Check current status
localectl status
```

Note that `localectl` affects the system-wide default, while GNOME Settings manages per-user preferences. Both can coexist.

## Adding a Layout Indicator to the Panel

When multiple layouts are active, GNOME automatically shows a language indicator in the top bar. If you want more detailed information or a persistent indicator even with one layout, consider GNOME Shell extensions like "Keyboard Indicator" or "Input Method Panel."

```bash
# Install GNOME Shell integration for extensions (if not present)
sudo apt install gnome-shell-extensions
```

Then visit extensions.gnome.org in Firefox to install additional panel applets.

## Automating Layout Configuration for New Users

If you manage shared machines or deploy Ubuntu to multiple workstations, you can pre-configure keyboard layouts in the user's dconf database or use a post-install script.

```bash
#!/bin/bash
# configure-keyboard.sh - Set up keyboard layouts for a user

# Set two input sources: US English and Spanish
gsettings set org.gnome.desktop.input-sources sources \
  "[('xkb', 'us'), ('xkb', 'es')]"

# Set Super+Space as the toggle shortcut
gsettings set org.gnome.desktop.wm.keybindings switch-input-source \
  "['<Super>space']"

# Optionally show input sources in the menu bar
gsettings set org.gnome.desktop.input-sources show-all-sources true

echo "Keyboard layout configuration complete."
```

## Troubleshooting Layout Switching

If the language indicator does not appear or switching does not work, try the following.

```bash
# Restart GNOME Shell (X11 only - this does NOT log you out)
# Press Alt+F2, type 'r', press Enter

# Check if IBus daemon is running
pgrep -la ibus

# Restart IBus
ibus restart

# Check for conflicting keyboard shortcuts
gsettings get org.gnome.desktop.wm.keybindings switch-input-source
gsettings get org.gnome.shell.keybindings switch-input-source
```

Having multiple input languages configured does not noticeably impact system performance. Ubuntu handles layout switching efficiently at the kernel and X11/Wayland compositor level.

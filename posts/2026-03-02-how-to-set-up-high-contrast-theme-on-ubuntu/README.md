# How to Set Up High Contrast Theme on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Accessibility, Desktop, GNOME

Description: Enable and customize high contrast themes on Ubuntu Desktop to improve screen readability for users with low vision or visual sensitivities, with configuration options for GNOME and applications.

---

High contrast themes replace the standard desktop color scheme with stark black-and-white or high-contrast color combinations that make interface elements easier to distinguish. This is an important accessibility feature for users with low vision, light sensitivity, or contrast sensitivity disorders.

## Enabling the Built-in High Contrast Theme

Ubuntu GNOME includes a built-in high contrast theme that can be enabled from Accessibility settings.

### From the Settings Panel

1. Open Activities and search for "Accessibility"
2. Click on "Accessibility"
3. Toggle "High Contrast" to On

The interface immediately switches to a high contrast black-and-white appearance.

### From the Command Line

```bash
# Enable high contrast theme
gsettings set org.gnome.desktop.interface gtk-theme 'HighContrast'

# Enable high contrast icons
gsettings set org.gnome.desktop.interface icon-theme 'HighContrast'

# Verify the change
gsettings get org.gnome.desktop.interface gtk-theme
# 'HighContrast'

# Disable and return to default theme
gsettings set org.gnome.desktop.interface gtk-theme 'Yaru'
gsettings set org.gnome.desktop.interface icon-theme 'Yaru'
```

## Available High Contrast Theme Variants

Ubuntu includes several variants of the high contrast theme.

```bash
# List installed themes
ls /usr/share/themes/ | grep -i contrast
# HighContrast
# HighContrastInverse

# List themes available in your user home
ls ~/.themes/ 2>/dev/null || echo "No user themes installed"

# Apply the inverse (dark background, light text) variant
gsettings set org.gnome.desktop.interface gtk-theme 'HighContrastInverse'
```

## Installing Additional High Contrast Themes

### From Ubuntu Repositories

```bash
# Install GNOME themes package (includes additional high contrast options)
sudo apt update
sudo apt install gnome-themes-extra gnome-themes-extra-data -y

# List newly available themes
ls /usr/share/themes/ | grep -iE 'contrast|high'

# Apply one of the additional themes
gsettings set org.gnome.desktop.interface gtk-theme 'HighContrast'
```

### Installing GNOME Tweaks for More Options

```bash
# Install GNOME Tweaks for a graphical theme switcher
sudo apt install gnome-tweaks -y

# Open GNOME Tweaks
gnome-tweaks

# Navigate to: Appearance > Themes > Legacy Applications
# Select any installed GTK theme

# For extensions-based theming
sudo apt install gnome-shell-extensions -y
```

### Installing Themes from GNOME Look

```bash
# Create the user themes directory
mkdir -p ~/.themes

# Example: download and install a custom high contrast theme
# (replace URL with the actual theme download URL)
cd /tmp
wget https://example.com/mycontrast-theme.tar.gz
tar xzf mycontrast-theme.tar.gz
mv MyContrastTheme ~/.themes/

# Apply the theme
gsettings set org.gnome.desktop.interface gtk-theme 'MyContrastTheme'
```

## Configuring High Contrast for GTK4 Applications

GTK4 applications use a different theming approach. On Ubuntu 22.04+, you can force high contrast for GTK4 apps.

```bash
# Enable high contrast preference (applications that support it will adapt)
gsettings set org.gnome.desktop.a11y prefers-color-scheme 'high-contrast'

# For individual GTK4 applications, set the environment variable
GTK_THEME=HighContrast:dark gedit &

# Make it permanent for all apps in a session by editing the environment
echo 'GTK_THEME=HighContrast' >> ~/.profile

# Or use the system-wide approach
sudo bash -c 'echo "GTK_THEME=HighContrast" >> /etc/environment'
```

## Configuring Firefox for High Contrast

Websites often have their own color schemes that override system settings. Configure Firefox to respect system colors.

```bash
# Open Firefox and navigate to:
# about:preferences#general

# Under "Language and Appearance":
# Colors > Override the colors specified by the page with your selections
# Choose "Always" or "Only with High Contrast themes"

# Or set via user.js (persistent Firefox configuration)
mkdir -p ~/.mozilla/firefox/*.default-release/

cat >> ~/.mozilla/firefox/*.default-release/user.js << 'EOF'
// Force Firefox to use system colors
user_pref("browser.display.use_system_colors", true);
user_pref("browser.display.document_color_use", 2);  // 2 = always use system colors
EOF
```

## Adding a Keyboard Shortcut to Toggle High Contrast

GNOME has a built-in shortcut to toggle high contrast.

```bash
# Check the current shortcut binding
gsettings get org.gnome.settings-daemon.plugins.media-keys toggle-contrast

# If not set, add a custom shortcut via GNOME Settings
# Settings > Keyboard > Custom Shortcuts
# Name: Toggle High Contrast
# Command: bash -c 'current=$(gsettings get org.gnome.desktop.interface gtk-theme); if [[ $current == *HighContrast* ]]; then gsettings set org.gnome.desktop.interface gtk-theme Yaru; else gsettings set org.gnome.desktop.interface gtk-theme HighContrast; fi'
# Shortcut: Choose your preferred key combination
```

Or create a toggle script:

```bash
# Create a high contrast toggle script
cat > ~/.local/bin/toggle-high-contrast.sh << 'EOF'
#!/bin/bash
# Toggle between HighContrast and default theme

CURRENT=$(gsettings get org.gnome.desktop.interface gtk-theme | tr -d "'")

if [[ "$CURRENT" == *"HighContrast"* ]]; then
    # Switch back to default
    gsettings set org.gnome.desktop.interface gtk-theme 'Yaru'
    gsettings set org.gnome.desktop.interface icon-theme 'Yaru'
    echo "Switched to default theme"
else
    # Switch to high contrast
    gsettings set org.gnome.desktop.interface gtk-theme 'HighContrast'
    gsettings set org.gnome.desktop.interface icon-theme 'HighContrast'
    echo "Switched to High Contrast theme"
fi
EOF

chmod +x ~/.local/bin/toggle-high-contrast.sh
```

## Increasing Cursor Size

High contrast themes pair well with a larger cursor.

```bash
# Increase cursor size (default is 24)
gsettings set org.gnome.desktop.interface cursor-size 48

# Available sizes typically: 24, 32, 48, 64, 96

# Reset to default
gsettings set org.gnome.desktop.interface cursor-size 24
```

## Adjusting Font Settings for Readability

```bash
# Increase font size for better readability
gsettings set org.gnome.desktop.interface text-scaling-factor 1.5

# Enable anti-aliasing and hinting for sharper text
gsettings set org.gnome.desktop.interface font-antialiasing 'rgba'
gsettings set org.gnome.desktop.interface font-hinting 'full'

# Use a more readable monospace font for terminals
gsettings set org.gnome.desktop.interface monospace-font-name 'DejaVu Sans Mono 14'

# Check what scaling is currently set
gsettings get org.gnome.desktop.interface text-scaling-factor
```

## Configuring High Contrast for Terminal

```bash
# GNOME Terminal high contrast profile
# Open Terminal > Edit > Preferences > [Profile] > Colors
# Uncheck "Use colors from system theme"
# Set Built-in scheme to "Black on white" or "White on black"

# Or configure via dconf
PROFILE=$(gsettings get org.gnome.Terminal.ProfilesList default | tr -d "'")

dconf write /org/gnome/terminal/legacy/profiles:/:${PROFILE}/use-theme-colors false
dconf write /org/gnome/terminal/legacy/profiles:/:${PROFILE}/foreground-color "'rgb(255,255,255)'"
dconf write /org/gnome/terminal/legacy/profiles:/:${PROFILE}/background-color "'rgb(0,0,0)'"
```

## Setting Up Night Light / Color Temperature

For users sensitive to blue light, the night light feature complements high contrast themes.

```bash
# Enable night light
gsettings set org.gnome.settings-daemon.plugins.color night-light-enabled true

# Set color temperature (1000-6500K, lower = warmer/more orange)
gsettings set org.gnome.settings-daemon.plugins.color night-light-temperature 3000

# Schedule: active from sunset to sunrise
gsettings set org.gnome.settings-daemon.plugins.color night-light-schedule-automatic true

# Or set manual schedule (24-hour format)
gsettings set org.gnome.settings-daemon.plugins.color night-light-schedule-from 18.0
gsettings set org.gnome.settings-daemon.plugins.color night-light-schedule-to 6.0
```

## Saving and Restoring Accessibility Configuration

```bash
# Export all GNOME accessibility settings
dconf dump /org/gnome/desktop/a11y/ > ~/accessibility-settings.dconf
dconf dump /org/gnome/desktop/interface/ >> ~/accessibility-settings.dconf

# Restore settings on another machine or after a reinstall
dconf load /org/gnome/desktop/a11y/ < ~/accessibility-settings.dconf
```

High contrast theming is often most effective when combined with the other accessibility features Ubuntu offers - the screen reader for audio feedback, keyboard navigation for mouse-free operation, and magnification for zooming in on specific areas. Together, these features make Ubuntu Desktop a well-supported platform for users with a wide range of visual needs.

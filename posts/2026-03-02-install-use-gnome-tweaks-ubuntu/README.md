# How to Install and Use GNOME Tweaks on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GNOME, Desktop, Customization

Description: A practical guide to installing GNOME Tweaks on Ubuntu and using it to customize fonts, themes, extensions, keyboard shortcuts, window behavior, and startup applications.

---

GNOME Tweaks is a settings application that exposes configuration options the standard GNOME Settings app intentionally omits. If you have ever wanted to change the system font, enable window minimize/maximize buttons, adjust the mouse pointer speed beyond the default slider, or manage GNOME extensions without a browser plugin, GNOME Tweaks is where you do it.

Ubuntu ships without GNOME Tweaks installed, but adding it takes a single command.

## Installing GNOME Tweaks

```bash
sudo apt update
sudo apt install gnome-tweaks -y
```

Open it from the application menu by searching for "Tweaks" or launch it from the terminal:

```bash
gnome-tweaks
```

On some Ubuntu versions, it appears under the name "GNOME Tweaks" or just "Tweaks" in the app grid.

## Overview of the Main Sections

GNOME Tweaks organizes settings into several categories in the left sidebar. Each section is described below.

## Appearance

This section controls visual themes for three distinct elements:

### Shell Theme

The shell theme controls the GNOME Shell itself - the top bar, notifications, and overview. Changing it requires the User Themes GNOME extension. Install it first:

```bash
sudo apt install gnome-shell-extensions -y
```

Then enable User Themes either from GNOME Tweaks' Extensions section or from the Extensions app.

Popular shell themes like Orchis, WhiteSur, and Colloid can be downloaded from [gnome-look.org](https://www.gnome-look.org/) and extracted to `~/.themes/`.

### Application Theme (GTK Theme)

Controls the appearance of application windows. Ubuntu uses Yaru by default. Third-party themes go in `~/.themes/` or `/usr/share/themes/`:

```bash
# Install theme from package (when available)
sudo apt install gnome-themes-extra

# Or manually install a downloaded theme
mkdir -p ~/.themes
tar xzf Orchis-theme.tar.gz -C ~/.themes/
```

### Icon Theme

Swap the system icon set. Third-party icon themes go in `~/.icons/` or `/usr/share/icons/`:

```bash
mkdir -p ~/.icons
tar xzf Papirus-icon-theme.tar.gz -C ~/.icons/
```

After extracting, the theme appears in the Icons dropdown in GNOME Tweaks.

### Cursor Theme

Change the mouse cursor appearance. Cursor themes follow the same placement as icon themes:

```bash
mkdir -p ~/.icons
# Extract cursor theme
tar xzf Bibata-cursor-theme.tar.gz -C ~/.icons/
```

## Fonts

The Fonts section lets you configure:

- **Interface Text** - the font used in menus, labels, and UI elements
- **Document Text** - font used in document viewers
- **Monospace Text** - the font for terminal emulators and code editors that follow the system setting
- **Legacy Window Titles** - title bar font for non-GNOME applications

### Changing the System Font

To set a different interface font, click the Interface Text button and select a font. Popular readable choices include:

- Noto Sans 11
- Inter 11
- Ubuntu 11 (already the Ubuntu default)

### Font Hinting and Antialiasing

Below the font selectors, adjust rendering quality:

- **Hinting** - controls how fonts align to pixel grid (None, Slight, Medium, Full)
- **Antialiasing** - controls smoothing (None, Subpixel, Standard/Grayscale)

For most LCD monitors, Slight hinting and Subpixel antialiasing produces the sharpest text.

### Scaling Factor

The scaling factor under Fonts adjusts the DPI-independent size of all text. This is separate from the display scaling in GNOME Settings:

- 1.0 is default
- 1.1 or 1.15 makes text slightly larger without full 2x scaling

## Extensions

This section lists all installed GNOME Shell extensions and provides on/off toggles. Extensions can also be configured from here if they have a settings interface.

Common useful extensions:

- **Dash to Dock** - transforms the dock into a macOS-style persistent launcher
- **AppIndicator** - adds system tray icon support for legacy apps
- **GSConnect** - connects Android phones to the GNOME desktop
- **Clipboard Indicator** - clipboard history

Install extensions from the command line or via the Extensions Manager app:

```bash
sudo apt install gnome-shell-extension-manager -y
```

## Keyboard & Mouse

### Keyboard

- **Emacs Input** - enables Emacs-style keybindings globally across GTK apps
- **Overview Shortcut** - change the key that triggers the GNOME Overview (default: Super key)
- **Additional Layout Options** - accesses xkeyboard-config options like Caps Lock behavior (Caps Lock as Ctrl, Swap Ctrl and Caps Lock, etc.)

### Mouse

- **Mouse Speed** - fine-grained control beyond the Settings app
- **Middle Click Paste** - enable/disable X11-style middle-click paste from selection clipboard
- **Natural Scrolling** - independent control for mouse vs touchpad

### Touchpad

- **Secondary Click** - two-finger tap vs bottom right corner
- **Disable While Typing** - prevents accidental touchpad input when using the keyboard

## Window Titlebars

This section provides settings that many users expect to find in the standard Settings app:

### Titlebar Buttons

By default Ubuntu removes the minimize and maximize buttons from window title bars. Re-enable them here:

- Under "Titlebar Buttons", toggle **Minimize** and **Maximize** to On

The placement can also be changed (Left or Right side).

### Double-Click Action

Change what happens when you double-click a window title bar:
- Toggle Maximize (default)
- Minimize
- None

## Windows

- **Center New Windows** - open new windows in the center of the screen rather than at a position determined by the window manager
- **Attach Modal Dialogs** - attaches dialog boxes directly to their parent window title bar
- **Window Focus Mode** - change whether windows raise on click (Click) or just on mouse hover (Sloppy, Mouse)
- **Edge Tiling** - drag windows to screen edges to tile them

## Startup Applications

Manage which applications launch automatically when you log in. Click the `+` button to add entries.

This is equivalent to editing files in `~/.config/autostart/`. GNOME Tweaks just provides a GUI for that directory.

To add a custom startup command:

```bash
# Manually create an autostart entry
cat > ~/.config/autostart/my-app.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=My App
Exec=/usr/local/bin/my-app
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF
```

## Power

- **Suspend When Laptop Lid Is Closed** - override power settings per power source (on battery vs plugged in)

## Backing Up GNOME Settings

GNOME settings including most things configurable in Tweaks are stored in DConf. Export them for backup or transfer:

```bash
# Export all GNOME settings
dconf dump / > ~/gnome-settings-backup.conf

# Restore on the same or a different system
dconf load / < ~/gnome-settings-backup.conf
```

For Tweaks-specific settings:

```bash
# Export just org.gnome namespace
dconf dump /org/gnome/ > ~/gnome-org-settings.conf
```

## Summary

GNOME Tweaks fills the gap between the intentionally simplified GNOME Settings and the full power of the underlying configuration system. The most commonly used features are enabling minimize/maximize buttons, adjusting fonts and rendering, managing extensions, and fine-tuning mouse and touchpad behavior. Once installed, it becomes an essential tool for anyone who spends significant time working within GNOME on Ubuntu.

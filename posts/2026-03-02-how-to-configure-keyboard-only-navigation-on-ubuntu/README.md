# How to Configure Keyboard-Only Navigation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Accessibility, Desktop, GNOME

Description: Configure Ubuntu Desktop for complete keyboard-only navigation, enabling users with motor disabilities or keyboard-preference workflows to access all desktop features without a mouse.

---

Keyboard-only navigation means using the keyboard to accomplish everything you would normally do with a mouse: opening applications, switching windows, clicking buttons, accessing menus, and interacting with files. Ubuntu's GNOME Desktop has comprehensive keyboard navigation support, and with a few configuration adjustments, it can be used fully without a mouse.

## Core GNOME Keyboard Navigation

These shortcuts work out of the box in Ubuntu GNOME Desktop.

### Window and Application Management

```
Super                     - Open Activities overview
Super + A                 - Show all applications
Super + Tab               - Switch between running applications
Super + Shift + Tab       - Switch applications in reverse
Alt + Tab                 - Switch windows (same application groups)
Alt + F4                  - Close the focused window
Alt + F10                 - Maximize/restore window
Super + Up                - Maximize window
Super + Down              - Restore/minimize window
Super + Left/Right        - Tile window to left/right half
Super + H                 - Hide (minimize) window
Super + D                 - Show desktop
```

### Within Applications

```
F10                       - Open application menu bar
Alt + F                   - Open File menu (in most GTK apps)
Alt + underlined letter   - Activate menu item with that letter
Tab                       - Move to next focusable element
Shift + Tab               - Move to previous element
Space / Enter             - Activate selected button/link
Arrow keys                - Navigate within menus, lists, trees
Escape                    - Close menu / cancel dialog
F6                        - Cycle between panes in a window
```

## Enabling Mouse Keys

Mouse Keys lets you control the mouse pointer using the numeric keypad. This is essential for completing actions that have no keyboard equivalent.

```bash
# Enable Mouse Keys via gsettings
gsettings set org.gnome.desktop.a11y.keyboard mousekeys-enable true

# Or enable it from Accessibility settings
# Settings > Accessibility > Pointing & Clicking > Mouse Keys
```

Once enabled:

```
Numpad 2/4/6/8    - Move cursor down/left/right/up
Numpad 7/9/1/3    - Move cursor diagonally
Numpad 5          - Click (left button)
Numpad /          - Select left button
Numpad *          - Select middle button
Numpad -          - Select right button
Numpad 0          - Hold button (for drag operations)
Numpad .          - Release button
Numpad +          - Double-click
```

```bash
# Adjust Mouse Keys speed
gsettings set org.gnome.desktop.a11y.keyboard mousekeys-max-speed 750
gsettings set org.gnome.desktop.a11y.keyboard mousekeys-accel-time 1200
gsettings set org.gnome.desktop.a11y.keyboard mousekeys-init-delay 160
```

## Enabling Sticky Keys and Other Keyboard Aids

### Sticky Keys

Sticky Keys allows modifier keys (Ctrl, Alt, Shift) to be pressed one at a time instead of simultaneously.

```bash
# Enable Sticky Keys
gsettings set org.gnome.desktop.a11y.keyboard stickykeys-enable true

# Configure: lock modifier when pressed twice
gsettings set org.gnome.desktop.a11y.keyboard stickykeys-latch-to-lock true

# Configure: turn off when two keys are pressed simultaneously
gsettings set org.gnome.desktop.a11y.keyboard stickykeys-two-key-off true
```

### Slow Keys

Slow Keys requires keys to be held down for a period before they are accepted, preventing accidental key presses.

```bash
# Enable Slow Keys
gsettings set org.gnome.desktop.a11y.keyboard slowkeys-enable true

# Set delay in milliseconds (default 300ms)
gsettings set org.gnome.desktop.a11y.keyboard slowkeys-delay 300
```

### Bounce Keys

Bounce Keys ignores quickly repeated keypresses (for users with tremors).

```bash
# Enable Bounce Keys
gsettings set org.gnome.desktop.a11y.keyboard bouncekeys-enable true

# Set debounce time in milliseconds
gsettings set org.gnome.desktop.a11y.keyboard bouncekeys-delay 300
```

## GNOME Shell Keyboard Navigation

### Activities Overview Navigation

```
Super                     - Open Activities
Type to search            - Filter applications and files
Arrow keys                - Navigate search results
Enter                     - Launch selected application
```

### Workspace Navigation

```
Super + Page Up/Down      - Switch workspaces
Super + Shift + Page Up/Down  - Move window to another workspace
Super + End               - Switch to last workspace
```

## File Manager (Nautilus) Keyboard Navigation

```
Enter                     - Open file or folder
Alt + Left/Right          - Back/Forward
Alt + Up                  - Go up one directory level
Ctrl + L                  - Focus location bar (type path)
F2                        - Rename selected file
Ctrl + A                  - Select all files
Ctrl + C / V / X          - Copy, paste, cut
Delete                    - Move to trash
Shift + Delete            - Delete permanently
Ctrl + T                  - New tab
Ctrl + W                  - Close tab
Ctrl + H                  - Show hidden files
```

## Terminal Keyboard Shortcuts

```bash
# GNOME Terminal keyboard shortcuts
Ctrl + Alt + T            - Open new terminal window
Ctrl + Shift + T          - Open new tab in terminal
Ctrl + Shift + W          - Close current tab
Ctrl + Shift + N          - New window
Alt + 1-9                 - Switch to tab 1-9
Ctrl + Page Up/Down       - Next/previous tab
Ctrl + Shift + C/V        - Copy/paste in terminal (different from normal Ctrl+C/V)
```

## Setting Up Custom Keyboard Shortcuts

You can add any keyboard shortcut for any command.

### Via GNOME Settings

```
Settings > Keyboard > View and Customize Shortcuts > Custom Shortcuts
Click + to add a new shortcut
```

### Via Command Line

```bash
# List current custom shortcuts
gsettings get org.gnome.settings-daemon.plugins.media-keys custom-keybindings

# Add a custom shortcut to open a specific application
# Step 1: Create the shortcut path (use a unique name)
SHORTCUT_PATH="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/"

gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings \
    "['${SHORTCUT_PATH}']"

# Step 2: Set the shortcut properties
dconf write ${SHORTCUT_PATH}name "'Open Text Editor'"
dconf write ${SHORTCUT_PATH}command "'gedit'"
dconf write ${SHORTCUT_PATH}binding "'<Super>e'"

# Add another shortcut (custom1)
SHORTCUT_PATH2="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom1/"
gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings \
    "['${SHORTCUT_PATH}', '${SHORTCUT_PATH2}']"

dconf write ${SHORTCUT_PATH2}name "'Open Files'"
dconf write ${SHORTCUT_PATH2}command "'nautilus'"
dconf write ${SHORTCUT_PATH2}binding "'<Super>f'"
```

## Keyboard Navigation in Web Browsers

Firefox has excellent keyboard navigation support.

```
F6                        - Cycle between browser components (address bar, tabs, content)
Ctrl + L                  - Focus address bar
Ctrl + T / W              - New tab / close tab
Ctrl + Tab                - Next tab
Ctrl + Shift + Tab        - Previous tab
F7                        - Caret browsing (navigate page with arrow keys)
Tab                       - Move between links and form elements
Space                     - Scroll down
/ or '                    - Quick Find
F5 / Ctrl + R             - Reload
Alt + Left/Right          - Back / Forward
Ctrl + F                  - Find on page
```

## Focus Highlighting for Better Visibility

When using keyboard navigation, it helps to make the focused element clearly visible.

```bash
# Enable Focus mode in GNOME (adds visible indicator around focused element)
# This is controlled via the theme - HighContrast theme has stronger focus rings

# Apply high contrast theme for better focus visibility
gsettings set org.gnome.desktop.interface gtk-theme 'HighContrast'

# Increase cursor blinking speed for better visibility
gsettings set org.gnome.desktop.interface cursor-blink-time 500
gsettings set org.gnome.desktop.interface cursor-blink true
```

## Creating an Accessibility Profile

Save your accessibility configuration as a script for easy reapplication.

```bash
#!/bin/bash
# setup-keyboard-accessibility.sh
# Configure Ubuntu for keyboard-only navigation

echo "Configuring keyboard accessibility..."

# Enable Mouse Keys
gsettings set org.gnome.desktop.a11y.keyboard mousekeys-enable true
gsettings set org.gnome.desktop.a11y.keyboard mousekeys-max-speed 750

# Enable Sticky Keys
gsettings set org.gnome.desktop.a11y.keyboard stickykeys-enable true
gsettings set org.gnome.desktop.a11y.keyboard stickykeys-latch-to-lock true

# Increase cursor size for visibility
gsettings set org.gnome.desktop.interface cursor-size 48

# Larger text
gsettings set org.gnome.desktop.interface text-scaling-factor 1.3

# Enable focus highlighting via high contrast theme
gsettings set org.gnome.desktop.interface gtk-theme 'HighContrast'
gsettings set org.gnome.desktop.interface icon-theme 'HighContrast'

# Add keyboard shortcut for screen reader toggle
# (Orca: Super+Alt+S is the default)

echo "Keyboard accessibility configuration applied."
echo ""
echo "Key shortcuts:"
echo "  Super        - Activities overview"
echo "  Super+A      - All applications"
echo "  Super+Tab    - Switch windows"
echo "  F10          - Application menu"
echo "  Numpad 5     - Mouse click (when Mouse Keys enabled)"
echo "  Insert       - Orca screen reader modifier key"
```

```bash
chmod +x ~/setup-keyboard-accessibility.sh
~/setup-keyboard-accessibility.sh
```

## Exporting and Sharing Configuration

```bash
# Export all accessibility-related gsettings
dconf dump /org/gnome/desktop/a11y/ > ~/a11y-keyboard-config.dconf

# Import on another machine
dconf load /org/gnome/desktop/a11y/ < ~/a11y-keyboard-config.dconf
```

Ubuntu's keyboard navigation support covers the vast majority of desktop interactions without modification. The combination of GNOME's built-in shortcuts, Mouse Keys, Sticky Keys, and per-application keyboard support means that users who cannot or prefer not to use a pointing device can navigate the full desktop environment effectively. Pairing these keyboard features with the Orca screen reader and a high contrast theme creates a comprehensive accessibility setup.

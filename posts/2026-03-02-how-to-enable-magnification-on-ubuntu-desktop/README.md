# How to Enable Magnification on Ubuntu Desktop

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Accessibility, Desktop, GNOME

Description: Learn how to enable and configure desktop magnification on Ubuntu for accessibility, including keyboard shortcuts and zoom settings.

---

Ubuntu's desktop environment includes a built-in screen magnifier that makes content easier to read for users with visual impairments or anyone who simply needs a closer look at their screen. The magnification feature is part of GNOME's accessibility toolkit and requires no third-party software.

## Enabling Magnification via GNOME Settings

The quickest way to turn on magnification is through the Settings application.

1. Open **Settings** from the application menu or by clicking the gear icon in the top-right corner.
2. Navigate to **Accessibility**.
3. Under the **Seeing** section, toggle **Zoom** to the on position.

Once enabled, you can use the default keyboard shortcut `Super + Alt + 8` to toggle zoom on and off. To zoom in, press `Super + Alt + =`, and to zoom out, press `Super + Alt + -`.

## Configuring Magnification with gsettings

For more granular control, use `gsettings` from the terminal. This is especially useful if you want to script the configuration or apply settings across multiple machines.

```bash
# Enable the zoom feature
gsettings set org.gnome.desktop.a11y.applications screen-magnifier-enabled true

# Set the zoom factor (2.0 means 200% zoom)
gsettings set org.gnome.desktop.magnifier mag-factor 2.0

# Check the current zoom factor
gsettings get org.gnome.desktop.magnifier mag-factor
```

### Magnifier Tracking Modes

GNOME's magnifier supports different modes for how the zoomed view follows your cursor or focus.

```bash
# Set mouse tracking mode: 'centered', 'proportional', or 'push'
gsettings set org.gnome.desktop.magnifier mouse-tracking centered

# Enable screen position: 'full-screen', 'top-half', 'bottom-half', 'left-half', 'right-half'
gsettings set org.gnome.desktop.magnifier screen-position full-screen

# Follow the keyboard focus (useful for keyboard-only navigation)
gsettings set org.gnome.desktop.magnifier focus-tracking true
```

The `centered` tracking mode keeps the mouse cursor in the center of the magnified view, which many users find most intuitive. The `push` mode only scrolls the view when the cursor reaches the edge.

## Using the Accessibility Menu

Ubuntu 22.04 and later versions include an accessibility quick-toggle in the top bar. Click the accessibility icon (a person silhouette) and you can toggle zoom from the panel without opening the full Settings application.

If the accessibility icon is not visible, enable it from **Settings > Accessibility > Always Show Accessibility Menu**.

## Configuring Magnification with GNOME Tweaks

GNOME Tweaks gives you access to some additional options not exposed in the default Settings.

```bash
# Install GNOME Tweaks if not already installed
sudo apt install gnome-tweaks
```

Open GNOME Tweaks and navigate to the **Accessibility** tab. From here you can adjust color effects on the magnified view, which can help differentiate the zoomed area from the rest of the screen.

## Cross-Hair and Color Enhancement Options

The magnifier includes optional visual aids that can make it easier to find the cursor and read content.

```bash
# Enable the crosshair (a crosshair shows cursor position in zoomed view)
gsettings set org.gnome.desktop.magnifier show-cross-hairs true

# Set the crosshair color (format: RGBA hex)
gsettings set org.gnome.desktop.magnifier cross-hairs-color '#ff0000ff'

# Set crosshair thickness in pixels
gsettings set org.gnome.desktop.magnifier cross-hairs-thickness 8

# Enable color inversion in the magnified area
gsettings set org.gnome.desktop.magnifier invert-lightness true
```

Color inversion is particularly useful in bright environments or for users with certain visual conditions. It inverts the lightness of colors while preserving hue, making white backgrounds dark and text bright.

## Adjusting Contrast and Brightness

GNOME's magnifier also allows you to adjust brightness and contrast in the zoomed view independently of the rest of the display.

```bash
# Increase brightness slightly (range: -1.0 to 1.0, default 0.0)
gsettings set org.gnome.desktop.magnifier brightness-red 0.1
gsettings set org.gnome.desktop.magnifier brightness-green 0.1
gsettings set org.gnome.desktop.magnifier brightness-blue 0.1

# Increase contrast (range: -1.0 to 1.0, default 0.0)
gsettings set org.gnome.desktop.magnifier contrast-red 0.5
gsettings set org.gnome.desktop.magnifier contrast-green 0.5
gsettings set org.gnome.desktop.magnifier contrast-blue 0.5
```

## Keyboard Shortcuts Summary

| Action | Shortcut |
|---|---|
| Toggle zoom | Super + Alt + 8 |
| Zoom in | Super + Alt + = |
| Zoom out | Super + Alt + - |

These shortcuts are active whenever the magnifier is installed, regardless of whether zoom is currently active.

## Using wmagnify for a Lightweight Alternative

For server environments with a desktop or minimal installs, `wmagnify` offers a simpler magnification tool.

```bash
# Install wmagnify
sudo apt install wmagnify

# Launch it - it creates a magnification window you can position
wmagnify &
```

This is a standalone application that shows a magnified view of the area under your mouse. It does not integrate with the system zoom, but it works well on minimal desktop setups.

## Scripting Magnification for Accessibility Profiles

If you manage multiple accessibility profiles for different users, you can script the full configuration.

```bash
#!/bin/bash
# setup-magnification.sh - Apply magnification settings for a user

# Enable magnification
gsettings set org.gnome.desktop.a11y.applications screen-magnifier-enabled true

# Set a comfortable zoom level
gsettings set org.gnome.desktop.magnifier mag-factor 1.5

# Center tracking for smooth experience
gsettings set org.gnome.desktop.magnifier mouse-tracking centered

# Full screen magnification
gsettings set org.gnome.desktop.magnifier screen-position full-screen

# Enable crosshair for easier cursor tracking
gsettings set org.gnome.desktop.magnifier show-cross-hairs true

echo "Magnification configured successfully."
```

Run this script as the target user to apply all settings at once. Settings stored via `gsettings` are per-user and persist across reboots.

## Troubleshooting

If the keyboard shortcuts do not respond, check that the accessibility features are enabled at the system level. Some GNOME Shell extensions or custom keyboard shortcut mappings can conflict with the default accessibility shortcuts.

```bash
# Verify the current state of magnifier settings
gsettings list-recursively org.gnome.desktop.magnifier

# Reset magnifier settings to defaults if something seems wrong
gsettings reset-recursively org.gnome.desktop.magnifier
```

Ubuntu's built-in magnification tools are robust enough for most use cases and require no additional hardware or proprietary drivers. Combined with other accessibility features like high-contrast themes and large text, they provide a solid foundation for an accessible desktop environment.

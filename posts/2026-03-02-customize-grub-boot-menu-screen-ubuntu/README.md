# How to Customize the GRUB Boot Menu Screen on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GRUB, Boot, Customization, System

Description: Customize the GRUB bootloader on Ubuntu by changing the background, colors, timeout, menu entries, resolution, and applying themes for a polished boot screen.

---

The GRUB bootloader is the first thing displayed when you power on an Ubuntu system. By default it shows a plain black screen with white text listing boot entries. With some configuration, you can add a custom background image, change colors and fonts, adjust the timeout, hide the menu for single-boot systems, or apply a complete GRUB theme with styled menus and progress bars.

All GRUB configuration flows through `/etc/default/grub` for the main settings, and the `/etc/grub.d/` directory for scripts that generate the actual GRUB menu. After making changes, you always run `update-grub` to apply them.

## Understanding the GRUB Configuration

The primary configuration file is `/etc/default/grub`. Changes here control GRUB behavior but do not take effect until you run `update-grub`:

```bash
sudo nano /etc/default/grub
```

The default file looks like:

```bash
GRUB_DEFAULT=0
GRUB_TIMEOUT_STYLE=hidden
GRUB_TIMEOUT=0
GRUB_DISTRIBUTOR=`lsb_release -i -s 2>/dev/null || echo Debian`
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"
GRUB_CMDLINE_LINUX=""
```

After any change:

```bash
sudo update-grub
```

## Adjusting the Boot Timeout

By default Ubuntu hides the GRUB menu and boots immediately. To show the menu:

```bash
# In /etc/default/grub

# Show the menu instead of hiding it
GRUB_TIMEOUT_STYLE=menu

# Show for 5 seconds before auto-booting default entry
GRUB_TIMEOUT=5
```

If you want no timeout (wait indefinitely for user input):

```bash
GRUB_TIMEOUT=-1
```

Setting `GRUB_TIMEOUT_STYLE=countdown` shows the menu with a countdown timer:

```bash
GRUB_TIMEOUT_STYLE=countdown
GRUB_TIMEOUT=10
```

Apply:

```bash
sudo update-grub
```

## Changing the Default Boot Entry

`GRUB_DEFAULT` accepts an index (0-based) or a specific menu entry name:

```bash
# Boot the first entry (default)
GRUB_DEFAULT=0

# Boot the second entry (e.g., recovery mode)
GRUB_DEFAULT=1

# Boot by entry name (more reliable across kernel updates)
GRUB_DEFAULT="Advanced options for Ubuntu>Ubuntu, with Linux 6.8.0-generic"
```

To always boot the last selected entry:

```bash
GRUB_DEFAULT=saved
GRUB_SAVEDEFAULT=true
```

With this setting, GRUB remembers which entry you last chose and boots it next time.

## Setting a Custom Background Image

GRUB supports background images in PNG, JPEG, or TGA format.

### Prepare the Image

The image should match or be close to your screen resolution. Find your GRUB resolution:

```bash
# Check available resolutions
sudo grep -r "GRUB_GFXMODE" /etc/default/grub
```

Set a resolution explicitly:

```bash
# In /etc/default/grub
GRUB_GFXMODE=1920x1080x32
GRUB_GFXPAYLOAD_LINUX=keep
```

### Install the Background

```bash
# Copy the image to a standard location
sudo cp ~/Downloads/my-background.png /boot/grub/

# Enable it in the configuration
sudo nano /etc/default/grub
```

Add or modify:

```bash
GRUB_BACKGROUND="/boot/grub/my-background.png"
```

Apply:

```bash
sudo update-grub
```

GRUB automatically picks up the background during the next boot.

## Customizing Colors and Text

GRUB color settings are configured through `/etc/grub.d/05_debian_theme` or directly in a custom script. The simpler approach for color overrides is adding a script to `/etc/grub.d/`:

```bash
sudo nano /etc/grub.d/40_custom
```

Add color settings (these go into the generated GRUB configuration):

```bash
#!/bin/sh
exec tail -n +3 $0
# This file provides an easy way to add custom menu entries.
# Simply type the menu entries you want to add after this comment.

# Set menu colors
# Format: color_normal, color_highlight
# Colors: black, blue, green, cyan, red, magenta, brown, light-gray,
#         dark-gray, light-blue, light-green, light-cyan, light-red,
#         light-magenta, yellow, white
set color_normal=light-gray/black
set color_highlight=white/dark-gray
set menu_color_normal=light-gray/black
set menu_color_highlight=white/blue
```

## Applying a Complete GRUB Theme

For a polished look, install a pre-made GRUB theme. Grub-themes available in common repositories include Vimix, Sleek, and Poly.

### Installing the Vimix GRUB Theme

```bash
# Clone the theme repository
git clone https://github.com/vinceliuice/grub2-themes.git
cd grub2-themes

# Install a specific theme (options: Vimix, Tela, Stylish, WhiteSur)
sudo ./install.sh -t vimix -s 1080p
```

The installer copies theme files to `/boot/grub/themes/` and updates `/etc/default/grub`.

### Manual Theme Installation

Download a theme from [gnome-look.org](https://www.gnome-look.org/) under the GRUB Themes category, then:

```bash
# Create themes directory if needed
sudo mkdir -p /boot/grub/themes

# Extract theme to themes directory
sudo unzip mytheme.zip -d /boot/grub/themes/

# Set the theme in /etc/default/grub
sudo nano /etc/default/grub
```

Add:

```bash
GRUB_THEME="/boot/grub/themes/mytheme/theme.txt"
```

Apply:

```bash
sudo update-grub
```

## Adding Custom Boot Entries

Add custom menu entries to `/etc/grub.d/40_custom`. This file is preserved across `update-grub` runs:

```bash
sudo nano /etc/grub.d/40_custom
```

Example - add a shutdown entry to the GRUB menu:

```bash
#!/bin/sh
exec tail -n +3 $0

menuentry "System Shutdown" {
    halt
}

menuentry "System Restart" {
    reboot
}

menuentry "Boot from USB" {
    # Boot from first USB device
    set root=(hd1)
    chainloader +1
}
```

Make the script executable if it is not already:

```bash
sudo chmod +x /etc/grub.d/40_custom
sudo update-grub
```

## Changing the GRUB Font

GRUB uses its own font format (PF2). Convert a system font to GRUB format:

```bash
# List available fonts
ls /usr/share/fonts/truetype/ubuntu/

# Convert Ubuntu Mono to GRUB format at size 18
sudo grub-mkfont -s 18 -o /boot/grub/fonts/ubuntu-mono-18.pf2 \
  /usr/share/fonts/truetype/ubuntu/UbuntuMono-R.ttf
```

Set the font in `/etc/default/grub`:

```bash
GRUB_FONT="/boot/grub/fonts/ubuntu-mono-18.pf2"
```

Apply:

```bash
sudo update-grub
```

## Hiding GRUB on Single-Boot Systems

If Ubuntu is the only OS and you do not need recovery access from the boot menu, hide GRUB completely for faster boots:

```bash
# In /etc/default/grub:
GRUB_TIMEOUT_STYLE=hidden
GRUB_TIMEOUT=0
```

You can still access the GRUB menu by holding `Shift` during boot (BIOS) or `Escape` (UEFI).

## Recovering from Broken GRUB Configuration

If a GRUB configuration change breaks booting:

1. Boot from Ubuntu live USB
2. Mount the system partition:
   ```bash
   sudo mount /dev/sda2 /mnt
   sudo mount --bind /dev /mnt/dev
   sudo mount --bind /proc /mnt/proc
   sudo mount --bind /sys /mnt/sys
   ```
3. Chroot into the system:
   ```bash
   sudo chroot /mnt
   ```
4. Revert the bad configuration:
   ```bash
   nano /etc/default/grub
   update-grub
   ```
5. Exit and reboot.

Always test configuration changes on a non-production system first. Keeping a note of the original `/etc/default/grub` contents before making changes is good practice.

## Summary

GRUB customization on Ubuntu ranges from simple timeout and background changes to complete visual themes with custom fonts and menu entries. All changes route through `/etc/default/grub` for settings and `/etc/grub.d/40_custom` for menu entries, with `update-grub` required to apply them. For a quick visual upgrade, install one of the popular GRUB themes from GitHub. For operational control, adjust the timeout style and default boot entry to match your workflow.

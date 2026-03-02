# How to Configure Fonts for International Characters on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Fonts, Localization, Unicode, Desktop

Description: How to install and configure fonts for international character sets on Ubuntu, covering Unicode coverage, font fallback, and per-application settings.

---

When you work with multiple languages or receive text in scripts you do not have fonts for, Ubuntu displays placeholder boxes (often called "tofu") instead of the actual characters. Fixing this means installing the right fonts and configuring font fallback so the system knows which font to use for each Unicode range. This guide covers font installation, fontconfig configuration, and per-application tweaks.

## Understanding Font Coverage

Unicode defines over 140,000 characters across hundreds of scripts. No single font covers all of them, so the operating system uses a fallback chain: it tries fonts in order until it finds one that has the required glyph. The `fontconfig` library manages this process on Linux.

```bash
# Check which font will be used to render a specific Unicode character
# 0x4e2d = Chinese character "中"
fc-match --format='%{family}: %{file}\n' :charset=4e2d

# Check coverage for Arabic (0627 = Alef)
fc-match --format='%{family}: %{file}\n' :charset=0627

# Check coverage for Hebrew (05d0 = Alef)
fc-match --format='%{family}: %{file}\n' :charset=05d0
```

## Installing the Noto Font Family

Google's Noto ("No Tofu") family is the most comprehensive collection of Unicode fonts available. It aims to support every script defined in Unicode.

```bash
# Install the core Noto fonts
sudo apt install fonts-noto

# Install extra Noto fonts (less common scripts)
sudo apt install fonts-noto-extra

# Install CJK Noto fonts (large download - Chinese, Japanese, Korean)
sudo apt install fonts-noto-cjk

# Install color emoji font
sudo apt install fonts-noto-color-emoji

# Rebuild the font cache after installation
fc-cache -fv
```

After installing `fonts-noto` and `fonts-noto-cjk`, you will have coverage for the vast majority of Unicode scripts.

## Installing Script-Specific Font Packages

For situations where you need a specific font with particular rendering characteristics.

```bash
# Arabic
sudo apt install fonts-arabeyes fonts-sil-scheherazade fonts-hosny-amiri

# Hebrew
sudo apt install fonts-culmus fonts-sil-ezra

# Devanagari (Hindi, Sanskrit, Nepali, Marathi)
sudo apt install fonts-lohit-deva fonts-gargi

# Tamil
sudo apt install fonts-lohit-taml fonts-samyak-taml

# Bengali
sudo apt install fonts-lohit-beng-assamese fonts-lohit-beng-bengali

# Thai
sudo apt install fonts-thai-tlwg

# Tibetan
sudo apt install fonts-tibetan-machine

# Sinhala
sudo apt install fonts-lklug-sinhala

# Georgian
sudo apt install fonts-dzongkha fonts-sil-padauk

# Armenian
sudo apt install fonts-freefont-ttf

# Ethiopic (Amharic, Tigrinya)
sudo apt install fonts-abyssinica
```

## Listing Installed Fonts

```bash
# List all installed font families
fc-list | sort

# List fonts supporting a specific language
fc-list :lang=ar   # Arabic
fc-list :lang=zh   # Chinese
fc-list :lang=ja   # Japanese
fc-list :lang=ko   # Korean
fc-list :lang=hi   # Hindi

# List fonts supporting a Unicode range
fc-list :charset=0900-097F  # Devanagari block
```

## Configuring Font Fallback with fontconfig

Fontconfig uses XML configuration files to define font priorities and fallback chains. The system-wide configuration is in `/etc/fonts/`, and per-user configuration is in `~/.config/fontconfig/`.

```bash
# View the fontconfig include directories
fc-config --list

# View effective configuration for a query
fc-match --sort serif | head -20
```

To define a custom fallback, create a user configuration file.

```bash
mkdir -p ~/.config/fontconfig
```

```xml
<!-- ~/.config/fontconfig/fonts.conf -->
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>

  <!-- Prefer Noto fonts for CJK characters -->
  <match>
    <test name="lang" compare="contains">
      <string>zh</string>
    </test>
    <edit name="family" mode="prepend">
      <string>Noto Sans CJK SC</string>
    </edit>
  </match>

  <!-- Use Scheherazade for Arabic -->
  <match>
    <test name="lang" compare="contains">
      <string>ar</string>
    </test>
    <edit name="family" mode="prepend">
      <string>Scheherazade New</string>
    </edit>
  </match>

  <!-- Add Noto Sans as a general fallback for unmatched scripts -->
  <match>
    <test name="family">
      <string>sans-serif</string>
    </test>
    <edit name="family" mode="append_last">
      <string>Noto Sans</string>
    </edit>
  </match>

</fontconfig>
```

After saving the file, rebuild the font cache.

```bash
fc-cache -fv
```

## Setting System-Wide Default Fonts

GNOME uses a separate setting for the interface font. To change it for all users, modify the GSettings schema or use the GNOME Settings application.

```bash
# View current font settings
gsettings get org.gnome.desktop.interface font-name
gsettings get org.gnome.desktop.interface monospace-font-name
gsettings get org.gnome.desktop.interface document-font-name

# Set a font with good Unicode coverage for the interface
gsettings set org.gnome.desktop.interface font-name 'Noto Sans 11'

# Set monospace font (used in terminals and code editors)
gsettings set org.gnome.desktop.interface monospace-font-name 'Noto Mono 11'
```

## Verifying Font Rendering

```bash
# Install fonttools for font inspection
sudo apt install fonttools

# List Unicode blocks covered by a font file
pyftsubset --help  # shows fonttools is working

# Use fc-query to inspect a font file
fc-query /usr/share/fonts/truetype/noto/NotoSans-Regular.ttf | grep -A5 "charset"
```

## Configuring Fonts in Applications

### Firefox

Firefox uses fontconfig for fallback but also allows per-language font preferences.

1. Go to **Preferences > Fonts & Colors > Advanced**.
2. Select the script from the **Fonts for:** dropdown.
3. Set your preferred proportional and monospace fonts for that script.

### LibreOffice

LibreOffice respects fontconfig for fallback but you can also set script-specific defaults.

1. **Tools > Options > LibreOffice > Fonts**.
2. Set replacement fonts for specific typefaces.
3. For CTL (Complex Text Layout) scripts, go to **Language Settings > Languages** and set the CTL font.

### Terminal (GNOME Terminal)

```bash
# Set a monospace font with wide Unicode coverage
# GNOME Terminal > Edit > Preferences > Profile > Text > Custom Font
# Choose "Noto Mono" or "DejaVu Sans Mono" (both have good coverage)

# For even wider coverage in terminal, use "Symbols Noto Color Emoji"
sudo apt install fonts-noto-color-emoji
```

## Checking for Missing Glyphs

```bash
# Test if a font has a specific character
python3 -c "
from fontTools.ttLib import TTFont
font = TTFont('/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf')
cmap = font.getBestCmap()
# Check for Arabic Alef (U+0627)
print('Arabic Alef present:', 0x0627 in cmap)
# Check for CJK character (U+4E2D)
print('CJK middle present:', 0x4e2d in cmap)
"
```

## Handling Emoji Display

Emoji rendering requires a color emoji font. Ubuntu 22.04+ includes this by default, but if you are on a minimal install:

```bash
# Install color emoji support
sudo apt install fonts-noto-color-emoji

# For older systems or fallback, install the emoji font
sudo apt install fonts-emojione

# Rebuild font cache
fc-cache -fv
```

For emoji to display in terminals, the terminal emulator must support color fonts. GNOME Terminal supports this natively. If you use a different terminal, check its documentation for emoji support.

Having comprehensive font coverage ensures that international text displays correctly across all applications, from web browsers to office suites to command-line tools.

# How to Set Up Right-to-Left Language Support on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Localization, RTL, Accessibility, Keyboard

Description: Configure right-to-left language support on Ubuntu for Arabic, Hebrew, Persian, and Urdu, including keyboard layouts, fonts, and application settings.

---

Right-to-left (RTL) languages - Arabic, Hebrew, Persian (Farsi), Urdu, and a few others - require specific configuration beyond a standard keyboard layout switch. Text rendering must flow from right to left, fonts must support the script, and applications need to handle bidirectional text correctly. Ubuntu's infrastructure supports all of this, but you need to set it up properly.

## Installing the Language Pack

Start by installing the language pack for your target language. Language packs include locale data, translated UI strings, and input method support.

```bash
# Install Arabic language support
sudo apt install language-pack-ar language-pack-ar-base

# Install Hebrew language support
sudo apt install language-pack-he language-pack-he-base

# Install Persian (Farsi) language support
sudo apt install language-pack-fa language-pack-fa-base

# Install Urdu language support
sudo apt install language-pack-ur language-pack-ur-base

# Update locale definitions after installation
sudo locale-gen
```

Alternatively, open **Settings > Region & Language** and click **Manage Installed Languages**. Ubuntu will prompt you to install the complete language support package.

## Adding the Keyboard Layout

```bash
# List available Arabic keyboard layouts
localectl list-x11-keymap-variants ara

# Add Arabic keyboard layout via gsettings (adds to existing layouts)
gsettings set org.gnome.desktop.input-sources sources \
  "[('xkb', 'us'), ('xkb', 'ara')]"

# Add Hebrew layout
gsettings set org.gnome.desktop.input-sources sources \
  "[('xkb', 'us'), ('xkb', 'il')]"

# Add Persian layout (Farsi)
gsettings set org.gnome.desktop.input-sources sources \
  "[('xkb', 'us'), ('xkb', 'ir')]"
```

After setting this, `Super + Space` toggles between layouts. The language indicator in the top bar shows the active layout.

## Installing RTL Fonts

Proper rendering requires fonts that include the full character set for RTL scripts.

```bash
# Install Noto fonts with comprehensive RTL support
sudo apt install fonts-noto fonts-noto-extra

# Arabic-specific fonts
sudo apt install fonts-arabeyes fonts-sil-scheherazade

# Hebrew fonts
sudo apt install fonts-hosny-amiri fonts-culmus

# Persian fonts
sudo apt install fonts-farsiweb

# Urdu fonts
sudo apt install fonts-nafees fonts-hosny-thabit

# Rebuild the font cache
fc-cache -fv

# Verify fonts are available
fc-list | grep -i arabic
fc-list | grep -i hebrew
```

## Configuring Locale for RTL

Setting the system locale to an RTL language affects the default text direction for applications that respect locale settings.

```bash
# Check current locale
locale

# Generate the Arabic (Egypt) locale
sudo locale-gen ar_EG.UTF-8

# Set Arabic as the system locale (be careful - this affects all users)
sudo update-locale LANG=ar_EG.UTF-8

# For per-user locale, add to ~/.profile
echo 'export LANG=ar_EG.UTF-8' >> ~/.profile
```

If you set an RTL locale system-wide, the GNOME desktop interface will switch to RTL mode on the next login.

## Testing RTL Text in a Text Editor

```bash
# Open gedit to test RTL input
gedit &
```

After switching to an Arabic or Hebrew keyboard layout with `Super + Space`, type in the text editor. The text should flow right-to-left automatically. In gedit, you can also set the text direction explicitly from the **View > Text Direction** menu.

## Enabling Bidirectional Text in Terminal

The default Ubuntu terminal emulator handles bidirectional text reasonably well, but you may need to configure it.

```bash
# Check if bidi support is available in your terminal
# In GNOME Terminal: Edit > Preferences > Text > Enable Bidirectional Text

# For command-line tools that may display RTL text, install fribidi
sudo apt install libfribidi-bin

# Test bidirectional text rendering
echo "Hello مرحبا World" | fribidi --charset UTF-8
```

## Configuring Firefox for RTL

Firefox handles RTL content natively, but if the interface language should be RTL, install the RTL language pack.

```bash
# Install Firefox Arabic language pack
sudo apt install firefox-locale-ar

# Install Firefox Hebrew language pack
sudo apt install firefox-locale-he
```

After installation, go to Firefox **Preferences > General > Language** and set your preferred language. Firefox's interface will switch to RTL automatically for supported languages.

## LibreOffice RTL Configuration

LibreOffice requires enabling CTL (Complex Text Layout) support for proper RTL input and rendering.

```bash
# Open LibreOffice Writer configuration
# Tools > Options > Language Settings > Languages
# Check "Enabled for complex text layout (CTL)"
# Set "CTL language" to Arabic, Hebrew, or Persian
```

From the command line, you can pre-set this in the configuration:

```bash
# LibreOffice stores config in ~/.config/libreoffice/
# Create a macro or modify registrymodifications.xcu
# It's easier to set it via the GUI the first time
```

Once CTL is enabled, LibreOffice Writer shows a text direction button in the toolbar. You can toggle paragraph direction with `Ctrl+Shift+D` (RTL) and `Ctrl+Shift+E` (LTR) when using LibreOffice.

## Setting Up IBus for Arabic Input

For Arabic, the standard keyboard layout (xkb) is usually sufficient. But for more advanced input features like automatic vowel diacritics (tashkeel), an IBus engine can help.

```bash
# Install IBus for Arabic
sudo apt install ibus-table-arabic

# Or use the m17n (multilingualization) library which supports many RTL scripts
sudo apt install ibus-m17n m17n-lib-mimx
```

## Configuring Pango for RTL Rendering

Pango is the text rendering library used by GTK applications. It handles RTL and bidirectional text automatically when the locale is set correctly. If you see garbled RTL text, check that Pango and its language modules are installed.

```bash
# Install Pango and language modules
sudo apt install libpango-1.0-0 libpangocairo-1.0-0

# Check Pango version
pango-view --version

# Test Pango RTL rendering (creates a test image)
pango-view --font="Scheherazade 20" --text="مرحبا بالعالم" -o /tmp/rtl-test.png
```

## Switching the GNOME Interface to RTL

If you want the entire GNOME desktop to use RTL layout (menus, panels, window decorations all mirrored), set your session language to an RTL language.

1. Open **Settings > Region & Language**.
2. Under **Language**, select Arabic, Hebrew, or Persian.
3. Click **Restart** when prompted.

After restart, GNOME's interface mirrors horizontally. The top bar, application menus, and window controls all follow RTL conventions.

## Troubleshooting RTL Display

### Text Appears as Boxes or Question Marks

This typically means the required font is missing.

```bash
# Find which font covers a specific Unicode character
fc-match --format='%{family}\n' :charset=0627  # 0627 = Arabic letter Alef
```

### Mixed LTR/RTL Text Not Rendering Correctly

Enable Unicode bidirectional algorithm support in the application. Most modern GTK and Qt apps support this natively. For terminal output, use `fribidi` to pre-process the text.

```bash
echo "File: ملف.txt created" | fribidi
```

RTL language support on Ubuntu is mature and handles all major RTL scripts. The main prerequisites are the correct font packages, keyboard layout, and locale settings.

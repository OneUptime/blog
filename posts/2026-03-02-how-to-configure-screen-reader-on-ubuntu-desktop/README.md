# How to Configure Screen Reader on Ubuntu Desktop

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Accessibility, Desktop, GNOME

Description: Configure and use Orca screen reader on Ubuntu Desktop to enable text-to-speech for visually impaired users, including setup, keyboard navigation, and customization options.

---

Ubuntu Desktop includes Orca, a free and open-source screen reader developed by the GNOME project. Orca reads aloud the content of the screen using text-to-speech and enables refreshable braille display support. It is a full-featured accessibility tool that lets visually impaired users interact with the entire desktop environment, applications, and the web.

## Enabling Orca Screen Reader

### Via Accessibility Settings

The quickest way to enable Orca is through the GNOME Settings panel.

1. Open the Activities overview and search for "Accessibility"
2. Click on Accessibility settings
3. Toggle "Screen Reader" to On

Or from the command line:

```bash
# Enable the screen reader via GNOME settings

gsettings set org.gnome.desktop.a11y.applications screen-reader-enabled true

# Start Orca immediately
orca &

# Verify it is running
pgrep -la orca
```

### Keyboard Shortcut

The default keyboard shortcut to toggle the screen reader on and off:

```text
Super + Alt + S
```

This shortcut works from anywhere in the GNOME desktop.

## Installing and Updating Orca

Ubuntu Desktop includes Orca by default. If it is missing or you want a newer version:

```bash
# Install or reinstall Orca
sudo apt update
sudo apt install orca -y

# Also install speech-dispatcher and espeak for text-to-speech
sudo apt install speech-dispatcher espeak-ng -y

# Install Python accessibility libraries Orca depends on
sudo apt install python3-pyatspi -y

# Check Orca version
orca --version
```

## Opening the Orca Preferences

```bash
# Open Orca preferences GUI
orca --setup

# Or press Orca+space (Orca modifier is Insert by default)
# while Orca is running
```

The Orca key (also called the Orca modifier) is the Insert key on most keyboards. On laptops without a dedicated Insert key, it is often Caps Lock. You can change this in preferences.

## Key Orca Keyboard Commands

Orca uses a combination of the Orca modifier key and other keys.

```text
Orca + H          - Enter Learn Mode
F2                - List Orca-wide shortcuts while in Learn Mode
F3                - List application-specific shortcuts while in Learn Mode
Esc               - Exit Learn Mode

Navigation:
Tab               - Move to next focusable element
Shift+Tab         - Move to previous focusable element
Arrow keys        - Navigate within elements
H / Shift+H       - Next/previous heading in supported documents
K / Shift+K       - Next/previous link in supported documents
E / Shift+E       - Next/previous entry field in supported documents
P / Shift+P       - Next/previous paragraph in supported documents

Reading:
KP 8              - Read current line (Desktop layout)
KP 5              - Read current word (Desktop layout)
KP 2              - Read current character (Desktop layout)
Orca + I          - Read current line (Laptop layout)
Orca + K          - Read current word (Laptop layout)
Orca + Comma      - Read current character (Laptop layout)
KP Plus           - Say All from current position (Desktop layout)
Orca + Semicolon  - Say All from current position (Laptop layout)

Miscellaneous:
Orca + Space      - Open Orca Preferences
Orca + S          - Toggle speech
Orca + V          - Toggle between brief and verbose speech
Orca + F11        - Toggle between cell and row reading in a table
```

## Configuring Speech Settings

Orca uses Speech Dispatcher as its speech backend.

```bash
# Test speech dispatcher
spd-say "Hello, this is a test of speech dispatcher"

# Configure speech dispatcher settings
nano ~/.config/speech-dispatcher/speechd.conf
```

In the Orca Preferences dialog (Orca+space), under the Speech tab:

- **Speech system**: Speech Dispatcher (default)
- **Speech synthesizer**: depends on the Speech Dispatcher modules installed; eSpeak NG, Festival, and others may be available
- **Voice**: choose from available voices for your language
- **Rate**: adjust speaking rate
- **Pitch**: adjust pitch
- **Volume**: adjust volume

### Installing Additional Voices

```bash
# Install additional espeak-ng voices
sudo apt install espeak-ng-data -y

# Install Festival with additional voices
sudo apt install festival festvox-kallpc16k -y

# Install MaryTTS (higher quality, Java-based)
# Or use a cloud-based TTS (requires internet and configuration)

# List available espeak-ng voices
espeak-ng --voices | head -20

# Test a specific voice
espeak-ng -v en-us+m1 "Testing this voice"
```

## Setting Up Orca for Specific Applications

### Web Browsing with Firefox

Firefox has excellent accessibility support with Orca.

```bash
# Ensure Firefox is installed
sudo apt install firefox -y

# Firefox accessibility tips with Orca:
# - Orca + A to toggle between Browse and Focus modes
# - H key (in Browse mode) to jump between headings
# - K key to jump between links
# - E key to jump between edit fields
# - Orca + Z to enable or disable structural navigation keys
```

### Terminal Access

Orca works with GNOME Terminal for command-line access.

```bash
# Open GNOME Terminal
# Orca reads output automatically

# Key shortcuts in terminal with Orca:
# KP 1 / KP 3     - read previous/next character (Desktop layout)
# KP 4 / KP 6     - read previous/next word (Desktop layout)
# KP Plus         - read all output from the current position (Desktop layout)
# Orca + M / Orca + Period - read previous/next character (Laptop layout)
# Orca + J / Orca + L      - read previous/next word (Laptop layout)
# Orca + Semicolon         - read all output from the current position (Laptop layout)
```

## Configuring Autostart

To have Orca start automatically when you log in:

```bash
# Method 1: GNOME autostart (preferred)
mkdir -p ~/.config/autostart

cat > ~/.config/autostart/orca.desktop << 'EOF'
[Desktop Entry]
Name=Orca Screen Reader
Comment=Assistive technology screen reader
Exec=orca
Icon=orca
Type=Application
X-GNOME-Autostart-enabled=true
X-GNOME-AutoRestart=false
X-GNOME-Autostart-Delay=2
EOF

# Method 2: via gsettings (same as the Settings UI toggle)
gsettings set org.gnome.desktop.a11y.applications screen-reader-enabled true
```

## Using Braille Displays

Orca supports refreshable braille displays through BrlAPI.

```bash
# Install brltty (Braille TTY daemon)
sudo apt install brltty -y

# View supported braille driver codes
brltty --help

# Configure brltty for your device
sudo nano /etc/brltty.conf
# Set: braille-driver (your device driver)
# Set: braille-device (usually USB: or Bluetooth:)

# Start brltty
sudo systemctl enable --now brltty

# In Orca Preferences > Braille tab:
# Enable "Enable Braille"
# Choose Contracted or Computer Braille as appropriate
```

## Adjusting Verbosity

Orca's verbosity level controls how much information is spoken, such as object roles, states, and related context.

```text
Orca + V

Or use the Orca Preferences dialog > Speech tab > Verbosity
```

## Magnification with GNOME

GNOME provides a built-in screen magnifier separately from Orca.

```bash
# Enable GNOME magnification
gsettings set org.gnome.desktop.a11y.applications screen-magnifier-enabled true

# Set the magnification factor
gsettings set org.gnome.desktop.a11y.magnifier mag-factor 2.0

# Toggle magnifier with keyboard shortcut
# Super + Alt + 8 (default)
```

## Troubleshooting Common Issues

```bash
# Orca not speaking: check speech dispatcher
systemctl --user status speech-dispatcher
systemctl --user restart speech-dispatcher

# Test speech dispatcher directly
spd-say "Testing speech dispatcher"

# Check Orca logs for errors
cat ~/.local/share/orca/orca.log | tail -50

# Reset Orca settings to defaults
rm -rf ~/.local/share/orca
orca --setup  # reconfigure from scratch

# Check AT-SPI registry (required for accessibility)
systemctl --user status at-spi-dbus-bus

# Restart accessibility support
pkill -f at-spi
/usr/lib/at-spi2-core/at-spi-bus-launcher &
```

## Command-Line Testing Without a Display

If you need to verify accessibility infrastructure is working:

```bash
# List accessible applications
python3 -c "
import pyatspi
desktop = pyatspi.Registry.getDesktop(0)
for app in desktop:
    print(f'  App: {app.name}')
"

# Check AT-SPI2 is running
ps aux | grep at-spi
```

Orca is a mature, capable screen reader that integrates deeply with GNOME applications. Combined with keyboard navigation shortcuts and Firefox's accessibility features, visually impaired users can fully navigate the Ubuntu Desktop environment, browse the web, and use productivity applications without requiring mouse interaction.

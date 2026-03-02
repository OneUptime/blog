# How to Configure Screen Reader on Ubuntu Desktop

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Accessibility, Desktop, GNOME

Description: Configure and use Orca screen reader on Ubuntu Desktop to enable text-to-speech for visually impaired users, including setup, keyboard navigation, and customization options.

---

Ubuntu Desktop includes Orca, a free and open-source screen reader developed by the GNOME project. Orca reads aloud the content of the screen using text-to-speech, enables refreshable braille display support, and provides magnification. It is a full-featured accessibility tool that lets visually impaired users interact with the entire desktop environment, applications, and the web.

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

```
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

```
Orca + F2         - List keyboard shortcuts
Orca + F1         - Orca help
Orca + F3         - Next element in Find
Orca + F4         - Toggle flat review mode
Orca + F7         - Move to previous paragraph
Orca + F8         - Move to next paragraph

Navigation:
Tab               - Move to next focusable element
Shift+Tab         - Move to previous focusable element
Arrow keys        - Navigate within elements
Orca + Left/Right - Move by word
Orca + Up/Down    - Move by sentence/paragraph

Reading:
Orca + H          - Read the window title
Orca + A          - Read from current position to end
Orca + S          - Read current line
Orca + W          - Read current word
Orca + L          - Read current character

Miscellaneous:
Orca + Tab        - List all items in a container
Orca + backslash  - Toggle speech (silence/resume)
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
- **Speech synthesizer**: espeak-ng is the default; eSpeak, Festival, and others are available
- **Voice**: choose from available voices for your language
- **Rate**: adjust speaking rate (100 = normal)
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
# - Orca + F for Find mode (search page text by typing)
# - Orca + t to toggle between Browse and Focus modes
# - H key (in Browse mode) to jump between headings
# - K key to jump between links
# - E key to jump between edit fields
```

### Terminal Access

Orca works with GNOME Terminal for command-line access.

```bash
# Open GNOME Terminal
# Orca reads output automatically

# Enable accessibility in GNOME Terminal
# Edit > Preferences > Profiles > [Profile] > Command
# Check "Use transparent background" helps Orca track cursor

# Key shortcuts in terminal with Orca:
# Orca + Right Arrow - read next character
# Orca + Left Arrow  - read previous character
# Orca + A           - read all output
# Orca + Home/End    - jump to beginning/end of line
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

# Check if your braille display is detected
brltty --list-drivers

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

Orca's verbosity level controls how much information is spoken (punctuation, capital letters, object types, etc.).

```bash
# Change verbosity to "Brief" mode via gsettings
gsettings set org.gnome.orca verbosity-level 1
# 0 = Terse, 1 = Brief, 2 = Verbose, 3 = Extra Verbose

# Or use the Orca Preferences dialog > Speech tab > Verbosity
```

## Magnification with Orca

Orca can also magnify portions of the screen.

```bash
# Enable magnification
gsettings set org.gnome.desktop.a11y.applications screen-magnifier-enabled true

# Or use GNOME's built-in magnifier (separate from Orca)
gsettings set org.gnome.desktop.a11y.magnifier active true
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

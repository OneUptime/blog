# How to Configure CJK (Chinese, Japanese, Korean) Input on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Localization, CJK, Input Methods, IBus

Description: Step-by-step guide to setting up Chinese, Japanese, and Korean input methods on Ubuntu using IBus and Fcitx5 frameworks.

---

CJK input on Ubuntu requires more than just adding a keyboard layout. Because Chinese, Japanese, and Korean have thousands of characters mapped to phonetic input systems, you need an Input Method Engine (IME) - software that converts keystrokes into the correct characters based on context. Ubuntu supports several IME frameworks, with IBus and Fcitx5 being the most widely used.

## Understanding Input Method Frameworks

An input method framework sits between the keyboard and applications. When you type a phonetic sequence, the IME presents a candidate list and you pick the correct character. The framework (IBus or Fcitx5) manages which engines are active and integrates with GNOME or other desktop environments.

- **IBus** - default on Ubuntu, integrates well with GNOME
- **Fcitx5** - newer, faster, excellent CJK support, works well on both X11 and Wayland

## Installing IBus with CJK Engines

```bash
# Update package list
sudo apt update

# Install IBus core (often pre-installed on Ubuntu Desktop)
sudo apt install ibus

# Chinese (Simplified) - Pinyin input
sudo apt install ibus-pinyin

# Chinese (Simplified) - Wubi input method
sudo apt install ibus-table-wubi

# Chinese (Traditional) - Chewing (Zhuyin/Bopomofo)
sudo apt install ibus-chewing

# Japanese - Anthy (basic IME)
sudo apt install ibus-anthy

# Japanese - Mozc (Google's open-source Japanese IME, better quality)
sudo apt install ibus-mozc

# Korean - Hangul
sudo apt install ibus-hangul
```

After installation, restart IBus.

```bash
# Start/restart the IBus daemon
ibus-daemon -drx

# Or restart if already running
ibus restart
```

## Configuring IBus

```bash
# Open IBus preferences
ibus-setup
```

In the **Input Method** tab, click **Add** and search for your language. Add the engines you installed. The order in the list determines priority.

Make sure IBus is set as the active input method framework.

```bash
# Set IBus as default
im-config -n ibus

# Verify the configuration
cat ~/.config/im-config/70_user.conf
```

Log out and log back in for the changes to take effect.

## Setting Environment Variables for IBus

For applications to use IBus correctly, environment variables must be set. These are typically configured automatically, but you can add them manually if needed.

```bash
# Add to ~/.profile (X11 sessions)
export GTK_IM_MODULE=ibus
export QT_IM_MODULE=ibus
export XMODIFIERS=@im=ibus
```

On Wayland (default in Ubuntu 22.04+), GNOME handles input natively. If you encounter issues with Wayland and IBus, check the GNOME Settings input sources panel rather than environment variables.

## Installing Fcitx5 as an Alternative

Many users find Fcitx5 more responsive for CJK input, especially with large candidate dictionaries.

```bash
# Install Fcitx5 and Chinese addons
sudo apt install fcitx5 fcitx5-chinese-addons

# Install Fcitx5 Japanese support (Mozc)
sudo apt install fcitx5-mozc

# Install Fcitx5 Korean support (Hangul)
sudo apt install fcitx5-hangul

# Set Fcitx5 as the default input method
im-config -n fcitx5
```

```bash
# Open Fcitx5 configuration
fcitx5-configtool
```

In the configuration tool, go to the **Input Method** tab and add your languages.

### Fcitx5 Environment Variables

```bash
# Add to ~/.profile for X11
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS=@im=fcitx
```

## Adding CJK Input Through GNOME Settings

For basic CJK input via IBus, you can add input sources directly through GNOME Settings without running `ibus-setup`.

1. Open **Settings > Keyboard > Input Sources**.
2. Click **+**.
3. Select your language (e.g., Chinese (Simplified)).
4. Choose the input method variant (e.g., **Chinese (Intelligent Pinyin)**).

GNOME will automatically enable IBus for these sources.

## Switching Between Input Methods

Once multiple input sources are configured, use the keyboard shortcut to cycle through them.

```bash
# Default switch shortcut
# Super + Space   - switch to next input source
# Super + Shift + Space - switch to previous input source
```

Most CJK IMEs also have an internal toggle between Latin (direct) input and phonetic input mode. For Mozc (Japanese), this is typically the `Henkan` key or pressing Ctrl+Space inside the application.

## Installing Fonts for CJK Display

Even with input configured correctly, characters may not display if the fonts are missing.

```bash
# Install comprehensive CJK fonts
sudo apt install fonts-noto-cjk

# Install specific font packages
sudo apt install fonts-wqy-zenhei          # WenQuanYi Zen Hei (Chinese)
sudo apt install fonts-ipafont-gothic      # IPA Gothic (Japanese)
sudo apt install fonts-unfonts-core        # Un fonts (Korean)

# Rebuild font cache after installation
fc-cache -fv
```

## Testing CJK Input

After configuring everything, open a text editor like gedit and test your input.

```bash
# Open gedit for testing
gedit &
```

Switch to your CJK input source using `Super + Space`, then type a phonetic sequence. A candidate window should appear. For Pinyin Chinese, typing `ni` should show candidates including "你" (nǐ) and others.

## Troubleshooting Common Issues

### Candidate Window Does Not Appear

```bash
# Check if ibus-daemon is running
pgrep -la ibus

# If not running, start it
ibus-daemon -drx

# Check IBus input method configuration
ibus list-engine | grep -i pinyin
```

### Input Not Working in Specific Applications

Some Qt applications may not pick up IBus/Fcitx5 without the correct environment variables.

```bash
# Launch a specific Qt app with IBus support
QT_IM_MODULE=ibus myapp

# Or add the export to .bashrc for terminal-launched apps
echo 'export QT_IM_MODULE=ibus' >> ~/.bashrc
```

### Fcitx5 Not Starting on Login

```bash
# Add Fcitx5 to autostart
cp /usr/share/applications/org.fcitx.Fcitx5.desktop ~/.config/autostart/

# Or add it via GNOME Session startup applications tool
gnome-session-properties
```

### Switching Between Traditional and Simplified Chinese

If you need both Traditional and Simplified, add both as separate input sources. IBus Pinyin supports Simplified, while IBus Chewing handles Traditional with Zhuyin input. Fcitx5 with the Chinese addons package handles both.

```bash
# With Fcitx5 Chinese addons, you can switch output between Simplified and Traditional
# within the same Pinyin engine using its configuration tool
fcitx5-configtool
```

Managing CJK input on Ubuntu takes a bit of initial setup, but once configured, the experience is smooth. IBus works well for most users, while Fcitx5 offers better performance for heavy CJK input work.

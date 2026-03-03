# How to Set System Locale and Language on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Locale, System Administration, Internationalization, Linux

Description: Configure system locale and language settings on Ubuntu to control language display, character encoding, date formats, number formatting, and sort order for your environment.

---

Locale settings control how the system presents language-specific information: date and time formats, number formatting, currency symbols, character encoding, and text collation (sort order). Getting locale configured correctly matters both for server environments (where incorrect settings can cause encoding issues in databases and applications) and desktop systems.

## Understanding Locale Components

A locale identifier looks like `en_US.UTF-8`. It has several parts:

- `en` - language code (ISO 639)
- `US` - country/region code (ISO 3166)
- `UTF-8` - character encoding

The locale system has multiple categories, each controllable independently:

| Variable | Controls |
|----------|---------|
| `LANG` | Default for all categories |
| `LC_CTYPE` | Character classification and conversion |
| `LC_NUMERIC` | Number formatting |
| `LC_TIME` | Date and time formats |
| `LC_COLLATE` | String sorting order |
| `LC_MONETARY` | Currency formatting |
| `LC_MESSAGES` | Language for system messages |
| `LC_ALL` | Overrides all above (use sparingly) |
| `LANGUAGE` | Language preference list for messages |

## Checking Current Locale

```bash
# Show all current locale settings
locale

# Example output:
# LANG=en_US.UTF-8
# LANGUAGE=en_US:en
# LC_CTYPE="en_US.UTF-8"
# LC_NUMERIC="en_US.UTF-8"
# LC_TIME="en_US.UTF-8"
# ...

# Check just LANG
echo $LANG

# Show which locales are currently installed
locale -a

# Show locale information for a specific locale
locale -k LC_TIME en_US.UTF-8
```

## Installing Locale Packages

Before setting a locale, the language data must be installed:

```bash
# Check what language packs are available
apt search language-pack | head -30

# Install a specific language pack
sudo apt install language-pack-en         # English
sudo apt install language-pack-de         # German
sudo apt install language-pack-fr         # French
sudo apt install language-pack-es         # Spanish
sudo apt install language-pack-ja         # Japanese
sudo apt install language-pack-zh-hans    # Simplified Chinese

# Install language support (includes more components)
sudo apt install language-support-en

# Generate locale data (alternative to language packs)
sudo locale-gen en_US.UTF-8
sudo locale-gen de_DE.UTF-8
sudo locale-gen fr_FR.UTF-8

# Update locale cache
sudo update-locale
```

## Setting System-Wide Locale with localectl

`localectl` is the systemd tool for locale management:

```bash
# Check current locale settings
localectl status

# Set the system locale
sudo localectl set-locale LANG=en_US.UTF-8

# Set locale with specific category overrides
sudo localectl set-locale LANG=en_US.UTF-8 LC_TIME=en_GB.UTF-8

# For German with English messages
sudo localectl set-locale LANG=de_DE.UTF-8 LANGUAGE="en_US:en"

# Set to minimal C locale (for servers that don't need localization)
sudo localectl set-locale LANG=C.UTF-8

# Verify
localectl status
```

## Setting Locale via /etc/default/locale

The `/etc/default/locale` file is sourced at login:

```bash
# View current settings
cat /etc/default/locale

# Edit directly
sudo nano /etc/default/locale
```

```bash
# /etc/default/locale

# Full English US with UTF-8
LANG=en_US.UTF-8
LANGUAGE=en_US:en

# Or for a server: use C.UTF-8 for minimal locale impact
# LANG=C.UTF-8
# LC_ALL=C.UTF-8
```

```bash
# Apply immediately (without rebooting)
source /etc/default/locale

# Or export directly
export LANG=en_US.UTF-8
```

## Using dpkg-reconfigure

The interactive way to set locale on Debian/Ubuntu:

```bash
# Interactive locale reconfiguration
sudo dpkg-reconfigure locales
```

This opens a menu where you can:
1. Select which locales to generate (put a `*` next to desired locales)
2. Choose the default locale for the system

For automated/scripted usage:

```bash
# Non-interactive: generate en_US.UTF-8 and set as default
echo "en_US.UTF-8 UTF-8" | sudo tee /var/lib/locales/supported.d/en
sudo locale-gen en_US.UTF-8
sudo update-locale LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
```

## Setting Per-User Locale

Each user can have their own locale settings in `~/.profile` or `~/.bashrc`:

```bash
# Add to ~/.profile for login shells
nano ~/.profile
```

```bash
# User-specific locale settings
export LANG=en_US.UTF-8
export LANGUAGE=en_US:en
export LC_TIME=en_GB.UTF-8    # Use UK date format (DD/MM/YYYY)
export LC_NUMERIC=de_DE.UTF-8  # Use European number format (1.234,56)
```

```bash
# Apply to current session
source ~/.profile
```

## C.UTF-8 for Servers

For servers that don't need full internationalization support, `C.UTF-8` is a good choice:

```bash
# C.UTF-8 provides:
# - UTF-8 character encoding (handles all Unicode characters)
# - No language-specific formatting (sort, date, numbers in simple formats)
# - Minimal dependencies

sudo localectl set-locale LANG=C.UTF-8

# This is the safest for servers because:
# - No locale-specific library dependencies
# - Consistent behavior across environments
# - No surprise format changes
```

## Verifying Locale Works Correctly

Test that locale settings are applied:

```bash
# Check character encoding
locale | grep LANG
echo $LANG

# Test UTF-8 is working
echo "UTF-8 test: Hello, 世界, Привет, مرحبا"
# Should display without garbled characters

# Test date formatting
date
LC_TIME=de_DE.UTF-8 date   # German date format

# Test sort order (locale affects alphabetical sorting)
echo -e "b\na\nc" | LC_COLLATE=en_US.UTF-8 sort
echo -e "b\na\nc" | LC_COLLATE=C sort

# Test number formatting
python3 -c "import locale; locale.setlocale(locale.LC_NUMERIC, ''); print(locale.format_string('%f', 1234.56, grouping=True))"
```

## Fixing Locale Warnings

A common issue is seeing locale warnings in terminal:

```text
perl: warning: Setting locale failed.
perl: warning: Please check that your locale settings:
        LANG = "en_US.UTF-8"
        LC_ALL = (unset)
    are supported and installed on your system.
```

Fix this by ensuring the locale is generated:

```bash
# Generate the locale
sudo locale-gen en_US.UTF-8

# Or regenerate all configured locales
sudo dpkg-reconfigure locales

# Verify the locale is now available
locale -a | grep en_US

# Check for inconsistencies
locale
# Verify no "(unset)" for critical categories
```

## SSH and Locale Forwarding

When connecting via SSH, the client may forward locale settings to the server, which can cause issues if the server doesn't have the client's locale installed:

```bash
# On the SSH client - prevent locale forwarding
# Edit ~/.ssh/config or /etc/ssh/ssh_config
nano ~/.ssh/config
```

```bash
# Disable locale forwarding globally
Host *
    SendEnv LANG LC_*
# Comment out or remove the SendEnv line to disable forwarding
```

```bash
# On the SSH server - refuse locale forwarding
sudo nano /etc/ssh/sshd_config
```

```bash
# Remove or comment out AcceptEnv line to prevent locale forwarding
# AcceptEnv LANG LC_*
```

```bash
sudo systemctl restart sshd
```

## Locale in Docker Containers

Ubuntu Docker images often start with minimal locale support:

```bash
# In a Dockerfile
FROM ubuntu:22.04

# Set timezone and locale
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y locales && \
    locale-gen en_US.UTF-8 && \
    update-locale LANG=en_US.UTF-8

ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8
```

Or use a minimal locale for servers:

```bash
FROM ubuntu:22.04
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
```

## Database Locale Considerations

Database locale affects sort order, character comparison, and case conversion. This must match what your application expects:

```bash
# PostgreSQL locale (set at database creation time)
# Check current PostgreSQL locale
sudo -u postgres psql -c "SELECT datname, datcollate, datctype FROM pg_database;"

# MySQL locale
mysql -u root -p -e "SHOW VARIABLES LIKE 'character%'; SHOW VARIABLES LIKE 'collation%';"

# If database locale doesn't match system locale, applications may behave unexpectedly
# For databases, UTF-8 encoding with locale-appropriate collation is standard
```

## Common Locale Issues

```bash
# "Locale not supported" error
# Solution: generate the locale
sudo locale-gen en_US.UTF-8
sudo update-locale LANG=en_US.UTF-8

# "Cannot set LC_CTYPE to default locale" error
# Usually from invalid setting in environment
unset LC_ALL  # LC_ALL overrides everything; unset if causing issues
export LANG=en_US.UTF-8

# Wrong sort order or date format
# Check if LC_ALL is overriding everything
echo $LC_ALL  # Should be empty or match LANG
# If set to something unexpected, override:
export LC_ALL=en_US.UTF-8
```

For servers, the consistent advice is to use `en_US.UTF-8` or `C.UTF-8`. The UTF-8 encoding is critical - using older encodings like ISO-8859-1 causes data corruption when handling any non-ASCII characters, which is nearly unavoidable in modern applications that accept user input from around the world.

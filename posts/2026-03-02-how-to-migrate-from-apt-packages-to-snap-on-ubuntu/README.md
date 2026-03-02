# How to Migrate from apt Packages to Snap on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, APT, Package Management, Linux

Description: A practical guide to migrating from traditional APT packages to snap packages on Ubuntu, covering data migration, configuration handling, and common applications.

---

Moving from APT packages to snap equivalents involves more than just installing the snap and removing the apt package. Snaps store data in different locations, may behave differently due to confinement, and have different update characteristics. This guide walks through the migration process for common applications and covers what to watch for.

## Understanding the Key Differences

Before migrating, understand what changes:

**Data directories**: APT packages store data in standard Linux paths (`~/.config/firefox`, `~/.local/share/`). Snaps use `~/snap/<snapname>/current/` for user data and `/var/snap/<snapname>/current/` for system data.

**Configuration files**: Some snaps read configuration from the snap data directory rather than the standard XDG paths. Application behavior around config file location varies by snap.

**System files**: Strictly confined snaps cannot access arbitrary system files. Applications that previously worked with custom system-wide configs may need reconfiguration.

**Command names**: The snap might use a different command name than the apt package (`firefox.firefox` vs `firefox`, though this is usually handled by aliases).

## Pre-Migration Checklist

Before removing any APT packages:

```bash
# Document what you have installed
dpkg -l | grep <package-name> > before-migration.txt

# Note the version currently installed
apt-cache policy <package-name>

# Backup application data
cp -r ~/.config/firefox ~/firefox-backup-$(date +%Y%m%d)
cp -r ~/.mozilla ~/mozilla-backup-$(date +%Y%m%d)

# List any custom configuration files
find /etc -name "*firefox*" 2>/dev/null
find ~/.config -name "*application*" 2>/dev/null
```

## Migrating Firefox

Firefox is the most common migration on Ubuntu 22.04+, where Canonical made the snap the default:

```bash
# Step 1: Note your current Firefox profile location
ls ~/.mozilla/firefox/
# Profiles are stored as random-string.default or random-string.default-release

# Step 2: Remove the APT Firefox package
sudo apt remove --autoremove firefox

# Step 3: Install the Firefox snap
sudo snap install firefox

# Step 4: Check where the snap stores profiles
ls ~/snap/firefox/current/
ls ~/snap/firefox/common/

# Step 5: Copy your profile to the snap location
# Firefox snap looks for profiles in ~/snap/firefox/common/.mozilla/firefox/
cp -r ~/.mozilla ~/snap/firefox/common/.mozilla

# Step 6: Launch Firefox and verify profiles loaded
firefox

# If the profile loaded, clean up the backup eventually:
# rm -rf ~/.mozilla  # Only after verifying everything works
```

## Migrating VLC

```bash
# Backup VLC config
cp -r ~/.config/vlc ~/vlc-backup-$(date +%Y%m%d)

# Remove APT VLC
sudo apt remove --autoremove vlc

# Install VLC snap
sudo snap install vlc

# Connect interfaces VLC needs
sudo snap connect vlc:camera :camera
sudo snap connect vlc:audio-record :audio-record
sudo snap connect vlc:removable-media :removable-media
sudo snap connect vlc:optical-drive :optical-drive

# VLC snap stores config in ~/snap/vlc/current/.config/vlc/
# Copy existing config
mkdir -p ~/snap/vlc/current/.config/
cp -r ~/.config/vlc ~/snap/vlc/current/.config/vlc

# Test VLC
vlc
```

## Migrating LibreOffice

```bash
# Backup LibreOffice user config
cp -r ~/.config/libreoffice ~/libreoffice-backup-$(date +%Y%m%d)

# Remove APT LibreOffice (full suite)
sudo apt remove --autoremove libreoffice*

# Install LibreOffice snap
sudo snap install libreoffice

# Connect required interfaces
sudo snap connect libreoffice:home :home
sudo snap connect libreoffice:removable-media :removable-media

# Copy config to snap location
# LibreOffice snap uses ~/snap/libreoffice/current/.config/libreoffice/
mkdir -p ~/snap/libreoffice/current/.config/
cp -r ~/.config/libreoffice ~/snap/libreoffice/current/.config/libreoffice

# Verify the migration
libreoffice --version
```

## Migrating a Development Tool (Git)

Git as a classic snap is a common migration for developers who want newer versions than Ubuntu's repositories provide:

```bash
# Check current git version from APT
git --version

# Note your git configuration
cat ~/.gitconfig

# Install git snap (classic confinement - full system access)
sudo snap install git-ubuntu --classic

# Or use the Snap Store's git snap
sudo snap install git --classic

# git configuration (~/.gitconfig) is accessible to classic snaps
# No migration needed for user config

# Test
git --version
git config --list
```

## Migrating System Services

Snaps can run as system daemons, but migrating service-type software needs careful handling of service state and data:

```bash
# Example: Migrating a database (postgresql)

# Step 1: Stop the APT-installed service and dump data
sudo systemctl stop postgresql
sudo -u postgres pg_dumpall > /tmp/postgres-backup.sql

# Step 2: Note all custom configurations
cat /etc/postgresql/*/main/postgresql.conf
cat /etc/postgresql/*/main/pg_hba.conf

# Step 3: Remove the APT package (keep data for now)
sudo apt remove postgresql

# Step 4: Install the snap
sudo snap install postgresql14

# Step 5: Wait for the snap service to start
sudo snap start postgresql14
sudo snap services postgresql14

# Step 6: Restore the database dump
cat /tmp/postgres-backup.sql | sudo snap run postgresql14.psql

# Step 7: Apply custom configurations
# Snap postgresql stores config in /var/snap/postgresql14/current/etc/postgresql/
sudo cp /tmp/my-postgresql.conf /var/snap/postgresql14/current/etc/postgresql/
```

## Handling Applications That Don't Migrate Cleanly

Some applications have compatibility issues when migrating due to strict confinement:

```bash
# Test for confinement issues before removing the APT package
sudo snap install myapp  # Install snap without removing apt version

# Run both versions and compare behavior
apt-installed-command --test
snap run myapp --test

# Check for AppArmor denials
sudo journalctl -xe | grep apparmor | grep myapp
```

If the snap version shows AppArmor denials, connect the required interfaces:

```bash
# Find what the snap needs
snap connections myapp

# Connect missing interfaces
sudo snap connect myapp:home :home
sudo snap connect myapp:removable-media :removable-media
```

## Migration Script Template

```bash
#!/bin/bash
# migrate-to-snap.sh
# Template for migrating an APT package to its snap equivalent

APP_NAME="$1"        # APT package name
SNAP_NAME="$2"       # Snap name
BACKUP_DIR="$HOME/.migration-backups"

if [ -z "$APP_NAME" ] || [ -z "$SNAP_NAME" ]; then
    echo "Usage: $0 <apt-package> <snap-name>"
    exit 1
fi

# Step 1: Backup
mkdir -p "$BACKUP_DIR"
timestamp=$(date +%Y%m%d_%H%M%S)

# Backup common config locations
for dir in ~/.config/$APP_NAME ~/.local/share/$APP_NAME ~/.$APP_NAME; do
    if [ -d "$dir" ]; then
        cp -r "$dir" "$BACKUP_DIR/${APP_NAME}_${timestamp}_$(basename $dir)"
        echo "Backed up: $dir"
    fi
done

# Step 2: Install snap before removing APT (safer)
echo "Installing snap: $SNAP_NAME"
sudo snap install "$SNAP_NAME"

if [ $? -ne 0 ]; then
    echo "Snap installation failed. Aborting."
    exit 1
fi

# Step 3: Remove APT package
echo "Removing APT package: $APP_NAME"
sudo apt remove --autoremove "$APP_NAME"

echo "Migration complete. Backups in: $BACKUP_DIR"
echo "Test the snap version before removing backups."
```

## Verifying the Migration

After migrating, verify everything works before cleaning up:

```bash
# Confirm APT package is removed
dpkg -l | grep <package-name>
# Should show nothing or 'rc' state

# Confirm snap is installed and running
snap list | grep <snap-name>

# Test core functionality
# (application-specific tests)

# Check snap is getting updates
snap info <snap-name>
# Shows channel tracking and last refresh time

# Only after confirming everything works, remove backups
# rm -rf ~/.<app>-backup-*
```

The migration from APT to snap is usually straightforward for desktop applications and more involved for services. The key is always testing before removing the APT version and ensuring your data is backed up before making changes that are difficult to reverse.

# How to Use Deja Dup for Simple Desktop Backups on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Backup, Deja Dup, Desktop

Description: Learn how to configure and use Deja Dup on Ubuntu for automatic encrypted desktop backups to local drives, NAS, or cloud storage like Google Drive.

---

Deja Dup is Ubuntu's built-in backup tool, designed to be straightforward enough for everyday users while still being capable enough for reliable automated backups. It handles encryption, scheduling, and backup rotation without requiring command-line knowledge. Ubuntu's packaged versions commonly use Duplicity underneath, while newer upstream and Flatpak releases may use Restic. Both provide incremental encrypted backups.

## Installing Deja Dup

On Ubuntu 22.04 and newer, Deja Dup is often pre-installed. If not:

```bash
# Install via apt

sudo apt update
sudo apt install deja-dup

# Or install the Flatpak version (more up to date)
flatpak install flathub org.gnome.DejaDup
```

Check the installed version:

```bash
deja-dup --version
```

## Opening and Initial Configuration

Launch Deja Dup from the Activities menu by searching for "Backups", or run it from the terminal:

```bash
deja-dup &
```

The interface is minimal, with main options for scheduling, folders, and the storage location.

## Configuring What to Back Up

Click on "Folders" to define what gets backed up. By default, Deja Dup backs up your home directory, excluding folders such as Trash and Downloads.

You can also configure this from the command line by editing the DConf settings:

```bash
# View current backup folder settings
dconf read /org/gnome/deja-dup/include-list

# Set folders to include
dconf write /org/gnome/deja-dup/include-list "['$HOME']"

# Add additional folders
dconf write /org/gnome/deja-dup/include-list "['$HOME', '/etc']"
```

### Configuring Exclusions

Exclude folders that do not need backing up:

```bash
# Set exclusion list
dconf write /org/gnome/deja-dup/exclude-list "['$HOME/.cache', '$HOME/.local/share/Trash', '$HOME/Downloads', '$HOME/.thumbnails']"
```

Through the GUI, click "Folders to ignore" and add:
- `~/.cache` - application caches, can be regenerated
- `~/.local/share/Trash` - deleted files, not worth backing up
- `~/Downloads` - can be redownloaded
- Any virtual machine disk files (they are large and change frequently)

## Choosing a Backup Location

Deja Dup supports multiple storage backends:

### Local Drive or Network Share

For backing up to an external hard drive or NAS:

```bash
# Set backup location to local directory
dconf write /org/gnome/deja-dup/backend "'local'"
dconf write /org/gnome/deja-dup/local/folder "'/mnt/backup/deja-dup'"
```

### Google Drive

Deja Dup integrates with GNOME Online Accounts for Google Drive backup:

1. Open Settings and go to "Online Accounts"
2. Add your Google account
3. In Deja Dup, select "Google Drive" as the backup location
4. The backup folder in Google Drive defaults to your hostname

```bash
# Set Google Drive as backend
dconf write /org/gnome/deja-dup/backend "'google'"
```

### Network Server (SFTP)

For backing up to a remote SSH server:

```bash
# Set a remote SFTP location
dconf write /org/gnome/deja-dup/backend "'remote'"
dconf write /org/gnome/deja-dup/remote/uri "'sftp://backup.example.com'"
dconf write /org/gnome/deja-dup/remote/folder "'/backups/desktop'"
```

## Enabling Encryption

Deja Dup encrypts backups by default. During your first backup run, it prompts for an encryption password. Store this password somewhere safe - losing it means losing access to your backups permanently.

```bash
# Check which backup engine this Deja Dup installation is configured to use
dconf read /org/gnome/deja-dup/tool
```

For Duplicity backups, encryption is handled through GPG using your password. For Restic backups, Restic derives its repository key from your password. In both cases, the actual data is encrypted before leaving your machine, which means even if your backup destination is compromised, your data remains protected.

## Setting Up Automatic Backups

Configure the backup schedule through the GUI's "Schedule" option, or via DConf:

```bash
# Enable automatic backups
dconf write /org/gnome/deja-dup/periodic true

# Set backup period: 1 = daily, 7 = weekly
dconf write /org/gnome/deja-dup/periodic-period 7

# Set when to delete old backups: 6 = 6 months
dconf write /org/gnome/deja-dup/delete-after 180
```

The background helper `deja-dup-monitor` handles scheduled backups. On Ubuntu desktop packages it is started by the desktop session from an XDG autostart file:

```bash
# Check whether the backup monitor process is running
pgrep -a deja-dup-monitor

# Check the autostart entry installed by the package
ls /etc/xdg/autostart/org.gnome.DejaDup.Monitor.desktop
```

## Running a Manual Backup

Trigger a backup immediately from the command line:

```bash
# Start a backup
deja-dup --backup

# Restore from backup
deja-dup --restore

# Restore a specific file or folder
deja-dup --restore ~/Documents/important-file.txt
```

Through the GUI, click "Back Up Now" on the main screen.

## Monitoring Backup Status

Deja Dup provides a notification when backups complete or fail. You can also check the logs:

```bash
# View recent user-session journal messages mentioning Deja Dup
journalctl --user --since today | grep -i deja-dup

# Check cached metadata from duplicity, if this installation uses duplicity
ls -la ~/.cache/duplicity/
```

If a backup fails, the notification includes the error message. Common causes include:
- Backup destination not mounted or accessible
- Insufficient disk space at destination
- Wrong encryption password entered
- Network connectivity issues for cloud backends

## Restoring Files

The restore process in Deja Dup is straightforward:

1. Open Deja Dup
2. Click "Restore" on the main screen
3. Select the date from which to restore
4. Browse to the file or folder you want
5. Click "Restore"

For command-line restoration:

```bash
# Restore all files to original locations
deja-dup --restore

# Restore a specific file or folder
deja-dup --restore /path/to/file
```

Some older or distribution-specific desktop integrations also expose restore actions from the file manager, but current Ubuntu packages primarily restore through the Deja Dup application.

## Verifying Your Backups

Run a verification check to confirm your backup data is intact:

```bash
# Verify a duplicity-format backup against the current home directory
duplicity verify --compare-data file:///mnt/backup/deja-dup "$HOME"
```

Current Deja Dup releases do not expose a `--verify` command-line option. For Duplicity-format backups, `duplicity verify --compare-data` compares backed-up files against the originals. For Restic-format backups, use Restic's `check` command against the repository. It is good practice to verify backups monthly.

## Working Directly with Duplicity

If your Deja Dup backup folder contains files whose names begin with `duplicity-`, you can use duplicity commands directly for more control:

```bash
# Install duplicity if needed
sudo apt install duplicity

# List backup contents using duplicity directly
duplicity list-current-files file:///mnt/backup/deja-dup

# Show backup collection information
duplicity collection-status file:///mnt/backup/deja-dup
```

## Tips for Reliable Backups

**External drive backups:** Label your drive and set up udev rules to ensure it always mounts at the same path. Deja Dup will skip the backup if the drive is not present, then run when it next appears.

```bash
# Find your drive's UUID
lsblk -f

# Create a persistent mount point in /etc/fstab
UUID=your-drive-uuid /mnt/backup ext4 defaults,nofail 0 2
```

**Testing restores:** Do not just run backups - periodically test restoring files to confirm your backup is actually usable. Many people discover their backups were failing only when they need the data.

**Multiple destinations:** For important data, back up to at least two locations. Use Deja Dup for local encrypted backups and supplement with another tool or service for off-site copies.

Deja Dup strikes a good balance between simplicity and capability. It is the right tool when you need automatic, encrypted backups without the overhead of managing a complex backup system. For power users who need more control over retention, deduplication, or remote destinations, BorgBackup or restic may be better choices - but for typical desktop use, Deja Dup handles the job reliably.

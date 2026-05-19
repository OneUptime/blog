# Validation Summary: How to Perform a Clean Reinstall of Ubuntu Without Losing Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (Server 24.04 referenced)
- Linux filesystem and partitioning (ext4, `/home`, `/etc`, `/var/lib`)
- `lsblk`, `df`, `fstab`
- `dpkg` / `apt` / `apt-mark` / `apt-get dselect-upgrade`
- `snap`
- `cron` / `crontab`
- `systemd` units (`.service`, `.timer`, `.mount`)
- OpenSSH host keys
- Let's Encrypt / SSL certificates
- MySQL (`mysqldump`)
- PostgreSQL (`pg_dumpall`)
- Docker volumes
- `rsync`, `dd`, `cp -a`
- Ubuntu installer (Subiquity / "Custom storage layout", legacy "Something else")

## Sources Consulted
- GNU findutils documentation (verified implicit `-print` behavior with `-o` operator does NOT trigger the precedence gotcha when no explicit action is present; tested locally)
- `apt-mark(8)` and `dpkg(1)` selection options (verified `--get-selections` / `--set-selections` / `dselect-upgrade`)
- `ping(8)` iputils manual (verified options may follow destination)
- Ubuntu Server installer documentation (Subiquity "Custom storage layout")
- OpenSSH default host key permissions on Ubuntu (private keys 600, public keys 644)
- Local verification of `mysqldump`, `pg_dumpall`, `snap`, `apt-mark` on a Linux host

## Issues Found
No technical issues found.

Notes on items considered during review:
- The `find ... -name "*.service" -o -name "*.timer" ...` commands do NOT suffer from the classic find precedence bug because there is no explicit `-print` (or other action) appended. GNU find applies the implicit `-print` to the whole expression. Verified by direct testing.
- The "Something else" terminology in Approach 1 refers to the legacy Ubiquity Desktop installer. The post correctly also mentions "Custom storage layout" / "Manual" for the Subiquity Server installer in the later "During Installation" section, so both audiences are covered.
- SSH host key chmod values (`600` for private, `644` for public) match Ubuntu's defaults.
- `systemctl restart ssh` is correct on Ubuntu (service name is `ssh`, not `sshd`).
- `sudo mysqldump --all-databases` works on Ubuntu because the default root account uses `auth_socket` authentication.

## Review Notes
- `apt-mark showmanual` may list packages from third-party PPAs that won't be available on a fresh system; `apt install -y` will fail for missing ones unless PPAs are re-added first. The post does not call this out but it is not strictly incorrect.
- The `for user in $(cut -d: -f1 /etc/passwd)` loop will create empty `cron-<user>.txt` files for users with no crontab. Harmless but noisy.
- Glob expansion in restore commands like `/mnt/backup/ubuntu-backup-*/` assumes a single matching directory; if multiple backups are present the glob may expand to multiple paths and confuse some commands (e.g., `crontab -u root <files>`). Worth a future caveat but not technically wrong as written.
- Docker volume backup is only listed (volumes are not actually backed up); the script comment acknowledges this.
- The post references `ubuntu-24.04-live-server-amd64.iso`. This filename matches Canonical's published Ubuntu Server 24.04 LTS ISO naming.

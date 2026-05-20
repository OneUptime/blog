# Validation Summary: How to Use Deja Dup for Simple Desktop Backups on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Deja Dup / GNOME Backups
- DConf / GSettings
- Duplicity
- Restic
- Flatpak / Flathub
- GNOME Online Accounts
- systemd journal

## Sources Consulted
- GNOME Deja Dup help: Creating Backups - https://help.gnome.org/deja-dup/prefs.html
- GNOME Deja Dup help: Restoring - https://help.gnome.org/deja-dup/restore-full.html
- Flathub app page for `org.gnome.DejaDup` - https://flathub.org/apps/org.gnome.DejaDup
- Debian Duplicity man page - https://manpages.debian.org/testing/duplicity/duplicity.1.en.html
- Local Ubuntu package documentation and runtime checks: `deja-dup --help-all`, `deja-dup --version`, `/usr/share/man/man1/deja-dup.1.gz`
- Local Ubuntu Deja Dup GSettings schema: `/usr/share/glib-2.0/schemas/org.gnome.DejaDup.gschema.xml`
- Local Ubuntu package files for monitor startup: `/etc/xdg/autostart/org.gnome.DejaDup.Monitor.desktop`

## Issues Found
- The post stated that Deja Dup always uses Duplicity. Updated this to distinguish Ubuntu packaged versions that commonly use Duplicity from modern upstream/Flatpak releases that use Restic.
- The UI description used outdated section names. Updated it to refer to scheduling, folders, and storage location in line with current GNOME help.
- The Google Drive default folder was listed as `Deja Dup`. Updated it to the schema default, the machine hostname.
- The SFTP DConf example used a nonexistent `sftp` backend and nonexistent `/sftp/` keys. Replaced it with the supported `remote` backend, `remote/uri`, and `remote/folder` settings.
- The encryption check used a nonexistent `encrypt-metadata` DConf key. Replaced it with the supported `tool` key and clarified Duplicity versus Restic encryption behavior.
- The scheduled backup monitor was described as a user systemd service. Updated it to match Ubuntu packages, where `deja-dup-monitor` is started from an XDG autostart desktop file.
- The command examples used removed or unsupported Deja Dup options: `--restore-missing` and `--verify`. Replaced restore examples with supported `deja-dup --restore` usage and verification with `duplicity verify --compare-data` for Duplicity-format backups.
- The monitoring section referenced a nonexistent `deja-dup-monitor` user unit and `~/.cache/deja-dup/`. Updated it to journal filtering and Duplicity's cache path.
- The file manager restore integration was presented as generally available in current Ubuntu packages. Reworded it as older or distribution-specific behavior and pointed current users back to the Deja Dup application.
- The direct Duplicity section implied all Deja Dup backups can be managed with Duplicity. Added a Duplicity-format caveat so Restic-format backups are not misrepresented.

## Review Notes
The post is technically relevant and useful after correction. The DConf examples are valid for Ubuntu's packaged Deja Dup schema, but future Deja Dup releases may continue shifting behavior toward Restic, so backend-specific command-line recovery examples should be reviewed again when targeting Deja Dup 49 or newer specifically.

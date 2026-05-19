# Validation Summary: How to Configure journald Remote Logging on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- systemd-journald
- systemd-journal-remote
- systemd-journal-upload
- journalctl
- OpenSSL
- systemd unit drop-ins
- TLS certificates

## Sources Consulted
- freedesktop.org systemd-journal-remote.service manual: https://www.freedesktop.org/software/systemd/man/systemd-journal-remote.service.html
- freedesktop.org systemd-journal-upload.service manual: https://www.freedesktop.org/software/systemd/man/systemd-journal-upload.service.html
- freedesktop.org journal-upload.conf manual: https://www.freedesktop.org/software/systemd/man/journal-upload.conf.html
- freedesktop.org journal-remote.conf manual: https://www.freedesktop.org/software/systemd/man/journal-remote.conf.html
- freedesktop.org journalctl manual: https://www.freedesktop.org/software/systemd/man/journalctl.html
- Ubuntu Noble systemd-journal-remote.service manpage: https://manpages.ubuntu.com/manpages/noble/man8/systemd-journal-remote.service.8.html
- Ubuntu Noble journal-remote.conf manpage: https://manpages.ubuntu.com/manpages/noble/man5/journal-remote.conf.5.html
- Local Ubuntu apt metadata for package names: `apt-cache policy systemd-journal-remote systemd-journal-upload` and `apt-cache search systemd-journal-upload`
- Local `journalctl --help` output for `--file`, `--directory`, `--unit`, `--priority`, and `--vacuum-time`
- Local OpenSSL version check: `openssl version`

## Issues Found
- The post instructed readers to edit `/lib/systemd/system/systemd-journal-remote.service` directly. Changed this to `systemctl edit systemd-journal-remote.service` so the service is customized through a supported systemd drop-in.
- The HTTPS receiver used non-existent `systemd-journal-remote` flags `--server-key` and `--server-cert`. Changed them to the documented `--key` and `--cert` flags.
- The generated server certificate only set a common name. Added a `subjectAltName` extension and copied CSR extensions into the signed certificate so HTTPS hostname validation works with modern TLS clients.
- The client install command used `sudo apt install systemd-journal-upload`, but Ubuntu packages `systemd-journal-upload` in the `systemd-journal-remote` package. Updated the command to install `systemd-journal-remote`.
- The certificate copy commands attempted to `scp` directly into `/etc/ssl/journal/`, which commonly fails because the directory does not exist and normal SSH users cannot write there. Changed the workflow to copy files to `/tmp/` and install them into `/etc/ssl/journal/` with `sudo install` and appropriate permissions.
- The retention section configured `/etc/systemd/journald.conf`, but current Ubuntu/systemd provides remote journal retention settings in `/etc/systemd/journal-remote.conf` under `[Remote]`. Updated the example to use `MaxUse=`, `KeepFree=`, and `MaxFiles=`, with the cron vacuum retained for older releases.

## Review Notes
The article is technically relevant and salvageable. The remaining examples use the default journal remote port `19532`, documented `journalctl` flags, and valid `journal-upload.conf` keys. For future improvement, the TLS examples could also show a full OpenSSL CA configuration file, matching the upstream systemd examples, but the corrected commands are sufficient for the tutorial's scope.

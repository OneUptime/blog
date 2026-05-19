# Validation Summary: How to Set Up Calibre-Web for eBook Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Calibre-Web (web frontend for Calibre eBook libraries)
- Calibre / calibredb CLI
- Docker / Docker Compose
- LinuxServer.io container images (`lscr.io/linuxserver/calibre-web`) with `DOCKER_MODS` for universal-calibre
- Python (pip install via PyPI)
- systemd
- Nginx (reverse proxy)
- Certbot / Let's Encrypt
- OPDS (Open Publication Distribution System)
- Kobo Sync integration
- SMTP / Send-to-Kindle email flow
- rsync / tar / cron (for backup)

## Sources Consulted
- Calibre-Web CLI argument parser: https://raw.githubusercontent.com/janeczku/calibre-web/master/cps/cli.py
- Calibre-Web PyPI metadata / pyproject.toml: https://raw.githubusercontent.com/janeczku/calibre-web/master/pyproject.toml
- Calibre-Web GitHub README and wiki: https://github.com/janeczku/calibre-web
- Calibre-Web Mailserver setup wiki: https://github.com/janeczku/calibre-web/wiki/Setup-Mailserver
- LinuxServer.io Calibre-Web image docs: https://docs.linuxserver.io/images/docker-calibre-web/
- Calibre `calibredb` manual: https://manual.calibre-ebook.com/generated/en/calibredb.html

## Issues Found

1. **Invalid `cps` CLI flags in the systemd service.** The original `ExecStart` used `--config-file` and `--port`, neither of which exist. `cps` (argparse in `cps/cli.py`) only accepts single-letter flags: `-p` (settings db path), `-g`, `-c`, `-k`, `-o`, `-i`, `-s`, `-l`, `-m`, `-d`, `-r`, `-v`. There is no CLI option for port — port is configured via the web UI after first launch (default 8083). Fix: replaced with `ExecStart=/opt/calibre-web/venv/bin/cps -p /opt/calibre-web/config/app.db` and removed the bogus `--port 8083`.

2. **Hacky and misleading `calibredb` initialization command.** The original used `calibredb add --with-library /opt/calibre-web/books /dev/null 2>/dev/null || true`, which would fail to add `/dev/null` as an eBook and only succeeded incidentally via `|| true` because the library is created on first access. Fix: replaced with `calibredb list --with-library /opt/calibre-web/books`, which cleanly initializes the library directory and `metadata.db` on first run without errors.

3. **Non-existent "Goodreads/Send-to-Kindle" admin menu.** The original instructed users to set the From-Address under `Admin > Basic Configuration > Goodreads/Send-to-Kindle`. That section does not exist in Calibre-Web. The From-Address is configured under `Admin > Edit E-mail Server Settings`. Fix: consolidated the email server setup steps under the correct menu name with the actual field labels (SMTP Hostname, SMTP Port, Encryption, SMTP Username, SMTP Password, From E-mail). Also changed "TLS" to "STARTTLS" since port 587 uses STARTTLS in the Calibre-Web encryption dropdown.

## Review Notes
- The default admin credentials (`admin` / `admin123`), default port (8083), PyPI package name (`calibreweb`), pip extras (`gdrive`, `metadata`), Docker image (`lscr.io/linuxserver/calibre-web`), `DOCKER_MODS=linuxserver/mods:universal-calibre`, `/opds` endpoint, and Kobo sync URL base format (`/kobo/<api-key>/`) are all correct.
- The Kobo sync URL the user enters in their device's library configuration is just the base URL (`https://books.example.com/kobo/<api-key>/`); the device itself appends the API subpaths (e.g. `/v1/library/sync`), so the post's URL is correct as a configuration value.
- The post correctly warns about not running Calibre and Calibre-Web concurrently against the same library — this matches upstream guidance about SQLite write contention on `metadata.db`.
- The `DOCKER_MODS=linuxserver/mods:universal-calibre` adds ~700MB+ (not ~100MB) in practice on x86-64 due to bundled Calibre binaries, but the exact size varies by version; the rough order-of-magnitude estimate in the post is acceptable.
- The systemd service relies on port 8083 being free; users wanting a different port must change it in the web UI on first launch (Admin > Basic Configuration > Server Configuration) since there is no CLI override.

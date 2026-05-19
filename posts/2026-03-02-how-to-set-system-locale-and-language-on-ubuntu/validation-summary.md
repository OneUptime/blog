# Validation Summary: How to Set System Locale and Language on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Linux (locale subsystem)
- glibc locale categories (LANG, LC_CTYPE, LC_NUMERIC, LC_TIME, LC_COLLATE, LC_MONETARY, LC_MESSAGES, LC_ALL, LANGUAGE)
- `locale`, `locale-gen`, `update-locale`, `localectl` (systemd) utilities
- `dpkg-reconfigure locales`
- `/etc/default/locale`, `/var/lib/locales/supported.d/`
- Ubuntu `language-pack-*` packages
- OpenSSH (`SendEnv`, `AcceptEnv`)
- Docker (Ubuntu base images)
- PostgreSQL / MySQL locale variables
- Python `locale` module

## Sources Consulted
- GNU libc locale documentation: https://www.gnu.org/software/libc/manual/html_node/Locales.html
- POSIX locale categories: https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap07.html
- `man locale`, `man locale-gen`, `man localectl`, `man update-locale`
- Ubuntu package archive (`apt-cache madison`/`search`) — verified `language-pack-*` package names and confirmed `language-support-*` meta-packages are no longer present in current Ubuntu
- Ubuntu `openssh-server` systemd unit (`/lib/systemd/system/ssh.service`) — confirmed canonical service name is `ssh`
- OpenSSH `ssh_config(5)` / `sshd_config(5)` `SendEnv` / `AcceptEnv` documentation
- PostgreSQL `pg_database` system catalog: https://www.postgresql.org/docs/current/catalog-pg-database.html
- MySQL `SHOW VARIABLES` documentation
- Python 3 `locale.format_string` (https://docs.python.org/3/library/locale.html) — confirmed this is the current API (`locale.format` was removed in Python 3.11)

## Issues Found
1. **`sudo apt install language-support-en`** — Removed. The `language-support-*` meta-packages were dropped from modern Ubuntu (verified absent in Ubuntu 24.04 archive via `apt-cache search`). The `language-pack-*` packages already shown in the same block are the supported approach, so the misleading line was deleted.
2. **`sudo systemctl restart sshd`** — Changed to `sudo systemctl restart ssh`. On Ubuntu, the canonical systemd unit shipped by `openssh-server` is `ssh.service` (`sshd.service` is only an alias on recent Ubuntu and may not exist on older releases). Using `ssh` is portable across Ubuntu versions.

## Review Notes
- The SSH "disable locale forwarding" snippet shows the default `SendEnv LANG LC_*` line that *enables* forwarding, with a comment instructing the reader to comment it out. This reads slightly confusingly but is technically accurate — left as-is to preserve author style.
- `/var/lib/locales/supported.d/` and the `echo "en_US.UTF-8 UTF-8" | sudo tee` approach for non-interactive locale generation is Ubuntu-specific (Debian's `locale-gen` reads from `/etc/locale.gen`); this is correct for the Ubuntu audience of the post.
- `localectl` writes locale settings to `/etc/default/locale` on Ubuntu (rather than `/etc/locale.conf` as on some other systemd distros); the post's coverage is consistent with this behavior.
- `locale.format_string` (Python) is the correct current API; `locale.format` was deprecated in 3.7 and removed in 3.11.
- The Dockerfile examples use `ubuntu:22.04`; they remain valid, though `ubuntu:24.04` is now the current LTS base image. No change required.

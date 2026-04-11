# Validation Summary: How to Start and Stop MySQL on macOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (service management on macOS)
- macOS launchd / launchctl
- Homebrew (`brew services`)
- mysql.server script
- mysqladmin

## Sources Consulted
- MySQL 8.4 Reference Manual: Installing MySQL on macOS (https://dev.mysql.com/doc/refman/8.4/en/macos-installation.html)
- MySQL 8.4 Release Notes: removal of mysqld_safe (https://dev.mysql.com/doc/relnotes/mysql/8.4/en/)
- Homebrew `brew services` documentation (https://docs.brew.sh/Manpage#services-subcommand)
- Apple launchctl man page and launchd documentation

## Issues Found
- **`mysqld_safe` removed in MySQL 8.4+**: The "Start Without Registering as a Login Item" section recommended using `/opt/homebrew/opt/mysql/bin/mysqld_safe --datadir=/opt/homebrew/var/mysql &` and stopping with `mysqladmin -u root shutdown`. The `mysqld_safe` script was removed in MySQL 8.4 (released April 2024), which is the current LTS version and what Homebrew installs by default. Replaced with `brew services run mysql` (runs the service without registering it for autostart) and `brew services stop mysql` to stop it. This is the idiomatic Homebrew approach and works across all MySQL versions.

## Review Notes
- The `launchctl load -w` and `launchctl unload -w` commands are technically deprecated by Apple in favor of `launchctl bootstrap` and `launchctl bootout`. However, the legacy commands still work, and MySQL's own official documentation continues to use them, so this is acceptable.
- All Homebrew paths use `/opt/homebrew/` (Apple Silicon). On Intel Macs the prefix is `/usr/local/`. Since Apple Silicon has been the standard since late 2020, this is reasonable for a 2026 post, but could be noted for completeness.
- The Homebrew `brew services list` output format may vary slightly between Homebrew versions; the example shown is representative.

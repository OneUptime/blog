# Validation Summary: How to Uninstall MySQL Completely on macOS

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (DMG/pkg installer and Homebrew)
- macOS (launchd, launchctl, pkgutil, System Preferences pane)
- Homebrew (brew services, brew uninstall)

## Sources Consulted
- MySQL official documentation: Installing MySQL on macOS (https://dev.mysql.com/doc/refman/8.0/en/macos-installation.html)
- MySQL official documentation: Installing MySQL on macOS Using Native Packages (https://dev.mysql.com/doc/refman/8.0/en/macos-installation-pkg.html)
- Homebrew documentation: brew services, brew uninstall (https://docs.brew.sh/)
- Apple developer documentation: launchd / launchctl (https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)
- Apple man pages: pkgutil(1)

## Issues Found
- **Homebrew Step 5 missing Intel Mac paths**: The section for removing configuration files only listed Apple Silicon paths (`/opt/homebrew/etc/my.cnf` and `/opt/homebrew/etc/my.cnf.d`). Step 4 in the same method correctly differentiates between Apple Silicon and Intel paths, but Step 5 omitted the Intel equivalents (`/usr/local/etc/my.cnf` and `/usr/local/etc/my.cnf.d`). Fixed by adding the Intel Mac paths with the same formatting pattern used in Step 4.

## Review Notes
- `launchctl unload -w` is deprecated on modern macOS (10.10+) in favor of `launchctl bootout system <plist-path>`. The deprecated form still works and is widely used in documentation, so this is not a blocking issue, but readers on future macOS versions may see deprecation warnings.
- Step 7 (Method 1) removes `/usr/local/mysql/data`, but this directory was already deleted in Step 3 via `sudo rm -rf /usr/local/mysql*`. The step is only meaningful for custom data directories configured in `my.cnf`, which the text does mention.
- Step 8 references `/var/run/mysqld/mysqld.pid`, which is a Linux convention. On macOS DMG installs, the PID file is typically stored inside the data directory (already removed in Step 3). The `rm -f` command is harmless on non-existent paths.
- The `pkgutil --forget` identifiers (`com.mysql.mysql` and `com.oracle.mysql.startup`) correspond to older MySQL versions. Modern MySQL 8.0+ DMG installs use `com.oracle.oss.mysql.mysqld`. Since `pkgutil --forget` on a non-existent identifier only produces a warning, this is not harmful, but users of newer MySQL versions may want to also run `sudo pkgutil --forget com.oracle.oss.mysql.mysqld`.

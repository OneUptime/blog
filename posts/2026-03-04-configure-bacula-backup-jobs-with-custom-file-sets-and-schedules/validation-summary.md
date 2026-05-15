# Validation Summary: How to Configure Bacula Backup Jobs with Custom File Sets and Schedules on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Bacula Director
- Bacula Storage Daemon
- Bacula File Daemon
- Bacula Console
- firewalld
- systemd

## Sources Consulted
- Bacula Main Reference Manual, Configuring the Director: https://bacula.org/13.0.x-manuals/en/main/Configuring_Director.html
- Bacula Main Reference Manual, Client/File daemon Configuration: https://bacula.org/13.0.x-manuals/en/main/Client_File_daemon_Configur.html
- Bacula Main Reference Manual, Installing Bacula and default ports: https://www.bacula.org/7.4.x-manuals/en/main/Installing_Bacula.html
- Bacula Console documentation, status command: https://www.bacula.org/7.0.x-manuals/en/console/Bacula_Console.html
- Bacula documentation, testing configuration files with daemon `-t -c` options: https://fossies.org/linux/bacula-docs/manuals/en/main/www-main/main/Getting_Started_with_Bacula.html
- Fedora package metadata for Bacula package names used by EPEL/Fedora-family builds: https://packages.fedoraproject.org/pkgs/bacula
- Red Hat guidance for enabling CodeReady Builder and installing EPEL on RHEL: https://www.redhat.com/en/blog/install-epel-linux

## Issues Found
- The original package installation commands used `<package-name>`, which would not work. Replaced them with Bacula package names for Director, Storage Daemon, File Daemon/client, and Console.
- The original EPEL setup used `dnf install epel-release`, which is not reliable on a clean RHEL host before EPEL is configured. Replaced it with the CodeReady Builder enablement and EPEL release RPM installation pattern documented for RHEL.
- The original service configuration path used `/etc/<service>/config.conf`, which is not a Bacula configuration path. Replaced it with `/etc/bacula/bacula-dir.conf`.
- The article title promised custom File Sets and Schedules, but the post did not include Bacula `FileSet`, `Schedule`, or `Job` resources. Added a minimal Director configuration example using documented Bacula resource names and directives.
- The original systemd examples used `<service>`, which would not start Bacula. Replaced them with `bacula-dir`, `bacula-sd`, and `bacula-fd`.
- The original validation command used `<service> --test`, which is not the Bacula syntax-check pattern. Replaced it with `bacula-dir -t -c`, `bacula-sd -t -c`, and `bacula-fd -t -c`.
- The original firewall command used `--add-service=<service>`, which is not actionable for Bacula. Replaced it with Bacula's default TCP ports 9101, 9102, and 9103.
- The original performance and troubleshooting commands used `<service>` placeholders. Replaced them with Bacula-specific service and process names.
- The original security guidance said to run the service as a dedicated non-root user when possible. Clarified that this applies to the Director and Storage Daemon, while the File Daemon often needs root privileges to read protected files.

## Review Notes
- The post now contains technically valid Bacula resource examples, but a production deployment still needs site-specific catalog/database initialization, storage device configuration, matching passwords between Bacula components, and verified Client, Storage, Pool, and Messages resources.

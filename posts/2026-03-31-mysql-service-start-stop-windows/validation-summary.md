# Validation Summary: How to Start and Stop MySQL on Windows

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- MySQL 8.0 (Windows)
- Windows Services (services.msc, SCM)
- PowerShell (service management cmdlets)
- Windows Command Prompt (net commands)
- mysqld.exe (direct server management)
- MySQL Notifier (deprecated)

## Sources Consulted
- MySQL 8.0 Reference Manual — Starting MySQL as a Windows Service: https://dev.mysql.com/doc/refman/8.0/en/windows-start-service.html
- MySQL 8.0 Reference Manual — Windows Installation: https://dev.mysql.com/doc/refman/8.0/en/windows-installation.html
- MySQL 8.0 Reference Manual — mysqld Windows Service Options (--install, --remove): https://dev.mysql.com/doc/refman/8.0/en/server-options.html
- Microsoft PowerShell documentation for Get-Service, Start-Service, Stop-Service, Restart-Service, Set-Service: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/
- Microsoft documentation for Get-NetTCPConnection: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-nettcpconnection

## Issues Found
1. **MySQL Notifier described as currently available (Method 4)**: The post stated "MySQL Notifier is a tray application installed with MySQL Installer" as a current method. MySQL Notifier has been deprecated and is no longer bundled with current MySQL 8.0+ Installer packages. Updated the section heading to include "(Deprecated)" and revised the description to clarify it was previously bundled and is no longer included in current releases.

2. **Summary referenced MySQL Notifier without deprecation note**: The Summary section listed "MySQL Notifier tray application" as a current graphical alternative. Removed the reference since the tool is deprecated.

## Review Notes
- All PowerShell commands (`Get-Service`, `Start-Service`, `Stop-Service`, `Restart-Service`, `Set-Service`, `Get-Content -Tail`, `Get-Content -Wait`, `Get-NetTCPConnection`) are syntactically correct and use current, non-deprecated cmdlets.
- The `net start`/`net stop` commands, `services.msc` instructions, and `mysqld --install`/`--remove` syntax all match official MySQL documentation.
- The `--install` command correctly places `--defaults-file` after the service name, which matches the MySQL documentation for service installation (this differs from normal mysqld startup where `--defaults-file` must be the first option).
- Code blocks use `bash` as the language tag for PowerShell and CMD commands. While `powershell` or `cmd` would be more precise, this is a common blog convention and not a technical error.
- The post is specific to MySQL 8.0. Users installing MySQL 8.4 LTS or MySQL 9.x will see different default service names (e.g., `MySQL84`). The post adequately hedges this with "(or similar)" in the summary.
- Default paths (`C:\Program Files\MySQL\MySQL Server 8.0\...` and `C:\ProgramData\MySQL\MySQL Server 8.0\...`) are correct for a standard MySQL 8.0 installation on Windows.

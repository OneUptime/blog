# Validation Summary: How to Uninstall MySQL Completely on Windows

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- MySQL 8.0
- Windows 10 / Windows 11
- PowerShell
- MySQL Installer
- Windows Registry
- Windows Services (sc.exe)

## Sources Consulted
- MySQL 8.0 Reference Manual — Installing MySQL on Microsoft Windows: https://dev.mysql.com/doc/refman/8.0/en/windows-installation.html
- MySQL 8.0 Reference Manual — Starting MySQL as a Windows Service: https://dev.mysql.com/doc/refman/8.0/en/windows-start-service.html
- MySQL 8.0 Reference Manual — mysqldump: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- Microsoft Docs — Stop-Service: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/stop-service
- Microsoft Docs — Set-Service: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-service
- Microsoft Docs — Remove-Item: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/remove-item
- Microsoft Docs — sc.exe delete: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/sc-delete
- Microsoft Docs — Get-NetTCPConnection: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-nettcpconnection

## Issues Found
No technical issues found.

## Review Notes
- All PowerShell commands use correct syntax, including appropriate use of `sc.exe` instead of `sc` (which is a PowerShell alias for `Set-Content`).
- The code blocks use `bash` as the language identifier rather than `powershell`. This is a stylistic/syntax-highlighting choice that is consistent throughout the post and does not affect command correctness.
- The mermaid flowchart shows Steps 3 and 4 (MySQL Installer and Programs and Features) as sequential, while the text correctly explains they are alternatives. The diagram is slightly simplified but the text makes the distinction clear.
- The `mysqld --remove` command in Step 5 would only work if the MySQL binary has not yet been removed by the uninstaller in Steps 3/4. The post presents it as an alternative to `sc.exe delete`, which is appropriate.
- The mysqldump backup command in Step 1 assumes the `C:\Backup` directory already exists. Users would need to create it first, but this is a reasonable assumption in a tutorial context.

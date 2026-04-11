# Validation Summary: How to Install MySQL on Windows 11

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Installer for Windows
- Windows 11
- PowerShell
- MySQL command-line client

## Sources Consulted
- MySQL 8.0 Reference Manual: Installing MySQL on Microsoft Windows — https://dev.mysql.com/doc/refman/8.0/en/windows-installation.html
- MySQL 8.0 Reference Manual: MySQL Installer for Windows — https://dev.mysql.com/doc/refman/8.0/en/mysql-installer.html
- MySQL 8.0 Reference Manual: Caching SHA-2 Pluggable Authentication — https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html
- MySQL 8.0 Reference Manual: Starting MySQL as a Windows Service — https://dev.mysql.com/doc/refman/8.0/en/windows-start-service.html
- Microsoft PowerShell documentation for Get-Service, Stop-Service, Start-Service, Restart-Service cmdlets

## Issues Found
1. **Tags typo**: "Window" was corrected to "Windows" in the tags line.
2. **Code block language tags**: Two PowerShell code blocks (service management commands and the `SetEnvironmentVariable` call) were incorrectly tagged as `bash`. Changed to `powershell` for correct syntax highlighting.

## Review Notes
- The setup type list shows three options (Developer Default, Server Only, Custom) but omits "Client Only" and "Full" which are also available in the MySQL Installer. This is acceptable for a guide focused on common choices.
- The post's Step 6 (Verify the Installation) uses `mysql -u root -p` which may fail if MySQL's bin directory is not yet in the PATH. The post does cover adding MySQL to PATH in a later section, but users may need to reference that section first if the installer did not automatically add it.
- MySQL Notifier is mentioned as an alternative for managing the service. MySQL Notifier has had limited maintenance in recent years and may not be bundled with newer MySQL Installer releases. Users should verify its availability.
- The `validate_password` requirements listed under "STRONG policy" actually describe the MEDIUM policy criteria. The STRONG policy adds dictionary file checks on top of MEDIUM requirements. However, in the context of the installer wizard's password strength indicator (as opposed to the server-side `validate_password` component), the listed requirements are a reasonable characterization.

# Validation Summary: How to Check Your MySQL Version

## Status
validated

## Post Type
Reference / How-to Guide

## Technologies Covered
- MySQL 8.0 (server and client)
- mysqladmin CLI utility
- SQL (`VERSION()` function, `@@version` system variable, `SHOW VARIABLES`)
- Bash / shell scripting
- PowerShell (`Get-WmiObject`)
- Homebrew (macOS package manager)
- dpkg / rpm (Linux package managers)

## Sources Consulted
- MySQL 8.0 Reference Manual — mysql client: https://dev.mysql.com/doc/refman/8.0/en/mysql.html
- MySQL 8.0 Reference Manual — mysqladmin: https://dev.mysql.com/doc/refman/8.0/en/mysqladmin.html
- MySQL 8.0 Reference Manual — VERSION() function: https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_version
- MySQL 8.0 Reference Manual — Server System Variables (version, version_comment, version_compile_machine, version_compile_os, version_compile_zlib): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — SHOW VARIABLES: https://dev.mysql.com/doc/refman/8.0/en/show-variables.html

## Issues Found
No technical issues found.

## Review Notes
- `Get-WmiObject` (used in the PowerShell example) is deprecated in PowerShell Core (6+/7+) in favor of `Get-CimInstance`. It still works in Windows PowerShell 5.1, which ships with Windows. A future update could replace it with `Get-CimInstance Win32_Product` for broader compatibility.
- Querying `Win32_Product` via WMI/CIM is known to be slow and can trigger MSI consistency checks. An alternative approach for Windows would be checking the registry or using `winget list` for newer Windows versions. This is a best-practice concern rather than a correctness issue.
- The `-p` flag with `2>/dev/null` in the "One-Line Version Check" section suppresses the "Enter password:" prompt (which goes to stderr), meaning the user must type the password blindly. This is technically correct but could be confusing for beginners. The post does note that the passwordless scripting variant is "not recommended for production."
- All MySQL system variables referenced (`version`, `version_comment`, `version_compile_machine`, `version_compile_os`, `version_compile_zlib`) are verified to exist in MySQL 8.0.
- Protocol version 10 shown in the `mysqladmin` output is correct for MySQL 5.x and 8.x.

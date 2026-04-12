# Validation Summary: How to Run MongoDB as a Windows Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB 7.0 (Community/Enterprise)
- Windows Services (net, sc.exe)
- PowerShell (Start-Service, Stop-Service, Get-Service)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB official documentation: Install MongoDB on Windows — https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-windows/
- MongoDB official documentation: mongod.exe --install service flag — https://www.mongodb.com/docs/manual/reference/program/mongod.exe/
- MongoDB configuration file options — https://www.mongodb.com/docs/manual/reference/configuration-options/
- Microsoft sc.exe failure syntax — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/sc-failure

## Issues Found

1. **Incorrect line continuation character in install command**: The `mongod.exe --install` command used backtick (`` ` ``) for line continuation, which is PowerShell syntax. However, the accompanying text said "Administrator command prompt" (cmd.exe), where the line continuation character is `^`. Fixed by putting the command on a single line, which works in both cmd.exe and PowerShell.

2. **Misleading section label for net commands**: The "Starting and Stopping the Service" section was labeled "Using the Windows Service Control Manager (`sc`)" but the commands shown were `net start` / `net stop`, not `sc` commands. `sc` and `net` are different utilities. Fixed by changing the label to "Using `net` commands:".

3. **Missing spaces in `sc.exe failure` command**: The `sc.exe` utility requires a space after each `=` sign in its parameters. The command had `reset=86400 actions=restart/...` which would fail. Fixed to `reset= 86400 actions= restart/...` per the `sc.exe` syntax requirements.

## Review Notes
- The `mongosh.exe` path shown (`C:\Program Files\MongoDB\Server\7.0\bin\mongosh.exe`) may not be accurate for all installations. Starting from MongoDB 6.0, `mongosh` is distributed separately and may be installed at a different location. However, the MSI installer can optionally place it in the server bin directory, so this is acceptable.
- The configuration file is placed in the `bin` directory. MongoDB documentation typically suggests placing it alongside but this location works fine.
- Code blocks use `bash` syntax highlighting for Windows cmd commands. This is a common convention in blog posts since markdown has no standard `cmd` highlighter, and is not a technical error.

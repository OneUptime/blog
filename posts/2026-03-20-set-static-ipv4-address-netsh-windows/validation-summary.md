# Validation Summary: How to Set a Static IPv4 Address Using netsh on Windows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Windows `netsh`
- Windows IPv4 interface configuration
- DNS server configuration
- Command Prompt batch scripting
- PowerShell remoting / WinRM
- `ipconfig` and `findstr`

## Sources Consulted
- Microsoft Learn: Network shell (`netsh`) - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh
- Microsoft Learn: `netsh interface` - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: `ipconfig` - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: `findstr` - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/findstr
- Microsoft Learn: PowerShell `Invoke-Command` - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/invoke-command

## Issues Found
- The DNS examples used `netsh interface ipv4 set dns` and `netsh interface ipv4 add dns`. Current Microsoft Learn syntax for the `interface ipv4` context documents `set dnsservers` and `add dnsservers`, so the DNS examples and complete script were updated to use the documented command names.
- The post described `netsh interface ipv4 set address` as the "authoritative" command-line method and said `netsh` works "reliably" in remote administration sessions. Microsoft documents these `netsh` commands but also recommends PowerShell for managing networking technologies, so the wording was adjusted to describe `netsh` as the documented `netsh` method and to avoid overstating remote-session reliability.

## Review Notes
- The `set address`, `show interface`, `show interfaces`, `show config`, `ipconfig /all`, `findstr`, and `Invoke-Command` examples match documented command syntax.
- Changing an active adapter's IP address on a remote computer can interrupt the remoting session even when the command syntax is correct.

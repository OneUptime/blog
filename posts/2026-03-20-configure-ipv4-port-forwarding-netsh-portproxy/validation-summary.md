# Validation Summary: How to Configure IPv4 Port Forwarding on Windows Using netsh portproxy

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Windows `netsh interface portproxy` (v4tov4)
- Windows IP Helper service (`iphlpsvc`)
- Windows Firewall (`netsh advfirewall firewall`)
- WSL2 networking
- PowerShell (`Test-NetConnection`, line continuation)
- Windows Command Prompt (cmd) syntax

## Sources Consulted
- Microsoft Learn — Netsh Commands for Interface Portproxy: https://learn.microsoft.com/en-us/windows-server/networking/technologies/netsh/netsh-interface-portproxy
- Microsoft Learn — Legacy Server 2003 portproxy reference: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2003/cc776297(v=ws.10)
- Microsoft Learn — Accessing network applications with WSL: https://learn.microsoft.com/en-us/windows/wsl/networking
- Microsoft Learn — Netsh AdvFirewall Firewall commands: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-advfirewall
- Microsoft Learn — Configure Windows Firewall with the command line: https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/windows-firewall/configure-with-command-line

## Issues Found

1. **Incorrect implementation-level claim.** The introduction stated that portproxy "creates a TCP port forwarding rule at the kernel level." This is inaccurate: portproxy is implemented by the IP Helper service (`iphlpsvc`), which runs in user mode. Microsoft's service description for IP Helper explicitly notes that Port Proxy depends on it. Updated the wording to "via the Windows IP Helper service (`iphlpsvc`)" and added a sentence noting that portproxy is TCP-only and requires the IP Helper service to be running — both useful, frequently-asked caveats that improve accuracy without altering the post's structure.

## Review Notes

- All `netsh interface portproxy` syntax (`add v4tov4`, `show all`, `delete v4tov4`, `reset`) matches the current Microsoft Learn documentation. The required `listenport` parameter is correctly included in the delete example.
- The `show all` output format shown in the post matches the actual command output.
- The `netsh advfirewall firewall add rule` syntax is correct and current. Worth noting (not corrected) that Microsoft now recommends the PowerShell cmdlet `New-NetFirewallRule` as the modern replacement for `netsh advfirewall`, though the latter remains fully functional.
- The cmd line continuation character (`^`) and PowerShell line continuation backtick (`` ` ``) are both used correctly in their respective code blocks.
- The WSL2 IP retrieval via `(wsl hostname -I).Trim()` works for a single-IP host; on hosts with multiple IPs the trimmed string would contain space-separated values, but this is the conventional pattern used in Microsoft's own WSL networking documentation.
- Not mentioned (but not strictly an error): a long-standing quirk is that the Windows IPv6 stack must be installed (though not necessarily configured) for `v4tov4` portproxy rules to function, as portproxy was originally implemented as a v4↔v6 transition tool. This rarely affects modern Windows installs where IPv6 is enabled by default.

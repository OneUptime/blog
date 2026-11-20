# Validation summary

## Checks performed

Official Windows Server2025 cmdlet and Microsoft VPN/NRPT references reviewed; Linux guidance scoped to systemd257 documentation

Bash inspection block passed bash -n; default and explicit nslookup commands verified to keep question/type identical

Mermaid five-node six-edge diagram checked structurally

Generated 1280x720 social image visually inspected; full title readable.

## Limitations

Windows PowerShell, VPN and systemd-resolved environments unavailable locally; no policy-routing or network command execution claimed

Shell syntax and argument checks do not validate actual resolver selection, configuration persistence or application behavior

Mermaid not browser-rendered

## Sources reviewed

- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup
- https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientserveraddress?view=windowsserver2025-ps
- https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipinterface?view=windowsserver2025-ps
- https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientnrptpolicy?view=windowsserver2025-ps
- https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/vpn/vpn-name-resolution
- https://learn.microsoft.com/en-us/windows/client-management/mdm/vpnv2-csp
- https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname?view=windowsserver2025-ps
- https://www.freedesktop.org/software/systemd/man/257/resolvectl.html
- https://www.freedesktop.org/software/systemd/man/257/systemd-resolved.service.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

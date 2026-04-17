# Validation Summary: How to Set Up WireGuard on Windows with IPv4 Split Tunneling

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- WireGuard (Windows client)
- IPv4 networking and split tunneling
- PowerShell
- Windows routing (`route print`)
- INI-style WireGuard configuration

## Sources Consulted
- WireGuard official install page: https://www.wireguard.com/install/
- WireGuard conf reference (wg(8) / wg-quick(8)): https://man7.org/linux/man-pages/man8/wg.8.html and https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- WireGuard Windows client documentation / TunnelSafe UI behavior (wireguard.com/xplatform/)
- Microsoft docs on `route` command: https://learn.microsoft.com/windows-server/administration/windows-commands/route_ws2008
- Microsoft PowerShell `Tee-Object` / `Out-File` / `Invoke-RestMethod` reference: https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/
- IETF RFC 5737 (documentation address ranges, 203.0.113.0/24)

## Issues Found
No technical issues found.

Verification details:
- Download URL `wireguard.com/install` is the correct official source.
- "Add Tunnel → Add empty tunnel" matches the WireGuard Windows GUI workflow and it auto-generates the key pair.
- PowerShell pipeline `wg genkey | Tee-Object -FilePath ... | wg pubkey | Out-File ...` is syntactically valid PowerShell; `wg.exe` is shipped with the WireGuard Windows installer.
- Configuration keys (`PrivateKey`, `Address`, `DNS`, `PublicKey`, `Endpoint`, `AllowedIPs`, `PersistentKeepalive`) are the correct wg-quick field names and their values are well-formed.
- `AllowedIPs = 10.0.0.0/24, 192.168.100.0/24` correctly scopes split-tunnel traffic; `0.0.0.0/0` correctly routes all IPv4 traffic through the VPN.
- Default WireGuard UDP port 51820 is correct.
- `route print -4` is a valid Windows command to display the IPv4 routing table.
- `203.0.113.1` is within the TEST-NET-3 documentation range (RFC 5737), appropriate for example use.
- `PersistentKeepalive = 25` matches WireGuard's commonly recommended NAT traversal value.

## Review Notes
- The `Tee-Object -FilePath` / `Out-File` pattern in Windows PowerShell 5.1 defaults to UTF-16 LE with BOM, which can occasionally trip up tools that expect plain ASCII; in practice `wg pubkey` reads from the pipeline (not the file), so the displayed keys in the files may include a BOM but the piped public-key generation still works. Users who need to paste keys from the saved files might want to use `Out-File -Encoding ascii` or PowerShell 7+. Not a correctness issue in the post, but worth keeping in mind.
- The tags line contains "Window" (singular) which looks like a minor typo for "Windows", but this is a non-technical metadata issue so it was left unchanged per review guidelines.
- `wg show` requires `wg.exe` to be in PATH or invoked from the WireGuard install directory (e.g., `C:\Program Files\WireGuard\`); the GUI also exposes the same information on the tunnel detail page, which some users may find easier than the CLI.

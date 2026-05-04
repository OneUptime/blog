# Validation Summary: How to Configure IPv6 Privacy Extensions on Windows

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- IPv6 Privacy Extensions (RFC 4941)
- Windows networking (`netsh interface ipv6`)
- PowerShell NetTCPIP module (`Set-NetIPv6Protocol`, `Get-NetIPv6Protocol`, `Get-NetIPAddress`, `Get-NetAdapter`)
- Random / stable interface identifiers (RFC 7217-style behavior on Windows)
- `ipconfig /all`

## Sources Consulted
- Microsoft Learn — Set-NetIPv6Protocol (NetTCPIP): https://learn.microsoft.com/en-us/powershell/module/nettcpip/set-netipv6protocol
- Microsoft Learn — Get-NetIPAddress (NetTCPIP): https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress
- Microsoft Learn — netsh interface command reference: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- `netsh interface ipv6 set privacy /?` parameter reference
- RFC 4941 — Privacy Extensions for Stateless Address Autoconfiguration in IPv6
- RFC 7217 — A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration

## Issues Found
1. **Inaccurate `netsh interface ipv6 show privacy` example output.** The original example showed simplified field names like "Maximum Lifetime (days)" and "Preferred Lifetime (days)" with day-only values, which don't match real `netsh` output. Replaced with the actual field labels ("Maximum Valid Lifetime", "Maximum Preferred Lifetime", "Regenerate Time", etc.) using the real time-suffix format (`7d`, `1d`, `5s`, `10m`) and added the missing rows (Duplicate Address Detection Attempts, Maximum Random Time, Random Time).
2. **Mismatched comment on the "Enable with custom lifetimes" example.** The command actually only set `maxdadattempts=3`, which is not a lifetime parameter. Changed the command to `maxvalidlifetime=7d maxpreferredlifetime=1d` so it matches the comment and reflects an actual lifetime configuration. Both `maxvalidlifetime` and `maxpreferredlifetime` are valid parameters of `netsh interface ipv6 set privacy`.
3. **Misleading comment in the per-interface section.** The example was labeled "Set privacy for specific interface via netsh" but the command (`routerdiscovery=enabled`) does not configure privacy, and Windows does not support per-interface privacy extensions at all. Reworded the comment to reflect that the example demonstrates other per-interface IPv6 settings, while explicitly noting privacy itself is not per-interface (consistent with the existing note below the example).

## Review Notes
- All other commands and PowerShell cmdlets verified against current Microsoft Learn documentation: `Set-NetIPv6Protocol -UseTemporaryAddresses Enabled/Disabled`, `MaxTemporaryPreferredLifetime`/`MaxTemporaryValidLifetime` (both accept `TimeSpan`), `Get-NetIPAddress -AddressFamily IPv6` with `SuffixOrigin -eq "Random"`, and `netsh interface ipv6 set global randomizeidentifiers=enabled` are all correct as written.
- The `UseTemporaryAddresses` parameter actually accepts additional values beyond `Enabled`/`Disabled` (e.g., `Always`, `Counter`), but the post intentionally focuses on the two common values, which is reasonable for a how-to.
- Minor non-technical observations not changed: the tags list contains "Window" (likely intended as "Windows"); this is a metadata typo, not a technical correctness issue, so it was left alone per the "only fix technical errors" guidance.

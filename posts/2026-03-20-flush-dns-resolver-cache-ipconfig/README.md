# How to Flush the DNS Resolver Cache with ipconfig /flushdns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, Networking, Ipconfig, DNS, Cache, Troubleshooting

Description: Flush the Windows DNS resolver cache using ipconfig /flushdns to clear stale DNS records and force fresh lookups, resolving hostname resolution issues after DNS changes.

## Introduction

The Windows DNS resolver cache stores previously resolved hostnames to speed up subsequent lookups. When DNS records change (e.g., after a server migration or domain update), the cached old records can cause connection failures. Flushing the cache forces Windows to query the DNS server again.

## Flushing the DNS Cache

```cmd
:: Open an elevated command prompt and run:
ipconfig /flushdns
```

Expected output:

```text
Windows IP Configuration

Successfully flushed the DNS Resolver Cache.
```

## When to Flush the DNS Cache

- After a website or service has moved to a new IP address
- After changing the DNS server settings on the adapter
- When `ping hostname.com` resolves to an old IP
- After creating a DNS record that previously returned "Name does not exist"
- After a domain cutover or migration

## Verifying the Cache is Empty

```cmd
:: Display the DNS cache before and after flushing
ipconfig /displaydns

:: After flushing, /displaydns should show a much shorter list or be empty
ipconfig /flushdns
ipconfig /displaydns | more
```

## Testing After Flush

```cmd
:: Test that the hostname resolves to the new IP
nslookup hostname.example.com

:: Or use ping to verify both DNS resolution and reachability
ping hostname.example.com
```

## Flushing DNS via PowerShell

```powershell
# Clear the DNS cache (Windows 8+)

Clear-DnsClientCache

# Verify
Get-DnsClientCache
# Should return empty or minimal entries
```

## Flushing DNS on a Remote Computer

```powershell
# Flush DNS on a remote Windows machine
Invoke-Command -ComputerName "REMOTE-SERVER" -ScriptBlock {
    ipconfig /flushdns
}
```

## Restarting the DNS Client Service

If flushing alone does not resolve the issue, restart the DNS Client service:

```cmd
:: Restart the Windows DNS Client service
net stop dnscache
net start dnscache

:: Or use PowerShell
Restart-Service -Name dnscache
```

## Checking the DNS Client Service

```cmd
:: Verify the DNS Client is running
sc query dnscache
```

## Notes on Negative Caching

Windows caches **negative responses** (NXDOMAIN - "host not found") too. These are also cleared by `ipconfig /flushdns`. This is relevant when testing a new hostname that did not exist until recently.

## Conclusion

`ipconfig /flushdns` is a one-second operation that resolves a surprising number of DNS-related connectivity problems. Run it whenever hostname resolution is returning old or incorrect IPs. For programmatic use, `Clear-DnsClientCache` in PowerShell provides the same functionality.

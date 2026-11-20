# Validation summary

## Checks

- Shell blocks passed bash -n.
- BIND nslookup 9.10.6 queried a loopback-only Python UDP fixture using an ephemeral port: expected A answer 192.0.2.80 and exit 0; withheld replies produced timeout and exit 1. Observed question was app.corp.example without suffix expansion.
- Reviewed all command options against Microsoft Windows Server 2025 documentation and BIND 9.18.33 manual.
- Metadata lengths, registered tags, article structure and 1280x720 image dimensions checked. Social image visually inspected: complete readable title and branding.

## Limitations

- No Windows or PowerShell execution; interactive TCP example source-reviewed only.
- No live DNS infrastructure, VPN, firewall, packet capture, resolver failover or application test. Local fixture does not establish Windows retry behavior.

## Sources

- https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/dns-client-resolution-timeouts
- https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientserveraddress?view=windowsserver2025-ps
- https://learn.microsoft.com/en-us/windows-server/networking/dns/troubleshoot/troubleshoot-dns-server
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-timeout
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-retry
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-vc
- https://bind9.readthedocs.io/en/v9.18.33/manpages.html#nslookup-name-server-lookup-utility

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

# Validation summary

## Checks

- Shell examples passed bash -n.
- Executed BIND nslookup 9.10.6 against a loopback-only UDP fixture with explicit search, domain=lab.corp.example and ndots=5. Verified wire questions: api -> api.lab.corp.example; api.prod -> api.prod.lab.corp.example; api.prod. -> api.prod. All returned exit 0.
- Source-reviewed Windows Server 2025 nslookup search/settings syntax, global DNS settings, VPN suffix handling, RFC 1034 absolute names, and BIND 9.18.33 options.
- Metadata and 1280x720 image dimensions checked; visually reviewed complete readable title and branding.

## Limitations

- No Windows/PowerShell execution, real VPN or production DNS queries; interactive Windows snippets were documentation-reviewed only.
- The simulated server answered the first query. The local test does not establish fallback order after negative answers or default search behavior across operating systems or versions.

## Sources

- https://www.rfc-editor.org/rfc/rfc1034.html#section-3.1
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-all
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-search
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-srchlist
- https://bind9.readthedocs.io/en/v9.18.33/manpages.html#nslookup-name-server-lookup-utility
- https://learn.microsoft.com/en-us/powershell/module/dnsclient/get-dnsclientglobalsetting?view=windowsserver2025-ps
- https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/vpn/vpn-name-resolution

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

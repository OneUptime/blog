# Validation summary

## Checks

- Shell examples passed bash -n.
- BIND nslookup 9.10.6 executed against loopback-only UDP fixtures for response codes 3, 2, 5 and 0 with no A answer, plus withheld replies. Verified NXDOMAIN/SERVFAIL/REFUSED messages and exit 1, empty NOERROR reported as No answer with exit 0, and timeout with exit 1 and no response header.
- Reviewed RFC 1035 response codes, RFC 2308 negative answers, RFC 8914 extended errors, RFC 9520 failure caching, official Microsoft command references, BIND 9.18.33 access controls, and Cloudflare DNSSEC troubleshooting.
- Checked metadata and 1280x720 PNG; visually reviewed complete readable title and branding.

## Limitations

- No Windows runtime, live resolver/authority, DNSSEC validation, Extended DNS Error exchange, real access-control policy, TCP connection test, packet capture or application tested.
- Local fixtures demonstrate client rendering of controlled outcomes only; they do not establish root causes in an operational network. Interactive TCP example was source-reviewed, not executed.

## Sources

- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup
- https://www.rfc-editor.org/rfc/rfc1035.html#section-4.1.1
- https://datatracker.ietf.org/doc/html/rfc2308
- https://developers.cloudflare.com/dns/dnssec/troubleshooting/
- https://www.rfc-editor.org/rfc/rfc8914.html
- https://datatracker.ietf.org/doc/html/rfc9520
- https://bind9.readthedocs.io/en/v9.18.33/reference.html
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-vc
- https://bind9.readthedocs.io/en/v9.18.33/manpages.html#nslookup-name-server-lookup-utility

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

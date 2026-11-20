# Validation summary

## Checks

- Shell snippets passed bash -n.
- BIND nslookup 9.10.6 executed against a loopback-only UDP fixture: decoded NXDOMAIN with SOA TTL 420, authoritative A answer, and SOA TTL 600 with MINIMUM 900. Checked wire question types and recursion flag true for recursive query and false for both -norecurse queries.
- Independently checked example initial negative TTL min(600,900)=600 and three-minute remaining lifetime 420 seconds.
- Reviewed RFC 2308, Windows Server 2025 command references, BIND 9.18.33 cache settings, and AWS SOA documentation. AWS NXDOMAIN knowledge-center search result was available; direct page retrieval returned HTTP 403.
- Checked metadata, 1280x720 image dimensions, and visually reviewed complete readable title and branding.

## Limitations

- Fixture supplied deterministic DNS responses; it was not a caching resolver and did not exercise real TTL countdown, replication, forwarding, DNS views or stale-answer policy.
- No Windows runtime, live authoritative or recursive DNS environment, production change, cache invalidation or application test.

## Sources

- https://datatracker.ietf.org/doc/html/rfc2308
- https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/SOA-NSrecords.html
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-debug
- https://datatracker.ietf.org/doc/html/rfc2308#section-2
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-recurse
- https://learn.microsoft.com/en-us/windows-server/networking/dns/troubleshoot/troubleshoot-dns-server
- https://repost.aws/knowledge-center/route-53-troubleshoot-nxdomain-responses
- https://bind9.readthedocs.io/en/v9.18.33/reference.html
- https://learn.microsoft.com/en-us/powershell/module/dnsclient/clear-dnsclientcache?view=windowsserver2025-ps

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

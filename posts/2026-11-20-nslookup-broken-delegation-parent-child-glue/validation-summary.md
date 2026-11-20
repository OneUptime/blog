# Validation summary

## Checks performed

Official RFC9499 terminology, RFC9471 glue, RFC1035 AA, BIND9.18.33 commands/tagged output code, and Windows recursion/d2/TCP options reviewed

All Bash snippets passed bash -n

Actual BIND9.10.6 nslookup executed against local UDP fixtures: parent NS referral plus glue, authoritative child NS, authoritative child SOA; RD false in all questions; AA-clear referral label and AA-set child label behavior verified

Six-node six-edge Mermaid structure checked; generated 1280x720 image visually reviewed

## Limitations

No live parent/child zones, registrar, cache, DNSSEC or IPv6 paths tested

Synthetic fixture checks query construction and response display, not real delegation traversal

Windows d2 and TCP interactive sequence source-reviewed only; BIND debug does not expose identical header output

Mermaid not browser-rendered

## Sources reviewed

- https://www.rfc-editor.org/rfc/rfc9499.html
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-d2
- https://bind9.readthedocs.io/en/v9.18.33/manpages.html#nslookup-name-server-lookup-utility
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-recurse
- https://www.rfc-editor.org/rfc/rfc9471.html
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-set-vc
- https://www.rfc-editor.org/rfc/rfc1035.html#section-4.1.1
- https://github.com/isc-projects/bind9/blob/v9.18.33/bin/dig/nslookup.c

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

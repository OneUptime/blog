# Validation summary

## Checks performed

Official BIND 9.18.33 and Windows command documentation reviewed; glue claims checked against RFC9471 and RFC1034

All shell snippets passed bash -n

Local BIND9.10.6 nslookup executed against loopback UDP fixtures: A answer and NS referral with additional glue; observed exact names/types and RD flag false for -norecurse

Mermaid flowchart structure checked: seven nodes and six edges

1280x720 generated social image visually reviewed; full title readable

## Limitations

No Windows execution, real resolver bootstrap failure, live delegation change or production DNS test

Loopback fixtures test query construction and response display, not recursive resolver behavior or glue correctness in an actual hierarchy

AAAA paths and interactive server selection source-reviewed only

Mermaid not browser-rendered

## Sources reviewed

- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup
- https://bind9.readthedocs.io/en/v9.18.33/manpages.html#nslookup-name-server-lookup-utility
- https://www.rfc-editor.org/rfc/rfc1034.html
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-server
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup-lserver
- https://www.rfc-editor.org/rfc/rfc9471.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

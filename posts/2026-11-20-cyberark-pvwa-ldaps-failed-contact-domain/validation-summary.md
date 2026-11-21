# Validation summary

Reviewed source-host differences and the separate TCP, TLS, bind and directory-search stages. Certificate checking remains enabled throughout.

## Checks

- Two PowerShell snippets parsed using PowerShell 7.5.4
- Official CyberArk configuration and troubleshooting references reviewed for both source paths, trust and all-host validation
- Microsoft certificate and LDAPS diagnostic requirements reviewed; certutil network effects disclosed
- Seven-node six-edge Mermaid structurally reviewed
- 1280x720 social image visually reviewed

## Limitations

- No Windows NetTCPIP, certutil or Ldp.exe execution
- No live directory bind, CyberArk configuration, certificate import or firewall change
- Mermaid not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

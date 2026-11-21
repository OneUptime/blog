# Validation summary

Reviewed official plugin and Microsoft documentation for the distinct Windows-protocol and LDAP paths. The two diagnostic examples passed PowerShell parsing only; no cross-domain environment was available.

## Checks performed

- Both exact PowerShell examples parsed with PowerShell 7.5.4
- Reviewed DNS SRV/A query and TCP listener-test flags against Microsoft Windows Server documentation
- Reviewed illustrative LDAP field values, UPN/LogonDomain rules, Basic+SSL requirement and alternate-UPN limitation against official plugin reference
- Reviewed protocol-specific port discussion, RPC negotiation, TLS certificate requirements and trust/authorization distinction
- Eight-node eight-edge Mermaid structurally reviewed
- 1280x720 social image visually reviewed

## Limitations

- No Windows DNS/TCP commands executed; parser check only
- No live directory bind, TLS handshake, Kerberos exchange, domain trust, password change or reconciliation tested
- LDAP settings are illustrative reviewed fields, not an imported or executed configuration; installed plugin compatibility must be confirmed
- Mermaid not rendered

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

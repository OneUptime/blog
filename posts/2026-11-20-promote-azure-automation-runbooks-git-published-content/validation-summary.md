## Documentation review

Reviewed Microsoft draft/published runbook semantics, source-control publication settings, pinned module availability, import/export/publish command references, Azure context, SHA-256 file hashing and PowerShell parser APIs. Sources are listed in validation.json.

## Local checks

Downloaded the official Az.Automation 1.11.2 package and loaded it with Az.Accounts 5.3.0 under PowerShell 7.4.6. Inspected command parameter metadata and confirmed Draft/Published export slot values. Nine comparison tests passed: four UTF-8 BOM/newline variants accepted, and stale code, case change, whitespace change, removed final newline and added comment rejected. All four published PowerShell blocks parsed. The helper exactly matches tested code. Mermaid structure has eight nodes and seven edges. Generated image was visually reviewed for readability and clipping.

## Limitations

No Azure operations or cloud jobs were executed. The actual import/export serialization, publication behavior, trigger coordination and runtime dependency compatibility require staging verification. Content comparison does not make publication atomic; all writers must be coordinated. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

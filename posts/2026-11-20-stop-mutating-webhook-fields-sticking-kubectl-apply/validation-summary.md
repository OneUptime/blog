# Validation summary

Reviewed client-side three-way merge, server-side field ownership and admission update matching against official documentation and tagged source. The article distinguishes retention by apply from reinsertion by admission.

## Local checks

Compiled and ran the exact Go example against Kubernetes v0.35.0 libraries. Four merge cases passed after review: unowned retention, declared-key removal with map retained, explicit-null removal, and whole-map omission. An initial test exposed that omitting the entire previously declared map removes siblings; the article now explicitly documents that distinction. Checked two read-only shell commands. Generated and visually reviewed the social image.

## Limits

No kubectl or live admission flow ran. The library example does not reproduce all apply bookkeeping or API-server semantics. Server-side apply was reviewed from documentation, not executed. Sources are linked alongside claims and recorded in validation.json.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

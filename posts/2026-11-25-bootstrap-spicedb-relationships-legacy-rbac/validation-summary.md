# Validation summary

Reviewed on 25 November 2026.

## Evidence and tests

Official migration, schema, validation and bulk-ingest documentation was checked against tagged zed1.2.1 import source and the API definitions. This CLI import path uses batched WriteRelationships TOUCH operations and parses its file into memory; it is explicitly distinguished from the streaming bulk API.

Both exact Bash blocks ran with SpiceDB1.57.1's memory datastore and zed1.2.1 over certificate-verified TLS. The official binaries reused from the earlier lab had passed archive SHA256 verification. All five static assertions passed. An intentionally incorrect Bob-manage assertion failed. The six-relationship fixture imported and its two live checks returned Alice allowed and Bob denied.

A separate2101-relationship rehearsal used three WriteRelationships batches of1000,1000 and101. All2100 memberships were read back; a member was allowed and a nonmember denied on the linked project. This was a bounded correctness rehearsal, not a scale benchmark.

Shell syntax, YAML parsing and the seven-node/seven-edge diagram structure passed. The generated1280x720 image was opened and reviewed; its three-line title fits. The local server stopped after testing.

## Limits

No streaming bulk-import call, millions-scale workload, production SQL backend or performance benchmark ran. Source snapshot/CDC coordination, data transformation, shadow checks and cutover protocols need deployment-specific integration validation. Fully consistent memory reads do not demonstrate CockroachDB read-after-write guarantees. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

# Validation summary

Reviewed on 25 November 2026.

## Evidence and tests

Official Authzed documentation identifies the CockroachDB exception. SpiceDB1.57.1 source was inspected for HeadRevision, cluster_logical_timestamp(), explicit AS OF SYSTEM TIME snapshot reads, and the minimum-freshness revision comparison. CockroachDB official timestamp, historical-read and clock-management references were checked. zed1.2.1 source confirms the flags and write token field.

The exact schema passed zed validate, with no static permission assertions defined. All three exact Bash blocks ran against a disposable SpiceDB1.57.1 memory datastore using zed1.2.1 over certificate-verified TLS. Both checks returned HAS_PERMISSION after the grant. These official binaries had previously passed archive SHA256 verification against release checksums. The server was stopped after testing.

The three shell blocks passed syntax checking. The seven-node/six-edge diagram passed structural checks. The generated1280x720 social image was visually inspected; its three-line title fits without clipping.

## Limits

No CockroachDB cluster, deliberately skewed clocks, production database or application integration was exercised. The documented failure mechanism is source-verified, not locally reproduced. No latency measurements or overlap-strategy experiments were performed. The Mermaid diagram uses illustrative numbers and was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

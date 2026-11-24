# Validation summary

Reviewed on 25 November 2026.

## Evidence and scope

Official consistency documentation, pinned zed1.2.1 command source and API proto definitions at e89c0a673a7e234081ed186bd91dd8a30e3e2b03 support the token fields and request shapes. The test reused the official SpiceDB1.57.1 and zed1.2.1 binaries whose archive SHA256 values were verified against release checksums during the adjacent schema-migration review.

The exact schema passed zed validate, and all five exact shell blocks ran against an isolated in-memory SpiceDB server over certificate-verified TLS. Results were initial deny, allow after the grant using its write token, deny after revocation using its write token, and historical allow at the retained grant snapshot. A malformed token failed rather than falling back.

The exact JSON request body, with its placeholder replaced by the test revocation token, was sent to the server's HTTPS /v1/permissions/check endpoint with certificate verification and authentication. It returned PERMISSIONSHIP_NO_PERMISSION. This verifies the HTTP body shape in addition to the CLI path.

Five shell blocks passed bash syntax. The six-node/five-edge Mermaid diagram was structurally checked. The generated1280x720 image was opened and visually reviewed; its three-line title fits without clipping. The server stopped and the temporary token file was removed.

## Limits

The fixture contained one resource and one user with serial writes. No production datastore, distributed CockroachDB setup, cache-latency benchmark or default-read staleness frequency test ran. Application persistence, concurrent token updates, cross-user and inherited-permission propagation, and cache invalidation require separate integration tests. No expired snapshot or caveat scenario ran. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

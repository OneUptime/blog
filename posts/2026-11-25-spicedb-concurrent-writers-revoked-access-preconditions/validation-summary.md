# Validation summary

Reviewed on 25 November 2026.

## Tests and evidence

The official API definitions and tagged SpiceDB1.57.1 transaction/precondition implementation were reviewed. The exact schema passed zed1.2.1 validate with no static permission assertions. All three published Python blocks were assembled without changes and run with Python3.9.6 against a disposable SpiceDB1.57.1 memory datastore over certificate-verified HTTPS. Official binaries reused from the earlier lab had passed release archive SHA256 checks.

The stale request returned the specific precondition-failure reason. The final permission check, constrained by the revocation token, denied Alice. Eight additional simultaneous two-writer trials each admitted exactly one marker transition and rejected the other through its precondition. Both grant-first and revoke-first outcomes occurred. When grant won, the test deliberately completed the still-intended revocation against the winning marker; every final check denied access.

The Python code compiled. The seven-node/six-edge Mermaid diagram passed structural checks. The generated1280x720 image was opened and visually reviewed; its two-line title fits. The local server stopped after testing.

## Limits

These are in-memory API tests, not production SQL isolation or load tests. All-writer participation, single-marker invariants, relationship-read snapshots, external database versioning, inherited permissions, network ambiguity and queue recovery need application integration tests. The marker is an application convention rather than a schema-enforced constraint. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

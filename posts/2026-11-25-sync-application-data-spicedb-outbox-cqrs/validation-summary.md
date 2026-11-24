# Validation summary

Reviewed on 25 November 2026.

## Evidence and execution

Official Authzed integration and dual-write guidance, the API contract, AWS outbox guidance, Python sqlite3 behavior, and SQLite transaction documentation were reviewed. All four exact published Python blocks compiled and executed together with Python3.9.6 and SQLite3.54.0 against SpiceDB1.57.1's memory datastore over certificate-verified HTTPS. The official SpiceDB binary reused from the earlier lab had passed release archive SHA256 checks.

Normal grant-then-revoke delivery printed 2 2 PERMISSIONSHIP_NO_PERMISSION. An injected remote outage left the event pending and the applied version unchanged. A deliberate exception after remote grant success but before acknowledgment left the grant visible remotely and the event pending locally. Replaying that grant before the queued revocation ended with version4 applied and a token-constrained denied result. A SQLite trigger then rejected event insertion; the application update rolled back and no extra event remained.

The seven-node/six-edge Mermaid diagram passed structural checks. The generated1280x720 image was opened and reviewed; its two-line title fits without clipping. The server stopped, database connections closed, and temporary database fixture was removed.

## Limits

The fixture has one document, one user, one worker and no competing relationship writer. It does not implement worker fencing, production request gating, inherited-permission coordination, CQRS consumers or reconciliation. The crash is an injected exception, not a process-kill or storage-durability experiment. No production SQL datastore or load test was run. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

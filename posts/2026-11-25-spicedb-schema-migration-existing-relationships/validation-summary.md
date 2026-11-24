# Validation summary

Reviewed on 25 November 2026.

## Evidence and scope

The article uses SpiceDB1.57.1 and zed1.2.1 official release binaries. Archive SHA256 values matched the official release checksum files; independent artifact-signature verification was not performed. Official documentation and pinned CLI source support the schema, relationship, permission and consistency examples.

All four exact schema files passed zed validate. Those files contain no static relationship assertions, so runtime checks supplied the permission evidence. All six published shell blocks then ran against a disposable in-memory SpiceDB server over certificate-verified TLS. Ten permission results matched the stated allow/deny pairs. The expanded schema preserved Alice's original access while the candidate path initially denied it; after backfill the candidate allowed Alice and continued denying Bob. Cutover and cleanup preserved those outcomes.

A separate premature-final-schema attempt was rejected because the old reader relationship still existed. Repeating the viewer TOUCH succeeded. After exact one-record cleanup, exported data contained viewer only, and writing to the retired reader relation was rejected. The fixture used isolated generated credentials and no TLS verification bypass.

Six shell blocks passed bash syntax. The seven-node/six-edge Mermaid diagram was checked structurally. The generated1280x720 image was opened and visually reviewed; its three-line title fits without clipping. SpiceDB was stopped after the test.

## Limits

The runtime fixture was intentionally small and serial: one document, one granted user and one unrelated denied user. No live application, production datastore, parallel writer, large backfill, caveat, expiration, replication or load test ran. Atomic dual-write and ordered revocation/backfill controls are source-supported production requirements, not features demonstrated by this CLI fixture. Schema syntax acceptance alone is not proof of authorization correctness. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

# Validation summary

Reviewed on 25 November 2026.

## Evidence and execution

Tagged authzed-go1.9.0 retry source was reviewed for conflict branches and its one-request TOUCH fallback. The official bulk API contract, zed1.2.1 import implementation and gRPC1.80.0 certificate helper were checked.

The exact shell setup and complete published Go program ran using Go1.25.8, authzed-go1.9.0 and gRPC1.80.0 against SpiceDB1.57.1's memory datastore over certificate-verified TLS. The official SpiceDB binary reused from the earlier lab had passed release archive SHA256 verification. Each of three mixed-batch raw imports returned AlreadyExists. Fail then returned an error with Bob denied; Skip returned nil with Bob still denied; Touch returned nil with Bob allowed. Output matched all three published lines.

go vet ./... and shell syntax checks passed. The seven-node/six-edge Mermaid diagram passed structural checks. The generated1280x720 image was opened and visually reviewed; its three-line title fits without clipping. The local server stopped after testing.

## Limits

These trials use two relationships and the memory datastore. No production SQL database, high-volume load, ambiguous final response, transient network retry or clock-skew experiment ran. The fallback's request-size implications were source checked, not exercised with an oversized call. Caveat updates, concurrent revocations, partition reconciliation and durable progress storage require separate application tests. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

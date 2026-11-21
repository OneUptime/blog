# Validation summary

Reviewed current official backup/replication guidance and pinned NATS CLI 0.2.2 source/help. The article explicitly separates tested stream snapshots from documentation-reviewed quorum and membership procedures.

## Executed checks

Verified the official CLI archive checksum. Two disposable NATS Server 2.11.4 instances exercised backup with consumer state, isolated restore, JSON inspection, and existing-stream rejection. nats-py 2.10.0 confirmed all payloads, headers, sequence bounds and saved acknowledgment floor. The restored consumer resumed at sequence two while the source stayed unchanged. Temporary data and both owned servers were cleaned up.

The eight-edge Mermaid structure passed. The generated 1280x720 social image was visually reviewed and is readable.

## Limits

No peer removal, quorum failure, cluster restore, production cutover, external database recovery or security/transfer integration was tested. The release checksum was checked without signature verification. Mermaid was not graphically rendered. Sources and test details are recorded in validation.json.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.

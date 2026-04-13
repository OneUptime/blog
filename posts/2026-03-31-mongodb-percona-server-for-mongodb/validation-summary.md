# Validation Summary: How to Use Percona Server for MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Percona Server for MongoDB (PSMDB) 7.0
- MongoDB
- Percona Monitoring and Management (PMM)
- KMIP encryption
- Docker (for PMM deployment)

## Sources Consulted
- Percona Server for MongoDB 7.0 documentation — https://docs.percona.com/percona-server-for-mongodb/7.0/
- PSMDB 7.0 installation (apt) — https://docs.percona.com/percona-server-for-mongodb/7.0/install/apt.html
- PSMDB 7.0 installation (yum) — https://docs.percona.com/percona-server-for-mongodb/7.0/install/yum.html
- PSMDB 7.0 hot backup — https://docs.percona.com/percona-server-for-mongodb/7.0/hot-backup.html
- PSMDB 7.0 audit logging — https://docs.percona.com/percona-server-for-mongodb/7.0/audit-logging.html
- PSMDB 7.0 KMIP encryption — https://docs.percona.com/percona-server-for-mongodb/7.0/kmip.html
- PSMDB 7.0 in-memory engine — https://docs.percona.com/percona-server-for-mongodb/7.0/inmemory.html

## Issues Found

1. **MongoRocks/RocksDB listed as a feature**: MongoRocks storage engine was deprecated and removed well before PSMDB 7.0. Since the post targets PSMDB 7.0 (via `psmdb-70` setup), this feature is not available. Removed from the feature list.

2. **Hot backup command used `db.adminCommand()` instead of `db.runCommand()`**: The official Percona documentation uses `db.runCommand({ createBackup: 1, backupDir: "..." })`. Changed to match the docs.

3. **Shell variable `$(date +%F)` in mongo shell string**: The `$(date +%F)` shell expansion syntax does not work inside the MongoDB/mongosh JavaScript shell — it would be treated as a literal string. Replaced with a static path `/var/backups/mongodb/backup1`.

4. **Invalid `encryptionKeyIdentifier` field**: The field `encryptionKeyIdentifier` does not exist in the PSMDB configuration. The correct field is `security.kmip.keyIdentifier`, placed inside the `kmip` block. Moved and renamed accordingly.

5. **Misleading encryption section text**: The text said "For local testing, use the local key management option" but then showed KMIP server configuration (which requires a remote KMIP server). Updated the text to accurately describe the KMIP configuration being shown.

6. **AGPL license claim**: MongoDB (and by extension PSMDB) switched from AGPL to SSPL (Server Side Public License) in October 2018. The summary incorrectly stated AGPL. Changed to SSPL.

7. **`psmdb70` vs `psmdb-70`**: The percona-release tool uses `psmdb-70` (with hyphen) as the product identifier for PSMDB 7.0. Changed both occurrences.

## Review Notes
- The `tail -f ... | python3 -m json.tool` command for viewing audit logs is suboptimal — `python3 -m json.tool` reads until EOF, so it won't produce incremental output with `tail -f`. Using `jq .` would be more appropriate for streaming JSON. Left as-is since it's a usability concern rather than a technical error.
- The PMM deployment example is simplified (no data volume for persistence). Production PMM deployments typically use a named volume or data container.
- The audit log filter uses YAML folded scalar (`>`) syntax which works but differs from the official docs which show single-quoted JSON strings. Left as-is since both approaches produce valid YAML.

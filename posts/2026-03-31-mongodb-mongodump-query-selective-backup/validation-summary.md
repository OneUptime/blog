# Validation Summary: How to Use mongodump with --query for Selective Backups in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- mongodump (MongoDB Database Tools)
- mongorestore (MongoDB Database Tools)
- Bash scripting

## Sources Consulted
- MongoDB mongodump documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB mongorestore documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Extended JSON (v2) reference: https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/

## Issues Found
- **Incorrect `$numberLong` timestamp**: The canonical Extended JSON date example used `1740787200000`, which corresponds to 2025-03-01T00:00:00Z, not 2026-03-01T00:00:00Z as implied by the preceding relaxed-format example. Corrected to `1772323200000` (2026-03-01T00:00:00Z) so the two examples represent the same date query in different Extended JSON formats.

## Review Notes
- The scripting example uses `date -d "90 days ago"`, which is GNU coreutils syntax (Linux). On macOS, the equivalent is `date -v-90d`. This is acceptable since most MongoDB production deployments run on Linux, but readers on macOS should be aware.
- All mongodump flags (`--uri`, `--db`, `--collection`, `--query`, `--out`, `--gzip`, `--archive`, `--authenticationDatabase`) are valid and correctly used.
- The `--query` flag correctly requires `--collection` to be specified, as stated.
- Extended JSON v2 syntax for `$date`, `$oid`, and `$numberLong` is correctly used throughout.
- The `mongorestore` example correctly uses `--nsFrom`/`--nsTo` for namespace remapping.

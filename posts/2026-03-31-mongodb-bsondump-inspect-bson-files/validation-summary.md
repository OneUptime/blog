# Validation Summary: How to Use bsondump to Inspect BSON Files in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- bsondump (MongoDB Database Tools)
- mongodump
- mongosh
- BSON (Binary JSON)

## Sources Consulted
- MongoDB Database Tools documentation for bsondump: https://www.mongodb.com/docs/database-tools/bsondump/
- MongoDB Database Tools installation guide: https://www.mongodb.com/docs/database-tools/installation/installation/
- MongoDB Extended JSON (v2) specification: https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/
- mongosh documentation: https://www.mongodb.com/docs/mongodb-shell/

## Issues Found
- **Incorrect description of `--type=debug` format**: The post described `--type=debug` as "Legacy extended JSON (MongoDB 2.x compatible)". This is incorrect. The `debug` type outputs a non-standard, human-readable format that shows BSON type wrappers (e.g., `ObjectId()`, `NumberDecimal()`). It is not legacy extended JSON, not MongoDB 2.x compatible, and not parseable as JSON. Changed the comment to: "Non-standard debug format - human-readable but not parseable JSON".

## Review Notes
- The `wc -l` technique for counting documents works correctly because `bsondump` writes JSON documents to stdout and status/log messages to stderr.
- The `grep` filtering examples assume compact JSON output (no spaces between keys/values). This is correct for `bsondump`'s default `--type=json` output, which produces compact Extended JSON v2.
- All installation commands, CLI flags (`--outFile`, `--type`, `--version`), and example pipelines are accurate for current MongoDB Database Tools (100.x).

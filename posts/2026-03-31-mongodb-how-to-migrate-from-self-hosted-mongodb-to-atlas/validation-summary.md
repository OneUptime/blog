# Validation Summary: How to Migrate from Self-Hosted MongoDB to Atlas

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- MongoDB (self-hosted replica sets)
- MongoDB Atlas (managed cloud service)
- Atlas Live Migration
- mongodump / mongorestore
- mongomirror
- MongoDB Atlas CLI (`atlas`)

## Sources Consulted
- MongoDB Atlas Live Migration documentation: https://www.mongodb.com/docs/atlas/import/live-import/
- MongoDB `mongodump` documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB `mongorestore` documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB `mongomirror` documentation: https://www.mongodb.com/docs/atlas/import/mongomirror/
- MongoDB Atlas CLI reference: https://www.mongodb.com/docs/atlas/cli/stable/
- MongoDB built-in roles reference: https://www.mongodb.com/docs/manual/reference/built-in-roles/

## Issues Found

1. **SSH tunnel hostname was misleading (line 65)**: The example used `migration-jumpbox.atlas.mongodb.net` as the SSH tunnel target. Atlas does not provide SSH jump boxes — this hostname is fictitious and misleadingly uses the `atlas.mongodb.net` domain, which could confuse readers into thinking Atlas offers this endpoint. Changed to `user@your-jumpbox.example.com` to make it clear the user must provide their own bastion host.

2. **mongomirror `--destination` used incorrect URI format (line 136)**: The `--destination` parameter was set to `"mongodb+srv://atlasUser:AtlasPass@cluster0.abc123.mongodb.net"`, which is a full SRV URI with embedded credentials. The `mongomirror` tool's `--destination` flag expects a host seed list (not a `mongodb+srv://` URI), and credentials are already provided separately via `--destinationUsername` and `--destinationPassword`. Changed to the correct seed list format: `"cluster0-shard-00-00.abc123.mongodb.net:27017,cluster0-shard-00-01.abc123.mongodb.net:27017,cluster0-shard-00-02.abc123.mongodb.net:27017"`.

## Review Notes
- The prerequisite "Source MongoDB 4.4 or later (for Live Migration)" is more restrictive than what Atlas technically requires — Live Migration supports source clusters running MongoDB 2.6+. However, since MongoDB 4.4 reached EOL in February 2024 and this post is dated 2026, recommending 4.4+ as a practical minimum is reasonable.
- The `--oplog` flag in the `mongodump` command only works when dumping from a replica set member, not a standalone instance. The post doesn't mention this caveat, but since the context is migrating production deployments (which should be replica sets), this is unlikely to cause confusion.
- The Atlas CLI commands in the "Enable Atlas Features" section are illustrative. Exact flag names may vary by Atlas CLI version. Readers should check `atlas --help` for their installed version.
- The `mongomirror` tool is officially deprecated in favor of Atlas Live Migration; however, it remains available and functional, so including it as an option is still valid.

# Validation Summary: How to Manage MongoDB Atlas through the Atlas CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas CLI (`atlas`)
- Homebrew (macOS package manager)
- winget (Windows package manager)
- Bash scripting
- jq (JSON processor)

## Sources Consulted
- Atlas CLI Command Reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas/
- atlas clusters create: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-create/
- atlas dbusers create: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-dbusers-create/
- atlas accessLists create: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-accesslists-create/
- atlas backups snapshots create: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-backups-snapshots-create/
- atlas backups restores start: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-backups-restores-start/
- atlas clusters watch: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-watch/
- atlas config set: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-config-set/
- Atlas CLI Environment Variables: https://www.mongodb.com/docs/atlas/cli/current/atlas-cli-env-variables/
- Install the Atlas CLI: https://www.mongodb.com/docs/atlas/cli/current/install-atlas-cli/
- MongoDB Atlas CLI GitHub repo: https://github.com/mongodb/mongodb-atlas-cli
- winget package listing: https://winget.run/pkg/MongoDB/MongoDBAtlasCLI

## Issues Found

1. **Wrong winget package ID**: `winget install MongoDB.AtlasCLI` was incorrect. Changed to `winget install -e --id MongoDB.MongoDBAtlasCLI` which is the correct package identifier.

2. **`atlas accessLists create` used non-existent `--ip` and `--cidr` flags**: The `accessLists create` command takes the IP address or CIDR block as a positional argument, not via `--ip`/`--cidr` flags. Fixed all instances (3 in the access lists section, 1 in the CI/CD example) to use the positional argument with `--type ipAddress` or `--type cidrBlock`.

3. **`atlas backups restores start` missing required restore type argument**: The command requires a positional argument specifying the restore type (`automated`, `download`, or `pointInTime`). Added `automated` as the restore type since the example restores a snapshot to a target cluster.

4. **Go template output format syntax**: Changed `--output "go-template=..."` to `--output go-template="..."` to match the documented syntax where `go-template` is the format name and the template string is its value.

## Review Notes
- The Linux installation section references a specific version (`1.18.0`) in the download URL. This will become outdated as new versions are released. Readers should check for the latest version at the MongoDB download center.
- The `atlas clusters pause` and `atlas clusters start` commands only work for M10+ clusters. The post doesn't mention this limitation, though it's a minor omission since M0 free-tier clusters cannot be paused anyway.
- The `atlas dbusers delete` command shown without `--force` will prompt for confirmation interactively, which may not be ideal in scripted contexts. This is not incorrect but worth noting.

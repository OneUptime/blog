# Validation Summary: How to View Logs and Metrics with the Atlas CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- Atlas CLI (`atlas`)
- Shell scripting (Bash)
- jq (JSON processing)

## Sources Consulted
- MongoDB Atlas CLI documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-describe/
- MongoDB Atlas CLI documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-processes-list/
- MongoDB Atlas CLI documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-logs-download/
- MongoDB Atlas CLI documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-metrics-processes/
- MongoDB Atlas CLI documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-metrics-disks/
- MongoDB Atlas CLI documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-metrics-databases/
- MongoDB Atlas CLI documentation: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-alerts-list/

## Issues Found

1. **`.mongoURIWithOptions` field does not exist in current Atlas CLI output** (line 20): The `atlas clusters describe` JSON output uses a `connectionStrings` object, not `mongoURIWithOptions` (which was a legacy v1 API field). Changed `jq '.mongoURIWithOptions'` to `jq '.connectionStrings.standardSrv'`.

2. **`--clusterName` flag does not exist on `atlas logs download`** (lines 30, 52): The `atlas logs download` command identifies the host via the positional `<hostname>` argument, not a `--clusterName` flag. Removed `--clusterName myCluster` from both log download examples.

3. **`--output` is not the correct flag for specifying output file path** (lines 31, 55): The `atlas logs download` command uses `--out` to specify the destination file path. The `--output` flag on other Atlas CLI commands controls the output format (json, etc.), not the file path. Changed `--output` to `--out` in both log download examples.

4. **`atlas metrics disks` requires a subcommand** (line 101): `atlas metrics disks` is a parent command with `list` and `describe` subcommands. Changed to `atlas metrics disks list` to list available disk partitions.

5. **`atlas metrics databases` requires a subcommand** (line 109): `atlas metrics databases` is a parent command with `list` and `describe` subcommands. Changed to `atlas metrics databases describe` to get metrics for a specific database.

## Review Notes
- The metric names listed (CONNECTIONS, OPCOUNTER_INSERT, OPCOUNTER_QUERY, QUERY_TARGETING_RATIO, MEMORY_RESIDENT, etc.) are consistent with known Atlas monitoring metric naming conventions but the Atlas CLI docs defer to the Atlas API OpenAPI spec for the authoritative enum. They are very likely correct but could not be confirmed character-for-character against the spec.
- The health check script uses `$HOSTNAME` (a shell variable) which in many systems is automatically set to the machine's hostname, not an Atlas hostname. This could confuse readers, but it is a scripting convention choice, not a technical error.
- Additional valid log types (`mongosqld.gz`, `mongos-audit-log.gz`) exist but were not listed in the post. This is a minor omission, not an error.

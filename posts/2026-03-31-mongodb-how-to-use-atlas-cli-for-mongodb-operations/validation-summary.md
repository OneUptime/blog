# Validation Summary: How to Use Atlas CLI for MongoDB Operations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas CLI (`atlas`)
- MongoDB Atlas (cluster management, backups, monitoring)
- Homebrew, APT, Chocolatey (installation)
- GitHub Actions (CI/CD integration)

## Sources Consulted
- MongoDB Atlas CLI official documentation: https://www.mongodb.com/docs/atlas/cli/current/
- `atlas accessLists create` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-accessLists-create/
- `atlas metrics processes` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-metrics-processes/
- `atlas logs download` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-logs-download/
- `atlas performanceAdvisor suggestedIndexes list` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-performanceAdvisor-suggestedIndexes-list/
- `atlas performanceAdvisor slowQueryLogs list` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-performanceAdvisor-slowQueryLogs-list/
- Chocolatey package listing for MongoDB Atlas: https://community.chocolatey.org/packages/mongodb-atlas

## Issues Found

1. **Chocolatey package name incorrect**: Was `mongodb-atlas-cli`, corrected to `mongodb-atlas`. The Chocolatey package is named `mongodb-atlas`, not `mongodb-atlas-cli`.

2. **`accessLists create` syntax incorrect**: Used `--cidr "10.0.0.0/8"` flag which does not exist. The CIDR entry is a positional argument and requires `--type cidrBlock`. Corrected to `atlas accessLists create "10.0.0.0/8" --type cidrBlock --comment "Internal network"`.

3. **`atlas metrics processes` takes hostname:port, not cluster name**: The command was using `myCluster` as the argument, but it requires a `hostname:port` value (obtainable via `atlas processes list`). Added a comment explaining this and changed the argument to `<hostname:port>`.

4. **`atlas metrics processes` flag `--metrics` does not exist**: The correct flag is `--type`. Changed `--metrics` to `--type`.

5. **`atlas logs download` takes a hostname, not a cluster name**: Changed from `myCluster` to `<hostname>` with a comment explaining how to find the hostname.

6. **`atlas logs download` log file name incorrect**: Was `mongod.gz`, corrected to `mongodb.gz`. Valid values are `mongodb.gz`, `mongos.gz`, `mongosqld.gz`, `mongodb-audit-log.gz`, `mongos-audit-log.gz`.

7. **`atlas logs download` output flag incorrect**: Was `--output`, corrected to `--out`. The `--output` / `-o` flag is typically used for format selection (e.g., `json`), while `--out` specifies the output file path.

8. **`performanceAdvisor` commands use incorrect `--clusterName` flag**: Both `suggestedIndexes list` and `slowQueryLogs list` used `--clusterName myCluster`, but the correct flag is `--processName` which takes a `hostname:port` value.

9. **`slowQueryLogs list` uses non-existent `--until` flag**: The `--until` flag does not exist. The command uses `--duration` (in milliseconds) to specify the time window from the `--since` timestamp. Changed to `--duration 86400000` (24 hours in milliseconds).

## Review Notes
- The Linux APT installation method uses a GPG key URL (`server-cli.asc`) that may change over time. The official MongoDB docs should be consulted for the most current installation instructions.
- The `actions/checkout@v3` in the GitHub Actions example could be updated to `@v4`, though v3 still works.
- The `date -d` flag used in examples is GNU coreutils-specific and will not work on macOS without `gdate`. This is a minor portability note since the examples target Linux CI environments.
- MongoDB Atlas now also supports Service Account authentication (`MONGODB_ATLAS_CLIENT_ID` and `MONGODB_ATLAS_CLIENT_SECRET`) as a newer alternative to API keys, though the API key approach documented here remains valid.

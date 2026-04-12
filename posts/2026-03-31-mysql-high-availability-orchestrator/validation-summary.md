# Validation Summary: How to Set Up MySQL High Availability with Orchestrator

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (replication, high availability)
- Orchestrator (openark/orchestrator v3.2.6)
- GTID-based replication and failover
- Virtual IP / DNS failover hooks

## Sources Consulted
- [Orchestrator GitHub repository](https://github.com/openark/orchestrator)
- [Orchestrator config.go source (Configuration struct)](https://github.com/openark/orchestrator/blob/master/go/config/config.go)
- [Orchestrator install.md (required privileges)](https://github.com/openark/orchestrator/blob/master/docs/install.md)
- [Orchestrator configuration-recovery.md](https://github.com/openark/orchestrator/blob/master/docs/configuration-recovery.md)
- [Orchestrator configuration-failure-detection.md](https://github.com/openark/orchestrator/blob/master/docs/configuration-failure-detection.md)
- [Orchestrator topology-recovery.md (hook parameters)](https://github.com/openark/orchestrator/blob/master/docs/topology-recovery.md)
- [Orchestrator v3.2.6 release page](https://github.com/openark/orchestrator/releases/tag/v3.2.6)

## Issues Found

1. **Incorrect hook parameter name `OnFailoverDetectionProcesses`**: The blog used `OnFailoverDetectionProcesses` in the failover hooks JSON snippet. This parameter does not exist in orchestrator's Configuration struct. The correct name is `OnFailureDetectionProcesses`. Fixed to `OnFailureDetectionProcesses`.

2. **Non-existent config parameter `AutomaticRecoveryModeActive`**: This parameter does not exist in orchestrator's configuration. Automatic master recovery is enabled by setting `RecoverMasterClusterFilters` to `["*"]`, which was already present in the config. Removed the invalid parameter.

3. **Missing `RELOAD` privilege in SQL GRANT**: The official orchestrator documentation specifies that the topology user requires the `RELOAD` privilege (needed for `RESET SLAVE` operations). The blog post omitted it. Added `RELOAD` to the GRANT statement.

## Review Notes
- The `REPLICATION CLIENT` privilege included in the GRANT is not listed in the official minimal required privileges but is not harmful and is useful for `SHOW MASTER STATUS` / `SHOW SLAVE STATUS` commands. Kept as-is.
- The download URL for v3.2.6 (`orchestrator-3.2.6-linux-amd64.tar.gz`) is confirmed to exist as a release asset on GitHub.
- CLI commands (`discover`, `topology`, `graceful-master-takeover` with `-d` flag, `recover`) are all verified correct per official docs.
- Hook placeholder variables (`{failedHost}`, `{successorHost}`, `{successorPort}`) are confirmed valid.
- The default web UI port 3000 is correct.
- For MySQL 8.0+, the `SUPER` privilege is deprecated in favor of more granular dynamic privileges, but this is acceptable for a general tutorial and the post does not claim a specific MySQL version.

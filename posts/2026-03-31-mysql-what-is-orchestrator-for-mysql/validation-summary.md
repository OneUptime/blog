# Validation Summary: What Is Orchestrator for MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL Orchestrator (openark/orchestrator)
- MySQL replication (standard async/semi-sync)
- ProxySQL (admin interface for failover hooks)
- Raft consensus (for Orchestrator HA)

## Sources Consulted
- Orchestrator GitHub repository and documentation: https://github.com/openark/orchestrator
- Orchestrator configuration reference: https://github.com/openark/orchestrator/blob/master/docs/configuration.md
- Orchestrator FAQ and topology recovery docs: https://github.com/openark/orchestrator/blob/master/docs/topology-recovery.md
- Orchestrator Raft documentation: https://github.com/openark/orchestrator/blob/master/docs/raft.md
- ProxySQL admin interface documentation: https://proxysql.com/documentation/
- MySQL GRANT statement reference: https://dev.mysql.com/doc/refman/8.0/en/grant.html

## Issues Found
1. **Architecture diagram: incorrect monitoring mechanism** - The diagram stated Orchestrator monitors MySQL via "INFO_SCHEMA". Orchestrator primarily discovers and monitors replication topology via `SHOW SLAVE STATUS` / `SHOW REPLICA STATUS` and related replication status commands, not through `INFORMATION_SCHEMA` queries. Changed the diagram label to "replication status commands" to accurately reflect how Orchestrator works.

## Review Notes
- Orchestrator was originally created by Shlomi Noach at Outbrain (not at GitHub as the post implies), though it saw significant development and adoption at GitHub. This is a common simplification and not technically harmful.
- The `SUPER` privilege granted to the orchestrator MySQL user is deprecated in MySQL 8.0+ in favor of granular dynamic privileges. For MySQL 8.0+, users may want to use specific privileges like `REPLICATION_SLAVE_ADMIN`, `SYSTEM_VARIABLES_ADMIN`, etc. The post's grants are correct for MySQL 5.7 and still functional in 8.0.
- The ProxySQL hook script shows a filename comment (`# /usr/local/bin/update-proxysql.sh`) before the shebang (`#!/bin/bash`). This is a standard blog convention to indicate the file path, but readers should note that the shebang must be the first line of the actual file.
- All configuration keys, CLI commands, Raft configuration parameters, and ProxySQL admin SQL were verified as correct.

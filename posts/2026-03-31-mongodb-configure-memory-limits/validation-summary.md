# Validation Summary: How to Configure Memory Limits for MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (7.0 referenced in Docker example)
- WiredTiger storage engine
- Docker (memory limits, cgroups)
- Kubernetes (resource limits)
- mongostat CLI tool
- Linux kernel tuning (vm.swappiness, transparent huge pages)

## Sources Consulted
- MongoDB official documentation on WiredTiger cache size: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.wiredTiger.engineConfig.cacheSizeGB
- MongoDB official documentation on serverStatus: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB official documentation on mongostat: https://www.mongodb.com/docs/database-tools/mongostat/
- MongoDB production notes (THP, vm.swappiness): https://www.mongodb.com/docs/manual/administration/production-notes/
- Docker documentation on memory limits: https://docs.docker.com/config/containers/resource_constraints/

## Issues Found

1. **mongostat `faults` column reference (line 93)**: The post advised watching the `faults` column in `mongostat` output, describing it as "page faults indicating swap." The `faults` column was relevant for the MMAPv1 storage engine, which was removed in MongoDB 4.2. With WiredTiger (default since MongoDB 3.2 and the only engine in 7.0), this column is not present in `mongostat` output. Changed to reference the `dirty` column (percentage of dirty data in WiredTiger cache), which is a meaningful metric for WiredTiger-based deployments.

2. **Inaccurate "50-60% of container memory limit" rule of thumb (line 72)**: The post stated "set `cacheSizeGB` to about 50-60% of the container memory limit," but the example itself used 1.5GB with a 4Gi limit (~37.5%). This matched MongoDB's actual default formula of 50% of (RAM - 1GB), not the stated 50-60% rule. The 50-60% rule could also lead to OOM in smaller containers by leaving insufficient room for the OS page cache and connection overhead. Updated to reference MongoDB's actual default formula. Also updated the summary paragraph (line 113) which repeated the same inaccurate claim.

## Review Notes
- The `mongod.conf` YAML structure, command-line flags, Docker command, and Kubernetes resource spec are all correct.
- The `db.serverStatus().wiredTiger.cache` path and the listed cache statistics fields are accurate.
- The THP and vm.swappiness recommendations align with MongoDB production notes.
- The WiredTiger default cache size formula ("50% of (RAM - 1 GB), with a minimum of 256 MB") is accurately stated.

# Validation Summary: How to Configure wiredTigerCacheSizeGB for MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- mongod.conf configuration
- mongosh shell commands
- Docker / Kubernetes container environments

## Sources Consulted
- MongoDB official documentation: WiredTiger storage engine configuration (https://www.mongodb.com/docs/manual/reference/configuration-options/#storage.wiredTiger.engineConfig.cacheSizeGB)
- MongoDB official documentation: serverStatus command (https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- MongoDB official documentation: setParameter with wiredTigerEngineRuntimeConfig (https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.wiredTigerEngineRuntimeConfig)
- MongoDB SERVER tickets and release notes regarding cgroup memory detection (SERVER-37498, SERVER-62519)

## Issues Found
1. **Container memory detection claim was outdated.** The post stated "MongoDB reads the host RAM, not the container limit" as a blanket statement. This was true for older MongoDB versions but is no longer accurate. MongoDB 4.0.14+/4.2.1+ added cgroup v1 memory limit detection, and MongoDB 6.0.5+/7.0+ added cgroup v2 support. Updated the statement to clarify the version-dependent behavior while preserving the recommendation to set cache size explicitly.

## Review Notes
- The `engine: wiredTiger` field in the mongod.conf example is unnecessary since WiredTiger has been the only supported storage engine since MongoDB 4.2. It is not incorrect, but could be omitted for brevity in future revisions.
- The default cache formula `max(0.5 * (RAM - 1 GB), 256 MB)` is correct per current MongoDB documentation.
- The runtime configuration command using `wiredTigerEngineRuntimeConfig` with WiredTiger-native `cache_size=4G` syntax is correct.
- The `serverStatus()` verification approach and cache utilization monitoring script are both accurate.
- The sizing guidelines table provides reasonable general recommendations consistent with MongoDB best practices.

# Validation Summary: Redis vs KeyDB: Performance and Compatibility Comparison

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Redis
- KeyDB
- RESP protocol
- Redis Cluster
- Redis Sentinel / KeyDB Sentinel
- Redis and KeyDB configuration
- Redis and KeyDB benchmarking tools
- Python redis client

## Sources Consulted
- Redis licenses: https://redis.io/legal/licenses/
- Redis Open Source comparison and Redis 8 licensing: https://redis.io/compare/open-source/
- Redis benchmark documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/
- Redis hash field expiration commands: https://redis.io/docs/latest/commands/hexpire/
- Redis hashes data type documentation: https://redis.io/docs/latest/develop/data-types/hashes/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- KeyDB compatibility documentation: https://docs.keydb.dev/docs/compatibility/
- KeyDB multi-master documentation: https://docs.keydb.dev/docs/multi-master/
- KeyDB EXPIREMEMBER command documentation: https://docs.keydb.dev/docs/commands/#expiremember
- KeyDB benchmarking documentation: https://docs.keydb.dev/docs/benchmarking/
- KeyDB FLASH documentation: https://docs.keydb.dev/docs/flash/
- KeyDB PPA and DEB installation documentation: https://docs.keydb.dev/docs/ppa-deb/
- KeyDB support guidelines: https://docs.keydb.dev/docs/support/
- KeyDB GitHub README and release metadata: https://github.com/Snapchat/KeyDB

## Issues Found
- Redis licensing was outdated. Updated the comparison from "SSPL" to Redis 8.0+ AGPLv3, with the Redis 7.4-7.8 RSALv2/SSPLv1 caveat.
- The post overstated KeyDB as "100% compatible" with all Redis clients and commands. Changed the wording to Redis protocol and common Redis client compatibility, and clarified command compatibility for the Redis command set KeyDB tracks.
- Redis subkey expiration information was outdated. Redis 7.4+/8.0+ supports hash-field expiration, so the Redis equivalent section now uses `HEXPIRE` for hash fields and keeps separate-key/sorted-set workarounds for set members.
- The KeyDB namespace section incorrectly described KeyDB-specific namespace authentication. Reworked it as logical databases and ACL key-pattern restrictions, which both Redis and KeyDB support.
- KeyDB active-active replication examples were missing `active-replica yes` and did not follow the documented option order. Added `active-replica yes` before `replicaof`.
- Conflict resolution was overspecified as timestamp-based last-write-wins. Updated it to KeyDB's documented last-operation-wins behavior and noted undefined same-key conflicts across masters.
- KeyDB FLASH configuration included an unsupported `flash-max-memory` directive. Replaced it with documented `storage-provider flash`, `maxmemory`, and `maxmemory-policy` settings.
- KeyDB benchmarking used `keydb-benchmark` with threaded expectations. Updated the KeyDB example to use `memtier_benchmark`, which KeyDB recommends for high-throughput tests.
- KeyDB installation commands used an outdated PPA URL and key location. Updated them to the documented `open-source-dist` repository and keyring command.
- KeyDB support was listed as commercial support from Snap Inc. Updated it to no paid support services, with community support managed by Snap Inc.
- KeyDB release cadence was described as regular releases. Updated it to note that the latest GitHub release is KeyDB v6.3.4 from October 2023.
- The `server-threads` default was listed as 1. Updated it to 2 based on KeyDB's current README.

## Review Notes
Benchmark figures in the post remain illustrative and should be re-measured on the reader's hardware and workload. KeyDB FLASH is documented as beta/experimental, so production use should include workload-specific testing and rollback planning.

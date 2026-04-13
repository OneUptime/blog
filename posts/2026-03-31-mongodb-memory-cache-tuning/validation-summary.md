# Validation Summary: How to Tune MongoDB Memory and Cache Settings

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- mongosh (MongoDB Shell)
- Linux kernel tuning (THP, vm.swappiness, NUMA)
- Docker / Kubernetes container memory
- systemd service configuration

## Sources Consulted
- MongoDB official documentation: WiredTiger storage engine configuration (https://www.mongodb.com/docs/manual/reference/configuration-options/#storage.wiredTiger.engineConfig.cacheSizeGB)
- MongoDB official documentation: Production Notes — memory and storage (https://www.mongodb.com/docs/manual/administration/production-notes/)
- MongoDB official documentation: Disable Transparent Huge Pages (https://www.mongodb.com/docs/manual/tutorial/transparent-huge-pages/)
- MongoDB official documentation: db.serverStatus() output fields (https://www.mongodb.com/docs/manual/reference/command/serverStatus/)
- MongoDB official documentation: NUMA considerations (https://www.mongodb.com/docs/manual/administration/production-notes/#configuring-numa-on-linux)
- Linux kernel documentation: vm.swappiness sysctl parameter
- WiredTiger documentation: cache_size runtime configuration

## Issues Found

1. **Ambiguous default cache size formula** (line 35): The original text said `max(50% of RAM - 1GB, 256MB)`, which is naturally parsed as `(50% * RAM) - 1GB`. The correct MongoDB formula is `50% of (RAM - 1GB)` — 50% of the quantity (RAM minus 1GB). For example, on a 16GB server the correct default is 7.5GB, not 7GB. Fixed to `max(50% of (RAM - 1GB), 256MB)`.

2. **Incorrect "Memory mapped I/O" heading** (line 29): The section was labeled "Memory mapped I/O" but WiredTiger does not use memory-mapped I/O — that was the deprecated MMAPv1 storage engine. WiredTiger uses standard file I/O, and the OS page cache buffers those reads. The explanation of the behavior was correct, but the label was misleading. Changed heading to "OS Page Cache interaction" and added "via standard file I/O" to clarify the mechanism.

## Review Notes
- The WiredTiger cache stat field names used in the monitoring scripts (e.g., `"modified pages evicted"`, `"unmodified pages evicted"`, `"pages requested from the cache"`, `"pages read into cache"`) are correct for recent MongoDB versions but may vary across versions. Readers targeting specific versions should verify field names by inspecting `db.serverStatus().wiredTiger.cache` on their server.
- The `wiredTigerEngineRuntimeConfig` parameter for runtime cache resizing is correct but is an undocumented/advanced feature. Users should be aware it uses WiredTiger's internal configuration string syntax.
- The best practice "set cacheSizeGB to 50% of the container memory limit" is a simplified recommendation. For small containers (2-4GB), this may be slightly aggressive compared to the default formula which subtracts 1GB before halving. The container section example (1GB cache for 2GB container) is consistent with this guidance.
- The `page_faults` metric from `extra_info` represents OS-level page faults, not WiredTiger-specific cache misses. This distinction is not explicitly made in the post but is worth noting for advanced readers.

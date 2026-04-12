# Validation Summary: How to Monitor MongoDB Page Faults

## Status
validated

## Post Type
Tutorial / Monitoring Guide

## Technologies Covered
- MongoDB (serverStatus command, extra_info, WiredTiger cache metrics)
- WiredTiger storage engine (cache configuration, eviction metrics)
- Python (PyMongo driver for monitoring script)
- MongoDB database profiler (slow query correlation)

## Sources Consulted
- MongoDB serverStatus documentation: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB source code for platform-specific extra_info fields: https://github.com/mongodb/mongo/blob/master/src/mongo/util/processinfo_windows.cpp and https://github.com/mongodb/mongo/blob/master/src/mongo/util/processinfo_linux.cpp
- MongoDB wiredTigerEngineRuntimeConfig parameter documentation: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.wiredTigerEngineRuntimeConfig
- WiredTiger configuration documentation (cache_size option)
- MongoDB storage.wiredTiger.engineConfig.cacheSizeGB documentation

## Issues Found
- **Incorrect platform for extra_info fields**: The post stated "On Linux, this includes:" before showing `usagePageFileMB` and `totalPageFileMB` fields. These are **Windows-only** page file metrics (confirmed via MongoDB source code — `processinfo_windows.cpp` adds these fields, while `processinfo_linux.cpp` does not). Linux reports entirely different fields like `user_time_us`, `system_time_us`, `maximum_resident_set_kb`, etc. Fixed by changing "On Linux" to "On Windows" and adding "page file metrics" for clarity.

## Review Notes
- The `wiredTigerEngineRuntimeConfig` runtime command is valid across MongoDB 6.0-8.0, but MongoDB documentation includes a warning: "Avoid modifying the wiredTigerEngineRuntimeConfig unless under the direction from MongoDB engineers as this setting has major implication across both WiredTiger and MongoDB." The post could mention this caveat in the future.
- The WiredTiger cache stat field names (`maximum bytes configured`, `bytes currently in the cache`, `tracked dirty bytes in the cache`, `pages read into cache`, `pages evicted by application threads`) are all valid WiredTiger cache statistics.
- The default cache size formula `(RAM - 1GB) / 2` and the 16GB example yielding 7.5GB are correct.
- The PyMongo monitoring script is syntactically correct and uses proper API calls.
- The profiling commands and system.profile queries are correct.

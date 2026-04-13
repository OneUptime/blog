# Validation Summary: How to Fix MongoError: WiredTiger Error - Cache Full in MongoDB

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- WiredTiger cache and eviction subsystem
- MongoDB Atlas
- Linux disk I/O tools (iostat, iotop)
- MongoDB Atlas CLI

## Sources Consulted
- WiredTiger official documentation — Cache and Eviction Tuning: https://source.wiredtiger.com/develop/tune_cache.html
- WiredTiger Architecture — Eviction: https://source.wiredtiger.com/develop/arch-eviction.html
- WiredTiger Configuration Strings documentation: https://source.wiredtiger.com/2.4.1/config_strings.html
- WiredTiger source code — api_data.py (default values): https://github.com/wiredtiger/wiredtiger/blob/master/dist/api_data.py
- MongoDB source code — wiredtiger_global_options.idl (MongoDB overrides): https://github.com/mongodb/mongo/blob/master/src/mongo/db/storage/wiredtiger/wiredtiger_global_options.idl
- MongoDB serverStatus reference (v7.0): https://www.mongodb.com/docs/v7.0/reference/command/serverStatus/
- MongoDB FAQ: Storage: https://www.mongodb.com/docs/manual/faq/storage/
- MongoDB FAQ: Diagnostics: https://www.mongodb.com/docs/manual/faq/diagnostics/
- MongoDB WiredTiger Storage Engine docs: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB JIRA SERVER-17293 (confirms wiredTigerEngineRuntimeConfig existed in 3.0): https://jira.mongodb.org/browse/SERVER-17293

## Issues Found
1. **Incorrect minimum MongoDB version for runtime cache config** (line 65): The comment stated `wiredTigerEngineRuntimeConfig` was available from "MongoDB 3.2+" but it has been available since MongoDB 3.0 when WiredTiger was first introduced. Fixed to "MongoDB 3.0+".
2. **Misleading TTL index comment** (line 195): The comment said "Archive old data" but TTL indexes delete documents permanently — they do not archive them. Fixed to "Automatically expire old data to reduce hot collection size (TTL index deletes docs after 90 days)".

## Review Notes
- All WiredTiger cache statistic key names (`maximum bytes configured`, `bytes currently in the cache`, `tracked dirty bytes in the cache`, `pages evicted by application threads`) were verified correct against `db.serverStatus()` output.
- All WiredTiger transaction/checkpoint stat keys were verified correct.
- All eviction parameter defaults are accurate for MongoDB context: `eviction_target=80%`, `eviction_trigger=95%`, `eviction_dirty_target=5%`, `eviction_dirty_trigger=20%`. The eviction threads default of 4 is correct for MongoDB (which overrides the WiredTiger default of `threads_min=1, threads_max=8` to `threads_min=4, threads_max=4`).
- The `wiredTigerEngineRuntimeConfig` syntax for both `cache_size=8G` and the combined eviction string is correct per WiredTiger configuration string format.
- The default cache size formula `(RAM - 1GB) / 2` is correct (with the caveat that the actual minimum is 256MB).
- The `mongod.conf` YAML configuration paths are correct.
- The `currentOp` field names and usage are correct.
- The Atlas CLI command syntax is reasonable for the `atlas` CLI tool.

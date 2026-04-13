# Validation Summary: How to Use the hostInfo Command in MongoDB

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MongoDB (hostInfo administrative command)
- mongosh (MongoDB Shell)
- WiredTiger storage engine (cache sizing)
- NUMA (Non-Uniform Memory Access)
- Bash scripting (cross-cluster auditing)

## Sources Consulted
- MongoDB official documentation: hostInfo command (https://www.mongodb.com/docs/manual/reference/command/hostInfo/)
- MongoDB official documentation: Built-in roles (https://www.mongodb.com/docs/manual/reference/built-in-roles/)
- MongoDB official documentation: WiredTiger storage engine cache size (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.wiredTiger.engineConfig.cacheSizeGB)
- MongoDB official documentation: NUMA hardware recommendations (https://www.mongodb.com/docs/manual/administration/production-notes/#mongodb-and-numa-hardware)
- MongoDB official documentation: ulimit recommendations (https://www.mongodb.com/docs/manual/reference/ulimit/)

## Issues Found

1. **Incorrect role listed for hostInfo privilege (line 25)**
   - **What was wrong:** The post stated that the `dbAdmin` role grants access to `hostInfo`. The `dbAdmin` role does not include the `hostInfo` privilege action.
   - **What was changed:** Replaced `dbAdmin` with `hostManager`, which is one of the built-in roles (along with `clusterMonitor`) that includes the `hostInfo` privilege.
   - **Why:** The `hostInfo` action on the cluster resource is granted by `clusterMonitor` and `hostManager` roles, not `dbAdmin`.

2. **Incorrect WiredTiger cache formula (lines 73, 78)**
   - **What was wrong:** The text said "50% of RAM minus 1 GB" and the code computed `ramMB * 0.5 - 1024`, which evaluates to `(RAM/2) - 1 GB`. The actual MongoDB default is `50% of (RAM - 1 GB)`, which evaluates to `(RAM - 1 GB) / 2`.
   - **What was changed:** Updated the text to "50% of (RAM minus 1 GB)" and the code to `(ramMB - 1024) * 0.5`.
   - **Why:** For a 32 GB server, the post's formula gives 15 GB vs the correct 15.5 GB (small difference), but for a 4 GB server, the post's formula gives 1 GB vs the correct 1.5 GB (significant 50% error). The parenthesization matters.

3. **Incorrect cache size example for 4 GB RAM (line 84)**
   - **What was wrong:** The post stated the default cache for 4 GB RAM is "roughly 1 GB".
   - **What was changed:** Corrected to "roughly 1.5 GB" to match the corrected formula: `(4096 - 1024) * 0.5 = 1536 MB`.
   - **Why:** Consistency with the corrected WiredTiger formula.

## Review Notes
- The example `hostInfo` output JSON is representative and includes the correct field names and structure for modern MongoDB versions (5.0+). Some fields like `memLimitMB`, `numPhysicalCores`, `numCpuSockets`, and `cpuArch` were added in relatively recent versions; the post does not specify a minimum version but the output shown is accurate for current MongoDB.
- The `extra` section fields can vary by operating system. The example shows Linux-specific fields (`libcVersion`, `kernelVersion`, `cpuFeatures`), which is appropriate since the example OS is Ubuntu. On macOS or Windows, different fields may appear.
- The bash audit script correctly uses `mongosh` rather than the deprecated `mongo` shell.

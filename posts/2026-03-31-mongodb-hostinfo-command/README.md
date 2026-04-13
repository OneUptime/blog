# How to Use the hostInfo Command in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Command, Administration, System, Monitoring

Description: Learn how to use MongoDB's hostInfo command to retrieve operating system details, CPU count, memory size, and hardware metadata from a running server.

---

## What Is hostInfo?

`hostInfo` is a MongoDB administrative command that returns information about the host operating system and hardware where the `mongod` process is running. It is useful for capacity planning, troubleshooting performance issues, and auditing the infrastructure that backs your database.

Unlike `buildInfo`, which describes the MongoDB binary, `hostInfo` describes the machine the binary is running on.

## Running hostInfo

Connect with `mongosh` and run:

```javascript
db.adminCommand({ hostInfo: 1 })
```

You must have the `hostInfo` privilege or be in the `clusterMonitor` or `hostManager` role to run this command.

## Reading the Output

```json
{
  "system": {
    "currentTime": "2026-03-31T10:00:00.000Z",
    "hostname": "mongo1.prod.example.com",
    "cpuAddrSize": 64,
    "memSizeMB": 32768,
    "memLimitMB": 32768,
    "numCores": 16,
    "numPhysicalCores": 8,
    "numCpuSockets": 1,
    "cpuArch": "x86_64",
    "numaEnabled": false
  },
  "os": {
    "type": "Linux",
    "name": "Ubuntu 22.04.3 LTS",
    "version": "Kernel 5.15.0"
  },
  "extra": {
    "versionString": "Linux version 5.15.0",
    "libcVersion": "2.35",
    "kernelVersion": "5.15.0",
    "cpuFrequencyMHz": "3600.000",
    "cpuFeatures": "fpu vme de pse tsc ...",
    "pageSize": 4096,
    "numPages": 8388608,
    "maxOpenFiles": 1048576
  },
  "ok": 1
}
```

Key sections:

- `system.memSizeMB` - total physical RAM in megabytes
- `system.numCores` - total logical CPU count (including hyperthreaded cores)
- `system.numPhysicalCores` - physical core count
- `system.numaEnabled` - whether NUMA is active (can impact MongoDB performance)
- `os.type` and `os.name` - operating system type and distribution
- `extra.maxOpenFiles` - the `ulimit -n` value, which bounds open file descriptors

## Checking Memory for WiredTiger Cache Sizing

WiredTiger's default cache is 50% of (RAM minus 1 GB). Verify available RAM and compare with the configured cache:

```javascript
const host = db.adminCommand({ hostInfo: 1 });
const ramMB = host.system.memSizeMB;
const defaultCacheMB = Math.max(256, (ramMB - 1024) * 0.5);

print(`Total RAM: ${ramMB} MB`);
print(`Default WiredTiger cache: ~${defaultCacheMB.toFixed(0)} MB`);
```

If the server has only 4 GB of RAM, the default cache will be roughly 1.5 GB, which may be insufficient for large working sets.

## Detecting NUMA

NUMA (Non-Uniform Memory Access) can cause MongoDB to see reduced performance due to memory allocation imbalances. Check the flag and advise accordingly:

```javascript
const host = db.adminCommand({ hostInfo: 1 });
if (host.system.numaEnabled) {
  print("WARNING: NUMA is enabled. Consider running mongod with numactl --interleave=all.");
}
```

## Checking File Descriptor Limits

MongoDB requires a high `ulimit -n` for busy deployments. Alert if `maxOpenFiles` is below a recommended threshold:

```javascript
const host = db.adminCommand({ hostInfo: 1 });
const maxFiles = host.extra.maxOpenFiles;
if (maxFiles < 64000) {
  print(`WARNING: maxOpenFiles is ${maxFiles}. Recommended: 64000+`);
}
```

## Scripting Cross-Cluster Audits

Audit all replica set members for consistency:

```bash
for HOST in mongo1:27017 mongo2:27017 mongo3:27017; do
  echo "--- $HOST ---"
  mongosh --quiet --eval \
    'JSON.stringify(db.adminCommand({hostInfo:1}).system, null, 2)' \
    "mongodb://$HOST"
done
```

This lets you verify that all nodes have matching CPU and memory configurations, which is important for consistent performance in a replica set.

## Summary

`hostInfo` exposes operating system, CPU, and memory metadata from the machine running `mongod`. Use it to validate hardware configurations, check NUMA settings, size the WiredTiger cache appropriately, and audit infrastructure consistency across replica set members.

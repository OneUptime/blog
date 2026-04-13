# How to Use the buildInfo Command in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Command, Administration, Monitoring, Version

Description: Learn how to use MongoDB's buildInfo command to retrieve version details, compilation flags, and platform metadata for monitoring and compatibility checks.

---

## What Is buildInfo?

`buildInfo` is a MongoDB diagnostic command that returns metadata about the server binary itself - version numbers, the operating system it was compiled on, compiler flags, and enabled modules. It requires no authentication and runs on any MongoDB deployment type.

## Running buildInfo

Run the command from `mongosh`:

```javascript
db.adminCommand({ buildInfo: 1 })
```

Or use the shorthand helper:

```javascript
db.version()
```

The helper only returns the version string. Use `buildInfo` directly when you need the full metadata.

## Reading the Output

```json
{
  "version": "7.0.6",
  "gitVersion": "a12c789bf5e5fa1f7c2c8c4e8b1b9d2ea3f45678",
  "modules": [],
  "allocator": "tcmalloc",
  "javascriptEngine": "mozjs",
  "sysInfo": "deprecated",
  "versionArray": [7, 0, 6, 0],
  "openssl": {
    "running": "OpenSSL 3.0.2",
    "compiled": "OpenSSL 3.0.2"
  },
  "buildEnvironment": {
    "distmod": "ubuntu2204",
    "distarch": "x86_64",
    "cc": "/opt/mongodbtoolchain/v4/bin/gcc",
    "cxxflags": "-Woverloaded-virtual",
    "target_arch": "x86_64",
    "target_os": "linux"
  },
  "bits": 64,
  "debug": false,
  "maxBsonObjectSize": 16777216,
  "storageEngines": ["devnull", "wiredTiger"],
  "ok": 1
}
```

Important fields:

- `version` - the MongoDB server version string (e.g., `"7.0.6"`)
- `versionArray` - version as an array `[major, minor, patch, 0]` for easy numeric comparisons
- `modules` - licensed modules such as `["enterprise"]` for MongoDB Enterprise
- `allocator` - memory allocator in use (`tcmalloc` or `system`)
- `javascriptEngine` - JS engine used by `$where` and server-side JS (`mozjs`)
- `debug` - `true` if this is a debug build (avoid in production)
- `storageEngines` - storage engines available in this build

## Scripting Version Checks

Use `versionArray` for reliable version comparisons in automation scripts:

```javascript
const info = db.adminCommand({ buildInfo: 1 });
const [major, minor] = info.versionArray;

if (major >= 7) {
  print("Clustered collections and compound wildcard indexes are available.");
} else if (major === 6) {
  print("Queryable Encryption is available.");
} else {
  print("Consider upgrading to MongoDB 6.0 or later.");
}
```

## Checking for Enterprise vs. Community

Determine whether you are running MongoDB Enterprise:

```javascript
const info = db.adminCommand({ buildInfo: 1 });
const isEnterprise = info.modules.includes("enterprise");
print(isEnterprise ? "Enterprise build" : "Community build");
```

Enterprise builds unlock features like LDAP authentication, auditing, and encrypted storage engine.

## Using buildInfo in CI/CD Pipelines

In a shell script that validates the MongoDB version before running migrations:

```bash
MONGO_VERSION=$(mongosh --quiet --eval \
  'db.adminCommand({buildInfo:1}).version' \
  mongodb://localhost:27017)

REQUIRED="7.0.0"

if [ "$(printf '%s\n' "$REQUIRED" "$MONGO_VERSION" | sort -V | head -n1)" != "$REQUIRED" ]; then
  echo "MongoDB $MONGO_VERSION is below required $REQUIRED. Aborting."
  exit 1
fi
echo "MongoDB version check passed: $MONGO_VERSION"
```

## Checking OpenSSL Linkage

Verify TLS capabilities by inspecting the `openssl` field:

```javascript
const info = db.adminCommand({ buildInfo: 1 });
if (info.openssl) {
  print("TLS supported. OpenSSL: " + info.openssl.running);
} else {
  print("TLS not available in this build.");
}
```

If `openssl` is absent, this build was compiled without TLS support and cannot use encrypted connections.

## Automation and Monitoring Use Cases

Include `buildInfo` polling in your monitoring stack to:

- Alert when a MongoDB binary is unexpectedly downgraded
- Verify all cluster members run the same version
- Detect debug builds that should not be in production
- Confirm TLS and enterprise feature availability before enabling them

## Summary

`buildInfo` is an unauthenticated, lightweight command that exposes the MongoDB server's version, build environment, allocator, and enabled modules. Use it in scripts and monitoring tools to enforce version requirements, detect Enterprise features, and validate build configurations across all cluster members.

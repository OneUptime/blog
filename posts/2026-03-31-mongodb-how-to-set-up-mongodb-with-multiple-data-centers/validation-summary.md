# Validation Summary: How to Set Up MongoDB with Multiple Data Centers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB replica sets
- Multi-data-center deployment topology
- Custom write concern with `getLastErrorModes`
- Read preferences with tag sets
- mongod.conf (YAML configuration)
- TLS/SSL for inter-DC communication
- MongoDB Node.js driver

## Sources Consulted
- MongoDB documentation: Replica Set Configuration (`rs.initiate()`, `rs.reconfig()`) — https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB documentation: `getLastErrorModes` custom write concern — https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.settings.getLastErrorModes
- MongoDB documentation: Read Preference and Tag Sets — https://www.mongodb.com/docs/manual/core/read-preference-tags/
- MongoDB documentation: `rs.status()` output fields — https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB documentation: `rs.conf()` output fields — https://www.mongodb.com/docs/manual/reference/method/rs.conf/
- MongoDB documentation: mongod.conf `net` options — https://www.mongodb.com/docs/manual/reference/configuration-options/#net-options
- YAML specification: duplicate keys behavior — https://yaml.org/spec/1.2.2/

## Issues Found

### 1. Duplicate `net:` key in mongod.conf YAML
**What was wrong:** The `mongod.conf` example had two separate `net:` blocks at the same YAML indentation level — one for `port`/`bindIp` and a second for `tls` settings. In YAML, duplicate keys at the same level cause the second to silently override the first, meaning `port` and `bindIp` would be lost.

**What was changed:** Merged both into a single `net:` block with `port`, `bindIp`, and `tls` as sibling keys under it. Moved the `storage:` block after the combined `net:` block.

**Why:** A reader copying this config verbatim would end up with a mongod instance missing its port and bind address settings, potentially causing startup failures or unexpected default behavior.

### 2. `rs.status()` does not include member `tags`
**What was wrong:** The monitoring script accessed `member.tags?.dc` from `rs.status()` output. However, `rs.status()` does not include `tags` in its member documents — tags are only available in the replica set configuration via `rs.conf()`.

**What was changed:** Updated the script to also call `rs.conf()`, build a host-to-tags lookup map, and use that map to resolve the `dc` tag for each member.

**Why:** The original code would always print `dc=undefined` for every member, which would confuse readers trying to use this monitoring snippet.

## Review Notes
- The replication lag calculation uses wall-clock time (`new Date() - member.optimeDate`) rather than comparing each secondary's optime against the primary's optime. This is a common simplification but can show inflated "lag" during idle periods when no writes are occurring. A production monitoring setup should compare secondary optimes to the primary's optime from the same `rs.status()` call.
- The `rs.reconfig()` example uses a hardcoded `version: 2`. In practice, the version must be incremented from the current config version. Readers should use `rs.conf().version + 1` or let MongoDB handle versioning.
- MongoDB documentation recommends against using arbiters in production deployments when possible, preferring full data-bearing members for better fault tolerance. The topology shown is valid but readers should be aware of this guidance.

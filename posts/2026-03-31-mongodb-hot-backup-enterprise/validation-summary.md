# Validation Summary: How to Implement Hot Backup for MongoDB Enterprise

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Enterprise and Community editions)
- `db.fsyncLock()` / `db.fsyncUnlock()` for write locking
- LVM (Logical Volume Manager) snapshots
- MongoDB Ops Manager backup API
- `mongosh` shell
- `mongod` server
- Linux commands: `lvcreate`, `lvremove`, `rsync`, `mount`/`umount`

## Sources Consulted
- MongoDB official documentation: `db.fsyncLock()` — https://www.mongodb.com/docs/manual/reference/method/db.fsyncLock/
- MongoDB official documentation: `db.fsyncUnlock()` — https://www.mongodb.com/docs/manual/reference/method/db.fsyncUnlock/
- MongoDB official documentation: `db.hello()` (replacement for deprecated `isMaster`) — https://www.mongodb.com/docs/manual/reference/method/db.hello/
- MongoDB official documentation: `rs.isMaster()` deprecation — https://www.mongodb.com/docs/manual/reference/method/rs.isMaster/
- MongoDB Ops Manager documentation for automation agent configuration
- Linux `lvcreate` and `lvremove` man pages

## Issues Found

1. **Deprecated `rs.isMaster()` usage (line 117):** The post used `rs.isMaster().ismaster` to check if a node is a primary. `isMaster` was deprecated in MongoDB 5.0 (2021) and replaced by the `hello` command. Changed to `db.hello().isWritablePrimary`.

2. **Ops Manager API URL pointed to Cloud Manager (line 67, 76):** The `mmsBaseUrl` in the automation agent config was set to `https://cloud.mongodb.com`, which is the MongoDB Atlas / Cloud Manager endpoint, not a self-hosted Ops Manager instance. The API curl command also used `cloud.mongodb.com`. Since the section is about Ops Manager (self-hosted), both were changed to `https://your-ops-manager-host:8080` as a placeholder.

3. **Config file description said "backup agent" instead of "automation agent" (line 61):** The config file `automation-agent.config` is for the automation agent, not the backup agent. Fixed the description to say "automation agent."

## Review Notes
- The post title frames hot backups as an Enterprise-only feature, but Method 1 (`fsyncLock` + LVM snapshots) works with MongoDB Community edition as well. Only Method 2 (Ops Manager) requires Enterprise. The title is not strictly wrong since the post does cover Enterprise-specific tooling, but readers may incorrectly assume fsyncLock requires Enterprise.
- The description of fsyncLock as "briefly" pausing writes could be misleading. While the script's lock window between `fsyncLock` and `fsyncUnlock` is short, the lock itself persists indefinitely until explicitly released. If the LVM snapshot step fails, the database remains locked. Production scripts should include error handling to ensure `fsyncUnlock` is always called (e.g., via a `trap` in bash).
- The Ops Manager API endpoint path `/api/public/v1.0/` is the legacy API version. Current Ops Manager versions also support newer API versions, but v1.0 still works.

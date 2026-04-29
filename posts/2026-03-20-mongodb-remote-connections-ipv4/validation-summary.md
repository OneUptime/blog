# Validation Summary: How to Enable MongoDB Remote Connections on IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongod, mongosh)
- mongod.conf (YAML configuration)
- MongoDB role-based access control (RBAC)
- UFW (Uncomplicated Firewall)
- netcat (`nc`)
- pymongo (Python MongoDB driver)
- mongoose (Node.js MongoDB ODM)
- MongoDB Java driver (MongoClients)

## Sources Consulted
- MongoDB `mongod` reference: https://www.mongodb.com/docs/manual/reference/program/mongod/
- `mongod --shutdown` option: https://www.mongodb.com/docs/manual/reference/program/mongod/#std-option-mongod.--shutdown
- `mongod --bind_ip` option: https://www.mongodb.com/docs/manual/reference/program/mongod/#std-option-mongod.--bind_ip
- `net.bindIp` configuration: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.bindIp
- `net.ipv6` configuration: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.ipv6
- `db.createUser` reference: https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- `passwordPrompt()` reference: https://www.mongodb.com/docs/manual/reference/method/passwordPrompt/
- Ubuntu UFW community docs: https://help.ubuntu.com/community/UFW

## Issues Found
1. **`mongod --shutdown` missing `--dbpath`** — In Step 3, the post used `mongod --shutdown` to stop the manually-started mongod. Per MongoDB's official `mongod` reference, `--shutdown` must be paired with `--dbpath` (or `--config`) so it can locate the PID file in the data directory. A bare `mongod --shutdown` typically fails by falling back to the default dbpath. Fixed to `mongod --shutdown --dbpath /var/lib/mongodb` to match the dbpath used when the process was started.

## Review Notes
- `--bind_ip` (with underscore) is the correct documented flag — confirmed against MongoDB docs.
- `bindIp: 127.0.0.1,10.0.0.5` (comma-separated string in YAML) is the documented format for `net.bindIp`; a YAML array is not required.
- The mixed-form `roles` array (objects + bare strings) is valid syntax — bare role strings resolve to the database on which `db.createUser` is run, so `"readWriteAnyDatabase"` and `"dbAdminAnyDatabase"` correctly resolve to the admin database (which is where those built-in roles live) since `use admin` is invoked first.
- `passwordPrompt()` is a real mongosh function for interactive password entry.
- UFW evaluates rules in insertion order (first-match-wins), so adding the specific allow-from rules before the generic `deny 27017` is correct.
- The Introduction describes the MongoDB-side configuration as "three steps" (bindIp, authorization, users); the post then includes a fourth step covering host firewall rules. This is consistent — the firewall step is OS-level, not MongoDB configuration.
- Minor caveat (not corrected): when running `mongod --dbpath /var/lib/mongodb ...` manually, file ownership in `/var/lib/mongodb` is typically `mongodb:mongodb`, so the manual invocation should be run as the `mongodb` user (e.g., via `sudo -u mongodb`) to avoid permission/ownership issues on writes. The post does not call this out, but this is a setup nuance rather than an incorrect command.
- `net.ipv6: false` is the documented default, so explicitly setting it is redundant but harmless.

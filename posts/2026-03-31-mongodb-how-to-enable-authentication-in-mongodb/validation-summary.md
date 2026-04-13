# Validation Summary: How to Enable Authentication in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (authentication, authorization, user management)
- mongosh (MongoDB Shell)
- OpenSSL (keyfile generation)
- systemd (service management)

## Sources Consulted
- MongoDB Manual: Enable Access Control — https://www.mongodb.com/docs/manual/tutorial/enable-authentication/
- MongoDB Manual: db.createUser() — https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- MongoDB Manual: connectionStatus command — https://www.mongodb.com/docs/manual/reference/command/connectionStatus/
- MongoDB Manual: Deploy Replica Set With Keyfile Authentication — https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/
- MongoDB Manual: Localhost Exception — https://www.mongodb.com/docs/manual/core/localhost-exception/
- MongoDB Manual: Configuration File Options — https://www.mongodb.com/docs/manual/reference/configuration-options/

## Issues Found
1. **Deprecated `--noauth` flag reference**: The post mentioned using `--noauth` temporarily to create the first admin user. This flag is deprecated. Changed to reference the localhost exception, which is the recommended approach for creating the first user when no users exist.

2. **Mixed shell and JavaScript in one code block**: The Step 1 code block combined a bash command (`mongosh --host localhost --port 27017`) with JavaScript/mongosh commands (`use admin`, `db.createUser(...)`) in a single `javascript` block. Separated the shell command into its own `bash` code block for clarity and correctness.

3. **Inaccurate `connectionStatus` output**: The post claimed `connectionStatus` returns "You are not currently authenticated." In reality, the command returns a document with `authInfo.authenticatedUsers` and `authInfo.authenticatedUserRoles` as empty arrays. Fixed to show the actual response structure.

4. **Confusing `--auth` with `--config` example**: The post showed `mongod --auth --config /etc/mongod.conf` as an alternative to editing the config file, but this is contradictory — it loads the config file while also passing `--auth`, which is redundant if the config already has `security.authorization: enabled`. Simplified to `mongod --auth` and clarified it as an alternative to editing the config file.

## Review Notes
- When `keyFile` is specified in the replica set configuration, MongoDB automatically enables authorization, making the explicit `authorization: enabled` line technically redundant. However, including both is common practice and not incorrect, so this was left as-is for clarity.
- The post correctly recommends `passwordPrompt()` over hardcoded passwords, which is a good security practice available since MongoDB 4.2.
- The admin user roles granted are broad (userAdminAnyDatabase, readWriteAnyDatabase, dbAdminAnyDatabase, clusterAdmin). This is appropriate for an initial admin user in a tutorial context, though production environments may want more granular role separation.

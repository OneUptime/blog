# Validation Summary: How to Use Tag Sets with Read Preferences in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, read preferences, tag sets)
- mongosh (MongoDB Shell)
- Node.js MongoDB Driver

## Sources Consulted
- MongoDB documentation: Read Preference Tag Sets — https://www.mongodb.com/docs/manual/core/read-preference-tags/
- MongoDB documentation: replSetGetStatus — https://www.mongodb.com/docs/manual/reference/command/replSetGetStatus/
- MongoDB documentation: replSetGetConfig / rs.conf() — https://www.mongodb.com/docs/manual/reference/method/rs.conf/
- MongoDB documentation: Replica Set Configuration — https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB Node.js Driver documentation: ReadPreference — https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/read-preference/

## Issues Found
1. **Incorrect use of `rs.status()` to read tags**: The "Verifying Tags" section had two code snippets — one using `rs.status().members` and one using `rs.conf().members`. The `rs.status()` command returns the output of `replSetGetStatus`, which does **not** include `tags` in its member documents. Tags are only available from the replica set configuration (`rs.conf()` / `replSetGetConfig`). The first snippet would have printed `undefined` for each member's tags. **Fix**: Removed the incorrect `rs.status()` snippet and kept only the correct `rs.conf()` approach.

## Review Notes
- The rest of the post is technically accurate: `rs.reconfig()` for setting tags, `setReadPref()` in mongosh, the `ReadPreference` constructor in the Node.js driver, tag set fallback lists with `{}` as a catch-all, and using `"nearest"` mode with tag sets for geographic routing are all correct.
- The `ReadPreference` constructor API (`new ReadPreference(mode, tagSets)`) is the current supported approach in the MongoDB Node.js driver.
- The empty tag set document `{}` as a final fallback is correctly documented — it matches any eligible member and ensures reads don't fail when preferred members are unavailable.

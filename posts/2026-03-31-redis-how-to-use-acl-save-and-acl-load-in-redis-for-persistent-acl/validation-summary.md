# Validation Summary: How to Use ACL SAVE and ACL LOAD in Redis for Persistent ACLs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (ACL system, ACL SAVE, ACL LOAD, ACL SETUSER commands)
- Python (redis-py client library)
- Node.js (node-redis v4 client library)
- Bash (deployment scripting)

## Sources Consulted
- Redis ACL documentation: https://redis.io/docs/latest/commands/acl-save/
- Redis ACL LOAD documentation: https://redis.io/docs/latest/commands/acl-load/
- Redis ACL SETUSER documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Redis ACL file format: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- redis-py source (acl_setuser): https://github.com/redis/redis-py/blob/master/redis/commands/core.py
- node-redis v4 documentation: https://github.com/redis/node-redis
- Node.js top-level await support: https://nodejs.org/api/esm.html#top-level-await

## Issues Found

1. **Node.js example: top-level `await` with CommonJS `require()`** — The code used `require('redis')` (CommonJS) with top-level `await`, which is only valid in ES modules. Wrapped the code in an async IIFE `(async () => { ... })()` to make it valid CommonJS.

2. **Unused `import subprocess`** — The Python reload example imported `subprocess` but never used it. Removed the unused import.

3. **ACL file format: duplicate `on` flag** — The alice user line had `on` appearing twice (`user alice on #hash on ~data:*`). Removed the duplicate `on`.

4. **ACL file format: invalid SHA256 hashes** — The original hash for alice (`#5e884898da28047151d0e56f8dc62927773eddcd0f6a14cfa72b9af6f02a1b`) was only 62 hex characters instead of the required 64. The hash for bob (`#abc123hash`) contained non-hex characters. Replaced both with valid 64-character hex strings.

5. **ACL file format: plaintext password in file example** — The readonly user line used `>readpass` (plaintext password syntax), but the post states "Passwords in the file are stored as SHA256 hashes." When ACL SAVE writes the file, all passwords are serialized as SHA256 hashes with `#` prefix. Replaced with a hashed password to match the documented behavior.

## Review Notes
- The post correctly distinguishes between ACL SAVE (persists ACL rules) and CONFIG REWRITE (persists server config), which is a common source of confusion.
- The deployment pattern section with version control is a good practical addition.
- The `CONFIG SET aclfile` claim at runtime is supported in Redis 6.2+, but may not work in older versions. The post does not specify a minimum Redis version.
- The Python redis-py `passwords` parameter correctly uses the `+` prefix convention (e.g., `'+password123'`) to indicate adding a password, matching the library's API.

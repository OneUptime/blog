# Validation Summary: How to Use ACL GETUSER in Redis to View User Permissions

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis (6.x and 7.0+)
- Redis ACL system (ACL GETUSER, ACL SETUSER, ACL USERS, ACL LIST, ACL LOG)
- SHA256 password hashing

## Sources Consulted
- Redis official documentation for ACL GETUSER: https://redis.io/commands/acl-getuser/
- Redis official documentation for ACL SETUSER: https://redis.io/commands/acl-setuser/
- Redis official documentation for ACL WHOAMI: https://redis.io/commands/acl-whoami/
- Redis official documentation for ACL USERS: https://redis.io/commands/acl-users/
- Redis official documentation for ACL LIST: https://redis.io/commands/acl-list/
- Redis 7.0 release notes (selectors feature)
- SHA256 hash verification via sha256sum CLI tool

## Issues Found

1. **Incorrect password hash example (line 82)**: The hash `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` is the SHA256 of the empty string `""`, not of `"mypassword"` as the context implies (the user `app_user` was created with password `"mypassword"` earlier in the post). Replaced with the correct SHA256 hash of `"mypassword"`: `89e01536ac207279409d4de1e5253e01f4a1769e696db0d6062ca9b8f56767c8`.

2. **Incorrect command field values in table (lines 113-114)**: The table listed `allcommands` and `nocommands` as values that appear in the ACL GETUSER commands field output. These are ACL SETUSER keywords/aliases, not what ACL GETUSER returns. The actual output uses `+@all` (all commands allowed) and `-@all` (all commands denied). Changed to `+@all` and `-@all`.

3. **Misleading ACL WHOAMI reference (line 116)**: The post suggested using `ACL WHOAMI` to understand what commands are allowed. ACL WHOAMI only returns the current connection's username, not its permissions. Changed to recommend using `ACL GETUSER` with the username from the user's connection.

4. **ACL LIST vs ACL USERS (mermaid diagram and line 155)**: The audit flowchart and text recommended `ACL LIST` for getting all usernames. While ACL LIST does contain usernames, the proper command for listing just usernames is `ACL USERS`. Updated the flowchart to use `ACL USERS` and updated the text to mention both commands with their distinct purposes.

## Review Notes
- The output example in the "Output Fields" section uses RESP2 format, which is appropriate since most Redis CLI users default to RESP2. The post correctly notes that Redis 7.0+ uses a flat map format (RESP3).
- The hash `a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3` in the output fields example is the SHA256 of `"123"` -- this is fine as a standalone example since no specific password context is implied there.
- The selectors syntax shown for Redis 7.0+ is correct.
- The post uses `--` for Redis CLI comments, which is a reasonable convention for illustration purposes though Redis CLI does not support inline comments.

# Validation Summary: How to Restrict Redis Key Access with ACL Key Patterns

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis ACL (Access Control Lists)
- Redis key patterns (`~`, `%R~`, `%W~`)
- Redis CLI (`redis-cli`)
- ACL SETUSER, ACL GETUSER, ACL DRYRUN commands

## Sources Consulted
- Redis ACL SETUSER documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Redis ACL DRYRUN documentation: https://redis.io/docs/latest/commands/acl-dryrun/
- Redis ACL overview: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/

## Issues Found

1. **Inaccurate NOPERM error message (line 43)**: The blog showed `NOPERM No permissions to access a key` but the actual Redis error message is `NOPERM this user has no permissions to access one of the keys used as arguments`. Fixed to match the actual Redis output.

2. **Incorrect ACL DRYRUN output format (line 90)**: The blog showed the DRYRUN result as `(error) ERR This user has no permissions to access one of the keys used`. However, ACL DRYRUN does not return an error — it returns a bulk string describing the denial reason. Fixed to `"This user has no permissions to access the 'app-b:somekey' key"` which reflects the actual response format.

## Review Notes
- The `+@read +@write +@string +@hash` combination in the namespace isolation example is redundant — `+@read +@write` already covers string and hash commands. This is not incorrect, just more verbose than necessary.
- The `&*` (all pub/sub channels) syntax is used without explanation. While not wrong, readers unfamiliar with Redis ACL might wonder what it does. This is a minor clarity point, not a technical error.
- ACL DRYRUN was introduced in Redis 7.0, which is correctly implied by the post's context but not explicitly stated.

# Validation Summary: How to Use ACL DRYRUN in Redis to Test Permission Rules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (7.0+)
- Redis ACL (Access Control Lists)
- Redis CLI
- Bash scripting

## Sources Consulted
- Redis ACL DRYRUN official documentation: https://redis.io/docs/latest/commands/acl-dryrun/
- Redis ACL SETUSER official documentation: https://redis.io/docs/latest/commands/acl-setuser/

## Issues Found

### 1. Incorrect error response format for ACL DRYRUN denial messages
**What was wrong:** All denial responses were shown with an `(error) ERR` prefix (e.g., `(error) ERR This user has no permissions to run the 'set' command`). Per the official documentation, `ACL DRYRUN` returns a **bulk string reply** on denial, not an error response. In redis-cli, this displays as a quoted string. Additionally, the command denial messages used "This user" instead of the documented format which includes the actual username (e.g., `"User reader has no permissions to run the 'set' command"`).

**What was changed:** Updated all five denial response examples to use bulk string format with the correct message pattern including the username:
- `(error) ERR This user has no permissions to run the 'set' command` → `"User reader has no permissions to run the 'set' command"`
- `(error) ERR No permissions to access a key` → `"User appuser has no permissions to access the 'system:config' key"`
- `(error) ERR No permissions to access a channel` → `"User pubuser has no permissions to access the 'admin:commands' channel"`
- `(error) ERR This user has no permissions to run the 'client|list' command` → `"User reader has no permissions to run the 'client|list' command"`

**Why:** The official docs explicitly show `ACL DRYRUN` returns a simple string `OK` on success and a bulk string on denial. The documented example shows the format `"User VIRGINIA has no permissions to run the 'get' command"`, confirming the username is included and it is not an error-type response.

### 2. Incorrect version attribution for channel-level ACL controls
**What was wrong:** The post stated "Redis 7.0 added channel-level ACL controls."

**What was changed:** Corrected to "Redis 6.2 added channel-level ACL controls."

**Why:** The official ACL SETUSER documentation states that the `&<pattern>` channel selector syntax has been "Available in Redis 6.2 and later." Redis 7.0 added ACL selectors (`(<rule list>)`) and read/write key patterns (`%R~`, `%W~`), but channel patterns were introduced in 6.2.

## Review Notes
- The deployment script uses unquoted `$CMD` variable expansion which relies on word splitting to pass command and arguments separately to `redis-cli`. This works for the examples shown but could be fragile with arguments containing spaces or glob characters. This is a shell scripting style concern rather than a Redis accuracy issue.
- The `ACL SETUSER` syntax, `ACL DRYRUN` syntax, version attribution (7.0 for DRYRUN itself), and explanation of the difference between `ACL DRYRUN` and `ACL LOG` are all accurate.
- The subcommand pipe notation (`client|list`) is correctly documented.

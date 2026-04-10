# Validation Summary: How to Use RIOT for Redis Data Migration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RIOT (Redis Input/Output Tools) v4.x
- PostgreSQL (JDBC, used in database import example)
- Homebrew (macOS package manager)

## Sources Consulted
- RIOT GitHub repository and source code: https://github.com/redis/riot
- RIOT official documentation (AsciiDoc sources in the repo): install.adoc, replicate.adoc, file-import.adoc, db-import.adoc
- RIOT source code: `AbstractRedisTargetExportCommand.java` (positional SOURCE/TARGET args), `RedisReaderArgs.java` (--key-pattern, --key-type), `StepArgs.java` (--threads, --batch), `DataSourceArgs.java` (--jdbc-url, --jdbc-user, --jdbc-pass), `ProgressArgs.java` (--progress values), `AbstractExportCommand.java` (--mode flag), `DatabaseImport.java` (SQL as positional parameter)
- RIOT release assets on GitHub (platform-specific zip naming convention)

## Issues Found

1. **`--source-uri` / `--target-uri` flags do not exist (all replicate/compare commands):** In RIOT 4.x, the source and target Redis URIs are positional arguments, not named flags. Changed all `replicate` and `compare` commands from `--source-uri redis://... --target-uri redis://...` to positional `redis://source redis://target`.

2. **`--live` flag does not exist (Live Replication section):** The correct flag is `--mode live`. Changed `--live` to `--mode live` in the live replication example and the summary paragraph.

3. **`--db-url` should be `--jdbc-url` (Database Import section):** The RIOT db-import command uses `--jdbc-url` for the JDBC connection string. Fixed the flag name.

4. **`--db-username` should be `--jdbc-user` (Database Import section):** Fixed the flag name to match RIOT's actual CLI option.

5. **`--db-password` should be `--jdbc-pass` (Database Import section):** Fixed the flag name to match RIOT's actual CLI option.

6. **`--sql` is not a flag (Database Import section):** In RIOT, the SQL query is a positional parameter, not a named flag. Changed from `--sql "SELECT ..."` to a positional argument.

7. **`--uri` placement on subcommands (file-import, file-export, db-import sections):** The Redis connection URI is specified via the `-u` flag inherited from the parent command, not as `--uri` on the subcommand. Changed all instances to use `-u redis://...` syntax.

8. **`--type hash` / `--type json` and `--keyspace` / `--keys` are not flags on file-import/db-import:** In RIOT 4.x, the Redis data structure type is determined by appending a Redis command (e.g., `hset`) after the file path or SQL query. The `--keyspace` and `--key` (singular) options belong to that Redis command, not to file-import/db-import itself. Restructured all file-import and db-import examples to use the correct `hset --keyspace ... --key ...` syntax.

9. **`--keys` should be `--key` (singular):** The option on the Redis write command is `--key`, not `--keys`. Fixed in all import examples.

10. **Section header referenced `riot-redis`:** The heading "Redis to Redis Migration (riot-redis)" referenced the old v2/v3 binary name. In RIOT 4.x, there is a single unified `riot` binary. Removed the `(riot-redis)` parenthetical.

11. **Installation download URL is not generic:** The blog used `riot-standalone.zip` but actual release assets are platform-specific (e.g., `riot-standalone-4.3.0-linux-x86_64.zip`). Updated the installation section to indicate the platform-specific naming convention with a link to the releases page.

12. **"Redis Labs" should be "Redis":** The company rebranded from "Redis Labs" to "Redis" (Redis Ltd.). Updated the intro paragraph.

## Review Notes
- The RIOT repository (https://github.com/redis/riot) is now marked as unmaintained. The successor project is RIOT-X (https://github.com/redis/riotx-dist). The blog post's content is accurate for RIOT 4.x but readers should be aware of this transition.
- The sample `compare` output shown in the blog is illustrative rather than exact — actual RIOT compare output format may vary slightly, but the general concept is correct.
- The `--progress` flag accepts values: `BLOCK`, `BAR`, `ASCII`, `LOG`, `NONE`. The blog's use of `log` is correct (picocli handles case-insensitivity).

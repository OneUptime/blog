# Validation Summary: How to Use clickhouse-disks for Disk Management

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (clickhouse-disks CLI utility)
- ClickHouse storage backends (local disk, S3, GCS, Azure Blob)
- ClickHouse storage policies and disk configuration

## Sources Consulted
- [Official clickhouse-disks documentation](https://clickhouse.com/docs/operations/utilities/clickhouse-disks)
- [ClickHouse DisksApp source (programs/disks/DisksApp.cpp)](https://github.com/ClickHouse/ClickHouse/blob/master/programs/disks/DisksApp.cpp)
- [PR #64446: Interactive client for clickhouse-disks](https://github.com/ClickHouse/ClickHouse/pull/64446)
- [Issue #56791: clickhouse-disks usability improvements](https://github.com/ClickHouse/ClickHouse/issues/56791)

## Issues Found

1. **`move` command incorrectly shown with `--disk-from` / `--disk-to` flags.** The `move` subcommand only operates within a single disk; only `copy` accepts `--disk-from`/`--disk-to`. Rewrote the "Moving Files" example to move within the `default` disk (using the program-wide `--disk` flag) and added a note that cross-disk relocation requires `copy` followed by `remove`.

2. **Non-existent `--interactive` flag.** The `clickhouse-disks` binary has no `--interactive` flag. Interactive REPL mode runs by default whenever `--query`/`-q` is not provided. Updated the "Interactive Shell Mode" section to remove the invalid flag and explain how interactive mode is actually entered.

3. **Interactive shell example used commands not present in the REPL.** The previous example used `ls` (the REPL command is `list`, though `ls` is accepted as an alias) and `quit` (valid), plus a `copy` invocation with an incorrect positional/flag combination. Replaced with an example using the documented REPL commands (`list`, `cd`, `copy`, `switch-disk`, `quit`) and corrected the `copy` syntax so the `--disk-to` flag precedes the path arguments.

## Review Notes
- The `list-disks` subcommand is correct; ClickHouse also accepts the aliases `list_disks`, `ls-disks`, and `ls_disks`.
- `copy` correctly uses `--disk-from` and `--disk-to`; the documented syntax is `copy [--disk-from d1] [--disk-to d2] <path-from> <path-to>`, which matches the post.
- `remove` operates on the current disk (selected via `--disk`), which the post shows correctly.
- `read` writes to stdout when no `--path-to` is given, and `write` reads from stdin when no `--path-from` is given; the heredoc (`<<<`) example is valid bash for feeding stdin.
- `clickhouse-disks` is bundled inside the `clickhouse-server` package (and also ships as a subcommand of the main `clickhouse` multi-binary); the `which clickhouse-disks` check is a reasonable way to confirm installation on Debian/Ubuntu packages.
- The REPL command set and the `--interactive`-by-default behavior were introduced in ClickHouse 24.7 (PR #64446, July 2024); readers on older ClickHouse versions may see a different CLI surface.

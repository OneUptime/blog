# Validation Summary: How to Use pt-archiver for MySQL Data Archival

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Percona Toolkit (pt-archiver)
- Data archival and purging strategies

## Sources Consulted
- [pt-archiver -- Percona Toolkit Documentation](https://docs.percona.com/percona-toolkit/pt-archiver.html)
- [pt-archiver source code (GitHub)](https://github.com/percona/percona-toolkit/blob/3.x/bin/pt-archiver)
- [pt-archiver Debian man page](https://manpages.debian.org/trixie/percona-toolkit/pt-archiver.1p.en.html)
- [pt-archiver Ubuntu man page](https://manpages.ubuntu.com/manpages/jammy/man1/pt-archiver.1p.html)

## Issues Found

1. **`--sleep=0.1` is invalid (line 92, 96):** The `--sleep` option is declared as `type: int` in pt-archiver's source and only accepts integer values. The value `0.1` would cause a runtime error. Changed to `--sleep=1` (1 second) and updated the description accordingly.

2. **Dry Run section was misleading (lines 66-78):** pt-archiver has a dedicated `--dry-run` flag that prints the generated SQL queries and exits without making changes. The original text suggested using `--no-delete` combined with no destination as a workaround, and the accompanying code example didn't even use `--no-delete` — it showed a normal archival with `--dest`. Rewrote the section to show `--dry-run` as the primary approach, with a small live test run as a secondary option.

3. **Statistics output used wrong action names (lines 109-111):** pt-archiver's actual statistics output uses `inserting` and `deleting` as action names, not `insert` and `delete`. Corrected the example output to match real pt-archiver output.

4. **File output described as CSV (line 50, 56):** The `--file` option produces tab-delimited output in MySQL SELECT INTO OUTFILE format (with `\N` for NULLs), not comma-separated CSV. Changed the description from "CSV file" to "tab-delimited file", renamed the example file extension from `.csv` to `.tsv`, and added a note about the output format.

## Review Notes
- The `--file` option supports format codes like `%Y`, `%m`, `%d` for dates and `%D`, `%t` for database/table names. These are MySQL DATE_FORMAT()-style codes, not POSIX strftime codes, though the commonly used date codes overlap.
- For sub-second sleep intervals between chunks, users could explore `--sleep-coef` (type: float), which sleeps for a multiple of the last SELECT query execution time, providing adaptive throttling.
- The `--where` option is required by pt-archiver for safety. The blog correctly uses it in all examples.

# Validation Summary: How to Use pt-query-digest to Analyze MySQL Logs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Percona Toolkit (pt-query-digest)
- tcpdump (for network-based query capture)

## Sources Consulted
- Official Percona Toolkit documentation for pt-query-digest: https://docs.percona.com/percona-toolkit/pt-query-digest.html
- Percona Toolkit `--limit`, `--filter`, `--review`, `--history`, and `--type` option documentation

## Issues Found
- **`--review-history` option does not exist**: The post used `--review-history` in the "Saving Reports to a File" section. This option does not exist in pt-query-digest. The correct option for saving query metrics history is `--history`. Changed `--review-history` to `--history`.

## Review Notes
- The manual installation URL uses a placeholder version (`percona-toolkit-3.x.tar.gz`) which won't resolve to an actual download. This is acceptable as a template but readers will need to substitute the actual version number.
- The `--review` and `--history` DSN example includes a plaintext password (`p=secret`). While this is fine for a tutorial, production usage should use safer credential management.
- The post correctly describes pt-query-digest's ability to read general logs and binary logs (via mysqlbinlog output), tcpdump captures, and slow query logs.
- All filter syntax examples use correct Perl syntax for the `--filter` option.
- The `--limit 5` usage is correct — a plain integer means "top N queries" per the official docs.

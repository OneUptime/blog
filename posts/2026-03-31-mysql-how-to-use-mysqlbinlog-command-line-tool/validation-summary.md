# Validation Summary: How to Use mysqlbinlog Command-Line Tool

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL binary logging
- `mysqlbinlog` command-line utility
- Point-in-time recovery with binary logs
- GTID-based replication filtering
- Row-based binary log format decoding

## Sources Consulted
- MySQL 8.0 Reference Manual: mysqlbinlog — Utility for Processing Binary Log Files (https://dev.mysql.com/doc/refman/8.0/en/mysqlbinlog.html)
- MySQL 8.0 Reference Manual: Point-in-Time Recovery Using Binary Log (https://dev.mysql.com/doc/refman/8.0/en/point-in-time-recovery-binlog.html)
- MySQL 8.0 Reference Manual: SHOW BINLOG EVENTS Statement (https://dev.mysql.com/doc/refman/8.0/en/show-binlog-events.html)
- MySQL 8.0 Reference Manual: mysqlbinlog Row Event Display (https://dev.mysql.com/doc/refman/8.0/en/mysqlbinlog-row-events.html)

## Issues Found

1. **Inaccurate verbose mode output example**: The example output for `mysqlbinlog -v` showed column names in parentheses (e.g., `@1=42 (id)`, `@2=100.00 (amount)`). In reality, `mysqlbinlog -v` outputs positional column references like `@1=42` without column names, because column names are not stored in the binary log. The table name was also shown without backtick quoting (`myapp.orders`) whereas actual output uses backtick-quoted identifiers (`` `myapp`.`orders` ``). Fixed the example to match real mysqlbinlog output.

2. **Misleading section title "Show Only Specific Event Types"**: The section content discussed `--include-gtids` and `--exclude-gtids`, which filter by GTID sets, not by event types. Renamed the section to "Filter by GTID" and adjusted the introductory sentence to be more precise.

## Review Notes
- The `-vv` flag is correctly noted as providing more verbose column type metadata (e.g., `INT meta=0 nullable=0 is_null=0`), but the post could benefit from an actual `-vv` output example in the future to distinguish it from `-v`.
- The `--database` option only filters statement-based events reliably. For row-based format, it filters based on the default database, which may not always match the database being modified. This is a known caveat documented in the MySQL manual but not mentioned in the post. This is a minor omission that does not constitute an error.
- The piped commands using `mysql -u root -p` with stdin redirection would prompt for a password interactively, which may not work well when stdin is already used for piped SQL. This is a common documentation pattern but worth noting for practical use.

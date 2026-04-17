# Validation Summary: How to Automate ClickHouse Log Rotation

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- ClickHouse (server log configuration, system log tables, partition management)
- logrotate (Linux log rotation utility)
- Bash / cron (automation)
- XML configuration (`config.xml`)
- SQL (`ALTER TABLE ... DROP PARTITION`)

## Sources Consulted
- ClickHouse server configuration parameters (logger, query_log sections): https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse `ALTER TABLE ... PARTITION` / "How to Set Partition Expression": https://clickhouse.com/docs/sql-reference/statements/alter/partition#how-to-set-partition-expression
- ClickHouse `SYSTEM` statements reference: https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse source `SignalHandlers.cpp` (SIGHUP handler closes/reopens logs): https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/SignalHandlers.cpp
- ClickHouse default `programs/server/config.xml`: https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml
- ClickHouse packaging init/systemd unit (PID file path): https://github.com/ClickHouse/ClickHouse/blob/master/packages/clickhouse-server.init

## Issues Found
1. **Invalid `<compress>` element in `<logger>`.** The ClickHouse logger config does not recognize a `<compress>` child element; the real option for compressing the live log stream is `<stream_compress>` (which writes `.lz4` files, different semantics from "compress rotated files"). Since the post already relies on `logrotate` to compress rotated files in the next section, I removed the `<compress>true</compress>` line entirely rather than substituting a subtly different feature.

2. **Invalid `DROP PARTITION` expression.** The original example used `DROP PARTITION toYYYYMM(now() - INTERVAL 60 DAY)`. Per the ClickHouse ALTER docs, a partition expression must be a literal, `ALL`, or a tuple of expressions matching the partition-key tuple — a bare function call is not accepted by the parser. Changed to `DROP PARTITION tuple(toYYYYMM(now() - INTERVAL 60 DAY))` and added one sentence explaining the constraint. Also removed the single quotes around `${PARTITION}` in the bash cron example so it passes as a numeric literal matching the `toYYYYMM` partition key.

## Review Notes
- `SIGHUP` to the ClickHouse server PID is confirmed correct for triggering log reopen — the signal handler explicitly closes and reopens log files. There is no `SYSTEM RELOAD LOGS` statement.
- Default log paths (`/var/log/clickhouse-server/clickhouse-server.log`, `clickhouse-server.err.log`) and PID path (`/var/run/clickhouse-server/clickhouse-server.pid`) are correct for the official Debian/RPM packages. On modern systemd hosts the unit file resolves the PID to `/run/clickhouse-server/clickhouse-server.pid`, but `/var/run` is typically a symlink to `/run`, so the `cat` call still works.
- `<ttl>` inside `<query_log>` (and the other system log tables) is a valid element and is the recommended way to bound system log growth; the snippet is correct.
- The `<size>`/`<count>` logger keys are still supported but newer ClickHouse versions also offer a unified `<rotation>` key (e.g. `100M,daily`). Not a correctness issue — just a forward-looking note.

# Validation Summary: How to Use pt-deadlock-logger for MySQL Deadlock Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL / InnoDB
- Percona Toolkit (pt-deadlock-logger)
- Bash scripting (alerting cron job)

## Sources Consulted
- Percona Toolkit official documentation for pt-deadlock-logger (https://docs.percona.com/percona-toolkit/pt-deadlock-logger.html)
- MySQL documentation for `SHOW ENGINE INNODB STATUS` and privilege requirements
- Percona Toolkit source code and DSN specification documentation

## Issues Found

### 1. Destination table `ts` column type was incorrect
- **What was wrong:** The `ts` column was defined as `DATETIME NOT NULL`.
- **What was changed:** Corrected to `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` to match the official pt-deadlock-logger auto-created schema.
- **Why:** The tool uses `TIMESTAMP` with a default value, not `DATETIME`. This matters because `TIMESTAMP` columns auto-populate with the current time on insert, which is how the tool records when deadlocks occurred.

### 2. String columns used VARCHAR instead of CHAR
- **What was wrong:** Columns `user`, `hostname`, `ip`, `db`, `tbl`, `idx`, `lock_type`, `lock_mode`, and `wait_hold` were all defined with `VARCHAR`.
- **What was changed:** All changed to `CHAR` to match the official schema.
- **Why:** The official pt-deadlock-logger schema uses fixed-length `CHAR` columns. While `VARCHAR` would functionally work, the schema shown should accurately reflect what the tool actually creates.

### 3. Missing PRIMARY KEY
- **What was wrong:** The table definition had no primary key.
- **What was changed:** Added `PRIMARY KEY (server, ts, thread)`.
- **Why:** The official schema includes this composite primary key. It is critical for the tool's deduplication logic — pt-deadlock-logger uses `INSERT IGNORE` with this key to avoid recording the same deadlock twice.

### 4. Missing ENGINE specification
- **What was wrong:** The CREATE TABLE statement had no ENGINE clause.
- **What was changed:** Added `ENGINE=InnoDB`.
- **Why:** The official auto-created table uses InnoDB. Specifying the engine explicitly ensures consistent behavior regardless of the server's default storage engine.

## Review Notes
- The blog uses `nohup ... &` for background operation. The tool has a native `--daemonize` option which is a cleaner approach for production use, though `nohup` works fine.
- The `--print` option is used in the "Printing to stdout" section. In current versions of pt-deadlock-logger, the tool prints to stdout by default when no `--dest` is specified, so `--print` is redundant in that context but not harmful.
- The alerting script uses `mysql -u root -psecret` which passes the password on the command line. This triggers a MySQL warning about insecure password usage. A production setup should use a MySQL option file (`~/.my.cnf`) or `mysql_config_editor` instead.
- The prerequisites mention `SELECT` privilege, which is not strictly required by the tool (it reads deadlock info via `SHOW ENGINE INNODB STATUS` which requires `PROCESS`). Including it is not incorrect but is unnecessary for the tool's core operation.

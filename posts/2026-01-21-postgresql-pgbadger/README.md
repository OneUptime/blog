# How to Use pgBadger for PostgreSQL Log Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, pgBadger, Log Analysis, Performance, Monitoring

Description: A guide to using pgBadger for analyzing PostgreSQL logs, generating reports, and identifying performance issues.

---

pgBadger is a powerful log analyzer that generates detailed reports from PostgreSQL logs. This guide covers setup and usage.

## Installation

```bash
# Ubuntu/Debian
sudo apt install pgbadger

# From CPAN
cpan pgBadger

# Or download
wget https://github.com/darold/pgbadger/archive/refs/tags/v12.3.tar.gz
tar xzf v12.3.tar.gz
cd pgbadger-12.3
perl Makefile.PL
make && sudo make install
```

## Configure PostgreSQL Logging

```conf
# postgresql.conf
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'

# Required for pgBadger
log_min_duration_statement = 0  # Log all queries (or threshold)
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0

# Line prefix (important!)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

## Generate Report

```bash
# Basic report
pgbadger /var/log/postgresql/postgresql-*.log -o report.html

# Specific date range
pgbadger -b '2025-01-20 00:00:00' -e '2025-01-21 23:59:59' \
    /var/log/postgresql/*.log -o report.html

# Incremental mode (for daily reports)
pgbadger --incremental /var/log/postgresql/*.log -o /var/www/reports/
```

## Report Contents

- Queries statistics
- Slowest queries
- Most frequent queries
- Connections analysis
- Checkpoints
- Temporary files
- Locks
- Errors

## Automation

```bash
# Daily report cron job
0 1 * * * pgbadger --incremental /var/log/postgresql/postgresql-$(date +\%Y-\%m-\%d)*.log -o /var/www/pgbadger/

# Weekly summary
0 2 * * 0 pgbadger -w /var/log/postgresql/*.log -o /var/www/pgbadger/weekly.html
```

## Useful Options

```bash
# JSON output for further processing
pgbadger -f json -o report.json /var/log/postgresql/*.log

# Specific database only
pgbadger --dbname myapp /var/log/postgresql/*.log -o report.html

# Top N queries
pgbadger --top 50 /var/log/postgresql/*.log -o report.html

# Parallel processing
pgbadger -j 4 /var/log/postgresql/*.log -o report.html
```

## Best Practices

1. **Enable detailed logging** - log_min_duration_statement
2. **Use correct line prefix** - pgBadger parsing
3. **Generate regular reports** - Daily or weekly
4. **Archive reports** - Historical comparison
5. **Act on findings** - Optimize slow queries

## Conclusion

pgBadger provides valuable insights into PostgreSQL performance. Configure proper logging and generate regular reports to identify and address issues.

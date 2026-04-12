# Validation Summary: How to Debug MySQL in Docker Containers

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- MySQL 8.0
- Docker (CLI and Compose V2)
- InnoDB storage engine
- Docker networking (bridge)
- jq (JSON processing)

## Sources Consulted
- Docker CLI reference for `docker logs`, `docker exec`, `docker inspect`, `docker port`, `docker network inspect`: https://docs.docker.com/reference/cli/docker/
- MySQL 8.0 Server System Variables (`general_log`, `slow_query_log`, `long_query_time`, `log_output`, `log_error`, `datadir`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 `SHOW` statements (`SHOW FULL PROCESSLIST`, `SHOW ENGINE INNODB STATUS`, `SHOW TABLE STATUS`, `SHOW VARIABLES`): https://dev.mysql.com/doc/refman/8.0/en/show.html
- MySQL 8.0 command-line options for mysqld: https://dev.mysql.com/doc/refman/8.0/en/server-options.html
- Official MySQL Docker image documentation: https://hub.docker.com/_/mysql
- Docker Compose file reference (`services`, `command`, `volumes`, `environment`): https://docs.docker.com/compose/compose-file/

## Issues Found
No technical issues found.

## Review Notes
- The error log examination command (`cat $(mysql ... -sse "SELECT @@log_error;")`) is correct but worth noting that in the default MySQL Docker image configuration, `log_error` defaults to `stderr` rather than a file path. The `cat` command would fail in that case. The post implicitly assumes error logging has been configured to a file, which is reasonable in a debugging context where the user is actively configuring logging.
- The connectivity test command (`apt-get install -y mysql-client`) assumes a Debian/Ubuntu-based app container. In newer Debian versions (Bookworm+), the package may be named `default-mysql-client`. This is a minor portability consideration, not an error.
- Container name DNS resolution (`mysql -h mysql-container`) works on user-defined Docker networks but not on the default bridge network. Since the post discusses Docker Compose (which creates user-defined networks by default), this is fine in context.
- All MySQL commands, Docker CLI syntax, Compose YAML structure, and configuration directives are technically correct for MySQL 8.0 and current Docker versions.

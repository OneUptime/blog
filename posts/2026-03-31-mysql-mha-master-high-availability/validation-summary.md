# Validation Summary: What Is MHA (Master High Availability) for MySQL

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- MySQL
- MHA (Master High Availability Manager and Tools for MySQL)
- MySQL Replication (master-slave)
- VIP (Virtual IP) failover
- SSH key-based authentication
- InnoDB Cluster (mentioned as modern alternative)

## Sources Consulted
- MHA official GitHub repository: https://github.com/yoshinorim/mha4mysql-manager
- MHA source code (`lib/MHA/MasterFailover.pm`, `lib/MHA/MasterMonitor.pm`) for verifying the `master_ip_failover_script` calling convention
- MHA sample scripts (`samples/scripts/master_ip_failover`) for verifying command argument format
- MHA wiki and documentation for configuration parameter names and valid values

## Issues Found

### 1. VIP Failover Script - Incorrect Argument Parsing
**What was wrong:** The script used `case "$1" in` to check the first positional argument, but MHA passes named parameters in `--command=xxx` format (GNU-style long options), not bare positional arguments.
**What was changed:** Added a `for arg in "$@"` loop to parse the `--command=` argument from MHA's named parameter style.
**Why:** MHA invokes failover scripts with arguments like `--command=start --orig_master_host=... --new_master_host=...`. The original script would never match any case because `$1` would be `--command=start`, not `start`.

### 2. VIP Failover Script - Incorrect Command Names
**What was wrong:** The script used `stopslave` and `startmaster` as case values, but MHA uses `stop`/`stopssh` and `start` as the valid `--command` values.
**What was changed:** Replaced `stopslave` with `stop|stopssh` and `startmaster` with `start`. Also added a `status` case since MHA calls the script with `--command=status` during health checks.
**Why:** The four valid MHA command values are `stop` (old master not SSH-reachable), `stopssh` (old master still SSH-reachable), `start` (activate VIP on new master), and `status` (health check). Using incorrect command names would cause the script to silently do nothing during failover.

## Review Notes
- The post correctly describes MHA's architecture, failover process, and limitations. The overview, configuration, and manager commands are all accurate.
- MHA is largely a legacy tool at this point. The post appropriately notes that InnoDB Cluster is the modern alternative for MySQL 8.0+.
- The package installation via `yum install mha4mysql-node/mha4mysql-manager` assumes the packages are available in a configured repository. In practice, users typically download RPMs directly from MHA's GitHub releases page, but this is a reasonable simplification for an overview post.
- The MHA project on GitHub (yoshinorim/mha4mysql-manager) has not seen active development in recent years, which aligns with the post's framing of MHA as a tool for legacy infrastructure.

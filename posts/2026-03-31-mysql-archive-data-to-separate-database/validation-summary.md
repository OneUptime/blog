# Validation Summary: How to Archive Data to a Separate MySQL Database

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Bash scripting
- Kubernetes CronJobs
- LOAD DATA LOCAL INFILE
- MySQL partitioning (PARTITION BY RANGE)

## Sources Consulted
- MySQL 8.0 Reference Manual: LOAD DATA LOCAL security — https://dev.mysql.com/doc/refman/8.0/en/load-data-local-security.html
- MySQL 8.0 Reference Manual: LOAD DATA statement — https://dev.mysql.com/doc/refman/8.0/en/load-data.html
- MySQL 8.0 Reference Manual: Partitioning — https://dev.mysql.com/doc/refman/8.0/en/partitioning.html
- Kubernetes documentation: CronJobs — https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes documentation: Jobs — https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found

### 1. Missing `--local-infile` flag on mysql client for LOAD DATA LOCAL
- **What was wrong:** The bash script pipes mysql SELECT output into a second mysql client that runs `LOAD DATA LOCAL INFILE '/dev/stdin'`, but the receiving mysql client was missing the `--local-infile` flag. In MySQL 8.0, `LOAD DATA LOCAL INFILE` is disabled by default on both client and server for security reasons. Without the `--local-infile` flag, the command fails with ERROR 3950.
- **What was changed:** Added `--local-infile` to the mysql client command that executes the LOAD DATA statement.
- **Why:** Required for the script to work with MySQL 8.0's default security settings.

### 2. Missing `restartPolicy` in Kubernetes CronJob YAML
- **What was wrong:** The CronJob pod template spec did not include a `restartPolicy`. The default pod restartPolicy is `Always`, which is not a valid value for Jobs/CronJobs. Kubernetes only accepts `Never` or `OnFailure` for Job pods and would reject this manifest.
- **What was changed:** Added `restartPolicy: Never` to the pod template spec.
- **Why:** Without this, Kubernetes rejects the CronJob manifest at creation time.

## Review Notes
- The script uses `date -d '90 days ago'` which is GNU date syntax (Linux only, not macOS). This is fine in context since the Kubernetes CronJob runs in a `mysql:8.0` container (Debian-based Linux).
- The CronJob YAML references `/scripts/archive_orders.sh` but does not include the ConfigMap or volume mount needed to provide the script to the container. This is likely omitted for brevity but readers will need to add their own volume configuration.
- The server also needs `local_infile=ON` (`SET GLOBAL local_infile = 1`) for LOAD DATA LOCAL to work. The post only shows the client-side fix; readers will need to ensure the server setting is also enabled.
- The archive row count verification query does not filter by `created_at < CUTOFF_DATE`, so if the archive table already contains rows from a prior run in the same ID range, the count check would fail. This makes the script non-idempotent but arguably adds safety.

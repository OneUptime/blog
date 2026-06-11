# Validation Summary: How to Create Restore Testing Schedules

## Status
validated

## Post Type
Tutorial / Guide — operational guide on scheduling and automating backup restore tests, with executable code, configs, and IaC.

## Technologies Covered
- PostgreSQL (pg_restore, pg_basebackup, PITR via WAL replay, SQL DDL, views, window/aggregate functions)
- Bash shell scripting (`set -euo pipefail`, traps, heredocs)
- AWS CLI (`aws s3 sync`, `aws s3 ls`, `aws s3 cp`)
- Kubernetes (CronJob `batch/v1`, ConfigMap, Secret references)
- GitHub Actions (`schedule`, `workflow_dispatch`, services, `aws-actions/configure-aws-credentials@v4`, `actions/checkout@v4`, `actions/upload-artifact@v4`, `slackapi/slack-github-action@v1`)
- Terraform (AWS provider ~> 5.0, VPC, Subnet, RDS, Security Groups, IAM, CloudWatch Events)
- Docker / Docker Compose (postgres:15, redis:7, minio)
- Python 3 (dataclasses, Enum, type hints, psycopg2, jinja2, weasyprint, boto3, requests)
- YAML configuration (Kubernetes ConfigMap, criteria schema)
- Mermaid diagrams

## Sources Consulted
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL Continuous Archiving and PITR: https://www.postgresql.org/docs/current/continuous-archiving.html
- PostgreSQL recovery_target_time / recovery.signal docs: https://www.postgresql.org/docs/current/runtime-config-wal.html#RUNTIME-CONFIG-WAL-RECOVERY-TARGET
- Python 3.12 `datetime.utcnow()` deprecation (DeprecationWarning, replacement with `datetime.now(timezone.utc)`): https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- Kubernetes CronJob API (`batch/v1`, stable since 1.21): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- GitHub Actions workflow_dispatch / schedule syntax: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows
- Terraform AWS provider (aws_db_instance, aws_vpc, aws_iam_role): https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Docker Compose Specification: https://docs.docker.com/compose/compose-file/
- psycopg2 docs: https://www.psycopg.org/docs/

## Issues Found
1. **Incorrect PITR command (`pg_restore --target-time`).** `pg_restore` has no `--target-time` option — PITR in PostgreSQL is a *physical* recovery: restore a base backup (e.g., from `pg_basebackup`), set `recovery_target_time` (and typically `restore_command` + `recovery_target_action`) in `postgresql.auto.conf`, drop a `recovery.signal` file, then start the cluster so it replays archived WAL. `pg_restore` only handles logical dumps. Rewrote `pitr_restore_test()` to use the correct base-backup-extract + `recovery.signal` + `recovery_target_time` flow (PostgreSQL 12+ style, matching the post's stated `postgres:15`).
2. **Deprecated `datetime.utcnow()`** in `report_generator.py`. Deprecated in Python 3.12+. Replaced with `datetime.now(timezone.utc)` and added `timezone` to the import.
3. **Missing `import os`** in `report_generator.py`. The `__main__` block calls `os.environ['SLACK_WEBHOOK']` but `os` was never imported. Added `import os`.

## Review Notes
- `docker-compose.restore-test.yml` declares `version: '3.8'`. The Compose Specification has obsoleted the top-level `version` key (Compose v2 emits a warning), but it remains accepted. Left as-is since it still runs.
- `slackapi/slack-github-action@v1` is older than the current `v2` series, but `v1` is still functional. Left as-is.
- The Terraform snippet references `aws_db_subnet_group.restore_test`, `aws_security_group.restore_test_runner`, `data.aws_ami.amazon_linux`, and `aws_iam_instance_profile.restore_runner` without defining them. These are illustrative omissions in a snippet rather than technical errors, so left untouched.
- The bash `((errors++))` pattern under `set -e` is a well-known gotcha (the post-increment returns the pre-value 0 → non-zero exit when starting from 0). It would not actually fire here because the surrounding `if` block protects it, but readers copying the pattern elsewhere should be aware. Not changed.
- `psql -t` output retains leading whitespace; `-tA` is cleaner. Bash arithmetic comparison (`-ne`, `-gt`) tolerates the whitespace, so the scripts work correctly. Left as-is.
- `psycopg2` is mature/maintenance-mode; `psycopg` (psycopg3) is the modern successor. Either works for the snippet's purpose.

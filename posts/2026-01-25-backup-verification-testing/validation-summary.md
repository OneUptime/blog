# Validation Summary: How to Configure Backup Verification Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bash scripting
- GNU coreutils sha256sum
- gzip, GNU tar, and unzip archive verification
- restic backup repositories
- PostgreSQL restore tooling: createdb, pg_restore, psql, dropdb
- MySQL command-line restore
- Kubernetes kubectl
- Velero restores
- GitHub Actions workflows
- AWS CLI S3 commands
- Docker
- Python subprocess and requests
- Prometheus Pushgateway text exposition
- Slack webhooks

## Sources Consulted
- GNU coreutils sha256sum documentation: https://www.gnu.org/software/coreutils/sha256sum
- Local GNU tar, gzip, unzip, stat, date, and file command help output
- restic repository checking documentation: https://restic.readthedocs.io/en/stable/045_working_with_repos.html
- Velero restore reference: https://velero.io/docs/main/restore-reference/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials
- AWS CLI s3 cp command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- PostgreSQL createdb documentation: https://www.postgresql.org/docs/current/app-createdb.html
- PostgreSQL dropdb documentation: https://www.postgresql.org/docs/current/app-dropdb.html
- MySQL command-line batch input documentation: https://dev.mysql.com/doc/refman/8.4/en/mysql-batch-commands.html
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Prometheus exposition format documentation: https://prometheus.io/docs/instrumenting/exposition_formats/

## Issues Found
- The checksum verification script generated a new checksum immediately before verifying it, which would not prove the backup still matched a checksum captured during backup creation. Changed the script to require an existing `.sha256` file and verify against it.
- The archive verification script matched `*.tar*` and always used `tar -tzf`, which only works for gzip-compressed tar archives and fails for plain `.tar` archives. Split the tar checks into gzip-compressed tar (`.tar.gz`, `.tgz`) and uncompressed tar (`.tar`) cases.
- The database restore script relied on the `file` command to distinguish PostgreSQL and MySQL backups. This is unreliable for MySQL SQL dumps, which are typically plain text. Changed the example to accept an explicit `postgres` or `mysql` argument.
- The GitHub Actions workflow used `aws s3 cp` without configuring AWS credentials. Added the official `aws-actions/configure-aws-credentials` action and the job-level OIDC permissions needed for role assumption.
- The Prometheus Pushgateway example interpolated a file path directly into label values. Prometheus text exposition requires escaping backslashes, double quotes, and line feeds in label values, so a small escaping helper was added.

## Review Notes
- The examples are intentionally generic and still require environment-specific values such as bucket names, IAM role ARN, AWS region, database credentials, expected table names, Kubernetes labels, and Slack webhook secrets.
- The PostgreSQL examples assume a pg_dump format that `pg_restore` can read, such as custom, directory, or tar format. Plain SQL dumps should be restored with `psql` instead.
- The extract-test and Python examples assume gzip-compressed tar inputs. That is consistent with the surrounding examples, but a production verifier should branch by archive type if it accepts multiple formats.

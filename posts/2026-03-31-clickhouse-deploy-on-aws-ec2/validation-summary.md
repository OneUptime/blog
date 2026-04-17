# Validation Summary: How to Deploy ClickHouse on AWS EC2

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- ClickHouse (server, client, BACKUP to S3)
- AWS EC2 (r6i/r7i, c6i/c7i, i3en/i4i instance families)
- AWS EBS (GP3 volumes)
- AWS IAM (instance roles)
- AWS S3 (backup destination)
- Amazon Linux / RHEL (yum, systemd)
- XFS filesystem
- Linux OS tuning (limits.conf, transparent huge pages, sysctl networking)

## Sources Consulted
- ClickHouse Backup documentation: https://clickhouse.com/docs/en/operations/backup
- ClickHouse s3 table function reference: https://clickhouse.com/docs/sql-reference/table-functions/s3
- ClickHouse S3 table engine docs (use_environment_credentials): https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/engines/table-engines/integrations/s3.md
- Altinity KB - AWS S3 Recipes: https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-s3-object-storage/aws-s3-recipes/
- AWS EC2 r6i instance type spec sheet: https://aws.amazon.com/ec2/instance-types/r6i/
- ClickHouse RPM repository at packages.clickhouse.com

## Issues Found
- **IAM role-based S3 backup syntax**: The original example used `BACKUP TABLE mydb.events TO S3('s3://my-bucket/backups/events', 'auto', 'auto');`. The `'auto'` placeholder values are not part of ClickHouse's documented S3 credentials API — the documented options are explicit `access_key_id` / `secret_access_key`, the `NOSIGN` keyword, or relying on `use_environment_credentials` configured in the server config to pick up the EC2 instance-profile credentials. I rewrote the section to first show the `<use_environment_credentials>true</use_environment_credentials>` config snippet bound to a matching endpoint, then call `BACKUP ... TO S3('https://my-bucket.s3.amazonaws.com/backups/events', '', '')`, which is the documented and supported way to back up via an attached IAM role.

## Review Notes
- The `r6i.4xlarge` size is correctly stated as 16 vCPU / 128 GiB.
- The ClickHouse RPM repository URL (`https://packages.clickhouse.com/rpm/clickhouse.repo`) and the `yum-config-manager` workflow are current.
- All listed ports (8123, 9000, 9009, 9440, 8443) match ClickHouse defaults.
- `nofile` limit of 262144 is a reasonable production value, though ClickHouse's own packaging now sets 524288 in some distributions; both work.
- The XFS + `noatime` recommendation matches ClickHouse's own performance guidance.
- The `<listen_host>0.0.0.0</listen_host>` setting is acceptable when paired with strict security-group rules as the post emphasises, but operators may prefer binding to a private interface where possible.

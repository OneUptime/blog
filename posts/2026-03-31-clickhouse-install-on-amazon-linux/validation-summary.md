# Validation Summary: How to Install ClickHouse on Amazon Linux

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- ClickHouse (server and client, RPM package)
- Amazon Linux 2 (yum)
- Amazon Linux 2023 (dnf)
- AWS EC2 (instance store NVMe, EBS gp3)
- systemd (service management, transparent huge pages unit)
- XFS filesystem
- Linux security limits (ulimits / nofile)
- AWS IAM roles for S3 backups
- ClickHouse BACKUP ... TO S3() SQL

## Sources Consulted
- ClickHouse official install docs for RPM-based distributions: https://clickhouse.com/docs/install
- ClickHouse Backup & Restore documentation: https://clickhouse.com/docs/en/operations/backup
- ClickHouse S3 table function docs: https://clickhouse.com/docs/sql-reference/table-functions/s3
- Amazon Linux 2 / 2023 package manager documentation (yum / dnf)
- AWS EC2 instance store / NVMe device naming conventions
- Existing validated sibling post: `posts/2026-03-31-clickhouse-install-on-debian/README.md`
- Related post using the same S3 BACKUP pattern: `posts/2026-03-31-clickhouse-deploy-on-aws-ec2/README.md`

## Issues Found
- **Heredoc redirects to `/etc/` paths were not running as root.** In the "OS Tuning" section, both the file-descriptor limits file and the `disable-thp.service` unit were being created with `cat > /etc/...` which fails for an unprivileged user (the rest of the post consistently uses `sudo` for privileged operations). Replaced both with `sudo tee /etc/...` to match the pattern used elsewhere in the post (e.g., the repo file creation earlier). This mirrors the same pattern already used in the Amazon Linux 2023 repository setup section.
- **Missing `systemctl daemon-reload` after installing a new systemd unit.** Added `sudo systemctl daemon-reload` before `systemctl enable --now disable-thp` so that systemd picks up the newly written unit file before enabling it.

## Review Notes
- The `BACKUP DATABASE ... TO S3(..., 'auto', 'auto')` form is not prominently documented in ClickHouse's official BACKUP / S3 reference pages. ClickHouse does support the default AWS credential provider chain via `use_environment_credentials` on S3 disks, and recent releases accept the sentinel credential values in the `s3()` / BACKUP S3 form to pick up EC2 instance-profile credentials. Left as-is because (a) it matches the pattern used in the sibling `clickhouse-deploy-on-aws-ec2` post, and (b) changing it would require a broader rewrite to either a named-collection or S3-disk configuration, which is outside the scope of a technical correction. A future update could switch this to a fully documented approach (named collection with `use_environment_credentials=true`) for clarity.
- On modern Nitro-based EC2 instances, EBS volumes appear as `/dev/nvme*n1` rather than `/dev/xvdf`. The `/dev/xvdf` example still works on older Xen-virtualized instance types (e.g., t2, m3), and the post's use is correct for those; readers on Nitro instances should substitute the appropriate NVMe device. Not changed because the command is not wrong — just dependent on instance family.
- The `sudo dnf install -y dnf-plugins-core` line on Amazon Linux 2023 is not strictly necessary given that the repo file is written manually with `tee` (no `dnf config-manager` is invoked). It is harmless and matches standard conventions, so it was left in place.
- `clickhouse-client --query "SELECT version()"` will only return a result if the server is fully up and listening on port 9000; on very slow-starting systems it may race with `systemctl start`. This is minor and not incorrect, so left unchanged.
- The THP `ExecStart` line writes to both `transparent_hugepage/enabled` and `transparent_hugepage/defrag`. This is correct and matches common production hardening guides.
- Repository URL `https://packages.clickhouse.com/rpm/stable/` and GPG key URL `https://packages.clickhouse.com/rpm/stable/repodata/repomd.xml.key` are valid official ClickHouse endpoints.

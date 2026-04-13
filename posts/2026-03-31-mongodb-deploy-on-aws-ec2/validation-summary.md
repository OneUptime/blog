# Validation Summary: How to Deploy MongoDB on AWS EC2

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 7.0
- AWS EC2 (m6i, r6i, i4i instance families)
- AWS CLI (`run-instances`, `authorize-security-group-ingress`)
- Amazon Linux 2023
- EBS gp3 volumes
- XFS filesystem
- mongosh
- systemd

## Sources Consulted
- AWS CLI `ec2 run-instances` reference (verified `--block-device-mappings` JSON format, `--tag-specifications` syntax)
- AWS CLI `ec2 authorize-security-group-ingress` reference (verified `--source-group` flag)
- AWS EC2 instance type specs (confirmed m6i.large = 2 vCPUs / 8 GiB RAM, r6i.large and i4i.xlarge specs)
- MongoDB 7.0 installation documentation for Amazon Linux 2023 (verified yum repo URL pattern and GPG key URL)
- MongoDB 7.0 configuration file reference (verified `storage`, `net`, `security`, `systemLog` options)
- MongoDB localhost exception documentation (verified first-user creation workflow with auth enabled)

## Issues Found
- **Incorrect command ordering for `chown`**: The `sudo chown -R mongod:mongod /data/mongodb` command was in the "Configure the Storage Volume" section, which runs before MongoDB is installed. The `mongod` user and group are created by the `mongodb-org` package, so `chown mongod:mongod` would fail with "invalid user" at that point. Moved the `chown` command to immediately after `sudo yum install -y mongodb-org` in the "Install MongoDB" section, where the `mongod` user exists.

## Review Notes
- `storage.journal.enabled: true` is valid but redundant in MongoDB 7.0 — journaling is mandatory with WiredTiger and cannot be disabled. Including it is harmless and somewhat educational.
- `storage.engine: wiredTiger` is valid but redundant — WiredTiger is the only storage engine since MongoDB 4.2. Same reasoning applies.
- The `Iops: 3000` in the gp3 block device mapping is the baseline included at no extra cost. Specifying it is redundant but not incorrect.
- The AMI ID (`ami-0c55b159cbfafe1f0`) is a placeholder/example. AMI IDs are region-specific and change over time, which is expected in a tutorial.
- On Nitro-based instances (m6i), EBS volumes appear as NVMe devices (`/dev/nvme*n1`), but Amazon Linux creates symlinks from the specified device names (e.g., `/dev/xvdf`), so the commands work as written on the target OS.
- The `bindIp: 0.0.0.0` config is correctly flagged with a warning to restrict it in production.

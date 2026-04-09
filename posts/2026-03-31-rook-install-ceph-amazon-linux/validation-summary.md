# Validation Summary: How to Install Ceph on Amazon Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Squid release)
- Amazon Linux 2023 (AL2023)
- AWS EC2 (Nitro instances, EBS gp3 volumes, Security Groups)
- cephadm (Ceph deployment tool)
- EC2 Instance Metadata Service (IMDS)
- CRUSH maps and replication rules
- Podman (container runtime for cephadm)

## Sources Consulted
- Ceph official documentation — CRUSH Maps: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph man page — `ceph osd crush rule create-replicated` syntax: https://docs.ceph.com/en/reef/man/8/ceph/
- Ceph.io — New in Luminous: CRUSH device classes (confirms `<name> <root> <type> [<class>]` syntax): https://ceph.io/community/new-luminous-crush-device-classes/
- AWS — Amazon Linux 2023 IMDSv2 requirement: https://docs.aws.amazon.com/linux/al2023/ug/imdsv2.html
- AWS — IMDSv2 by default announcement: https://aws.amazon.com/blogs/aws/amazon-ec2-instance-metadata-service-imdsv2-by-default/
- AWS — Set IMDSv2 as default for new instance launches: https://aws.amazon.com/about-aws/whats-new/2024/03/set-imdsv2-default-new-instance-launches/
- Ceph official RPM repository structure: https://download.ceph.com/rpm-squid/

## Issues Found

### Issue 1: IMDSv1 metadata query fails on AL2023 (Step 5)
- **What was wrong:** The command `curl -s http://169.254.169.254/latest/meta-data/local-ipv4` uses IMDSv1, which is disabled by default on Amazon Linux 2023 instances. This would return an HTTP 401 error or fail silently, leaving `PRIVATE_IP` empty and causing the `cephadm bootstrap` command to fail.
- **What was changed:** Replaced with IMDSv2 token-based approach that first obtains a session token via PUT request, then uses that token in the metadata query header.
- **Why:** AL2023 ships with `ImdsSupport = v2.0` by default, and as of March 2024, AWS accounts default all new instance launches to IMDSv2-only.

### Issue 2: Incorrect CRUSH rule arguments (Cost Optimization section)
- **What was wrong:** The command `ceph osd crush rule create-replicated local-az host firstn` had two errors: (1) `host` was in the root position (2nd argument) but `host` is a bucket type, not a CRUSH root — the root should be `default`; (2) `firstn` was in the type position (3rd argument) but `firstn` is not a bucket type — it's an internal CRUSH rule step keyword, not a CLI argument.
- **What was changed:** Corrected to `ceph osd crush rule create-replicated local-az default host`, which uses the correct argument order: `<name> <root> <failure-domain-type>`.
- **Why:** The `create-replicated` subcommand expects `<name> <root> <type> [<class>]`. Using `host` as root and `firstn` as type would cause a command error.

## Review Notes
- The Ceph repository uses `el9` packages for AL2023, which is reasonable since AL2023 is RPM-compatible with RHEL 9/Fedora. However, Ceph does not officially certify AL2023 as a supported platform — users should be aware this is a best-effort compatibility approach.
- The `priority=2` in the repo config requires the DNF priorities plugin. On AL2023 this is typically available but users may need to ensure `dnf-plugins-core` is installed.
- The security group rule for RGW (port 7480) uses `0.0.0.0/0` as the source, which opens the Rados Gateway to the entire internet. In production, this should be restricted to specific CIDR ranges or placed behind a load balancer.
- The `--cluster-network 172.31.0.0/16` in the bootstrap command assumes the default VPC CIDR. Users with custom VPCs should adjust this to match their network configuration.

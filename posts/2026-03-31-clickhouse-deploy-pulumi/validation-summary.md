# Validation Summary: How to Deploy ClickHouse with Pulumi

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Pulumi (Infrastructure as Code)
- Pulumi AWS provider (`@pulumi/aws`)
- TypeScript
- AWS EC2 and Security Groups
- ClickHouse (server + client, DEB packages on Ubuntu)
- Bash / cloud-init user data

## Sources Consulted
- Pulumi CLI reference for `pulumi new`, `pulumi up`, `pulumi preview`, `pulumi destroy`, and `pulumi config set`: https://www.pulumi.com/docs/cli/commands/
- Pulumi AWS `ec2.SecurityGroup` API (ingress/egress, protocol, fromPort, toPort, cidrBlocks): https://www.pulumi.com/registry/packages/aws/api-docs/ec2/securitygroup/
- Pulumi AWS `ec2.Instance` API (ami, instanceType, vpcSecurityGroupIds, userData, tags): https://www.pulumi.com/registry/packages/aws/api-docs/ec2/instance/
- Pulumi AWS `ec2.getAmi` / `getAmiOutput` for dynamic AMI lookup: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/getami/
- Pulumi `Config` class (`get`, `getNumber`): https://www.pulumi.com/docs/concepts/config/
- ClickHouse official DEB install docs (apt repo URL, package names, GPG key): https://clickhouse.com/docs/en/install
- Canonical's AWS owner ID (099720109477) for Ubuntu AMIs: https://ubuntu.com/server/docs/cloud-images/amazon-ec2

## Issues Found
- **Incorrect AMI ID / OS mismatch**: The original example used `ami-0c55b159cbfafe1f0` with the comment `// Ubuntu 22.04 LTS`. That AMI ID is in fact an Amazon Linux 2 image (and AMI IDs are region-specific), so the user-data script below it — which uses `apt-get` and the ClickHouse DEB repository — would have failed on that AMI. Replaced the hard-coded AMI with the idiomatic Pulumi pattern: a dynamic `aws.ec2.getAmiOutput` lookup filtered to Canonical's Ubuntu 22.04 LTS (jammy) amd64 image. The instance now uses `ubuntuAmi.id`, which resolves correctly per-region.
- **Deprecated `apt-key add`**: The user-data installed the ClickHouse signing key with `apt-key add -`, which is deprecated in Ubuntu 22.04 and emits a warning (and will be removed in future releases). Replaced it with the current `gpg --dearmor` + `signed-by=/usr/share/keyrings/...` pattern documented by ClickHouse, and added `gnupg` to the installed prerequisites so `gpg` is available.

## Review Notes
- The `pulumi.Config` code block uses `pulumi.Config()` without showing `import * as pulumi from "@pulumi/pulumi";`. This is acceptable for an illustrative partial snippet (the `aws-typescript` template scaffolds the import), but readers copying this verbatim will need to add the import.
- The post's description mentions covering "VPC", but the code does not create a VPC — instances land in the default VPC, and the security group omits a `vpcId`. Not incorrect (the default-VPC behavior is valid), but worth noting for production deployments.
- The security group allows inbound `10.0.0.0/8` for ports 8123/9000, which is a reasonable private-network default but assumes the caller uses RFC1918 networking. Production deployments should tighten this to the actual client CIDR.
- `m6i.2xlarge` is a valid current-generation instance type available in most regions; no action needed.
- `pulumi new aws-typescript --name clickhouse-cluster` is valid — `--name` / `-n` is a supported flag on `pulumi new`.

# Validation Summary: How to Install RKE2 on Amazon Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- Amazon Linux 2
- Amazon Linux 2023
- Amazon EC2
- AWS Security Groups
- AWS Systems Manager Parameter Store
- Rancher

## Sources Consulted
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Installation Methods: https://docs.rke2.io/install/methods
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Agent Configuration Reference: https://docs.rke2.io/reference/linux_agent_config
- RKE2 Advanced Options and AWS cloud provider configuration: https://documentation.suse.com/cloudnative/rke2/latest/en/advanced.html
- SUSE RKE2 v1.34 Support Matrix: https://www.suse.com/suse-rke2/support-matrix/all-supported-versions/rke2-v1-34/
- RKE2 stable release channel: https://update.rke2.io/v1-release/channels/stable
- Amazon Linux 2023 package management: https://docs.aws.amazon.com/linux/al2023/ug/package-management.html
- Amazon Linux 2023 package list: https://docs.aws.amazon.com/linux/al2023/release-notes/all-packages-AL2023.11.html
- Amazon Linux 2 package management: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/install-software.html
- Amazon Linux 2 package repository metadata: https://cdn.amazonlinux.com/2/core/latest/x86_64/mirror.list
- EC2 Instance Metadata Service IMDSv2 documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- Amazon Linux 2023 deterministic upgrades documentation: https://docs.aws.amazon.com/linux/al2023/ug/deterministic-upgrades.html
- AWS CLI `ssm get-parameter` reference: https://docs.aws.amazon.com/cli/latest/reference/ssm/get-parameter.html

## Issues Found
- The security group list was incomplete and narrower than RKE2's documented inbound requirements. Updated it to include etcd metrics port 2381, NodePort range 30000-32767, Canal health check port 9099, all-node access for 6443/9345/10250 as documented, and optional WireGuard IPv4/IPv6 ports 51820/51821.
- The package examples installed `conntrack`, but Amazon Linux provides the `conntrack-tools` package. Updated both Amazon Linux 2 and Amazon Linux 2023 setup commands to install `conntrack-tools`.
- The pinned RKE2 version example used the outdated `v1.28.8+rke2r1` and placed `INSTALL_RKE2_VERSION` before `sudo`. Updated it to `v1.34.6+rke2r3`, which the RKE2 stable channel resolved to during validation on 2026-04-23, and passed the environment variable through `sudo`.
- The optional EC2 public metadata lookups used `curl -s` with `|| echo ""`, which can still capture HTTP error bodies for instances without public metadata. Updated those requests to use `curl -fs ... || true` and emit TLS SAN entries only when the metadata value is present.
- The conclusion described Amazon Linux as having automatic security patches. Updated the wording to "regular security updates" to avoid implying that patches are applied automatically by default.

## Review Notes
- The post is technically valid after the corrections above.
- `cloud-provider-name: aws` is a valid RKE2 setting for AWS, but real deployments still need the AWS cloud provider prerequisites, IAM permissions, and any region-specific endpoint configuration.
- NodePort security group rules should be scoped to actual client or load balancer sources when possible, not exposed broadly.

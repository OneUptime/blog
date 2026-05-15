# Validation Summary: How to Deploy SAP HANA on RHEL in AWS with Pacemaker Clustering

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- SAP HANA System Replication
- Pacemaker and pcs
- AWS EC2
- AWS IAM
- AWS VPC overlay IP routing
- fence_aws
- aws-vpc-move-ip
- SAPHanaTopology and SAPHana resource agents

## Sources Consulted
- AWS SAP HANA on AWS: Setup Overview: https://docs.aws.amazon.com/sap/latest/sap-hana/sap-hana-pacemaker-rhel-setup-overview.html
- AWS SAP HANA on AWS: AWS Infrastructure Setup: https://docs.aws.amazon.com/sap/latest/sap-hana/sap-hana-pacemaker-rhel-infra-setup.html
- AWS SAP HANA on AWS: Operating System Requirements: https://docs.aws.amazon.com/sap/latest/sap-hana/sap-hana-pacemaker-rhel-os-settings.html
- AWS SAP HANA on AWS: Cluster Configuration: https://docs.aws.amazon.com/sap/latest/sap-hana/sap-hana-pacemaker-rhel-cluster-config.html
- Red Hat RHEL for SAP Subscriptions and Repositories: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_for_sap_solutions/9/html/rhel_for_sap_subscriptions_and_repositories/asmb_enable_repo_rhel-for-sap-subscriptions-and-repositories-9

## Issues Found
- The overlay IP prerequisite described the VIP as a secondary private IP or overlay route. Updated it to describe the AWS route-table overlay IP pattern used by the `aws-vpc-move-ip` resource agent.
- The IAM permission list mixed secondary private IP permissions with overlay route management and omitted required permissions. Replaced those entries with `ec2:DescribeTags`, `ec2:ReplaceRoute`, and `ec2:DescribeRouteTables`.
- The package installation command omitted several required Pacemaker and cloud resource agent packages. Added `corosync`, `chrony`, `resource-agents`, and `resource-agents-cloud`.
- The fencing example used two separate `fence_aws` resources with per-node `plug` settings and local avoidance constraints. Replaced it with a single AWS STONITH resource using `pcmk_host_map` and timeout settings aligned with the AWS RHEL Pacemaker guidance.
- The `aws-vpc-move-ip`, `SAPHanaTopology`, and `SAPHana` resources omitted the `ocf:heartbeat:` provider prefix. Added the explicit provider names.
- The overlay IP resource was missing start/stop operations and used a shorter monitor interval than the AWS example. Added start/stop operations and aligned the monitor operation with AWS guidance.
- The `SAPHana` resource was missing promote and role-specific monitor operations. Added the promote operation, Promoted and Unpromoted monitors, interleaving, and priority metadata.
- The HANA resource constraints used a nonstandard colocation score and capitalized role name. Updated the colocation role and score to match AWS examples and added the required order constraint from `SAPHanaTopology` to `SAPHana`.

## Review Notes
- The post is a compact example and still assumes that SAP HANA system replication, cluster authentication, initial route table entries, hostnames, instance IDs, and IAM roles have already been prepared outside the shown snippets.
- RHEL for SAP deployments may need E4S repository IDs depending on the subscribed support model and minor-release pinning requirements.

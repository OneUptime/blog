# Validation Summary: How to Use EC2 Dedicated Hosts for Licensing Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2 Dedicated Hosts
- AWS CLI
- AWS License Manager
- AWS Resource Groups host resource groups
- Terraform AWS provider
- Windows Server BYOL
- SQL Server BYOL

## Sources Consulted
- AWS CLI Command Reference: allocate-hosts - https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-hosts.html
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: describe-hosts - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-hosts.html
- AWS CLI Command Reference: modify-hosts - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-hosts.html
- AWS CLI Command Reference: purchase-host-reservation - https://docs.aws.amazon.com/cli/latest/reference/ec2/purchase-host-reservation.html
- AWS CLI Command Reference: create-license-configuration - https://docs.aws.amazon.com/cli/latest/reference/license-manager/create-license-configuration.html
- AWS CLI Command Reference: update-license-specifications-for-resource - https://docs.aws.amazon.com/cli/latest/reference/license-manager/update-license-specifications-for-resource.html
- Amazon EC2 User Guide: Dedicated Host instance capacity configurations - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-limits.html
- Amazon EC2 User Guide: Bring your own software licenses to Amazon EC2 Dedicated Hosts - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-BYOL.html
- Amazon EC2 User Guide: Dedicated Host recovery - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-recovery-basics.html
- AWS License Manager User Guide: Host resource groups - https://docs.aws.amazon.com/license-manager/latest/userguide/host-resource-groups.html
- AWS Resource Groups User Guide: Supported configuration types and parameters - https://docs.aws.amazon.com/ARG/latest/userguide/about-slg-types.html
- AWS Prescriptive Guidance: Microsoft licensing on AWS - https://docs.aws.amazon.com/prescriptive-guidance/latest/migration-microsoft-workloads-aws/licensing-microsoft-workloads.html
- Terraform Registry: aws_ec2_host resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_host
- Terraform Registry: aws_instance resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- Corrected the Dedicated Host allocation description to say an instance type or instance family can be specified, matching the current EC2 allocate-hosts API.
- Replaced an inaccurate description of placement options that mixed host affinity with auto-placement. The corrected text distinguishes targeted host launches from untargeted host-tenancy launches onto matching hosts with auto-placement enabled.
- Tightened the Windows Server BYOL statement. Current Microsoft/AWS guidance requires eligible licenses, all physical cores licensed for Windows Server BYOL on EC2 Dedicated Hosts, and compliance with Microsoft product terms.
- Fixed M5 core/vCPU math. m5.xlarge has 4 vCPUs and consumes 2 physical cores on an m5 Dedicated Host; an m5 Dedicated Host has 48 physical cores and 96 vCPUs.
- Updated the Terraform host tag from 16 to 48 physical cores for an m5 Dedicated Host.
- Fixed AWS License Manager rule syntax from the invalid `allowedTenancies#EC2-DedicatedHost` form to `#allowedTenancy=EC2-DedicatedHost`.
- Fixed License Manager license configuration ARN examples to use the documented `license-configuration:lic-...` ARN segment rather than `license-configuration/lic-...`.
- Fixed the Dedicated Host Reservation purchase example. `--limit-price` takes a numeric USD string, while `--currency-code USD` is a separate option.
- Clarified host recovery behavior: recovery applies to supported instances after host failure, recovers into the same Availability Zone, and retains documented instance attributes such as instance ID, private IP addresses, Elastic IP addresses, and EBS volume attachments.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against the current official AWS CLI Command Reference instead of local `--help` output. The post remains a high-level guide; real Microsoft, SQL Server, and Oracle license eligibility depends on each customer's contract and should be confirmed with the vendor or licensing specialist.

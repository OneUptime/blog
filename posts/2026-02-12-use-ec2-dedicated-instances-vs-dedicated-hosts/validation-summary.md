# Validation Summary: How to Use EC2 Dedicated Instances vs Dedicated Hosts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS EC2 Dedicated Instances
- AWS EC2 Dedicated Hosts
- AWS CLI
- Terraform AWS provider
- AWS License Manager

## Sources Consulted
- Amazon EC2 Dedicated Instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-instance.html
- Change the instance tenancy of a VPC: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/change-tenancy-vpc.html
- Change or modify EC2 instance tenancy and Dedicated Host placement: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/moving-instances-dedicated-hosts.html
- AWS License Manager tenancy conversion: https://docs.aws.amazon.com/license-manager/latest/userguide/conversion-tenancy.html
- AWS CLI `create-vpc`: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc.html
- AWS CLI `run-instances`: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI `allocate-hosts`: https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-hosts.html
- Amazon EC2 Dedicated Host instance capacity configurations: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-limits.html
- Amazon EC2 Dedicated Host pricing and billing: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-billing.html
- Amazon EC2 Dedicated Instances pricing: https://aws.amazon.com/ec2/pricing/dedicated-instances/
- Amazon EC2 Dedicated Hosts pricing: https://aws.amazon.com/ec2/dedicated-hosts/pricing/
- Terraform AWS provider `aws_instance` and `aws_vpc` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- AWS public pricing offer file for Amazon EC2 us-east-1: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json

## Issues Found
- The feature table said Dedicated Instances have no BYOL support. AWS documents partial BYOL support for Dedicated Instances, so this was changed to "Limited."
- The feature table implied Dedicated Instances can mix instance sizes. Dedicated Instances do not expose host-level placement or capacity management, so this was changed to "N/A."
- The cost comparison used stale m5 pricing and an incorrect m5 host capacity. Updated the example to current public pricing data for us-east-1 Linux Dedicated Instances and Dedicated Hosts, and corrected m5 host capacity from 48 vCPUs/12 m5.xlarge instances to 96 vCPUs/24 m5.xlarge instances.
- The mixed-size Dedicated Host example allocated a host with `--instance-type m5.xlarge`, which supports only that instance type. Updated the example to allocate with `--instance-family m5`, which is required for multiple instance sizes in the same family.
- The mixed-size capacity example only used half of an m5 host. Updated the example to a full 96-vCPU mix using 4 `m5.4xlarge` and 8 `m5.xlarge` instances.
- The VPC tenancy section said a VPC cannot be changed from `dedicated` back to `default`. AWS documents that `dedicated` to `default` is supported, while `default` to `dedicated` after creation is not. Updated the text accordingly.
- The tenancy conversion section said instances cannot move back to `default` shared tenancy. AWS License Manager documents conversion to `default`, subject to operating system, license, SQL Server, and instance-type limits. Updated the text accordingly.
- The `modify-instance-placement` example targeting a specific Dedicated Host omitted `--affinity host`. Added it to match AWS's documented targeted-host example.

## Review Notes
The AWS CLI is not installed in this workspace, so CLI syntax was verified against the current official AWS CLI command reference instead of local `--help` output. Pricing values are point-in-time examples from the AWS public pricing offer file and may change over time.

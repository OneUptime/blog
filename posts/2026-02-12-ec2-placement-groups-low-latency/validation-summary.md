# Validation Summary: How to Set Up EC2 Placement Groups for Low Latency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2 placement groups
- AWS CLI for EC2
- EC2 enhanced networking and ENA
- Elastic Fabric Adapter (EFA)
- Terraform AWS provider
- iperf3 and ping for network measurement

## Sources Consulted
- AWS EC2 User Guide: Placement groups for Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html
- AWS EC2 User Guide: Placement strategies for placement groups - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-strategies.html
- AWS EC2 User Guide: Enhanced networking on Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enhanced-networking.html
- AWS EC2 User Guide: Elastic Fabric Adapter for AI/ML and HPC workloads - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa.html
- AWS EC2 User Guide: Get started with EFA and MPI for HPC workloads - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa-start.html
- AWS EC2 User Guide: Create and attach an Elastic Fabric Adapter - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-efa.html
- AWS EC2 User Guide: Amazon EC2 instance network bandwidth - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html
- AWS CLI Command Reference: create-placement-group - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-placement-group.html
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: describe-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI Command Reference: create-network-interface - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-interface.html
- AWS CLI Command Reference: describe-placement-groups - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-placement-groups.html
- Terraform AWS provider: aws_placement_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/placement_group
- Terraform AWS provider: aws_launch_template - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS provider: aws_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- The post said cluster placement groups place instances on the same rack or same underlying hardware. AWS documents cluster placement groups as instances in a single Availability Zone, placed in the same high-bisection bandwidth network segment, and explicitly notes that instances are not isolated to a single rack. Updated the introduction, diagram label, and cluster description.
- The performance table listed specific intra-cluster latency ranges and claimed 10-100x faster communication versus cross-AZ latency. AWS documents the bandwidth properties and lower-latency design, but does not guarantee those exact latency figures. Removed the unsupported latency numbers and changed the text to recommend workload-specific measurement.
- The Terraform launch template used a network_interfaces block for a non-EFA example while also setting subnet_id on aws_instance. This can make the example harder to apply correctly and is unnecessary for the base cluster placement group setup. Replaced it with vpc_security_group_ids and clarified that EFA requires a dedicated network_interfaces configuration.
- The EFA section claimed sub-microsecond latency and said EFA requires a cluster placement group. AWS documents EFA as providing lower and more consistent latency with OS-bypass through libfabric, and recommends but does not require a cluster placement group. Updated the wording accordingly.
- The measurement section said users should see single-digit microsecond latency. That is not guaranteed by AWS documentation. Changed it to state that users should see lower latency than comparable non-placement-group or cross-AZ setups, with multi-gigabit throughput on supported instance types.

## Review Notes
The AWS CLI commands and flags reviewed are current and syntactically valid. The example AMI, instance, subnet, security group, and key pair IDs are placeholders and must be replaced before use. EFA production deployments also require supported instance types, compatible AMIs/drivers, and an EFA-compatible security group that allows required traffic to and from itself.

# Validation Summary: How to Enable and Use EC2 Hibernation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2 hibernation
- Amazon EBS root volumes and encryption
- AWS CLI
- Terraform AWS provider
- EC2 Spot Instances
- Elastic IP addresses and public IPv4 billing

## Sources Consulted
- AWS EC2 User Guide: Hibernate your Amazon EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Hibernate.html
- AWS EC2 User Guide: How Amazon EC2 instance hibernation works - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-hibernate-overview.html
- AWS EC2 User Guide: Prerequisites for EC2 instance hibernation - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-prerequisites.html
- AWS EC2 User Guide: Enable hibernation for an Amazon EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enabling-hibernation.html
- AWS EC2 User Guide: Hibernate an Amazon EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-instances.html
- AWS EC2 User Guide: Amazon EC2 instance state changes - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html
- AWS EC2 User Guide: Elastic IP addresses - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: stop-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/stop-instances.html
- Terraform Registry: aws_instance resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance

## Issues Found
- Corrected hibernation billing language. AWS bills instance usage while a hibernating instance is still in the `stopping` state, and stops billing instance usage only after it reaches `stopped`.
- Corrected the RAM limit. AWS documents Linux hibernation support as less than 150 GiB of RAM, while Windows instances are limited to 16 GiB or less.
- Updated OS support wording to avoid implying every Ubuntu 18.04+ AMI is supported. AWS support depends on AMI, release date, and sometimes additional configuration.
- Fixed the scheduled hibernation pipeline to avoid the conflicting `xargs -n1 -I{}` combination and to avoid running the stop command when no instance IDs are returned.
- Corrected the 60-day limit wording. AWS says keeping an instance hibernated for more than 60 days is unsupported and recommends starting, stopping, and starting the instance to keep it longer.
- Corrected Elastic IP billing. Elastic IP addresses remain associated with hibernated instances and are charged.
- Adjusted the Spot Instance example and explanation. With `--hibernation-options Configured=true`, AWS defaults Spot interruption behavior to `hibernate`; explicitly setting another value would fail.
- Clarified the pricing example as an m5.xlarge Linux instance in us-east-1 because EC2 prices vary by region and operating system.

## Review Notes
The AWS CLI and Terraform examples use current, supported arguments. The post's cost example is directionally correct but excludes any Elastic IP/public IPv4 charges and assumes us-east-1 Linux On-Demand pricing.

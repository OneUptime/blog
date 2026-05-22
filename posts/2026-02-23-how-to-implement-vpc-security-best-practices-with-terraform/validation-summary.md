# Validation Summary: How to Implement VPC Security Best Practices with Terraform

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon VPC
- AWS subnets, route tables, internet gateways, and NAT gateways
- AWS security groups and network ACLs
- Amazon VPC Flow Logs
- AWS VPC endpoints
- Amazon EC2 Traffic Mirroring
- Amazon GuardDuty

## Sources Consulted
- Terraform AWS Provider `aws_vpc_endpoint` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- Terraform AWS Provider `aws_default_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/default_security_group
- Terraform AWS Provider `aws_flow_log` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log
- Terraform AWS Provider `aws_ec2_traffic_mirror_filter_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_traffic_mirror_filter_rule
- Terraform AWS Provider `aws_ec2_traffic_mirror_session` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_traffic_mirror_session
- Terraform AWS Provider `aws_guardduty_detector` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector
- Terraform AWS Provider `aws_guardduty_detector_feature` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector_feature
- AWS GuardDuty API changes for features vs. data sources: https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-feature-object-api-changes-march2023.html
- AWS VPC Flow Logs record and aggregation interval documentation: https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html
- AWS VPC Flow Logs S3 Parquet and hourly partitioning announcement: https://aws.amazon.com/about-aws/whats-new/2021/10/amazon-vpc-flow-logs-parquet-hive-prefixes-partitioned-files/
- AWS VPC custom network ACL documentation: https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- AWS Traffic Mirroring documentation: https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-how-it-works.html
- AWS EC2 `create-traffic-mirror-target` CLI documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-traffic-mirror-target.html

## Issues Found
- The Traffic Mirroring example created a mirror target, filter, and ingress filter rule, but did not create a traffic mirror session. AWS Traffic Mirroring requires a session that connects a source network interface, filter, and target before traffic is mirrored. Added an `aws_ec2_traffic_mirror_session` resource.
- The Traffic Mirroring filter was described as mirroring all TCP traffic, but only included an ingress rule. Added a matching egress filter rule so the example matches the description.
- The GuardDuty example used the deprecated `datasources` block on `aws_guardduty_detector`. Replaced it with current `aws_guardduty_detector_feature` resources for `S3_DATA_EVENTS` and `EKS_AUDIT_LOGS`, matching current AWS and Terraform provider guidance.

## Review Notes
- Terraform CLI was not installed in the review environment, so the snippets were checked against official provider documentation rather than by running `terraform validate`.
- Several snippets intentionally reference resources or variables not defined in the excerpt, such as `var.region`, `aws_kms_key.logs`, `aws_s3_bucket.flow_logs`, `aws_lb.ids`, and `var.source_network_interface_id`. These are acceptable as partial examples, but a complete module would need to define them.

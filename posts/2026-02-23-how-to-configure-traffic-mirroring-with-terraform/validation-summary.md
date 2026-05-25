# Validation Summary: How to Configure Traffic Mirroring with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS VPC Traffic Mirroring
- Amazon EC2 elastic network interfaces
- AWS Network Load Balancer
- VXLAN

## Sources Consulted
- AWS VPC Traffic Mirroring overview: https://docs.aws.amazon.com/vpc/latest/mirroring/what-is-traffic-mirroring.html
- AWS VPC Traffic Mirroring how it works: https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-how-it-works.html
- AWS traffic mirror target concepts: https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-targets.html
- AWS Traffic Mirroring getting started guide: https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-getting-started.html
- AWS Traffic Mirroring limitations: https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-network-limitations.html
- Terraform AWS provider `aws_ec2_traffic_mirror_target` documentation/source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ec2_traffic_mirror_target.html.markdown
- Terraform AWS provider `aws_ec2_traffic_mirror_filter_rule` documentation/source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ec2_traffic_mirror_filter_rule.html.markdown
- Terraform AWS provider `aws_ec2_traffic_mirror_session` documentation/source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ec2_traffic_mirror_session.html.markdown
- Terraform AWS provider `aws_lb_listener`, `aws_lb_target_group`, and `aws_lb_target_group_attachment` documentation/source: https://github.com/hashicorp/terraform-provider-aws/tree/main/website/docs/r

## Issues Found
- The post described Traffic Mirroring as having three main components and did not include the session as a key component. Updated the explanation to match AWS's source, filter, target, and session concepts.
- The post said mirror targets can be ENIs or Network Load Balancers. AWS also supports Gateway Load Balancer endpoints, so the explanation now includes that target type.
- The prerequisite text said Traffic Mirroring is supported on Nitro-based instances. Current AWS documentation lists specific supported instance families, including some non-Nitro families, so the wording now says sources must use a supported EC2 instance family.
- The source instance comment said the instance must be Nitro-based. Updated it to say the instance type must be supported as a Traffic Mirroring source.
- The NLB target example created only the load balancer and traffic mirror target. AWS requires a UDP listener on port 4789 for an NLB traffic mirror target, so the example now includes an NLB target group, target attachment, and UDP listener.
- The Terraform filter rule examples used `direction`, which is not the current AWS provider argument. Replaced it with `traffic_direction` for each `aws_ec2_traffic_mirror_filter_rule`.
- The outbound filter claimed to capture all outbound traffic while setting `protocol = 6`, which captures TCP only. Updated the comment and description to say outbound TCP traffic.

## Review Notes
Terraform is not installed in the workspace, so I could not run `terraform validate`. The reviewed snippets were checked against official AWS documentation and the HashiCorp AWS provider resource documentation/source. The hard-coded Amazon Linux 2 AMI is region-specific to `us-east-1`; a future improvement would be to use an AMI data source or SSM parameter to avoid stale AMI IDs.

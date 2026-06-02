# Validation Summary: How to Set Up Multi-AZ EC2 Deployments for High Availability

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon EC2
- Amazon VPC
- Application Load Balancer
- Elastic Load Balancing target groups and health checks
- Amazon EC2 Auto Scaling
- AWS CLI
- Terraform AWS Provider
- Amazon CloudWatch alarms
- Amazon RDS Multi-AZ, Amazon EFS, Amazon ElastiCache, and Amazon DynamoDB concepts

## Sources Consulted
- AWS VPC Internet Gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- AWS VPC route table examples: https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html
- AWS CLI `create-nat-gateway` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-nat-gateway.html
- AWS CLI `modify-vpc-attribute` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-attribute.html
- AWS CLI `authorize-security-group-ingress` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI `create-launch-template` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-launch-template.html
- AWS CLI `create-auto-scaling-group` documentation: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- AWS Elastic Load Balancing overview and cross-zone documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html
- AWS Application Load Balancer documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- AWS Application Load Balancer creation documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-application-load-balancer.html
- AWS target group attribute documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/modify-target-group-health-settings.html
- Amazon EC2 Auto Scaling Availability Zone distribution documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-availability-zone-balanced.html
- Amazon EC2 Auto Scaling health check documentation: https://docs.aws.amazon.com/autoscaling/latest/userguide/healthcheck.html
- Terraform AWS Provider `aws_lb` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- Terraform AWS Provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS Provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template

## Issues Found
- The AWS CLI VPC example labeled subnets as public but did not create and attach an internet gateway or add a default route to it. Added internet gateway, public route table, and public subnet route table associations.
- The AWS CLI VPC DNS attribute commands used bare flags. Updated them to pass explicit `{"Value":true}` structures matching the documented command form.
- The private EC2 instances used user data to install Apache from package repositories, but the private subnets had no outbound internet path. Added one NAT gateway per AZ and per-AZ private route tables so bootstrap traffic does not depend on a single AZ.
- The CLI snippets used placeholder security group IDs (`sg-alb123` and `sg-app123`) without creating them. Added ALB and app security group creation commands and updated the ALB and launch template snippets to use those IDs.
- The Terraform example was described as complete but referenced undefined `aws_security_group.alb` and `aws_security_group.app` resources. Added those security groups.
- The Terraform example created public and private subnets but omitted internet gateway, route table, NAT gateway, and private route table resources needed for the described internet-facing ALB and private instance bootstrap flow. Added the missing networking resources.
- The Terraform launch template did not configure user data, so instances would not create the `/health` endpoint used by the target group health check. Added base64-encoded user data matching the CLI example.
- The Terraform comment for `min_elb_capacity` incorrectly implied it spreads instances evenly across AZs. Updated the comment to reflect that Terraform waits for initial healthy capacity, while Auto Scaling handles AZ balancing.
- The text said `min-size` of 3 ensures at least one instance per AZ. Adjusted the wording because Auto Scaling tries to balance across enabled AZs, but placement can still be affected by AZ capacity or health issues.

## Review Notes
- The examples still use placeholder AMI and account-specific values where expected for a tutorial. Readers must replace `ami-0abc123`, metric dimensions, and SNS ARNs with real values from their environment.
- The architecture is appropriate for stateless EC2 applications. Stateful workloads still need externalized state as the post notes.

# Validation Summary: How to Build a Three-Tier Architecture with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS VPC, subnets, route tables, Internet Gateway, NAT Gateway, and Elastic IP
- AWS Security Groups
- AWS Application Load Balancer and target groups
- AWS EC2 Launch Templates and Auto Scaling Groups
- Amazon Linux 2023 user data
- Amazon RDS for MySQL and Multi-AZ deployments

## Sources Consulted
- Terraform AWS provider documentation for `aws_autoscaling_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS provider documentation for `aws_launch_template`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- Terraform AWS provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider documentation for `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- AWS Application Load Balancer subnet documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- AWS VPC security group rules documentation: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- Amazon RDS Multi-AZ DB instance documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
- Amazon Linux 2023 LAMP installation documentation: https://docs.aws.amazon.com/linux/al2023/ug/ec2-lamp-amazon-linux-2023.html

## Issues Found
- The project structure omitted `user_data.sh`, but the launch template uses `templatefile("${path.module}/user_data.sh", ...)`. Added `user_data.sh` to the project structure so the listed files match the Terraform configuration.
- The ALB security group allowed HTTPS and described accepting HTTP/HTTPS, but the Terraform only creates an HTTP listener. Removed the unused HTTPS ingress rule and updated the comment to match the deployed listener.
- The database security group comment said no egress was needed while the snippet allowed all outbound traffic. Changed the database security group to `egress = []`, which aligns with the stated tier boundary and AWS security group stateful return-traffic behavior.
- The PHP example read `DB_HOST` from the Apache process environment after appending it to `/etc/environment`, which does not reliably make the variable available to the running `httpd` service. Changed the generated PHP file to use the Terraform-rendered `${db_host}` value directly.

## Review Notes
- The tutorial is technically valid after the fixes. For production hardening, the post already correctly recommends adding HTTPS with ACM, WAF, VPC Flow Logs, CloudWatch alarms, and Secrets Manager.
- The examples are intentionally simplified. Database credentials passed through Terraform variables and user data can still appear in Terraform state or instance metadata, so Secrets Manager or another secret delivery mechanism should be used for a real production deployment.

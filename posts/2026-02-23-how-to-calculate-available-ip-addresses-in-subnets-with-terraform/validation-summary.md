# Validation Summary: How to Calculate Available IP Addresses in Subnets with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp Configuration Language (HCL)
- AWS VPC
- AWS subnets
- AWS EKS
- AWS CloudWatch
- AWS SNS

## Sources Consulted
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform `cidrhost` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- Terraform `cidrnetmask` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrnetmask
- Terraform `pow` function documentation: https://developer.hashicorp.com/terraform/language/functions/pow
- Terraform `log` function documentation: https://developer.hashicorp.com/terraform/language/functions/log
- Terraform `sum` function documentation: https://developer.hashicorp.com/terraform/language/functions/sum
- AWS VPC subnet CIDR block documentation: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html
- AWS EC2 Subnet API documentation: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_Subnet.html
- AWS VPC CloudWatch metrics documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cloudwatch.html
- Terraform AWS provider `aws_subnet` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnet
- Terraform AWS provider `aws_cloudwatch_metric_alarm` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider `aws_sns_topic` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic

## Issues Found
- The post listed `cidrcontains` as a Terraform IP network function. Current Terraform documentation lists `cidrhost`, `cidrnetmask`, `cidrsubnet`, and `cidrsubnets`; `cidrcontains` is not a Terraform built-in function. Changed the function list to use `cidrsubnets`.
- The VPC capacity examples subtracted five AWS-reserved addresses from the VPC CIDR. AWS reserves the first four and last IP address in each subnet CIDR block, not once at the VPC level. Changed the VPC examples to show total VPC address capacity and note that five addresses are reserved per subnet.
- The practical subnet planning output used `pow(2, 32 - local.vpc_prefix) - 5` as the VPC denominator. Changed it to the full VPC CIDR address count because subnet reservations are per subnet.
- The EKS example subtracted all 50 node IPs from each subnet when calculating per-subnet pod support, even though the scenario described 50 nodes total. Added node and subnet count locals and subtract the estimated node IPs per subnet instead.
- The EKS note said 1,850 IPs required at least a `/21` per AZ, while the preceding calculation described 1,850 IPs total. Reworded the note to say `/21` is required for 1,850 IPs in one subnet.

## Review Notes
- Terraform was not installed in the local environment, so the snippets were reviewed against official documentation rather than validated with `terraform validate`.
- The CloudWatch alarm example correctly uses a custom namespace for a custom metric, but the post does not include the Lambda implementation that would publish `AvailableIPAddressCount`.

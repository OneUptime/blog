# Validation Summary: How to Create EMR Clusters in Terraform

## Status
validated

## Post Type
Tutorial / infrastructure-as-code guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon EMR on EC2
- IAM roles and instance profiles
- Amazon EC2 security groups
- Amazon S3
- AWS Glue Data Catalog
- Apache Spark, Hadoop, and Hive on EMR

## Sources Consulted
- Terraform AWS provider `aws_emr_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/emr_cluster
- Terraform AWS provider `aws_vpc_security_group_ingress_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- Terraform AWS provider `aws_vpc_security_group_egress_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule
- AWS EMR IAM service roles documentation: https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-iam-service-roles.html
- AWS EMR managed IAM policies documentation: https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-managed-iam-policies.html
- AWS EMR managed security groups documentation: https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-man-sec-groups.html
- AWS EMR instance fleets documentation: https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-instance-fleet.html
- AWS EMR 7.0.0 release documentation: https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-700-release.html
- AWS EMR Spark with AWS Glue Data Catalog documentation: https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-spark-glue.html

## Issues Found
- The post described the instance fleet example as "auto-scaling." Instance fleets choose capacity across configured instance types and purchasing options, but the snippet did not configure EMR managed scaling or automatic scaling. I changed the wording and section heading to describe cost optimization with instance fleets instead.
- The Spot allocation strategy used `capacity-optimized` for an EMR 7.0.0 cluster. That value is valid, but AWS recommends `price-capacity-optimized`, and EMR 6.10.0 and later use it as the default Spot allocation strategy. I updated the example and explanation to use `price-capacity-optimized`.
- The security group example used mutually referencing inline `ingress` blocks between the primary and core security groups. This can create Terraform dependency cycles and is not the current recommended Terraform pattern for cross-referencing security groups. I changed the example to create the security groups first and then add rules with `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule`.
- The private subnet service access security group example did not explicitly include the documented 8443 ingress rules from the service access group to the primary and core/task groups. I added these rules and kept the required 9443 service access ingress rule.
- The post used `AmazonEMRServicePolicy_v2` but did not mention that EMR v2 managed policies require the `for-use-with-amazon-emr-managed-policies` tag on relevant VPC resources such as custom security groups and subnets. I added a note explaining this requirement.

## Review Notes
Terraform is not installed in this workspace, so I could not run `terraform fmt` or provider-backed validation locally. The snippets were reviewed against the current official Terraform AWS provider documentation and AWS EMR documentation instead.

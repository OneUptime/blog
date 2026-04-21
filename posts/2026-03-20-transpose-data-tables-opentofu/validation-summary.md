# Validation Summary: How to Transpose Data Tables in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Terraform
- HCL
- AWS Route 53
- AWS IAM
- Amazon S3

## Sources Consulted
- OpenTofu `transpose` function documentation: https://opentofu.org/docs/language/functions/transpose/
- Terraform `transpose` function documentation: https://developer.hashicorp.com/terraform/language/functions/transpose
- Terraform AWS Provider `aws_route53_health_check` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Terraform AWS Provider `aws_iam_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
- Amazon S3 identity-based policy examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-policies-s3.html
- Amazon S3 service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- Amazon Route 53 health check behavior documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html

## Issues Found
- The IAM policy example mixed `s3:ListBucket` with only object-level S3 ARNs (`arn:aws:s3:::bucket/*`). `s3:ListBucket` applies to bucket-level ARNs, while `s3:GetObject` and `s3:PutObject` apply to object ARNs. I split the policy into separate bucket-level and object-level statements so the generated policy uses the correct resource ARNs for each action.
- The IAM policy section implied that creating an `aws_iam_policy` directly grants access to users. I adjusted the wording to say the managed policy can be attached to grant access, which matches IAM behavior.

## Review Notes
OpenTofu and Terraform both document `transpose` as accepting a map of lists of strings and returning a map of lists of strings with keys and values swapped. The examples use valid string lists and the shown transposed results are consistent with the documented behavior. The Route 53 health check example uses current AWS provider arguments and a valid HTTPS health check configuration.

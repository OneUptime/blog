# Validation Summary: How to Configure Route 53 DNS with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Route 53
- Terraform
- HashiCorp AWS Provider
- AWS Certificate Manager
- Amazon S3 static website hosting
- Amazon CloudFront
- Elastic Load Balancing
- Amazon CloudWatch

## Sources Consulted
- HashiCorp AWS Provider `aws_route53_zone` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_zone
- HashiCorp AWS Provider `aws_route53_zone_association` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_zone_association
- HashiCorp AWS Provider `aws_route53_record` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- HashiCorp AWS Provider `aws_route53_health_check` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- HashiCorp AWS Provider `aws_acm_certificate` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- HashiCorp AWS Provider `aws_s3_bucket_website_configuration` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_website_configuration
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform CLI `import` command documentation: https://developer.hashicorp.com/terraform/cli/commands/import
- AWS Route 53 alias record documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- AWS Route 53 DNS record types documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html
- AWS Route 53 private hosted zone documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-creating.html
- AWS Route 53 latency-based routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-latency.html
- AWS Route 53 geolocation routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-geo.html
- AWS Route 53 DNS failover documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-configuring.html

## Issues Found
- The private hosted zone example used an inline `vpc` block and a separate `aws_route53_zone_association` for the same zone without ignoring changes to the inline VPC associations. The AWS provider documentation warns that this combination can cause perpetual plan differences. Added `lifecycle { ignore_changes = [vpc] }` to the zone example.
- The latency-based routing description said it routes users to the "nearest" region. AWS documents latency-based routing as selecting the AWS Region with the lowest latency, which is not necessarily geographically nearest. Updated the wording to "lowest-latency region."
- The Route 53 record import ID description implied `set_identifier` is always present. The provider documentation shows `{zone_id}_{name}_{type}` for ordinary records and appending `{set_identifier}` only for records that use one. Updated the sentence.
- The remote state best practice recommended S3 with DynamoDB locking. Terraform's S3 backend documentation marks DynamoDB-based locking as deprecated and recommends S3 state locking with `use_lockfile`. Updated the recommendation to use `use_lockfile = true`.

## Review Notes
The Terraform snippets use current AWS provider resource names and arguments for Route 53 zones, records, routing policies, health checks, ACM DNS validation, and S3 website alias targets. Terraform CLI was not installed in the local environment, so validation was performed against current official HashiCorp and AWS documentation rather than by running `terraform validate`.

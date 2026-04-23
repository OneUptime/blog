# Validation Summary: How to Set Up Route 53 Failover Routing with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Route 53
- Route 53 health checks
- Route 53 failover routing policies
- Route 53 alias records
- Amazon S3 static website hosting
- Application Load Balancers
- AWS CLI
- Terraform AWS provider HCL resources

## Sources Consulted
- AWS Route 53 Developer Guide: Active-active and active-passive failover - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html
- AWS Route 53 Developer Guide: How Amazon Route 53 chooses records when health checking is configured - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html
- AWS Route 53 Developer Guide: Values specific for failover alias records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover-alias.html
- AWS Route 53 API Reference: AliasTarget - https://docs.aws.amazon.com/Route53/latest/APIReference/API_AliasTarget.html
- AWS Route 53 Developer Guide: How Amazon Route 53 determines whether a health check is healthy - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html
- AWS Route 53 FAQs: DNS failover TTL and health check behavior - https://aws.amazon.com/route53/faqs/
- AWS Route 53 Developer Guide: Routing traffic to a website that is hosted in an Amazon S3 bucket - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/RoutingToS3Bucket.html
- AWS S3 User Guide: Website endpoints - https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html
- AWS CLI Command Reference: route53 update-health-check - https://docs.aws.amazon.com/cli/latest/reference/route53/update-health-check.html
- OpenTofu CLI documentation - https://opentofu.org/docs/cli/commands/
- Terraform AWS provider documentation for `aws_route53_record`, `aws_route53_health_check`, and `aws_s3_bucket_website_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The introduction described DNS failover as achieving an RPO of 60-90 seconds for TTL propagation. RPO is a data-loss objective, not a DNS failover timing metric. Updated the text to describe health-check detection time plus DNS caching instead.
- The S3 failover example attempted to add another `SECONDARY` failover record for the same name and type, while Route 53 failover requires one primary and one secondary record for that failover pair. Reworked the section as a valid S3 maintenance-page secondary target that replaces the direct secondary ALB record.
- The S3 example used a bucket name unrelated to the DNS name being routed. Route 53/S3 website aliases require the bucket name to match the custom domain or subdomain. Changed the bucket to `var.domain_name` and used the bucket's hosted zone ID.
- The post did not mention that S3 website endpoints do not support HTTPS. Added a caveat to use CloudFront as the fallback target when HTTPS is required.
- The test command used `aws route53 update-health-check --disabled` to simulate failover. AWS documents that disabled health checks are considered healthy, so this would not fail traffic away from the primary. Changed the command to temporarily use `--inverted` and added `--no-inverted` to restore normal evaluation.
- The conclusion implied TTL can be tuned on the alias records in the examples. Alias records to ELB and S3 website endpoints use a fixed 60-second TTL. Updated the TTL guidance to distinguish non-alias records from alias records.

## Review Notes
Local CLI validation was not possible because `tofu`, `terraform`, and `aws` were not installed in the workspace. The HCL and CLI examples were reviewed against official documentation. The S3 maintenance-page example still assumes the site content and required public website access policy are configured elsewhere.

# Validation Summary: How to Manage Route53 DNS Records with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Route 53
- AWS Elastic Load Balancing
- AWS CloudFront
- Amazon SES
- DNS
- HCL

## Sources Consulted
- AWS Provider docs for `aws_route53_record`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_record.html.markdown
- AWS Provider docs for `aws_route53_zone`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_zone.html.markdown
- AWS Provider docs for `aws_route53_health_check`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route53_health_check.html.markdown
- AWS Provider docs for `aws_lb`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb.html.markdown
- AWS Provider docs for `aws_cloudfront_distribution`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown
- AWS Route 53 Developer Guide, Choosing between alias and non-alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- AWS Route 53 Developer Guide, Values specific for failover alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover-alias.html
- AWS Route 53 Developer Guide, How Amazon Route 53 chooses records when health checking is configured: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html
- AWS Route 53 Developer Guide, Values that you specify when you create or update health checks: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-creating-values.html
- Amazon SES Developer Guide, Publishing an MX record for Amazon SES email receiving: https://docs.aws.amazon.com/ses/latest/dg/receiving-email-mx-record.html

## Issues Found
- The alias-record explanation said to use alias records "not CNAME" for AWS resources. I changed this to clarify that alias records are especially useful at the zone apex, where CNAME records are not allowed, because Route 53 still supports CNAME records for many non-apex names.
- The failover health check targeted `primary.${var.domain_name}`, but that hostname was not created anywhere in the example. I changed the health check to target `aws_lb.primary.dns_name` directly and switched it to a TCP check on port 443 so the example does not depend on an undefined DNS record or HTTPS path configuration.

## Review Notes
- The CloudFront alias example is valid as an `A` alias. If IPv6 is enabled on the distribution and IPv6 DNS answers are desired, add a matching `AAAA` alias record as well.
- The MX example is valid for Amazon SES receiving in `us-east-1`; in real deployments, the region in `inbound-smtp.<region>.amazonaws.com` must match the SES receiving region in use.

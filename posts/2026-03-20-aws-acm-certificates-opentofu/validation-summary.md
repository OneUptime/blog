# Validation Summary: How to Manage AWS ACM Certificates with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Certificate Manager (ACM)
- Amazon Route 53
- Elastic Load Balancing (Application Load Balancer)
- Amazon CloudFront
- Amazon CloudWatch

## Sources Consulted
- AWS Certificate Manager DNS validation: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- Renewal for domains validated by DNS: https://docs.aws.amazon.com/acm/latest/userguide/dns-renewal-validation.html
- Check a certificate's renewal status: https://docs.aws.amazon.com/acm/latest/userguide/check-certificate-renewal-status.html
- Supported CloudWatch metrics: https://docs.aws.amazon.com/acm/latest/userguide/cloudwatch-metrics.html
- AWS Certificate Manager public certificate characteristics and limitations: https://docs.aws.amazon.com/acm/latest/userguide/acm-certificate-characteristics.html
- Requirements for using SSL/TLS certificates with CloudFront: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- OpenTofu resource lifecycle behavior: https://opentofu.org/docs/v1.11/language/resources/behavior/
- OpenTofu provider configuration: https://opentofu.org/docs/language/providers/configuration/
- AWS provider `aws_acm_certificate_validation` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation.html
- AWS provider `aws_route53_record` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS provider `aws_lb_listener` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener

## Issues Found
- The description said CloudFront used "multi-region certificate replication." AWS requires requesting or importing the viewer certificate in `us-east-1`; ACM does not replicate a single certificate resource across regions for CloudFront usage. I changed the description to say the post creates a separate `us-east-1` certificate.
- The lifecycle diagram said ACM auto-renews certificates 60 days before expiry. Current AWS documentation states public ACM certificates with the current 198-day validity renew 45 days before expiration, and renewal depends on the certificate remaining in use with the required DNS validation records present. I changed the diagram wording to reflect the actual renewal condition instead of an outdated fixed day count.
- The `aws_acm_certificate_validation` example set `timeouts { create = "10m" }`. AWS documents that newly requested certificates can remain in `Pending validation` for up to 30 minutes, and the provider resource documents a longer default create timeout. I removed the custom 10-minute timeout to avoid premature failures.
- The best-practices section said `*.example.com` covers "all subdomains." AWS documents that ACM wildcard certificates cover only one subdomain level and do not cover the apex domain. I changed the wording to "first-level subdomains."

## Review Notes
- AWS public ACM certificates are currently valid for 198 days. Older 395-day certificates renew on a different schedule, which is why avoiding the old fixed 60-day renewal claim is more accurate as of 2026.

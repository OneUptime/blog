# Validation Summary: How to Design a Certificate Module for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Certificate Manager (ACM)
- Amazon Route 53
- AWS Application Load Balancer (ALB)
- Amazon CloudFront
- HCL

## Sources Consulted
- OpenTofu `lifecycle` blocks: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu input variables and `validation` blocks: https://opentofu.org/docs/language/values/variables/
- AWS provider `aws_acm_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- AWS provider `aws_acm_certificate_validation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- AWS provider `aws_lb_listener`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- AWS ACM DNS validation: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- AWS ACM managed renewal for DNS-validated certificates: https://docs.aws.amazon.com/acm/latest/userguide/dns-renewal-validation.html
- CloudFront certificate region requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- ALB HTTPS listener certificate requirements: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/https-listener-certificates.html

## Issues Found
- The description claimed the module handled "automatic renewal configuration," but ACM-managed renewal is automatic only when the certificate remains in use and the ACM DNS CNAME records stay in place. I rewrote the description to describe the DNS records accurately.
- The introduction said the module encapsulated the full lifecycle, including wiring the certificate to a load balancer or CloudFront distribution. The module only requests and validates the certificate, then outputs its ARN. I corrected the wording and added the CloudFront `us-east-1` requirement.
- The module exposed `validation_method` as if both `DNS` and `EMAIL` were supported, but the implementation always creates Route 53 validation records and uses `validation_record_fqdns`, which is only valid for DNS validation. I added variable validation to restrict the module to `DNS`.
- The Route 53 `for_each` loop was keyed by `dvo.domain_name`, while ACM can return the same validation CNAME for an apex domain and its wildcard. That can cause duplicate Route 53 record management. I changed the loop to deduplicate by validation record name and updated the comment.
- The ALB listener example was incomplete and not a valid `aws_lb_listener` resource on its own. I added the required arguments so the example matches the provider schema.
- The conclusion overstated what `create_before_destroy` guarantees and implied `wait_for_validation = false` is always safe for CI. I corrected the explanation so it matches OpenTofu lifecycle behavior and ACM/ALB issuance requirements.

## Review Notes
- The module assumes all requested names live in the same Route 53 hosted zone. That is fine for the example domains shown, but certificates spanning multiple hosted zones need a different mapping strategy, as shown in the AWS provider documentation.

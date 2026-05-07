# Validation Summary: How to Configure AWS Certificate Manager with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu / HCL
- AWS Certificate Manager (ACM)
- Amazon Route 53
- Elastic Load Balancing (Application Load Balancer)
- Amazon CloudFront
- AWS CLI

## Sources Consulted
- AWS Certificate Manager User Guide: What is AWS Certificate Manager? https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html
- AWS Certificate Manager User Guide: Request a public certificate in AWS Certificate Manager https://docs.aws.amazon.com/acm/latest/userguide/acm-public-certificates.html
- AWS Certificate Manager User Guide: Validate domain ownership for AWS Certificate Manager public certificates https://docs.aws.amazon.com/acm/latest/userguide/domain-ownership-validation.html
- AWS Certificate Manager User Guide: AWS Certificate Manager DNS validation https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- AWS Certificate Manager User Guide: Renewal for domains validated by DNS https://docs.aws.amazon.com/acm/latest/userguide/dns-renewal-validation.html
- AWS Certificate Manager User Guide: Check a certificate's renewal status https://docs.aws.amazon.com/acm/latest/userguide/check-certificate-renewal-status.html
- AWS CLI Command Reference: `request-certificate` https://docs.aws.amazon.com/cli/latest/reference/acm/request-certificate.html
- AWS CLI Command Reference: `describe-certificate` https://docs.aws.amazon.com/cli/latest/reference/acm/describe-certificate.html
- Amazon CloudFront Developer Guide: Requirements for using SSL/TLS certificates with CloudFront https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- Amazon CloudFront API Reference: `ViewerCertificate` https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_ViewerCertificate.html
- Elastic Load Balancing User Guide: Security policies for your Application Load Balancer https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
- Terraform Registry: `aws_acm_certificate_validation` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation.html
- Terraform Registry: `aws_lb_listener` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener
- Terraform Registry: `aws_lb_listener_certificate` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener_certificate
- Terraform Registry: `aws_route53_record` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record

## Issues Found
- The introduction overstated ACM renewal behavior and needed to reflect the current OpenTofu-managed validation methods. I updated it to state that this workflow uses DNS or email validation, and that automatic renewal applies to DNS-validated certificates that remain in use.
- The prerequisites were missing two important operational constraints: ACM public certificate validation needs a public Route 53 hosted zone, and the examples that attach certificates to ALB and CloudFront also need Elastic Load Balancing and CloudFront permissions. I corrected the prerequisite list.
- The Route 53 validation snippet could try to manage the same CNAME twice when the certificate includes both the apex domain and a wildcard SAN, because ACM reuses the same validation record for `example.com` and `*.example.com`. I changed the `for_each` logic to collapse those duplicates before creating Route 53 records.
- The certificate validation timeout was set to `5m`, which is too short for ACM issuance and shorter than the provider's documented default wait. I updated it to `75m`.
- The ALB listener comment described `ELBSecurityPolicy-TLS13-1-2-2021-06` as a TLS 1.3 policy, but that policy supports both TLS 1.3 and TLS 1.2. I corrected the comment.
- The CloudFront example referenced `aws_acm_certificate_validation.cloudfront` without defining it. I added the missing validation resource and wired it to reuse the Route 53 validation records from the earlier DNS-validation step for the same domain.
- The conclusion overstated what `create_before_destroy = true` guarantees. I revised it to say that it helps with rotation by creating a replacement certificate before the existing one is destroyed.

## Review Notes
- AWS also documents HTTP validation for CloudFront-specific certificate workflows, but the ACM/OpenTofu flow covered here still uses DNS or email validation through the ACM request workflow. The tutorial remains correctly focused on the automatable DNS path.
- The ALB security policy example is valid, but AWS now recommends newer PQ-capable policies such as `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09` when client compatibility allows.
- The CloudFront section now assumes the same domain is already being validated with the Route 53 records from Step 2. If the CloudFront certificate is managed in a separate stack, the existing validation records should be reused or imported rather than duplicated.

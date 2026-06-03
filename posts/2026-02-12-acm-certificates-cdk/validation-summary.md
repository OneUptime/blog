# Validation Summary: How to Create ACM Certificates with CDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Certificate Manager (ACM)
- AWS Cloud Development Kit (CDK) v2
- Amazon Route 53 DNS validation
- Amazon CloudFront custom certificates
- Elastic Load Balancing v2 Application Load Balancers
- Amazon API Gateway custom domains
- Amazon CloudWatch certificate expiry metrics
- TypeScript

## Sources Consulted
- AWS CDK v2 `Certificate` construct documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.Certificate.html
- AWS CDK v2 `CertificateValidation` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.CertificateValidation.html
- AWS CDK v2 `DnsValidatedCertificate` documentation: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_certificatemanager/DnsValidatedCertificate.html
- AWS CDK v2 `ApplicationListenerProps` documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationListenerProps.html
- Amazon CloudFront SSL/TLS certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS Certificate Manager DNS validation documentation: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- AWS Certificate Manager email validation documentation: https://docs.aws.amazon.com/acm/latest/userguide/email-validation.html
- AWS Certificate Manager public certificate characteristics: https://docs.aws.amazon.com/acm/latest/userguide/acm-certificate-characteristics.html
- AWS Certificate Manager CloudWatch metrics documentation: https://docs.aws.amazon.com/acm/latest/userguide/cloudwatch-metrics.html
- AWS Certificate Manager Certificate Transparency best practices: https://docs.aws.amazon.com/acm/latest/userguide/acm-bestpractices.html

## Issues Found
- The email validation CDK example passed `admin@example.com` to `CertificateValidation.fromEmail()`. CDK expects a map of certificate domain names to validation domains, not individual recipient email addresses. Changed the value to `example.com` and clarified that ACM sends to common system mailboxes such as `admin@example.com`.
- The cross-region CloudFront section included `DnsValidatedCertificate` as an option. AWS CDK v2 marks this construct as deprecated. Removed it as an actionable code example and kept the separate `us-east-1` certificate stack as the recommended current pattern.
- The introduction broadly described ACM public certificates as free. Updated the wording to "standard public certificates" to avoid implying exportable public certificates or every ACM certificate type has the same pricing behavior.

## Review Notes
The remaining CDK examples align with current CDK v2 APIs and AWS service behavior. The examples are partial snippets and assume surrounding constructs such as `vpc`, `targetGroup`, `bucket`, `zone`, and `certificate` are already defined in the stack.

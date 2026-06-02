# Validation Summary: How to Fix ACM Certificate 'Pending Validation' Stuck Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS Certificate Manager (ACM)
- Amazon Route 53
- Amazon CloudFront
- DNS validation
- CAA records
- AWS CLI
- `dig`

## Sources Consulted
- AWS Certificate Manager DNS validation: https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html
- AWS Certificate Manager troubleshooting DNS validation: https://docs.aws.amazon.com/acm/latest/userguide/troubleshooting-DNS-validation.html
- AWS Certificate Manager CAA setup guidance: https://docs.aws.amazon.com/acm/latest/userguide/setup.html
- AWS CLI `describe-certificate` command reference: https://docs.aws.amazon.com/cli/latest/reference/acm/describe-certificate.html
- AWS CLI `request-certificate` command reference: https://docs.aws.amazon.com/cli/latest/reference/acm/request-certificate.html
- AWS CLI `certificate-validated` waiter reference: https://docs.aws.amazon.com/cli/latest/reference/acm/wait/certificate-validated.html
- AWS CLI Route 53 `change-resource-record-sets` command reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Amazon Route 53 supported DNS record types: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html
- Amazon CloudFront certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html

## Issues Found
- The post claimed ACM could automatically create Route 53 validation records through the AWS CLI example. AWS documentation says automatic Route 53 record creation is available through the ACM console when eligible, but cannot be requested programmatically from ACM. I changed the text and code comment to explain that the CLI command only prints the records for manual Route 53 creation.
- The CAA guidance listed only `amazon.com` and `amazontrust.com`. AWS documents four acceptable Amazon CA values: `amazon.com`, `amazontrust.com`, `awstrust.com`, and `amazonaws.com`. I updated the explanation and Route 53 CAA example.
- The wildcard certificate section implied that a wildcard request always requires separate base-domain validation. AWS documents that wildcard names and their base domains often use the same validation CNAME, and that `*.example.com` does not protect `example.com`. I updated the wording to reflect that distinction.
- The AWS CLI waiter text implied the command waits indefinitely until ACM finishes. The AWS CLI waiter polls every 60 seconds and exits with an error after failed checks. I clarified the timeout behavior.
- The closing link pointed to a KMS troubleshooting article while the anchor text referred to certificate expiration monitoring. I updated it to the local SSL certificate monitoring post URL.

## Review Notes
The AWS CLI examples use current command names and options. The Route 53 JSON change batches are structurally valid for the AWS CLI. The post remains focused on public ACM certificates; private ACM/Private CA behavior is intentionally outside scope.

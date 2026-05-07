# Validation Summary: How to Access AWS S3 over IPv6

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Amazon S3
- AWS CLI
- Boto3 / Botocore
- AWS IAM / S3 bucket policies
- Amazon CloudFront
- AWS PrivateLink / S3 VPC endpoints
- IPv6 / dual-stack DNS

## Sources Consulted
- Amazon S3: Using dual-stack endpoints - https://docs.aws.amazon.com/AmazonS3/latest/API/dual-stack-endpoints.html
- Amazon S3: Making requests to Amazon S3 over IPv6 - https://docs.aws.amazon.com/AmazonS3/latest/API/ipv6-access.html
- Amazon S3 endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/s3.html
- AWS CLI: Using endpoints in the AWS CLI - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-endpoints.html
- AWS CLI: Configuration and credential file settings - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS CLI: `aws s3 website` command reference - https://docs.aws.amazon.com/cli/latest/reference/s3/website.html
- Boto3 configuration guide - https://docs.aws.amazon.com/boto3/latest/guide/configuration.html
- Botocore `Config` reference - https://docs.aws.amazon.com/botocore/latest/reference/config.html
- AWS PrivateLink for Amazon S3 - https://docs.aws.amazon.com/AmazonS3/latest/userguide/privatelink-interface-endpoints.html
- Amazon CloudFront: Enable IPv6 for distributions - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-enable-ipv6.html

## Issues Found
- The AWS CLI example used `aws configure set s3.use_dualstack_endpoint true`. I changed it to `aws configure set default.s3.use_dualstack_endpoint true` and added an explicit region because AWS documents S3 dual-stack CLI configuration under a profile and regional dual-stack endpoints require a region.
- The boto3 example incorrectly placed `use_dualstack_endpoint` inside the nested `s3` config dict and stated that `addressing_style = path` was required. I changed it to `Config(use_dualstack_endpoint=True)` because botocore exposes dual-stack as a top-level `Config` option, and AWS documents both virtual and path-style addressing as supported.
- The static website section implied CloudFront IPv6 support without mentioning the distribution setting. I updated the wording to note that IPv6 must be enabled on the CloudFront distribution.
- The post said standard S3 endpoints would fail in IPv6-only subnets and that only dualstack endpoints work there. I corrected this to scope the statement to public S3 access and noted that S3 VPC endpoints can be configured for IPv6 or dualstack DNS.
- The conclusion repeated the incorrect boto3 configuration and overgeneralized the endpoint behavior. I updated it to distinguish public S3 endpoints from S3 VPC endpoint configurations.

## Review Notes
- The post is technically valid after the fixes above.
- S3 static website endpoints still do not support IPv6 or HTTPS directly; CloudFront remains the correct fronting option.
- Commands and configuration were validated against official AWS documentation. The local workspace did not have the AWS CLI installed, so command verification here was documentation-based rather than runtime-tested.

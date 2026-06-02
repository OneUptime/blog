# Validation Summary: How to Point a Domain to an S3 Static Website with Route 53

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon S3 static website hosting
- Amazon S3 Block Public Access
- Amazon Route 53 hosted zones and alias records
- AWS CLI
- AWS Certificate Manager
- Amazon CloudFront
- DNS and HTTP redirects

## Sources Consulted
- Amazon Route 53 Developer Guide: Routing traffic to a website that is hosted in an Amazon S3 bucket - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/RoutingToS3Bucket.html
- Amazon Route 53 Developer Guide: Values that are common for alias records - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-alias-common.html
- AWS General Reference: Amazon S3 website endpoints and HostedZone IDs - https://docs.aws.amazon.com/general/latest/gr/s3.html
- AWS CLI Command Reference: aws s3 website - https://docs.aws.amazon.com/cli/latest/reference/s3/website.html
- AWS CLI Command Reference: aws s3api put-bucket-website - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-website.html
- AWS CLI Command Reference: aws s3api put-public-access-block - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-public-access-block.html
- Amazon S3 User Guide: Blocking public access to your Amazon S3 storage - https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
- AWS announcement: Amazon S3 applies Block Public Access to new buckets by default - https://aws.amazon.com/about-aws/whats-new/2023/04/amazon-s3-security-best-practices-buckets-default/
- Amazon CloudFront Developer Guide: Configure alternate domain names and HTTPS - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-procedures.html
- Amazon CloudFront Developer Guide: Use managed cache policies - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html
- AWS CLI Command Reference: aws cloudfront create-distribution - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html

## Issues Found
- New S3 buckets block public bucket policies by default. Added a `put-public-access-block` command for the website bucket and a note about account-level or organization-level Block Public Access.
- The `aws s3 website` high-level command does not support `--redirect-all-requests-to`. Replaced it with `aws s3api put-bucket-website` using `RedirectAllRequestsTo`.
- The CloudFront distribution JSON used invalid array shapes for `AllowedMethods` and `CachedMethods`. Updated them to the required `Quantity` and `Items` structure.
- The CloudFront example used deprecated `ForwardedValues`. Replaced it with the managed `CachingOptimized` cache policy ID.

## Review Notes
The direct S3 website endpoint path still requires public objects and only supports HTTP. For production, the CloudFront section is the better direction; a future post could also cover using a private S3 REST origin with Origin Access Control, but that would not preserve S3 website endpoint features such as S3 website redirects.

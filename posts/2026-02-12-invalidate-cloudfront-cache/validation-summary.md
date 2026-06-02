# Validation Summary: How to Invalidate CloudFront Cache

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudFront
- AWS CLI
- Amazon S3
- GitHub Actions
- HTTP caching headers
- ETags and conditional requests

## Sources Consulted
- AWS CLI Command Reference: `cloudfront create-invalidation` - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-invalidation.html
- AWS CLI Command Reference: `cloudfront list-invalidations` - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/list-invalidations.html
- AWS CLI Command Reference: `cloudfront wait invalidation-completed` - https://docs.aws.amazon.com/cli/latest/reference/cloudfront/wait/invalidation-completed.html
- Amazon CloudFront Developer Guide: Invalidate files - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation_Requests.html
- Amazon CloudFront Developer Guide: What you need to know when invalidating paths - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/invalidation-specifying-objects.html
- Amazon CloudFront Developer Guide: Pay for file invalidation - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PayingForInvalidation.html
- Amazon CloudFront Developer Guide: Quotas on invalidations - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html
- Amazon CloudFront Developer Guide: Request and response behavior for Amazon S3 origins - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorS3Origin.html
- AWS CLI Command Reference: `s3 sync` and include/exclude filters - https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html

## Issues Found
- The post said invalidations typically complete in under 2 minutes and can take 10-15 minutes. AWS documents that CloudFront forwards invalidation requests to edge locations within a few seconds and each edge starts processing immediately, but does not give that specific completion-time range. Updated the wording to match AWS documentation.
- The "Count invalidation paths used this month" command counted invalidation batches returned by `list-invalidations`, not monthly path usage. Updated the comment to describe it as a rough count of invalidation batches for the distribution.
- The deployment script's first `aws s3 sync` excluded only `index.html`, even though the following comment described HTML and JSON as short-cache files. Updated it to exclude `*.html` and `*.json` from the long-cache upload.
- The deployment script's second `aws s3 sync` put `--exclude "*"` after the `--include` rules, which would exclude the intended HTML and JSON files. Reordered the filters to exclude all files first, then include `*.html` and `*.json`, matching AWS CLI filter behavior.
- The deployment script used the CloudFront invalidation path `/*.html`. CloudFront only treats `*` as a wildcard when it is the final character in the path; otherwise it is treated literally. Replaced that invalidation list with the valid wildcard path `/*`.
- The ETag section implied CloudFront checks ETags whenever content changes. Updated it to clarify that CloudFront uses conditional requests after an object has expired from the edge cache, matching the CloudFront S3-origin documentation.

## Review Notes
The core CloudFront invalidation CLI examples, invalidation batch JSON shape, status-check commands, pricing explanation, query-string invalidation guidance, and recommendation to use versioned file names were consistent with current AWS documentation. The AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI command reference instead of local `--help` output.

# Validation Summary: How to Set Up S3 Static Website Hosting with a Custom Domain

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon S3 static website hosting
- Amazon Route 53 alias records
- DNS CNAME, ALIAS, and ANAME records
- AWS CLI
- Boto3 for Python
- Amazon CloudFront and ACM for HTTPS

## Sources Consulted
- AWS Route 53 Developer Guide: Use your domain for a static website in an Amazon S3 bucket - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/getting-started-s3.html
- AWS Route 53 Developer Guide: Routing traffic to a website that is hosted in an Amazon S3 bucket - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/RoutingToS3Bucket.html
- Amazon S3 User Guide: Website endpoints - https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html
- AWS General Reference: Amazon S3 website endpoints and HostedZone IDs - https://docs.aws.amazon.com/general/latest/gr/s3.html
- AWS CLI Command Reference: s3api create-bucket - https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- Amazon S3 User Guide: Configuring a webpage redirect - https://docs.aws.amazon.com/AmazonS3/latest/userguide/how-to-page-redirect.html
- Boto3 documentation: S3 create_bucket examples - https://boto3.amazonaws.com/v1/documentation/api/latest/guide/s3-example-creating-buckets.html

## Issues Found
- The automation script assumed all S3 website endpoint hostnames use the dash form `s3-website-<region>.amazonaws.com`. AWS's current endpoint table uses the dash form for some regions and the dot form `s3-website.<region>.amazonaws.com` for others. I added a helper that uses the dash form for the current legacy dash-form regions and the dot form for other standard regions, then updated the printed endpoint to use that helper.

## Review Notes
- The Route 53 alias pattern, bucket naming requirement, S3 redirect bucket setup, public-read policy for the website bucket, external DNS CNAME limitation for apex domains, and HTTP-only S3 website endpoint guidance are consistent with current AWS documentation.
- The shell JSON snippets and the Python code block were checked for syntax validity.

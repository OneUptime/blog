# Validation Summary: How to Create S3 Static Website Hosting in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS S3 static website hosting
- AWS CloudFront
- AWS CloudFront Origin Access Control
- AWS Certificate Manager
- Amazon Route 53
- AWS CLI

## Sources Consulted
- Terraform AWS provider documentation for `aws_s3_bucket_website_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_website_configuration
- Terraform AWS provider documentation for `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Amazon S3 documentation for website endpoints: https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteEndpoints.html
- Amazon S3 documentation for website redirects and routing rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/how-to-page-redirect.html
- Amazon S3 static website setup tutorial: https://docs.aws.amazon.com/AmazonS3/latest/userguide/HostingWebsiteOnS3Setup.html
- Amazon CloudFront documentation for restricting access to an S3 origin with OAC: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- Amazon CloudFront documentation for alternate domain names and HTTPS certificates: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-procedures.html
- AWS CLI `s3 sync` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- Terraform `regex` function documentation: https://docs.hashicorp.com/terraform/language/functions/regex
- Terraform `fileset` function documentation: https://developer.hashicorp.com/terraform/language/functions/fileset
- Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try

## Issues Found
- The routing rules section described "URL rewriting" and used `http_redirect_code = "200"` for an S3 website routing rule. S3 website routing rules return redirects with a `Location` header, so this was changed to describe redirects only and use `302`.
- The `aws_s3_object` MIME type expression used `regex("\\.[^.]+$", each.value)` directly. Terraform's `regex` function raises an error when a file has no extension, so the expression was changed to wrap the regex call with `try(..., "")` and fall back to `application/octet-stream`.

## Review Notes
- Terraform was not installed in the local environment, so examples were reviewed against official Terraform provider and language documentation rather than validated with `terraform validate`.
- The CloudFront examples correctly use the S3 regional bucket domain with Origin Access Control, not the S3 website endpoint. This keeps the bucket private, but it also means S3 website routing rules are not used by that CloudFront origin.
- Direct S3 website endpoints are HTTP-only. The post correctly recommends CloudFront for HTTPS production deployments.

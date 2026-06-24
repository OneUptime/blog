# Validation Summary: How to Fix '413 Request Entity Too Large' in Nginx on AWS Elastic Beanstalk

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Nginx
- AWS Elastic Beanstalk
- Amazon Linux 2023 / Amazon Linux 2 / legacy Amazon Linux AMI Elastic Beanstalk platforms
- AWS Application Load Balancer
- Amazon S3 presigned URLs
- AWS SDK for JavaScript v3
- curl, dd, Python requests

## Sources Consulted
- Nginx ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- AWS Elastic Beanstalk reverse proxy configuration: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.proxy.html
- AWS Elastic Beanstalk legacy Nginx proxy configuration: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/go-nginx.html
- AWS Elastic Beanstalk .ebextensions documentation: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/ebextensions.html
- AWS Elastic Beanstalk configuration option namespaces: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html
- AWS Application Load Balancer troubleshooting: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html
- AWS Application Load Balancer quotas: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-limits.html
- AWS Application Load Balancer attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html
- Amazon S3 presigned upload URLs: https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
- AWS SDK for JavaScript v2 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- AWS SDKs and Tools version lifecycle: https://docs.aws.amazon.com/sdkref/latest/guide/version-support-matrix.html
- AWS SDK for JavaScript v3 S3 presigner package documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-s3-request-presigner/

## Issues Found
- The full Nginx override did not include Elastic Beanstalk's generated `conf.d/elasticbeanstalk/*.conf` files in the correct context. Updated the example to include global `conf.d/*.conf` files in the `http` block and Elastic Beanstalk application mappings inside a `server` block.
- The `.ebextensions` method incorrectly presented a direct `/etc/nginx/conf.d/` file-writing approach as a general legacy and AL2 method. Updated it to the documented legacy Amazon Linux AMI `.ebextensions/nginx/conf.d/` structure and clarified that AL2023/AL2 should use `.platform/nginx/`.
- The Application Load Balancer section incorrectly stated that ALB has a fixed maximum body size for uploads and suggested switching to NLB for that reason. Replaced this with AWS-documented ALB 413 causes: Lambda target body size over 1 MB and request header size limits.
- The load balancer timeout subsection was labeled as environment variables, but the snippet uses Elastic Beanstalk option settings. Renamed the subsection to describe the actual configuration.
- The S3 presigned URL example used the AWS SDK for JavaScript v2, which is end-of-support as of September 8, 2025. Updated the sample to use AWS SDK for JavaScript v3 with `S3Client`, `PutObjectCommand`, and `getSignedUrl`.
- The frontend presigned URL request interpolated query parameters without URL encoding. Updated it to use `URLSearchParams`.

## Review Notes
The remaining Nginx directives and curl/dd/Python examples are syntactically valid for the use cases shown. The security header `X-XSS-Protection` is obsolete in modern browsers, but it is not harmful to Nginx syntax and was left unchanged because the post's focus is request-size troubleshooting.

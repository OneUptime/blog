# Validation Summary: How to Use Ansible to Deploy Static Sites to S3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- amazon.aws Ansible collection
- community.aws Ansible collection
- AWS S3 static website hosting
- AWS CloudFront
- AWS CLI
- boto3 and botocore

## Sources Consulted
- Ansible amazon.aws.s3_bucket module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/s3_bucket_module.html
- Ansible community.aws.s3_website module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/s3_website_module.html
- Ansible community.aws.s3_sync module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/s3_sync_module.html
- Ansible community.aws.cloudfront_distribution module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/cloudfront_distribution_module.html
- AWS CLI cloudfront create-invalidation command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-invalidation.html

## Issues Found
- The post installed only the `amazon.aws` collection, but the current `s3_sync`, `s3_website`, and `cloudfront_distribution` modules used by the examples are in `community.aws`. I added installation of `community.aws` and changed those module references to the correct fully qualified collection names.
- The CloudFront distribution task used `aliases.items`, but the current `community.aws.cloudfront_distribution` module expects `aliases` to be a list of strings. I changed `aliases` to use `s3_cloudfront_domain_aliases` directly.
- The CloudFront distribution task used a timestamp in `caller_reference`, which would make repeat runs try to create a new distribution instead of updating the existing one. I changed it to a stable bucket-based value.
- The CloudFront task only ran when aliases were configured, so enabling CloudFront without custom domain aliases would not create a distribution. I removed that condition and added a default CloudFront certificate configuration when no ACM certificate ARN is supplied.

## Review Notes
The AWS CLI invalidation command and S3 bucket policy syntax are consistent with the referenced documentation. The example still intentionally uses a public S3 website endpoint as the CloudFront origin; a future security-focused revision could show a private S3 REST origin with CloudFront origin access control instead.

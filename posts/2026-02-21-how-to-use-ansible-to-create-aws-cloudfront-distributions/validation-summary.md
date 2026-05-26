# Validation Summary: How to Use Ansible to Create AWS CloudFront Distributions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.aws Ansible collection
- AWS CloudFront
- AWS S3
- AWS Application Load Balancer
- AWS Certificate Manager
- boto3 and botocore
- YAML

## Sources Consulted
- Ansible community.aws cloudfront_distribution module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/cloudfront_distribution_module.html
- Ansible community.aws cloudfront_invalidation module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/cloudfront_invalidation_module.html
- Ansible community.aws collection index and supported ansible-core versions: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/index.html
- AWS CloudFront SSL/TLS certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS CloudFront cache expiration documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html
- AWS CloudFront invalidation documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html

## Issues Found
- The prerequisites listed Ansible 2.14+, but the current community.aws collection documentation lists support for ansible-core 2.17.0 or newer. Updated the prerequisite to Ansible 2.17+ for the current collection.
- The prerequisites mentioned Python boto3 without the documented minimum versions. Updated it to Python 3.6+, boto3 1.34.0+, and botocore 1.34.0+.
- The first distribution example used a timestamp-based `caller_reference`. CloudFront caller references should be stable identifiers for idempotent create/update behavior, so the example now uses `myapp-static-dist`.
- The ALB examples expressed `origin_ssl_protocols` as an object with `items`, but the module parameter is a list of strings. Updated both examples to use list syntax.
- The dynamic origin explanation said content should not be cached unless application cache headers are set, while the sample uses `max_ttl: 0`, which disables edge caching. Updated the text to match the configuration.
- The `/api/*` cache behavior said API calls pass through without caching but only set `default_ttl: 0`. Added `min_ttl: 0` and `max_ttl: 0` so the snippet matches the explanation.

## Review Notes
The examples still use the legacy `forwarded_values` style, which remains supported, but current CloudFront configurations often prefer managed or custom cache policies and origin request policies where possible.

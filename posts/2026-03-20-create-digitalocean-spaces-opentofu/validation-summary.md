# Validation Summary: How to Create DigitalOcean Spaces (Object Storage) with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- DigitalOcean Spaces (S3-compatible object storage)
- DigitalOcean Terraform Provider (`digitalocean/digitalocean` ~> 2.0)
- DigitalOcean CDN
- IAM-style bucket policies (S3-compatible)
- CORS configuration

## Sources Consulted
- [digitalocean_spaces_bucket Terraform docs](https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/spaces_bucket.md)
- [digitalocean_cdn Terraform docs](https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/cdn.md)
- [digitalocean_spaces_bucket_object Terraform docs](https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/spaces_bucket_object.md)
- [digitalocean_spaces_bucket_policy Terraform docs](https://github.com/digitalocean/terraform-provider-digitalocean/blob/main/docs/resources/spaces_bucket_policy.md)
- [DigitalOcean Spaces bucket policy docs](https://docs.digitalocean.com/products/spaces/how-to/configure-bucket-policies/)

## Issues Found
- **Invalid ACL option listed in comment**: The "Creating a Spaces Bucket" section originally listed three ACL options (`private, public-read, public-read-write`). According to the official DigitalOcean Terraform provider documentation, the `digitalocean_spaces_bucket` resource only supports two canned ACLs: `private` and `public-read`. The `public-read-write` value is not a valid option for DigitalOcean Spaces (unlike AWS S3). The comment was corrected to list only the supported values.

## Review Notes
- Provider configuration correctly uses `spaces_access_id` and `spaces_secret_key` (the Spaces-scoped keys), distinct from the DO API `token`. These are the correct argument names.
- Resource arguments verified: `digitalocean_spaces_bucket` (`name`, `region`, `acl`, `cors_rule`), `digitalocean_cdn` (`origin`, `custom_domain`, `certificate_name`, `ttl`), `digitalocean_spaces_bucket_object` (`region`, `bucket`, `key`, `source`, `content_type`, `acl`, `etag`), and `digitalocean_spaces_bucket_policy` (`region`, `bucket`, `policy`).
- The `bucket_domain_name` exported attribute is correct (returns the FQDN like `bucket-name.nyc3.digitaloceanspaces.com`).
- The `digitalocean_certificate.cdn` reference in the CDN section is illustrative — readers will need to define this resource separately for the example to apply cleanly.
- The "Cross-Account Access" bucket policy uses the AWS ARN principal format (`arn:aws:iam::ACCOUNT_ID:root`). DigitalOcean Spaces accepts AWS-style policy JSON for S3 compatibility, but DigitalOcean does not have AWS accounts — readers should treat this as a syntax illustration rather than expecting it to grant access to an actual AWS IAM principal. In practice, DO Spaces principals are typically `"*"` or `{"AWS": "*"}`. Left as-is since the syntactic structure is valid and the section is labeled illustrative.
- The `do_token` variable is referenced in the provider block but not declared in the snippet; this is a common shorthand in tutorial code and not a technical error.

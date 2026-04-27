# Validation Summary: Using S3 as a Module Source in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (module sources)
- Terraform-compatible HCL
- Amazon S3
- AWS IAM (bucket policies, credential chain)
- go-getter (the library OpenTofu uses for fetching module archives)
- AWS CLI (`aws s3 cp`)

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/#s3-bucket
- go-getter S3 getter source: https://github.com/hashicorp/go-getter/blob/main/get_s3.go
- go-getter decompressor dispatch: https://github.com/hashicorp/go-getter/blob/main/decompress.go

## Issues Found

1. **Misleading comment about path-style URLs.** The original post said `# Path-style URL (works in all regions)` next to a `s3::https://s3.amazonaws.com/...` URL. Per the OpenTofu docs and the go-getter `parseUrl` implementation, the global hostname `s3.amazonaws.com` (with no region prefix) resolves to `us-east-1`. The OpenTofu docs explicitly state that buckets in us-east-1 must use this hostname — implying it is region-specific, not universal. Fixed the comment to clarify that `s3.amazonaws.com` resolves to us-east-1, and that regional endpoints should be used for buckets in other regions.

2. **Archive format mismatch in the publish script.** The original script created a `.tar.gz` archive and uploaded it under a `.tar.gz` key, but every other example in the post (the source URLs) referenced `.zip` files. go-getter dispatches the decompressor based on the URL extension (see `decompress.go`), and the S3 GET would 404 because the key would not match. Fixed the script to create and upload a `.zip` so it is consistent with the documented module source URLs in the rest of the post.

## Review Notes
- Path-style addressing for S3 is officially deprecated by AWS, but go-getter forces `UsePathStyle = true` so it remains functional for OpenTofu module sources. This may change in the future and is worth re-checking on a future review pass.
- The post does not mention go-getter query parameters such as `aws_profile=...` or `version=...` that can be appended to S3 source URLs. Not incorrect — just an enhancement that could be documented in a follow-up.
- The `.zip` archive must contain the module files at the archive root (or in a single subdirectory go-getter can detect); if a future reader runs the publish script without `cd`'ing into the module directory, the archive would contain a `modules/vpc/` prefix and OpenTofu would not find the module. The fixed script `cd`s into the module first to avoid this.
- The "S3 Bucket Policy" example shows the policy attached to a bucket called `aws_s3_bucket.modules` while the resources ARN points at `arn:aws:s3:::my-modules/*`. These are illustrative names, but readers copying the snippet should keep the bucket name in the ARN consistent with the bucket the policy is attached to.

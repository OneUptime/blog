# Validation Summary: How to Use S3 Bucket Module Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (module sources)
- Terraform (compatibility)
- Amazon S3
- AWS IAM (bucket policies, principals)
- HCL configuration language
- AWS CLI (`aws s3 cp`, `aws s3 ls`)
- go-getter (the underlying URL fetching library used by OpenTofu)

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/#s3-bucket
- HashiCorp go-getter S3 getter source / URL parsing rules: https://github.com/hashicorp/go-getter (S3 getter `parseUrl` host-format handling)
- AWS S3 virtual-hosted vs path-style endpoint documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html
- AWS S3 bucket policy reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html
- AWS CLI S3 command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/

## Issues Found
No technical issues found.

- The `s3::` getter prefix is correct for OpenTofu module sources.
- Both URL formats shown (`s3.amazonaws.com/...` and `s3.us-west-2.amazonaws.com/...`) are parsed correctly by go-getter (which OpenTofu uses); the 4-part dot-region hostname is handled in addition to the legacy `s3-region.amazonaws.com` dash form.
- The `//` subdirectory separator inside an archive is a documented go-getter feature.
- The HCL module blocks are syntactically valid.
- The IAM bucket-policy JSON is valid: `Version`, `Statement`, `Effect`, `Action`, `Resource`, and `Principal` are all correct field names; `s3:GetObject` is the right action for downloading objects; the resource ARN pattern `arn:aws:s3:::bucket/*` is correct.
- The AWS credential chain description (env vars, `AWS_PROFILE`, instance profile / IRSA) matches the behavior of the AWS SDK that go-getter uses.
- The `zip -r`, `aws s3 cp`, and `aws s3 ls` commands are syntactically correct.
- The example credential values (`AKIAIOSFODNN7EXAMPLE`, `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`) are AWS's well-known documentation placeholder values, not real credentials.

## Review Notes
- The claim that "OpenTofu re-downloads the archive on every `tofu init`" is directionally correct for archive sources where there is no version manifest comparable to a registry version pin: OpenTofu does cache modules in `.terraform/modules/`, so it will not necessarily re-download on every run, but a cleared cache or `-upgrade` will refetch. The author's recommendation to embed the version in the S3 key path is sound regardless.
- SSO support depends on the AWS SDK behavior surfaced through go-getter; in practice this works because SSO credentials are resolved into standard cached credentials by `aws sso login`. Worth keeping an eye on if OpenTofu's go-getter integration changes SDK versions.
- Path-style S3 URLs (`s3.amazonaws.com/bucket/...`) still work for existing buckets, but AWS has been steering new buckets toward virtual-hosted–style URLs. Not incorrect in the post; just a future-proofing note.
- The `Principal` block in S3 bucket policies must reference an existing IAM role/user ARN; the example uses a placeholder account ID, which is appropriate for documentation.

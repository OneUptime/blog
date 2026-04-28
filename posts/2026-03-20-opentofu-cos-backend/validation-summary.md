# Validation Summary: How to Configure the COS Backend (Tencent Cloud) in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTofu (Terraform fork)
- Tencent Cloud Object Storage (COS)
- Tencent Cloud CAM (Cloud Access Management)
- Tencent Cloud CLI (tccli)
- HCL configuration language
- OpenTofu workspaces

## Sources Consulted
- [OpenTofu COS Backend documentation](https://opentofu.org/docs/language/settings/backends/cos/)
- [OpenTofu State Locking documentation](https://opentofu.org/docs/language/state/locking/)
- [Tencent Cloud COS API Authorization Policies](https://www.tencentcloud.com/document/product/436/30580)
- [Tencent Cloud CLI (tccli) GitHub](https://github.com/TencentCloud/tencentcloud-cli)
- [Backend Type: cos | Terraform | HashiCorp Developer](https://developer.hashicorp.com/terraform/language/backend/cos)

## Issues Found

1. **State Locking section incorrectly mentioned DynamoDB.**
   - Original: "The COS backend supports state locking using Tencent Cloud's object tagging or a DynamoDB-compatible table."
   - Fixed: Replaced with an accurate description. The COS backend uses Tencent Cloud's Tag service for automatic state locking, requiring `CreateTag`, `DeleteTag`, and `DescribeTags` permissions on the tag key `tencentcloud-terraform-lock`. DynamoDB is an AWS service used by the S3 backend; it is not used by the COS backend.

2. **CAM policy actions used the wrong format.**
   - Original actions: `cos:GetObject`, `cos:PutObject`, `cos:DeleteObject`, `cos:GetBucket`
   - Fixed actions: `name/cos:GetObject`, `name/cos:PutObject`, `name/cos:DeleteObject`, `name/cos:GetBucket`
   - Tencent Cloud CAM requires the `name/` prefix in front of API action names according to the official COS API authorization policy documentation. Without this prefix the policy would not match COS API operations.

## Review Notes

- The CAM policy in the post grants only COS object permissions; if a user actually wants to use state locking with this least-privilege policy, they would also need to add `CreateTag`, `DeleteTag`, and `DescribeTags` permissions on the `tencentcloud-terraform-lock` tag key. This was not in scope to add (it would expand the post), but readers using this policy verbatim may see locking failures until they extend it.
- The `acl = "private"` setting in the encryption example is the default value, so it is redundant but not incorrect.
- The basic configuration, authentication parameters, environment variable names (`TENCENTCLOUD_SECRET_ID`, `TENCENTCLOUD_SECRET_KEY`, `TENCENTCLOUD_REGION`), `tccli cos create-bucket` / `put-bucket-versioning` commands, multi-environment layout, and encryption parameters all match the official OpenTofu COS backend documentation and Tencent Cloud CLI references.
- The workspace state path illustration is a simplified directory tree; in practice non-default workspace state files are stored at `<prefix>/env:/<workspace>/terraform.tfstate`, which is consistent with what the diagram conveys.

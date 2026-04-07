# Validation Summary: How to Use Session Tags with Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph STS (Security Token Service)
- OIDC (OpenID Connect)
- IAM Policies and ABAC (Attribute-Based Access Control)
- radosgw-admin CLI
- Python boto3 SDK
- AWS CLI (STS)

## Sources Consulted
- Ceph RGW Session Tags documentation: https://docs.ceph.com/en/latest/radosgw/session-tags/
- Ceph RGW STS documentation: https://docs.ceph.com/en/latest/radosgw/STS/
- Ceph RGW Role documentation: https://docs.ceph.com/en/latest/radosgw/role/
- Ceph session-tags.rst source on GitHub: https://github.com/ceph/ceph/blob/main/doc/radosgw/session-tags.rst
- Ceph PR #47746 (Pacific backport for session tags): https://github.com/ceph/ceph/pull/47746
- AWS CLI assume-role reference: https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS STS Session Tags documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html

## Issues Found

1. **Session tags only work with AssumeRoleWithWebIdentity, not AssumeRole**: The original post presented session tags as working with the standard `AssumeRole` API (passing `--tags` to `aws sts assume-role`). In Ceph RGW, session tags are only supported via `AssumeRoleWithWebIdentity` through JWT claims from an OIDC provider. Rewrote the post to correctly use `AssumeRoleWithWebIdentity` throughout.

2. **Incorrect condition key `sts:TagKeys`**: The trust policy used `"sts:TagKeys"` as a condition key. The correct condition key is `"aws:TagKeys"`. Fixed in the trust policy example.

3. **Incorrect condition key `sts:RequestTag`**: The OIDC section referenced `sts:RequestTag` as a condition key. The correct condition key is `"aws:RequestTag"`. Fixed throughout.

4. **Unsupported transitive session tags**: The original post included a section on transitive session tags (`--transitive-tag-keys`), which is not documented or supported in Ceph RGW. Removed this section entirely.

5. **Policy variable substitution in Resource ARN unconfirmed**: The original policy used `${aws:PrincipalTag/department}` in the Resource ARN for dynamic bucket name substitution. This is not confirmed to work in Ceph RGW (Ceph docs only show `aws:PrincipalTag` in Condition blocks). Replaced with a static resource ARN and moved the tag check to a Condition block instead.

6. **Missing JWT token structure**: The original post did not explain how session tags are actually passed to Ceph RGW (via the `https://aws.amazon.com/tags` namespace in JWT tokens with `principal_tags`). Added a dedicated section showing the required JWT structure.

7. **boto3 example used `assume_role` instead of `assume_role_with_web_identity`**: Updated the Python example to use the correct `assume_role_with_web_identity` method with a `WebIdentityToken` parameter.

8. **Trust policy principal and action**: Changed the trust policy from `"Principal": {"AWS": "arn:aws:iam:::user/myuser"}` with `"Action": "sts:AssumeRole"` to `"Principal": {"Federated": "arn:aws:iam:::oidc-provider/..."}` with `"Action": "sts:AssumeRoleWithWebIdentity"` to match how session tags actually work in Ceph RGW.

## Review Notes
- Session tags in Ceph RGW were introduced around Ceph Pacific (16.x) via PR #47746, backported in October 2022. The post does not mention version requirements, which could be helpful for readers on older Ceph versions.
- The Ceph RGW STS implementation is a subset of AWS STS. Readers familiar with AWS may expect features like `AssumeRole` with `--tags` to work, but Ceph only supports the OIDC/JWT path for session tags.

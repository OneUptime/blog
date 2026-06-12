# Validation Summary: How to Implement MinIO Bucket Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MinIO bucket policies
- MinIO IAM/PBAC user and group policies
- MinIO Client (`mc`)
- Amazon S3-compatible policy JSON
- IAM policy condition operators and condition keys

## Sources Consulted
- MinIO AIStor Access Control with Policy Management: https://docs.min.io/aistor/administration/iam/access/
- MinIO `mc admin policy` command reference: https://docs.min.io/aistor/reference/cli/admin/mc-admin-policy/
- MinIO `mc admin policy attach` command reference: https://docs.min.io/aistor/reference/cli/admin/mc-admin-policy/mc-admin-policy-attach/
- MinIO `mc admin policy create` command reference: https://docs.min.io/aistor/reference/cli/admin/mc-admin-policy/mc-admin-policy-create/
- MinIO `mc anonymous set` command reference: https://docs.min.io/aistor/reference/cli/mc-anonymous/mc-anonymous-set/
- MinIO `mc anonymous set-json` command reference: https://docs.min.io/aistor/reference/cli/mc-anonymous/mc-anonymous-set-json/
- MinIO Python SDK bucket policy examples: https://docs.min.io/aistor/developers/sdk/python/api/
- AWS IAM JSON policy elements: Principal: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- AWS IAM condition operators: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
- AWS IAM policy evaluation logic: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html
- AWS S3 policy condition keys: https://docs.aws.amazon.com/AmazonS3/latest/userguide/amazon-s3-policy-keys.html

## Issues Found
- The JSON policy examples used `//` comments inside `json` code blocks, which made them invalid JSON. Removed the inline comments from JSON blocks so the snippets parse as policy JSON.
- The bucket-policy application command used `mc admin policy attach ... --bucket`, but current MinIO documentation shows `mc admin policy attach` only attaches named policies to users or groups. Replaced it with `mc anonymous set-json public-read-policy.json myminio/public-assets`.
- The post described MinIO bucket policies as controlling all principals. Current MinIO guidance distinguishes anonymous bucket policies from IAM/PBAC policies for authenticated users and groups. Updated the wording and converted internal user/group examples to IAM policy form without `Principal`.
- Several condition-key examples used `s3:prefix` and `s3:max-keys` with object actions/resources. These keys apply to bucket listing operations, so the examples now use `s3:ListBucket` and bucket ARNs.
- The condition-key reference placed IP, time, and secure-transport checks under string operators. Updated them to `IpAddress`, `DateLessThan`, and `Bool` respectively.
- The time-based examples described recurring business hours and weekly maintenance windows, but the shown IAM date operators compare absolute timestamps. Renamed and reworded those examples as absolute time windows.
- The best-practice audit command used `mc admin policy list`; current MinIO CLI documentation uses `mc admin policy ls`. Updated the command.
- The common pitfall about policy evaluation order was misleading because policy element order does not determine the result. Reworded it to refer to policy evaluation precedence.

## Review Notes
The examples are now syntactically valid JSON and aligned with current MinIO policy-management commands. Some examples remain illustrative and use placeholder bucket names, group names, IP ranges, and dates that must be adapted before production use.

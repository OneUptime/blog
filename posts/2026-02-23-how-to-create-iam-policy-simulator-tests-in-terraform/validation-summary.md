# Validation Summary: How to Create IAM Policy Simulator Tests in Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform (HCL, `aws_iam_policy_document`, `null_resource`, `local-exec` provisioners, native `.tftest.hcl` test framework)
- Terraform AWS provider (v5.x)
- AWS IAM (policies, users, policy attachments)
- AWS IAM Policy Simulator (`simulate-principal-policy`, `simulate-custom-policy`)
- AWS CLI v2
- Bash (heredoc scripts inside `local-exec` provisioners)

## Sources Consulted
- AWS CLI v2 reference for `aws iam simulate-principal-policy` — https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html
- AWS CLI v2 reference for `aws iam simulate-custom-policy` — https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-custom-policy.html
- AWS IAM API reference for `EvaluationResult.EvalDecision` values (`allowed`, `explicitDeny`, `implicitDeny`) — https://docs.aws.amazon.com/IAM/latest/APIReference/API_EvaluationResult.html
- Terraform AWS provider docs: `aws_iam_policy_document` data source, `aws_iam_policy`, `aws_iam_user`, `aws_iam_user_policy_attachment` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform `null_resource` and `local-exec` provisioner docs — https://registry.terraform.io/providers/hashicorp/null/latest/docs
- Terraform native test framework (`.tftest.hcl`, `run`, `assert`), GA in Terraform 1.6 (Oct 2023) — https://developer.hashicorp.com/terraform/language/tests

## Issues Found
- **Broken wildcard-action assertion in the `.tftest.hcl` example.** The original condition compared `s.Action == "*"`. The `aws_iam_policy_document` data source serializes `actions = [...]` as a JSON array (e.g. `"Action": ["*"]`), so a string-equality check against `"*"` is never true and the assertion would silently never fire — defeating the purpose of the test. Changed to `contains(s.Action, "*")`, which correctly inspects the array.

## Review Notes
- The `aws iam simulate-principal-policy` and `aws iam simulate-custom-policy` CLI invocations (flags `--policy-source-arn`, `--action-names`, `--resource-arns`, `--policy-input-list`, `--query`, `--output`) are all current and correct.
- The three documented `EvalDecision` values used by the post (`allowed`, `explicitDeny`, `implicitDeny`) match the AWS API contract.
- The `null_resource` examples assume the `hashicorp/null` provider is implicitly available. In production code it is good practice to declare it in `required_providers`, but the post's `terraform { required_providers { ... } }` block only lists `aws`. This works because Terraform will resolve `null` automatically, but readers copying snippets into a strict module may want to add it.
- The heredoc in the "Testing Custom Policy Documents" example writes the policy JSON to `/tmp/test-policy.json` and passes it via `--policy-input-list file://...`. AWS CLI accepts a single-policy file this way, treating its contents as one element of the list — this is a widely used pattern and works in practice with AWS CLI v2.
- `length(...Statement) == 3` correctly counts the three statements emitted by the example policy. `Statement` is always an array from `aws_iam_policy_document`, so the check is well-formed.
- Terraform 1.6 GA for the native `.tftest.hcl` test framework is accurate.
- Style/scope of the post is otherwise intact; no other technical corrections were needed.

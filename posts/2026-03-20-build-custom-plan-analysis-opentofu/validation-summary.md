# Validation Summary: How to Build Custom Plan Analysis Tools for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu plan JSON output
- Python 3
- GitHub Actions
- AWS provider resource examples

## Sources Consulted
- OpenTofu `show` command documentation: https://opentofu.org/docs/cli/commands/show/
- OpenTofu JSON output format documentation: https://opentofu.org/docs/internals/json-format/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/

## Issues Found
- The post used the legacy positional `tofu show -json tfplan` form. I updated it to `tofu show -json -plan=tfplan`, which matches the current explicit target-selection syntax documented by OpenTofu.
- The `check_instance_type_allowlist` example only evaluated changes containing the `create` action, which missed `update` actions even though the policy is described as enforcing approved instance types for planned EC2 instances. I updated it to evaluate all non-`no-op` `aws_instance` changes that have an `after` value.
- The `check_tags_required` example treated delete-only changes as missing tags because OpenTofu omits `after` for `["delete"]` and `["forget"]` actions. I updated it to skip changes with no planned post-change object.
- The `check_no_database_deletes` example matched any resource type beginning with `aws_db_instance`, which could incorrectly include non-instance resource types with the same prefix. I narrowed it to `aws_db_instance` to match the code comment and policy intent.

## Review Notes
- OpenTofu documents that `tofu show -json` can return sensitive values in plain text. Storing `plan.json` in CI should therefore be treated as handling a potentially sensitive artifact.
- The corrected Python example was syntactically validated and exercised against a synthetic plan JSON sample to confirm the fixed action-handling behavior.
